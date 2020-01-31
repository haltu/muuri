/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

import getStyle from '../utils/getStyle';
import getStyleAsFloat from '../utils/getStyleAsFloat';
import isTransformed from '../utils/isTransformed';

var DOC_ELEM = document.documentElement;
var BODY = document.body;

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
export function prepareItemDragScroll(item) {
  if (item._drag) item._drag._prepareScroll();
}

/**
 * @param {Item} item
 */
export function applyItemDragScroll(item) {
  if (item._drag) item._drag._applyScroll();
}

/**
 * Check if the target element's position is affected by the scrolling of the
 * scroll element.
 *
 * @param {HTMLElement} targetElement
 * @param {HTMLElement|Window} scrollElement
 * @returns {Boolean}
 */
export function isAffectedByScroll(targetElement, scrollElement) {
  if (
    // If scroll element is target element -> not affected.
    targetElement === scrollElement ||
    // If scroll element does not contain the item element -> not affected.
    (scrollElement !== window && !scrollElement.contains(targetElement))
  ) {
    return false;
  }

  var el = targetElement;
  var isAffected = true;

  // There are many cases where the target element might not be affected by the
  // scroll, but here we just check the most common one -> if there is a fixed
  // element between the target element and scroll element and there are no
  // transformed elements between the fixed element and scroll element.
  while (el !== scrollElement) {
    el = el.parentElement || scrollElement;
    if (el === window) break;

    if (!isAffected && isTransformed(el)) {
      isAffected = true;
    }

    if (isAffected && el !== scrollElement && getStyle(el, 'position') === 'fixed') {
      isAffected = false;
    }
  }

  return isAffected;
}
