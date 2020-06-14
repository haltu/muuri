/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var ElProto = window.Element.prototype;
var matchesFn =
  ElProto.matches ||
  ElProto.matchesSelector ||
  ElProto.webkitMatchesSelector ||
  ElProto.mozMatchesSelector ||
  ElProto.msMatchesSelector ||
  ElProto.oMatchesSelector ||
  function () {
    return false;
  };

/**
 * Check if element matches a CSS selector.
 *
 * @param {Element} el
 * @param {String} selector
 * @returns {Boolean}
 */
export default function elementMatches(el, selector) {
  return matchesFn.call(el, selector);
}
