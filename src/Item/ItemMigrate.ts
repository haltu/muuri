/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { EVENT_BEFORE_SEND, EVENT_BEFORE_RECEIVE, EVENT_SEND, EVENT_RECEIVE } from '../constants';

import Grid from '../Grid/Grid';
import Item from './Item';
import ItemDrag from './ItemDrag';

import addClass from '../utils/addClass';
import getOffsetDiff from '../utils/getOffsetDiff';
import arrayInsert from '../utils/arrayInsert';
import normalizeArrayIndex from '../utils/normalizeArrayIndex';
import removeClass from '../utils/removeClass';

import { ItemMigrate as ItemMigrateInterface } from '../types';

/**
 * The migrate process handler constructor.
 *
 * @class
 * @param {Item} item
 */
class ItemMigrate implements ItemMigrateInterface {
  public _item: Item;
  public _isActive: boolean;
  public _isDestroyed: boolean;
  public _container: HTMLElement | null;

  constructor(item: Item) {
    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._container = null;
  }

  /**
   * Start the migrate process of an item.
   *
   * @public
   * @param {Grid} targetGrid
   * @param {(HTMLElement|Number|Item)} position
   * @param {HTMLElement} [container]
   */
  public start(targetGrid: Grid, position: HTMLElement | number | Item, container?: HTMLElement) {
    if (this._isDestroyed) return;

    const item = this._item;
    const grid = item.getGrid();
    const targetElement = targetGrid._element;

    if (!grid || !targetElement) return;

    const element = item._element;
    const isActive = item.isActive();
    const isVisible = item.isVisible();
    const settings = grid._settings;
    const currentIndex = grid._items.indexOf(item);
    const targetSettings = targetGrid._settings;
    const targetItems = targetGrid._items;
    const targetContainer = container || document.body;

    // Get target index.
    let targetIndex = 0;
    if (typeof position === 'number') {
      targetIndex = normalizeArrayIndex(targetItems, position, 1);
    } else {
      const targetItem = targetGrid.getItem(position);
      if (!targetItem) return;
      targetIndex = targetItems.indexOf(targetItem);
    }

    // If item is being dragged, stop it.
    if (item._drag) item._drag.stop();

    // Abort current positioning/migration/releasing.
    if (this._isActive || item.isPositioning() || item.isReleasing()) {
      let { x, y } = item._getTranslate();

      if (item.isPositioning()) {
        item._layout.stop(true, x, y);
      }

      x -= item._containerDiffX;
      y -= item._containerDiffY;

      if (this._isActive) {
        this.stop(true, x, y);
      } else if (item.isReleasing()) {
        item._dragRelease.stop(true, x, y);
      }
    }

    // Stop current visibility animation.
    item._visibility.stop(true);

    // Emit beforeSend event.
    if (grid._hasListeners(EVENT_BEFORE_SEND)) {
      grid._emit(EVENT_BEFORE_SEND, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Emit beforeReceive event.
    if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
      targetGrid._emit(EVENT_BEFORE_RECEIVE, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Let's make sure that the item and both grids are not destroyed after
    // we have emitted the events.
    if (item._isDestroyed || grid._isDestroyed || targetGrid._isDestroyed) {
      return;
    }

    // Destroy current drag.
    if (item._drag) {
      item._drag.destroy();
      item._drag = null;
    }

    // Update item class.
    if (settings.itemClass !== targetSettings.itemClass) {
      removeClass(element, settings.itemClass);
      addClass(element, targetSettings.itemClass);
    }

    // Update visibility class.
    const currentVisClass = isVisible ? settings.itemVisibleClass : settings.itemHiddenClass;
    const nextVisClass = isVisible
      ? targetSettings.itemVisibleClass
      : targetSettings.itemHiddenClass;
    if (currentVisClass !== nextVisClass) {
      removeClass(element, currentVisClass);
      addClass(element, nextVisClass);
    }

    // Move item instance from current grid to target grid.
    grid._items.splice(currentIndex, 1);
    arrayInsert(targetItems, item, targetIndex);

    // Update item's grid id reference.
    item._gridId = targetGrid._id;

    // If item is active we need to move the item inside the target container for
    // the duration of the (potential) animation if it's different than the
    // current container.
    if (isActive) {
      const currentContainer = element.parentNode as HTMLElement | Document;
      if (targetContainer !== currentContainer) {
        targetContainer.appendChild(element);
        const offsetDiff = getOffsetDiff(targetContainer, currentContainer, true);
        const t = item._getTranslate();
        item._setTranslate(t.x + offsetDiff.left, t.y + offsetDiff.top);
      }
    }
    // If item is not active let's just append it to the target grid's element.
    else {
      targetElement.appendChild(element);
    }

    // Update child element's styles to reflect the current visibility state.
    item._visibility.setStyles(
      isVisible ? targetSettings.visibleStyles : targetSettings.hiddenStyles
    );

    // Get offset diff for the migration data, if the item is active.
    if (isActive) {
      const { left, top } = getOffsetDiff(targetContainer, targetElement, true);
      item._containerDiffX = left;
      item._containerDiffY = top;
    }

    // Update item's cached dimensions.
    item._refreshDimensions();

    // Reset item's sort data.
    item._sortData = null;

    // Create new drag handler.
    if (targetSettings.dragEnabled) {
      item._drag = new ItemDrag(item);
    }

    // Setup migration data.
    if (isActive) {
      this._isActive = true;
      this._container = targetContainer;
    } else {
      this._isActive = false;
      this._container = null;
    }

    // Emit send event.
    if (grid._hasListeners(EVENT_SEND)) {
      grid._emit(EVENT_SEND, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Emit receive event.
    if (targetGrid._hasListeners(EVENT_RECEIVE)) {
      targetGrid._emit(EVENT_RECEIVE, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }
  }

  /**
   * End the migrate process of an item. This method can be used to abort an
   * ongoing migrate process (animation) or finish the migrate process.
   *
   * @public
   * @param {boolean} [abort=false]
   *  - Should the migration be aborted?
   * @param {number} [left]
   *  - The element's current translateX value (optional).
   * @param {number} [top]
   *  - The element's current translateY value (optional).
   */
  public stop(abort = false, left?: number, top?: number) {
    if (this._isDestroyed || !this._isActive) return;

    const item = this._item;
    const gridElement = item.getGrid()?._element;

    if (!gridElement) return;

    if (this._container !== gridElement) {
      if (left === undefined || top === undefined) {
        if (abort) {
          const t = item._getTranslate();
          left = t.x - item._containerDiffX;
          top = t.y - item._containerDiffY;
        } else {
          left = item._left;
          top = item._top;
        }
      }

      gridElement.appendChild(item._element);
      item._setTranslate(left, top);
      item._containerDiffX = 0;
      item._containerDiffY = 0;
    }

    this._isActive = false;
    this._container = null;
  }

  /**
   * Destroy instance.
   *
   * @public
   */
  public destroy() {
    if (this._isDestroyed) return;
    this.stop(true);
    this._isDestroyed = true;
  }
}

export default ItemMigrate;
