const webpack = require('webpack')
const MemoryFS = require('memory-fs')
const JSZip = require('jszip')
const babel = require('babel-core')
const fs = require('fs-promise')
const { resolve } = require('path')
const { Server: WebSocketServer } = require('ws')
const pkg = require('./package')
const webpackConfig = require('./webpack.config')

const config = webpackConfig(process.argv[2])
const DEV = process.argv[2] === 'development'
const assetsPath = resolve(__dirname, './assets')
const memoryFs = new MemoryFS()
let sockets = []

const mapFilenameToContents = (file) =>
  fs.readFile(resolve(assetsPath, file)).then((contents) => ({file, contents}))

const mapFilesToStats = (target) => (file) =>
  fs.stat(resolve(target, file)).then((stats) => ({file, stats}))

const reduceFilesToTree = (path) => (tree, file) =>
  Object.assign({}, tree, {[`${path}/${file.file}`]: file.contents})

const getNestedEntries = (files, target, base) => Promise.all(files.map((file) => {
  const path = resolve(target, file.file)
  const isDirectory = file.stats.isDirectory()
  if (isDirectory) {
    return getWebpackEntries(path, base).then(() => ({file: file.file, isDirectory}))
  }
  return Promise.resolve({file: file.file, isDirectory})
}))

const filterDirectories = (file) => !file.isDirectory

const filterExtensionScripts = (file) => /\.ext\.js$/.test(file.file)

const addEntriesToConfig = (target, base) => (file) => {
  const relativePath = resolve(target, file.file)
    .replace(base, '')
    .slice(1)
  const entry = relativePath
    .replace(/\.ext/, '')
    .replace(/\//g, '--')
    .slice(0, -3)
  config.entry[entry] = [
    'babel-polyfill',
    `./${relativePath}`
  ]
}

const getWebpackEntries = (target, base) => {
  if (!base) {
    base = target
  }

  return fs.readdir(target)
    .then((files) => Promise.all(files.map(mapFilesToStats(target))))
    .then((files) => getNestedEntries(files, target, base))
    .then((files) => files.filter(filterDirectories))
    .then((files) => files.filter(filterExtensionScripts))
    .then((files) => files.map(addEntriesToConfig(target, base)))
    .catch((err) => console.error('err:', err))
}

const addManifestFile = (files) => {
  return fs.readFile(resolve(__dirname, 'manifest.json'))
    .then((contents) => Object.assign({}, files, {'manifest.json': contents}))
}

const outputFiles = (files) => {
  if (DEV) {
    return fs.remove(resolve(__dirname, 'unpacked'))
      .then(() =>
        Object.keys(files).reduce((promise, file) => (
          promise.then(() =>
            fs.outputFile(resolve(__dirname, 'unpacked', file), files[file])
          )
        ), Promise.resolve())
      )
      .then(() => sockets.forEach((socket) => socket.send('reload')))
  } else {
    const filename = `${pkg.name}.zip`
    const zip = new JSZip()
    Object.keys(files).forEach((file) => zip.file(file, files[file]))
    fs.remove(filename)
      .then(() => {
        zip
          .generateNodeStream({streamFiles: true})
          .pipe(fs.createWriteStream(filename))
          .on('finish', () => {
            console.log(`${filename} written.`)
          })
      })
  }
}

const finishedCompiling = (err, stats) => {
  console.log(stats.toString({colors: true}))
  const src = memoryFs.readdirSync(resolve(__dirname, 'dist'))
    .reduce((tree, file) => {
      const filename = resolve(__dirname, `dist/${file}`)
      tree[file.replace(/\-\-/g, '/')] = memoryFs.readFileSync(filename)
      return tree
    }, {})

  fs.readdir(assetsPath)
    .then((files) => Promise.all(files.map(mapFilenameToContents)))
    .then((files) => files.reduce(reduceFilesToTree('assets'), src))
    .then(addManifestFile)
    .then(outputFiles)
}

function startCompiler() {
  const compiler = webpack(config)
  if (DEV) {
    const server = new WebSocketServer({port: 34343})
    server.on('connection', (ws) => {
      sockets = [
        ...sockets,
        ws
      ]
      ws.on('close', () => {
        const index = sockets.indexOf(ws)
        sockets = [
          ...sockets.slice(0, index),
          ...sockets.slice(index + 1)
        ]
      })
    })
    compiler.watch({}, finishedCompiling)
  } else {
    compiler.run(finishedCompiling)
  }

  compiler.outputFileSystem = memoryFs
}

getWebpackEntries(resolve(__dirname, 'src'))
  // .then(() => console.log(config.entry))
  .then(() => startCompiler())
  .catch((err) => console.log(err))
