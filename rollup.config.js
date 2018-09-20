import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import stripBanner from 'rollup-plugin-strip-banner';
import pkg from './package.json';

const banner = `
/**
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
 * Muuri Ticker / Muuri Emitter / Muuri Queue
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * @license MIT
 */
`;

export default [
  {
    external: ['hammerjs'],
    input: 'src/index.js',
    output: {
      name: 'Muuri',
      file: pkg.main,
      format: 'umd',
      globals: { hammerjs: 'Hammer' },
      banner: banner
    },
    plugins: [resolve(), commonjs(), stripBanner()]
  },
  {
    external: ['hammerjs'],
    input: 'src/index.js',
    output: {
      name: 'Muuri',
      file: pkg.main.replace('.js', '.min.js'),
      format: 'umd',
      globals: { hammerjs: 'Hammer' },
      banner: banner
    },
    plugins: [
      resolve(),
      commonjs(),
      terser({
        output: {
          comments: 'some'
        }
      })
    ]
  }
];
