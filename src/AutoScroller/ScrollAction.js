/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

import { getScrollLeft, getScrollTop } from './utils';
import { AXIS_X } from './constants';

export default function ScrollAction() {
  this.element = null;
  this.requestX = null;
  this.requestY = null;
  this.scrollLeft = 0;
  this.scrollTop = 0;
}

ScrollAction.prototype.reset = function () {
  if (this.requestX) this.requestX.action = null;
  if (this.requestY) this.requestY.action = null;
  this.element = null;
  this.requestX = null;
  this.requestY = null;
  this.scrollLeft = 0;
  this.scrollTop = 0;
};

ScrollAction.prototype.addRequest = function (request) {
  if (AXIS_X & request.direction) {
    this.removeRequest(this.requestX);
    this.requestX = request;
  } else {
    this.removeRequest(this.requestY);
    this.requestY = request;
  }
  request.action = this;
};

ScrollAction.prototype.removeRequest = function (request) {
  if (!request) return;
  if (this.requestX === request) {
    this.requestX = null;
    request.action = null;
  } else if (this.requestY === request) {
    this.requestY = null;
    request.action = null;
  }
};

ScrollAction.prototype.computeScrollValues = function () {
  this.scrollLeft = this.requestX ? this.requestX.value : getScrollLeft(this.element);
  this.scrollTop = this.requestY ? this.requestY.value : getScrollTop(this.element);
};

ScrollAction.prototype.scroll = function () {
  var element = this.element;
  if (!element) return;

  if (element.scrollTo) {
    element.scrollTo(this.scrollLeft, this.scrollTop);
  } else {
    element.scrollLeft = this.scrollLeft;
    element.scrollTop = this.scrollTop;
  }
};
