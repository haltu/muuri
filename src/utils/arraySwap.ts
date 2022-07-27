/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { normalizeArrayIndex } from './normalizeArrayIndex';

/**
 * Swap array items.
 *
 * @param {Array} array
 * @param {number} index
 *   - Index (positive or negative) of the item that will be swapped.
 * @param {number} withIndex
 *   - Index (positive or negative) of the other item that will be swapped.
 */
export function arraySwap(array: any[], index: number, withIndex: number) {
  // Make sure the array has two or more items.
  if (array.length < 2) return;

  // Normalize the indices.
  const indexA = normalizeArrayIndex(array, index);
  const indexB = normalizeArrayIndex(array, withIndex);

  // Swap the items.
  if (indexA !== indexB) {
    const temp = array[indexA];
    array[indexA] = array[indexB];
    array[indexB] = temp;
  }
}
