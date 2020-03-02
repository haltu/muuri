const pkg = require('./package.json');
const banner = require('./rollup.banner.js');
const webWorkerLoader = require('rollup-plugin-web-worker-loader');

const stripBanner = {
  transform(code) {
    return {
      code: code.replace(/\/\*\*([\s\S]*?)\*\//, ''),
      map: { mappings: '' }
    };
  }
};

module.exports = {
  input: 'src/index.js',
  output: {
    name: 'Muuri',
    file: pkg.main,
    format: 'umd',
    banner: banner
  },
  plugins: [webWorkerLoader(), stripBanner]
};
