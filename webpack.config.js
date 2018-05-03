const path = require('path');
const webpack = require('webpack');
const internalIp = require('internal-ip');
const ManifestPlugin = require('webpack-manifest-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

// 环境变量
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
const withServer = parseInt(process.env.SERVER, 10) === 1;
const withAnalyzer = parseInt(process.env.ANALYZER, 10) === 1;
console.log(`Running webpack in the ${process.env.NODE_ENV} mode`);

// HTML 压缩偏好
const dataUriLimit = 2048;
const htmlMinimize = false;
const htmlPrettier = {
  collapseBooleanAttributes: true,
  collapseInlineTagWhitespace: true,
  collapseWhitespace: true,
  minifyCSS: true,
  minifyJS: true,
  preserveLineBreaks: true,
  removeComments: true,
  removeEmptyAttributes: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  sortAttributes: true,
  sortClassName: true,
  useShortDoctype: true,
};

// 路径常量
const PATH = { base: __dirname };
PATH.src = path.resolve(PATH.base, 'src');
PATH.templates = path.resolve(PATH.src, 'templates');
PATH.styles = path.resolve(PATH.src, 'styles');
PATH.scripts = path.resolve(PATH.src, 'scripts');
PATH.images = path.resolve(PATH.src, 'images');
PATH.assets = path.resolve(PATH.src, 'assets');
PATH.fonts = path.resolve(PATH.src, 'fonts');
PATH.dist = path.resolve(PATH.base, 'dist');
PATH.exclude = /(node_modules|bower_components)/;

// 入口对象
PATH.entry = {
  bundle: './src/index.js',
};

// 外部引入资源
PATH.externals = {};

// 定义模块别名
PATH.alias = {
  'async-es': 'async',
  'lodash-es': 'lodash',
};

// HTML 页面列表
PATH.pages = [
  {
    filename: 'index.html',
    template: path.resolve(PATH.templates, 'index.html'),
    chunks: ['vendor', 'bundle'],
  },
];

PATH.pages.map((page) => {
  const thisPage = page;
  thisPage.chunks.unshift('runtime');
  thisPage.chunksSortMode = 'manual';
  thisPage.minify = htmlPrettier;
  return thisPage;
});

// Scripts 扩展选项
const scriptExtOptions = {
  inline: /runtime.*\.js$/,
  async: [],
  defer: [],
  module: [],
  custom: {
    test: /\.nomodule\.js$/,
    attribute: 'nomodule',
  },
};

// manifest.json
PATH.manifest = path.resolve(PATH.dist, 'manifest.json');

// 外部链接
PATH.publicPath = isProd ? '/' : '';

// API BASE URL
PATH.API_BASE = isDev ? 'http://localhost:3000' : '';

// 文件名
PATH.filename = {
  js: isProd ? 'js/[name].[chunkhash:10].js' : 'js/[name].js',
  css: isProd ? 'css/[name].[contentHash:10].css' : 'css/[name].css',
  img: isProd ? 'img/[name].[hash:10].[ext]' : 'img/[name].[ext]',
  fonts: isProd ? 'fonts/[name].[hash:10].[ext]' : 'fonts/[name].[ext]',
};

// SourceMaps
PATH.devtool = isProd ? 'source-map' : 'cheap-module-eval-source-map';

// 根据环境变量生成 Loaders 列表
const makeLoaders = env => [
  {
    test: /\.(htm|html)$/,
    loader: 'html-loader',
    include: PATH.templates,
    exclude: PATH.exclude,
    options: {
      minimize: env.isProd && env.htmlMinimize,
      attrs: ['img:src', 'img:data-src'],
    },
  },
  {
    test: /\.(css|scss)$/,
    use: [
      env.withServer ? 'style-loader?sourceMap&singleton' : MiniCssExtractPlugin.loader,
      `css-loader?sourceMap&importLoaders=1${env.isProd ? '&minimize' : ''}`,
      'postcss-loader?sourceMap',
    ],
    include: PATH.styles,
    exclude: PATH.exclude,
  },
  {
    test: /\.js$/,
    loader: `babel-loader${env.isProd ? '' : '?cacheDirectory'}`,
    include: [
      PATH.scripts,
      path.resolve(PATH.src, 'index.js'),
    ],
    exclude: PATH.exclude,
  },
  {
    test: /\.(png|jpe?g|gif|webp)(\?.*)?$/,
    loader: 'url-loader',
    include: PATH.images,
    exclude: PATH.exclude,
    options: {
      limit: dataUriLimit,
      name: PATH.filename.img,
      publicPath: '../',
    },
  },
  {
    test: /\.svg(\?.*)?$/,
    loader: 'svg-url-loader',
    include: PATH.images,
    exclude: PATH.exclude,
    options: {
      limit: dataUriLimit,
      noquotes: true,
      stripdeclarations: true,
      name: PATH.filename.img,
      publicPath: '../',
    },
  },
  {
    test: /\.(png|jpe?g|gif|webp)(\?.*)?$/,
    loader: 'url-loader',
    include: PATH.assets,
    exclude: PATH.exclude,
    options: {
      limit: dataUriLimit,
      name: PATH.filename.img,
    },
  },
  {
    test: /\.svg(\?.*)?$/,
    loader: 'svg-url-loader',
    include: PATH.assets,
    exclude: PATH.exclude,
    options: {
      limit: dataUriLimit,
      noquotes: true,
      stripdeclarations: true,
      name: PATH.filename.img,
    },
  },
  {
    test: /\.(eot|ttf|otf|woff2?|svg)(\?.*)?$/,
    loader: 'url-loader',
    include: PATH.fonts,
    exclude: PATH.exclude,
    options: {
      limit: dataUriLimit,
      name: PATH.filename.fonts,
      publicPath: '../',
    },
  },
];

// 根据环境变量生成 Plugins 列表
const makePlugins = (env) => {
  let basePlugins = [
    new webpack.DefinePlugin({
      'process.env': {
        API_BASE: JSON.stringify(PATH.API_BASE),
      },
    }),
  ];

  // With Server
  basePlugins = basePlugins.concat(env.withServer ? [] : [
    new MiniCssExtractPlugin({
      filename: env.isProd ? 'css/[name].[contentHash:10].css' : 'css/[name].css',
      chunkFilename: env.isProd ? 'css/[name].[contentHash:10].css' : 'css/[name].css',
    }),
    new ManifestPlugin({
      fileName: PATH.manifest,
      filter: chunk => chunk.name && !/\S*.(map|htm|html)$/.test(chunk.name),
    }),
  ]);

  // With HTML pages
  if (PATH.pages && PATH.pages.length !== 0) {
    basePlugins = basePlugins.concat([
      ...PATH.pages.map(page => new HtmlWebpackPlugin(page)),
      new ScriptExtHtmlWebpackPlugin(scriptExtOptions),
    ]);
  }

  // With Bundle Analyzer
  if (env.withAnalyzer) {
    basePlugins = basePlugins.concat([
      new BundleAnalyzerPlugin(),
    ]);
  }

  // Mode: production
  if (env.isProd) {
    return basePlugins.concat([
      new CopyPlugin([
        path.resolve(PATH.src, 'robots.txt'),
        path.resolve(PATH.assets, 'favicon.ico'),
      ]),
      new webpack.HashedModuleIdsPlugin(),
    ]);
  }

  return basePlugins;
};

// 主入口
module.exports = {
  mode: process.env.NODE_ENV,
  context: PATH.base,
  entry: PATH.entry,
  devtool: PATH.devtool,
  externals: PATH.externals,
  output: {
    path: PATH.dist,
    filename: PATH.filename.js,
    publicPath: PATH.publicPath,
  },
  resolve: {
    alias: PATH.alias,
    extensions: ['.js', '.json'],
  },
  optimization: {
    runtimeChunk: { name: 'runtime' },
    splitChunks: { chunks: 'all', name: 'vendor' },
  },
  stats: {
    children: false,
    modules: false,
  },
  module: {
    rules: makeLoaders({
      isDev, isProd, withServer, htmlMinimize,
    }),
  },
  plugins: makePlugins({
    isDev, isProd, withServer, withAnalyzer,
  }),
};

// Mode: development
if (isDev && withServer) {
  module.exports.serve = {
    // http2: true,
    // https: true,
    open: true,
    host: internalIp.v4.sync(),
    port: 8080,
  };
}
