/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */
var stylesCache = typeof Map === 'function' ? new Map() : null;
var cacheCleanInterval = 3000;
var cacheCleanTimer;
var canCleanCache = true;
var cacheCleanCheck = function() {
  if (canCleanCache) {
    cacheCleanTimer = window.clearInterval(cacheCleanTimer);
    stylesCache.clear();
  } else {
    canCleanCache = true;
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
  var styles = stylesCache && stylesCache.get(element);

  if (!styles) {
    styles = window.getComputedStyle(element, null);
    if (stylesCache) stylesCache.set(element, styles);
  }

  if (stylesCache) {
    if (!cacheCleanTimer) {
      cacheCleanTimer = window.setInterval(cacheCleanCheck, cacheCleanInterval);
    } else {
      canCleanCache = false;
    }
  }

  return styles.getPropertyValue(style);
}
