/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isScrollable from './isScrollable';

/**
 * Collect element's ancestors that are potentially scrollable elements. The
 * provided element is also also included in the check, meaning that if it is
 * scrollable it is added to the result array.
 *
 * @param {HTMLElement} element
 * @param {Array} [result]
 * @returns {Array}
 */
export default function getScrollableAncestors(element, result) {
  result = result || [];

  // Find scroll parents.
  while (element && element !== document) {
    // If element is inside ShadowDOM let's get it's host node from the real
    // DOM and continue looping.
    if (element.getRootNode && element instanceof DocumentFragment) {
      element = element.getRootNode().host;
      continue;
    }

    // If element is scrollable let's add it to the scrollable list.
    if (isScrollable(element)) {
      result.push(element);
    }

    element = element.parentNode;
  }

  // Always add window to the results.
  result.push(window);

  return result;
}
