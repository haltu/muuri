/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

import getStyleAsFloat from '../utils/getStyleAsFloat';

var DOC_ELEM = document.documentElement;
var BODY = document.body;
var THRESHOLD_DATA = { value: 0, offset: 0 };

/**
 * @param {HTMLElement|Window} element
 * @returns {HTMLElement|Window}
 */
export function getScrollElement(element) {
  if (element === window || element === DOC_ELEM || element === BODY) {
    return window;
  } else {
    return element;
  }
}

/**
 * @param {HTMLElement|Window} element
 * @returns {Number}
 */
export function getScrollLeft(element) {
  return element === window ? element.pageXOffset : element.scrollLeft;
}

/**
 * @param {HTMLElement|Window} element
 * @returns {Number}
 */
export function getScrollTop(element) {
  return element === window ? element.pageYOffset : element.scrollTop;
}

/**
 * @param {HTMLElement|Window} element
 * @returns {Number}
 */
export function getScrollLeftMax(element) {
  if (element === window) {
    return DOC_ELEM.scrollWidth - DOC_ELEM.clientWidth;
  } else {
    return element.scrollWidth - element.clientWidth;
  }
}

/**
 * @param {HTMLElement|Window} element
 * @returns {Number}
 */
export function getScrollTopMax(element) {
  if (element === window) {
    return DOC_ELEM.scrollHeight - DOC_ELEM.clientHeight;
  } else {
    return element.scrollHeight - element.clientHeight;
  }
}

/**
 * Get window's or element's client rectangle data relative to the element's
 * content dimensions (includes inner size + padding, excludes scrollbars,
 * borders and margins).
 *
 * @param {HTMLElement|Window} element
 * @returns {Rectangle}
 */
export function getContentRect(element, result) {
  result = result || {};

  if (element === window) {
    result.width = DOC_ELEM.clientWidth;
    result.height = DOC_ELEM.clientHeight;
    result.left = 0;
    result.right = result.width;
    result.top = 0;
    result.bottom = result.height;
  } else {
    var bcr = element.getBoundingClientRect();
    var borderLeft = element.clientLeft || getStyleAsFloat(element, 'border-left-width');
    var borderTop = element.clientTop || getStyleAsFloat(element, 'border-top-width');
    result.width = element.clientWidth;
    result.height = element.clientHeight;
    result.left = bcr.left + borderLeft;
    result.right = result.left + result.width;
    result.top = bcr.top + borderTop;
    result.bottom = result.top + result.height;
  }

  return result;
}

/**
 * @param {Item} item
 * @returns {Object}
 */
export function getItemAutoScrollSettings(item) {
  return item._drag._getGrid()._settings.dragAutoScroll;
}

/**
 * @param {Item} item
 */
export function prepareItemScrollSync(item) {
  if (!item._drag) return;
  item._drag._prepareScroll();
}

/**
 * @param {Item} item
 */
export function applyItemScrollSync(item) {
  if (!item._drag || !item._isActive) return;
  var drag = item._drag;
  drag._scrollDiffX = drag._scrollDiffY = 0;
  item._setTranslate(drag._left, drag._top);
}

/**
 * Compute threshold value and edge offset.
 *
 * @param {Number} threshold
 * @param {Number} safeZone
 * @param {Number} itemSize
 * @param {Number} targetSize
 * @returns {Object}
 */
export function computeThreshold(threshold, safeZone, itemSize, targetSize) {
  THRESHOLD_DATA.value = Math.min(targetSize / 2, threshold);
  THRESHOLD_DATA.offset =
    Math.max(0, itemSize + THRESHOLD_DATA.value * 2 + targetSize * safeZone - targetSize) / 2;
  return THRESHOLD_DATA;
}
