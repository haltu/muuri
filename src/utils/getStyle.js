/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var cache = typeof WeakMap === 'function' ? new WeakMap() : null;

/**
 * Returns the computed value of an element's style property as a string.
 *
 * @param {HTMLElement} element
 * @param {String} style
 * @returns {String}
 */
export default function getStyle(element, style) {
  var styles = cache && cache.get(element);

  if (!styles) {
    styles = window.getComputedStyle(element, null);
    if (cache) cache.set(element, styles);
  }

  return styles.getPropertyValue(style);
}
