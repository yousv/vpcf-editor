# vpcf-editor

A desktop editor for `.vpcf` particle files. Edit colors across multiple files, find shared colors, and batch-edit raw text.

## Features

- Color editor with hex input, alpha support, and native color picker
- Shared colors tab - find and replace colors used across multiple files
- Raw text editor with find/replace and batch operations
- Saved color palette with drag-to-reorder
- Auto-updater via GitHub Releases

## Install

Download the latest `.msi` from [Releases](https://github.com/yousv/vpcf-editor/releases).

## Build

```bash
npm install
npm run tauri -- build
```

Requires [Node.js](https://nodejs.org) and [Rust](https://rustup.rs).

## License

MIT