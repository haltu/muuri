/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { eventBeforeSend, eventBeforeReceive, eventSend, eventReceive } from '../shared.js';

import ItemDrag from './ItemDrag.js';

import addClass from '../utils/addClass.js';
import createTranslateStyle from '../utils/createTranslateStyle.js';
import getOffsetDiff from '../utils/getOffsetDiff.js';
import getTranslate from '../utils/getTranslate.js';
import arrayInsert from '../utils/arrayInsert.js';
import normalizeArrayIndex from '../utils/normalizeArrayIndex.js';
import removeClass from '../utils/removeClass.js';
import setStyles from '../utils/setStyles.js';
import { transformProp } from '../utils/supportedTransform.js';

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
 * @todo Make this smoother, currently there is way too much destroying and
 * reinitialization going on. Just do what's needed and get out of the way
 * quickly.
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
  var itemElement = item._element;
  var isItemVisible = item.isVisible();
  var currentGrid = item.getGrid();
  var currentGridStn = currentGrid._settings;
  var targetGridStn = targetGrid._settings;
  var targetGridElement = targetGrid._element;
  var currentIndex = currentGrid._items.indexOf(item);
  var targetIndex =
    typeof position === 'number'
      ? position
      : targetGrid._items.indexOf(targetGrid._getItem(position));
  var targetContainer = container || document.body;
  var currentContainer;
  var offsetDiff;
  var containerDiff;
  var translate;
  var translateX;
  var translateY;

  // If we have invalid new index, let's return immediately.
  if (targetIndex === null) return this;

  // Normalize target index (for event data).
  targetIndex = normalizeArrayIndex(targetGrid._items, targetIndex, true);

  // Get current translateX and translateY values if needed.
  if (item.isPositioning() || this._isActive || item.isReleasing()) {
    translate = getTranslate(itemElement);
    translateX = translate.x;
    translateY = translate.y;
  }

  // Abort current positioning.
  if (item.isPositioning()) {
    item._layout.stop(true, { transform: createTranslateStyle(translateX, translateY) });
  }

  // Abort current migration.
  if (this._isActive) {
    translateX -= this._containerDiffX;
    translateY -= this._containerDiffY;
    this.stop(true, { transform: createTranslateStyle(translateX, translateY) });
  }

  // Abort current release.
  if (item.isReleasing()) {
    translateX -= item._release._containerDiffX;
    translateY -= item._release._containerDiffY;
    item._release.stop(true, { transform: createTranslateStyle(translateX, translateY) });
  }

  // Stop current visibility animations.
  // TODO: This causes potentially layout thrashing, because we are not
  // feeding any styles to the stop handlers.
  item._visibility._stopAnimation();

  // Destroy current drag.
  if (item._drag) item._drag.destroy();

  // Process current visibility animation queue.
  item._visibility._queue.flush(true, item);

  // Emit beforeSend event.
  currentGrid._emit(eventBeforeSend, {
    item: item,
    fromGrid: currentGrid,
    fromIndex: currentIndex,
    toGrid: targetGrid,
    toIndex: targetIndex
  });

  // Emit beforeReceive event.
  targetGrid._emit(eventBeforeReceive, {
    item: item,
    fromGrid: currentGrid,
    fromIndex: currentIndex,
    toGrid: targetGrid,
    toIndex: targetIndex
  });

  // Remove current classnames.
  removeClass(itemElement, currentGridStn.itemClass);
  removeClass(itemElement, currentGridStn.itemVisibleClass);
  removeClass(itemElement, currentGridStn.itemHiddenClass);

  // Add new classnames.
  addClass(itemElement, targetGridStn.itemClass);
  addClass(
    itemElement,
    isItemVisible ? targetGridStn.itemVisibleClass : targetGridStn.itemHiddenClass
  );

  // Move item instance from current grid to target grid.
  currentGrid._items.splice(currentIndex, 1);
  arrayInsert(targetGrid._items, item, targetIndex);

  // Update item's grid id reference.
  item._gridId = targetGrid._id;

  // Get current container
  currentContainer = itemElement.parentNode;

  // Move the item inside the target container if it's different than the
  // current container.
  if (targetContainer !== currentContainer) {
    targetContainer.appendChild(itemElement);
    offsetDiff = getOffsetDiff(targetContainer, currentContainer, true);
    if (!translate) {
      translate = getTranslate(itemElement);
      translateX = translate.x;
      translateY = translate.y;
    }
    itemElement.style[transformProp] = createTranslateStyle(
      translateX + offsetDiff.left,
      translateY + offsetDiff.top
    );
  }

  // Update child element's styles to reflect the current visibility state.
  item._child.removeAttribute('style');
  setStyles(item._child, isItemVisible ? targetGridStn.visibleStyles : targetGridStn.hiddenStyles);

  // Update display style.
  itemElement.style.display = isItemVisible ? 'block' : 'hidden';

  // Get offset diff for the migration data.
  containerDiff = getOffsetDiff(targetContainer, targetGridElement, true);

  // Update item's cached dimensions and sort data.
  item._refreshDimensions()._refreshSortData();

  // Create new drag handler.
  // TODO: Could we here also modify the existing drag handler to avoid
  // memory allocations?
  item._drag = targetGridStn.dragEnabled ? new ItemDrag(item) : null;

  // Setup migration data.
  this._isActive = true;
  this._container = targetContainer;
  this._containerDiffX = containerDiff.left;
  this._containerDiffY = containerDiff.top;

  // Emit send event.
  currentGrid._emit(eventSend, {
    item: item,
    fromGrid: currentGrid,
    fromIndex: currentIndex,
    toGrid: targetGrid,
    toIndex: targetIndex
  });

  // Emit receive event.
  targetGrid._emit(eventReceive, {
    item: item,
    fromGrid: currentGrid,
    fromIndex: currentIndex,
    toGrid: targetGrid,
    toIndex: targetIndex
  });

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
 * @param {Object} [currentStyles]
 *  - Optional current translateX and translateY styles.
 * @returns {ItemMigrate}
 */
var currentStylesFallback = {};
ItemMigrate.prototype.stop = function(abort, currentStyles) {
  if (this._isDestroyed || !this._isActive) return this;

  var item = this._item;
  var element = item._element;
  var grid = item.getGrid();
  var gridElement = grid._element;
  var translate;

  if (this._container !== gridElement) {
    if (!currentStyles) {
      if (abort) {
        translate = getTranslate(element);
        currentStylesFallback.transform = createTranslateStyle(
          translate.x - this._containerDiffX,
          translate.y - this._containerDiffY
        );
      } else {
        currentStylesFallback.transform = createTranslateStyle(item._left, item._top);
      }
      currentStyles = currentStylesFallback;
    }
    gridElement.appendChild(element);
    setStyles(element, currentStyles);
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
