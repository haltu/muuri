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
import setStyles from '../utils/setStyles';
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
  this._currentLeft = 0;
  this._currentTop = 0;
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
  elementStyle[transformProp] = getTranslateString(0, 0);

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
    this._updateTargetStyles();
    setStyles(item._element, this._targetStyles);
    this._animation.stop(false);
    this._finish();
    return;
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
 * @param {Object} [targetStyles]
 */
ItemLayout.prototype.stop = function (processCallbackQueue, targetStyles) {
  if (this._isDestroyed || !this._isActive) return;

  var item = this._item;

  // Cancel animation init.
  cancelLayoutTick(item._id);

  // Stop animation.
  if (targetStyles) setStyles(item._element, targetStyles);
  this._animation.stop(!targetStyles);

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

  this.stop(true, {});
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
};

/**
 * Calculate and update item's layout target styles.
 *
 * @private
 */
ItemLayout.prototype._updateTargetStyles = function () {
  if (this._isDestroyed) return;
  this._targetStyles[transformProp] = getTranslateString(
    this._item._left + this._offsetLeft,
    this._item._top + this._offsetTop
  );
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
  // TODO: Keep track of the translate value so we only need to query the DOM
  // here if the item is animating currently.
  var translate = getTranslate(this._item._element);
  this._currentLeft = translate.x;
  this._currentTop = translate.y;
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
  this._updateTargetStyles();

  var xDiff = Math.abs(item._left - (this._currentLeft - this._offsetLeft));
  var yDiff = Math.abs(item._top - (this._currentTop - this._offsetTop));

  // If there is no need for animation or if the item is already in correct
  // position (or near it) let's finish the process early.
  if (isInstant || (xDiff < MIN_ANIMATION_DISTANCE && yDiff < MIN_ANIMATION_DISTANCE)) {
    if (xDiff || yDiff || this._isInterrupted) {
      setStyles(item._element, this._targetStyles);
    }
    this._animation.stop(false);
    this._finish();
    return;
  }

  // Set item's positioning class if needed.
  if (!this._isInterrupted) {
    addClass(item._element, settings.itemPositioningClass);
  }

  // Get current styles for animation.
  this._currentStyles[transformProp] = getTranslateString(this._currentLeft, this._currentTop);

  // Animate.
  this._animation.start(this._currentStyles, this._targetStyles, this._animOptions);
};

export default ItemLayout;
