/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getContainingBlock from './getContainingBlock';
import getStyleAsFloat from './getStyleAsFloat';

var offsetA = {};
var offsetB = {};
var offsetDiff = {};

/**
 * Returns the element's document offset, which in practice means the vertical
 * and horizontal distance between the element's northwest corner and the
 * document's northwest corner. Note that this function always returns the same
 * object so be sure to read the data from it instead using it as a reference.
 *
 * @param {(Document|Element|Window)} element
 * @param {Object} [offsetData]
 *   - Optional data object where the offset data will be inserted to. If not
 *     provided a new object will be created for the return data.
 * @returns {Object}
 */
function getOffset(element, offsetData) {
  var ret = offsetData || {};
  var rect;

  // Set up return data.
  ret.left = 0;
  ret.top = 0;

  // Document's offsets are always 0.
  if (element === document) return ret;

  // Add viewport scroll left/top to the respective offsets.
  ret.left = window.pageXOffset || 0;
  ret.top = window.pageYOffset || 0;

  // Window's offsets are the viewport scroll left/top values.
  if (element.self === window.self) return ret;

  // Add element's client rects to the offsets.
  rect = element.getBoundingClientRect();
  ret.left += rect.left;
  ret.top += rect.top;

  // Exclude element's borders from the offset.
  ret.left += getStyleAsFloat(element, 'border-left-width');
  ret.top += getStyleAsFloat(element, 'border-top-width');

  return ret;
}

/**
 * Calculate the offset difference two elements.
 *
 * @param {HTMLElement} elemA
 * @param {HTMLElement} elemB
 * @param {Boolean} [compareContainingBlocks=false]
 *   - When this is set to true the containing blocks of the provided elements
 *     will be used for calculating the difference. Otherwise the provided
 *     elements will be compared directly.
 * @returns {Object}
 */
export default function getOffsetDiff(elemA, elemB, compareContainingBlocks) {
  offsetDiff.left = 0;
  offsetDiff.top = 0;

  // If elements are same let's return early.
  if (elemA === elemB) return offsetDiff;

  // Compare containing blocks if necessary.
  if (compareContainingBlocks) {
    elemA = getContainingBlock(elemA, true);
    elemB = getContainingBlock(elemB, true);

    // If containing blocks are identical, let's return early.
    if (elemA === elemB) return offsetDiff;
  }

  // Finally, let's calculate the offset diff.
  getOffset(elemA, offsetA);
  getOffset(elemB, offsetB);
  offsetDiff.left = offsetB.left - offsetA.left;
  offsetDiff.top = offsetB.top - offsetA.top;

  return offsetDiff;
}
