/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Check if a value is a function.
 *
 * @param {*} val
 * @returns {boolean}
 */
export function isFunction(val: any): val is Function {
  return typeof val === 'function';
}
