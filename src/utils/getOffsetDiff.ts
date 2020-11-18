/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getContainingBlock from './getContainingBlock';
import getStyleAsFloat from './getStyleAsFloat';

const offsetA = { left: 0, top: 0 };
const offsetB = { left: 0, top: 0 };
const offsetDiff = { left: 0, top: 0 };

/**
 * Returns the element's document offset, which in practice means the vertical
 * and horizontal distance between the element's northwest corner and the
 * document's northwest corner. Note that this function always returns the same
 * object so be sure to read the data from it instead using it as a reference.
 *
 * @param {(HTMLElement|Document|Window)} element
 * @param {Object} [offsetData]
 *   - Optional data object where the offset data will be inserted to. If not
 *     provided a new object will be created for the return data.
 * @returns {Object}
 */
function getOffset(
  element: HTMLElement | Document | Window,
  offset: { left: number; top: number } = { left: 0, top: 0 }
) {
  // Set up return data.
  offset.left = 0;
  offset.top = 0;

  // Document's offsets are always 0.
  if (element === document) return offset;

  // Add viewport scroll left/top to the respective offsets.
  offset.left = window.pageXOffset || 0;
  offset.top = window.pageYOffset || 0;

  // Window's offsets are the viewport scroll left/top values.
  if ('self' in element && element.self === window.self) return offset;

  // Add element's client rects to the offsets.
  const { left, top } = (element as HTMLElement).getBoundingClientRect();
  offset.left += left;
  offset.top += top;

  // Exclude element's borders from the offset.
  offset.left += getStyleAsFloat(element as HTMLElement, 'border-left-width');
  offset.top += getStyleAsFloat(element as HTMLElement, 'border-top-width');

  return offset;
}

/**
 * Calculate the offset difference two elements.
 * @param {(HTMLElement|Document)} elemA
 * @param {(HTMLElement|Document)} elemB
 * @param {boolean} [compareContainingBlocks=false]
 *   - When this is set to true the containing blocks of the provided elements
 *     will be used for calculating the difference. Otherwise the provided
 *     elements will be compared directly.
 * @returns {object}
 */
export default function getOffsetDiff(
  elemA: HTMLElement | Document,
  elemB: HTMLElement | Document,
  compareContainingBlocks = false
) {
  offsetDiff.left = 0;
  offsetDiff.top = 0;

  // If elements are same let's return early.
  if (elemA === elemB) return offsetDiff;

  // Compare containing blocks if necessary.
  if (compareContainingBlocks) {
    elemA = getContainingBlock(elemA);
    elemB = getContainingBlock(elemB);

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
