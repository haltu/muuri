/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';
import getStyleName from './getStyleName';

/**
 * Get current values of the provided styles definition object.
 *
 * @param {HTMLElement} element
 * @param {Object} styles
 * @return {Object}
 */
export default function getCurrentStyles(element, styles) {
  var current = {};
  for (var prop in styles) {
    current[prop] = getStyle(element, getStyleName(prop));
  }
  return current;
}
