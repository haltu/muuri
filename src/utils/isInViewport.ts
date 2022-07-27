/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { isOverlapping } from './isOverlapping';
import { windowSize } from './windowSize';

const targetRect = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

const viewportRect = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

/**
 * Check if the provided rectangle is in viewport.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} left
 * @param {number} top
 * @param {number} padding
 * @returns {boolean}
 */
export function isInViewport(
  width: number,
  height: number,
  left: number,
  top: number,
  padding: number
) {
  padding = padding || 0;

  targetRect.left = left;
  targetRect.top = top;
  targetRect.width = width;
  targetRect.height = height;

  viewportRect.left = 0 - padding;
  viewportRect.top = 0 - padding;
  viewportRect.width = windowSize.width + padding + padding;
  viewportRect.height = windowSize.height + padding + padding;

  return isOverlapping(targetRect, viewportRect);
}
