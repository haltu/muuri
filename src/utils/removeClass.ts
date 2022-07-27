/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Remove class from an element.
 *
 * @param {HTMLElement} element
 * @param {string} className
 */
export function removeClass(element: HTMLElement, className: string) {
  className && element.classList.remove(className);
}
