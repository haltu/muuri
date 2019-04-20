/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import normalizeArrayIndex from './normalizeArrayIndex';

/**
 * Move array item to another index.
 *
 * @param {Array} array
 * @param {Number} fromIndex
 *   - Index (positive or negative) of the item that will be moved.
 * @param {Number} toIndex
 *   - Index (positive or negative) where the item should be moved to.
 */
export default function arrayMove(array, fromIndex, toIndex) {
  // Make sure the array has two or more items.
  if (array.length < 2) return;

  // Normalize the indices.
  var from = normalizeArrayIndex(array, fromIndex);
  var to = normalizeArrayIndex(array, toIndex);

  // Add target item to the new position.
  if (from !== to) {
    array.splice(to, 0, array.splice(from, 1)[0]);
  }
}
