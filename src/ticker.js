/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import Ticker from './Ticker/Ticker';

var LAYOUT_READ = 'layoutRead';
var LAYOUT_WRITE = 'layoutWrite';
var VISIBILITY_READ = 'visibilityRead';
var VISIBILITY_WRITE = 'visibilityWrite';
var DRAG_START_READ = 'dragStartRead';
var DRAG_START_WRITE = 'dragStartWrite';
var DRAG_MOVE_READ = 'dragMoveRead';
var DRAG_MOVE_WRITE = 'dragMoveWrite';
var DRAG_SCROLL_READ = 'dragScrollRead';
var DRAG_SCROLL_WRITE = 'dragScrollWrite';
var DRAG_SORT_READ = 'dragSortRead';
var PLACEHOLDER_LAYOUT_READ = 'placeholderLayoutRead';
var PLACEHOLDER_LAYOUT_WRITE = 'placeholderLayoutWrite';
var PLACEHOLDER_RESIZE_WRITE = 'placeholderResizeWrite';
var AUTO_SCROLL_READ = 'autoScrollRead';
var AUTO_SCROLL_WRITE = 'autoScrollWrite';
var DEBOUNCE_READ = 'debounceRead';

var LANE_READ = 0;
var LANE_READ_TAIL = 1;
var LANE_WRITE = 2;

var ticker = new Ticker(3);
export default ticker;

export function addLayoutTick(itemId, read, write) {
  ticker.add(LANE_READ, LAYOUT_READ + itemId, read);
  ticker.add(LANE_WRITE, LAYOUT_WRITE + itemId, write);
}

export function cancelLayoutTick(itemId) {
  ticker.remove(LANE_READ, LAYOUT_READ + itemId);
  ticker.remove(LANE_WRITE, LAYOUT_WRITE + itemId);
}

export function addVisibilityTick(itemId, read, write) {
  ticker.add(LANE_READ, VISIBILITY_READ + itemId, read);
  ticker.add(LANE_WRITE, VISIBILITY_WRITE + itemId, write);
}

export function cancelVisibilityTick(itemId) {
  ticker.remove(LANE_READ, VISIBILITY_READ + itemId);
  ticker.remove(LANE_WRITE, VISIBILITY_WRITE + itemId);
}

export function addDragStartTick(itemId, read, write) {
  ticker.add(LANE_READ, DRAG_START_READ + itemId, read);
  ticker.add(LANE_WRITE, DRAG_START_WRITE + itemId, write);
}

export function cancelDragStartTick(itemId) {
  ticker.remove(LANE_READ, DRAG_START_READ + itemId);
  ticker.remove(LANE_WRITE, DRAG_START_WRITE + itemId);
}

export function addDragMoveTick(itemId, read, write) {
  ticker.add(LANE_READ, DRAG_MOVE_READ + itemId, read);
  ticker.add(LANE_WRITE, DRAG_MOVE_WRITE + itemId, write);
}

export function cancelDragMoveTick(itemId) {
  ticker.remove(LANE_READ, DRAG_MOVE_READ + itemId);
  ticker.remove(LANE_WRITE, DRAG_MOVE_WRITE + itemId);
}

export function addDragScrollTick(itemId, read, write) {
  ticker.add(LANE_READ, DRAG_SCROLL_READ + itemId, read);
  ticker.add(LANE_WRITE, DRAG_SCROLL_WRITE + itemId, write);
}

export function cancelDragScrollTick(itemId) {
  ticker.remove(LANE_READ, DRAG_SCROLL_READ + itemId);
  ticker.remove(LANE_WRITE, DRAG_SCROLL_WRITE + itemId);
}

export function addDragSortTick(itemId, read) {
  ticker.add(LANE_READ_TAIL, DRAG_SORT_READ + itemId, read);
}

export function cancelDragSortTick(itemId) {
  ticker.remove(LANE_READ_TAIL, DRAG_SORT_READ + itemId);
}

export function addPlaceholderLayoutTick(itemId, read, write) {
  ticker.add(LANE_READ, PLACEHOLDER_LAYOUT_READ + itemId, read);
  ticker.add(LANE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId, write);
}

export function cancelPlaceholderLayoutTick(itemId) {
  ticker.remove(LANE_READ, PLACEHOLDER_LAYOUT_READ + itemId);
  ticker.remove(LANE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId);
}

export function addPlaceholderResizeTick(itemId, write) {
  ticker.add(LANE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId, write);
}

export function cancelPlaceholderResizeTick(itemId) {
  ticker.remove(LANE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId);
}

export function addAutoScrollTick(read, write) {
  ticker.add(LANE_READ, AUTO_SCROLL_READ, read);
  ticker.add(LANE_WRITE, AUTO_SCROLL_WRITE, write);
}

export function cancelAutoScrollTick() {
  ticker.remove(LANE_READ, AUTO_SCROLL_READ);
  ticker.remove(LANE_WRITE, AUTO_SCROLL_WRITE);
}

export function addDebounceTick(debounceId, read) {
  ticker.add(LANE_READ, DEBOUNCE_READ + debounceId, read);
}

export function cancelDebounceTick(debounceId) {
  ticker.remove(LANE_READ, DEBOUNCE_READ + debounceId);
}
