const pkg = require('./package.json');
const banner = require('./rollup.banner.js');

const stripBanner = {
  transform(code) {
    return {
      code: code.replace(/\/\*\*([\s\S]*?)\*\//, ''),
      map: { mappings: '' }
    };
  }
};

module.exports = {
  external: ['hammerjs'],
  input: 'src/index.js',
  output: {
    name: 'Muuri',
    file: pkg.main,
    format: 'umd',
    globals: { hammerjs: 'Hammer' },
    banner: banner
  },
  plugins: [stripBanner]
};
