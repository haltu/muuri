/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { addLayoutTick, cancelLayoutTick } from '../ticker';

import ItemAnimate from './ItemAnimate';
import Queue from '../Queue/Queue';

import addClass from '../utils/addClass';
import getTranslate from '../utils/getTranslate';
import getTranslateString from '../utils/getTranslateString';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import setStyles from '../utils/setStyles';
import transformProp from '../utils/transformProp';

/**
 * Layout manager for Item instance, handles the positioning of an item.
 *
 * @class
 * @param {Item} item
 */
function ItemLayout(item) {
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
    onFinish: this._finish.bind(this)
  };

  // Set element's initial position styles.
  item._element.style.left = '0px';
  item._element.style.top = '0px';
  item._element.style[transformProp] = getTranslateString(0, 0);

  this._animation = new ItemAnimate(item._element);
  this._queue = new Queue();

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
 * @memberof ItemLayout.prototype
 * @param {Boolean} [instant=false]
 * @param {Function} [onFinish]
 * @returns {ItemLayout}
 */
ItemLayout.prototype.start = function(instant, onFinish) {
  if (this._isDestroyed) return;

  var item = this._item;
  var element = item._element;
  var release = item._dragRelease;
  var gridSettings = item.getGrid()._settings;
  var isPositioning = this._isActive;
  var isJustReleased = release._isActive && release._isPositioningStarted === false;
  var animDuration = isJustReleased
    ? gridSettings.dragReleaseDuration
    : gridSettings.layoutDuration;
  var animEasing = isJustReleased ? gridSettings.dragReleaseEasing : gridSettings.layoutEasing;
  var animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;
  var isAnimating;

  // If the item is currently positioning process current layout callback
  // queue with interrupted flag on.
  if (isPositioning) this._queue.process(true, item);

  // Mark release positioning as started.
  if (isJustReleased) release._isPositioningStarted = true;

  // Push the callback to the callback queue.
  if (isFunction(onFinish)) this._queue.add(onFinish);

  // If no animations are needed, easy peasy!
  if (!animEnabled) {
    this._updateOffsets();
    this._updateTargetStyles();
    isAnimating = this._animation.isAnimating();
    this.stop(false, this._targetStyles);
    !isAnimating && setStyles(element, this._targetStyles);
    this._skipNextAnimation = false;
    return this._finish();
  }

  // Kick off animation to be started in the next tick.
  this._isActive = true;
  this._animOptions.easing = animEasing;
  this._animOptions.duration = animDuration;
  this._isInterrupted = isPositioning;
  addLayoutTick(item._id, this._setupAnimation, this._startAnimation);

  return this;
};

/**
 * Stop item's position animation if it is currently animating.
 *
 * @public
 * @memberof ItemLayout.prototype
 * @param {Boolean} [processCallbackQueue=false]
 * @param {Object} [targetStyles]
 * @returns {ItemLayout}
 */
ItemLayout.prototype.stop = function(processCallbackQueue, targetStyles) {
  if (this._isDestroyed || !this._isActive) return this;

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
  if (processCallbackQueue) this._queue.process(true, item);

  return this;
};

/**
 * Destroy the instance and stop current animation if it is running.
 *
 * @public
 * @memberof ItemLayout.prototype
 * @returns {ItemLayout}
 */
ItemLayout.prototype.destroy = function() {
  if (this._isDestroyed) return this;
  this.stop(true, {});
  this._queue.destroy();
  this._animation.destroy();
  this._item._element.style[transformProp] = '';
  this._item = null;
  this._currentStyles = null;
  this._targetStyles = null;
  this._animOptions = null;
  this._isDestroyed = true;
  return this;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Calculate and update item's current layout offset data.
 *
 * @private
 * @memberof ItemLayout.prototype
 */
ItemLayout.prototype._updateOffsets = function() {
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
 * @memberof ItemLayout.prototype
 */
ItemLayout.prototype._updateTargetStyles = function() {
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
 * @memberof ItemLayout.prototype
 */
ItemLayout.prototype._finish = function() {
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
  this._queue.process(false, item);
};

/**
 * Prepare item for layout animation.
 *
 * @private
 * @memberof ItemLayout.prototype
 */
ItemLayout.prototype._setupAnimation = function() {
  var translate = getTranslate(this._item._element);
  this._currentLeft = translate.x;
  this._currentTop = translate.y;
};

/**
 * Start layout animation.
 *
 * @private
 * @memberof ItemLayout.prototype
 */
ItemLayout.prototype._startAnimation = function() {
  var item = this._item;
  var settings = item.getGrid()._settings;

  // Let's update the offset data and target styles.
  this._updateOffsets();
  this._updateTargetStyles();

  // If the item is already in correct position let's quit early.
  if (
    item._left === this._currentLeft - this._offsetLeft &&
    item._top === this._currentTop - this._offsetTop
  ) {
    if (this._isInterrupted) {
      this.stop(false, this._targetStyles);
    }
    this._isActive = false;
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
