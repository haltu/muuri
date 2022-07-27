/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { Ticker, PhaseListener } from 'tikki';

export const PHASE_SETUP = Symbol();
export const PHASE_READ = Symbol();
export const PHASE_READ_TAIL = Symbol();
export const PHASE_WRITE = Symbol();

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

const LISTENER_ID_MAP: Map<string, symbol> = new Map();

function addUniqueListener(
  phase: typeof PHASE_READ | typeof PHASE_READ_TAIL | typeof PHASE_WRITE,
  key: string,
  listener: PhaseListener
) {
  // If this is the first listener on this tick let's queue a one-off listener
  // in the setup phase which clears the LISTENER_ID_MAP. This is not important
  // for functionality, but very important to keep memory usage optimal.
  if (!LISTENER_ID_MAP.size) {
    ticker.once(PHASE_SETUP, () => {
      LISTENER_ID_MAP.clear();
    });
  }

  // Here we remove the existing listener based on the key and add new listener
  // to the queue.
  let listenerId = LISTENER_ID_MAP.get(key);
  if (listenerId) ticker.off(phase, listenerId);
  listenerId = ticker.once(phase, listener);
  LISTENER_ID_MAP.set(key, listenerId);
}

function removeUniqueListener(
  phase: typeof PHASE_READ | typeof PHASE_READ_TAIL | typeof PHASE_WRITE,
  key: string
) {
  const listenerId = LISTENER_ID_MAP.get(key);
  if (!listenerId) return;
  LISTENER_ID_MAP.delete(key);
  ticker.off(phase, listenerId);
}

export const ticker = new Ticker({
  phases: [PHASE_SETUP, PHASE_READ, PHASE_READ_TAIL, PHASE_WRITE],
});

export function addLayoutTick(itemId: string | number, read: PhaseListener, write: PhaseListener) {
  addUniqueListener(PHASE_READ, LAYOUT_READ + itemId, read);
  addUniqueListener(PHASE_WRITE, LAYOUT_WRITE + itemId, write);
}

export function cancelLayoutTick(itemId: string | number) {
  removeUniqueListener(PHASE_READ, LAYOUT_READ + itemId);
  removeUniqueListener(PHASE_WRITE, LAYOUT_WRITE + itemId);
}

export function addVisibilityTick(
  itemId: string | number,
  read: PhaseListener,
  write: PhaseListener
) {
  addUniqueListener(PHASE_READ, VISIBILITY_READ + itemId, read);
  addUniqueListener(PHASE_WRITE, VISIBILITY_WRITE + itemId, write);
}

export function cancelVisibilityTick(itemId: string | number) {
  removeUniqueListener(PHASE_READ, VISIBILITY_READ + itemId);
  removeUniqueListener(PHASE_WRITE, VISIBILITY_WRITE + itemId);
}

export function addDragStartTick(
  itemId: string | number,
  read: PhaseListener,
  write: PhaseListener
) {
  addUniqueListener(PHASE_READ, DRAG_START_READ + itemId, read);
  addUniqueListener(PHASE_WRITE, DRAG_START_WRITE + itemId, write);
}

export function cancelDragStartTick(itemId: string | number) {
  removeUniqueListener(PHASE_READ, DRAG_START_READ + itemId);
  removeUniqueListener(PHASE_WRITE, DRAG_START_WRITE + itemId);
}

export function addDragMoveTick(
  itemId: string | number,
  read: PhaseListener,
  write: PhaseListener
) {
  addUniqueListener(PHASE_READ, DRAG_MOVE_READ + itemId, read);
  addUniqueListener(PHASE_WRITE, DRAG_MOVE_WRITE + itemId, write);
}

export function cancelDragMoveTick(itemId: string | number) {
  removeUniqueListener(PHASE_READ, DRAG_MOVE_READ + itemId);
  removeUniqueListener(PHASE_WRITE, DRAG_MOVE_WRITE + itemId);
}

export function addDragScrollTick(
  itemId: string | number,
  read: PhaseListener,
  write: PhaseListener
) {
  addUniqueListener(PHASE_READ, DRAG_SCROLL_READ + itemId, read);
  addUniqueListener(PHASE_WRITE, DRAG_SCROLL_WRITE + itemId, write);
}

export function cancelDragScrollTick(itemId: string | number) {
  removeUniqueListener(PHASE_READ, DRAG_SCROLL_READ + itemId);
  removeUniqueListener(PHASE_WRITE, DRAG_SCROLL_WRITE + itemId);
}

export function addDragSortTick(itemId: string | number, read: PhaseListener) {
  addUniqueListener(PHASE_READ_TAIL, DRAG_SORT_READ + itemId, read);
}

export function cancelDragSortTick(itemId: string | number) {
  removeUniqueListener(PHASE_READ_TAIL, DRAG_SORT_READ + itemId);
}

export function addReleaseScrollTick(
  itemId: string | number,
  read: PhaseListener,
  write: PhaseListener
) {
  addUniqueListener(PHASE_READ, RELEASE_SCROLL_READ + itemId, read);
  addUniqueListener(PHASE_WRITE, RELEASE_SCROLL_WRITE + itemId, write);
}

export function cancelReleaseScrollTick(itemId: string | number) {
  removeUniqueListener(PHASE_READ, RELEASE_SCROLL_READ + itemId);
  removeUniqueListener(PHASE_WRITE, RELEASE_SCROLL_WRITE + itemId);
}

export function addPlaceholderLayoutTick(
  itemId: string | number,
  read: PhaseListener,
  write: PhaseListener
) {
  addUniqueListener(PHASE_READ, PLACEHOLDER_LAYOUT_READ + itemId, read);
  addUniqueListener(PHASE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId, write);
}

export function cancelPlaceholderLayoutTick(itemId: string | number) {
  removeUniqueListener(PHASE_READ, PLACEHOLDER_LAYOUT_READ + itemId);
  removeUniqueListener(PHASE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId);
}

export function addPlaceholderResizeTick(itemId: string | number, write: PhaseListener) {
  addUniqueListener(PHASE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId, write);
}

export function cancelPlaceholderResizeTick(itemId: string | number) {
  removeUniqueListener(PHASE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId);
}

export function addAutoScrollTick(read: PhaseListener, write: PhaseListener) {
  addUniqueListener(PHASE_READ, AUTO_SCROLL_READ, read);
  addUniqueListener(PHASE_WRITE, AUTO_SCROLL_WRITE, write);
}

export function cancelAutoScrollTick() {
  removeUniqueListener(PHASE_READ, AUTO_SCROLL_READ);
  removeUniqueListener(PHASE_WRITE, AUTO_SCROLL_WRITE);
}

export function addDebounceTick(debounceId: string | number, read: PhaseListener) {
  addUniqueListener(PHASE_READ, DEBOUNCE_READ + debounceId, read);
}

export function cancelDebounceTick(debounceId: string | number) {
  removeUniqueListener(PHASE_READ, DEBOUNCE_READ + debounceId);
}
