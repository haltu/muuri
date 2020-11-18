/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { Rect } from '../types';

/**
 * Check if two rectangles are overlapping.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
export default function isOverlapping(a: Rect, b: Rect) {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}
