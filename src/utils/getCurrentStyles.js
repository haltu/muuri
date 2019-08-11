/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';
import getStyleName from './getStyleName';

/**
 * Get current values of the provided styles definition object or array.
 *
 * @param {HTMLElement} element
 * @param {(Object|Array} styles
 * @return {Object}
 */
export default function getCurrentStyles(element, styles) {
  var result = {};
  var prop, i;

  if (Array.isArray(styles)) {
    for (i = 0; i < styles.length; i++) {
      prop = styles[i];
      result[prop] = getStyle(element, getStyleName(prop));
    }
  } else {
    for (prop in styles) {
      result[prop] = getStyle(element, getStyleName(prop));
    }
  }

  return result;
}
