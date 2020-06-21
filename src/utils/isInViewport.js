/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isOverlapping from './isOverlapping';
import windowSize from './windowSize';

var targetRect = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

var viewportRect = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

/**
 * Check if the provided rectangle is in viewport.
 *
 * @private
 * @param {Number} left
 * @param {Number} top
 * @param {Number} width
 * @param {Number} height
 * @param {Number} padding
 */
export default function isInViewport(width, height, left, top, padding) {
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
