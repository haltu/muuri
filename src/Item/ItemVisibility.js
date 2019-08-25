/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { addVisibilityTick, cancelVisibilityTick } from '../ticker';

import ItemAnimate from './ItemAnimate';
import Queue from '../Queue/Queue';

import addClass from '../utils/addClass';
import getCurrentStyles from '../utils/getCurrentStyles';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import setStyles from '../utils/setStyles';
import transformProp from '../utils/transformProp';
import getTranslateString from '../utils/getTranslateString';

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
  this._animation = new ItemAnimate(childElement);
  this._queue = new Queue();
  this._finishShow = this._finishShow.bind(this);
  this._finishHide = this._finishHide.bind(this);

  // Force item to be either visible or hidden on init.
  element.style.display = isActive ? 'block' : 'none';

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
    queue.process(true, item);
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
    queue.process(true, item);
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
 * Reset all existing visibility styles and apply new visibility styles to the
 * visibility element. This method should be used to set styles when there is a
 * chance that the current style properties differ from the new ones (basically
 * on init and on migrations).
 *
 * @public
 * @memberof ItemVisibility.prototype
 * @param {Object} styles
 * @returns {ItemVisibility}
 */
ItemVisibility.prototype.setStyles = function(styles) {
  var childElement = this._childElement;
  var currentStyleProps = this._currentStyleProps;

  this._removeCurrentStyles();

  for (var prop in styles) {
    currentStyleProps.push(prop);
    childElement.style[prop] = styles[prop];
  }

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

  this._stopAnimation(false);

  // Fire all uncompleted callbacks with interrupted flag and destroy the queue.
  queue.process(true, item);
  queue.destroy();

  this._animation.destroy();
  this._removeCurrentStyles();
  removeClass(element, settings.itemVisibleClass);
  removeClass(element, settings.itemHiddenClass);
  element.style.display = '';

  // Reset state.
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
    if (animation.isAnimating()) {
      animation.stop(false);
    }
    onFinish && onFinish();
    return;
  }

  // Start the animation in the next tick (to avoid layout thrashing).
  addVisibilityTick(
    item._id,
    function() {
      currentStyles = getCurrentStyles(childElement, targetStyles);
    },
    function() {
      animation.start(currentStyles, targetStyles, {
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
 * @param {Boolean} [applyCurrentStyles=true]
 */
ItemVisibility.prototype._stopAnimation = function(applyCurrentStyles) {
  if (this._isDestroyed) return;
  var item = this._item;
  cancelVisibilityTick(item._id);
  this._animation.stop(applyCurrentStyles);
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
  this._queue.process(false, this._item);
};

/**
 * Finish hide procedure.
 *
 * @private
 * @memberof ItemVisibility.prototype
 */
ItemVisibility.prototype._finishHide = (function() {
  var layoutStyles = {};
  layoutStyles[transformProp] = getTranslateString(0, 0);
  return function() {
    if (!this._isHidden) return;
    var item = this._item;
    this._isHiding = false;
    item._layout.stop(true, layoutStyles);
    item._element.style.display = 'none';
    this._queue.process(false, item);
  };
})();

/**
 * Remove currently applied visibility related inline style properties.
 *
 * @private
 * @memberof ItemVisibility.prototype
 */
ItemVisibility.prototype._removeCurrentStyles = function() {
  var childElement = this._childElement;
  var currentStyleProps = this._currentStyleProps;

  for (var i = 0; i < currentStyleProps.length; i++) {
    childElement.style[currentStyleProps[i]] = '';
  }

  currentStyleProps.length = 0;
};

export default ItemVisibility;
