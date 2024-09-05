const path = require("path");
module.exports = {
    conext: __dirname,
    entry: ".src/main.js",
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "/dist"
    },

    module: {
        rules: {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: {
                loader: "ts-loader"
            }
        }
    },

    resolve: {
        extensions: [".ts"]
    }
}