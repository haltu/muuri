/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { gridInstances } from '../shared';

import ItemAnimate from './ItemAnimate';
import ItemDrag from './ItemDrag';
import ItemDragPlaceholder from './ItemDragPlaceholder';
import ItemLayout from './ItemLayout';
import ItemMigrate from './ItemMigrate';
import ItemRelease from './ItemRelease';
import ItemVisibility from './ItemVisibility';

import addClass from '../utils/addClass';
import createUid from '../utils/createUid';
import getStyle from '../utils/getStyle';
import getStyleAsFloat from '../utils/getStyleAsFloat';
import getTranslateString from '../utils/getTranslateString';
import removeClass from '../utils/removeClass';
import { transformProp } from '../utils/supportedTransform';

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

  // Create instance id.
  this._id = createUid();

  // Reference to connected Grid instance's id.
  this._gridId = grid._id;

  // Destroyed flag.
  this._isDestroyed = false;

  // Set up initial positions.
  this._left = 0;
  this._top = 0;

  // The elements.
  this._element = element;
  this._child = element.children[0];

  // If the provided item element is not a direct child of the grid container
  // element, append it to the grid container.
  if (element.parentNode !== grid._element) {
    grid._element.appendChild(element);
  }

  // Set item class.
  addClass(element, settings.itemClass);

  // If isActive is not defined, let's try to auto-detect it.
  if (typeof isActive !== 'boolean') {
    isActive = getStyle(element, 'display') !== 'none';
  }

  // Set up active state (defines if the item is considered part of the layout
  // or not).
  this._isActive = isActive;

  // Set element's initial position styles.
  element.style.left = '0';
  element.style.top = '0';
  element.style[transformProp] = getTranslateString(0, 0);

  // Initiate item's animation controllers.
  this._animate = new ItemAnimate(element);
  this._animateChild = new ItemAnimate(this._child);

  // Setup visibility handler.
  this._visibility = new ItemVisibility(this);

  // Set up layout handler.
  this._layout = new ItemLayout(this);

  // Set up migration handler data.
  this._migrate = new ItemMigrate(this);

  // Set up release handler. Note that although this is fully linked to dragging
  // this still needs to be always instantiated to handle migration scenarios
  // correctly.
  this._release = new ItemRelease(this);

  // Set up drag placeholder handler. Note that although this is fully linked to
  // dragging this still needs to be always instantiated to handle migration
  // scenarios correctly.
  this._dragPlaceholder = new ItemDragPlaceholder(this);

  // Set up drag handler.
  this._drag = settings.dragEnabled ? new ItemDrag(this) : null;

  // Set up the initial dimensions and sort data.
  this._refreshDimensions();
  this._refreshSortData();
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Get the instance grid reference.
 *
 * @public
 * @memberof Item.prototype
 * @returns {Grid}
 */
Item.prototype.getGrid = function() {
  return gridInstances[this._gridId];
};

/**
 * Get the instance element.
 *
 * @public
 * @memberof Item.prototype
 * @returns {HTMLElement}
 */
Item.prototype.getElement = function() {
  return this._element;
};

/**
 * Get instance element's cached width.
 *
 * @public
 * @memberof Item.prototype
 * @returns {Number}
 */
Item.prototype.getWidth = function() {
  return this._width;
};

/**
 * Get instance element's cached height.
 *
 * @public
 * @memberof Item.prototype
 * @returns {Number}
 */
Item.prototype.getHeight = function() {
  return this._height;
};

/**
 * Get instance element's cached margins.
 *
 * @public
 * @memberof Item.prototype
 * @returns {Object}
 *   - The returned object contains left, right, top and bottom properties
 *     which indicate the item element's cached margins.
 */
Item.prototype.getMargin = function() {
  return {
    left: this._marginLeft,
    right: this._marginRight,
    top: this._marginTop,
    bottom: this._marginBottom
  };
};

/**
 * Get instance element's cached position.
 *
 * @public
 * @memberof Item.prototype
 * @returns {Object}
 *   - The returned object contains left and top properties which indicate the
 *     item element's cached position in the grid.
 */
Item.prototype.getPosition = function() {
  return {
    left: this._left,
    top: this._top
  };
};

/**
 * Is the item active?
 *
 * @public
 * @memberof Item.prototype
 * @returns {Boolean}
 */
Item.prototype.isActive = function() {
  return this._isActive;
};

/**
 * Is the item visible?
 *
 * @public
 * @memberof Item.prototype
 * @returns {Boolean}
 */
Item.prototype.isVisible = function() {
  return !!this._visibility && !this._visibility._isHidden;
};

/**
 * Is the item being animated to visible?
 *
 * @public
 * @memberof Item.prototype
 * @returns {Boolean}
 */
Item.prototype.isShowing = function() {
  return !!(this._visibility && this._visibility._isShowing);
};

/**
 * Is the item being animated to hidden?
 *
 * @public
 * @memberof Item.prototype
 * @returns {Boolean}
 */
Item.prototype.isHiding = function() {
  return !!(this._visibility && this._visibility._isHiding);
};

/**
 * Is the item positioning?
 *
 * @public
 * @memberof Item.prototype
 * @returns {Boolean}
 */
Item.prototype.isPositioning = function() {
  return !!(this._layout && this._layout._isActive);
};

/**
 * Is the item being dragged?
 *
 * @public
 * @memberof Item.prototype
 * @returns {Boolean}
 */
Item.prototype.isDragging = function() {
  return !!(this._drag && this._drag._isActive);
};

/**
 * Is the item being released?
 *
 * @public
 * @memberof Item.prototype
 * @returns {Boolean}
 */
Item.prototype.isReleasing = function() {
  return !!(this._release && this._release._isActive);
};

/**
 * Is the item destroyed?
 *
 * @public
 * @memberof Item.prototype
 * @returns {Boolean}
 */
Item.prototype.isDestroyed = function() {
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
 * @memberof Item.prototype
 */
Item.prototype._refreshDimensions = function() {
  if (this._isDestroyed || this._visibility._isHidden) return;

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
  if (dragPlaceholder) {
    dragPlaceholder.updateDimensions(this._width, this._height);
  }
};

/**
 * Fetch and store item's sort data.
 *
 * @private
 * @memberof Item.prototype
 */
Item.prototype._refreshSortData = function() {
  if (this._isDestroyed) return;

  var data = (this._sortData = {});
  var getters = this.getGrid()._settings.sortData;
  var prop;

  for (prop in getters) {
    data[prop] = getters[prop](this, this._element);
  }
};

/**
 * Destroy item instance.
 *
 * @private
 * @memberof Item.prototype
 * @param {Boolean} [removeElement=false]
 */
Item.prototype._destroy = function(removeElement) {
  if (this._isDestroyed) return;

  var element = this._element;
  var grid = this.getGrid();
  var settings = grid._settings;
  var index = grid._items.indexOf(this);

  // Destroy handlers.
  this._release.destroy();
  this._migrate.destroy();
  this._layout.destroy();
  this._visibility.destroy();
  this._animate.destroy();
  this._animateChild.destroy();
  this._dragPlaceholder.destroy();
  this._drag && this._drag.destroy();

  // Remove all inline styles.
  element.removeAttribute('style');
  this._child.removeAttribute('style');

  // Remove item class.
  removeClass(element, settings.itemClass);

  // Remove item from Grid instance if it still exists there.
  index > -1 && grid._items.splice(index, 1);

  // Remove element from DOM.
  removeElement && element.parentNode.removeChild(element);

  // Reset state.
  this._isActive = false;
  this._isDestroyed = true;
};

export default Item;
