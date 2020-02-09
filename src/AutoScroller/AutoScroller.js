/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/AutoScroller/LICENSE.md
 */

/**
 * TODO: Might be a good idea to allow providing a delay before the scrolling
 * starts, especially for the cases where you move the item between grids.
 * And/or a separate startThreshold and endThreshold, althouhg if we have
 * dynamic threshold you could dynamically modify the threshold after start.
 *
 * TODO: How should we handle cases where the dragged item is larger than the
 * scrollable element? Should we disallow scrolling in that case? Or maybe
 * there could be another mode where we look at the center of the dragged item
 * instead of the edge?
 *
 * TODO: We should probably allow providing threshold as a function to allow
 * defining the threshold based on the scroll element's and dragged element's
 * dimensions and position.
 *
 * TODO: See if values can be cached more efficiently here.
 *
 * TODO: Option: define the maximum amount of items that can autoscroll
 * simultaneously?
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
  applyItemDragScroll
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
  this._needsOverlapCheck = {};
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
  var scrollItems = isFunction(settings.elements) ? settings.elements(item) : settings.elements;
  var threshold = settings.threshold;

  if (!scrollItems || !scrollItems.length) {
    checkX && this._cancelItemScroll(item, AXIS_X);
    checkY && this._cancelItemScroll(item, AXIS_Y);
    return;
  }

  var itemRect = RECT_1;
  var testRect = RECT_2;

  var scrollItem = null;
  var testElement = null;
  var testAxisX = true;
  var testAxisY = true;
  var testScore = 0;
  var testPriority = 0;
  var testThreshold = 0;
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
    testAxisX = checkX && scrollItem.axis !== AXIS_Y;
    testAxisY = checkY && scrollItem.axis !== AXIS_X;
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
      testDirection = null;
      distanceToLeft = itemRect.left - testRect.left;
      distanceToRight = testRect.right - itemRect.right;

      if (distanceToRight < distanceToLeft) {
        if (distanceToRight <= testThreshold && getScrollLeft(testElement) < testMaxScrollX) {
          testDistance = distanceToRight;
          testDirection = RIGHT;
        }
      } else {
        if (distanceToLeft <= testThreshold && getScrollLeft(testElement) > 0) {
          testDistance = distanceToLeft;
          testDirection = LEFT;
        }
      }

      if (testDirection !== null) {
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
      testDirection = null;
      distanceToTop = itemRect.top - testRect.top;
      distanceToBottom = testRect.bottom - itemRect.bottom;

      if (distanceToBottom < distanceToTop) {
        if (distanceToBottom <= testThreshold && getScrollTop(testElement) < testMaxScrollY) {
          testDistance = distanceToBottom;
          testDirection = DOWN;
        }
      } else {
        if (distanceToTop <= testThreshold && getScrollTop(testElement) > 0) {
          testDistance = distanceToTop;
          testDirection = UP;
        }
      }

      if (testDirection !== null) {
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
  var scrollItems = isFunction(settings.elements) ? settings.elements(item) : settings.elements;
  var threshold = settings.threshold;

  // Quick exit if no scroll items are found.
  if (!scrollItems || !scrollItems.length) {
    return false;
  }

  var itemRect = RECT_1;
  var testRect = RECT_2;

  var scrollItem = null;
  var testElement = null;
  var testIsAxisX = false;
  var testScore = 0;
  var testThreshold = 0;
  var testDistance = 0;
  var testScroll = 0;
  var testMaxScroll = 0;

  itemRect.width = item._width;
  itemRect.height = item._height;
  itemRect.left = item._drag._clientX;
  itemRect.right = itemRect.left + itemRect.width;
  itemRect.top = item._drag._clientY;
  itemRect.bottom = itemRect.top + itemRect.height;

  for (var i = 0; i < scrollItems.length; i++) {
    scrollItem = scrollItems[i];

    // Make sure we have a matching element.
    testElement = getScrollElement(scrollItem.element || scrollItem);
    if (testElement !== scrollRequest.element) continue;

    // Make sure we have a matching axis.
    testIsAxisX = !!(AXIS_X & scrollRequest.direction);
    if (testIsAxisX) {
      if (scrollItem.axis === AXIS_Y) continue;
    } else {
      if (scrollItem.axis === AXIS_X) continue;
    }

    // Stop scrolling if there is no room to scroll anymore.
    testMaxScroll = testIsAxisX ? getScrollLeftMax(testElement) : getScrollTopMax(testElement);
    if (testMaxScroll <= 0) {
      break;
    }

    testThreshold = typeof scrollItem.threshold === 'number' ? scrollItem.threshold : threshold;
    testRect = getContentRect(testElement, testRect);
    testScore = getIntersectionScore(itemRect, testRect);

    // Stop scrolling if dragged item is not overlapping with the scroll
    // element anymore.
    if (testScore <= 0) {
      break;
    }

    // Compute distance (based on current direction).
    if (scrollRequest.direction === LEFT) {
      testDistance = itemRect.left - testRect.left;
    } else if (scrollRequest.direction === RIGHT) {
      testDistance = testRect.right - itemRect.right;
    } else if (scrollRequest.direction === UP) {
      testDistance = itemRect.top - testRect.top;
    } else {
      testDistance = testRect.bottom - itemRect.bottom;
    }

    // Stop scrolling if threshold is not exceeded.
    if (testDistance > testThreshold) {
      break;
    }

    // Stop scrolling if we have reached the end of the scroll value.
    testScroll = testIsAxisX ? getScrollLeft(testElement) : getScrollTop(testElement);
    if (FORWARD & scrollRequest.direction ? testScroll >= testMaxScroll : testScroll <= 0) {
      break;
    }

    // Scrolling can continue, let's update the values.
    scrollRequest.maxValue = testMaxScroll;
    scrollRequest.threshold = testThreshold;
    scrollRequest.distance = testDistance;
    return true;
  }

  // If we reached this point it means scrolling can't continue.
  return false;
};

AutoScroller.prototype._updateRequests = function() {
  var xReqs = this._requests[AXIS_X];
  var yReqs = this._requests[AXIS_Y];
  var item, reqX, reqY, needsCheck, checkX, checkY;

  for (var i = 0; i < this._items.length; i++) {
    item = this._items[i];
    needsCheck = this._needsOverlapCheck[item._id];

    this._needsOverlapCheck[item._id] = false;

    checkX = true;
    reqX = xReqs[item._id];
    if (reqX && reqX.isActive) {
      checkX = !this._updateScrollRequest(reqX);
      if (checkX) {
        reqX.isEnding = true;
        if (reqX.speed > 0) {
          checkX = false;
        } else {
          needsCheck = true;
          this._cancelItemScroll(item, AXIS_X);
        }
      }
    }

    checkY = true;
    reqY = yReqs[item._id];
    if (reqY && reqY.isActive) {
      checkY = !this._updateScrollRequest(reqY);
      if (checkY) {
        reqY.isEnding = true;
        if (reqY.speed > 0) {
          checkY = false;
        } else {
          needsCheck = true;
          this._cancelItemScroll(item, AXIS_Y);
        }
      }
    }

    if (needsCheck) {
      this._checkItemOverlap(this._items[i], checkX, checkY);
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
  // synchronously synced after scroll (this operation causes)
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
    this._needsOverlapCheck[item._id] = true;
    if (!this._isTicking) this._startTicking();
  }
};

AutoScroller.prototype.updateItem = function(item) {
  // TODO: This should be throttled/debounced if the item is not currently
  // scrolling. If the item is scrolling currently this will have no effect
  // at all.
  this._needsOverlapCheck[item._id] = true;
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

  delete this._needsOverlapCheck[itemId];
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
