/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Calculate intersection area between two rectangle.
 *
 * @param {Rectangle} a
 * @param {Rectangle} b
 * @returns {Number}
 */
export default function getIntersectionArea(a, b) {
  if (
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  ) {
    return 0;
  }

  var width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  var height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width * height;
}
