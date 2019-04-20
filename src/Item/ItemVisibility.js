/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { addVisibilityTick, cancelVisibilityTick } from '../ticker';

import Queue from '../Queue/Queue';

import addClass from '../utils/addClass';
import getCurrentStyles from '../utils/getCurrentStyles';
import getTranslateString from '../utils/getTranslateString';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import setStyles from '../utils/setStyles';

/**
 * Visibility manager for Item instance.
 *
 * @class
 * @param {Item} item
 */
function ItemVisibility(item) {
  var isActive = item._isActive;
  var element = item._element;
  var settings = item.getGrid()._settings;

  this._item = item;
  this._isDestroyed = false;

  // Set up visibility states.
  this._isHidden = !isActive;
  this._isHiding = false;
  this._isShowing = false;

  // Callback queue.
  this._queue = new Queue();

  // Bind show/hide finishers.
  this._finishShow = this._finishShow.bind(this);
  this._finishHide = this._finishHide.bind(this);

  // Force item to be either visible or hidden on init.
  element.style.display = isActive ? 'block' : 'none';

  // Set visible/hidden class.
  addClass(element, isActive ? settings.itemVisibleClass : settings.itemHiddenClass);

  // Set initial styles for the child element.
  setStyles(item._child, isActive ? settings.visibleStyles : settings.hiddenStyles);
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Show item.
 *
 * @public
 * @memberof ItemVisibility.prototype
 * @param {Boolean} instant
 * @param {Function} [onFinish]
 * @returns {ItemVisibility}
 */
ItemVisibility.prototype.show = function(instant, onFinish) {
  if (this._isDestroyed) return this;

  var item = this._item;
  var element = item._element;
  var queue = this._queue;
  var callback = isFunction(onFinish) ? onFinish : null;
  var grid = item.getGrid();
  var settings = grid._settings;

  // If item is visible call the callback and be done with it.
  if (!this._isShowing && !this._isHidden) {
    callback && callback(false, item);
    return this;
  }

  // If item is showing and does not need to be shown instantly, let's just
  // push callback to the callback queue and be done with it.
  if (this._isShowing && !instant) {
    callback && queue.add(callback);
    return this;
  }

  // If the item is hiding or hidden process the current visibility callback
  // queue with the interrupted flag active, update classes and set display
  // to block if necessary.
  if (!this._isShowing) {
    queue.flush(true, item);
    removeClass(element, settings.itemHiddenClass);
    addClass(element, settings.itemVisibleClass);
    if (!this._isHiding) element.style.display = 'block';
  }

  // Push callback to the callback queue.
  callback && queue.add(callback);

  // Update visibility states.
  item._isActive = this._isShowing = true;
  this._isHiding = this._isHidden = false;

  // Finally let's start show animation.
  this._startAnimation(true, instant, this._finishShow);

  return this;
};

/**
 * Hide item.
 *
 * @public
 * @memberof ItemVisibility.prototype
 * @param {Boolean} instant
 * @param {Function} [onFinish]
 * @returns {ItemVisibility}
 */
ItemVisibility.prototype.hide = function(instant, onFinish) {
  if (this._isDestroyed) return this;

  var item = this._item;
  var element = item._element;
  var queue = this._queue;
  var callback = isFunction(onFinish) ? onFinish : null;
  var grid = item.getGrid();
  var settings = grid._settings;

  // If item is already hidden call the callback and be done with it.
  if (!this._isHiding && this._isHidden) {
    callback && callback(false, item);
    return this;
  }

  // If item is hiding and does not need to be hidden instantly, let's just
  // push callback to the callback queue and be done with it.
  if (this._isHiding && !instant) {
    callback && queue.add(callback);
    return this;
  }

  // If the item is showing or visible process the current visibility callback
  // queue with the interrupted flag active, update classes and set display
  // to block if necessary.
  if (!this._isHiding) {
    queue.flush(true, item);
    addClass(element, settings.itemHiddenClass);
    removeClass(element, settings.itemVisibleClass);
  }

  // Push callback to the callback queue.
  callback && queue.add(callback);

  // Update visibility states.
  this._isHidden = this._isHiding = true;
  item._isActive = this._isShowing = false;

  // Finally let's start hide animation.
  this._startAnimation(false, instant, this._finishHide);

  return this;
};

/**
 * Destroy the instance and stop current animation if it is running.
 *
 * @public
 * @memberof ItemVisibility.prototype
 * @returns {ItemVisibility}
 */
ItemVisibility.prototype.destroy = function() {
  if (this._isDestroyed) return this;

  var item = this._item;
  var element = item._element;
  var grid = item.getGrid();
  var queue = this._queue;
  var settings = grid._settings;

  // Stop visibility animation.
  this._stopAnimation({});

  // Fire all uncompleted callbacks with interrupted flag and destroy the queue.
  queue.flush(true, item).destroy();

  // Remove visible/hidden classes.
  removeClass(element, settings.itemVisibleClass);
  removeClass(element, settings.itemHiddenClass);

  // Reset state.
  this._item = null;
  this._isHiding = this._isShowing = false;
  this._isDestroyed = this._isHidden = true;

  return this;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Start visibility animation.
 *
 * @private
 * @memberof ItemVisibility.prototype
 * @param {Boolean} toVisible
 * @param {Boolean} [instant]
 * @param {Function} [onFinish]
 */
ItemVisibility.prototype._startAnimation = function(toVisible, instant, onFinish) {
  if (this._isDestroyed) return;

  var item = this._item;
  var settings = item.getGrid()._settings;
  var targetStyles = toVisible ? settings.visibleStyles : settings.hiddenStyles;
  var duration = parseInt(toVisible ? settings.showDuration : settings.hideDuration) || 0;
  var easing = (toVisible ? settings.showEasing : settings.hideEasing) || 'ease';
  var isInstant = instant || duration <= 0;
  var currentStyles;

  // No target styles? Let's quit early.
  if (!targetStyles) {
    onFinish && onFinish();
    return;
  }

  // Cancel queued visibility tick.
  cancelVisibilityTick(item._id);

  // If we need to apply the styles instantly without animation.
  if (isInstant) {
    if (item._animateChild.isAnimating()) {
      item._animateChild.stop(targetStyles);
    } else {
      setStyles(item._child, targetStyles);
    }
    onFinish && onFinish();
    return;
  }

  // Start the animation in the next tick (to avoid layout thrashing).
  addVisibilityTick(
    item._id,
    function() {
      currentStyles = getCurrentStyles(item._child, targetStyles);
    },
    function() {
      item._animateChild.start(currentStyles, targetStyles, {
        duration: duration,
        easing: easing,
        onFinish: onFinish
      });
    }
  );
};

/**
 * Stop visibility animation.
 *
 * @private
 * @memberof ItemVisibility.prototype
 * @param {Object} [targetStyles]
 */
ItemVisibility.prototype._stopAnimation = function(targetStyles) {
  if (this._isDestroyed) return;
  var item = this._item;
  cancelVisibilityTick(item._id);
  item._animateChild.stop(targetStyles);
};

/**
 * Finish show procedure.
 *
 * @private
 * @memberof ItemVisibility.prototype
 */
ItemVisibility.prototype._finishShow = function() {
  if (this._isHidden) return;
  this._isShowing = false;
  this._queue.flush(false, this._item);
};

/**
 * Finish hide procedure.
 *
 * @private
 * @memberof ItemVisibility.prototype
 */
var finishStyles = {};
ItemVisibility.prototype._finishHide = function() {
  if (!this._isHidden) return;
  var item = this._item;
  this._isHiding = false;
  finishStyles.transform = getTranslateString(0, 0);
  item._layout.stop(true, finishStyles);
  item._element.style.display = 'none';
  this._queue.flush(false, item);
};

export default ItemVisibility;
