/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isNodeList from './isNodeList';

/**
 * Converts a value to an array or clones an array.
 *
 * @param {*} target
 * @returns {Array}
 */
export default function toArray(target) {
  return isNodeList(target) ? Array.prototype.slice.call(target) : Array.prototype.concat(target);
}
