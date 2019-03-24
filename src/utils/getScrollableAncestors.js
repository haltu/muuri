/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import isScrollable from './isScrollable';

/**
 * Collect element's ancestors that are potentially scrollable elements.
 *
 * @param {HTMLElement} element
 * @param {Boolean} [includeSelf=false]
 * @param {Array} [data]
 * @returns {Array}
 */
export default function getScrollableAncestors(element, includeSelf, data) {
  var ret = data || [];
  var parent = includeSelf ? element : element.parentNode;

  // Find scroll parents.
  while (parent && parent !== document) {
    // If element is inside ShadowDOM let's get it's host node from the real
    // DOM and continue looping.
    if (parent.getRootNode && parent instanceof DocumentFragment) {
      parent = parent.getRootNode().host;
      continue;
    }

    // If element is scrollable let's add it to the scrollable list.
    if (isScrollable(parent)) {
      ret.push(parent);
    }

    parent = parent.parentNode;
  }

  // Always add window to the results.
  ret.push(window);

  return ret;
}
