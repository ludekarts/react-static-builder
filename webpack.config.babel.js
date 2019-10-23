import path from "path";

export default {

  entry: "./index.js",

  output: {
    filename: "index.js",
    libraryTarget: "umd",
    library: "react-static-builder",
    path: path.resolve(__dirname, "./lib"),
  },

  externals : {
    "react": "react",
    "react-dom": "react-dom",
    "staticRoutes": "staticRoutes"    
  },

  context: path.resolve(__dirname, "browser"),

  module: {
    rules: [
      {
        test: /\.js?$/,
        loader: "babel-loader",
        exclude: /node_modules/
      }
    ]
  }
};