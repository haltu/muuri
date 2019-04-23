/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';

var styleOverflow = 'overflow';
var styleOverflowX = 'overflow-x';
var styleOverflowY = 'overflow-y';
var overflowAuto = 'auto';
var overflowScroll = 'scroll';

/**
 * Check if an element is scrollable.
 *
 * @param {HTMLElement} element
 * @returns {Boolean}
 */
export default function isScrollable(element) {
  var overflow = getStyle(element, styleOverflow);
  if (overflow === overflowAuto || overflow === overflowScroll) return true;

  overflow = getStyle(element, styleOverflowX);
  if (overflow === overflowAuto || overflow === overflowScroll) return true;

  overflow = getStyle(element, styleOverflowY);
  if (overflow === overflowAuto || overflow === overflowScroll) return true;

  return false;
}
