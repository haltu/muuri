/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isFunction from './isFunction';

const nativeCode = '[native code]';

/**
 * Check if a value (e.g. a method or constructor) is native code. Good for
 * detecting when a polyfill is used and when not.
 *
 * @param {*} feat
 * @returns {boolean}
 */
export default function isNative(feat: any) {
  return !!(
    feat &&
    isFunction(window.Symbol) &&
    isFunction(window.Symbol.toString) &&
    window.Symbol(feat).toString().indexOf(nativeCode) > -1
  );
}
