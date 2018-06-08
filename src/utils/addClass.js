/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import elementMatches from './elementMatches.js';

/**
 * Add class to an element.
 *
 * @param {HTMLElement} element
 * @param {String} className
 */
function addClassModern(element, className) {
  element.classList.add(className);
}

/**
 * Add class to an element (legacy version, for IE9 support).
 *
 * @param {HTMLElement} element
 * @param {String} className
 */
function addClassLegacy(element, className) {
  if (!elementMatches(element, '.' + className)) {
    element.className += ' ' + className;
  }
}

export default ('classList' in Element.prototype ? addClassModern : addClassLegacy);
