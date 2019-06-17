/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var dt = 1000 / 60;

var raf = (
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function(callback) {
    return this.setTimeout(function() {
      callback(dt);
    }, dt);
  }
).bind(window);

/**
 * @param {Function} callback
 * @returns {Number}
 */
export default raf;
