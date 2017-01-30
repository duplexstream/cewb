const webpack = require('webpack')
const { resolve } = require('path')

module.exports = (env) => {
  const DEV = env === 'development'
  const config = {
    devtool: DEV ? 'source-map' : false,
    context: resolve(process.cwd(), 'src'),
    entry: {},
    output: {
      filename: '[name].js',
      path: resolve(process.cwd(), 'dist')
    },
    module: {
      loaders: [
        {
          loader: require.resolve('babel-loader'),
          exclude: [
            /node_modules/
          ],
          test: /\.js$/
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'window.DEV': DEV
      })
    ]
  }

  if (!DEV) {
    config.plugins.push(new webpack.optimize.UglifyJsPlugin({
      compress: {
        screw_ie8: true,
        warnings: false
      }
    }))
  }

  return config
}
