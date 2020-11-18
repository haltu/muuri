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
 * @param {string} style
 * @returns {number}
 */
export default function getStyleAsFloat(el: HTMLElement, styleProp: string) {
  return parseFloat(getStyle(el, styleProp)) || 0;
}
