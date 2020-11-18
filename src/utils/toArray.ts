/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isNodeList from './isNodeList';

/**
 * Converts a value to an array or clones an array.
 *
 * @param {*} val
 * @returns {array}
 */
export default function toArray(val: any) {
  return isNodeList(val) ? Array.prototype.slice.call(val) : Array.prototype.concat(val);
}
