/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { transformProp } from './supportedTransform.js';

/**
 * Set inline styles to an element.
 *
 * @param {HTMLElement} element
 * @param {Object} styles
 */
export default function setStyles(element, styles) {
  for (var prop in styles) {
    element.style[prop === 'transform' ? transformProp : prop] = styles[prop];
  }
}
