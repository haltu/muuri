/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isFunction from './isFunction';

var nativeCode = '[native code]';

/**
 * Check if a value (e.g. a method or constructor) is native code. Good for
 * detecting when a polyfill is used and when not.
 *
 * @param {*} feat
 * @returns {Boolean}
 */
export default function isNative(feat) {
  var S = window.Symbol;
  return !!(
    feat &&
    isFunction(S) &&
    isFunction(S.toString) &&
    S(feat).toString().indexOf(nativeCode) > -1
  );
}
