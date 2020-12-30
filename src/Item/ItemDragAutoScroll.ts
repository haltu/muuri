/**
 * Muuri AutoScroller
 * Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { addAutoScrollTick, cancelAutoScrollTick } from '../ticker';
import Grid from '../Grid/Grid';
import Item, { ItemInternal } from './Item';
import { ItemDragInternal } from './ItemDrag';
import { DraggerStartEvent, DraggerMoveEvent } from '../Dragger/Dragger';
import getIntersectionScore from '../utils/getIntersectionScore';
import getStyleAsFloat from '../utils/getStyleAsFloat';
import isFunction from '../utils/isFunction';
import { Rect, RectExtended } from '../types';

//
// Constants
//

const R1: RectExtended = {
  width: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

const R2: RectExtended = { ...R1 };

const SPEED_DATA: AutoScrollSpeedData = {
  direction: 0,
  threshold: 0,
  distance: 0,
  value: 0,
  maxValue: 0,
  duration: 0,
  speed: 0,
  deltaTime: 0,
  isEnding: false,
};

export const AXIS_X = 1;
export const AXIS_Y = 2;
export const FORWARD = 4;
export const BACKWARD = 8;
export const DIR_LEFT = (AXIS_X | BACKWARD) as 9;
export const DIR_RIGHT = (AXIS_X | FORWARD) as 5;
export const DIR_UP = (AXIS_Y | BACKWARD) as 10;
export const DIR_DOWN = (AXIS_Y | FORWARD) as 6;

//
// Types
//

type AutoScrollItemId = number | string;

export type AutoScrollAxis = typeof AXIS_X | typeof AXIS_Y;

export type AutoScrollDirectionX = typeof DIR_LEFT | typeof DIR_RIGHT;

export type AutoScrollDirectionY = typeof DIR_UP | typeof DIR_DOWN;

export type AutoScrollDirection = AutoScrollDirectionX | AutoScrollDirectionY;

export type AutoScrollHandleCallback = (
  item: Item,
  itemClientX: number,
  itemClientY: number,
  itemWidth: number,
  itemHeight: number,
  pointerClientX: number,
  pointerClientY: number
) => Rect;

export interface AutoScrollSpeedData {
  direction: AutoScrollDirection | 0;
  threshold: number;
  distance: number;
  value: number;
  maxValue: number;
  duration: number;
  speed: number;
  deltaTime: number;
  isEnding: boolean;
}

export type AutoScrollSpeedCallback = (
  item: Item,
  scrollElement: Window | HTMLElement,
  scrollData: AutoScrollSpeedData
) => number;

export interface AutoScrollTarget {
  element: Window | HTMLElement;
  axis?: number;
  priority?: number;
  threshold?: number;
}

export type AutoScrollEventCallback = (
  item: Item,
  scrollElement: Window | HTMLElement,
  scrollDirection: AutoScrollDirection | 0
) => void;

//
// Utils
//

export function pointerHandle(pointerSize: number): AutoScrollHandleCallback {
  const rect = { left: 0, top: 0, width: 0, height: 0 };
  const size = pointerSize || 1;
  return function (_item, _x, _y, _w, _h, pX, pY) {
    rect.left = pX - size * 0.5;
    rect.top = pY - size * 0.5;
    rect.width = size;
    rect.height = size;
    return rect;
  };
}

export function smoothSpeed(
  maxSpeed: number,
  acceleration: number,
  deceleration: number
): AutoScrollSpeedCallback {
  return function (_item, _element, data) {
    let targetSpeed = 0;
    if (!data.isEnding) {
      if (data.threshold > 0) {
        const factor = data.threshold - Math.max(0, data.distance);
        targetSpeed = (maxSpeed / data.threshold) * factor;
      } else {
        targetSpeed = maxSpeed;
      }
    }

    const currentSpeed = data.speed;
    if (currentSpeed === targetSpeed) return targetSpeed;

    let nextSpeed = targetSpeed;
    if (currentSpeed < targetSpeed) {
      nextSpeed = currentSpeed + acceleration * (data.deltaTime / 1000);
      return Math.min(targetSpeed, nextSpeed);
    } else {
      nextSpeed = currentSpeed - deceleration * (data.deltaTime / 1000);
      return Math.max(targetSpeed, nextSpeed);
    }
  };
}

function isWindow(value: any): value is Window {
  return value === window;
}

function getScrollElement(element: HTMLElement | Window) {
  if (isWindow(element) || element === document.documentElement || element === document.body) {
    return window;
  } else {
    return element;
  }
}

function getScrollLeft(element: HTMLElement | Window) {
  return isWindow(element) ? element.pageXOffset : element.scrollLeft;
}

function getScrollTop(element: HTMLElement | Window) {
  return isWindow(element) ? element.pageYOffset : element.scrollTop;
}

function getScrollLeftMax(element: HTMLElement | Window) {
  if (isWindow(element)) {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  } else {
    return element.scrollWidth - element.clientWidth;
  }
}

function getScrollTopMax(element: HTMLElement | Window) {
  if (isWindow(element)) {
    return document.documentElement.scrollHeight - document.documentElement.clientHeight;
  } else {
    return element.scrollHeight - element.clientHeight;
  }
}

/**
 * Get window's or element's client rectangle data relative to the element's
 * content dimensions (includes inner size + padding, excludes scrollbars,
 * borders and margins).
 */
function getContentRect(
  element: HTMLElement | Window,
  result: RectExtended = { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 }
) {
  if (isWindow(element)) {
    result.width = document.documentElement.clientWidth;
    result.height = document.documentElement.clientHeight;
    result.left = 0;
    result.right = result.width;
    result.top = 0;
    result.bottom = result.height;
  } else {
    const { left, top } = element.getBoundingClientRect();
    const borderLeft = element.clientLeft || getStyleAsFloat(element, 'border-left-width');
    const borderTop = element.clientTop || getStyleAsFloat(element, 'border-top-width');
    result.width = element.clientWidth;
    result.height = element.clientHeight;
    result.left = left + borderLeft;
    result.right = result.left + result.width;
    result.top = top + borderTop;
    result.bottom = result.top + result.height;
  }

  return result;
}

function getItemAutoScrollSettings(item: Item) {
  return (item.getGrid() as Grid).settings.dragAutoScroll;
}

function prepareItemScrollSync(item: Item) {
  const drag = ((item as any) as ItemInternal)._drag as ItemDragInternal | null;
  if (drag) drag._prepareScroll();
}

function applyItemScrollSync(item: Item) {
  if (!item.isActive()) return;

  const drag = ((item as any) as ItemInternal)._drag as ItemDragInternal | null;
  if (!drag) return;

  drag._scrollDiffX = drag._scrollDiffY = 0;
  ((item as any) as ItemInternal)._setTranslate(drag._translateX, drag._translateY);
}

function computeThreshold(idealThreshold: number, targetSize: number) {
  return Math.min(targetSize / 2, idealThreshold);
}

function computeEdgeOffset(
  threshold: number,
  safeZone: number,
  itemSize: number,
  targetSize: number
) {
  return Math.max(0, itemSize + threshold * 2 + targetSize * safeZone - targetSize) / 2;
}

//
// ObjectPool
//

class ObjectPool<T> {
  protected _pool: T[];
  protected _createObject: () => T;
  protected _onRelease: ((object: T) => void) | undefined;

  constructor(createObject: () => T, onRelease?: (object: T) => void) {
    this._pool = [];
    this._createObject = createObject;
    this._onRelease = onRelease;
  }

  pick() {
    return this._pool.pop() || this._createObject();
  }

  release(object: T) {
    if (this._pool.indexOf(object) !== -1) return;
    this._onRelease && this._onRelease(object);
    this._pool.push(object);
  }

  reset() {
    this._pool.length = 0;
  }
}

//
// ScrollAction
//

class ScrollAction {
  element: HTMLElement | Window | null;
  requestX: ScrollRequest | null;
  requestY: ScrollRequest | null;
  scrollLeft: number;
  scrollTop: number;

  constructor() {
    this.element = null;
    this.requestX = null;
    this.requestY = null;
    this.scrollLeft = 0;
    this.scrollTop = 0;
  }

  reset() {
    if (this.requestX) this.requestX.action = null;
    if (this.requestY) this.requestY.action = null;
    this.element = null;
    this.requestX = null;
    this.requestY = null;
    this.scrollLeft = 0;
    this.scrollTop = 0;
  }

  addRequest(request: ScrollRequest) {
    if (AXIS_X & request.direction) {
      this.requestX && this.removeRequest(this.requestX);
      this.requestX = request;
    } else {
      this.requestY && this.removeRequest(this.requestY);
      this.requestY = request;
    }
    request.action = this;
  }

  removeRequest(request: ScrollRequest) {
    if (this.requestX === request) {
      this.requestX = null;
      request.action = null;
    } else if (this.requestY === request) {
      this.requestY = null;
      request.action = null;
    }
  }

  computeScrollValues() {
    if (!this.element) return;
    this.scrollLeft = this.requestX ? this.requestX.value : getScrollLeft(this.element);
    this.scrollTop = this.requestY ? this.requestY.value : getScrollTop(this.element);
  }

  scroll() {
    if (!this.element) return;

    if (this.element.scrollTo) {
      this.element.scrollTo(this.scrollLeft, this.scrollTop);
    } else {
      (this.element as HTMLElement).scrollLeft = this.scrollLeft;
      (this.element as HTMLElement).scrollTop = this.scrollTop;
    }
  }
}

//
// ScrollRequest
//

class ScrollRequest {
  item: Item | null;
  element: HTMLElement | Window | null;
  isActive: boolean;
  isEnding: boolean;
  direction: AutoScrollDirection | 0;
  value: number;
  maxValue: number;
  threshold: number;
  distance: number;
  deltaTime: number;
  speed: number;
  duration: number;
  action: ScrollAction | null;

  constructor() {
    this.item = null;
    this.element = null;
    this.isActive = false;
    this.isEnding = false;
    this.direction = 0;
    this.value = NaN;
    this.maxValue = 0;
    this.threshold = 0;
    this.distance = 0;
    this.deltaTime = 0;
    this.speed = 0;
    this.duration = 0;
    this.action = null;
  }

  reset() {
    if (this.isActive) this.onStop();
    this.item = null;
    this.element = null;
    this.isActive = false;
    this.isEnding = false;
    this.direction = 0;
    this.value = NaN;
    this.maxValue = 0;
    this.threshold = 0;
    this.distance = 0;
    this.deltaTime = 0;
    this.speed = 0;
    this.duration = 0;
    this.action = null;
  }

  hasReachedEnd() {
    return FORWARD & this.direction ? this.value >= this.maxValue : this.value <= 0;
  }

  computeCurrentScrollValue() {
    if (!this.element) return 0;

    if (this.value !== this.value) {
      return AXIS_X & this.direction ? getScrollLeft(this.element) : getScrollTop(this.element);
    }

    return Math.max(0, Math.min(this.value, this.maxValue));
  }

  computeNextScrollValue() {
    const delta = this.speed * (this.deltaTime / 1000);
    const nextValue = FORWARD & this.direction ? this.value + delta : this.value - delta;
    return Math.max(0, Math.min(nextValue, this.maxValue));
  }

  computeSpeed() {
    if (!this.item || !this.element) return 0;
    const speed = getItemAutoScrollSettings(this.item).speed;
    if (isFunction(speed)) {
      SPEED_DATA.direction = this.direction;
      SPEED_DATA.threshold = this.threshold;
      SPEED_DATA.distance = this.distance;
      SPEED_DATA.value = this.value;
      SPEED_DATA.maxValue = this.maxValue;
      SPEED_DATA.duration = this.duration;
      SPEED_DATA.speed = this.speed;
      SPEED_DATA.deltaTime = this.deltaTime;
      SPEED_DATA.isEnding = this.isEnding;
      return speed(this.item, this.element, SPEED_DATA);
    } else {
      return speed;
    }
  }

  tick(deltaTime: number) {
    if (!this.isActive) {
      this.isActive = true;
      this.onStart();
    }
    this.deltaTime = deltaTime;
    this.value = this.computeCurrentScrollValue();
    this.speed = this.computeSpeed();
    this.value = this.computeNextScrollValue();
    this.duration += deltaTime;
    return this.value;
  }

  onStart() {
    if (!this.item || !this.element) return;
    const { onStart } = getItemAutoScrollSettings(this.item);
    if (isFunction(onStart)) onStart(this.item, this.element, this.direction);
  }

  onStop() {
    if (!this.item || !this.element) return;
    const { onStop } = getItemAutoScrollSettings(this.item);
    if (isFunction(onStop)) onStop(this.item, this.element, this.direction);
    // Manually nudge sort to happen. There's a good chance that the item is
    // still after the scroll stops which means that the next sort will be
    // triggered only after the item is moved or it's parent scrolled.
    const drag = ((this.item as any) as ItemInternal)._drag;
    if (drag) drag.sort();
  }
}

//
// ItemDragAutoScroll
//

export default class ItemDragAutoScroll {
  protected _isDestroyed: boolean;
  protected _isTicking: boolean;
  protected _tickTime: number;
  protected _tickDeltaTime: number;
  protected _items: Item[];
  protected _actions: ScrollAction[];
  protected _requests: {
    [AXIS_X]: Map<AutoScrollItemId, ScrollRequest>;
    [AXIS_Y]: Map<AutoScrollItemId, ScrollRequest>;
  };
  protected _requestOverlapCheck: Map<AutoScrollItemId, number>;
  protected _dragPositions: Map<AutoScrollItemId, [number, number]>;
  protected _dragDirections: Map<
    AutoScrollItemId,
    [AutoScrollDirectionX | 0, AutoScrollDirectionY | 0]
  >;
  protected _overlapCheckInterval: number;
  protected _requestPool: ObjectPool<ScrollRequest>;
  protected _actionPool: ObjectPool<ScrollAction>;

  constructor() {
    this._isDestroyed = false;
    this._isTicking = false;
    this._tickTime = 0;
    this._tickDeltaTime = 0;
    this._items = [];
    this._actions = [];
    this._requests = {
      [AXIS_X]: new Map(),
      [AXIS_Y]: new Map(),
    };
    this._requestOverlapCheck = new Map();
    this._dragPositions = new Map();
    this._dragDirections = new Map();
    this._overlapCheckInterval = 150;
    this._requestPool = new ObjectPool<ScrollRequest>(
      () => new ScrollRequest(),
      (request) => request.reset()
    );
    this._actionPool = new ObjectPool<ScrollAction>(
      () => new ScrollAction(),
      (action) => action.reset()
    );

    this._readTick = this._readTick.bind(this);
    this._writeTick = this._writeTick.bind(this);
  }

  static AXIS_X = AXIS_X;
  static AXIS_Y = AXIS_Y;
  static DIR_LEFT = DIR_LEFT;
  static DIR_RIGHT = DIR_RIGHT;
  static DIR_UP = DIR_UP;
  static DIR_DOWN = DIR_DOWN;
  static smoothSpeed = smoothSpeed;
  static pointerHandle = pointerHandle;

  isDestroyed() {
    return this._isDestroyed;
  }

  addItem(item: Item, posX: number, posY: number) {
    if (this._isDestroyed) return;
    const index = this._items.indexOf(item);
    if (index === -1) {
      this._items.push(item);
      this._requestOverlapCheck.set(item.id, this._tickTime);
      this._dragDirections.set(item.id, [0, 0]);
      this._dragPositions.set(item.id, [posX, posY]);
      if (!this._isTicking) this._startTicking();
    }
  }

  updateItem(item: Item, posX: number, posY: number) {
    if (this._isDestroyed) return;

    // Make sure the item still exists in the auto-scroller.
    const dragPositions = this._dragPositions.get(item.id);
    const dragDirections = this._dragDirections.get(item.id);
    if (!dragPositions || !dragDirections) return;

    const prevX = dragPositions[0];
    const prevY = dragPositions[1];

    // Update direction.
    dragDirections[0] = posX > prevX ? DIR_RIGHT : posX < prevX ? DIR_LEFT : dragDirections[0] || 0;
    dragDirections[1] = posY > prevY ? DIR_DOWN : posY < prevY ? DIR_UP : dragDirections[1] || 0;

    // Update position.
    dragPositions[0] = posX;
    dragPositions[1] = posY;

    // Update overlap check.
    this._requestOverlapCheck.set(
      item.id,
      this._requestOverlapCheck.get(item.id) || this._tickTime
    );
  }

  removeItem(item: Item) {
    if (this._isDestroyed) return;

    const index = this._items.indexOf(item);
    if (index === -1) return;

    const itemId = item.id;

    const reqX = this._requests[AXIS_X].get(itemId);
    if (reqX) {
      this._cancelItemScroll(item, AXIS_X);
      this._requests[AXIS_X].delete(itemId);
    }

    const reqY = this._requests[AXIS_Y].get(itemId);
    if (reqY) {
      this._cancelItemScroll(item, AXIS_Y);
      this._requests[AXIS_Y].delete(itemId);
    }

    this._requestOverlapCheck.delete(itemId);
    this._dragPositions.delete(itemId);
    this._dragDirections.delete(itemId);
    this._items.splice(index, 1);

    if (this._isTicking && !this._items.length) {
      this._stopTicking();
    }
  }

  isItemScrollingX(item: Item) {
    const reqX = this._requests[AXIS_X].get(item.id);
    return !!(reqX && reqX.isActive);
  }

  isItemScrollingY(item: Item) {
    const reqY = this._requests[AXIS_Y].get(item.id);
    return !!(reqY && reqY.isActive);
  }

  isItemScrolling(item: Item) {
    return this.isItemScrollingX(item) || this.isItemScrollingY(item);
  }

  destroy() {
    if (this._isDestroyed) return;

    const items = this._items.slice(0);
    let i = 0;
    for (; i < items.length; i++) {
      this.removeItem(items[i]);
    }

    this._actions.length = 0;
    this._requestPool.reset();
    this._actionPool.reset();

    this._isDestroyed = true;
  }

  protected _readTick(time: number) {
    if (this._isDestroyed) return;
    if (time && this._tickTime) {
      this._tickDeltaTime = time - this._tickTime;
      this._tickTime = time;
      this._updateRequests();
      this._updateActions();
    } else {
      this._tickTime = time;
      this._tickDeltaTime = 0;
    }
  }

  protected _writeTick() {
    if (this._isDestroyed) return;
    this._applyActions();
    addAutoScrollTick(this._readTick, this._writeTick);
  }

  protected _startTicking() {
    this._isTicking = true;
    addAutoScrollTick(this._readTick, this._writeTick);
  }

  protected _stopTicking() {
    this._isTicking = false;
    this._tickTime = 0;
    this._tickDeltaTime = 0;
    cancelAutoScrollTick();
  }

  protected _getItemHandleRect(
    item: Item,
    handle: AutoScrollHandleCallback | null,
    rect: RectExtended = { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 }
  ) {
    const drag = (((item as any) as ItemInternal)._drag as any) as ItemDragInternal;

    if (handle) {
      const ev = (drag._dragMoveEvent || drag._dragStartEvent) as
        | DraggerStartEvent
        | DraggerMoveEvent;

      const data = handle(
        item,
        drag._clientX,
        drag._clientY,
        item.width,
        item.height,
        ev.clientX,
        ev.clientY
      );

      rect.left = data.left;
      rect.top = data.top;
      rect.width = data.width;
      rect.height = data.height;
    } else {
      rect.left = drag._clientX;
      rect.top = drag._clientY;
      rect.width = item.width;
      rect.height = item.height;
    }

    rect.right = rect.left + rect.width;
    rect.bottom = rect.top + rect.height;

    return rect;
  }

  protected _requestItemScroll(
    item: Item,
    axis: AutoScrollAxis,
    element: Window | HTMLElement,
    direction: AutoScrollDirection,
    threshold: number,
    distance: number,
    maxValue: number
  ) {
    const reqMap = this._requests[axis];
    let request = reqMap.get(item.id);

    if (request) {
      if (request.element !== element || request.direction !== direction) {
        request.reset();
      }
    } else {
      request = this._requestPool.pick();
    }

    request.item = item;
    request.element = element;
    request.direction = direction;
    request.threshold = threshold;
    request.distance = distance;
    request.maxValue = maxValue;

    reqMap.set(item.id, request);
  }

  protected _cancelItemScroll(item: Item, axis: AutoScrollAxis) {
    const reqMap = this._requests[axis];
    const request = reqMap.get(item.id);
    if (!request) return;

    if (request.action) request.action.removeRequest(request);
    this._requestPool.release(request);
    reqMap.delete(item.id);
  }

  protected _checkItemOverlap(item: Item, checkX: boolean, checkY: boolean) {
    const settings = getItemAutoScrollSettings(item);
    const { threshold, safeZone, handle, targets: _targets } = settings;

    const targets = typeof _targets === 'function' ? _targets(item) : _targets;
    if (!targets || !targets.length) {
      checkX && this._cancelItemScroll(item, AXIS_X);
      checkY && this._cancelItemScroll(item, AXIS_Y);
      return;
    }

    const dragDirections = this._dragDirections.get(item.id);
    const dragDirectionX = (dragDirections && dragDirections[0]) || 0;
    const dragDirectionY = (dragDirections && dragDirections[1]) || 0;
    if (!dragDirectionX && !dragDirectionY) {
      checkX && this._cancelItemScroll(item, AXIS_X);
      checkY && this._cancelItemScroll(item, AXIS_Y);
      return;
    }

    const itemRect = this._getItemHandleRect(item, handle, R1);

    let xElement: Window | HTMLElement | null = null;
    let xPriority = -Infinity;
    let xThreshold = 0;
    let xScore = 0;
    let xDirection: AutoScrollDirectionX | 0 = 0;
    let xDistance = 0;
    let xMaxScroll = 0;

    let yElement: Window | HTMLElement | null = null;
    let yPriority = -Infinity;
    let yThreshold = 0;
    let yScore = 0;
    let yDirection: AutoScrollDirectionY | 0 = 0;
    let yDistance = 0;
    let yMaxScroll = 0;

    let i = 0;
    for (; i < targets.length; i++) {
      const target = targets[i];
      const targetThreshold = target.threshold || threshold;
      const testAxisX = !!(checkX && dragDirectionX && target.axis !== AXIS_Y);
      const testAxisY = !!(checkY && dragDirectionY && target.axis !== AXIS_X);
      const testPriority = target.priority || 0;

      // Ignore this item if it's x-axis and y-axis priority is lower than
      // the currently matching item's.
      if ((!testAxisX || testPriority < xPriority) && (!testAxisY || testPriority < yPriority)) {
        continue;
      }

      const testElement = getScrollElement(target.element || target);
      const testMaxScrollX = testAxisX ? getScrollLeftMax(testElement) : -1;
      const testMaxScrollY = testAxisY ? getScrollTopMax(testElement) : -1;

      // Ignore this item if there is no possibility to scroll.
      if (!testMaxScrollX && !testMaxScrollY) continue;

      const testRect = getContentRect(testElement, R2);
      const testScore = getIntersectionScore(itemRect, testRect);

      // Ignore this item if it's not overlapping at all with the dragged item.
      if (testScore <= 0) continue;

      // Test x-axis.
      if (
        testAxisX &&
        testPriority >= xPriority &&
        testMaxScrollX > 0 &&
        (testPriority > xPriority || testScore > xScore)
      ) {
        let testDistance = 0;
        let testDirection: AutoScrollDirectionX | 0 = 0;
        const testThreshold = computeThreshold(targetThreshold, testRect.width);
        const testEdgeOffset = computeEdgeOffset(
          testThreshold,
          safeZone,
          itemRect.width,
          testRect.width
        );

        if (dragDirectionX === DIR_RIGHT) {
          testDistance = testRect.right + testEdgeOffset - itemRect.right;
          if (testDistance <= testThreshold && getScrollLeft(testElement) < testMaxScrollX) {
            testDirection = DIR_RIGHT;
          }
        } else if (dragDirectionX === DIR_LEFT) {
          testDistance = itemRect.left - (testRect.left - testEdgeOffset);
          if (testDistance <= testThreshold && getScrollLeft(testElement) > 0) {
            testDirection = DIR_LEFT;
          }
        }

        if (testDirection) {
          xElement = testElement;
          xPriority = testPriority;
          xThreshold = testThreshold;
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
        let testDistance = 0;
        let testDirection: AutoScrollDirectionY | 0 = 0;
        const testThreshold = computeThreshold(targetThreshold, testRect.height);
        const testEdgeOffset = computeEdgeOffset(
          testThreshold,
          safeZone,
          itemRect.height,
          testRect.height
        );

        if (dragDirectionY === DIR_DOWN) {
          testDistance = testRect.bottom + testEdgeOffset - itemRect.bottom;
          if (testDistance <= testThreshold && getScrollTop(testElement) < testMaxScrollY) {
            testDirection = DIR_DOWN;
          }
        } else if (dragDirectionY === DIR_UP) {
          testDistance = itemRect.top - (testRect.top - testEdgeOffset);
          if (testDistance <= testThreshold && getScrollTop(testElement) > 0) {
            testDirection = DIR_UP;
          }
        }

        if (testDirection) {
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

    // Request or cancel x-axis scroll.
    if (checkX) {
      if (xElement && xDirection) {
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
      if (yElement && yDirection) {
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
  }

  protected _updateScrollRequest(scrollRequest: ScrollRequest) {
    const item = scrollRequest.item as Item;
    const {
      threshold,
      safeZone,
      smoothStop,
      handle,
      targets: _targets,
    } = getItemAutoScrollSettings(item);
    const targets = typeof _targets === 'function' ? _targets(item) : _targets;
    const targetCount = (targets && targets.length) || 0;
    const itemRect = this._getItemHandleRect(item, handle, R1);
    let hasReachedEnd = null;

    let i = 0;
    for (; i < targetCount; i++) {
      const target = targets[i];

      // Make sure we have a matching element.
      const testElement = getScrollElement(target.element || target);
      if (testElement !== scrollRequest.element) continue;

      // Make sure we have a matching axis.
      const testIsAxisX = !!(AXIS_X & scrollRequest.direction);
      if (testIsAxisX) {
        if (target.axis === AXIS_Y) continue;
      } else {
        if (target.axis === AXIS_X) continue;
      }

      // Stop scrolling if there is no room to scroll anymore.
      const testMaxScroll = testIsAxisX
        ? getScrollLeftMax(testElement)
        : getScrollTopMax(testElement);
      if (testMaxScroll <= 0) {
        break;
      }

      const testRect = getContentRect(testElement, R2);
      const testScore = getIntersectionScore(itemRect, testRect);

      // Stop scrolling if dragged item is not overlapping with the scroll
      // element anymore.
      if (testScore <= 0) {
        break;
      }

      // Compute threshold.
      const targetThreshold = typeof target.threshold === 'number' ? target.threshold : threshold;
      const testThreshold = computeThreshold(
        targetThreshold,
        testIsAxisX ? testRect.width : testRect.height
      );

      // Compute edge offset.
      const testEdgeOffset = computeEdgeOffset(
        testThreshold,
        safeZone,
        testIsAxisX ? itemRect.width : itemRect.height,
        testIsAxisX ? testRect.width : testRect.height
      );

      // Compute distance (based on current direction).
      let testDistance = 0;
      if (scrollRequest.direction === DIR_LEFT) {
        testDistance = itemRect.left - (testRect.left - testEdgeOffset);
      } else if (scrollRequest.direction === DIR_RIGHT) {
        testDistance = testRect.right + testEdgeOffset - itemRect.right;
      } else if (scrollRequest.direction === DIR_UP) {
        testDistance = itemRect.top - (testRect.top - testEdgeOffset);
      } else {
        testDistance = testRect.bottom + testEdgeOffset - itemRect.bottom;
      }

      // Stop scrolling if threshold is not exceeded.
      if (testDistance > testThreshold) {
        break;
      }

      // Stop scrolling if we have reached the end of the scroll value.
      const testScroll = testIsAxisX ? getScrollLeft(testElement) : getScrollTop(testElement);
      hasReachedEnd =
        FORWARD & scrollRequest.direction ? testScroll >= testMaxScroll : testScroll <= 0;
      if (hasReachedEnd) {
        break;
      }

      // Scrolling can continue, let's update the values.
      scrollRequest.maxValue = testMaxScroll;
      scrollRequest.threshold = testThreshold;
      scrollRequest.distance = testDistance;
      scrollRequest.isEnding = false;
      return true;
    }

    // Before we end the request, let's see if we need to stop the scrolling
    // smoothly or immediately.
    if (smoothStop === true && scrollRequest.speed > 0) {
      if (hasReachedEnd === null) hasReachedEnd = scrollRequest.hasReachedEnd();
      scrollRequest.isEnding = hasReachedEnd ? false : true;
    } else {
      scrollRequest.isEnding = false;
    }

    return scrollRequest.isEnding;
  }

  protected _updateRequests() {
    const items = this._items;
    const requestsX = this._requests[AXIS_X];
    const requestsY = this._requests[AXIS_Y];

    let i = 0;
    for (; i < items.length; i++) {
      const item = items[i];
      const checkTime = this._requestOverlapCheck.get(item.id) || 0;
      let needsCheck = checkTime > 0 && this._tickTime - checkTime > this._overlapCheckInterval;

      let checkX = true;
      const reqX = requestsX.get(item.id);
      if (reqX && reqX.isActive) {
        checkX = !this._updateScrollRequest(reqX);
        if (checkX) {
          needsCheck = true;
          this._cancelItemScroll(item, AXIS_X);
        }
      }

      let checkY = true;
      const reqY = requestsY.get(item.id);
      if (reqY && reqY.isActive) {
        checkY = !this._updateScrollRequest(reqY);
        if (checkY) {
          needsCheck = true;
          this._cancelItemScroll(item, AXIS_Y);
        }
      }

      if (needsCheck) {
        this._requestOverlapCheck.set(item.id, 0);
        this._checkItemOverlap(item, checkX, checkY);
      }
    }
  }

  protected _requestAction(request: ScrollRequest, axis: AutoScrollAxis) {
    const actions = this._actions;
    const isAxisX = axis === AXIS_X;
    let action: ScrollAction | null = null;

    let i = 0;
    for (; i < actions.length; i++) {
      action = actions[i];

      // If the action's request does not match the request's -> skip.
      if (request.element !== action.element) {
        action = null;
        continue;
      }

      // If the request and action share the same element, but the request slot
      // for the requested axis is already reserved let's ignore and cancel this
      // request.
      if (isAxisX ? action.requestX : action.requestY) {
        this._cancelItemScroll(request.item as Item, axis);
        return;
      }

      // Seems like we have found our action, let's break the loop.
      break;
    }

    if (!action) action = this._actionPool.pick();
    action.element = request.element;
    action.addRequest(request);

    request.tick(this._tickDeltaTime);
    actions.push(action);
  }

  protected _updateActions() {
    const items = this._items;
    const requests = this._requests;
    const actions = this._actions;
    let i = 0;

    // Generate actions.
    for (i = 0; i < items.length; i++) {
      const reqX = requests[AXIS_X].get(items[i].id);
      const reqY = requests[AXIS_Y].get(items[i].id);
      if (reqX) this._requestAction(reqX, AXIS_X);
      if (reqY) this._requestAction(reqY, AXIS_Y);
    }

    // Compute scroll values.
    for (i = 0; i < actions.length; i++) {
      actions[i].computeScrollValues();
    }
  }

  protected _applyActions() {
    const actions = this._actions;

    // No actions -> no scrolling.
    if (!actions.length) return;

    let i = 0;

    // Scroll all the required elements.
    for (i = 0; i < actions.length; i++) {
      actions[i].scroll();
      this._actionPool.release(actions[i]);
    }

    // Reset actions.
    actions.length = 0;

    // Sync the item position immediately after all the auto-scrolling business
    // is finished. Without this procedure the items will jitter during
    // auto-scroll (in some cases at least) since the drag scroll handler is
    // async (bound to raf tick). Note that this procedure should not emit any
    // dragScroll events, because otherwise they would be emitted twice for the
    // same event.
    const items = this._items;
    for (i = 0; i < items.length; i++) prepareItemScrollSync(items[i]);
    for (i = 0; i < items.length; i++) applyItemScrollSync(items[i]);
  }
}
