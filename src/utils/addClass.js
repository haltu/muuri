/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import elementMatches from './elementMatches';

/**
 * Add class to an element.
 *
 * @param {HTMLElement} element
 * @param {String} className
 */
export default function addClass(element, className) {
  if (!className) return;

  if (element.classList) {
    element.classList.add(className);
  } else {
    if (!elementMatches(element, '.' + className)) {
      element.className += ' ' + className;
    }
  }
}
