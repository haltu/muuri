/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

var supportsPassive = false;
try {
  var passiveOpts = Object.defineProperty({}, 'passive', {
    get: function() {
      supportsPassive = true;
    }
  });
  window.addEventListener('testPassive', null, passiveOpts);
  window.removeEventListener('testPassive', null, passiveOpts);
} catch (e) {}

export default supportsPassive;
