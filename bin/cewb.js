#!/usr/bin/env node

const argv = require('yargs')
  .usage('Usage: $0 [options]')
  .alias('p', ['pack', 'production'])
  .describe('p', 'run in production and pack extension')
  .help('h')
  .alias('h', 'help')
  .argv

const { resolve } = require('path')
const webpackConfig = require('../webpack.config')
const { getWebpackEntries, startCompiler } = require('../lib')

const ROOT = process.cwd()
const SRC = resolve(ROOT, 'src')
const DEV = !argv.production
const ENV = DEV ? 'development' : 'production'
const config = webpackConfig(ENV)

const customConfig = (config) => {
  try {
    return require(resolve(ROOT, 'webpack.js'))(config, ENV)
  } catch (err) {
    return config
  }
}

getWebpackEntries(SRC, null, config, DEV)
  .then(customConfig)
  .then(startCompiler(DEV))
  .catch((err) => console.error('Error:', err))
