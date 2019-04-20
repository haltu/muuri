/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import Ticker from './Ticker/Ticker';

var ticker = new Ticker();

var layoutTick = 'layout';
var visibilityTick = 'visibility';
var moveTick = 'move';
var scrollTick = 'scroll';
var placeholderTick = 'placeholder';

export default ticker;

export function addLayoutTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + layoutTick, readCallback, writeCallback);
}

export function cancelLayoutTick(itemId) {
  return ticker.cancel(itemId + layoutTick);
}

export function addVisibilityTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + visibilityTick, readCallback, writeCallback);
}

export function cancelVisibilityTick(itemId) {
  return ticker.cancel(itemId + visibilityTick);
}

export function addMoveTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + moveTick, readCallback, writeCallback, true);
}

export function cancelMoveTick(itemId) {
  return ticker.cancel(itemId + moveTick);
}

export function addScrollTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + scrollTick, readCallback, writeCallback, true);
}

export function cancelScrollTick(itemId) {
  return ticker.cancel(itemId + scrollTick);
}

export function addPlaceholderTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + placeholderTick, readCallback, writeCallback);
}

export function cancelPlaceholderTick(itemId) {
  return ticker.cancel(itemId + placeholderTick);
}
