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
import { Writeable } from '../types';

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
export default class ItemDragRelease {
  readonly item: Item | null;
  _isActive: boolean;
  _isPositioning: boolean;

  constructor(item: Item) {
    this.item = item;
    this._isActive = false;
    this._isPositioning = false;
    this._onScroll = this._onScroll.bind(this);
  }

  /**
   * Is item's drag release process active?
   *
   * @public
   * @returns {boolean}
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Is item's drag release positioning started?
   *
   * @public
   * @returns {boolean}
   */
  isPositioning() {
    return this._isPositioning;
  }

  /**
   * Start the release process of an item.
   *
   * @public
   */
  start() {
    if (!this.item || this.isActive()) return;

    const { item } = this;
    const grid = item.getGrid() as Grid;
    const { settings } = grid;

    this._isActive = true;

    addClass(item.element, settings.itemReleasingClass);

    if (!settings.dragRelease.useDragContainer) {
      this._placeToGrid();
    } else if (item.element.parentNode !== grid.element) {
      window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    }

    grid._emit(EVENT_DRAG_RELEASE_START, item as any as Item);

    // Let's start layout manually _only_ if there is no unfinished layout
    // about to finish.
    if (!grid._nextLayoutData) item._layout.start(false);
  }

  /**
   * End the release process of an item. This method can be used to abort an
   * ongoing release process (animation) or finish the release process.
   *
   * @public
   * @param {boolean} [abort=false]
   *  - Should the release be aborted? When true, the release end event won't be
   *    emitted. Set to true only when you need to abort the release process
   *    while the item is animating to it's position.
   * @param {number} [left]
   *  - The element's current translateX value (optional).
   * @param {number} [top]
   *  - The element's current translateY value (optional).
   */
  stop(abort = false, left?: number, top?: number) {
    if (!this.item || !this.isActive()) return;

    const { item } = this;

    if (!abort && (left === undefined || top === undefined)) {
      left = item.left;
      top = item.top;
    }

    const didReparent = this._placeToGrid(left, top);
    this.reset(didReparent);

    if (!abort) {
      const grid = item.getGrid() as Grid;
      grid._emit(EVENT_DRAG_RELEASE_END, item as any as Item);
    }
  }

  /**
   * Reset data and remove releasing class.
   *
   * @public
   * @param {boolean} [needsReflow=false]
   */
  reset(needsReflow = false) {
    if (!this.item) return;

    const { item } = this;
    const { itemReleasingClass } = (item.getGrid() as Grid).settings;

    this._isActive = false;
    this._isPositioning = false;

    cancelReleaseScrollTick(item.id);
    window.removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);

    // If the element was just reparented we need to do a forced reflow to
    // remove the class gracefully.
    if (itemReleasingClass) {
      // eslint-disable-next-line
      if (needsReflow) item.element.clientWidth;
      removeClass(item.element, itemReleasingClass);
    }
  }

  /**
   * Destroy instance.
   *
   * @public
   */
  destroy() {
    if (!this.item) return;
    this.stop(true);
    (this as Writeable<this>).item = null;
  }

  /**
   * Move the element back to the grid container element if it does not exist
   * there already.
   *
   * @param {number} [left]
   *  - The element's current translateX value (optional).
   * @param {number} [top]
   *  - The element's current translateY value (optional).
   * @returns {boolean}
   *   - Returns `true` if the element was reparented, `false` otherwise.
   */
  _placeToGrid(left?: number, top?: number) {
    if (!this.item) return false;

    const { item } = this;
    const gridElement = (item.getGrid() as Grid).element;

    if (item.element.parentNode !== gridElement) {
      if (left === undefined || top === undefined) {
        const { x, y } = item._getTranslate();
        left = x - item._containerDiffX;
        top = y - item._containerDiffY;
      }

      gridElement.appendChild(item.element);
      item._setTranslate(left, top);
      item._containerDiffX = 0;
      item._containerDiffY = 0;
      return true;
    }

    return false;
  }

  _onScroll() {
    if (!this.item || !this.isActive()) return;

    const { item } = this;
    let diffX = 0;
    let diffY = 0;

    addReleaseScrollTick(
      item.id,
      () => {
        if (!this.isActive()) return;

        const itemContainer = item.element.parentNode as HTMLElement | null;
        if (itemContainer) {
          const gridElement = (item.getGrid() as Grid).element;
          const { left, top } = getOffsetDiff(itemContainer, gridElement, true);
          diffX = left;
          diffY = top;
        }
      },
      () => {
        if (!this.isActive()) return;

        if (
          Math.abs(diffX - item._containerDiffX) > 0.1 ||
          Math.abs(diffY - item._containerDiffY) > 0.1
        ) {
          item._containerDiffX = diffX;
          item._containerDiffY = diffY;
          item._dragPlaceholder.reset();
          item._layout.stop(true, item.left, item.top);
          this.stop(false, item.left, item.top);
        }
      }
    );
  }
}
