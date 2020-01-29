/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

/**
 * TODO: How should we handle cases where the dragged item is larger than the
 * scrollable element? Should we disallow scrolling in that case? Or maybe
 * there could be another mode where we look at the center of the dragged item
 * instead of the edge?
 *
 * TODO: We should probably allow providing threshold as a function to allow
 * defining the threshold based on the scroll element's and dragged element's
 * dimensions and position.
 */

import { addAutoScrollTick, cancelAutoScrollTick } from '../ticker';
import {
  SCROLL_NONE,
  SCROLL_LEFT,
  SCROLL_RIGHT,
  SCROLL_UP,
  SCROLL_DOWN,
  AXIS_X,
  AXIS_Y
} from './constants';
import ScrollRequest from './ScrollRequest';
import ScrollAction from './ScrollAction';
import Pool from './Pool';
import isFunction from '../utils/isFunction';
import getIntersectionScore from '../utils/getIntersectionScore';
import {
  getScrollElement,
  getScrollLeft,
  getScrollTop,
  getScrollLeftMax,
  getScrollTopMax,
  getContentRect,
  getItemAutoScrollSettings,
  prepareItemDragScroll,
  applyItemDragScroll
} from './utils';

var requestPool = new Pool(
  function() {
    return new ScrollRequest();
  },
  function(request) {
    request.reset();
  }
);

var actionPool = new Pool(
  function() {
    return new ScrollAction();
  },
  function(action) {
    action.reset();
  }
);

export default function AutoScroller() {
  this._isTicking = false;
  this._tickTime = 0;
  this._tickDeltaTime = 0;
  this._items = [];
  this._syncItems = [];
  this._actions = [];
  this._requests = {};
  this._requests[AXIS_X] = {};
  this._requests[AXIS_Y] = {};
  this._readTick = this._readTick.bind(this);
  this._writeTick = this._writeTick.bind(this);
}

AutoScroller.smoothSpeed = function(maxSpeed) {
  return function(item, element, data) {
    if (data.threshold > 0) {
      var factor = data.threshold - Math.max(0, data.distance);
      return (maxSpeed / data.threshold) * factor;
    } else {
      return maxSpeed;
    }
  };
};

AutoScroller.prototype._readTick = function(time) {
  if (time && this._tickTime) {
    this._tickDeltaTime = time - this._tickTime;
    this._tickTime = time;
    this._updateRequests();
    this._updateActions();
  } else {
    this._tickTime = time;
    this._tickDeltaTime = 0;
  }
};

AutoScroller.prototype._writeTick = function() {
  this._applyActions();
  addAutoScrollTick(this._readTick, this._writeTick);
};

AutoScroller.prototype._startTicking = function() {
  this._isTicking = true;
  addAutoScrollTick(this._readTick, this._writeTick);
};

AutoScroller.prototype._stopTicking = function() {
  this._isTicking = false;
  this._tickTime = 0;
  this._tickDeltaTime = 0;
  cancelAutoScrollTick();
};

AutoScroller.prototype._requestItemScroll = function(
  item,
  axis,
  element,
  direction,
  threshold,
  distance,
  maxValue
) {
  var reqMap = this._requests[axis];
  var request = reqMap[item._id];

  if (request) {
    if (request.element !== element || request.direction !== direction) {
      request.reset();
    }
  } else {
    request = requestPool.pick();
  }

  request.item = item;
  request.element = element;
  request.direction = direction;
  request.threshold = threshold;
  request.distance = distance;
  request.maxValue = maxValue;
  reqMap[item._id] = request;
};

AutoScroller.prototype._cancelItemScroll = function(item, axis) {
  var reqMap = this._requests[axis];
  var request = reqMap[item._id];
  if (!request) return;
  if (request.action) request.action.removeRequest(request);
  requestPool.release(request);
  delete reqMap[item._id];
};

AutoScroller.prototype._checkItemOverlap = (function() {
  var itemRect = {
    width: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  };

  var testRect = {
    width: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  };

  return function(item) {
    var settings = getItemAutoScrollSettings(item);
    var scrollItems = isFunction(settings.elements) ? settings.elements(item) : settings.elements;
    var threshold = settings.threshold;

    if (!scrollItems || !scrollItems.length) {
      this._cancelItemScroll(item, AXIS_X);
      this._cancelItemScroll(item, AXIS_Y);
      return;
    }

    var scrollItem = null;
    var testElement = null;
    var testAxisX = true;
    var testAxisY = true;
    var testScore = 0;
    var testPriority = 0;
    var testThreshold = 0;
    var testDirection = SCROLL_NONE;
    var testDistance = 0;
    var testMaxScrollX = 0;
    var testMaxScrollY = 0;

    var xElement = null;
    var xPriority = -Infinity;
    var xThreshold = 0;
    var xScore = 0;
    var xDirection = SCROLL_NONE;
    var xDistance = 0;
    var xMaxScroll = 0;

    var yElement = null;
    var yPriority = -Infinity;
    var yThreshold = 0;
    var yScore = 0;
    var yDirection = SCROLL_NONE;
    var yDistance = 0;
    var yMaxScroll = 0;

    var distanceToLeft = 0;
    var distanceToRight = 0;
    var distanceToTop = 0;
    var distanceToBottom = 0;

    itemRect.width = item._width;
    itemRect.height = item._height;
    itemRect.left = item._drag._clientX;
    itemRect.right = itemRect.left + itemRect.width;
    itemRect.top = item._drag._clientY;
    itemRect.bottom = itemRect.top + itemRect.height;

    for (var i = 0; i < scrollItems.length; i++) {
      scrollItem = scrollItems[i];
      testAxisX = scrollItem.axis !== AXIS_Y;
      testAxisY = scrollItem.axis !== AXIS_X;
      testPriority = scrollItem.priority || 0;

      // Ignore this item if it's x-axis and y-axis priority is lower than
      // the currently matching item's.
      if ((!testAxisX || testPriority < xPriority) && (!testAxisY || testPriority < yPriority)) {
        continue;
      }

      testElement = getScrollElement(scrollItem.element || scrollItem);
      testMaxScrollX = testAxisX ? getScrollLeftMax(testElement) : -1;
      testMaxScrollY = testAxisY ? getScrollTopMax(testElement) : -1;

      // Ignore this item if there is no possibility to scroll.
      if (!testMaxScrollX && !testMaxScrollY) continue;

      testThreshold = typeof scrollItem.threshold === 'number' ? scrollItem.threshold : threshold;
      testRect = getContentRect(testElement, testRect);
      testScore = getIntersectionScore(itemRect, testRect);

      // Ignore this item if it's not overlapping at all with the dragged item.
      if (testScore <= 0) continue;

      if (
        testAxisX &&
        testPriority >= xPriority &&
        testMaxScrollX > 0 &&
        (testPriority > xPriority || testScore > xScore)
      ) {
        testDirection = SCROLL_NONE;
        distanceToLeft = itemRect.left - testRect.left;
        distanceToRight = testRect.right - itemRect.right;

        if (distanceToRight < distanceToLeft) {
          if (distanceToRight <= testThreshold && getScrollLeft(testElement) < testMaxScrollX) {
            testDistance = distanceToRight;
            testDirection = SCROLL_RIGHT;
          }
        } else {
          if (distanceToLeft <= testThreshold && getScrollLeft(testElement) > 0) {
            testDistance = distanceToLeft;
            testDirection = SCROLL_LEFT;
          }
        }

        if (testDirection !== SCROLL_NONE) {
          xElement = testElement;
          xPriority = testPriority;
          xThreshold = testThreshold;
          xScore = testScore;
          xDirection = testDirection;
          xDistance = testDistance;
          xMaxScroll = testMaxScrollX;
        }
      }

      if (
        testAxisY &&
        testPriority >= yPriority &&
        testMaxScrollY > 0 &&
        (testPriority > yPriority || testScore > yScore)
      ) {
        testDirection = SCROLL_NONE;
        distanceToTop = itemRect.top - testRect.top;
        distanceToBottom = testRect.bottom - itemRect.bottom;

        if (distanceToBottom < distanceToTop) {
          if (distanceToBottom <= testThreshold && getScrollTop(testElement) < testMaxScrollY) {
            testDistance = distanceToBottom;
            testDirection = SCROLL_DOWN;
          }
        } else {
          if (distanceToTop <= testThreshold && getScrollTop(testElement) > 0) {
            testDistance = distanceToTop;
            testDirection = SCROLL_UP;
          }
        }

        if (testDirection !== SCROLL_NONE) {
          yElement = testElement;
          yPriority = testPriority;
          yThreshold = testThreshold;
          yScore = testScore;
          yDirection = testDirection;
          yDistance = testDistance;
          yMaxScroll = testMaxScrollY;
        }
      }
    }

    if (xElement) {
      this._requestItemScroll(
        item,
        AXIS_X,
        xElement,
        xDirection,
        xThreshold,
        xDistance,
        xMaxScroll
      );
    } else {
      this._cancelItemScroll(item, AXIS_X);
    }

    if (yElement) {
      this._requestItemScroll(
        item,
        AXIS_Y,
        yElement,
        yDirection,
        yThreshold,
        yDistance,
        yMaxScroll
      );
    } else {
      this._cancelItemScroll(item, AXIS_Y);
    }
  };
})();

AutoScroller.prototype._updateRequests = function() {
  for (var i = 0; i < this._items.length; i++) {
    this._checkItemOverlap(this._items[i]);
  }
};

AutoScroller.prototype._requestAction = function(request, axis) {
  var isAxisX = axis === AXIS_X;
  var action = null;

  for (var i = 0; i < this._actions.length; i++) {
    action = this._actions[i];

    // If the action's request does not match the request's -> skip.
    if (request.element !== action.element) {
      action = null;
      continue;
    }

    // If the request and action share the same element, but the request slot
    // for the requested axis is already reserved let's ignore and cancel this
    // request.
    if (isAxisX ? action.requestX : action.requestY) {
      this._cancelItemScroll(request.item, axis);
      return;
    }

    // Seems like we have found our action, let's break the loop.
    break;
  }

  if (!action) action = actionPool.pick();
  action.element = request.element;
  action.addRequest(request);

  request.tick(this._tickDeltaTime);
  this._actions.push(action);
};

AutoScroller.prototype._updateActions = function() {
  var items = this._items;
  var syncItems = this._syncItems;
  var requests = this._requests;
  var actions = this._actions;
  var item;
  var action;
  var itemId;
  var reqX;
  var reqY;
  var i;
  var j;

  // Generate actions.
  for (i = 0; i < items.length; i++) {
    itemId = items[i]._id;
    reqX = requests[AXIS_X][itemId];
    reqY = requests[AXIS_Y][itemId];
    if (reqX) this._requestAction(reqX, AXIS_X);
    if (reqY) this._requestAction(reqY, AXIS_Y);
  }

  // Compute actions' scroll values. Also check which items need to be
  // synchronously synced after scroll. Basically all items which have a parent
  // that is scrolled need to be synced.
  syncItems.length = 0;
  for (i = 0; i < actions.length; i++) {
    action = actions[i];
    action.computeScrollValues();
    for (j = 0; j < items.length; j++) {
      item = items[j];
      if (syncItems.indexOf(item) > -1) continue;
      if (action.element !== window && !action.element.contains(item.getElement())) continue;
      syncItems.push(item);
    }
  }
};

AutoScroller.prototype._applyActions = function() {
  var actions = this._actions;
  var syncItems = this._syncItems;
  var i;

  if (actions.length) {
    for (i = 0; i < actions.length; i++) {
      actions[i].scroll();
      actionPool.release(actions[i]);
    }
    actions.length = 0;
  }

  if (syncItems.length) {
    for (i = 0; i < syncItems.length; i++) prepareItemDragScroll(syncItems[i]);
    for (i = 0; i < syncItems.length; i++) applyItemDragScroll(syncItems[i]);
    syncItems.length = 0;
  }
};

AutoScroller.prototype.addItem = function(item) {
  var index = this._items.indexOf(item);
  if (index === -1) {
    this._items.push(item);
    if (!this._isTicking) this._startTicking();
  }
};

AutoScroller.prototype.removeItem = function(item) {
  var index = this._items.indexOf(item);
  if (index === -1) return;

  var itemId = item._id;

  var reqX = this._requests[AXIS_X][itemId];
  if (reqX) {
    this._cancelItemScroll(item, AXIS_X);
    delete this._requests[AXIS_X][itemId];
  }

  var reqY = this._requests[AXIS_Y][itemId];
  if (reqY) {
    this._cancelItemScroll(item, AXIS_Y);
    delete this._requests[AXIS_Y][itemId];
  }

  var syncIndex = this._syncItems.indexOf(item);
  if (syncIndex > -1) this._syncItems.splice(syncIndex, 1);

  this._items.splice(index, 1);

  if (this._isTicking && !this._items.length) {
    this._stopTicking();
  }
};

AutoScroller.prototype.isItemScrolling = function(item) {
  var itemId = item._id;
  var requests = this._requests;
  var reqX = requests[AXIS_X][itemId];
  var reqY = requests[AXIS_Y][itemId];
  return !!((reqX && reqX.value !== null) || (reqY && reqY.value !== null));
};
