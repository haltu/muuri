/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { EVENT_BEFORE_SEND, EVENT_BEFORE_RECEIVE, EVENT_SEND, EVENT_RECEIVE } from '../constants';

import ItemDrag from './ItemDrag';

import addClass from '../utils/addClass';
import getOffsetDiff from '../utils/getOffsetDiff';
import getTranslate from '../utils/getTranslate';
import arrayInsert from '../utils/arrayInsert';
import normalizeArrayIndex from '../utils/normalizeArrayIndex';
import removeClass from '../utils/removeClass';

/**
 * The migrate process handler constructor.
 *
 * @class
 * @param {Item} item
 */
function ItemMigrate(item) {
  // Private props.
  this._item = item;
  this._isActive = false;
  this._isDestroyed = false;
  this._container = false;
  this._containerDiffX = 0;
  this._containerDiffY = 0;
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Start the migrate process of an item.
 *
 * @public
 * @param {Grid} targetGrid
 * @param {(HTMLElement|Number|Item)} position
 * @param {HTMLElement} [container]
 */
ItemMigrate.prototype.start = function (targetGrid, position, container) {
  if (this._isDestroyed) return;

  var item = this._item;
  var element = item._element;
  var isActive = item.isActive();
  var isVisible = item.isVisible();
  var grid = item.getGrid();
  var settings = grid._settings;
  var targetSettings = targetGrid._settings;
  var targetElement = targetGrid._element;
  var targetItems = targetGrid._items;
  var currentIndex = grid._items.indexOf(item);
  var targetContainer = container || document.body;
  var targetIndex;
  var targetItem;
  var currentContainer;
  var offsetDiff;
  var containerDiff;
  var translate;
  var translateX;
  var translateY;
  var currentVisClass;
  var nextVisClass;

  // Get target index.
  if (typeof position === 'number') {
    targetIndex = normalizeArrayIndex(targetItems, position, 1);
  } else {
    targetItem = targetGrid.getItem(position);
    if (!targetItem) return;
    targetIndex = targetItems.indexOf(targetItem);
  }

  // Get current translateX and translateY values if needed.
  if (item.isPositioning() || this._isActive || item.isReleasing()) {
    translate = getTranslate(element);
    translateX = translate.x;
    translateY = translate.y;
  }

  // Abort current positioning.
  if (item.isPositioning()) {
    item._layout.stop(true, translateX, translateY);
  }

  // Abort current migration.
  if (this._isActive) {
    translateX -= this._containerDiffX;
    translateY -= this._containerDiffY;
    this.stop(true, translateX, translateY);
  }

  // Abort current release.
  if (item.isReleasing()) {
    translateX -= item._dragRelease._containerDiffX;
    translateY -= item._dragRelease._containerDiffY;
    item._dragRelease.stop(true, translateX, translateY);
  }

  // Stop current visibility animation.
  item._visibility.stop(true);

  // Destroy current drag.
  if (item._drag) item._drag.destroy();

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

  // Update item class.
  if (settings.itemClass !== targetSettings.itemClass) {
    removeClass(element, settings.itemClass);
    addClass(element, targetSettings.itemClass);
  }

  // Update visibility class.
  currentVisClass = isVisible ? settings.itemVisibleClass : settings.itemHiddenClass;
  nextVisClass = isVisible ? targetSettings.itemVisibleClass : targetSettings.itemHiddenClass;
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
    currentContainer = element.parentNode;
    if (targetContainer !== currentContainer) {
      targetContainer.appendChild(element);
      offsetDiff = getOffsetDiff(targetContainer, currentContainer, true);
      if (!translate) {
        translate = getTranslate(element);
        translateX = translate.x;
        translateY = translate.y;
      }
      item._setTranslate(translateX + offsetDiff.left, translateY + offsetDiff.top);
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
    containerDiff = getOffsetDiff(targetContainer, targetElement, true);
  }

  // Update item's cached dimensions.
  item._refreshDimensions();

  // Reset item's sort data.
  item._sortData = null;

  // Create new drag handler.
  item._drag = targetSettings.dragEnabled ? new ItemDrag(item) : null;

  // Setup migration data.
  if (isActive) {
    this._isActive = true;
    this._container = targetContainer;
    this._containerDiffX = containerDiff.left;
    this._containerDiffY = containerDiff.top;
  } else {
    this._isActive = false;
    this._container = null;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
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
};

/**
 * End the migrate process of an item. This method can be used to abort an
 * ongoing migrate process (animation) or finish the migrate process.
 *
 * @public
 * @param {Boolean} [abort=false]
 *  - Should the migration be aborted?
 * @param {Number} [left]
 *  - The element's current translateX value (optional).
 * @param {Number} [top]
 *  - The element's current translateY value (optional).
 */
ItemMigrate.prototype.stop = function (abort, left, top) {
  if (this._isDestroyed || !this._isActive) return;

  var item = this._item;
  var element = item._element;
  var grid = item.getGrid();
  var gridElement = grid._element;
  var translate;

  if (this._container !== gridElement) {
    if (left === undefined || top === undefined) {
      if (abort) {
        translate = getTranslate(element);
        left = translate.x - this._containerDiffX;
        top = translate.y - this._containerDiffY;
      } else {
        left = item._left;
        top = item._top;
      }
    }

    gridElement.appendChild(element);
    item._setTranslate(left, top);
  }

  this._isActive = false;
  this._container = null;
  this._containerDiffX = 0;
  this._containerDiffY = 0;
};

/**
 * Destroy instance.
 *
 * @public
 */
ItemMigrate.prototype.destroy = function () {
  if (this._isDestroyed) return;
  this.stop(true);
  this._item = null;
  this._isDestroyed = true;
};

export default ItemMigrate;
