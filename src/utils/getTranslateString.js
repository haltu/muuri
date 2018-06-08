/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Transform translateX and translateY value into CSS transform style
 * property's value.
 *
 * @param {Number} x
 * @param {Number} y
 * @returns {String}
 */
export default function getTranslateString(x, y) {
  return 'translateX(' + x + 'px) translateY(' + y + 'px)';
}
