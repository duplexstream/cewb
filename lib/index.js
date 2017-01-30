const fs = require('fs-promise')
const MemoryFS = require('memory-fs')
const JSZip = require('jszip')
const webpack = require('webpack')
const babel = require('babel-core')
const { resolve } = require('path')
const { Server: WebSocketServer } = require('ws')
const pkg = require(resolve(process.cwd(), 'package.json'))

let sockets = []
const memoryFs = new MemoryFS()
const ASSETS = resolve(process.cwd(), 'assets')

const addEntriesToConfig = (target, base, DEV) => (config, file) => {
  const relativePath = resolve(target, file.file)
    .replace(base, '')
    .slice(1)
  const entry = relativePath
    .replace(/\.ext/, '')
    .replace(/\//g, '--')
    .slice(0, -3)

  config.entry[entry] = [
    require.resolve('babel-polyfill'),
    './' + relativePath
  ]

  if (DEV && entry === 'background') {
    config.entry[entry] = [
      resolve(__dirname, 'reload.js'),
      ...config.entry[entry]
    ]
  }

  return config
}

const addManifestFile = (files) =>
  fs.readFile(resolve(process.cwd(), 'manifest.json'))
    .then((contents) => Object.assign({}, files, {'manifest.json': contents}))

const filter = (fn) => (arr) => arr.filter(fn)

const finishedCompiling = (DEV) => (err, stats) => {
  console.log(stats.toString({colors: true, chunks: false}))

  const src = memoryFs.readdirSync(resolve(process.cwd(), 'dist'))
    .reduce((tree, file) => {
      const filename = resolve(process.cwd(), `dist/${file}`)
      tree[file.replace(/--/g, '/')] = memoryFs.readFileSync(filename)
      return tree
    }, {})

  return fs.readdir(ASSETS)
    .then(promiseAllMap(mapFilenameToContents(ASSETS)))
    .then((files) => files.reduce(reduceFilesToTree('assets'), src))
    .then(addManifestFile)
    .then(outputFiles(DEV))
}

const getNestedEntries = (target, base, config, DEV) => (files) => Promise.all(files.map((file) => {
  const path = resolve(target, file.file)
  const isDirectory = file.stats.isDirectory()
  if (isDirectory) {
    return getWebpackEntries(path, base, config, DEV).then(() => ({file: file.file, isDirectory}))
  }
  return Promise.resolve({file: file.file, isDirectory})
}))

const getWebpackEntries = (target, base, config, DEV) => {
  if (!base) {
    base = target
  }

  return fs.readdir(target)
    .then(promiseAllMap(mapFilesToStats(target)))
    .then(getNestedEntries(target, base, config, DEV))
    .then(filter(isNotDirectory))
    .then(filter(isExtensionFile))
    .then(reduce(addEntriesToConfig(target, base, DEV), config))
}

const isExtensionFile = (file) => /\.ext\.js$/.test(file.file)
const isNotDirectory = (file) => !file.isDirectory
const map = (fn) => (arr) => arr.map(fn)
const reduce = (fn, init) => (arr) => arr.reduce(fn, init)

const mapFilenameToContents = (path) => (file) =>
  fs.readFile(resolve(path, file))
    .then((contents) => ({file, contents}))

const mapFilesToStats = (target) => (file) =>
  fs.stat(resolve(target, file))
    .then((stats) => ({file, stats}))

const outputFiles = (DEV) => (files) => {
  if (DEV) {
    return fs.remove(resolve(process.cwd(), 'unpacked'))
      .then(() =>
        Object.keys(files).reduce((promise, file) => (
          promise.then(() =>
            fs.outputFile(resolve(process.cwd(), 'unpacked', file), files[file])
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

const promiseAllMap = (fn) => (arr) => Promise.all(arr.map(fn))

const reduceFilesToTree = (path) => (tree, file) =>
  Object.assign({}, tree, {[`${path}/${file.file}`]: file.contents})

const startCompiler = (DEV) => (config) => {
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
    compiler.watch({}, finishedCompiling(DEV))
  } else {
    compiler.run(finishedCompiling(DEV))
  }

  compiler.outputFileSystem = memoryFs
}

module.exports = {
  filter,
  finishedCompiling,
  getWebpackEntries,
  map,
  mapFilenameToContents,
  mapFilesToStats,
  outputFiles,
  promiseAllMap,
  reduceFilesToTree,
  startCompiler
}
