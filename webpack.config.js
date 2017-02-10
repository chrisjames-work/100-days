const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackTemplate = require('html-webpack-template');
const webpack = require('webpack');
const merge = require('webpack-merge');

const parts = require('./webpack.parts');

const PATHS = {
  app: path.join(__dirname, 'app'),
  build: path.join(__dirname, 'build'),
};

const common = merge([
  {
    // Entry accepts a path or an object of entries.
    // We'll be using the latter form given it's
    // convenient with more complex configurations.
    //
    // Entries have to resolve to files! It relies on Node
    // convention by default so if a directory contains *index.js*,
    // it will resolve to that.
    entry: {
      app: PATHS.app,
    },
    output: {
      path: PATHS.build,
      filename: '[name].js',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: HtmlWebpackTemplate,
        title: '100 days',
        appMountId: 'app', // Generate #app where to mount
        mobile: true, // Scale page on mobile
        inject: false, // html-webpack-template needs this to work
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx'],
    },
  },
  parts.lintCSS({ include: PATHS.app }),
  parts.loadJavaScript({ include: PATHS.app }),
]);

function production() {
  return merge([
    common,
    {
      // react-lite implements React's API apart from features like propTypes
      // and server side rendering, but in a far smaller sized package
      resolve: {
        alias: {
          'react': 'react-lite',
          'react-dom': 'react-lite',
        },
      },
      performance: {
        hints: 'warning', // 'error' or false are valid too
        maxEntrypointSize: 100000, // in bytes
        maxAssetSize: 150000, // in bytes
      },
      output: {
        chunkFilename: 'scripts/[chunkhash:8].js',
        filename: '[name].[chunkhash:8].js',
      },
    },
    parts.clean(PATHS.build),
    parts.minifyJavaScript({ useSourceMap: true }),
    parts.minifyCSS({
      // more options: http://cssnano.co/optimisations/
      options: {
        discardComments: {
          removeAll: true,
        },
      },
    }),
    parts.lintJavaScript({ include: PATHS.app }),
    parts.extractCSS({
      use: [ 'css-loader', 'postcss-loader' ],
    }),
    parts.generateSourceMaps({ type: 'source-map' }),
    // http://survivejs.com/webpack/optimizing-build/setting-environment-variables/
    parts.setFreeVariable(
      'process.env.NODE_ENV',
      'production'
    ),
  ]);
}

function development() {
  return merge([
    common,
    {
      output: {
        devtoolModuleFilenameTemplate: 'webpack:///[absolute-resource-path]',
      },
      plugins: [
        new webpack.NamedModulesPlugin(),
      ],
    },
    // http://survivejs.com/webpack/advanced-techniques/configuring-react/#exposing-react-performance-utilities-to-browser
    // parts.exposeLoader,
    parts.generateSourceMaps({ type: 'cheap-module-eval-source-map' }),
    parts.devServer({
      // Customize host/port here if needed
      host: process.env.HOST,
      port: process.env.PORT,
    }),
    parts.lintJavaScript({
      include: PATHS.app,
      options: {
        // Emit warnings over errors to avoid crashing
        // HMR on error.
        emitWarning: true,
      },
    }),
    parts.loadCSS(),
  ]);
}

function reactDevelopment() {
  return {
    entry: {
      // react-hot-loader has to run before demo!
      react: ['react-hot-loader/patch', PATHS.app],
    },
  };
}

module.exports = function(env) {
  process.env.BABEL_ENV = env;

  if (env === 'production') {
    return production();
  }

  return merge(development(), reactDevelopment());
};

// Notes
// Configuring HMR with Redux: http://survivejs.com/webpack/developing-with-webpack/configuring-hmr/#configuring-hmr-with-redux
// Bundle splitting: http://survivejs.com/webpack/building-with-webpack/splitting-bundles/
// Babel polyfills, presets, etc: http://survivejs.com/webpack/building-with-webpack/processing-with-babel/#polyfilling-features
// Build revisions: http://survivejs.com/webpack/building-with-webpack/attaching-revision/
// Shrinkwrap: http://survivejs.com/webpack/advanced-techniques/consuming-packages/#shrinkwrapping-versions
// Optimizations for React, e.g. remove PropTypes from prod: http://survivejs.com/webpack/advanced-techniques/configuring-react/#babel-based-optimizations-for-react
// React.Perf: http://survivejs.com/webpack/advanced-techniques/configuring-react/#exposing-react-performance-utilities-to-browser
