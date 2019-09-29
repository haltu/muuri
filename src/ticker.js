/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import Ticker from './Ticker/Ticker';

var ticker = new Ticker();

var layoutTick = 'layout';
var visibilityTick = 'visibility';
var dragStartTick = 'dragStart';
var dragMoveTick = 'dragMove';
var dragScrollTick = 'dragScroll';
var phLayoutTick = 'phLayout';
var phResizeTick = 'phResize';
var debounceTick = 'debounce';

export default ticker;

export function addLayoutTick(itemId, read, write) {
  var id = layoutTick + itemId;
  ticker.read(id, read);
  ticker.write(id, write);
}

export function cancelLayoutTick(itemId) {
  var id = layoutTick + itemId;
  ticker.cancelRead(id);
  ticker.cancelWrite(id);
}

export function addVisibilityTick(itemId, read, write) {
  var id = visibilityTick + itemId;
  ticker.read(id, read);
  ticker.write(id, write);
}

export function cancelVisibilityTick(itemId) {
  var id = visibilityTick + itemId;
  ticker.cancelRead(id);
  ticker.cancelWrite(id);
}

export function addDragStartTick(itemId, read, write) {
  var id = dragStartTick + itemId;
  ticker.read(id, read);
  ticker.write(id, write);
}

export function cancelDragStartTick(itemId) {
  var id = dragStartTick + itemId;
  ticker.cancelRead(id);
  ticker.cancelWrite(id);
}

export function addDragMoveTick(itemId, read, write) {
  var id = dragMoveTick + itemId;
  ticker.read(id, read);
  ticker.write(id, write);
}

export function cancelDragMoveTick(itemId) {
  var id = dragMoveTick + itemId;
  ticker.cancelRead(id);
  ticker.cancelWrite(id);
}

export function addDragScrollTick(itemId, read, write) {
  var id = dragScrollTick + itemId;
  ticker.read(id, read);
  ticker.write(id, write);
}

export function cancelDragScrollTick(itemId) {
  var id = dragScrollTick + itemId;
  ticker.cancelRead(id);
  ticker.cancelWrite(id);
}

export function addPlaceholderLayoutTick(itemId, read, write) {
  var id = phLayoutTick + itemId;
  ticker.read(id, read);
  ticker.write(id, write);
}

export function cancelPlaceholderLayoutTick(itemId) {
  var id = phLayoutTick + itemId;
  ticker.cancelRead(id);
  ticker.cancelWrite(id);
}

export function addPlaceholderResizeTick(itemId, write) {
  var id = phResizeTick + itemId;
  ticker.write(id, write);
}

export function cancelPlaceholderResizeTick(itemId) {
  var id = phResizeTick + itemId;
  ticker.cancelWrite(id);
}

export function addDebounceTick(debounceId, read) {
  var id = debounceTick + debounceId;
  ticker.read(id, read);
}

export function cancelDebounceTick(debounceId) {
  var id = debounceTick + debounceId;
  ticker.cancelRead(id);
}
