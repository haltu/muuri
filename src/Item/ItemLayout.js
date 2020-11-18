/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { VIEWPORT_THRESHOLD } from '../constants';

import { addLayoutTick, cancelLayoutTick } from '../ticker';

import Animator from '../Animator/Animator';

import addClass from '../utils/addClass';
import getTranslate from '../utils/getTranslate';
import getTranslateString from '../utils/getTranslateString';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

var MIN_ANIMATION_DISTANCE = 2;
var CURRENT_STYLES = {};
var TARGET_STYLES = {};
var ANIM_OPTIONS = {};

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
  this._skipNextAnimation = false;
  this._easing = '';
  this._duration = 0;
  this._tX = 0;
  this._tY = 0;
  this._animation = new Animator(element);
  this._queue = 'layout-' + item._id;

  // Bind animation handlers.
  this._setupAnimation = this._setupAnimation.bind(this);
  this._startAnimation = this._startAnimation.bind(this);
  this._finish = this._finish.bind(this);

  // Set element's initial position styles.
  elementStyle.left = '0px';
  elementStyle.top = '0px';
  item._setTranslate(0, 0);
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
  var grid = item.getGrid();
  var gridSettings = grid._settings;
  var isPositioning = this._isActive;
  var isJustReleased = release.isJustReleased();
  var animation = this._animation;
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
    item._setTranslate(item._left + item._containerDiffX, item._top + item._containerDiffY);
    animation.stop();
    this._finish();
    return;
  }

  // Let's make sure an ongoing animation's callback is cancelled before going
  // further. Without this there's a chance that the animation will finish
  // before the next tick and mess up our logic.
  if (animation.animation) {
    animation.animation.onfinish = null;
  }

  // Kick off animation to be started in the next tick.
  grid._itemLayoutNeedsDimensionRefresh = true;
  this._isActive = true;
  this._easing = animEasing;
  this._duration = animDuration;
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
      item._setTranslate(translate.x, translate.y);
    } else {
      item._setTranslate(left, top);
    }
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
  this._isDestroyed = true;
};

/**
 * Private prototype methods
 * *************************
 */

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
  item._translateX = item._left + item._containerDiffX;
  item._translateY = item._top + item._containerDiffY;

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
  if (this._isDestroyed || !this._isActive) return;

  var item = this._item;
  var grid = item.getGrid();
  var translate = item._getTranslate();

  this._tX = translate.x;
  this._tY = translate.y;

  if (grid._settings._animationWindowing && grid._itemLayoutNeedsDimensionRefresh) {
    grid._itemLayoutNeedsDimensionRefresh = false;
    grid._updateBoundingRect();
    grid._updateBorders(1, 0, 1, 0);
  }
};

/**
 * Start layout animation.
 *
 * @private
 */
ItemLayout.prototype._startAnimation = function () {
  if (this._isDestroyed || !this._isActive) return;

  var item = this._item;
  var grid = item.getGrid();
  var settings = grid._settings;
  var isInstant = this._duration <= 0;

  // Calculate next translate values.
  var nextLeft = item._left + item._containerDiffX;
  var nextTop = item._top + item._containerDiffY;

  // Check if we can skip the animation and just snap the element to it's place.
  var xDiff = Math.abs(item._left - (this._tX - item._containerDiffX));
  var yDiff = Math.abs(item._top - (this._tY - item._containerDiffY));
  if (
    isInstant ||
    (xDiff < MIN_ANIMATION_DISTANCE && yDiff < MIN_ANIMATION_DISTANCE) ||
    (settings._animationWindowing &&
      !item._isInViewport(this._tX, this._tY, VIEWPORT_THRESHOLD) &&
      !item._isInViewport(nextLeft, nextTop, VIEWPORT_THRESHOLD))
  ) {
    if (this._isInterrupted || xDiff > 0.1 || yDiff > 0.1) {
      item._setTranslate(nextLeft, nextTop);
    }
    this._animation.stop();
    this._finish();
    return;
  }

  // Set item's positioning class if needed.
  if (!this._isInterrupted) {
    addClass(item._element, settings.itemPositioningClass);
  }

  // Get current/next styles for animation and provide animation options.
  CURRENT_STYLES[transformProp] = getTranslateString(this._tX, this._tY);
  TARGET_STYLES[transformProp] = getTranslateString(nextLeft, nextTop);
  ANIM_OPTIONS.duration = this._duration;
  ANIM_OPTIONS.easing = this._easing;
  ANIM_OPTIONS.onFinish = this._finish;

  // Set internal translation values to undefined for the duration of the
  // animation since they will be changing on each animation frame for the
  // duration of the animation and tracking them would mean reading the DOM on
  // each frame, which is pretty darn expensive.
  item._translateX = item._translateY = undefined;

  // Start animation.
  // NOTE: If item is being released or migrated when this is called we might
  // want to check if the item is still positioning towards the same position as
  // the layout skipping omits released and migrated items. If the item is
  // indeed positioning towards the same position we should probably just change
  // the finish callback and that's it, or not. Food for thought...
  this._animation.start(CURRENT_STYLES, TARGET_STYLES, ANIM_OPTIONS);

  // Unreference callback to avoid mem leaks.
  ANIM_OPTIONS.onFinish = null;
};

export default ItemLayout;
