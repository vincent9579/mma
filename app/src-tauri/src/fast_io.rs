use rusqlite::Connection;
use sha2::{Digest, Sha256};
use tauri::ipc::InvokeBody;
use crate::types::Location;
use tauri::Manager;

pub fn is_test_mode() -> bool {
    cfg!(feature = "e2e") || std::env::var("MMA_TEST_DB").is_ok()
}

pub fn db_filename() -> &'static str {
    if is_test_mode() { "mma_test.db" } else { "mma.db" }
}

pub(crate) fn db_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join(db_filename()))
        .map_err(|e| e.to_string())
}

pub(crate) fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    Connection::open(db_path(app)?).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Arrow IPC
// ---------------------------------------------------------------------------

pub(crate) fn arrow_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let subdir = if is_test_mode() { "arrow_test" } else { "arrow" };
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join(subdir);
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir)
}

pub(crate) fn arrow_path(app: &tauri::AppHandle, map_id: &str) -> Result<std::path::PathBuf, String> {
    Ok(arrow_dir(app)?.join(format!("{map_id}.arrow")))
}

pub(crate) fn arrow_delta_path(app: &tauri::AppHandle, map_id: &str) -> Result<std::path::PathBuf, String> {
    Ok(arrow_dir(app)?.join(format!("{map_id}_delta.arrow")))
}

pub(crate) fn arrow_blobs_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = arrow_dir(app)?.join("blobs");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir)
}

pub(crate) fn blob_path(app: &tauri::AppHandle, hash: &str) -> Result<std::path::PathBuf, String> {
    Ok(arrow_blobs_dir(app)?.join(format!("{hash}.arrow")))
}

pub(crate) fn write_blob(app: &tauri::AppHandle, batch: &arrow::array::RecordBatch) -> Result<(String, usize), String> {
    let mut buf = Vec::new();
    {
        let cursor = std::io::Cursor::new(&mut buf);
        let mut writer = arrow::ipc::writer::FileWriter::try_new(cursor, &batch.schema())
            .map_err(|e| e.to_string())?;
        writer.write(batch).map_err(|e| e.to_string())?;
        writer.finish().map_err(|e| e.to_string())?;
    }
    let hash = sha256_hex(&buf);
    let path = blob_path(app, &hash)?;
    if !path.exists() {
        atomic_write(&path, |mut file| {
            use std::io::Write;
            file.write_all(&buf).map_err(|e| e.to_string())
        })?;
    }
    let rows = batch.num_rows();
    Ok((hash, rows))
}

pub(crate) fn read_blob(app: &tauri::AppHandle, hash: &str) -> Result<arrow::array::RecordBatch, String> {
    let path = blob_path(app, hash)?;
    read_arrow_ipc(&path)
}

pub(crate) fn write_arrow_ipc(path: &std::path::Path, batch: &arrow::array::RecordBatch) -> Result<(), String> {
    atomic_write(path, |file| {
        let buf = std::io::BufWriter::with_capacity(1 << 20, file);
        let mut writer = arrow::ipc::writer::FileWriter::try_new(buf, &batch.schema())
            .map_err(|e| e.to_string())?;
        writer.write(batch).map_err(|e| e.to_string())?;
        writer.finish().map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub(crate) fn atomic_write(path: &std::path::Path, write_fn: impl FnOnce(std::fs::File) -> Result<(), String>) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    let file = std::fs::File::create(&tmp).map_err(|e| e.to_string())?;
    write_fn(file)?;
    std::fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn read_arrow_ipc(path: &std::path::Path) -> Result<arrow::array::RecordBatch, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let reader = arrow::ipc::reader::FileReader::try_new(file, None)
        .map_err(|e| e.to_string())?;
    let mut batches = Vec::new();
    for batch in reader {
        batches.push(batch.map_err(|e| e.to_string())?);
    }
    if batches.is_empty() {
        return Ok(arrow::array::RecordBatch::new_empty(std::sync::Arc::new(
            crate::arrow_bridge::location_schema(),
        )));
    }
    if batches.len() == 1 {
        return Ok(batches.into_iter().next().unwrap());
    }
    let schema = std::sync::Arc::new(crate::arrow_bridge::location_schema());
    arrow::compute::concat_batches(&schema, &batches).map_err(|e| e.to_string())
}


/// Returns msgpack map `{ undoStack: [...], redoStack: [...] }`.
// #[tauri::command]
// pub fn load_edit_history(app: tauri::AppHandle, map_id: String) -> Result<Response, String> {
//     let conn = open_db(&app)?;
//     let result = conn.query_row(
//         "SELECT undo_stack, redo_stack FROM edit_history WHERE map_id = ?1",
//         [&map_id],
//         |row| Ok((row.get::<_, Vec<u8>>(0)?, row.get::<_, Vec<u8>>(1)?)),
//     );

//     match result {
//         Ok((undo, redo)) => {
//             let mut out = Vec::with_capacity(undo.len() + redo.len() + 32);
//             out.push(0x82); // fixmap 2
//             write_fixstr(&mut out, "undoStack");
//             out.extend_from_slice(&undo);
//             write_fixstr(&mut out, "redoStack");
//             out.extend_from_slice(&redo);
//             Ok(Response::new(out))
//         }
//         Err(rusqlite::Error::QueryReturnedNoRows) => {
//             let mut out = Vec::new();
//             out.push(0x82); // fixmap 2
//             write_fixstr(&mut out, "undoStack");
//             out.push(0x90); // fixarray 0
//             write_fixstr(&mut out, "redoStack");
//             out.push(0x90);
//             Ok(Response::new(out))
//         }
//         Err(e) => Err(e.to_string()),
//     }
// }

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

pub(crate) fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut s = String::with_capacity(digest.len() * 2);
    for b in digest.iter() {
        use std::fmt::Write;
        write!(&mut s, "{:02x}", b).unwrap();
    }
    s
}

// #[derive(serde::Deserialize)]
// #[serde(rename_all = "camelCase")]
// struct SaveHistoryPayload {
//     map_id: String,
//     undo_stack: serde_json::Value,
//     redo_stack: serde_json::Value,
// }

/// Receive msgpack `{ mapId, undoStack, redoStack }`, re-encode each stack
/// as a separate msgpack blob, and write to edit_history.
// #[tauri::command]
// pub async fn save_edit_history(app: tauri::AppHandle, request: tauri::ipc::Request<'_>) -> Result<(), String> {
//     let body = raw_body(&request)?.to_vec();
//     let db_path = db_path(&app)?;
//     tokio::task::spawn_blocking(move || {
//         let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
//         let p: SaveHistoryPayload = rmp_serde::from_slice(&body).map_err(|e| e.to_string())?;
//         let undo = rmp_serde::to_vec(&p.undo_stack).map_err(|e| e.to_string())?;
//         let redo = rmp_serde::to_vec(&p.redo_stack).map_err(|e| e.to_string())?;
//         conn.execute(
//             "INSERT OR REPLACE INTO edit_history (map_id, undo_stack, redo_stack) VALUES (?1, ?2, ?3)",
//             rusqlite::params![p.map_id, undo, redo],
//         )
//         .map_err(|e| e.to_string())?;
//         Ok(())
//     }).await.map_err(|e| e.to_string())?
// }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn raw_body<'a>(req: &'a tauri::ipc::Request<'a>) -> Result<&'a [u8], String> {
    match req.body() {
        InvokeBody::Raw(b) => Ok(b),
        _ => Err("expected binary request body".into()),
    }
}


fn write_fixstr(out: &mut Vec<u8>, s: &str) {
    assert!(s.len() <= 31);
    out.push(0xa0 | s.len() as u8);
    out.extend_from_slice(s.as_bytes());
}

#[cfg(test)]
#[path = "fast_io.test.rs"]
mod tests;
