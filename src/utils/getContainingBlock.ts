/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isContainingBlock from './isContainingBlock';

/**
 * Returns an absolute positioned element's containing block, which is
 * considered to be the closest ancestor element that the target element's
 * positioning is relative to. Disclaimer: this only works as intended for
 * absolute positioned elements.
 *
 * @param {HTMLElement} element
 * @returns {(Document|Element)}
 */
export default function getContainingBlock(element: HTMLElement | Document) {
  // As long as the containing block is an element, static and not
  // transformed, try to get the element's parent element and fallback to
  // document. https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L339
  let res: HTMLElement | Document = element || document;
  while (res && res !== document && !isContainingBlock(element as HTMLElement)) {
    res = res.parentElement || document;
  }
  return res;
}
