//! Sidecar-binary distribution for plugins.
//!
//! A plugin whose manifest declares a `sidecar` gets its native binary + models
//! downloaded from GitHub Releases on install (one click, no PATH setup), extracted
//! under `{appData}/plugins/{plugin_id}/sidecar/`, and spawned by `sidecar_spawn`.
//! Process I/O is streamed to the frontend as `sidecar-stdout` / `sidecar-stderr` /
//! `sidecar-exit` events; download progress as `sidecar-install-progress`.

use crate::types::{AppError, AppResult};
use crate::{emit_event, validate_plugin_id};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read};
use std::process::Child;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SidecarProgress {
    plugin_id: String,
    downloaded: u64,
    total: u64,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SidecarLine {
    run_id: u32,
    line: String,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SidecarExit {
    run_id: u32,
    code: Option<i32>,
}

/// GitHub release asset platform tag for the running target.
fn platform_tag() -> AppResult<&'static str> {
    Ok(match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => "windows-x64",
        ("macos", "aarch64") => "macos-arm64",
        // No macos-x64: ort ships no prebuilt ONNX Runtime for x86_64-apple-darwin.
        ("macos", "x86_64") => {
            return Err(AppError("Sidecar plugins are not available on Intel Macs".into()));
        }
        ("linux", "x86_64") => "linux-x64",
        (os, arch) => return Err(AppError(format!("Unsupported platform: {os}-{arch}"))),
    })
}

fn sidecar_dir(plugin_id: &str) -> AppResult<std::path::PathBuf> {
    Ok(crate::storage::app_data_dir()?
        .join("plugins")
        .join(plugin_id)
        .join("sidecar"))
}

fn install_blocking(plugin_id: String, name: String, version: String) -> AppResult<()> {
    let platform = platform_tag()?;
    let url = format!(
        "https://github.com/ccmdi/mma/releases/download/{plugin_id}-v{version}/{name}-{platform}.zip"
    );
    log::info!("[sidecar] downloading {url}");

    let client = reqwest::blocking::Client::builder()
        .use_rustls_tls()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;
    let mut resp = client.get(&url).send()?.error_for_status()?;
    let total = resp.content_length().unwrap_or(0);

    let mut buf = Vec::with_capacity(total as usize);
    let mut chunk = [0u8; 65536];
    let mut downloaded = 0u64;
    let mut last_emit = 0u64;
    loop {
        let n = resp.read(&mut chunk)?;
        if n == 0 {
            break;
        }
        buf.extend_from_slice(&chunk[..n]);
        downloaded += n as u64;
        // Throttle to ~every 256KB so we don't flood the event channel.
        if downloaded - last_emit >= 262_144 {
            emit_event("sidecar-install-progress", SidecarProgress {
                plugin_id: plugin_id.clone(),
                downloaded,
                total,
            });
            last_emit = downloaded;
        }
    }
    emit_event("sidecar-install-progress", SidecarProgress {
        plugin_id: plugin_id.clone(),
        downloaded,
        total: total.max(downloaded),
    });

    let final_dir = sidecar_dir(&plugin_id)?;
    let plugin_root = final_dir.parent().unwrap().to_path_buf();
    std::fs::create_dir_all(&plugin_root)?;
    let tmp_dir = plugin_root.join(".sidecar-tmp");
    if tmp_dir.exists() {
        std::fs::remove_dir_all(&tmp_dir)?;
    }
    std::fs::create_dir_all(&tmp_dir)?;

    // Archive root holds the binary, models/, and any dlls flat.
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(buf))?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        let rel = match entry.enclosed_name() {
            Some(p) => p.to_owned(),
            None => continue,
        };
        let out = tmp_dir.join(&rel);
        if entry.is_dir() {
            std::fs::create_dir_all(&out)?;
            continue;
        }
        if let Some(parent) = out.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut f = std::fs::File::create(&out)?;
        std::io::copy(&mut entry, &mut f)?;
    }

    std::fs::write(tmp_dir.join("version.txt"), &version)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let bin = tmp_dir.join(&name);
        if bin.exists() {
            std::fs::set_permissions(&bin, std::fs::Permissions::from_mode(0o755))?;
        }
    }

    // temp-then-rename: replace the live dir atomically-ish once fully extracted.
    if final_dir.exists() {
        std::fs::remove_dir_all(&final_dir)?;
    }
    std::fs::rename(&tmp_dir, &final_dir)?;
    log::info!("[sidecar] installed {name} v{version} for {plugin_id}");
    Ok(())
}

/// Download a plugin's sidecar bundle from GitHub Releases and extract it under
/// `{appData}/plugins/{plugin_id}/sidecar/`. Emits `sidecar-install-progress`.
#[tauri::command]
#[specta::specta]
pub async fn sidecar_install(plugin_id: String, name: String, version: String) -> AppResult<()> {
    validate_plugin_id(&plugin_id)?;
    tokio::task::spawn_blocking(move || install_blocking(plugin_id, name, version))
        .await
        .map_err(|e| AppError(format!("sidecar install task failed: {e}")))?
}

/// Installed sidecar version for a plugin (from `sidecar/version.txt`), or `None`.
#[tauri::command]
#[specta::specta]
pub fn sidecar_installed_version(plugin_id: String) -> AppResult<Option<String>> {
    validate_plugin_id(&plugin_id)?;
    let path = sidecar_dir(&plugin_id)?.join("version.txt");
    Ok(std::fs::read_to_string(&path).ok().map(|s| s.trim().to_string()))
}

fn children() -> &'static Mutex<HashMap<u32, Arc<Mutex<Child>>>> {
    static C: OnceLock<Mutex<HashMap<u32, Arc<Mutex<Child>>>>> = OnceLock::new();
    C.get_or_init(|| Mutex::new(HashMap::new()))
}

static RUN_COUNTER: AtomicU32 = AtomicU32::new(1);

/// Spawn a plugin's installed sidecar binary. Streams stdout/stderr lines as
/// `sidecar-stdout` / `sidecar-stderr` events and the exit as `sidecar-exit`,
/// keyed by the returned run id. Runs in the sidecar dir so co-located dlls resolve.
#[tauri::command]
#[specta::specta]
pub fn sidecar_spawn(plugin_id: String, name: String, args: Vec<String>) -> AppResult<u32> {
    validate_plugin_id(&plugin_id)?;
    let dir = sidecar_dir(&plugin_id)?;
    let bin_name = if cfg!(windows) { format!("{name}.exe") } else { name };
    let bin = dir.join(&bin_name);

    let mut cmd = std::process::Command::new(&bin);
    cmd.args(&args)
        .current_dir(&dir)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    let mut child = cmd.spawn()
        .map_err(|e| AppError(format!("Failed to spawn {}: {e}", bin.display())))?;

    let run_id = RUN_COUNTER.fetch_add(1, Ordering::SeqCst);

    if let Some(out) = child.stdout.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().map_while(Result::ok) {
                emit_event("sidecar-stdout", SidecarLine { run_id, line });
            }
        });
    }
    if let Some(err) = child.stderr.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().map_while(Result::ok) {
                emit_event("sidecar-stderr", SidecarLine { run_id, line });
            }
        });
    }

    let child = Arc::new(Mutex::new(child));
    children().lock()?.insert(run_id, child.clone());

    std::thread::spawn(move || {
        let code = loop {
            let status = child.lock().map(|mut c| c.try_wait());
            match status {
                Ok(Ok(Some(s))) => break s.code(),
                Ok(Ok(None)) => std::thread::sleep(std::time::Duration::from_millis(100)),
                _ => break None,
            }
        };
        if let Ok(mut map) = children().lock() {
            map.remove(&run_id);
        }
        emit_event("sidecar-exit", SidecarExit { run_id, code });
    });

    Ok(run_id)
}

/// Kill a running sidecar process by run id (no-op if already exited).
#[tauri::command]
#[specta::specta]
pub fn sidecar_kill(run_id: u32) -> AppResult<()> {
    if let Some(child) = children().lock()?.get(&run_id) {
        let _ = child.lock()?.kill();
    }
    Ok(())
}
