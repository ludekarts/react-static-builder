const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const plugins = require( "./plugins");
const deepCopy = require( "./helpers/deep-copy");
const deepOverride = require( "./helpers/deep-override");

function webpackConfig(config) {
  return function(env, argv) {

    // Globals.
    const statcConfig = getStaticRcConfig();
    const dirname = statcConfig.dirname;
    const staticrc = statcConfig.staticrc;
    const basepath = cutBaseSlashes(staticrc.basepath);
    const suspenseTimeout = staticrc.suspense;
    const outputFolder = staticrc.output || "static";
    const staticEntry = staticrc.entries.static || "./static.js";
    const dynamicEntry = staticrc.entries.dynamic || "./index.js";
    const staticRoutesPath = staticrc.config || "src/static-routes.js";

    // Plugins.
    const SuspenseBuild = plugins.SuspenseBuild;
    const ExecuteAfterBuild = plugins.ExecuteAfterBuild;

    // Allows to create webpack configurations.
    const createConfiguration = configFactory(dirname, staticRoutesPath);

    // Webpack mode & configuration.
    const mode = env && env.prod;
    const webpackConfig =
      typeof config === "function" ? config.call(this, env, argv) : config;

    // Extract files to await.
    const rsbAwait = webpackConfig.rsbAwait;
    delete webpackConfig.rsbAwait;
 
    // Static configuration.
    const staticConfig = createConfiguration({
      webpackConfig: webpackConfig,
      localConfig: {
        target: "node",
        entry: staticEntry,
        devtool: false,
        output: {
          publicPath: "/",
          filename: "static.js",
          libraryTarget: "commonjs2",
          chunkFilename: "modules/[name].js",
          path: path.resolve(dirname, `${outputFolder}/cache`)
        }
      },
      fileLoader: {
        publicPath: `/${basepath}`,
        emitFile: false
      },
      plugins: [
        new webpack.DefinePlugin({
          staticrc: JSON.stringify(staticrc)
        }),
        rsbAwait && rsbAwait.length
          ? new SuspenseBuild(() => rsbAwait.every(file => fs.existsSync(file)), suspenseTimeout)
          : false,
        new ExecuteAfterBuild("react-static-builder build")
      ].filter(Boolean)
    });

    // Production configuration.
    const productionConfig = createConfiguration({
      webpackConfig: webpackConfig,
      localConfig: {
        entry: dynamicEntry,
        output: {
          filename: "index.js",
          chunkFilename: "modules/[name].js",
          publicPath: basepath ? `/${basepath}/` : "/",
          path: path.resolve(dirname, `${outputFolder}/${basepath}`)
        }
      },
      fileLoader: {
        publicPath: `/${basepath}`
      },
      plugins: [
        new webpack.DefinePlugin({
          staticrc: JSON.stringify(staticrc)
        })
      ]
    });

    // Development configuration.
    const developmentConfig = createConfiguration({
      webpackConfig: webpackConfig,
      plugins: [
        new webpack.DefinePlugin({
          staticrc: JSON.stringify({})
        })
      ]
    });

    return !mode || mode !== "static"
      ? developmentConfig
      : [productionConfig, staticConfig];
  };
}

// ---- Helpers ----------------

function configFactory(dirname, staticRoutesPath) {
  return ({ webpackConfig, localConfig = {}, fileLoader, plugins }) => {
    let configuration = Object.assign({}, deepCopy(webpackConfig), localConfig);
  
    // Add static configuration
    configuration = deepOverride(configuration, {
      resolve: {
        alias: {
          staticRoutes: path.resolve(dirname, staticRoutesPath)
        }
      }
    });

    // Add file-loader config.
    fileLoader && setupFileLoader(configuration, fileLoader);

    // Add plugins.
    plugins && addPlugins(configuration, plugins);

    return configuration;
  };
}

// Add plugins to the config -- mutates config.
function addPlugins(config, plugins) {
  config.plugins = config.plugins ? config.plugins.slice() : [];
  plugins.forEach(plugin => config.plugins.push(plugin));
  return config;
}

// Add file-loader setup to the config -- mutates config.
function setupFileLoader(config, setup) {
  config.module.rules &&
    config.module.rules.forEach(rule => {
      if (!rule.use) return;
      rule.use.forEach(entry => {
        if (entry.loader === "file-loader") {
          entry.options = entry.options
            ? Object.assign(entry.options, setup)
            : setup;
        }
      });
    });
  return config;
}

function getStaticRcConfig() {  
  try {    
    const dirname = process.cwd();    
    return {
      dirname: dirname,
      staticrc: JSON.parse(fs.readFileSync(path.join(dirname, ".staticrc")))
    };
  } catch (error) {
    throw new Error(`Cannot read ".staticrc" config file. \n${error}`);
  }
}

function cutBaseSlashes(basepath) {
  if (!basepath) return "";
  basepath = /^\//.test(basepath) ? basepath.slice(1) : basepath;
  basepath = /\/$/.test(basepath) ? basepath.slice(0, -1) : basepath;
  return basepath;
}

// Export.
module.exports = webpackConfig;