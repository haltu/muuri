/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { addVisibilityTick, cancelVisibilityTick } from '../ticker';

import Animator from '../Animator/Animator';

import addClass from '../utils/addClass';
import getCurrentStyles from '../utils/getCurrentStyles';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import setStyles from '../utils/setStyles';

/**
 * Visibility manager for Item instance, handles visibility of an item.
 *
 * @class
 * @param {Item} item
 */
function ItemVisibility(item) {
  var isActive = item._isActive;
  var element = item._element;
  var childElement = element.children[0];
  var settings = item.getGrid()._settings;

  if (!childElement) {
    throw new Error('No valid child element found within item element.');
  }

  this._item = item;
  this._isDestroyed = false;
  this._isHidden = !isActive;
  this._isHiding = false;
  this._isShowing = false;
  this._childElement = childElement;
  this._currentStyleProps = [];
  this._animation = new Animator(childElement);
  this._queue = 'visibility-' + item._id;
  this._finishShow = this._finishShow.bind(this);
  this._finishHide = this._finishHide.bind(this);

  element.style.display = isActive ? '' : 'none';
  addClass(element, isActive ? settings.itemVisibleClass : settings.itemHiddenClass);
  this.setStyles(isActive ? settings.visibleStyles : settings.hiddenStyles);
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Show item.
 *
 * @public
 * @param {Boolean} instant
 * @param {Function} [onFinish]
 */
ItemVisibility.prototype.show = function (instant, onFinish) {
  if (this._isDestroyed) return;

  var item = this._item;
  var element = item._element;
  var callback = isFunction(onFinish) ? onFinish : null;
  var grid = item.getGrid();
  var settings = grid._settings;

  // If item is visible call the callback and be done with it.
  if (!this._isShowing && !this._isHidden) {
    callback && callback(false, item);
    return;
  }

  // If item is showing and does not need to be shown instantly, let's just
  // push callback to the callback queue and be done with it.
  if (this._isShowing && !instant) {
    callback && item._emitter.on(this._queue, callback);
    return;
  }

  // If the item is hiding or hidden process the current visibility callback
  // queue with the interrupted flag active, update classes and set display
  // to block if necessary.
  if (!this._isShowing) {
    item._emitter.burst(this._queue, true, item);
    removeClass(element, settings.itemHiddenClass);
    addClass(element, settings.itemVisibleClass);
    if (!this._isHiding) element.style.display = '';
  }

  // Push callback to the callback queue.
  callback && item._emitter.on(this._queue, callback);

  // Update visibility states.
  this._isShowing = true;
  this._isHiding = this._isHidden = false;

  // Finally let's start show animation.
  this._startAnimation(true, instant, this._finishShow);
};

/**
 * Hide item.
 *
 * @public
 * @param {Boolean} instant
 * @param {Function} [onFinish]
 */
ItemVisibility.prototype.hide = function (instant, onFinish) {
  if (this._isDestroyed) return;

  var item = this._item;
  var element = item._element;
  var callback = isFunction(onFinish) ? onFinish : null;
  var grid = item.getGrid();
  var settings = grid._settings;

  // If item is already hidden call the callback and be done with it.
  if (!this._isHiding && this._isHidden) {
    callback && callback(false, item);
    return;
  }

  // If item is hiding and does not need to be hidden instantly, let's just
  // push callback to the callback queue and be done with it.
  if (this._isHiding && !instant) {
    callback && item._emitter.on(this._queue, callback);
    return;
  }

  // If the item is showing or visible process the current visibility callback
  // queue with the interrupted flag active, update classes and set display
  // to block if necessary.
  if (!this._isHiding) {
    item._emitter.burst(this._queue, true, item);
    addClass(element, settings.itemHiddenClass);
    removeClass(element, settings.itemVisibleClass);
  }

  // Push callback to the callback queue.
  callback && item._emitter.on(this._queue, callback);

  // Update visibility states.
  this._isHidden = this._isHiding = true;
  this._isShowing = false;

  // Finally let's start hide animation.
  this._startAnimation(false, instant, this._finishHide);
};

/**
 * Stop current hiding/showing process.
 *
 * @public
 * @param {Boolean} processCallbackQueue
 */
ItemVisibility.prototype.stop = function (processCallbackQueue) {
  if (this._isDestroyed) return;
  if (!this._isHiding && !this._isShowing) return;

  var item = this._item;

  cancelVisibilityTick(item._id);
  this._animation.stop();
  if (processCallbackQueue) {
    item._emitter.burst(this._queue, true, item);
  }
};

/**
 * Reset all existing visibility styles and apply new visibility styles to the
 * visibility element. This method should be used to set styles when there is a
 * chance that the current style properties differ from the new ones (basically
 * on init and on migrations).
 *
 * @public
 * @param {Object} styles
 */
ItemVisibility.prototype.setStyles = function (styles) {
  var childElement = this._childElement;
  var currentStyleProps = this._currentStyleProps;
  this._removeCurrentStyles();
  for (var prop in styles) {
    currentStyleProps.push(prop);
    childElement.style[prop] = styles[prop];
  }
};

/**
 * Destroy the instance and stop current animation if it is running.
 *
 * @public
 */
ItemVisibility.prototype.destroy = function () {
  if (this._isDestroyed) return;

  var item = this._item;
  var element = item._element;
  var grid = item.getGrid();
  var settings = grid._settings;

  this.stop(true);
  item._emitter.clear(this._queue);
  this._animation.destroy();
  this._removeCurrentStyles();
  removeClass(element, settings.itemVisibleClass);
  removeClass(element, settings.itemHiddenClass);
  element.style.display = '';

  // Reset state.
  this._isHiding = this._isShowing = false;
  this._isDestroyed = this._isHidden = true;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Start visibility animation.
 *
 * @private
 * @param {Boolean} toVisible
 * @param {Boolean} [instant]
 * @param {Function} [onFinish]
 */
ItemVisibility.prototype._startAnimation = function (toVisible, instant, onFinish) {
  if (this._isDestroyed) return;

  var item = this._item;
  var animation = this._animation;
  var childElement = this._childElement;
  var settings = item.getGrid()._settings;
  var targetStyles = toVisible ? settings.visibleStyles : settings.hiddenStyles;
  var duration = toVisible ? settings.showDuration : settings.hideDuration;
  var easing = toVisible ? settings.showEasing : settings.hideEasing;
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
    setStyles(childElement, targetStyles);
    animation.stop();
    onFinish && onFinish();
    return;
  }

  // Let's make sure an ongoing animation's callback is cancelled before going
  // further. Without this there's a chance that the animation will finish
  // before the next tick and mess up our logic.
  if (animation.isAnimating()) {
    animation._animation.onfinish = null;
  }

  // Start the animation in the next tick (to avoid layout thrashing).
  addVisibilityTick(
    item._id,
    function () {
      currentStyles = getCurrentStyles(childElement, targetStyles);
    },
    function () {
      animation.start(currentStyles, targetStyles, {
        duration: duration,
        easing: easing,
        onFinish: onFinish,
      });
    }
  );
};

/**
 * Finish show procedure.
 *
 * @private
 */
ItemVisibility.prototype._finishShow = function () {
  if (this._isHidden) return;
  this._isShowing = false;
  this._item._emitter.burst(this._queue, false, this._item);
};

/**
 * Finish hide procedure.
 *
 * @private
 */
ItemVisibility.prototype._finishHide = function () {
  if (!this._isHidden) return;
  var item = this._item;
  this._isHiding = false;
  item._layout.stop(true, 0, 0);
  item._element.style.display = 'none';
  item._emitter.burst(this._queue, false, item);
};

/**
 * Remove currently applied visibility related inline style properties.
 *
 * @private
 */
ItemVisibility.prototype._removeCurrentStyles = function () {
  var childElement = this._childElement;
  var currentStyleProps = this._currentStyleProps;

  for (var i = 0; i < currentStyleProps.length; i++) {
    childElement.style[currentStyleProps[i]] = '';
  }

  currentStyleProps.length = 0;
};

export default ItemVisibility;
