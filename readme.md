# vpcf-editor

The easiest way to edit colors in Deadlock `.vpcf` particle files. Open a folder, pick a color, save - done.

## What it does

**Color Editor** - see every color field in a file, click to change it, pick with a color picker or type a hex. Undo, redo, save one file or all of them at once.

**Shared Colors** - finds colors that appear across multiple files and lets you change all of them in one shot. Dial in how close a "match" needs to be with a simple slider.

**Raw Text** - full text editor for when you need to get into the file directly. Has search, find & replace, and batch operations that run across every file in your folder at once.

**Color Palette** - save colors you use often, organize them into named palettes, and apply them instantly with a click. Drag to reorder, right-click to edit or delete.

**Edit History** - every change you make is logged with timestamps and color swatches so you always know what you did and when.

**Backups** Backups are created automatically before anything gets written to disk, so you never have to worry about losing the originals. (/backups inside your working directory)

## Install

Grab the latest `.exe` from [Releases](https://github.com/yousv/vpcf-editor/releases).

## Build

```bash
npm install
npm run tauri -- build
```

Needs [Node.js](https://nodejs.org) and [Rust](https://rustup.rs).

## License

MIT

## Support

[PayPal](https://paypal.me/yousvv) · [Ko-Fi](http://ko-fi.com/yousv)

## Credits

Inspired by the-mrsir's [VPCF-color-editor](https://github.com/the-mrsir/VPCF-color-editor) - this started as an upgrade and grew from there.