/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

import isFunction from '../utils/isFunction';
import { AXIS_X, FORWARD } from './constants';
import { getScrollLeft, getScrollTop, getItemAutoScrollSettings } from './utils';

export default function ScrollRequest() {
  this.reset();
}

ScrollRequest.prototype.reset = function () {
  if (this.isActive) this.onStop();
  this.item = null;
  this.element = null;
  this.isActive = false;
  this.isEnding = false;
  this.direction = null;
  this.value = null;
  this.maxValue = 0;
  this.threshold = 0;
  this.distance = 0;
  this.speed = 0;
  this.duration = 0;
  this.action = null;
};

ScrollRequest.prototype.hasReachedEnd = function () {
  return FORWARD & this.direction ? this.value >= this.maxValue : this.value <= 0;
};

ScrollRequest.prototype.computeCurrentScrollValue = function () {
  if (this.value === null) {
    return AXIS_X & this.direction ? getScrollLeft(this.element) : getScrollTop(this.element);
  }
  return Math.max(0, Math.min(this.value, this.maxValue));
};

ScrollRequest.prototype.computeNextScrollValue = function (deltaTime) {
  var delta = this.speed * (deltaTime / 1000);
  var nextValue = FORWARD & this.direction ? this.value + delta : this.value - delta;
  return Math.max(0, Math.min(nextValue, this.maxValue));
};

ScrollRequest.prototype.computeSpeed = (function () {
  var data = {
    direction: null,
    threshold: 0,
    distance: 0,
    value: 0,
    maxValue: 0,
    deltaTime: 0,
    duration: 0,
    isEnding: false,
  };

  return function (deltaTime) {
    var item = this.item;
    var speed = getItemAutoScrollSettings(item).speed;

    if (isFunction(speed)) {
      data.direction = this.direction;
      data.threshold = this.threshold;
      data.distance = this.distance;
      data.value = this.value;
      data.maxValue = this.maxValue;
      data.duration = this.duration;
      data.speed = this.speed;
      data.deltaTime = deltaTime;
      data.isEnding = this.isEnding;
      return speed(item, this.element, data);
    } else {
      return speed;
    }
  };
})();

ScrollRequest.prototype.tick = function (deltaTime) {
  if (!this.isActive) {
    this.isActive = true;
    this.onStart();
  }
  this.value = this.computeCurrentScrollValue();
  this.speed = this.computeSpeed(deltaTime);
  this.value = this.computeNextScrollValue(deltaTime);
  this.duration += deltaTime;
  return this.value;
};

ScrollRequest.prototype.onStart = function () {
  var item = this.item;
  var onStart = getItemAutoScrollSettings(item).onStart;
  if (isFunction(onStart)) onStart(item, this.element, this.direction);
};

ScrollRequest.prototype.onStop = function () {
  var item = this.item;
  var onStop = getItemAutoScrollSettings(item).onStop;
  if (isFunction(onStop)) onStop(item, this.element, this.direction);
  // Manually nudge sort to happen. There's a good chance that the item is still
  // after the scroll stops which means that the next sort will be triggered
  // only after the item is moved or it's parent scrolled.
  if (item._drag) item._drag.sort();
};
