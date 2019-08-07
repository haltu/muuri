/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var functionType = 'function';

/**
 * Check if a value is a function.
 *
 * @param {*} val
 * @returns {Boolean}
 */
export default function isFunction(val) {
  return typeof val === functionType;
}
