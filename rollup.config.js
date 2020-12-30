import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import pkg from './package.json';

const banner = `/**
* Muuri v${pkg.version}
* ${pkg.homepage}
* Copyright (c) 2015-present, Haltu Oy
* Released under the MIT license
* https://github.com/haltu/muuri/blob/master/LICENSE.md
* @license MIT
*
* Muuri Packer
* Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*
* Muuri Ticker / Muuri Emitter / Muuri Dragger
* Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*
* Muuri AutoScroller
* Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*/
`;

const stripBanner = {
  transform(code) {
    return {
      code: code.replace(/\/\*\*([\s\S]*?)\*\//, ''),
      map: { mappings: '' },
    };
  },
};

module.exports = [
  {
    input: 'src/index.ts',
    output: [
      {
        name: 'Muuri',
        file: pkg.main,
        format: 'umd',
        banner: banner,
      },
      {
        name: 'Muuri',
        file: pkg.module,
        format: 'es',
        banner: banner,
      },
    ],
    plugins: [stripBanner, typescript()],
  },
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/muuri.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];
