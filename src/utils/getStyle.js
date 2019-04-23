/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { transformStyle } from './supportedTransform';

var stylesCache = typeof WeakMap === 'function' ? new WeakMap() : null;

/**
 * Returns the computed value of an element's style property as a string.
 *
 * @param {HTMLElement} element
 * @param {String} style
 * @returns {String}
 */
export default function getStyle(element, style) {
  var styles = stylesCache && stylesCache.get(element);
  if (!styles) {
    styles = window.getComputedStyle(element, null);
    if (stylesCache) stylesCache.set(element, styles);
  }
  return styles.getPropertyValue(style === 'transform' ? transformStyle : style);
}
