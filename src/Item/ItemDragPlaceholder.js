/**
 * Copyright (c) 2018-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import {
  addPlaceholderLayoutTick,
  cancelPlaceholderLayoutTick,
  addPlaceholderResizeTick,
  cancelPlaceholderResizeTick,
} from '../ticker';

import {
  EVENT_BEFORE_SEND,
  EVENT_DRAG_RELEASE_END,
  EVENT_LAYOUT_START,
  EVENT_HIDE_START,
} from '../constants';

import Animator from '../Animator/Animator';

import addClass from '../utils/addClass';
import getTranslateString from '../utils/getTranslateString';
import getTranslate from '../utils/getTranslate';
import isFunction from '../utils/isFunction';
import setStyles from '../utils/setStyles';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

/**
 * Drag placeholder.
 *
 * @class
 * @param {Item} item
 */
function ItemDragPlaceholder(item) {
  this._item = item;
  this._animation = new Animator();
  this._element = null;
  this._className = '';
  this._didMigrate = false;
  this._resetAfterLayout = false;
  this._left = 0;
  this._top = 0;
  this._transX = 0;
  this._transY = 0;
  this._nextTransX = 0;
  this._nextTransY = 0;

  // Bind animation handlers.
  this._setupAnimation = this._setupAnimation.bind(this);
  this._startAnimation = this._startAnimation.bind(this);
  this._updateDimensions = this._updateDimensions.bind(this);

  // Bind event handlers.
  this._onLayoutStart = this._onLayoutStart.bind(this);
  this._onLayoutEnd = this._onLayoutEnd.bind(this);
  this._onReleaseEnd = this._onReleaseEnd.bind(this);
  this._onMigrate = this._onMigrate.bind(this);
  this._onHide = this._onHide.bind(this);
}

/**
 * Private prototype methods
 * *************************
 */

/**
 * Update placeholder's dimensions to match the item's dimensions.
 *
 * @private
 */
ItemDragPlaceholder.prototype._updateDimensions = function () {
  if (!this.isActive()) return;
  setStyles(this._element, {
    width: this._item._width + 'px',
    height: this._item._height + 'px',
  });
};

/**
 * Move placeholder to a new position.
 *
 * @private
 * @param {Item[]} items
 * @param {Boolean} isInstant
 */
ItemDragPlaceholder.prototype._onLayoutStart = function (items, isInstant) {
  var item = this._item;

  // If the item is not part of the layout anymore reset placeholder.
  if (items.indexOf(item) === -1) {
    this.reset();
    return;
  }

  var nextLeft = item._left;
  var nextTop = item._top;
  var currentLeft = this._left;
  var currentTop = this._top;

  // Keep track of item layout position.
  this._left = nextLeft;
  this._top = nextTop;

  // If item's position did not change, and the item did not migrate and the
  // layout is not instant and we can safely skip layout.
  if (!isInstant && !this._didMigrate && currentLeft === nextLeft && currentTop === nextTop) {
    return;
  }

  // Slots data is calculated with item margins added to them so we need to add
  // item's left and top margin to the slot data to get the placeholder's
  // next position.
  var nextX = nextLeft + item._marginLeft;
  var nextY = nextTop + item._marginTop;

  // Just snap to new position without any animations if no animation is
  // required or if placeholder moves between grids.
  var grid = item.getGrid();
  var animEnabled = !isInstant && grid._settings.layoutDuration > 0;
  if (!animEnabled || this._didMigrate) {
    // Cancel potential (queued) layout tick.
    cancelPlaceholderLayoutTick(item._id);

    // Snap placeholder to correct position.
    this._element.style[transformProp] = getTranslateString(nextX, nextY);
    this._animation.stop();

    // Move placeholder inside correct container after migration.
    if (this._didMigrate) {
      grid.getElement().appendChild(this._element);
      this._didMigrate = false;
    }

    return;
  }

  // Start the placeholder's layout animation in the next tick. We do this to
  // avoid layout thrashing.
  this._nextTransX = nextX;
  this._nextTransY = nextY;
  addPlaceholderLayoutTick(item._id, this._setupAnimation, this._startAnimation);
};

/**
 * Prepare placeholder for layout animation.
 *
 * @private
 */
ItemDragPlaceholder.prototype._setupAnimation = function () {
  if (!this.isActive()) return;

  var translate = getTranslate(this._element);
  this._transX = translate.x;
  this._transY = translate.y;
};

/**
 * Start layout animation.
 *
 * @private
 */
ItemDragPlaceholder.prototype._startAnimation = function () {
  if (!this.isActive()) return;

  var animation = this._animation;
  var currentX = this._transX;
  var currentY = this._transY;
  var nextX = this._nextTransX;
  var nextY = this._nextTransY;

  // If placeholder is already in correct position let's just stop animation
  // and be done with it.
  if (currentX === nextX && currentY === nextY) {
    if (animation.isAnimating()) {
      this._element.style[transformProp] = getTranslateString(nextX, nextY);
      animation.stop();
    }
    return;
  }

  // Otherwise let's start the animation.
  var settings = this._item.getGrid()._settings;
  var currentStyles = {};
  var targetStyles = {};
  currentStyles[transformProp] = getTranslateString(currentX, currentY);
  targetStyles[transformProp] = getTranslateString(nextX, nextY);
  animation.start(currentStyles, targetStyles, {
    duration: settings.layoutDuration,
    easing: settings.layoutEasing,
    onFinish: this._onLayoutEnd,
  });
};

/**
 * Layout end handler.
 *
 * @private
 */
ItemDragPlaceholder.prototype._onLayoutEnd = function () {
  if (this._resetAfterLayout) {
    this.reset();
  }
};

/**
 * Drag end handler. This handler is called when dragReleaseEnd event is
 * emitted and receives the event data as it's argument.
 *
 * @private
 * @param {Item} item
 */
ItemDragPlaceholder.prototype._onReleaseEnd = function (item) {
  if (item._id === this._item._id) {
    // If the placeholder is not animating anymore we can safely reset it.
    if (!this._animation.isAnimating()) {
      this.reset();
      return;
    }

    // If the placeholder item is still animating here, let's wait for it to
    // finish it's animation.
    this._resetAfterLayout = true;
  }
};

/**
 * Migration start handler. This handler is called when beforeSend event is
 * emitted and receives the event data as it's argument.
 *
 * @private
 * @param {Object} data
 * @param {Item} data.item
 * @param {Grid} data.fromGrid
 * @param {Number} data.fromIndex
 * @param {Grid} data.toGrid
 * @param {Number} data.toIndex
 */
ItemDragPlaceholder.prototype._onMigrate = function (data) {
  // Make sure we have a matching item.
  if (data.item !== this._item) return;

  var grid = this._item.getGrid();
  var nextGrid = data.toGrid;

  // Unbind listeners from current grid.
  grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
  grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
  grid.off(EVENT_BEFORE_SEND, this._onMigrate);
  grid.off(EVENT_HIDE_START, this._onHide);

  // Bind listeners to the next grid.
  nextGrid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
  nextGrid.on(EVENT_LAYOUT_START, this._onLayoutStart);
  nextGrid.on(EVENT_BEFORE_SEND, this._onMigrate);
  nextGrid.on(EVENT_HIDE_START, this._onHide);

  // Mark the item as migrated.
  this._didMigrate = true;
};

/**
 * Reset placeholder if the associated item is hidden.
 *
 * @private
 * @param {Item[]} items
 */
ItemDragPlaceholder.prototype._onHide = function (items) {
  if (items.indexOf(this._item) > -1) this.reset();
};

/**
 * Public prototype methods
 * ************************
 */

/**
 * Create placeholder. Note that this method only writes to DOM and does not
 * read anything from DOM so it should not cause any additional layout
 * thrashing when it's called at the end of the drag start procedure.
 *
 * @public
 */
ItemDragPlaceholder.prototype.create = function () {
  // If we already have placeholder set up we can skip the initiation logic.
  if (this.isActive()) {
    this._resetAfterLayout = false;
    return;
  }

  var item = this._item;
  var grid = item.getGrid();
  var settings = grid._settings;
  var animation = this._animation;

  // Keep track of layout position.
  this._left = item._left;
  this._top = item._top;

  // Create placeholder element.
  var element;
  if (isFunction(settings.dragPlaceholder.createElement)) {
    element = settings.dragPlaceholder.createElement(item);
  } else {
    element = document.createElement('div');
  }
  this._element = element;

  // Update element to animation instance.
  animation._element = element;

  // Add placeholder class to the placeholder element.
  this._className = settings.itemPlaceholderClass || '';
  if (this._className) {
    addClass(element, this._className);
  }

  // Set initial styles.
  setStyles(element, {
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: item._width + 'px',
    height: item._height + 'px',
  });

  // Set initial position.
  element.style[transformProp] = getTranslateString(
    item._left + item._marginLeft,
    item._top + item._marginTop
  );

  // Bind event listeners.
  grid.on(EVENT_LAYOUT_START, this._onLayoutStart);
  grid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
  grid.on(EVENT_BEFORE_SEND, this._onMigrate);
  grid.on(EVENT_HIDE_START, this._onHide);

  // onCreate hook.
  if (isFunction(settings.dragPlaceholder.onCreate)) {
    settings.dragPlaceholder.onCreate(item, element);
  }

  // Insert the placeholder element to the grid.
  grid.getElement().appendChild(element);
};

/**
 * Reset placeholder data.
 *
 * @public
 */
ItemDragPlaceholder.prototype.reset = function () {
  if (!this.isActive()) return;

  var element = this._element;
  var item = this._item;
  var grid = item.getGrid();
  var settings = grid._settings;
  var animation = this._animation;

  // Reset flag.
  this._resetAfterLayout = false;

  // Cancel potential (queued) layout tick.
  cancelPlaceholderLayoutTick(item._id);
  cancelPlaceholderResizeTick(item._id);

  // Reset animation instance.
  animation.stop();
  animation._element = null;

  // Unbind event listeners.
  grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
  grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
  grid.off(EVENT_BEFORE_SEND, this._onMigrate);
  grid.off(EVENT_HIDE_START, this._onHide);

  // Remove placeholder class from the placeholder element.
  if (this._className) {
    removeClass(element, this._className);
    this._className = '';
  }

  // Remove element.
  element.parentNode.removeChild(element);
  this._element = null;

  // onRemove hook. Note that here we use the current grid's onRemove callback
  // so if the item has migrated during drag the onRemove method will not be
  // the originating grid's method.
  if (isFunction(settings.dragPlaceholder.onRemove)) {
    settings.dragPlaceholder.onRemove(item, element);
  }
};

/**
 * Check if placeholder is currently active (visible).
 *
 * @public
 * @returns {Boolean}
 */
ItemDragPlaceholder.prototype.isActive = function () {
  return !!this._element;
};

/**
 * Get placeholder element.
 *
 * @public
 * @returns {?HTMLElement}
 */
ItemDragPlaceholder.prototype.getElement = function () {
  return this._element;
};

/**
 * Update placeholder's dimensions to match the item's dimensions. Note that
 * the updating is done asynchronously in the next tick to avoid layout
 * thrashing.
 *
 * @public
 */
ItemDragPlaceholder.prototype.updateDimensions = function () {
  if (!this.isActive()) return;
  addPlaceholderResizeTick(this._item._id, this._updateDimensions);
};

/**
 * Destroy placeholder instance.
 *
 * @public
 */
ItemDragPlaceholder.prototype.destroy = function () {
  this.reset();
  this._animation.destroy();
  this._item = this._animation = null;
};

export default ItemDragPlaceholder;
