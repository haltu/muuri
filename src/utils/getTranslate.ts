/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';
import transformStyle from './transformStyle';

const translateValue = { x: 0, y: 0 };
const transformNone = 'none';
const rxMat3d = /^matrix3d/;
const rxMatTx = /([^,]*,){4}/;
const rxMat3dTx = /([^,]*,){12}/;
const rxNextItem = /[^,]*,/;

/**
 * Returns the element's computed translateX and translateY values as a floats.
 * The returned object is always the same object and updated every time this
 * function is called.
 *
 * @param {HTMLElement} element
 * @returns {Object}
 */
export default function getTranslate(element: HTMLElement) {
  translateValue.x = 0;
  translateValue.y = 0;

  const transform = getStyle(element, transformStyle);
  if (!transform || transform === transformNone) {
    return translateValue;
  }

  // Transform style can be in either matrix3d(...) or matrix(...).
  const isMat3d = rxMat3d.test(transform);
  const tX = transform.replace(isMat3d ? rxMat3dTx : rxMatTx, '');
  const tY = tX.replace(rxNextItem, '');

  translateValue.x = parseFloat(tX) || 0;
  translateValue.y = parseFloat(tY) || 0;

  return translateValue;
}
