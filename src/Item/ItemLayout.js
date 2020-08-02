/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { addLayoutTick, cancelLayoutTick } from '../ticker';

import Animator from '../Animator/Animator';

import addClass from '../utils/addClass';
import getTranslate from '../utils/getTranslate';
import getTranslateString from '../utils/getTranslateString';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

var MIN_ANIMATION_DISTANCE = 2;

/**
 * Layout manager for Item instance, handles the positioning of an item.
 *
 * @class
 * @param {Item} item
 */
function ItemLayout(item) {
  var element = item._element;
  var elementStyle = element.style;

  this._item = item;
  this._isActive = false;
  this._isDestroyed = false;
  this._isInterrupted = false;
  this._currentStyles = {};
  this._targetStyles = {};
  this._nextLeft = 0;
  this._nextTop = 0;
  this._offsetLeft = 0;
  this._offsetTop = 0;
  this._skipNextAnimation = false;
  this._animOptions = {
    onFinish: this._finish.bind(this),
    duration: 0,
    easing: 0,
  };

  // Set element's initial position styles.
  elementStyle.left = '0px';
  elementStyle.top = '0px';
  item._setTranslate(0, 0);

  this._animation = new Animator(element);
  this._queue = 'layout-' + item._id;

  // Bind animation handlers and finish method.
  this._setupAnimation = this._setupAnimation.bind(this);
  this._startAnimation = this._startAnimation.bind(this);
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Start item layout based on it's current data.
 *
 * @public
 * @param {Boolean} instant
 * @param {Function} [onFinish]
 */
ItemLayout.prototype.start = function (instant, onFinish) {
  if (this._isDestroyed) return;

  var item = this._item;
  var release = item._dragRelease;
  var gridSettings = item.getGrid()._settings;
  var isPositioning = this._isActive;
  var isJustReleased = release.isJustReleased();
  var animDuration = isJustReleased
    ? gridSettings.dragRelease.duration
    : gridSettings.layoutDuration;
  var animEasing = isJustReleased ? gridSettings.dragRelease.easing : gridSettings.layoutEasing;
  var animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;

  // If the item is currently positioning cancel potential queued layout tick
  // and process current layout callback queue with interrupted flag on.
  if (isPositioning) {
    cancelLayoutTick(item._id);
    item._emitter.burst(this._queue, true, item);
  }

  // Mark release positioning as started.
  if (isJustReleased) release._isPositioningStarted = true;

  // Push the callback to the callback queue.
  if (isFunction(onFinish)) {
    item._emitter.on(this._queue, onFinish);
  }

  // Reset animation skipping flag.
  this._skipNextAnimation = false;

  // If no animations are needed, easy peasy!
  if (!animEnabled) {
    this._updateOffsets();
    item._setTranslate(this._nextLeft, this._nextTop);
    this._animation.stop();
    this._finish();
    return;
  }

  // Let's make sure an ongoing animation's callback is cancelled before going
  // further. Without this there's a chance that the animation will finish
  // before the next tick and mess up our logic.
  if (this._animation.isAnimating()) {
    this._animation._animation.onfinish = null;
  }

  // Kick off animation to be started in the next tick.
  this._isActive = true;
  this._animOptions.easing = animEasing;
  this._animOptions.duration = animDuration;
  this._isInterrupted = isPositioning;
  addLayoutTick(item._id, this._setupAnimation, this._startAnimation);
};

/**
 * Stop item's position animation if it is currently animating.
 *
 * @public
 * @param {Boolean} processCallbackQueue
 * @param {Number} [left]
 * @param {Number} [top]
 */
ItemLayout.prototype.stop = function (processCallbackQueue, left, top) {
  if (this._isDestroyed || !this._isActive) return;

  var item = this._item;

  // Cancel animation init.
  cancelLayoutTick(item._id);

  // Stop animation.
  if (this._animation.isAnimating()) {
    if (left === undefined || top === undefined) {
      var translate = getTranslate(item._element);
      left = translate.x;
      top = translate.y;
    }
    item._setTranslate(left, top);
    this._animation.stop();
  }

  // Remove positioning class.
  removeClass(item._element, item.getGrid()._settings.itemPositioningClass);

  // Reset active state.
  this._isActive = false;

  // Process callback queue if needed.
  if (processCallbackQueue) {
    item._emitter.burst(this._queue, true, item);
  }
};

/**
 * Destroy the instance and stop current animation if it is running.
 *
 * @public
 */
ItemLayout.prototype.destroy = function () {
  if (this._isDestroyed) return;

  var elementStyle = this._item._element.style;

  this.stop(true, 0, 0);
  this._item._emitter.clear(this._queue);
  this._animation.destroy();

  elementStyle[transformProp] = '';
  elementStyle.left = '';
  elementStyle.top = '';

  this._item = null;
  this._currentStyles = null;
  this._targetStyles = null;
  this._animOptions = null;
  this._isDestroyed = true;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Calculate and update item's current layout offset data.
 *
 * @private
 */
ItemLayout.prototype._updateOffsets = function () {
  if (this._isDestroyed) return;

  var item = this._item;
  var migrate = item._migrate;
  var release = item._dragRelease;

  this._offsetLeft = release._isActive
    ? release._containerDiffX
    : migrate._isActive
    ? migrate._containerDiffX
    : 0;

  this._offsetTop = release._isActive
    ? release._containerDiffY
    : migrate._isActive
    ? migrate._containerDiffY
    : 0;

  this._nextLeft = this._item._left + this._offsetLeft;
  this._nextTop = this._item._top + this._offsetTop;
};

/**
 * Finish item layout procedure.
 *
 * @private
 */
ItemLayout.prototype._finish = function () {
  if (this._isDestroyed) return;

  var item = this._item;
  var migrate = item._migrate;
  var release = item._dragRelease;

  // Update internal translate values.
  item._tX = this._nextLeft;
  item._tY = this._nextTop;

  // Mark the item as inactive and remove positioning classes.
  if (this._isActive) {
    this._isActive = false;
    removeClass(item._element, item.getGrid()._settings.itemPositioningClass);
  }

  // Finish up release and migration.
  if (release._isActive) release.stop();
  if (migrate._isActive) migrate.stop();

  // Process the callback queue.
  item._emitter.burst(this._queue, false, item);
};

/**
 * Prepare item for layout animation.
 *
 * @private
 */
ItemLayout.prototype._setupAnimation = function () {
  var item = this._item;
  if (item._tX === undefined || item._tY === undefined) {
    var translate = getTranslate(item._element);
    item._tX = translate.x;
    item._tY = translate.y;
  }
};

/**
 * Start layout animation.
 *
 * @private
 */
ItemLayout.prototype._startAnimation = function () {
  var item = this._item;
  var settings = item.getGrid()._settings;
  var isInstant = this._animOptions.duration <= 0;

  // Let's update the offset data and target styles.
  this._updateOffsets();

  var xDiff = Math.abs(item._left - (item._tX - this._offsetLeft));
  var yDiff = Math.abs(item._top - (item._tY - this._offsetTop));

  // If there is no need for animation or if the item is already in correct
  // position (or near it) let's finish the process early.
  if (isInstant || (xDiff < MIN_ANIMATION_DISTANCE && yDiff < MIN_ANIMATION_DISTANCE)) {
    if (xDiff || yDiff || this._isInterrupted) {
      item._setTranslate(this._nextLeft, this._nextTop);
    }
    this._animation.stop();
    this._finish();
    return;
  }

  // Set item's positioning class if needed.
  if (!this._isInterrupted) {
    addClass(item._element, settings.itemPositioningClass);
  }

  // Get current/next styles for animation.
  this._currentStyles[transformProp] = getTranslateString(item._tX, item._tY);
  this._targetStyles[transformProp] = getTranslateString(this._nextLeft, this._nextTop);

  // Set internal translation values to undefined for the duration of the
  // animation since they will be changing on each animation frame for the
  // duration of the animation and tracking them would mean reading the DOM on
  // each frame, which is pretty darn expensive.
  item._tX = item._tY = undefined;

  // Start animation.
  this._animation.start(this._currentStyles, this._targetStyles, this._animOptions);
};

export default ItemLayout;
