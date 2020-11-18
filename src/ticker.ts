/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import Ticker, { TickCallback } from './Ticker/Ticker';

const LAYOUT_READ = 'layoutRead';
const LAYOUT_WRITE = 'layoutWrite';
const VISIBILITY_READ = 'visibilityRead';
const VISIBILITY_WRITE = 'visibilityWrite';
const DRAG_START_READ = 'dragStartRead';
const DRAG_START_WRITE = 'dragStartWrite';
const DRAG_MOVE_READ = 'dragMoveRead';
const DRAG_MOVE_WRITE = 'dragMoveWrite';
const DRAG_SCROLL_READ = 'dragScrollRead';
const DRAG_SCROLL_WRITE = 'dragScrollWrite';
const DRAG_SORT_READ = 'dragSortRead';
const RELEASE_SCROLL_READ = 'releaseScrollRead';
const RELEASE_SCROLL_WRITE = 'releaseScrollWrite';
const PLACEHOLDER_LAYOUT_READ = 'placeholderLayoutRead';
const PLACEHOLDER_LAYOUT_WRITE = 'placeholderLayoutWrite';
const PLACEHOLDER_RESIZE_WRITE = 'placeholderResizeWrite';
const AUTO_SCROLL_READ = 'autoScrollRead';
const AUTO_SCROLL_WRITE = 'autoScrollWrite';
const DEBOUNCE_READ = 'debounceRead';

const LANE_READ = 0;
const LANE_READ_TAIL = 1;
const LANE_WRITE = 2;

const ticker = new Ticker(3);

export default ticker;

export function addLayoutTick(itemId: string | number, read: TickCallback, write: TickCallback) {
  ticker.add(LANE_READ, LAYOUT_READ + itemId, read);
  ticker.add(LANE_WRITE, LAYOUT_WRITE + itemId, write);
}

export function cancelLayoutTick(itemId: string | number) {
  ticker.remove(LANE_READ, LAYOUT_READ + itemId);
  ticker.remove(LANE_WRITE, LAYOUT_WRITE + itemId);
}

export function addVisibilityTick(
  itemId: string | number,
  read: TickCallback,
  write: TickCallback
) {
  ticker.add(LANE_READ, VISIBILITY_READ + itemId, read);
  ticker.add(LANE_WRITE, VISIBILITY_WRITE + itemId, write);
}

export function cancelVisibilityTick(itemId: string | number) {
  ticker.remove(LANE_READ, VISIBILITY_READ + itemId);
  ticker.remove(LANE_WRITE, VISIBILITY_WRITE + itemId);
}

export function addDragStartTick(itemId: string | number, read: TickCallback, write: TickCallback) {
  ticker.add(LANE_READ, DRAG_START_READ + itemId, read);
  ticker.add(LANE_WRITE, DRAG_START_WRITE + itemId, write);
}

export function cancelDragStartTick(itemId: string | number) {
  ticker.remove(LANE_READ, DRAG_START_READ + itemId);
  ticker.remove(LANE_WRITE, DRAG_START_WRITE + itemId);
}

export function addDragMoveTick(itemId: string | number, read: TickCallback, write: TickCallback) {
  ticker.add(LANE_READ, DRAG_MOVE_READ + itemId, read);
  ticker.add(LANE_WRITE, DRAG_MOVE_WRITE + itemId, write);
}

export function cancelDragMoveTick(itemId: string | number) {
  ticker.remove(LANE_READ, DRAG_MOVE_READ + itemId);
  ticker.remove(LANE_WRITE, DRAG_MOVE_WRITE + itemId);
}

export function addDragScrollTick(
  itemId: string | number,
  read: TickCallback,
  write: TickCallback
) {
  ticker.add(LANE_READ, DRAG_SCROLL_READ + itemId, read);
  ticker.add(LANE_WRITE, DRAG_SCROLL_WRITE + itemId, write);
}

export function cancelDragScrollTick(itemId: string | number) {
  ticker.remove(LANE_READ, DRAG_SCROLL_READ + itemId);
  ticker.remove(LANE_WRITE, DRAG_SCROLL_WRITE + itemId);
}

export function addDragSortTick(itemId: string | number, read: TickCallback) {
  ticker.add(LANE_READ_TAIL, DRAG_SORT_READ + itemId, read);
}

export function cancelDragSortTick(itemId: string | number) {
  ticker.remove(LANE_READ_TAIL, DRAG_SORT_READ + itemId);
}

export function addReleaseScrollTick(
  itemId: string | number,
  read: TickCallback,
  write: TickCallback
) {
  ticker.add(LANE_READ, RELEASE_SCROLL_READ + itemId, read);
  ticker.add(LANE_WRITE, RELEASE_SCROLL_WRITE + itemId, write);
}

export function cancelReleaseScrollTick(itemId: string | number) {
  ticker.remove(LANE_READ, RELEASE_SCROLL_READ + itemId);
  ticker.remove(LANE_WRITE, RELEASE_SCROLL_WRITE + itemId);
}

export function addPlaceholderLayoutTick(
  itemId: string | number,
  read: TickCallback,
  write: TickCallback
) {
  ticker.add(LANE_READ, PLACEHOLDER_LAYOUT_READ + itemId, read);
  ticker.add(LANE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId, write);
}

export function cancelPlaceholderLayoutTick(itemId: string | number) {
  ticker.remove(LANE_READ, PLACEHOLDER_LAYOUT_READ + itemId);
  ticker.remove(LANE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId);
}

export function addPlaceholderResizeTick(itemId: string | number, write: TickCallback) {
  ticker.add(LANE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId, write);
}

export function cancelPlaceholderResizeTick(itemId: string | number) {
  ticker.remove(LANE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId);
}

export function addAutoScrollTick(read: TickCallback, write: TickCallback) {
  ticker.add(LANE_READ, AUTO_SCROLL_READ, read);
  ticker.add(LANE_WRITE, AUTO_SCROLL_WRITE, write);
}

export function cancelAutoScrollTick() {
  ticker.remove(LANE_READ, AUTO_SCROLL_READ);
  ticker.remove(LANE_WRITE, AUTO_SCROLL_WRITE);
}

export function addDebounceTick(debounceId: string | number, read: TickCallback) {
  ticker.add(LANE_READ, DEBOUNCE_READ + debounceId, read);
}

export function cancelDebounceTick(debounceId: string | number) {
  ticker.remove(LANE_READ, DEBOUNCE_READ + debounceId);
}
