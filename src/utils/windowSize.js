/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var windowSize = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener('resize', function () {
  windowSize.width = window.innerWidth;
  windowSize.height = window.innerHeight;
});

export default windowSize;
