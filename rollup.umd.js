module.exports = `(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    var Hammer;
    try { Hammer = require('hammerjs') } catch (e) {}
    module.exports = factory(Hammer);
  } else {
    global.Muuri = factory(global.Hammer);
  }
}(this, function (Hammer) {
  'use strict';`;
