/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isOverlapping from './isOverlapping';

/**
 * Calculate intersection area between two rectangle.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {Number}
 */
export default function getIntersectionArea(a, b) {
  if (!isOverlapping(a, b)) return 0;
  var width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  var height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width * height;
}
