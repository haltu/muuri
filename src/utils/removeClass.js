/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import elementMatches from './elementMatches.js';

/**
 * Remove class from an element.
 *
 * @param {HTMLElement} element
 * @param {String} className
 */
function removeClassModern(element, className) {
  element.classList.remove(className);
}

/**
 * Remove class from an element (legacy version, for IE9 support).
 *
 * @param {HTMLElement} element
 * @param {String} className
 */
function removeClassLegacy(element, className) {
  if (elementMatches(element, '.' + className)) {
    element.className = (' ' + element.className + ' ').replace(' ' + className + ' ', ' ').trim();
  }
}

export default ('classList' in Element.prototype ? removeClassModern : removeClassLegacy);
