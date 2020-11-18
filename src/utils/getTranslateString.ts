/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Transform translateX and translateY value into CSS transform style
 * property's value.
 *
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
export default function getTranslateString(x: number, y: number) {
  return 'translateX(' + x + 'px) translateY(' + y + 'px)';
}
