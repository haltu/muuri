/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

let cache: WeakMap<HTMLElement, CSSStyleDeclaration> = new WeakMap();
let cacheTimer: number | null = null;
let canClearCache = true;
const cacheTime = 1000;

const clearCache = function () {
  if (canClearCache) {
    canClearCache = true;
    return;
  }

  if (cacheTimer !== null) {
    window.clearInterval(cacheTimer);
    cacheTimer = null;
  }

  cache = new WeakMap();
};

/**
 * Returns the computed value of an element's style property as a string.
 *
 * @param {HTMLElement} element
 * @param {string} prop
 */
export function getStyle(element: HTMLElement, prop: string) {
  if (!prop) return '';

  let styles = cache.get(element);

  if (!styles) {
    styles = window.getComputedStyle(element, null);
    cache.set(element, styles);
  }

  if (!cacheTimer) {
    cacheTimer = window.setInterval(clearCache, cacheTime);
  } else {
    canClearCache = false;
  }

  return styles.getPropertyValue(prop);
}
