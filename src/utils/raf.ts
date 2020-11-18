/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * @param {Function} callback
 * @returns {number}
 */
const raf = (
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  // @ts-ignore
  window.mozRequestAnimationFrame ||
  // @ts-ignore
  window.msRequestAnimationFrame
).bind(window);

export default raf;
