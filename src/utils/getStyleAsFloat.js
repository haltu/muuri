/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';

/**
 * Returns the computed value of an element's style property transformed into
 * a float value.
 *
 * @param {HTMLElement} el
 * @param {String} style
 * @returns {Number}
 */
export default function getStyleAsFloat(el, style) {
  return parseFloat(getStyle(el, style)) || 0;
}
