/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Check if element matches a CSS selector.
 *
 * @param {Element} el
 * @param {String} selector
 * @returns {Boolean}
 */
export default function elementMatches(el, selector) {
  var elementMatches =
    el.matches ||
    el.matchesSelector ||
    el.webkitMatchesSelector ||
    el.mozMatchesSelector ||
    el.msMatchesSelector ||
    el.oMatchesSelector ||
    null;

  if (!elementMatches) {
    return false;
  }

  return elementMatches.call(el, selector);
}
