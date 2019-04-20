/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import getStyle from '../utils/getStyle';
import getStyleName from '../utils/getStyleName';
import isFunction from '../utils/isFunction';
import setStyles from '../utils/setStyles';
import { transformProp } from '../utils/supportedTransform';

/**
 * Item animation handler powered by Web Animations API.
 *
 * @class
 * @param {HTMLElement} element
 */
function ItemAnimate(element) {
  this._element = element;
  this._animation = null;
  this._callback = null;
  this._props = [];
  this._values = [];
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

  var animation = this._animation;
  var currentProps = this._props;
  var currentValues = this._values;
  var opts = options || 0;
  var cancelAnimation = false;

  // If we have an existing animation running, let's check if it needs to be
  // cancelled or if it can continue running.
  if (animation) {
    var propCount = 0;
    var propIndex;

    // Check if the requested animation target props and values match with the
    // current props and values.
    for (var propName in propsTo) {
      ++propCount;
      propIndex = currentProps.indexOf(propName);
      if (propIndex === -1 || propsTo[propName] !== currentValues[propIndex]) {
        cancelAnimation = true;
        break;
      }
    }

    // Check if the target props count matches current props count. This is
    // needed for the edge case scenario where target props contain the same
    // styles as current props, but the current props have some additional
    // props.
    if (!cancelAnimation && propCount !== currentProps.length) {
      cancelAnimation = true;
    }
  }

  // Cancel animation (if required).
  if (cancelAnimation) animation.cancel();

  // Store animation callback.
  this._callback = isFunction(opts.onFinish) ? opts.onFinish : null;

  // If we have a running animation that does not need to be cancelled, let's
  // call it a day here and let it run.
  if (animation && !cancelAnimation) return;

  // Store target props and values to instance.
  currentProps.length = currentValues.length = 0;
  for (propName in propsTo) {
    currentProps.push(propName);
    currentValues.push(propsTo[propName]);
  }

  // Set up keyframes.
  var animKeyframes = this._keyframes;
  animKeyframes[0] = propsFrom;
  animKeyframes[1] = propsTo;

  // Set up options.
  var animOptions = this._options;
  animOptions.duration = opts.duration || 300;
  animOptions.easing = opts.easing || 'ease';

  // Start the animation
  var element = this._element;
  animation = element.animate(animKeyframes, animOptions);
  animation.onfinish = this._onFinish;
  this._animation = animation;

  // Set the end styles. This makes sure that the element stays at the end
  // values after animation is finished.
  setStyles(element, propsTo);
};

/**
 * Stop instance's current animation if running.
 *
 * @public
 * @memberof ItemAnimate.prototype
 * @param {Object} [styles]
 */
ItemAnimate.prototype.stop = function(styles) {
  if (this._isDestroyed || !this._animation) return;

  var element = this._element;
  var currentProps = this._props;
  var currentValues = this._values;
  var propName;
  var propValue;
  var i;

  // Calculate (if not provided) and set styles.
  if (!styles) {
    for (i = 0; i < currentProps.length; i++) {
      propName = currentProps[i];
      propValue = getStyle(element, getStyleName(propName));
      element.style[propName === 'transform' ? transformProp : propName] = propValue;
    }
  } else {
    setStyles(element, styles);
  }

  //  Cancel animation.
  this._animation.cancel();
  this._animation = this._callback = null;

  // Reset current props and values.
  currentProps.length = currentValues.length = 0;
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
  this._element = this._options = this._keyframes = null;
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
  this._animation = this._callback = null;
  this._props.length = this._values.length = 0;
  callback && callback();
};

export default ItemAnimate;
