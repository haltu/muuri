/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from './getStyle';
import isTransformed from './isTransformed';

/**
 * Returns an absolute positioned element's containing block, which is
 * considered to be the closest ancestor element that the target element's
 * positioning is relative to. Disclaimer: this only works as intended for
 * absolute positioned elements.
 *
 * @param {HTMLElement} element
 * @returns {(Document|Element)}
 */
export default function getContainingBlock(element) {
  // As long as the containing block is an element, static and not
  // transformed, try to get the element's parent element and fallback to
  // document. https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L339
  var doc = document;
  var res = element || doc;
  while (res && res !== doc && getStyle(res, 'position') === 'static' && !isTransformed(res)) {
    res = res.parentElement || doc;
  }
  return res;
}
