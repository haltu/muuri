/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

const toString = Object.prototype.toString;
export type PlainObject = { [key: string]: any };

/**
 * Check if a value is a plain object.
 *
 * @param {*} val
 * @returns {boolean}
 */
export default function isPlainObject(val: any): val is PlainObject {
  return typeof val === 'object' && toString.call(val) === '[object Object]';
}
