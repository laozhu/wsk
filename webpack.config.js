const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlExcludeAssetsPlugin = require('html-webpack-exclude-assets-plugin');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
const isDll = process.env.NODE_ENV === 'dll';
const PATH = { base: path.resolve() };

// Entries && Dependences
PATH.externals = {};
PATH.src = path.resolve(PATH.base, 'src');
PATH.scripts = path.resolve(PATH.src, 'scripts');
PATH.styles = path.resolve(PATH.src, 'styles');
PATH.images = path.resolve(PATH.src, 'images');
PATH.media = path.resolve(PATH.src, 'media');
PATH.fonts = path.resolve(PATH.src, 'fonts');
PATH.assets = path.resolve(PATH.src, 'assets');
PATH.templates = path.resolve(PATH.src, 'templates');
PATH.API_URL = isDev ? 'http://localhost:3000' : '';
PATH.exclude = /(node_modules|bower_components)/;
PATH.dll = {
  vendor: ['axios'],
};
PATH.entry = {
  bundle: './src/index.js',
};
PATH.pages = [
  {
    filename: 'index.html',
    template: path.resolve(PATH.templates, 'index.html'),
    chunks: ['bundle'],
    excludeAssets: [],
  },
];

// Output
PATH.publicPath = '';
PATH.dist = path.resolve(PATH.base, 'dist');
PATH.filename = {
  js: isProd ? 'js/[name].[chunkhash:10].js' : 'js/[name].js',
  css: isProd ? 'css/[name].[contentHash:10].css' : 'css/[name].css',
  img: isProd ? 'img/[name].[hash:10].[ext]' : 'img/[name].[ext]',
  fonts: isProd ? 'fonts/[name].[hash:10].[ext]' : 'fonts/[name].[ext]',
  dll: 'js/[name].[chunkhash:10].dll.js',
};

// HTML Prefs
const htmlMinimize = false;

// Welcome message
console.log(`Running webpack in the ${process.env.NODE_ENV} mode`);

// Make loader list according to node env.
const makeLoaders = (nodeEnv) => {
  switch (nodeEnv) {
    case 'dll': return [];
    default:
      return [
        {
          test: /\.(htm|html)$/,
          loader: 'html-loader',
          include: PATH.templates,
          exclude: PATH.exclude,
          options: {
            minimize: isProd && htmlMinimize,
            attrs: ['img:src', 'img:data-src'],
          },
        },
        {
          test: /\.js$/,
          loader: `babel-loader${isProd ? '' : '?cacheDirectory'}`,
          include: [
            PATH.scripts,
            path.resolve(PATH.base, 'index.js'),
          ],
          exclude: PATH.exclude,
        },
        {
          test: /\.css$/,
          use: ExtractTextPlugin.extract({
            use: [
              `css-loader?sourceMap${isProd ? '&minimize' : ''}`,
              'postcss-loader?sourceMap',
            ],
            fallback: 'style-loader?sourceMap&singleton',
          }),
          include: PATH.styles,
          exclude: PATH.exclude,
        },
        {
          test: /\.(png|jpe?g|gif|webp)(\?.*)?$/,
          loader: 'url-loader',
          include: PATH.images,
          exclude: PATH.exclude,
          options: {
            limit: 2048,
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
            limit: 2048,
            noquotes: true,
            stripdeclarations: true,
            name: PATH.filename.img,
            publicPath: '../',
          },
        },
        {
          test: /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/,
          loader: 'file-loader',
          include: PATH.media,
          exclude: PATH.exclude,
          options: {
            name: PATH.filename.img,
          },
        },
        {
          test: /\.(eot|ttf|otf|woff2?|svg)(\?.*)?$/,
          loader: 'url-loader',
          include: PATH.fonts,
          exclude: PATH.exclude,
          options: {
            limit: 2048,
            name: PATH.filename.fonts,
            publicPath: '../',
          },
        },
      ];
  }
};

// Make plugin list according to node env.
const makePlugins = (nodeEnv) => {
  let basePlugins = [];
  if (!isDll) {
    basePlugins = [
      ...basePlugins,
      new webpack.DefinePlugin({
        'process.env': {
          API_URL: JSON.stringify(PATH.API_URL),
        },
      }),
      new ExtractTextPlugin({ filename: PATH.filename.css }),
      new CopyPlugin([
        {
          from: PATH.assets,
          to: PATH.dist,
          ignore: ['.DS_Store', '.gitkeep'],
        },
      ]),
      new ManifestPlugin({
        seed: Object.keys(PATH.dll).length !== 0 ? JSON.parse(fs.readFileSync(path.resolve(PATH.dist, 'js', 'dll.manifest.json'))) : {},
        fileName: path.resolve(PATH.dist, 'manifest.json'),
        filter: chunk => chunk.name && !/\S*.(map|ico|txt)$/.test(chunk.name),
      }),
    ];
    if (Object.keys(PATH.dll).length !== 0) {
      try {
        basePlugins = [
          ...basePlugins,
          ...Object.keys(PATH.dll).map(name => new webpack.DllReferencePlugin({
            context: PATH.base,
            manifest: require(path.resolve(PATH.dist, 'js', `${name}.dll.manifest.json`)),
          })),
        ];
      } catch (e) {
        console.warn('\n\n  ⚠️。There are dll dependences for your project');
        console.warn('  ⚠️。You should run `yarn build:dll` before development or build\n\n');
      }
    }
    if (PATH.pages.length !== 0) {
      basePlugins = [
        ...basePlugins,
        ...PATH.pages.map(page => new HtmlWebpackPlugin(page)),
        new HtmlExcludeAssetsPlugin(),
        new AddAssetHtmlPlugin({
          outputPath: 'js',
          filepath: path.resolve(PATH.dist, 'js', '*.dll.js'),
          publicPath: `${PATH.publicPath}js/`,
        }),
      ];
    }
  }
  switch (nodeEnv) {
    case 'dll':
      return [
        new ManifestPlugin({
          fileName: path.resolve(PATH.dist, 'js', 'dll.manifest.json'),
          filter: chunk => chunk.name && !/\S*.map$/.test(chunk.name),
        }),
        new webpack.DllPlugin({
          context: PATH.base,
          name: '[name]_[chunkhash:10]_dll',
          path: path.resolve(PATH.dist, 'js', '[name].dll.manifest.json'),
        }),
      ];
    case 'development': return basePlugins.concat([
      // new webpack.HotModuleReplacementPlugin(),
      new webpack.WatchIgnorePlugin([PATH.dist, PATH.exclude]),
    ]);
    case 'production': return basePlugins.concat([]);
    default: return basePlugins.concat([]);
  }
};

// Export Config
module.exports = {
  context: PATH.base,
  externals: PATH.externals,
  mode: isDev ? 'development' : 'production',
  devtool: isDev ? 'cheap-module-eval-source-map' : 'source-map',
  entry: isDll ? PATH.dll : PATH.entry,
  output: {
    path: PATH.dist,
    filename: isDll ? PATH.filename.dll : PATH.filename.js,
    chunkFilename: isDll ? PATH.filename.dll : PATH.filename.js,
    publicPath: PATH.publicPath,
    library: isDll ? '[name]_[chunkhash:10]_dll' : '',
  },
  devServer: {
    hot: false,
    compress: true,
    historyApiFallback: true,
    disableHostCheck: true,
    headers: {}, // Custom headers for API testing
    host: process.env.HOST || '0.0.0.0', // Defaults to `localhost`
    port: process.env.PORT || 8080, // Defaults to 8080
  },
  module: { rules: makeLoaders(process.env.NODE_ENV) },
  plugins: makePlugins(process.env.NODE_ENV),
};
