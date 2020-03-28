/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { addDebounceTick, cancelDebounceTick } from '../ticker';

var debounceId = 0;

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. The returned function accepts one argument which, when
 * being `true`, cancels the debounce function immediately. When the debounce
 * function is canceled it cannot be invoked again.
 *
 * @param {Function} fn
 * @param {Number} durationMs
 * @returns {Function}
 */
export default function debounce(fn, durationMs) {
  var id = ++debounceId;
  var timer = 0;
  var lastTime = 0;
  var isCanceled = false;
  var tick = function (time) {
    if (isCanceled) return;

    if (lastTime) timer -= time - lastTime;
    lastTime = time;

    if (timer > 0) {
      addDebounceTick(id, tick);
    } else {
      timer = lastTime = 0;
      fn();
    }
  };

  return function (cancel) {
    if (isCanceled) return;

    if (durationMs <= 0) {
      if (cancel !== true) fn();
      return;
    }

    if (cancel === true) {
      isCanceled = true;
      timer = lastTime = 0;
      tick = undefined;
      cancelDebounceTick(id);
      return;
    }

    if (timer <= 0) {
      timer = durationMs;
      tick(0);
    } else {
      timer = durationMs;
    }
  };
}
