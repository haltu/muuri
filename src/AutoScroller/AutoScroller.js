/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

import { addAutoScrollTick, cancelAutoScrollTick } from '../ticker';
import { LEFT, RIGHT, UP, DOWN, AXIS_X, AXIS_Y, FORWARD } from './constants';
import ScrollRequest from './ScrollRequest';
import ScrollAction from './ScrollAction';
import Pool from './Pool';
import getIntersectionScore from '../utils/getIntersectionScore';
import isFunction from '../utils/isFunction';
import {
  getScrollElement,
  getScrollLeft,
  getScrollTop,
  getScrollLeftMax,
  getScrollTopMax,
  getContentRect,
  getItemAutoScrollSettings,
  isAffectedByScroll,
  prepareItemDragScroll,
  applyItemDragScroll,
  computeThreshold
} from './utils';

var REQUEST_POOL = new Pool(
  function() {
    return new ScrollRequest();
  },
  function(request) {
    request.reset();
  }
);

var ACTION_POOL = new Pool(
  function() {
    return new ScrollAction();
  },
  function(action) {
    action.reset();
  }
);

var RECT_1 = {
  width: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0
};

var RECT_2 = {
  width: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0
};

var OVERLAP_CHECK_INTERVAL = 150;

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
  this._requestOverlapCheck = {};
  this._dragPositions = {};
  this._readTick = this._readTick.bind(this);
  this._writeTick = this._writeTick.bind(this);
}

AutoScroller.AXIS_X = AXIS_X;
AutoScroller.AXIS_Y = AXIS_Y;
AutoScroller.LEFT = LEFT;
AutoScroller.RIGHT = RIGHT;
AutoScroller.UP = UP;
AutoScroller.DOWN = DOWN;

AutoScroller.smoothSpeed = function(maxSpeed, acceleration, deceleration) {
  return function(item, element, data) {
    var targetSpeed = 0;
    if (!data.isEnding) {
      if (data.threshold > 0) {
        var factor = data.threshold - Math.max(0, data.distance);
        targetSpeed = (maxSpeed / data.threshold) * factor;
      } else {
        targetSpeed = maxSpeed;
      }
    }

    var currentSpeed = data.speed;
    var nextSpeed = targetSpeed;

    if (currentSpeed === targetSpeed) {
      return nextSpeed;
    }

    if (currentSpeed < targetSpeed) {
      nextSpeed = currentSpeed + acceleration * (data.deltaTime / 1000);
      return Math.min(targetSpeed, nextSpeed);
    } else {
      nextSpeed = currentSpeed - deceleration * (data.deltaTime / 1000);
      return Math.max(targetSpeed, nextSpeed);
    }
  };
};

AutoScroller.pointerHandle = function(pointerSize) {
  var rect = { left: 0, top: 0, width: 0, height: 0 };
  var size = pointerSize || 1;
  return function(item, x, y, w, h, pX, pY) {
    rect.left = pX - size * 0.5;
    rect.top = pY - size * 0.5;
    rect.width = size;
    rect.height = size;
    return rect;
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

AutoScroller.prototype._getItemDragDirection = function(item, axis) {
  var positions = this._dragPositions[item._id];
  if (!positions || positions.length < 4) return 0;

  var isAxisX = axis === AXIS_X;
  var curr = positions[isAxisX ? 0 : 1];
  var prev = positions[isAxisX ? 2 : 3];

  if (curr > prev) {
    return isAxisX ? RIGHT : DOWN;
  } else if (curr < prev) {
    return isAxisX ? LEFT : UP;
  } else {
    return 0;
  }
};

AutoScroller.prototype._getItemHandleRect = function(item, handle, rect) {
  var itemDrag = item._drag;

  if (handle) {
    var ev = itemDrag._dragMoveEvent || itemDrag._dragStartEvent;
    var data = handle(
      item,
      itemDrag._clientX,
      itemDrag._clientY,
      item._width,
      item._height,
      ev.clientX,
      ev.clientY
    );
    rect.left = data.left;
    rect.top = data.top;
    rect.width = data.width;
    rect.height = data.height;
  } else {
    rect.left = itemDrag._clientX;
    rect.top = itemDrag._clientY;
    rect.width = item._width;
    rect.height = item._height;
  }

  rect.right = rect.left + rect.width;
  rect.bottom = rect.top + rect.height;

  return rect;
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
    request = REQUEST_POOL.pick();
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
  REQUEST_POOL.release(request);
  delete reqMap[item._id];
};

AutoScroller.prototype._checkItemOverlap = function(item, checkX, checkY) {
  var settings = getItemAutoScrollSettings(item);
  var targets = isFunction(settings.targets) ? settings.targets(item) : settings.targets;
  var threshold = settings.threshold;
  var safeZone = settings.safeZone;

  if (!targets || !targets.length) {
    checkX && this._cancelItemScroll(item, AXIS_X);
    checkY && this._cancelItemScroll(item, AXIS_Y);
    return;
  }

  var dragDirectionX = this._getItemDragDirection(item, AXIS_X);
  var dragDirectionY = this._getItemDragDirection(item, AXIS_Y);

  if (!dragDirectionX && !dragDirectionY) {
    checkX && this._cancelItemScroll(item, AXIS_X);
    checkY && this._cancelItemScroll(item, AXIS_Y);
    return;
  }

  var itemRect = this._getItemHandleRect(item, settings.handle, RECT_1);
  var testRect = RECT_2;

  var target = null;
  var testElement = null;
  var testAxisX = true;
  var testAxisY = true;
  var testScore = 0;
  var testPriority = 0;
  var testThreshold = null;
  var testDirection = null;
  var testDistance = 0;
  var testMaxScrollX = 0;
  var testMaxScrollY = 0;

  var xElement = null;
  var xPriority = -Infinity;
  var xThreshold = 0;
  var xScore = 0;
  var xDirection = null;
  var xDistance = 0;
  var xMaxScroll = 0;

  var yElement = null;
  var yPriority = -Infinity;
  var yThreshold = 0;
  var yScore = 0;
  var yDirection = null;
  var yDistance = 0;
  var yMaxScroll = 0;

  for (var i = 0; i < targets.length; i++) {
    target = targets[i];
    testAxisX = checkX && dragDirectionX && target.axis !== AXIS_Y;
    testAxisY = checkY && dragDirectionY && target.axis !== AXIS_X;
    testPriority = target.priority || 0;

    // Ignore this item if it's x-axis and y-axis priority is lower than
    // the currently matching item's.
    if ((!testAxisX || testPriority < xPriority) && (!testAxisY || testPriority < yPriority)) {
      continue;
    }

    testElement = getScrollElement(target.element || target);
    testMaxScrollX = testAxisX ? getScrollLeftMax(testElement) : -1;
    testMaxScrollY = testAxisY ? getScrollTopMax(testElement) : -1;

    // Ignore this item if there is no possibility to scroll.
    if (!testMaxScrollX && !testMaxScrollY) continue;

    testRect = getContentRect(testElement, testRect);
    testScore = getIntersectionScore(itemRect, testRect);

    // Ignore this item if it's not overlapping at all with the dragged item.
    if (testScore <= 0) continue;

    // Test x-axis.
    if (
      testAxisX &&
      testPriority >= xPriority &&
      testMaxScrollX > 0 &&
      (testPriority > xPriority || testScore > xScore)
    ) {
      testDirection = null;
      testThreshold = computeThreshold(
        threshold,
        target.threshold,
        safeZone,
        itemRect.width,
        testRect.width
      );
      if (dragDirectionX === RIGHT) {
        testDistance = testRect.right + testThreshold.offset - itemRect.right;
        if (testDistance <= testThreshold.value && getScrollLeft(testElement) < testMaxScrollX) {
          testDirection = RIGHT;
        }
      } else if (dragDirectionX === LEFT) {
        testDistance = itemRect.left - (testRect.left - testThreshold.offset);
        if (testDistance <= testThreshold.value && getScrollLeft(testElement) > 0) {
          testDirection = LEFT;
        }
      }

      if (testDirection !== null) {
        xElement = testElement;
        xPriority = testPriority;
        xThreshold = testThreshold.value;
        xScore = testScore;
        xDirection = testDirection;
        xDistance = testDistance;
        xMaxScroll = testMaxScrollX;
      }
    }

    // Test y-axis.
    if (
      testAxisY &&
      testPriority >= yPriority &&
      testMaxScrollY > 0 &&
      (testPriority > yPriority || testScore > yScore)
    ) {
      testDirection = null;
      testThreshold = computeThreshold(
        threshold,
        target.threshold,
        safeZone,
        itemRect.height,
        testRect.height
      );
      if (dragDirectionY === DOWN) {
        testDistance = testRect.bottom + testThreshold.offset - itemRect.bottom;
        if (testDistance <= testThreshold.value && getScrollTop(testElement) < testMaxScrollY) {
          testDirection = DOWN;
        }
      } else if (dragDirectionY === UP) {
        testDistance = itemRect.top - (testRect.top - testThreshold.offset);
        if (testDistance <= testThreshold.value && getScrollTop(testElement) > 0) {
          testDirection = UP;
        }
      }

      if (testDirection !== null) {
        yElement = testElement;
        yPriority = testPriority;
        yThreshold = testThreshold.value;
        yScore = testScore;
        yDirection = testDirection;
        yDistance = testDistance;
        yMaxScroll = testMaxScrollY;
      }
    }
  }

  // Request or cancel x-axis scroll.
  if (checkX) {
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
  }

  // Request or cancel y-axis scroll.
  if (checkY) {
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
  }
};

AutoScroller.prototype._updateScrollRequest = function(scrollRequest) {
  var item = scrollRequest.item;
  var settings = getItemAutoScrollSettings(item);
  var targets = isFunction(settings.targets) ? settings.targets(item) : settings.targets;
  var threshold = settings.threshold;
  var safeZone = settings.safeZone;

  // Quick exit if no scroll items are found.
  if (!targets || !targets.length) {
    return false;
  }

  var itemRect = this._getItemHandleRect(item, settings.handle, RECT_1);
  var testRect = RECT_2;

  var target = null;
  var testElement = null;
  var testIsAxisX = false;
  var testScore = null;
  var testThreshold = null;
  var testDistance = null;
  var testScroll = null;
  var testMaxScroll = null;
  var hasReachedEnd = null;

  for (var i = 0; i < targets.length; i++) {
    target = targets[i];

    // Make sure we have a matching element.
    testElement = getScrollElement(target.element || target);
    if (testElement !== scrollRequest.element) continue;

    // Make sure we have a matching axis.
    testIsAxisX = !!(AXIS_X & scrollRequest.direction);
    if (testIsAxisX) {
      if (target.axis === AXIS_Y) continue;
    } else {
      if (target.axis === AXIS_X) continue;
    }

    // Stop scrolling if there is no room to scroll anymore.
    testMaxScroll = testIsAxisX ? getScrollLeftMax(testElement) : getScrollTopMax(testElement);
    if (testMaxScroll <= 0) {
      break;
    }

    testRect = getContentRect(testElement, testRect);
    testScore = getIntersectionScore(itemRect, testRect);

    // Stop scrolling if dragged item is not overlapping with the scroll
    // element anymore.
    if (testScore <= 0) {
      break;
    }

    // Compute threshold and edge offset.
    if (testIsAxisX) {
      testThreshold = computeThreshold(
        threshold,
        target.threshold,
        safeZone,
        itemRect.width,
        testRect.width
      );
    } else {
      testThreshold = computeThreshold(
        threshold,
        target.threshold,
        safeZone,
        itemRect.height,
        testRect.height
      );
    }

    // Compute distance (based on current direction).
    if (scrollRequest.direction === LEFT) {
      testDistance = itemRect.left - (testRect.left - testThreshold.offset);
    } else if (scrollRequest.direction === RIGHT) {
      testDistance = testRect.right + testThreshold.offset - itemRect.right;
    } else if (scrollRequest.direction === UP) {
      testDistance = itemRect.top - (testRect.top - testThreshold.offset);
    } else {
      testDistance = testRect.bottom + testThreshold.offset - itemRect.bottom;
    }

    // Stop scrolling if threshold is not exceeded.
    if (testDistance > testThreshold.value) {
      break;
    }

    // Stop scrolling if we have reached the end of the scroll value.
    testScroll = testIsAxisX ? getScrollLeft(testElement) : getScrollTop(testElement);
    hasReachedEnd =
      FORWARD & scrollRequest.direction ? testScroll >= testMaxScroll : testScroll <= 0;
    if (hasReachedEnd) {
      break;
    }

    // Scrolling can continue, let's update the values.
    scrollRequest.maxValue = testMaxScroll;
    scrollRequest.threshold = testThreshold.value;
    scrollRequest.distance = testDistance;
    scrollRequest.isEnding = false;
    return true;
  }

  // Let's start the end procedure. The request has now "officially" stopped,
  // but we don't want to make the scroll stop instantly. Let's smoothly reduce
  // the speed to zero.
  scrollRequest.isEnding = true;

  // If smooth stop is not supported we can immediately stop scrolling.
  if (!settings.smoothStop) return false;

  // We stop scrolling immediately when speed is zero.
  if (scrollRequest.speed <= 0) return false;

  // We can also stop scrolling immediately when scroll has reached the end.
  // Note that we intentionally do not update the scroll request's data when
  // it is in ending mode, as there really is no need to. We just want the
  // scroll to slow down and stop with the values it has.
  if (hasReachedEnd === null) hasReachedEnd = scrollRequest.hasReachedEnd();
  return hasReachedEnd ? false : true;
};

AutoScroller.prototype._updateRequests = function() {
  var items = this._items;
  var requestsX = this._requests[AXIS_X];
  var requestsY = this._requests[AXIS_Y];
  var item, reqX, reqY, checkTime, needsCheck, checkX, checkY;

  for (var i = 0; i < items.length; i++) {
    item = items[i];
    checkTime = this._requestOverlapCheck[item._id];
    needsCheck = checkTime > 0 && this._tickTime - checkTime > OVERLAP_CHECK_INTERVAL;

    checkX = true;
    reqX = requestsX[item._id];
    if (reqX && reqX.isActive) {
      checkX = !this._updateScrollRequest(reqX);
      if (checkX) {
        needsCheck = true;
        this._cancelItemScroll(item, AXIS_X);
      }
    }

    checkY = true;
    reqY = requestsY[item._id];
    if (reqY && reqY.isActive) {
      checkY = !this._updateScrollRequest(reqY);
      if (checkY) {
        needsCheck = true;
        this._cancelItemScroll(item, AXIS_Y);
      }
    }

    if (needsCheck) {
      this._requestOverlapCheck[item._id] = 0;
      this._checkItemOverlap(item, checkX, checkY);
    }
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

  if (!action) action = ACTION_POOL.pick();
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
  // synchronously synced after scroll.
  syncItems.length = 0;
  for (i = 0; i < actions.length; i++) {
    action = actions[i];
    action.computeScrollValues();
    for (j = 0; j < items.length; j++) {
      item = items[j];
      if (getItemAutoScrollSettings(item).syncAfterScroll === false) continue;
      if (syncItems.indexOf(item) > -1) continue;
      if (!isAffectedByScroll(item.getElement(), action.element)) continue;
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
      ACTION_POOL.release(actions[i]);
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
    this._requestOverlapCheck[item._id] = this._tickTime;
    this._dragPositions[item._id] = [];
    if (!this._isTicking) this._startTicking();
  }
};

AutoScroller.prototype.updateItem = function(item) {
  this._dragPositions[item._id].unshift(item._drag._left, item._drag._top);
  if (this._dragPositions.length > 4) {
    this._dragPositions.length = 4;
  }

  if (!this._requestOverlapCheck[item._id]) {
    this._requestOverlapCheck[item._id] = this._tickTime;
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

  delete this._requestOverlapCheck[itemId];
  delete this._dragPositions[itemId];
  this._items.splice(index, 1);

  if (this._isTicking && !this._items.length) {
    this._stopTicking();
  }
};

AutoScroller.prototype.isItemScrollingX = function(item) {
  var reqX = this._requests[AXIS_X][item._id];
  return !!(reqX && reqX.isActive);
};

AutoScroller.prototype.isItemScrollingY = function(item) {
  var reqY = this._requests[AXIS_Y][item._id];
  return !!(reqY && reqY.isActive);
};

AutoScroller.prototype.isItemScrolling = function(item) {
  return this.isItemScrollingX(item) || this.isItemScrollingY(item);
};
