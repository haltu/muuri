/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { GRID_INSTANCES, ITEM_ELEMENT_MAP } from '../constants';

import ItemDrag from './ItemDrag';
import ItemDragPlaceholder from './ItemDragPlaceholder';
import ItemDragRelease from './ItemDragRelease';
import ItemLayout from './ItemLayout';
import ItemMigrate from './ItemMigrate';
import ItemVisibility from './ItemVisibility';
import Emitter from '../Emitter/Emitter';

import addClass from '../utils/addClass';
import createUid from '../utils/createUid';
import getStyle from '../utils/getStyle';
import getStyleAsFloat from '../utils/getStyleAsFloat';
import getTranslateString from '../utils/getTranslateString';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

/**
 * Creates a new Item instance for a Grid instance.
 *
 * @class
 * @param {Grid} grid
 * @param {HTMLElement} element
 * @param {Boolean} [isActive]
 */
function Item(grid, element, isActive) {
  var settings = grid._settings;

  // Store item/element pair to a map (for faster item querying by element).
  if (ITEM_ELEMENT_MAP) {
    if (ITEM_ELEMENT_MAP.has(element)) {
      throw new Error('You can only create one Muuri Item per element!');
    } else {
      ITEM_ELEMENT_MAP.set(element, this);
    }
  }

  this._id = createUid();
  this._gridId = grid._id;
  this._element = element;
  this._isDestroyed = false;
  this._left = 0;
  this._top = 0;
  this._width = 0;
  this._height = 0;
  this._marginLeft = 0;
  this._marginRight = 0;
  this._marginTop = 0;
  this._marginBottom = 0;
  this._tX = undefined;
  this._tY = undefined;
  this._sortData = null;
  this._emitter = new Emitter();

  // If the provided item element is not a direct child of the grid container
  // element, append it to the grid container. Note, we are indeed reading the
  // DOM here but it's a property that does not cause reflowing.
  if (element.parentNode !== grid._element) {
    grid._element.appendChild(element);
  }

  // Set item class.
  addClass(element, settings.itemClass);

  // If isActive is not defined, let's try to auto-detect it. Note, we are
  // indeed reading the DOM here but it's a property that does not cause
  // reflowing.
  if (typeof isActive !== 'boolean') {
    isActive = getStyle(element, 'display') !== 'none';
  }

  // Set up active state (defines if the item is considered part of the layout
  // or not).
  this._isActive = isActive;

  // Setup visibility handler.
  this._visibility = new ItemVisibility(this);

  // Set up layout handler.
  this._layout = new ItemLayout(this);

  // Set up migration handler data.
  this._migrate = new ItemMigrate(this);

  // Set up drag handler.
  this._drag = settings.dragEnabled ? new ItemDrag(this) : null;

  // Set up release handler. Note that although this is fully linked to dragging
  // this still needs to be always instantiated to handle migration scenarios
  // correctly.
  this._dragRelease = new ItemDragRelease(this);

  // Set up drag placeholder handler. Note that although this is fully linked to
  // dragging this still needs to be always instantiated to handle migration
  // scenarios correctly.
  this._dragPlaceholder = new ItemDragPlaceholder(this);

  // Note! You must call the following methods before you start using the
  // instance. They are deliberately not called in the end as it would cause
  // potentially a massive amount of reflows if multiple items were instantiated
  // in a loop.
  // this._refreshDimensions();
  // this._refreshSortData();
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Get the instance grid reference.
 *
 * @public
 * @returns {Grid}
 */
Item.prototype.getGrid = function () {
  return GRID_INSTANCES[this._gridId];
};

/**
 * Get the instance element.
 *
 * @public
 * @returns {HTMLElement}
 */
Item.prototype.getElement = function () {
  return this._element;
};

/**
 * Get instance element's cached width.
 *
 * @public
 * @returns {Number}
 */
Item.prototype.getWidth = function () {
  return this._width;
};

/**
 * Get instance element's cached height.
 *
 * @public
 * @returns {Number}
 */
Item.prototype.getHeight = function () {
  return this._height;
};

/**
 * Get instance element's cached margins.
 *
 * @public
 * @returns {Object}
 *   - The returned object contains left, right, top and bottom properties
 *     which indicate the item element's cached margins.
 */
Item.prototype.getMargin = function () {
  return {
    left: this._marginLeft,
    right: this._marginRight,
    top: this._marginTop,
    bottom: this._marginBottom,
  };
};

/**
 * Get instance element's cached position.
 *
 * @public
 * @returns {Object}
 *   - The returned object contains left and top properties which indicate the
 *     item element's cached position in the grid.
 */
Item.prototype.getPosition = function () {
  return {
    left: this._left,
    top: this._top,
  };
};

/**
 * Is the item active?
 *
 * @public
 * @returns {Boolean}
 */
Item.prototype.isActive = function () {
  return this._isActive;
};

/**
 * Is the item visible?
 *
 * @public
 * @returns {Boolean}
 */
Item.prototype.isVisible = function () {
  return !!this._visibility && !this._visibility._isHidden;
};

/**
 * Is the item being animated to visible?
 *
 * @public
 * @returns {Boolean}
 */
Item.prototype.isShowing = function () {
  return !!(this._visibility && this._visibility._isShowing);
};

/**
 * Is the item being animated to hidden?
 *
 * @public
 * @returns {Boolean}
 */
Item.prototype.isHiding = function () {
  return !!(this._visibility && this._visibility._isHiding);
};

/**
 * Is the item positioning?
 *
 * @public
 * @returns {Boolean}
 */
Item.prototype.isPositioning = function () {
  return !!(this._layout && this._layout._isActive);
};

/**
 * Is the item being dragged (or queued for dragging)?
 *
 * @public
 * @returns {Boolean}
 */
Item.prototype.isDragging = function () {
  return !!(this._drag && this._drag._isActive);
};

/**
 * Is the item being released?
 *
 * @public
 * @returns {Boolean}
 */
Item.prototype.isReleasing = function () {
  return !!(this._dragRelease && this._dragRelease._isActive);
};

/**
 * Is the item destroyed?
 *
 * @public
 * @returns {Boolean}
 */
Item.prototype.isDestroyed = function () {
  return this._isDestroyed;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Recalculate item's dimensions.
 *
 * @private
 * @param {Boolean} [force=false]
 */
Item.prototype._refreshDimensions = function (force) {
  if (this._isDestroyed) return;
  if (force !== true && this._visibility._isHidden) return;

  var element = this._element;
  var dragPlaceholder = this._dragPlaceholder;
  var rect = element.getBoundingClientRect();

  // Calculate width and height.
  this._width = rect.width;
  this._height = rect.height;

  // Calculate margins (ignore negative margins).
  this._marginLeft = Math.max(0, getStyleAsFloat(element, 'margin-left'));
  this._marginRight = Math.max(0, getStyleAsFloat(element, 'margin-right'));
  this._marginTop = Math.max(0, getStyleAsFloat(element, 'margin-top'));
  this._marginBottom = Math.max(0, getStyleAsFloat(element, 'margin-bottom'));

  // Keep drag placeholder's dimensions synced with the item's.
  if (dragPlaceholder) dragPlaceholder.updateDimensions();
};

/**
 * Fetch and store item's sort data.
 *
 * @private
 */
Item.prototype._refreshSortData = function () {
  if (this._isDestroyed) return;

  var data = (this._sortData = {});
  var getters = this.getGrid()._settings.sortData;
  var prop;

  for (prop in getters) {
    data[prop] = getters[prop](this, this._element);
  }
};

/**
 * Add item to layout.
 *
 * @private
 */
Item.prototype._addToLayout = function (left, top) {
  if (this._isActive === true) return;
  this._isActive = true;
  this._left = left || 0;
  this._top = top || 0;
};

/**
 * Remove item from layout.
 *
 * @private
 */
Item.prototype._removeFromLayout = function () {
  if (this._isActive === false) return;
  this._isActive = false;
  this._left = 0;
  this._top = 0;
};

/**
 * Check if the layout procedure can be skipped for the item.
 *
 * @private
 * @param {Number} left
 * @param {Number} top
 * @returns {Boolean}
 */
Item.prototype._canSkipLayout = function (left, top) {
  return (
    this._left === left &&
    this._top === top &&
    !this._migrate._isActive &&
    !this._layout._skipNextAnimation &&
    !this._dragRelease.isJustReleased()
  );
};

/**
 * Set the provided left and top arguments as the item element's translate
 * values in the DOM. This method keeps track of the currently applied
 * translate values and skips the update operation if the provided values are
 * identical to the currently applied values. Returns `false` if there was no
 * need for update and `true` if the translate value was updated.
 *
 * @private
 * @param {Number} left
 * @param {Number} top
 * @returns {Boolean}
 */
Item.prototype._setTranslate = function (left, top) {
  if (this._tX === left && this._tY === top) return false;
  this._tX = left;
  this._tY = top;
  this._element.style[transformProp] = getTranslateString(left, top);
  return true;
};

/**
 * Destroy item instance.
 *
 * @private
 * @param {Boolean} [removeElement=false]
 */
Item.prototype._destroy = function (removeElement) {
  if (this._isDestroyed) return;

  var element = this._element;
  var grid = this.getGrid();
  var settings = grid._settings;

  // Destroy handlers.
  this._dragPlaceholder.destroy();
  this._dragRelease.destroy();
  this._migrate.destroy();
  this._layout.destroy();
  this._visibility.destroy();
  if (this._drag) this._drag.destroy();

  // Destroy emitter.
  this._emitter.destroy();

  // Remove item class.
  removeClass(element, settings.itemClass);

  // Remove element from DOM.
  if (removeElement) element.parentNode.removeChild(element);

  // Remove item/element pair from map.
  if (ITEM_ELEMENT_MAP) ITEM_ELEMENT_MAP.delete(element);

  // Reset state.
  this._isActive = false;
  this._isDestroyed = true;
};

export default Item;
