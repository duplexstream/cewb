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
const config = webpackConfig(argv.production ? 'production' : 'development')

getWebpackEntries(SRC, null, config, DEV)
  .then(startCompiler(DEV))
  .catch((err) => console.error('Error:', err))
