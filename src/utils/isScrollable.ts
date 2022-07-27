/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { getStyle } from './getStyle';

const scrollableOverflows: { [key: string]: boolean } = { auto: true, scroll: true, overlay: true };
const overflowProp = 'overflow';
const overflowXProp = 'overflow-x';
const overflowYProp = 'overflow-y';

/**
 * Check if an element is scrollable.
 *
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isScrollable(element: HTMLElement) {
  return !!(
    scrollableOverflows[getStyle(element, overflowProp)] ||
    scrollableOverflows[getStyle(element, overflowXProp)] ||
    scrollableOverflows[getStyle(element, overflowYProp)]
  );
}
