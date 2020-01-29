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
import getTranslateString from '../utils/getTranslateString';
import arrayInsert from '../utils/arrayInsert';
import normalizeArrayIndex from '../utils/normalizeArrayIndex';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

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
 * @memberof ItemMigrate.prototype
 * @param {Grid} targetGrid
 * @param {GridSingleItemQuery} position
 * @param {HTMLElement} [container]
 * @returns {ItemMigrate}
 */
ItemMigrate.prototype.start = function(targetGrid, position, container) {
  if (this._isDestroyed) return this;

  var item = this._item;
  var element = item._element;
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
  var layoutStyles;

  // Get target index.
  if (typeof position === 'number') {
    targetIndex = normalizeArrayIndex(targetItems, position, 1);
  } else {
    targetItem = targetGrid._getItem(position);
    if (!targetItem) return this;
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
    layoutStyles = {};
    layoutStyles[transformProp] = getTranslateString(translateX, translateY);
    item._layout.stop(true, layoutStyles);
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

  // Stop current visibility animations.
  item._visibility._stopAnimation();

  // Destroy current drag.
  if (item._drag) item._drag.destroy();

  // Process current visibility animation queue.
  item._visibility._queue.process(true, item);

  // Emit beforeSend event.
  if (grid._hasListeners(EVENT_BEFORE_SEND)) {
    grid._emit(EVENT_BEFORE_SEND, {
      item: item,
      fromGrid: grid,
      fromIndex: currentIndex,
      toGrid: targetGrid,
      toIndex: targetIndex
    });
  }

  // Emit beforeReceive event.
  if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
    targetGrid._emit(EVENT_BEFORE_RECEIVE, {
      item: item,
      fromGrid: grid,
      fromIndex: currentIndex,
      toGrid: targetGrid,
      toIndex: targetIndex
    });
  }

  // Remove current classnames.
  removeClass(element, settings.itemClass);
  removeClass(element, settings.itemVisibleClass);
  removeClass(element, settings.itemHiddenClass);

  // Add new classnames.
  addClass(element, targetSettings.itemClass);
  addClass(element, isVisible ? targetSettings.itemVisibleClass : targetSettings.itemHiddenClass);

  // Move item instance from current grid to target grid.
  grid._items.splice(currentIndex, 1);
  arrayInsert(targetItems, item, targetIndex);

  // Update item's grid id reference.
  item._gridId = targetGrid._id;

  // Get current container.
  currentContainer = element.parentNode;

  // Move the item inside the target container if it's different than the
  // current container.
  if (targetContainer !== currentContainer) {
    targetContainer.appendChild(element);
    offsetDiff = getOffsetDiff(targetContainer, currentContainer, true);
    if (!translate) {
      translate = getTranslate(element);
      translateX = translate.x;
      translateY = translate.y;
    }
    element.style[transformProp] = getTranslateString(
      translateX + offsetDiff.left,
      translateY + offsetDiff.top
    );
  }

  // Update child element's styles to reflect the current visibility state.
  item._visibility.setStyles(
    isVisible ? targetSettings.visibleStyles : targetSettings.hiddenStyles
  );

  // Update display style.
  element.style.display = isVisible ? 'block' : 'hidden';

  // Get offset diff for the migration data.
  containerDiff = getOffsetDiff(targetContainer, targetElement, true);

  // Update item's cached dimensions and sort data.
  item._refreshDimensions();
  item._refreshSortData();

  // Create new drag handler.
  item._drag = targetSettings.dragEnabled ? new ItemDrag(item) : null;

  // Setup migration data.
  this._isActive = true;
  this._container = targetContainer;
  this._containerDiffX = containerDiff.left;
  this._containerDiffY = containerDiff.top;

  // Emit send event.
  if (grid._hasListeners(EVENT_SEND)) {
    grid._emit(EVENT_SEND, {
      item: item,
      fromGrid: grid,
      fromIndex: currentIndex,
      toGrid: targetGrid,
      toIndex: targetIndex
    });
  }

  // Emit receive event.
  if (targetGrid._hasListeners(EVENT_RECEIVE)) {
    targetGrid._emit(EVENT_RECEIVE, {
      item: item,
      fromGrid: grid,
      fromIndex: currentIndex,
      toGrid: targetGrid,
      toIndex: targetIndex
    });
  }

  return this;
};

/**
 * End the migrate process of an item. This method can be used to abort an
 * ongoing migrate process (animation) or finish the migrate process.
 *
 * @public
 * @memberof ItemMigrate.prototype
 * @param {Boolean} [abort=false]
 *  - Should the migration be aborted?
 * @param {Number} [left]
 *  - The element's current translateX value (optional).
 * @param {Number} [top]
 *  - The element's current translateY value (optional).
 * @returns {ItemMigrate}
 */
ItemMigrate.prototype.stop = function(abort, left, top) {
  if (this._isDestroyed || !this._isActive) return this;

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
    element.style[transformProp] = getTranslateString(left, top);
  }

  this._isActive = false;
  this._container = null;
  this._containerDiffX = 0;
  this._containerDiffY = 0;

  return this;
};

/**
 * Destroy instance.
 *
 * @public
 * @memberof ItemMigrate.prototype
 * @returns {ItemMigrate}
 */
ItemMigrate.prototype.destroy = function() {
  if (this._isDestroyed) return this;
  this.stop(true);
  this._item = null;
  this._isDestroyed = true;
  return this;
};

export default ItemMigrate;
