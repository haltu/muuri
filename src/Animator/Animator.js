/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getUnprefixedPropName from '../utils/getUnprefixedPropName';
import isFunction from '../utils/isFunction';
import isNative from '../utils/isNative';
import setStyles from '../utils/setStyles';

var HAS_WEB_ANIMATIONS = !!(Element && isFunction(Element.prototype.animate));
var HAS_NATIVE_WEB_ANIMATIONS = !!(Element && isNative(Element.prototype.animate));

/**
 * Item animation handler powered by Web Animations API.
 *
 * @class
 * @param {HTMLElement} element
 */
function Animator(element) {
  this._element = element;
  this._animation = null;
  this._callback = null;
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
 * @param {Object} propsFrom
 * @param {Object} propsTo
 * @param {Object} [options]
 * @param {Number} [options.duration=300]
 * @param {String} [options.easing='ease']
 * @param {Function} [options.onFinish]
 */
Animator.prototype.start = function (propsFrom, propsTo, options) {
  if (this._isDestroyed) return;

  var element = this._element;
  var opts = options || {};

  // If we don't have web animations available let's not animate.
  if (!HAS_WEB_ANIMATIONS) {
    setStyles(element, propsTo);
    this._callback = isFunction(opts.onFinish) ? opts.onFinish : null;
    this._onFinish();
    return;
  }

  // Cancel existing animation.
  if (this._animation) this._animation.cancel();

  // Store animation callback.
  this._callback = isFunction(opts.onFinish) ? opts.onFinish : null;

  // Start the animation. We need to provide unprefixed property names to the
  // Web Animations polyfill if it is being used. If we have native Web
  // Animations available we need to provide prefixed properties instead.
  this._animation = element.animate(
    [
      createKeyframe(propsFrom, HAS_NATIVE_WEB_ANIMATIONS),
      createKeyframe(propsTo, HAS_NATIVE_WEB_ANIMATIONS),
    ],
    {
      duration: opts.duration || 300,
      easing: opts.easing || 'ease',
    }
  );
  this._animation.onfinish = this._onFinish;

  // Set the end styles. This makes sure that the element stays at the end
  // values after animation is finished.
  setStyles(element, propsTo);
};

/**
 * Stop instance's current animation if running.
 *
 * @public
 */
Animator.prototype.stop = function () {
  if (this._isDestroyed || !this._animation) return;
  this._animation.cancel();
  this._animation = this._callback = null;
};

/**
 * Check if the item is being animated currently.
 *
 * @public
 * @return {Boolean}
 */
Animator.prototype.isAnimating = function () {
  return !!this._animation;
};

/**
 * Destroy the instance and stop current animation if it is running.
 *
 * @public
 */
Animator.prototype.destroy = function () {
  if (this._isDestroyed) return;
  this.stop();
  this._element = null;
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
 */
Animator.prototype._onFinish = function () {
  var callback = this._callback;
  this._animation = this._callback = null;
  callback && callback();
};

/**
 * Private helpers
 * ***************
 */

function createKeyframe(props, prefix) {
  var frame = {};
  for (var prop in props) {
    frame[prefix ? prop : getUnprefixedPropName(prop)] = props[prop];
  }
  return frame;
}

export default Animator;
