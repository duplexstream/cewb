# cewb
Build Chrome Extensions with Webpack + Babel 

## Features

- 🏗 Next generation ES features with babel
- ⛓ Code bundling with webpack 
- 🔁 Live reload on source change
- 📦 Packs your extension into a zip

## Installation

```sh
npm install --dev cewb
# or
yarn add --dev cewb
```

## Usage

Example directory structure:

```
  + /project-directory
  |-+ /assets
  | '-- /icon.png
  |-- /manifest.json
  |-- /package.json
  '-+ /src
    |-- /background.ext.js
    |-- /utils.js
    '-- /injectedScript.ext.js
```

Example `package.json`:  

```js
{
  "name": "my-extension",
  "scripts": {
    "dev": "cewb",
    "prod": "cewb -p"
  }
}
```

### File naming

Any file that ends with `.ext.js` will be added to webpack's entries object and therefore will be accessible by `manifest.json`. 

### Development

Running `npm run dev` will take all the static assets, transpile all source files, output these files to a directory named `unpacked` and then watch all files under `src` for live reloading.

After you've run `npm run dev` for the first time, goto `chrome://extensions` in Chrome, ensure "Developer mode" is checked, click "Load unpacked extension...", locate and select your extensions `unpacked` folder and you're ready to go!

### Production

Running `npm run prod` will do everything `npm run dev` does but instead of outputting files to `unpacked`, it packages the extension into `<package-name>.zip` file. 
