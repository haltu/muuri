/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Set inline styles to an element.
 *
 * @param {HTMLElement} element
 * @param {Object} styles
 */
export function setStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  let prop: string;
  for (prop in styles) {
    element.style[prop] = styles[prop] || '';
  }
}
