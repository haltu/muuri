/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */
var isWeakMapSupported = typeof WeakMap === 'function';
var cache = isWeakMapSupported ? new WeakMap() : null;
var cacheInterval = 3000;
var cacheTimer;
var canClearCache = true;
var clearCache = function () {
  if (canClearCache) {
    cacheTimer = window.clearInterval(cacheTimer);
    cache = isWeakMapSupported ? new WeakMap() : null;
  } else {
    canClearCache = true;
  }
};

/**
 * Returns the computed value of an element's style property as a string.
 *
 * @param {HTMLElement} element
 * @param {String} style
 * @returns {String}
 */
export default function getStyle(element, style) {
  var styles = cache && cache.get(element);

  if (!styles) {
    styles = window.getComputedStyle(element, null);
    if (cache) cache.set(element, styles);
  }

  if (cache) {
    if (!cacheTimer) {
      cacheTimer = window.setInterval(clearCache, cacheInterval);
    } else {
      canClearCache = false;
    }
  }

  return styles.getPropertyValue(style);
}
