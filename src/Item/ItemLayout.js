/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { ticker } from '../shared.js';

import Queue from '../Queue/Queue.js';

import addClass from '../utils/addClass.js';
import createTranslateStyle from '../utils/createTranslateStyle.js';
import getTranslate from '../utils/getTranslate.js';
import removeClass from '../utils/removeClass.js';
import setStyles from '../utils/setStyles.js';

/**
 * Layout manager for Item instance.
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
  this._animateOptions = {
    onFinish: this._finish.bind(this)
  };
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
  var migrate = item._migrate;
  var release = item._release;
  var gridSettings = item.getGrid()._settings;
  var isPositioning = this._isActive;
  var isJustReleased = release._isActive && release._isPositioningStarted === false;
  var animDuration = isJustReleased
    ? gridSettings.dragReleaseDuration
    : gridSettings.layoutDuration;
  var animEasing = isJustReleased ? gridSettings.dragReleaseEasing : gridSettings.layoutEasing;
  var animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;
  var offsetLeft;
  var offsetTop;
  var isAnimating;

  // If the item is currently positioning process current layout callback
  // queue with interrupted flag on.
  if (isPositioning) this._queue.flush(true, item);

  // Mark release positioning as started.
  if (isJustReleased) release._isPositioningStarted = true;

  // Push the callback to the callback queue.
  if (typeof onFinish === 'function') this._queue.add(onFinish);

  // Get item container's left offset.
  offsetLeft = release._isActive
    ? release._containerDiffX
    : migrate._isActive
      ? migrate._containerDiffX
      : 0;

  // Get item container's top offset.
  offsetTop = release._isActive
    ? release._containerDiffY
    : migrate._isActive
      ? migrate._containerDiffY
      : 0;

  // Get target styles.
  this._targetStyles.transform = createTranslateStyle(
    item._left + offsetLeft,
    item._top + offsetTop
  );

  // If no animations are needed, easy peasy!
  if (!animEnabled) {
    isPositioning && ticker.cancel(item._id);
    isAnimating = item._animate.isAnimating();
    this.stop(false, this._targetStyles);
    !isAnimating && setStyles(element, this._targetStyles);
    this._skipNextAnimation = false;
    return this._finish();
  }

  // Set item active and store some data for the animation that is about to be
  // triggered.
  this._isActive = true;
  this._animateOptions.easing = animEasing;
  this._animateOptions.duration = animDuration;
  this._isInterrupted = isPositioning;
  this._offsetLeft = offsetLeft;
  this._offsetTop = offsetTop;

  // Start the item's layout animation in the next tick.
  ticker.add(item._id, this._setupAnimation, this._startAnimation);

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
  ticker.cancel(item._id);

  // Stop animation.
  item._animate.stop(targetStyles);

  // Remove positioning class.
  removeClass(item._element, item.getGrid()._settings.itemPositioningClass);

  // Reset active state.
  this._isActive = false;

  // Process callback queue if needed.
  if (processCallbackQueue) this._queue.flush(true, item);

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
  this._item = this._currentStyles = this._targetStyles = this._animateOptions = null;
  this._isDestroyed = true;
  return this;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Finish item layout procedure.
 *
 * @private
 * @memberof ItemLayout.prototype
 * @returns {ItemLayout}
 */
ItemLayout.prototype._finish = function() {
  if (this._isDestroyed) return this;

  var item = this._item;
  var migrate = item._migrate;
  var release = item._release;

  // Mark the item as inactive and remove positioning classes.
  if (this._isActive) {
    this._isActive = false;
    removeClass(item._element, item.getGrid()._settings.itemPositioningClass);
  }

  // Finish up release and migration.
  if (release._isActive) release.stop();
  if (migrate._isActive) migrate.stop();

  // Process the callback queue.
  this._queue.flush(false, item);

  return this;
};

/**
 * Prepare item for layout animation.
 *
 * @private
 * @memberof ItemLayout.prototype
 * @returns {ItemLayout}
 */
ItemLayout.prototype._setupAnimation = function() {
  var element = this._item._element;
  var translate = getTranslate(element);
  this._currentLeft = translate.x - this._offsetLeft;
  this._currentTop = translate.y - this._offsetTop;
  return this;
};

/**
 * Start layout animation.
 *
 * @private
 * @memberof ItemLayout.prototype
 * @returns {ItemLayout}
 */
ItemLayout.prototype._startAnimation = function() {
  var item = this._item;
  var element = item._element;
  var grid = item.getGrid();
  var settings = grid._settings;

  // If the item is already in correct position let's quit early.
  if (item._left === this._currentLeft && item._top === this._currentTop) {
    this._isInterrupted && this.stop(false, this._targetStyles);
    this._isActive = false;
    return this._finish();
  }

  // Set item's positioning class if needed.
  !this._isInterrupted && addClass(element, settings.itemPositioningClass);

  // Get current styles for animation.
  this._currentStyles.transform = createTranslateStyle(
    this._currentLeft + this._offsetLeft,
    this._currentTop + this._offsetTop
  );

  // Animate.
  item._animate.start(this._currentStyles, this._targetStyles, this._animateOptions);

  return this;
};

export default ItemLayout;
