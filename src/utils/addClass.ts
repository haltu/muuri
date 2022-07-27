/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Add class to an element.
 *
 * @param {HTMLElement} element
 * @param {string} className
 */
export function addClass(element: HTMLElement, className: string) {
  className && element.classList.add(className);
}
