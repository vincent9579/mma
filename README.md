# MMA

Local-first desktop clone of [map-making.app](https://map-making.app).

![preview](img/preview.png)

## Features

- Offline/local-first
- Handles millions of locations
- Plugin system
- Configurable hotkeys
- Extra fields on locations - non-boolean arbitrary metadata
- Composable selections
- Map generator built-in
- Version history with commits

## Installation
### User
Open [the releases menu](https://github.com/ccmdi/mma/releases) and download the respective installation for your system.

#### MacOS/Linux
If you are on MacOS, you will likely need to run
```zsh
xattr -dr com.apple.quarantine "/Applications/Map Making App.app"
```

On both Mac & Linux, framerate and rendering stability can be an issue. If you encounter these problems, you can [try running the app in a browser](###run-in-a-browser). The web version will eventually be a first-class launch option, but is only available from source for now.

### From source

```bash
cd app && npm install && cargo tauri build
```

Requires: Rust toolchain, Node.js, npm.

### Run in a browser
Serve the app locally and open it in any browser:

```bash
cd app && npm install && npm run build
cargo run --manifest-path src-tauri/Cargo.toml --features web-serve -- --serve
```

Then open the printed `http://127.0.0.1:1430`.

## Plugins

See [plugins/README.md](plugins/README.md).
