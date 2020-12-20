/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { EVENT_DRAG_RELEASE_START, EVENT_DRAG_RELEASE_END, HAS_PASSIVE_EVENTS } from '../constants';

import { addReleaseScrollTick, cancelReleaseScrollTick } from '../ticker';

import Grid from '../Grid/Grid';
import Item from './Item';

import addClass from '../utils/addClass';
import getOffsetDiff from '../utils/getOffsetDiff';
import removeClass from '../utils/removeClass';

const SCROLL_LISTENER_OPTIONS = HAS_PASSIVE_EVENTS ? { capture: true, passive: true } : true;

/**
 * The release process handler constructor. Although this might seem as proper
 * fit for the drag process this needs to be separated into it's own logic
 * because there might be a scenario where drag is disabled, but the release
 * process still needs to be implemented (dragging from a grid to another).
 *
 * @class
 * @param {Item} item
 */
class ItemDragRelease {
  _item: Item;
  _isActive: boolean;
  _isDestroyed: boolean;
  _isPositioningStarted: boolean;

  constructor(item: Item) {
    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._isPositioningStarted = false;
    this._onScroll = this._onScroll.bind(this);
  }

  /**
   * Start the release process of an item.
   *
   * @public
   */
  start() {
    if (this._isDestroyed || this._isActive) return;

    const item = this._item;
    const grid = item.getGrid() as Grid;
    const settings = grid._settings;

    this._isActive = true;

    addClass(item._element, settings.itemReleasingClass);

    if (!settings.dragRelease.useDragContainer) {
      this._placeToGrid();
    } else if (item._element.parentNode !== grid._element) {
      window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    }

    grid._emit(EVENT_DRAG_RELEASE_START, item);

    // Let's start layout manually _only_ if there is no unfinished layout
    // about to finish.
    if (!grid._nextLayoutData) item._layout.start(false);
  }

  /**
   * End the release process of an item. This method can be used to abort an
   * ongoing release process (animation) or finish the release process.
   *
   * @public
   * @param {Boolean} [abort=false]
   *  - Should the release be aborted? When true, the release end event won't be
   *    emitted. Set to true only when you need to abort the release process
   *    while the item is animating to it's position.
   * @param {number} [left]
   *  - The element's current translateX value (optional).
   * @param {number} [top]
   *  - The element's current translateY value (optional).
   */
  stop(abort = false, left?: number, top?: number) {
    if (this._isDestroyed || !this._isActive) return;

    const item = this._item;

    if (!abort && (left === undefined || top === undefined)) {
      left = item._left;
      top = item._top;
    }

    const didReparent = this._placeToGrid(left, top);
    this._reset(didReparent);

    if (!abort) (item.getGrid() as Grid)._emit(EVENT_DRAG_RELEASE_END, item);
  }

  isJustReleased() {
    return this._isActive && this._isPositioningStarted === false;
  }

  /**
   * Destroy instance.
   *
   * @public
   */
  destroy() {
    if (this._isDestroyed) return;
    this.stop(true);
    this._isDestroyed = true;
  }

  /**
   * Move the element back to the grid container element if it does not exist
   * there already.
   *
   * @private
   * @param {number} [left]
   *  - The element's current translateX value (optional).
   * @param {number} [top]
   *  - The element's current translateY value (optional).
   * @returns {boolean}
   *   - Returns `true` if the element was reparented, `false` otherwise.
   */
  _placeToGrid(left?: number, top?: number) {
    let didReparent = false;

    if (this._isDestroyed) return didReparent;

    const item = this._item;
    const element = item._element;
    const container = (item.getGrid() as Grid)._element;

    if (container && element.parentNode !== container) {
      if (left === undefined || top === undefined) {
        const { x, y } = item._getTranslate();
        left = x - item._containerDiffX;
        top = y - item._containerDiffY;
      }

      container.appendChild(element);
      item._setTranslate(left, top);
      item._containerDiffX = 0;
      item._containerDiffY = 0;
      didReparent = true;
    }

    return didReparent;
  }

  /**
   * Reset data and remove releasing class.
   *
   * @private
   * @param {Boolean} [needsReflow=false]
   */
  _reset(needsReflow = false) {
    if (this._isDestroyed) return;

    const item = this._item;
    const releasingClass = (item.getGrid() as Grid)._settings.itemReleasingClass;

    this._isActive = false;
    this._isPositioningStarted = false;

    cancelReleaseScrollTick(item._id);
    window.removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);

    // If the element was just reparented we need to do a forced reflow to remove
    // the class gracefully.
    if (releasingClass) {
      // eslint-disable-next-line
      if (needsReflow) item._element.clientWidth;
      removeClass(item._element, releasingClass);
    }
  }

  /**
   * @private
   */
  _onScroll() {
    if (this._isDestroyed || !this._isActive) return;

    const item = this._item;
    let diffX = 0;
    let diffY = 0;

    addReleaseScrollTick(
      item._id,
      () => {
        if (!this._isActive) return;

        const itemContainer = item._element.parentNode as HTMLElement | null;
        const gridContainer = (item.getGrid() as Grid)._element;
        if (itemContainer && gridContainer) {
          const { left, top } = getOffsetDiff(itemContainer, gridContainer, true);
          diffX = left;
          diffY = top;
        }
      },
      () => {
        if (!this._isActive) return;

        if (
          Math.abs(diffX - item._containerDiffX) > 0.1 ||
          Math.abs(diffY - item._containerDiffY) > 0.1
        ) {
          item._containerDiffX = diffX;
          item._containerDiffY = diffY;
          if (item._dragPlaceholder) item._dragPlaceholder.reset();
          item._layout.stop(true, item._left, item._top);
          this.stop(false, item._left, item._top);
        }
      }
    );
  }
}

export default ItemDragRelease;
