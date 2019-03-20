/**
 * Copyright (c) 2018-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { eventBeforeSend, eventDragReleaseEnd, eventLayoutStart } from '../shared.js';

import ItemAnimate from '../Item/ItemAnimate.js';

import addClass from '../utils/addClass.js';
import getTranslateString from '../utils/getTranslateString.js';
import getTranslate from '../utils/getTranslate.js';
import setStyles from '../utils/setStyles.js';
import removeClass from '../utils/removeClass.js';

/**
 * Drag placeholder.
 *
 * @class
 * @param {Item} item
 */
function ItemDragPlaceholder(item) {
  this._item = item;
  this._animate = new ItemAnimate();
  this._element = null;
  this._className = '';
  this._didMigrate = false;
  this._resetAfterLayout = false;

  // Bind event handlers.
  this._onLayoutStart = this._onLayoutStart.bind(this);
  this._onLayoutEnd = this._onLayoutEnd.bind(this);
  this._onReleaseEnd = this._onReleaseEnd.bind(this);
  this._onMigrate = this._onMigrate.bind(this);
}

/**
 * Private prototype methods
 * *************************
 */

/**
 * Move placeholder to a new position.
 *
 * @private
 * @memberof ItemDragPlaceholder.prototype
 */
ItemDragPlaceholder.prototype._onLayoutStart = function() {
  var item = this._item;
  var grid = item.getGrid();
  var element = this._element;
  var animation = this._animate;

  // Find out the item's new (unapplied) left and top position.
  var itemIndex = grid._items.indexOf(item);
  var nextLeft = grid._layout.slots[itemIndex * 2];
  var nextTop = grid._layout.slots[itemIndex * 2 + 1];

  // If item's position did not change we can safely skip layout.
  if (item._left === nextLeft && item._top === nextTop) {
    return;
  }

  // Slots data is calculated with item margins added to them so we need to add
  // item's left and top margin to the slot data to get the placeholder's
  // next position.
  nextLeft += item._marginLeft;
  nextTop += item._marginTop;

  // Get target styles.
  var targetStyles = { transform: getTranslateString(nextLeft, nextTop) };

  // Get placeholder's layout animation settings.
  var settings = grid._settings.dragPlaceholder;
  var animDuration = settings.duration;
  var animEasing = settings.easing;
  var animEnabled = animDuration > 0;

  // Just snap to new position without any animations if no animation is
  // required or if placeholder moves between grids.
  if (!animEnabled || this._didMigrate) {
    // Snap placeholder to correct position.
    if (animation.isAnimating()) {
      animation.stop(targetStyles);
    } else {
      setStyles(element, targetStyles);
    }

    // Move placeholder inside correct container after migration.
    if (this._didMigrate) {
      grid.getElement().appendChild(element);
      this._didMigrate = false;
    }

    return;
  }

  // If placeholder is already in correct position just let it be as is. Just
  // make sure that it's animation is stopped if running.
  var current = getTranslate(element);
  if (current.x === nextLeft && current.y === nextTop) {
    if (animation.isAnimating()) animation.stop(targetStyles);
    return;
  }

  // Animate placeholder to correct position.
  var currentStyles = { transform: getTranslateString(current.x, current.y) };
  this._animate.start(currentStyles, targetStyles, {
    duration: animDuration,
    easing: animEasing,
    onFinish: this._onLayoutEnd
  });
};

/**
 * Layout end handler.
 *
 * @private
 * @memberof ItemDragPlaceholder.prototype
 */
ItemDragPlaceholder.prototype._onLayoutEnd = function() {
  if (this._resetAfterLayout) {
    this.reset();
  }
};

/**
 * Drag end handler. This handler is called when dragReleaseEnd event is
 * emitted and receives the event data as it's argument.
 *
 * @private
 * @memberof ItemDragPlaceholder.prototype
 * @param {Item} item
 */
ItemDragPlaceholder.prototype._onReleaseEnd = function(item) {
  if (item._id === this._item._id) {
    // If the placeholder is not animating anymore we can safely reset it.
    if (!this._animate.isAnimating()) {
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
 * @memberof ItemDragPlaceholder.prototype
 * @param {Object} data
 * @param {Item} data.item
 * @param {Grid} data.fromGrid
 * @param {Number} data.fromIndex
 * @param {Grid} data.toGrid
 * @param {Number} data.toIndex
 */
ItemDragPlaceholder.prototype._onMigrate = function(data) {
  // Make sure we have a matching item.
  if (data.item !== this._item) return;

  var grid = this._item.getGrid();
  var nextGrid = data.toGrid;

  // Unbind listeners from current grid.
  grid.off(eventDragReleaseEnd, this._onReleaseEnd);
  grid.off(eventLayoutStart, this._onLayoutStart);
  grid.off(eventBeforeSend, this._onMigrate);

  // Bind listeners to the next grid.
  nextGrid.on(eventDragReleaseEnd, this._onReleaseEnd);
  nextGrid.on(eventLayoutStart, this._onLayoutStart);
  nextGrid.on(eventBeforeSend, this._onMigrate);

  // Mark the item as migrated.
  this._didMigrate = true;
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
 * @memberof ItemDragPlaceholder.prototype
 */
ItemDragPlaceholder.prototype.create = function() {
  // If we already have placeholder set up we can skip the initiation logic.
  if (this.isActive()) {
    this._resetAfterLayout = false;
    return;
  }

  var item = this._item;
  var grid = item.getGrid();
  var settings = grid._settings;
  var animation = this._animate;

  // Create placeholder element.
  var element;
  if (typeof settings.dragPlaceholder.createElement === 'function') {
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

  // Position the placeholder item correctly.
  var left = item._left + item._marginLeft;
  var top = item._top + item._marginTop;
  setStyles(element, {
    display: 'block',
    position: 'absolute',
    left: '0',
    top: '0',
    width: item._width + 'px',
    height: item._height + 'px',
    transform: getTranslateString(left, top)
  });

  // Bind event listeners.
  grid.on(eventLayoutStart, this._onLayoutStart);
  grid.on(eventDragReleaseEnd, this._onReleaseEnd);
  grid.on(eventBeforeSend, this._onMigrate);

  // onCreate hook.
  if (typeof settings.dragPlaceholder.onCreate === 'function') {
    settings.dragPlaceholder.onCreate(item, element);
  }

  // Insert the placeholder element to the grid.
  grid.getElement().appendChild(element);
};

/**
 * Reset placeholder data.
 *
 * @public
 * @memberof ItemDragPlaceholder.prototype
 */
ItemDragPlaceholder.prototype.reset = function() {
  if (!this.isActive()) return;

  var element = this._element;
  var item = this._item;
  var grid = item.getGrid();
  var settings = grid._settings;
  var animation = this._animate;

  // Reset flag.
  this._resetAfterLayout = false;

  // Reset animation instance.
  animation.stop();
  animation._element = null;

  // Unbind event listeners.
  grid.off(eventDragReleaseEnd, this._onReleaseEnd);
  grid.off(eventLayoutStart, this._onLayoutStart);
  grid.off(eventBeforeSend, this._onMigrate);

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
  if (typeof settings.dragPlaceholder.onRemove === 'function') {
    settings.dragPlaceholder.onRemove(item, element);
  }
};

/**
 * Update placeholder's dimensions.
 *
 * @public
 * @memberof ItemDragPlaceholder.prototype
 * @param {Number} width
 * @param {height} height
 */
ItemDragPlaceholder.prototype.updateDimensions = function(width, height) {
  if (this.isActive()) {
    setStyles(this._element, {
      width: width + 'px',
      height: height + 'px'
    });
  }
};

/**
 * Check if placeholder is currently active (visible).
 *
 * @public
 * @memberof ItemDragPlaceholder.prototype
 * @returns {Boolean}
 */
ItemDragPlaceholder.prototype.isActive = function() {
  return !!this._element;
};

/**
 * Destroy placeholder instance.
 *
 * @public
 * @memberof ItemDragPlaceholder.prototype
 */
ItemDragPlaceholder.prototype.destroy = function() {
  this.reset();
  this._animate.destroy();
  this._item = this._animate = null;
};

export default ItemDragPlaceholder;
