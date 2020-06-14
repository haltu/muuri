/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Check if passive events are supported.
 * https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection
 *
 * @returns {Boolean}
 */
export default function hasPassiveEvents() {
  var isPassiveEventsSupported = false;

  try {
    var passiveOpts = Object.defineProperty({}, 'passive', {
      get: function () {
        isPassiveEventsSupported = true;
      },
    });
    window.addEventListener('testPassive', null, passiveOpts);
    window.removeEventListener('testPassive', null, passiveOpts);
  } catch (e) {}

  return isPassiveEventsSupported;
}
