/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

// Check if passive events are supported.
// https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection

let isPassiveEventsSupported = false;

try {
  const passiveOpts = Object.defineProperty({}, 'passive', {
    get: function () {
      isPassiveEventsSupported = true;
    },
  });
  // @ts-ignore
  window.addEventListener('testPassive', null, passiveOpts);
  // @ts-ignore
  window.removeEventListener('testPassive', null, passiveOpts);
} catch (e) {}

export default isPassiveEventsSupported;
