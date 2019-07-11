/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import ticker from '../ticker';

var actionCancel = 'cancel';
var actionFinish = 'finish';
var debounceTick = 'debounce';
var debounceId = 0;

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. The returned function accepts one argument which, when
 * being "finish", calls the debounce function immediately if it is currently
 * waiting to be called, and when being "cancel" cancels the currently queued
 * function call.
 *
 * @param {Function} fn
 * @param {Number} wait
 * @returns {Function}
 */
export default function debounce(fn, wait) {
  var timeout;
  var tickerId = ++debounceId + debounceTick;

  if (wait > 0) {
    return function(action) {
      if (timeout !== undefined) {
        timeout = window.clearTimeout(timeout);
        ticker.cancel(tickerId);
        if (action === actionFinish) fn();
      }

      if (action !== actionCancel && action !== actionFinish) {
        timeout = window.setTimeout(function() {
          timeout = undefined;
          ticker.add(tickerId, fn, null, true);
        }, wait);
      }
    };
  }

  return function(action) {
    if (action !== actionCancel) fn();
  };
}
