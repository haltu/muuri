/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Insert an item or an array of items to array to a specified index. Mutates
 * the array. The index can be negative in which case the items will be added
 * to the end of the array.
 *
 * @param {Array} array
 * @param {*} items
 * @param {number} [index=-1]
 */
export default function arrayInsert(array: any[], items: any, index = -1) {
  if (index < 0) index = array.length - index + 1;
  Array.isArray(items) ? array.splice(index, 0, ...items) : array.splice(index, 0, items);
}
