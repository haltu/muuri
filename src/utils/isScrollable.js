/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';

/**
 * Check if overflow style value is scrollable.
 *
 * @param {String} value
 * @returns {Boolean}
 */
function isScrollableOverflow(value) {
  return value === 'auto' || value === 'scroll' || value === 'overlay';
}

/**
 * Check if an element is scrollable.
 *
 * @param {HTMLElement} element
 * @returns {Boolean}
 */
export default function isScrollable(element) {
  return (
    isScrollableOverflow(getStyle(element, 'overflow')) ||
    isScrollableOverflow(getStyle(element, 'overflow-x')) ||
    isScrollableOverflow(getStyle(element, 'overflow-y'))
  );
}
