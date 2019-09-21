/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import Ticker from './Ticker/Ticker';

var ticker = new Ticker();

var layoutTick = 'layout';
var visibilityTick = 'visibility';
var dragStartTick = 'drag-start';
var dragMoveTick = 'drag-move';
var dragScrollTick = 'drag-scroll';
var placeholderLayoutTick = 'ph-layout';
var placeholderResizeTick = 'ph-resize';

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

export function addDragStartTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + dragStartTick, readCallback, writeCallback, true);
}

export function cancelDragStartTick(itemId) {
  return ticker.cancel(itemId + dragStartTick);
}

export function addDragMoveTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + dragMoveTick, readCallback, writeCallback, true);
}

export function cancelDragMoveTick(itemId) {
  return ticker.cancel(itemId + dragMoveTick);
}

export function addDragScrollTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + dragScrollTick, readCallback, writeCallback, true);
}

export function cancelDragScrollTick(itemId) {
  return ticker.cancel(itemId + dragScrollTick);
}

export function addPlaceholderLayoutTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + placeholderLayoutTick, readCallback, writeCallback);
}

export function cancelPlaceholderLayoutTick(itemId) {
  return ticker.cancel(itemId + placeholderLayoutTick);
}

export function addPlaceholderResizeTick(itemId, readCallback, writeCallback) {
  return ticker.add(itemId + placeholderResizeTick, readCallback, writeCallback);
}

export function cancelPlaceholderResizeTick(itemId) {
  return ticker.cancel(itemId + placeholderResizeTick);
}
