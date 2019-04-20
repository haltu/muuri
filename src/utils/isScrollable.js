/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';

/**
 * Check if an element is scrollable.
 *
 * @param {HTMLElement} element
 * @returns {Boolean}
 */
export default function isScrollable(element) {
  var overflow = getStyle(element, 'overflow');
  if (overflow === 'auto' || overflow === 'scroll') return true;

  overflow = getStyle(element, 'overflow-x');
  if (overflow === 'auto' || overflow === 'scroll') return true;

  overflow = getStyle(element, 'overflow-y');
  if (overflow === 'auto' || overflow === 'scroll') return true;

  return false;
}
