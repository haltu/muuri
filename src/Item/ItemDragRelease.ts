/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { EVENT_DRAG_RELEASE_START, EVENT_DRAG_RELEASE_END, HAS_PASSIVE_EVENTS } from '../constants';

import { addReleaseScrollTick, cancelReleaseScrollTick } from '../ticker';

import Grid, { GridInternal } from '../Grid/Grid';
import Item, { ItemInternal } from './Item';

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
  readonly item: ItemInternal;
  protected _isActive: boolean;
  protected _isPositioning: boolean;
  protected _isDestroyed: boolean;

  constructor(item: Item) {
    this.item = (item as any) as ItemInternal;
    this._isActive = false;
    this._isPositioning = false;
    this._isDestroyed = false;
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
   * Is instance destroyed?
   *
   * @public
   * @returns {boolean}
   */
  isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * Start the release process of an item.
   *
   * @public
   */
  start() {
    if (this._isDestroyed || this._isActive) return;

    const { item } = this;
    const grid = (item.getGrid() as any) as GridInternal;
    const { settings } = grid;

    this._isActive = true;

    addClass(item.element, settings.itemReleasingClass);

    if (!settings.dragRelease.useDragContainer) {
      this._placeToGrid();
    } else if (item.element.parentNode !== grid.element) {
      window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    }

    grid._emit(EVENT_DRAG_RELEASE_START, (item as any) as Item);

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

    const { item } = this;

    if (!abort && (left === undefined || top === undefined)) {
      left = item.left;
      top = item.top;
    }

    const didReparent = this._placeToGrid(left, top);
    this.reset(didReparent);

    if (!abort) {
      ((item.getGrid() as any) as GridInternal)._emit(
        EVENT_DRAG_RELEASE_END,
        (item as any) as Item
      );
    }
  }

  /**
   * Reset data and remove releasing class.
   *
   * @public
   * @param {Boolean} [needsReflow=false]
   */
  reset(needsReflow = false) {
    if (this._isDestroyed) return;

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
    if (this._isDestroyed) return;
    this.stop(true);
    this._isDestroyed = true;
  }

  /**
   * Move the element back to the grid container element if it does not exist
   * there already.
   *
   * @protected
   * @param {number} [left]
   *  - The element's current translateX value (optional).
   * @param {number} [top]
   *  - The element's current translateY value (optional).
   * @returns {boolean}
   *   - Returns `true` if the element was reparented, `false` otherwise.
   */
  protected _placeToGrid(left?: number, top?: number) {
    let didReparent = false;

    if (this._isDestroyed) return didReparent;

    const { item } = this;
    const element = item.element;
    const gridElement = (item.getGrid() as Grid).element;

    if (element.parentNode !== gridElement) {
      if (left === undefined || top === undefined) {
        const { x, y } = item._getTranslate();
        left = x - item._containerDiffX;
        top = y - item._containerDiffY;
      }

      gridElement.appendChild(element);
      item._setTranslate(left, top);
      item._containerDiffX = 0;
      item._containerDiffY = 0;
      didReparent = true;
    }

    return didReparent;
  }

  /**
   * @protected
   */
  protected _onScroll() {
    if (this._isDestroyed || !this._isActive) return;

    const { item } = this;
    let diffX = 0;
    let diffY = 0;

    addReleaseScrollTick(
      item.id,
      () => {
        if (!this._isActive) return;

        const itemContainer = item.element.parentNode as HTMLElement | null;
        if (itemContainer) {
          const gridElement = (item.getGrid() as Grid).element;
          const { left, top } = getOffsetDiff(itemContainer, gridElement, true);
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
          item._layout.stop(true, item.left, item.top);
          this.stop(false, item.left, item.top);
        }
      }
    );
  }
}

export interface ItemDragReleaseInternal extends Writeable<ItemDragRelease> {
  _isActive: ItemDragRelease['_isActive'];
  _isPositioning: ItemDragRelease['_isPositioning'];
  _isDestroyed: ItemDragRelease['_isDestroyed'];
  _placeToGrid: ItemDragRelease['_placeToGrid'];
  _onScroll: ItemDragRelease['_onScroll'];
}
