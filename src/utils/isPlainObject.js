/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var objectType = 'object';
var objectToStringType = '[object Object]';
var toString = Object.prototype.toString;

/**
 * Check if a value is a plain object.
 *
 * @param {*} val
 * @returns {Boolean}
 */
export default function isPlainObject(val) {
  return typeof val === objectType && toString.call(val) === objectToStringType;
}
