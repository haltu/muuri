/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Normalize array index. Basically this function makes sure that the provided
 * array index is within the bounds of the provided array and also transforms
 * negative index to the matching positive index. The third (optional) argument
 * allows you to define offset for array's length in case you are adding items
 * to the array or removing items from the array.
 *
 * @param {Array} array
 * @param {number} index
 * @param {number} [sizeOffset=0]
 * @returns {number}
 */
export default function normalizeArrayIndex(array: any[], index: number, sizeOffset = 0) {
  const maxIndex = Math.max(0, array.length - 1 + sizeOffset);
  return index > maxIndex ? maxIndex : index < 0 ? Math.max(maxIndex + index + 1, 0) : index;
}
