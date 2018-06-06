/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getCurrentStyles from '../utils/getCurrentStyles.js';
import setStyles from '../utils/setStyles.js';

var placeholderObject = {};

/**
 * Item animation handler powered by Web Animations API.
 *
 * @class
 * @param {Item} item
 * @param {HTMLElement} element
 */
function ItemAnimate(item, element) {
  this._item = item;
  this._element = element;
  this._animation = null;
  this._propsTo = null;
  this._callback = null;
  this._keyframes = [];
  this._options = {};
  this._isDestroyed = false;
  this._onFinish = this._onFinish.bind(this);
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Start instance's animation. Automatically stops current animation if it is
 * running.
 *
 * @public
 * @memberof ItemAnimate.prototype
 * @param {Object} propsFrom
 * @param {Object} propsTo
 * @param {Object} [options]
 * @param {Number} [options.duration=300]
 * @param {String} [options.easing='ease']
 * @param {Function} [options.onFinish]
 */
ItemAnimate.prototype.start = function(propsFrom, propsTo, options) {
  if (this._isDestroyed) return;

  var opts = options || placeholderObject;
  var callback = typeof opts.onFinish === 'function' ? opts.onFinish : null;
  var shouldStop = false;
  var propName;

  // If we have an ongoing animation.
  if (this._animation) {
    // Check if we should stop the current animation. Here basically just test
    // that is the new animation animating to the same props with same values
    // as the current animation. Note that this is not currently checking the
    // scenario where the current animation has matching props and values to
    // the new animation and also has some extra props.
    for (propName in propsTo) {
      if (propsTo[propName] !== this._propsTo[propName]) {
        shouldStop = true;
        break;
      }
    }

    // Let's cancel the ongoing animation if needed.
    if (shouldStop) {
      this._animation.cancel();
    }
    // Otherwise let's just change the callback and quit early.
    else {
      this._callback = callback;
      return;
    }
  }

  // Store callback.
  this._callback = callback;

  // Store target props (copy to guard against mutation).
  this._propsTo = {};
  for (propName in propsTo) {
    this._propsTo[propName] = propsTo[propName];
  }

  // Start the animation.
  this._keyframes[0] = propsFrom;
  this._keyframes[1] = propsTo;
  this._options.duration = opts.duration || 300;
  this._options.easing = opts.easing || 'ease';
  this._animation = this._element.animate(this._keyframes, this._options);

  // Bind animation finish callback.
  this._animation.onfinish = this._onFinish;

  // Set the end styles.
  setStyles(this._element, propsTo);
};

/**
 * Stop instance's current animation if running.
 *
 * @public
 * @memberof ItemAnimate.prototype
 * @param {Object} [currentStyles]
 */
ItemAnimate.prototype.stop = function(currentStyles) {
  if (this._isDestroyed || !this._animation) return;
  setStyles(this._element, currentStyles || getCurrentStyles(this._element, this._propsTo));
  this._animation.cancel();
  this._animation = this._propsTo = this._callback = null;
};

/**
 * Check if the item is being animated currently.
 *
 * @public
 * @memberof ItemAnimate.prototype
 * @return {Boolean}
 */
ItemAnimate.prototype.isAnimating = function() {
  return !!this._animation;
};

/**
 * Destroy the instance and stop current animation if it is running.
 *
 * @public
 * @memberof ItemAnimate.prototype
 */
ItemAnimate.prototype.destroy = function() {
  if (this._isDestroyed) return;
  this.stop();
  this._item = this._element = this._options = this._keyframes = null;
  this._isDestroyed = true;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Animation end handler.
 *
 * @private
 * @memberof ItemAnimate.prototype
 */
ItemAnimate.prototype._onFinish = function() {
  var callback = this._callback;
  this._animation = this._propsTo = this._callback = null;
  callback && callback();
};

export default ItemAnimate;
