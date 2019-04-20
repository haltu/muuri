/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import normalizeArrayIndex from './normalizeArrayIndex';

/**
 * Swap array items.
 *
 * @param {Array} array
 * @param {Number} index
 *   - Index (positive or negative) of the item that will be swapped.
 * @param {Number} withIndex
 *   - Index (positive or negative) of the other item that will be swapped.
 */
export default function arraySwap(array, index, withIndex) {
  // Make sure the array has two or more items.
  if (array.length < 2) return;

  // Normalize the indices.
  var indexA = normalizeArrayIndex(array, index);
  var indexB = normalizeArrayIndex(array, withIndex);
  var temp;

  // Swap the items.
  if (indexA !== indexB) {
    temp = array[indexA];
    array[indexA] = array[indexB];
    array[indexB] = temp;
  }
}
