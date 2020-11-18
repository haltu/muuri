/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

const matches =
  Element.prototype.matches ||
  Element.prototype.webkitMatchesSelector ||
  // @ts-ignore
  Element.prototype.msMatchesSelector ||
  function () {
    return false;
  };

/**
 * Check if element matches a CSS selector.
 *
 * @param {HTMLElement} el
 * @param {string} selector
 * @returns {boolean}
 */
export default function elementMatches(el: HTMLElement, selector: string) {
  return matches.call(el, selector);
}
