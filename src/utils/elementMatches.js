/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var proto = Element.prototype;
var matches =
  proto.matches ||
  proto.matchesSelector ||
  proto.webkitMatchesSelector ||
  proto.mozMatchesSelector ||
  proto.msMatchesSelector ||
  proto.oMatchesSelector;

/**
 * Check if element matches a CSS selector.
 *
 * @param {*} val
 * @returns {Boolean}
 */
export default function elementMatches(el, selector) {
  return matches.call(el, selector);
}
