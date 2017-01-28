# Chrome Extension + Webpack + Babel (cewb)

## Features

- 🏗 Next generation ES features with babel
- ⛓ Code bundling with webpack 
- 🔁 Live reload on source change
- 📦 Packs your extension into a zip

## Installation

```sh
git clone https://github.com/duplexstream/cewb.git
cd cewb
npm install
```

## Usage

### File naming

To differentiate between files that are to be used in `manifest.json` and files that are dependencies of the former, we add `.ext` before the `.js` in the filename. When `pack.js` runs, it looks for every file that matches the pattern of `/\.ext\.js$/` and adds those to the `entry` property in the webpack config after stripping the `.ext` from the filename.  

### Development

Running `npm start` will gather all the static assets, transpile all source files, output these files to a directory named `unpacked` and then watch all files under `src` for live reloading.

Live reloading relies on the following code to be placed in the `background.ext.js` file.

```js
if (window.DEV) {
  require('../reload')(34343) // where 34343 is the port of the live reload WebSocket
}
```

After you've run `npm start` for the first time, goto `chrome://extensions` in Chrome, ensure "Developer mode" is checked, click "Load unpacked extension...", locate and select your extensions `unpacked` folder and you're ready to go! 
