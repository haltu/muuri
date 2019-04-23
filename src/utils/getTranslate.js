/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';

var translateValue = {};
var transformStyle = 'transform';
var transformNone = 'none';
var rxMat3d = /^matrix3d/;
var rxMatTx = /([^,]*,){4}/;
var rxMat3dTx = /([^,]*,){12}/;
var rxNextItem = /[^,]*,/;

/**
 * Returns the element's computed translateX and translateY values as a floats.
 * The returned object is always the same object and updated every time this
 * function is called.
 *
 * @param {HTMLElement} element
 * @returns {Object}
 */
export default function getTranslate(element) {
  translateValue.x = 0;
  translateValue.y = 0;

  var transform = getStyle(element, transformStyle);
  if (!transform || transform === transformNone) {
    return translateValue;
  }

  // Transform style can be in either matrix3d(...) or matrix(...).
  var isMat3d = rxMat3d.test(transform);
  var tX = transform.replace(isMat3d ? rxMat3dTx : rxMatTx, '');
  var tY = tX.replace(rxNextItem, '');

  translateValue.x = parseFloat(tX) || 0;
  translateValue.y = parseFloat(tY) || 0;

  return translateValue;
}
