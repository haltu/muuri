/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import elementMatches from './elementMatches';

/**
 * Remove class from an element.
 *
 * @param {HTMLElement} element
 * @param {String} className
 */
export default function removeClass(element, className) {
  if (element.classList) {
    element.classList.remove(className);
  } else {
    if (elementMatches(element, '.' + className)) {
      element.className = (' ' + element.className + ' ')
        .replace(' ' + className + ' ', ' ')
        .trim();
    }
  }
}
