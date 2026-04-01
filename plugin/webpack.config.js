const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = [
  // ── UI bundle (runs in browser iframe) ────────────────────────────
  {
    entry: './src/ui.tsx',
    output: {
      filename: 'ui.js',
      path: path.resolve(__dirname, 'dist'),
    },
    resolve: { extensions: ['.tsx', '.ts', '.js'] },
    module: {
      rules: [
        { test: /\.tsx?$/, use: { loader: 'ts-loader', options: { configFile: 'tsconfig.ui.json' } }, exclude: /node_modules/ },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/ui.html',
        filename: 'ui.html',
        // Inline the JS so the plugin works as a single HTML file
        inject: 'body',
        scriptLoading: 'blocking',
      }),
      // Inject API URL at build time — process.env is unavailable in the Figma sandbox
      new webpack.DefinePlugin({
        'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(
          process.env.NEXT_PUBLIC_API_URL || ''
        ),
      }),
    ],
  },

  // ── Main bundle (runs in Figma sandbox — no DOM) ──────────────────
  {
    entry: './src/main.ts',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist'),
    },
    resolve: { extensions: ['.ts', '.js'] },
    module: {
      rules: [
        { test: /\.ts$/, use: { loader: 'ts-loader', options: { configFile: 'tsconfig.main.json' } }, exclude: /node_modules/ },
      ],
    },
    // Figma sandbox is browser-like but has no window; 'web' is the closest valid target
    target: 'web',
  },
];
