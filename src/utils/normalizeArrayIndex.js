/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Normalize array index. Basically this function makes sure that the provided
 * array index is within the bounds of the provided array and also transforms
 * negative index to the matching positive index.
 *
 * @param {Array} array
 * @param {Number} index
 * @param {Boolean} isMigration
 */
export default function normalizeArrayIndex(array, index, isMigration) {
  var length = array.length;
  var maxIndex = Math.max(0, isMigration ? length : length - 1);
  return index > maxIndex ? maxIndex : index < 0 ? Math.max(maxIndex + index + 1, 0) : index;
}
