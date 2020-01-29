/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

import isFunction from '../utils/isFunction';
import { SCROLL_LEFT, SCROLL_RIGHT, SCROLL_UP } from './constants';
import { getScrollLeft, getScrollTop, getItemAutoScrollSettings } from './utils';

export default function ScrollRequest() {
  this.item = null;
  this.element = null;
  this.active = false;
  this.direction = null;
  this.value = null;
  this.maxValue = 0;
  this.threshold = 0;
  this.distance = 0;
  this.speed = 0;
  this.duration = 0;
  this.action = null;
}

ScrollRequest.prototype.reset = function() {
  if (this.active) this.onStop();

  this.item = null;
  this.element = null;
  this.active = false;
  this.direction = null;
  this.value = null;
  this.maxValue = 0;
  this.threshold = 0;
  this.distance = 0;
  this.speed = 0;
  this.duration = 0;
  this.action = null;
};

ScrollRequest.prototype.isAxisX = function() {
  return this.direction === SCROLL_LEFT || this.direction === SCROLL_RIGHT;
};

ScrollRequest.prototype.computeCurrentScrollValue = function() {
  if (this.value === null) {
    return this.isAxisX() ? getScrollLeft(this.element) : getScrollTop(this.element);
  }
  return Math.max(0, Math.min(this.value, this.maxValue));
};

ScrollRequest.prototype.computeNextScrollValue = function(deltaTime) {
  var scrollValue = this.value;
  var direction = this.direction;
  var scrollDelta = this.speed * (deltaTime / 1000);
  var nextScrollValue =
    direction === SCROLL_LEFT || direction === SCROLL_UP
      ? scrollValue - scrollDelta
      : scrollValue + scrollDelta;

  return Math.max(0, Math.min(nextScrollValue, this.maxValue));
};

ScrollRequest.prototype.computeSpeed = (function() {
  var data = {
    direction: null,
    threshold: 0,
    distance: 0,
    value: 0,
    maxValue: 0,
    deltaTime: 0,
    duration: 0
  };

  return function(deltaTime) {
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
      return speed(item, this.element, data);
    } else {
      return speed;
    }
  };
})();

ScrollRequest.prototype.tick = function(deltaTime) {
  if (!this.active) {
    this.active = true;
    this.onStart();
  }
  this.value = this.computeCurrentScrollValue();
  this.speed = this.computeSpeed(deltaTime);
  this.value = this.computeNextScrollValue(deltaTime);
  this.duration += deltaTime;
  return this.value;
};

ScrollRequest.prototype.onStart = function() {
  var item = this.item;
  var onStart = getItemAutoScrollSettings(item).onStart;
  if (isFunction(onStart)) onStart(item, this.element, this.direction);
};

ScrollRequest.prototype.onStop = function() {
  var item = this.item;
  var onStop = getItemAutoScrollSettings(item).onStop;
  if (isFunction(onStop)) onStop(item, this.element, this.direction);
};
