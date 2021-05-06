/**
* Muuri v1.0.0-alpha.0
* https://muuri.dev/
* Copyright (c) 2015-present, Haltu Oy
* Released under the MIT license
* https://github.com/haltu/muuri/blob/master/LICENSE.md
* @license MIT
*
* Muuri Packer
* Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*
* Muuri Ticker / Muuri Emitter / Muuri Dragger
* Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*
* Muuri AutoScroller
* Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*/

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Muuri = factory());
}(this, (function () { 'use strict';

    const GRID_INSTANCES = new Map();
    const ITEM_ELEMENT_MAP = new Map();
    const ACTION_SWAP = 'swap';
    const ACTION_MOVE = 'move';
    const INSTANT_LAYOUT = 'instant';
    const EVENT_SYNCHRONIZE = 'synchronize';
    const EVENT_LAYOUT_START = 'layoutStart';
    const EVENT_LAYOUT_END = 'layoutEnd';
    const EVENT_LAYOUT_ABORT = 'layoutAbort';
    const EVENT_ADD = 'add';
    const EVENT_REMOVE = 'remove';
    const EVENT_SHOW_START = 'showStart';
    const EVENT_SHOW_END = 'showEnd';
    const EVENT_HIDE_START = 'hideStart';
    const EVENT_HIDE_END = 'hideEnd';
    const EVENT_FILTER = 'filter';
    const EVENT_SORT = 'sort';
    const EVENT_MOVE = 'move';
    const EVENT_SEND = 'send';
    const EVENT_BEFORE_SEND = 'beforeSend';
    const EVENT_RECEIVE = 'receive';
    const EVENT_BEFORE_RECEIVE = 'beforeReceive';
    const EVENT_DRAG_INIT = 'dragInit';
    const EVENT_DRAG_START = 'dragStart';
    const EVENT_DRAG_MOVE = 'dragMove';
    const EVENT_DRAG_SCROLL = 'dragScroll';
    const EVENT_DRAG_END = 'dragEnd';
    const EVENT_DRAG_RELEASE_START = 'dragReleaseStart';
    const EVENT_DRAG_RELEASE_END = 'dragReleaseEnd';
    const EVENT_DESTROY = 'destroy';
    const HAS_TOUCH_EVENTS = 'ontouchstart' in window;
    const HAS_POINTER_EVENTS = !!window.PointerEvent;
    const UA = window.navigator.userAgent.toLowerCase();
    const IS_FIREFOX = UA.indexOf('firefox') > -1;
    const IS_SAFARI = navigator.vendor &&
        navigator.vendor.indexOf('Apple') > -1 &&
        navigator.userAgent &&
        navigator.userAgent.indexOf('CriOS') == -1 &&
        navigator.userAgent.indexOf('FxiOS') == -1;
    const IS_ANDROID = UA.indexOf('android') > -1;
    const IS_IOS = /^(iPad|iPhone|iPod)/.test(window.navigator.platform) ||
        (/^Mac/.test(window.navigator.platform) && window.navigator.maxTouchPoints > 1);
    const MAX_SAFE_FLOAT32_INTEGER = 16777216;
    const VIEWPORT_THRESHOLD = 100;
    const HAS_PASSIVE_EVENTS = (() => {
        let isPassiveEventsSupported = false;
        try {
            const passiveOpts = Object.defineProperty({}, 'passive', {
                get: function () {
                    isPassiveEventsSupported = true;
                },
            });
            window.addEventListener('testPassive', null, passiveOpts);
            window.removeEventListener('testPassive', null, passiveOpts);
        }
        catch (e) { }
        return isPassiveEventsSupported;
    })();

    const raf = (window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame).bind(window);

    class TickerLane {
        constructor() {
            this._queue = [];
            this._indices = new Map();
            this._callbacks = new Map();
        }
        add(id, callback) {
            const { _queue, _indices, _callbacks } = this;
            const index = _indices.get(id);
            if (index !== undefined)
                _queue[index] = undefined;
            _queue.push(id);
            _callbacks.set(id, callback);
            _indices.set(id, _queue.length - 1);
        }
        remove(id) {
            const { _queue, _indices, _callbacks } = this;
            const index = _indices.get(id);
            if (index === undefined)
                return;
            _queue[index] = undefined;
            _callbacks.delete(id);
            _indices.delete(id);
        }
        flush(targetQueue, targetCallbacks) {
            const { _queue, _callbacks, _indices } = this;
            let id;
            let i = 0;
            for (; i < _queue.length; i++) {
                id = _queue[i];
                if (!id || targetCallbacks.has(id))
                    continue;
                targetQueue.push(id);
                targetCallbacks.set(id, _callbacks.get(id));
            }
            _queue.length = 0;
            _callbacks.clear();
            _indices.clear();
        }
    }
    class Ticker {
        constructor(numLanes = 1) {
            this._nextStep = null;
            this._lanes = [];
            this._stepQueue = [];
            this._stepCallbacks = new Map();
            this._step = this._step.bind(this);
            let i = 0;
            for (; i < numLanes; i++) {
                this._lanes.push(new TickerLane());
            }
        }
        add(laneIndex, id, callback) {
            const lane = this._lanes[laneIndex];
            if (lane) {
                lane.add(id, callback);
                if (!this._nextStep)
                    this._nextStep = raf(this._step);
            }
        }
        remove(laneIndex, id) {
            const lane = this._lanes[laneIndex];
            if (lane)
                lane.remove(id);
        }
        _step(time) {
            const { _lanes, _stepQueue, _stepCallbacks } = this;
            let i = 0;
            this._nextStep = null;
            for (i = 0; i < _lanes.length; i++) {
                _lanes[i].flush(_stepQueue, _stepCallbacks);
            }
            for (i = 0; i < _stepQueue.length; i++) {
                _stepCallbacks.get(_stepQueue[i])(time);
            }
            _stepQueue.length = 0;
            _stepCallbacks.clear();
        }
    }

    const LAYOUT_READ = 'layoutRead';
    const LAYOUT_WRITE = 'layoutWrite';
    const VISIBILITY_READ = 'visibilityRead';
    const VISIBILITY_WRITE = 'visibilityWrite';
    const DRAG_START_READ = 'dragStartRead';
    const DRAG_START_WRITE = 'dragStartWrite';
    const DRAG_MOVE_READ = 'dragMoveRead';
    const DRAG_MOVE_WRITE = 'dragMoveWrite';
    const DRAG_SCROLL_READ = 'dragScrollRead';
    const DRAG_SCROLL_WRITE = 'dragScrollWrite';
    const DRAG_SORT_READ = 'dragSortRead';
    const RELEASE_SCROLL_READ = 'releaseScrollRead';
    const RELEASE_SCROLL_WRITE = 'releaseScrollWrite';
    const PLACEHOLDER_LAYOUT_READ = 'placeholderLayoutRead';
    const PLACEHOLDER_LAYOUT_WRITE = 'placeholderLayoutWrite';
    const PLACEHOLDER_RESIZE_WRITE = 'placeholderResizeWrite';
    const AUTO_SCROLL_READ = 'autoScrollRead';
    const AUTO_SCROLL_WRITE = 'autoScrollWrite';
    const DEBOUNCE_READ = 'debounceRead';
    const LANE_READ = 0;
    const LANE_READ_TAIL = 1;
    const LANE_WRITE = 2;
    const ticker = new Ticker(3);
    function addLayoutTick(itemId, read, write) {
        ticker.add(LANE_READ, LAYOUT_READ + itemId, read);
        ticker.add(LANE_WRITE, LAYOUT_WRITE + itemId, write);
    }
    function cancelLayoutTick(itemId) {
        ticker.remove(LANE_READ, LAYOUT_READ + itemId);
        ticker.remove(LANE_WRITE, LAYOUT_WRITE + itemId);
    }
    function addVisibilityTick(itemId, read, write) {
        ticker.add(LANE_READ, VISIBILITY_READ + itemId, read);
        ticker.add(LANE_WRITE, VISIBILITY_WRITE + itemId, write);
    }
    function cancelVisibilityTick(itemId) {
        ticker.remove(LANE_READ, VISIBILITY_READ + itemId);
        ticker.remove(LANE_WRITE, VISIBILITY_WRITE + itemId);
    }
    function addDragStartTick(itemId, read, write) {
        ticker.add(LANE_READ, DRAG_START_READ + itemId, read);
        ticker.add(LANE_WRITE, DRAG_START_WRITE + itemId, write);
    }
    function cancelDragStartTick(itemId) {
        ticker.remove(LANE_READ, DRAG_START_READ + itemId);
        ticker.remove(LANE_WRITE, DRAG_START_WRITE + itemId);
    }
    function addDragMoveTick(itemId, read, write) {
        ticker.add(LANE_READ, DRAG_MOVE_READ + itemId, read);
        ticker.add(LANE_WRITE, DRAG_MOVE_WRITE + itemId, write);
    }
    function cancelDragMoveTick(itemId) {
        ticker.remove(LANE_READ, DRAG_MOVE_READ + itemId);
        ticker.remove(LANE_WRITE, DRAG_MOVE_WRITE + itemId);
    }
    function addDragScrollTick(itemId, read, write) {
        ticker.add(LANE_READ, DRAG_SCROLL_READ + itemId, read);
        ticker.add(LANE_WRITE, DRAG_SCROLL_WRITE + itemId, write);
    }
    function cancelDragScrollTick(itemId) {
        ticker.remove(LANE_READ, DRAG_SCROLL_READ + itemId);
        ticker.remove(LANE_WRITE, DRAG_SCROLL_WRITE + itemId);
    }
    function addDragSortTick(itemId, read) {
        ticker.add(LANE_READ_TAIL, DRAG_SORT_READ + itemId, read);
    }
    function cancelDragSortTick(itemId) {
        ticker.remove(LANE_READ_TAIL, DRAG_SORT_READ + itemId);
    }
    function addReleaseScrollTick(itemId, read, write) {
        ticker.add(LANE_READ, RELEASE_SCROLL_READ + itemId, read);
        ticker.add(LANE_WRITE, RELEASE_SCROLL_WRITE + itemId, write);
    }
    function cancelReleaseScrollTick(itemId) {
        ticker.remove(LANE_READ, RELEASE_SCROLL_READ + itemId);
        ticker.remove(LANE_WRITE, RELEASE_SCROLL_WRITE + itemId);
    }
    function addPlaceholderLayoutTick(itemId, read, write) {
        ticker.add(LANE_READ, PLACEHOLDER_LAYOUT_READ + itemId, read);
        ticker.add(LANE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId, write);
    }
    function cancelPlaceholderLayoutTick(itemId) {
        ticker.remove(LANE_READ, PLACEHOLDER_LAYOUT_READ + itemId);
        ticker.remove(LANE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId);
    }
    function addPlaceholderResizeTick(itemId, write) {
        ticker.add(LANE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId, write);
    }
    function cancelPlaceholderResizeTick(itemId) {
        ticker.remove(LANE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId);
    }
    function addAutoScrollTick(read, write) {
        ticker.add(LANE_READ, AUTO_SCROLL_READ, read);
        ticker.add(LANE_WRITE, AUTO_SCROLL_WRITE, write);
    }
    function cancelAutoScrollTick() {
        ticker.remove(LANE_READ, AUTO_SCROLL_READ);
        ticker.remove(LANE_WRITE, AUTO_SCROLL_WRITE);
    }
    function addDebounceTick(debounceId, read) {
        ticker.add(LANE_READ, DEBOUNCE_READ + debounceId, read);
    }
    function cancelDebounceTick(debounceId) {
        ticker.remove(LANE_READ, DEBOUNCE_READ + debounceId);
    }

    function isOverlapping(a, b) {
        return !(a.left + a.width <= b.left ||
            b.left + b.width <= a.left ||
            a.top + a.height <= b.top ||
            b.top + b.height <= a.top);
    }

    function getIntersectionArea(a, b) {
        if (!isOverlapping(a, b))
            return 0;
        var width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
        var height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
        return width * height;
    }

    function getIntersectionScore(a, b) {
        const area = getIntersectionArea(a, b);
        if (!area)
            return 0;
        const maxArea = Math.min(a.width, b.width) * Math.min(a.height, b.height);
        return (area / maxArea) * 100;
    }

    let cache$2 = new WeakMap();
    let cacheTimer = null;
    let canClearCache = true;
    const cacheTime = 1000;
    const clearCache = function () {
        if (canClearCache) {
            canClearCache = true;
            return;
        }
        if (cacheTimer !== null) {
            window.clearInterval(cacheTimer);
            cacheTimer = null;
        }
        cache$2 = new WeakMap();
    };
    function getStyle(element, prop) {
        if (!prop)
            return '';
        let styles = cache$2.get(element);
        if (!styles) {
            styles = window.getComputedStyle(element, null);
            cache$2.set(element, styles);
        }
        if (!cacheTimer) {
            cacheTimer = window.setInterval(clearCache, cacheTime);
        }
        else {
            canClearCache = false;
        }
        return styles.getPropertyValue(prop);
    }

    function getStyleAsFloat(el, styleProp) {
        return parseFloat(getStyle(el, styleProp)) || 0;
    }

    function isFunction(val) {
        return typeof val === 'function';
    }

    const R1 = {
        width: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    };
    const R2 = Object.assign({}, R1);
    const SPEED_DATA = {
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
    const AXIS_X = 1;
    const AXIS_Y = 2;
    const FORWARD = 4;
    const BACKWARD = 8;
    const LEFT = (AXIS_X | BACKWARD);
    const RIGHT = (AXIS_X | FORWARD);
    const UP = (AXIS_Y | BACKWARD);
    const DOWN = (AXIS_Y | FORWARD);
    function pointerHandle(pointerSize) {
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
    function smoothSpeed(maxSpeed, acceleration, deceleration) {
        return function (_item, _element, data) {
            let targetSpeed = 0;
            if (!data.isEnding) {
                if (data.threshold > 0) {
                    const factor = data.threshold - Math.max(0, data.distance);
                    targetSpeed = (maxSpeed / data.threshold) * factor;
                }
                else {
                    targetSpeed = maxSpeed;
                }
            }
            const currentSpeed = data.speed;
            if (currentSpeed === targetSpeed)
                return targetSpeed;
            let nextSpeed = targetSpeed;
            if (currentSpeed < targetSpeed) {
                nextSpeed = currentSpeed + acceleration * (data.deltaTime / 1000);
                return Math.min(targetSpeed, nextSpeed);
            }
            else {
                nextSpeed = currentSpeed - deceleration * (data.deltaTime / 1000);
                return Math.max(targetSpeed, nextSpeed);
            }
        };
    }
    function isWindow(value) {
        return value === window;
    }
    function getScrollElement(element) {
        if (isWindow(element) || element === document.documentElement || element === document.body) {
            return window;
        }
        else {
            return element;
        }
    }
    function getScrollLeft(element) {
        return isWindow(element) ? element.pageXOffset : element.scrollLeft;
    }
    function getScrollTop(element) {
        return isWindow(element) ? element.pageYOffset : element.scrollTop;
    }
    function getScrollLeftMax(element) {
        if (isWindow(element)) {
            return document.documentElement.scrollWidth - document.documentElement.clientWidth;
        }
        else {
            return element.scrollWidth - element.clientWidth;
        }
    }
    function getScrollTopMax(element) {
        if (isWindow(element)) {
            return document.documentElement.scrollHeight - document.documentElement.clientHeight;
        }
        else {
            return element.scrollHeight - element.clientHeight;
        }
    }
    function getContentRect(element, result = { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 }) {
        if (isWindow(element)) {
            result.width = document.documentElement.clientWidth;
            result.height = document.documentElement.clientHeight;
            result.left = 0;
            result.right = result.width;
            result.top = 0;
            result.bottom = result.height;
        }
        else {
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
    function getItemAutoScrollSettings(item) {
        return item.getGrid().settings.dragAutoScroll;
    }
    function prepareItemScrollSync(item) {
        const drag = item._drag;
        if (drag)
            drag._prepareScroll();
    }
    function applyItemScrollSync(item) {
        if (!item.isActive())
            return;
        const drag = item._drag;
        if (!drag)
            return;
        drag._scrollDiffX = drag._scrollDiffY = 0;
        item._setTranslate(drag._translateX, drag._translateY);
    }
    function computeThreshold(idealThreshold, targetSize) {
        return Math.min(targetSize / 2, idealThreshold);
    }
    function computeEdgeOffset(threshold, safeZone, itemSize, targetSize) {
        return Math.max(0, itemSize + threshold * 2 + targetSize * safeZone - targetSize) / 2;
    }
    class ObjectPool {
        constructor(createObject, onRelease) {
            this._pool = [];
            this._createObject = createObject;
            this._onRelease = onRelease;
        }
        pick() {
            return this._pool.pop() || this._createObject();
        }
        release(object) {
            if (this._pool.indexOf(object) !== -1)
                return;
            this._onRelease && this._onRelease(object);
            this._pool.push(object);
        }
        reset() {
            this._pool.length = 0;
        }
    }
    class ScrollAction {
        constructor() {
            this.element = null;
            this.requestX = null;
            this.requestY = null;
            this.scrollLeft = 0;
            this.scrollTop = 0;
        }
        reset() {
            if (this.requestX)
                this.requestX.action = null;
            if (this.requestY)
                this.requestY.action = null;
            this.element = null;
            this.requestX = null;
            this.requestY = null;
            this.scrollLeft = 0;
            this.scrollTop = 0;
        }
        addRequest(request) {
            if (AXIS_X & request.direction) {
                this.requestX && this.removeRequest(this.requestX);
                this.requestX = request;
            }
            else {
                this.requestY && this.removeRequest(this.requestY);
                this.requestY = request;
            }
            request.action = this;
        }
        removeRequest(request) {
            if (this.requestX === request) {
                this.requestX = null;
                request.action = null;
            }
            else if (this.requestY === request) {
                this.requestY = null;
                request.action = null;
            }
        }
        computeScrollValues() {
            if (!this.element)
                return;
            this.scrollLeft = this.requestX ? this.requestX.value : getScrollLeft(this.element);
            this.scrollTop = this.requestY ? this.requestY.value : getScrollTop(this.element);
        }
        scroll() {
            if (!this.element)
                return;
            if (this.element.scrollTo) {
                this.element.scrollTo(this.scrollLeft, this.scrollTop);
            }
            else {
                this.element.scrollLeft = this.scrollLeft;
                this.element.scrollTop = this.scrollTop;
            }
        }
    }
    class ScrollRequest {
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
            if (this.isActive)
                this.onStop();
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
            if (!this.element)
                return 0;
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
            if (!this.item || !this.element)
                return 0;
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
            }
            else {
                return speed;
            }
        }
        tick(deltaTime) {
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
            if (!this.item || !this.element)
                return;
            const { onStart } = getItemAutoScrollSettings(this.item);
            if (isFunction(onStart))
                onStart(this.item, this.element, this.direction);
        }
        onStop() {
            if (!this.item || !this.element)
                return;
            const { onStop } = getItemAutoScrollSettings(this.item);
            if (isFunction(onStop))
                onStop(this.item, this.element, this.direction);
            const drag = this.item._drag;
            if (drag)
                drag.sort();
        }
    }
    class AutoScroller {
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
            this._requestPool = new ObjectPool(() => new ScrollRequest(), (request) => request.reset());
            this._actionPool = new ObjectPool(() => new ScrollAction(), (action) => action.reset());
            this._readTick = this._readTick.bind(this);
            this._writeTick = this._writeTick.bind(this);
        }
        isDestroyed() {
            return this._isDestroyed;
        }
        addItem(item, posX, posY) {
            if (this._isDestroyed)
                return;
            const index = this._items.indexOf(item);
            if (index === -1) {
                this._items.push(item);
                this._requestOverlapCheck.set(item.id, this._tickTime);
                this._dragDirections.set(item.id, [0, 0]);
                this._dragPositions.set(item.id, [posX, posY]);
                if (!this._isTicking)
                    this._startTicking();
            }
        }
        updateItem(item, posX, posY) {
            if (this._isDestroyed)
                return;
            const dragPositions = this._dragPositions.get(item.id);
            const dragDirections = this._dragDirections.get(item.id);
            if (!dragPositions || !dragDirections)
                return;
            const prevX = dragPositions[0];
            const prevY = dragPositions[1];
            dragDirections[0] = posX > prevX ? RIGHT : posX < prevX ? LEFT : dragDirections[0] || 0;
            dragDirections[1] = posY > prevY ? DOWN : posY < prevY ? UP : dragDirections[1] || 0;
            dragPositions[0] = posX;
            dragPositions[1] = posY;
            this._requestOverlapCheck.set(item.id, this._requestOverlapCheck.get(item.id) || this._tickTime);
        }
        removeItem(item) {
            if (this._isDestroyed)
                return;
            const index = this._items.indexOf(item);
            if (index === -1)
                return;
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
        isItemScrollingX(item) {
            const reqX = this._requests[AXIS_X].get(item.id);
            return !!(reqX && reqX.isActive);
        }
        isItemScrollingY(item) {
            const reqY = this._requests[AXIS_Y].get(item.id);
            return !!(reqY && reqY.isActive);
        }
        isItemScrolling(item) {
            return this.isItemScrollingX(item) || this.isItemScrollingY(item);
        }
        destroy() {
            if (this._isDestroyed)
                return;
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
        _readTick(time) {
            if (this._isDestroyed)
                return;
            if (time && this._tickTime) {
                this._tickDeltaTime = time - this._tickTime;
                this._tickTime = time;
                this._updateRequests();
                this._updateActions();
            }
            else {
                this._tickTime = time;
                this._tickDeltaTime = 0;
            }
        }
        _writeTick() {
            if (this._isDestroyed)
                return;
            this._applyActions();
            addAutoScrollTick(this._readTick, this._writeTick);
        }
        _startTicking() {
            this._isTicking = true;
            addAutoScrollTick(this._readTick, this._writeTick);
        }
        _stopTicking() {
            this._isTicking = false;
            this._tickTime = 0;
            this._tickDeltaTime = 0;
            cancelAutoScrollTick();
        }
        _getItemHandleRect(item, handle, rect = { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 }) {
            const drag = item._drag;
            if (handle) {
                const ev = (drag._dragMoveEvent || drag._dragStartEvent);
                const data = handle(item, drag._clientX, drag._clientY, item.width, item.height, ev.clientX, ev.clientY);
                rect.left = data.left;
                rect.top = data.top;
                rect.width = data.width;
                rect.height = data.height;
            }
            else {
                rect.left = drag._clientX;
                rect.top = drag._clientY;
                rect.width = item.width;
                rect.height = item.height;
            }
            rect.right = rect.left + rect.width;
            rect.bottom = rect.top + rect.height;
            return rect;
        }
        _requestItemScroll(item, axis, element, direction, threshold, distance, maxValue) {
            const reqMap = this._requests[axis];
            let request = reqMap.get(item.id);
            if (request) {
                if (request.element !== element || request.direction !== direction) {
                    request.reset();
                }
            }
            else {
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
        _cancelItemScroll(item, axis) {
            const reqMap = this._requests[axis];
            const request = reqMap.get(item.id);
            if (!request)
                return;
            if (request.action)
                request.action.removeRequest(request);
            this._requestPool.release(request);
            reqMap.delete(item.id);
        }
        _checkItemOverlap(item, checkX, checkY) {
            const settings = getItemAutoScrollSettings(item);
            const { threshold, safeZone, handle, targets: _targets } = settings;
            const targets = isFunction(_targets) ? _targets(item) : _targets;
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
            let xElement = null;
            let xPriority = -Infinity;
            let xThreshold = 0;
            let xScore = 0;
            let xDirection = 0;
            let xDistance = 0;
            let xMaxScroll = 0;
            let yElement = null;
            let yPriority = -Infinity;
            let yThreshold = 0;
            let yScore = 0;
            let yDirection = 0;
            let yDistance = 0;
            let yMaxScroll = 0;
            let i = 0;
            for (; i < targets.length; i++) {
                const target = targets[i];
                const targetThreshold = target.threshold || threshold;
                const testAxisX = !!(checkX && dragDirectionX && target.axis !== AXIS_Y);
                const testAxisY = !!(checkY && dragDirectionY && target.axis !== AXIS_X);
                const testPriority = target.priority || 0;
                if ((!testAxisX || testPriority < xPriority) && (!testAxisY || testPriority < yPriority)) {
                    continue;
                }
                const testElement = getScrollElement(target.element || target);
                const testMaxScrollX = testAxisX ? getScrollLeftMax(testElement) : -1;
                const testMaxScrollY = testAxisY ? getScrollTopMax(testElement) : -1;
                if (!testMaxScrollX && !testMaxScrollY)
                    continue;
                const testRect = getContentRect(testElement, R2);
                const testScore = getIntersectionScore(itemRect, testRect);
                if (testScore <= 0)
                    continue;
                if (testAxisX &&
                    testPriority >= xPriority &&
                    testMaxScrollX > 0 &&
                    (testPriority > xPriority || testScore > xScore)) {
                    let testDistance = 0;
                    let testDirection = 0;
                    const testThreshold = computeThreshold(targetThreshold, testRect.width);
                    const testEdgeOffset = computeEdgeOffset(testThreshold, safeZone, itemRect.width, testRect.width);
                    if (dragDirectionX === RIGHT) {
                        testDistance = testRect.right + testEdgeOffset - itemRect.right;
                        if (testDistance <= testThreshold && getScrollLeft(testElement) < testMaxScrollX) {
                            testDirection = RIGHT;
                        }
                    }
                    else if (dragDirectionX === LEFT) {
                        testDistance = itemRect.left - (testRect.left - testEdgeOffset);
                        if (testDistance <= testThreshold && getScrollLeft(testElement) > 0) {
                            testDirection = LEFT;
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
                if (testAxisY &&
                    testPriority >= yPriority &&
                    testMaxScrollY > 0 &&
                    (testPriority > yPriority || testScore > yScore)) {
                    let testDistance = 0;
                    let testDirection = 0;
                    const testThreshold = computeThreshold(targetThreshold, testRect.height);
                    const testEdgeOffset = computeEdgeOffset(testThreshold, safeZone, itemRect.height, testRect.height);
                    if (dragDirectionY === DOWN) {
                        testDistance = testRect.bottom + testEdgeOffset - itemRect.bottom;
                        if (testDistance <= testThreshold && getScrollTop(testElement) < testMaxScrollY) {
                            testDirection = DOWN;
                        }
                    }
                    else if (dragDirectionY === UP) {
                        testDistance = itemRect.top - (testRect.top - testEdgeOffset);
                        if (testDistance <= testThreshold && getScrollTop(testElement) > 0) {
                            testDirection = UP;
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
            if (checkX) {
                if (xElement && xDirection) {
                    this._requestItemScroll(item, AXIS_X, xElement, xDirection, xThreshold, xDistance, xMaxScroll);
                }
                else {
                    this._cancelItemScroll(item, AXIS_X);
                }
            }
            if (checkY) {
                if (yElement && yDirection) {
                    this._requestItemScroll(item, AXIS_Y, yElement, yDirection, yThreshold, yDistance, yMaxScroll);
                }
                else {
                    this._cancelItemScroll(item, AXIS_Y);
                }
            }
        }
        _updateScrollRequest(scrollRequest) {
            const item = scrollRequest.item;
            const { threshold, safeZone, smoothStop, handle, targets: _targets, } = getItemAutoScrollSettings(item);
            const targets = isFunction(_targets) ? _targets(item) : _targets;
            const targetCount = (targets && targets.length) || 0;
            const itemRect = this._getItemHandleRect(item, handle, R1);
            let hasReachedEnd = null;
            let i = 0;
            for (; i < targetCount; i++) {
                const target = targets[i];
                const testElement = getScrollElement(target.element || target);
                if (testElement !== scrollRequest.element)
                    continue;
                const testIsAxisX = !!(AXIS_X & scrollRequest.direction);
                if (testIsAxisX) {
                    if (target.axis === AXIS_Y)
                        continue;
                }
                else {
                    if (target.axis === AXIS_X)
                        continue;
                }
                const testMaxScroll = testIsAxisX
                    ? getScrollLeftMax(testElement)
                    : getScrollTopMax(testElement);
                if (testMaxScroll <= 0) {
                    break;
                }
                const testRect = getContentRect(testElement, R2);
                const testScore = getIntersectionScore(itemRect, testRect);
                if (testScore <= 0) {
                    break;
                }
                const targetThreshold = typeof target.threshold === 'number' ? target.threshold : threshold;
                const testThreshold = computeThreshold(targetThreshold, testIsAxisX ? testRect.width : testRect.height);
                const testEdgeOffset = computeEdgeOffset(testThreshold, safeZone, testIsAxisX ? itemRect.width : itemRect.height, testIsAxisX ? testRect.width : testRect.height);
                let testDistance = 0;
                if (scrollRequest.direction === LEFT) {
                    testDistance = itemRect.left - (testRect.left - testEdgeOffset);
                }
                else if (scrollRequest.direction === RIGHT) {
                    testDistance = testRect.right + testEdgeOffset - itemRect.right;
                }
                else if (scrollRequest.direction === UP) {
                    testDistance = itemRect.top - (testRect.top - testEdgeOffset);
                }
                else {
                    testDistance = testRect.bottom + testEdgeOffset - itemRect.bottom;
                }
                if (testDistance > testThreshold) {
                    break;
                }
                const testScroll = testIsAxisX ? getScrollLeft(testElement) : getScrollTop(testElement);
                hasReachedEnd =
                    FORWARD & scrollRequest.direction ? testScroll >= testMaxScroll : testScroll <= 0;
                if (hasReachedEnd) {
                    break;
                }
                scrollRequest.maxValue = testMaxScroll;
                scrollRequest.threshold = testThreshold;
                scrollRequest.distance = testDistance;
                scrollRequest.isEnding = false;
                return true;
            }
            if (smoothStop === true && scrollRequest.speed > 0) {
                if (hasReachedEnd === null)
                    hasReachedEnd = scrollRequest.hasReachedEnd();
                scrollRequest.isEnding = hasReachedEnd ? false : true;
            }
            else {
                scrollRequest.isEnding = false;
            }
            return scrollRequest.isEnding;
        }
        _updateRequests() {
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
        _requestAction(request, axis) {
            const actions = this._actions;
            const isAxisX = axis === AXIS_X;
            let action = null;
            let i = 0;
            for (; i < actions.length; i++) {
                action = actions[i];
                if (request.element !== action.element) {
                    action = null;
                    continue;
                }
                if (isAxisX ? action.requestX : action.requestY) {
                    this._cancelItemScroll(request.item, axis);
                    return;
                }
                break;
            }
            if (!action)
                action = this._actionPool.pick();
            action.element = request.element;
            action.addRequest(request);
            request.tick(this._tickDeltaTime);
            actions.push(action);
        }
        _updateActions() {
            const items = this._items;
            const requests = this._requests;
            const actions = this._actions;
            let i = 0;
            for (i = 0; i < items.length; i++) {
                const reqX = requests[AXIS_X].get(items[i].id);
                const reqY = requests[AXIS_Y].get(items[i].id);
                if (reqX)
                    this._requestAction(reqX, AXIS_X);
                if (reqY)
                    this._requestAction(reqY, AXIS_Y);
            }
            for (i = 0; i < actions.length; i++) {
                actions[i].computeScrollValues();
            }
        }
        _applyActions() {
            const actions = this._actions;
            if (!actions.length)
                return;
            let i = 0;
            for (i = 0; i < actions.length; i++) {
                actions[i].scroll();
                this._actionPool.release(actions[i]);
            }
            actions.length = 0;
            const items = this._items;
            for (i = 0; i < items.length; i++)
                prepareItemScrollSync(items[i]);
            for (i = 0; i < items.length; i++)
                applyItemScrollSync(items[i]);
        }
    }
    AutoScroller.AXIS_X = AXIS_X;
    AutoScroller.AXIS_Y = AXIS_Y;
    AutoScroller.LEFT = LEFT;
    AutoScroller.RIGHT = RIGHT;
    AutoScroller.UP = UP;
    AutoScroller.DOWN = DOWN;
    AutoScroller.smoothSpeed = smoothSpeed;
    AutoScroller.pointerHandle = pointerHandle;

    class Emitter {
        constructor() {
            this._events = {};
            this._queue = [];
            this._counter = 0;
            this._clearOnEmit = false;
        }
        on(event, listener) {
            if (!this._events)
                return this;
            const listeners = this._events[event] || [];
            this._events[event] = listeners;
            listeners.push(listener);
            return this;
        }
        off(event, listener) {
            if (!this._events)
                return this;
            const listeners = this._events[event];
            if (!listeners || !listeners.length)
                return this;
            let index = 0;
            while ((index = listeners.indexOf(listener)) !== -1) {
                listeners.splice(index, 1);
            }
            return this;
        }
        clear(event) {
            if (!this._events)
                return this;
            const listeners = this._events[event];
            if (listeners) {
                listeners.length = 0;
                delete this._events[event];
            }
            return this;
        }
        emit(event, ...args) {
            if (!this._events) {
                this._clearOnEmit = false;
                return this;
            }
            const listeners = this._events[event];
            if (!listeners || !listeners.length) {
                this._clearOnEmit = false;
                return this;
            }
            const queue = this._queue;
            const startIndex = queue.length;
            queue.push(...listeners);
            if (this._clearOnEmit) {
                listeners.length = 0;
                this._clearOnEmit = false;
            }
            ++this._counter;
            let i = startIndex;
            const endIndex = queue.length;
            for (; i < endIndex; i++) {
                queue[i](...args);
                if (!this._events)
                    return this;
            }
            --this._counter;
            if (!this._counter)
                queue.length = 0;
            return this;
        }
        burst(event, ...args) {
            if (!this._events)
                return this;
            this._clearOnEmit = true;
            return this.emit(event, ...args);
        }
        countListeners(event) {
            if (!this._events)
                return 0;
            const listeners = this._events[event];
            return listeners ? listeners.length : 0;
        }
        destroy() {
            if (!this._events)
                return this;
            this._queue.length = this._counter = 0;
            this._events = null;
            return this;
        }
    }

    const vendorPrefixes = ['', 'webkit', 'moz', 'ms', 'o', 'Webkit', 'Moz', 'MS', 'O'];
    const cache$1 = new Map();
    function getPrefixedPropName(style, styleProp) {
        let prefixedProp = cache$1.get(styleProp);
        if (prefixedProp)
            return prefixedProp;
        const camelProp = styleProp[0].toUpperCase() + styleProp.slice(1);
        let i = 0;
        while (i < vendorPrefixes.length) {
            prefixedProp = vendorPrefixes[i] ? vendorPrefixes[i] + camelProp : styleProp;
            if (prefixedProp in style) {
                cache$1.set(styleProp, prefixedProp);
                return prefixedProp;
            }
            ++i;
        }
        return '';
    }

    const POINTER_EVENTS = {
        start: 'pointerdown',
        move: 'pointermove',
        cancel: 'pointercancel',
        end: 'pointerup',
    };
    const TOUCH_EVENTS = {
        start: 'touchstart',
        move: 'touchmove',
        cancel: 'touchcancel',
        end: 'touchend',
    };
    const MOUSE_EVENTS = {
        start: 'mousedown',
        move: 'mousemove',
        cancel: '',
        end: 'mouseup',
    };
    const SOURCE_EVENTS = Object.assign({}, (HAS_TOUCH_EVENTS ? TOUCH_EVENTS : HAS_POINTER_EVENTS ? POINTER_EVENTS : MOUSE_EVENTS));
    const DRAGGER_EVENTS = {
        start: 'start',
        move: 'move',
        cancel: 'cancel',
        end: 'end',
    };
    const CAPTURE = 1;
    const PASSIVE = 2;
    const TA_AUTO = 'auto';
    const TA_PROP = 'touchAction';
    const TA_PROP_PREFIXED = getPrefixedPropName(document.documentElement.style, TA_PROP);
    function preventDefault(e) {
        if (e.preventDefault && e.cancelable !== false)
            e.preventDefault();
    }
    function getListenerType(capture, passive) {
        return ((capture ? CAPTURE : 0) |
            (HAS_PASSIVE_EVENTS && passive ? PASSIVE : 0));
    }
    function getListenerOptions(listenerType) {
        return HAS_PASSIVE_EVENTS
            ? {
                capture: !!(CAPTURE & listenerType),
                passive: !!(PASSIVE & listenerType),
            }
            : !!(CAPTURE & listenerType);
    }
    function getPointerType(e) {
        return 'pointerType' in e
            ? e.pointerType
            : 'touches' in e
                ? 'touch'
                : 'mouse';
    }
    function getEventPointerId(e) {
        if ('pointerId' in e)
            return e.pointerId;
        if ('changedTouches' in e)
            return e.changedTouches[0] ? e.changedTouches[0].identifier : null;
        return 1;
    }
    function getTouchById(e, id) {
        if ('pointerId' in e) {
            return e.pointerId === id ? e : null;
        }
        if ('changedTouches' in e) {
            let i = 0;
            for (; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === id) {
                    return e.changedTouches[i];
                }
            }
            return null;
        }
        return e;
    }
    class DragProxy {
        constructor(listenerType) {
            this._emitter = new Emitter();
            this._listenerOptions = getListenerOptions(listenerType);
            this._draggers = new Set();
            this._onMove = this._onMove.bind(this);
            this._onCancel = this._onCancel.bind(this);
            this._onEnd = this._onEnd.bind(this);
        }
        hasDragger(dragger) {
            return this._draggers.has(dragger);
        }
        addDragger(dragger) {
            if (this._draggers.has(dragger))
                return;
            this._draggers.add(dragger);
            this._emitter.on(DRAGGER_EVENTS.move, dragger.onMove);
            this._emitter.on(DRAGGER_EVENTS.cancel, dragger.onCancel);
            this._emitter.on(DRAGGER_EVENTS.end, dragger.onEnd);
            if (this._draggers.size === 1) {
                this._activate();
            }
        }
        removeDragger(dragger) {
            if (!this._draggers.has(dragger))
                return;
            this._draggers.delete(dragger);
            this._emitter.off(DRAGGER_EVENTS.move, dragger.onMove);
            this._emitter.off(DRAGGER_EVENTS.cancel, dragger.onCancel);
            this._emitter.off(DRAGGER_EVENTS.end, dragger.onEnd);
            if (this._draggers.size === 0) {
                this._deactivate();
            }
        }
        destroy() {
            if (this._draggers.size)
                this._deactivate();
            this._draggers.clear();
            this._emitter.destroy();
        }
        _activate() {
            window.addEventListener(SOURCE_EVENTS.move, this._onMove, this._listenerOptions);
            window.addEventListener(SOURCE_EVENTS.end, this._onEnd, this._listenerOptions);
            if (SOURCE_EVENTS.cancel) {
                window.addEventListener(SOURCE_EVENTS.cancel, this._onCancel, this._listenerOptions);
            }
        }
        _deactivate() {
            window.removeEventListener(SOURCE_EVENTS.move, this._onMove, this._listenerOptions);
            window.removeEventListener(SOURCE_EVENTS.end, this._onEnd, this._listenerOptions);
            if (SOURCE_EVENTS.cancel) {
                window.removeEventListener(SOURCE_EVENTS.cancel, this._onCancel, this._listenerOptions);
            }
        }
        _onMove(e) {
            this._emitter.emit(DRAGGER_EVENTS.move, e);
        }
        _onCancel(e) {
            this._emitter.emit(DRAGGER_EVENTS.cancel, e);
        }
        _onEnd(e) {
            this._emitter.emit(DRAGGER_EVENTS.end, e);
        }
    }
    const dragProxies = [new DragProxy(0), new DragProxy(1)];
    if (HAS_PASSIVE_EVENTS)
        dragProxies.push(new DragProxy(2), new DragProxy(3));
    class Dragger {
        constructor(element, cssProps, listenerOptions = {}) {
            const { capture = true, passive = true } = listenerOptions;
            this.element = element;
            this._emitter = new Emitter();
            this._cssProps = {};
            this._touchAction = '';
            this._listenerType = getListenerType(capture, passive);
            this._isActive = false;
            this._pointerId = null;
            this._startTime = 0;
            this._startX = 0;
            this._startY = 0;
            this._currentX = 0;
            this._currentY = 0;
            this.onStart = this.onStart.bind(this);
            this.onMove = this.onMove.bind(this);
            this.onCancel = this.onCancel.bind(this);
            this.onEnd = this.onEnd.bind(this);
            if (cssProps)
                this.setCssProps(cssProps);
            if (!this._touchAction)
                this.setTouchAction(TA_AUTO);
            element.addEventListener('dragstart', preventDefault, false);
            element.addEventListener(SOURCE_EVENTS.start, this.onStart, getListenerOptions(this._listenerType));
        }
        getTrackedTouch(e) {
            if (this._pointerId === null)
                return null;
            return getTouchById(e, this._pointerId);
        }
        onStart(e) {
            if (!this.element)
                return;
            if (this._pointerId !== null)
                return;
            this._pointerId = getEventPointerId(e);
            if (this._pointerId === null)
                return;
            const touch = this.getTrackedTouch(e);
            if (!touch)
                return;
            this._startX = this._currentX = touch.clientX;
            this._startY = this._currentY = touch.clientY;
            this._startTime = Date.now();
            this._isActive = true;
            this._emit(DRAGGER_EVENTS.start, e);
            if (this._isActive) {
                const proxy = dragProxies[this._listenerType];
                if (proxy)
                    proxy.addDragger(this);
            }
        }
        onMove(e) {
            const touch = this.getTrackedTouch(e);
            if (!touch)
                return;
            this._currentX = touch.clientX;
            this._currentY = touch.clientY;
            this._emit(DRAGGER_EVENTS.move, e);
        }
        onCancel(e) {
            if (!this.getTrackedTouch(e))
                return;
            this._emit(DRAGGER_EVENTS.cancel, e);
            this.reset();
        }
        onEnd(e) {
            if (!this.getTrackedTouch(e))
                return;
            this._emit(DRAGGER_EVENTS.end, e);
            this.reset();
        }
        isActive() {
            return this._isActive;
        }
        setTouchAction(value) {
            if (!this.element || !value)
                return;
            this._touchAction = value;
            if (TA_PROP_PREFIXED) {
                this._cssProps[TA_PROP_PREFIXED] = '';
                this.element.style[TA_PROP_PREFIXED] = value;
            }
            if (HAS_TOUCH_EVENTS) {
                this.element.removeEventListener(TOUCH_EVENTS.start, preventDefault, true);
                if (value !== TA_AUTO &&
                    (this.element.style[TA_PROP_PREFIXED] !== value || (IS_FIREFOX && IS_ANDROID))) {
                    this.element.addEventListener(TOUCH_EVENTS.start, preventDefault, true);
                }
            }
        }
        setCssProps(newProps) {
            if (!this.element)
                return;
            const currentProps = this._cssProps;
            const { element } = this;
            let currentProp = '';
            for (currentProp in currentProps) {
                element.style[currentProp] = currentProps[currentProp];
                delete currentProps[currentProp];
            }
            let prop;
            for (prop in newProps) {
                const propValue = newProps[prop] || '';
                if (!propValue)
                    continue;
                if (prop === TA_PROP) {
                    this.setTouchAction(propValue);
                    continue;
                }
                const prefixedProp = getPrefixedPropName(element.style, prop);
                if (!prefixedProp)
                    continue;
                currentProps[prefixedProp] = '';
                element.style[prefixedProp] = propValue;
            }
        }
        setListenerOptions(options) {
            if (!this.element)
                return;
            const { capture = true, passive = true } = options;
            const current = this._listenerType;
            const next = getListenerType(capture, passive);
            if (current !== next) {
                this.element.removeEventListener(SOURCE_EVENTS.start, this.onStart, getListenerOptions(this._listenerType));
                const currentProxy = dragProxies[this._listenerType];
                const isActive = currentProxy ? currentProxy.hasDragger(this) : false;
                if (isActive)
                    currentProxy.removeDragger(this);
                this._listenerType = next;
                this.element.addEventListener(SOURCE_EVENTS.start, this.onStart, getListenerOptions(this._listenerType));
                if (isActive) {
                    const nextProxy = dragProxies[this._listenerType];
                    if (nextProxy)
                        nextProxy.addDragger(this);
                }
            }
        }
        getDeltaX() {
            return this._currentX - this._startX;
        }
        getDeltaY() {
            return this._currentY - this._startY;
        }
        getDistance() {
            const x = this.getDeltaX();
            const y = this.getDeltaY();
            return Math.sqrt(x * x + y * y);
        }
        getDeltaTime() {
            return this._startTime ? Date.now() - this._startTime : 0;
        }
        on(event, listener) {
            this._emitter.on(event, listener);
        }
        off(event, listener) {
            this._emitter.off(event, listener);
        }
        reset() {
            this._pointerId = null;
            this._startTime = 0;
            this._startX = 0;
            this._startY = 0;
            this._currentX = 0;
            this._currentY = 0;
            this._isActive = false;
            const proxy = dragProxies[this._listenerType];
            if (proxy)
                proxy.removeDragger(this);
        }
        destroy() {
            const { element } = this;
            if (!element)
                return;
            this.reset();
            this._emitter.destroy();
            element.removeEventListener(SOURCE_EVENTS.start, this.onStart, getListenerOptions(this._listenerType));
            element.removeEventListener('dragstart', preventDefault, false);
            element.removeEventListener(TOUCH_EVENTS.start, preventDefault, true);
            let prop;
            for (prop in this._cssProps) {
                element.style[prop] = '';
            }
            this._cssProps = {};
            this.element = null;
        }
        _createEvent(type, e) {
            const touch = this.getTrackedTouch(e);
            if (!touch || this._pointerId === null)
                return null;
            return {
                type: type,
                srcEvent: e,
                distance: this.getDistance(),
                deltaX: this.getDeltaX(),
                deltaY: this.getDeltaY(),
                deltaTime: type === DRAGGER_EVENTS.start ? 0 : this.getDeltaTime(),
                isFirst: type === DRAGGER_EVENTS.start,
                isFinal: type === DRAGGER_EVENTS.end || type === DRAGGER_EVENTS.cancel,
                pointerType: getPointerType(e),
                identifier: this._pointerId,
                screenX: touch.screenX,
                screenY: touch.screenY,
                clientX: touch.clientX,
                clientY: touch.clientY,
                pageX: touch.pageX,
                pageY: touch.pageY,
                target: touch.target,
            };
        }
        _emit(type, e) {
            this._emitter.emit(type, this._createEvent(type, e));
        }
    }

    function addClass(element, className) {
        className && element.classList.add(className);
    }

    function arrayInsert(array, items, index = -1) {
        if (index < 0)
            index = array.length - index + 1;
        Array.isArray(items) ? array.splice(index, 0, ...items) : array.splice(index, 0, items);
    }

    function normalizeArrayIndex(array, index, sizeOffset = 0) {
        const maxIndex = Math.max(0, array.length - 1 + sizeOffset);
        return index > maxIndex ? maxIndex : index < 0 ? Math.max(maxIndex + index + 1, 0) : index;
    }

    function arrayMove(array, fromIndex, toIndex) {
        if (array.length < 2)
            return;
        const from = normalizeArrayIndex(array, fromIndex);
        const to = normalizeArrayIndex(array, toIndex);
        if (from !== to) {
            array.splice(to, 0, array.splice(from, 1)[0]);
        }
    }

    function arraySwap(array, index, withIndex) {
        if (array.length < 2)
            return;
        const indexA = normalizeArrayIndex(array, index);
        const indexB = normalizeArrayIndex(array, withIndex);
        if (indexA !== indexB) {
            const temp = array[indexA];
            array[indexA] = array[indexB];
            array[indexB] = temp;
        }
    }

    const transformProp = getPrefixedPropName(document.documentElement.style, 'transform') || 'transform';

    const styleNameRegEx = /([A-Z])/g;
    const prefixRegex = /^(webkit-|moz-|ms-|o-)/;
    const msPrefixRegex = /^(-m-s-)/;
    function getStyleName(styleProp) {
        let styleName = styleProp.replace(styleNameRegEx, '-$1').toLowerCase();
        styleName = styleName.replace(prefixRegex, '-$1');
        styleName = styleName.replace(msPrefixRegex, '-ms-');
        return styleName;
    }

    const transformStyle = getStyleName(transformProp);

    function isContainingBlock(element) {
        if (getStyle(element, 'position') !== 'static') {
            return true;
        }
        const display = getStyle(element, 'display');
        if (display === 'inline' || display === 'none') {
            return false;
        }
        const transform = getStyle(element, transformStyle);
        if (transform && transform !== 'none') {
            return true;
        }
        const perspective = getStyle(element, 'perspective');
        if (perspective && perspective !== 'none') {
            return true;
        }
        const contentVisibility = getStyle(element, 'content-visibility');
        if (contentVisibility && (contentVisibility === 'auto' || contentVisibility === 'hidden')) {
            return true;
        }
        const contain = getStyle(element, 'contain');
        if (contain &&
            (contain === 'strict' ||
                contain === 'content' ||
                contain.indexOf('paint') > -1 ||
                contain.indexOf('layout') > -1)) {
            return true;
        }
        if (!IS_SAFARI) {
            const filter = getStyle(element, 'filter');
            if (filter && filter !== 'none') {
                return true;
            }
            const willChange = getStyle(element, 'will-change');
            if (willChange &&
                (willChange.indexOf('transform') > -1 || willChange.indexOf('perspective') > -1)) {
                return true;
            }
        }
        return false;
    }

    function getContainingBlock(element) {
        let res = element || document;
        while (res && res !== document && !isContainingBlock(element)) {
            res = res.parentElement || document;
        }
        return res;
    }

    const offsetA = { left: 0, top: 0 };
    const offsetB = { left: 0, top: 0 };
    const offsetDiff = { left: 0, top: 0 };
    function getOffset(element, offset = { left: 0, top: 0 }) {
        offset.left = 0;
        offset.top = 0;
        if (element === document)
            return offset;
        offset.left = window.pageXOffset || 0;
        offset.top = window.pageYOffset || 0;
        if ('self' in element && element.self === window.self)
            return offset;
        const { left, top } = element.getBoundingClientRect();
        offset.left += left;
        offset.top += top;
        offset.left += getStyleAsFloat(element, 'border-left-width');
        offset.top += getStyleAsFloat(element, 'border-top-width');
        return offset;
    }
    function getOffsetDiff(elemA, elemB, compareContainingBlocks = false) {
        offsetDiff.left = 0;
        offsetDiff.top = 0;
        if (elemA === elemB)
            return offsetDiff;
        if (compareContainingBlocks) {
            elemA = getContainingBlock(elemA);
            elemB = getContainingBlock(elemB);
            if (elemA === elemB)
                return offsetDiff;
        }
        getOffset(elemA, offsetA);
        getOffset(elemB, offsetB);
        offsetDiff.left = offsetB.left - offsetA.left;
        offsetDiff.top = offsetB.top - offsetA.top;
        return offsetDiff;
    }

    function removeClass(element, className) {
        className && element.classList.remove(className);
    }

    const START_PREDICATE_INACTIVE = 0;
    const START_PREDICATE_PENDING = 1;
    const START_PREDICATE_RESOLVED = 2;
    const SCROLL_LISTENER_OPTIONS$1 = HAS_PASSIVE_EVENTS ? { capture: true, passive: true } : true;
    const RECT_A = { left: 0, top: 0, width: 0, height: 0 };
    const RECT_B = { left: 0, top: 0, width: 0, height: 0 };
    const defaultStartPredicate = function (item, event, options) {
        if (event.isFinal)
            return;
        const drag = item._drag;
        if (event.isFirst && event.srcEvent.button) {
            drag._resetDefaultStartPredicate();
            return false;
        }
        if (!IS_IOS &&
            event.isFirst &&
            event.srcEvent.isTrusted === true &&
            event.srcEvent.defaultPrevented === false &&
            event.srcEvent.cancelable === false) {
            drag._resetDefaultStartPredicate();
            return false;
        }
        let predicate = drag._startPredicateData;
        if (!predicate) {
            predicate = drag._startPredicateData = { distance: 0, delay: 0 };
            const { dragStartPredicate } = item.getGrid().settings;
            const config = options || dragStartPredicate;
            if (typeof config == 'object') {
                predicate.distance = Math.max(config.distance || 0, 0);
                predicate.delay = Math.max(config.delay || 0, 0);
            }
        }
        if (predicate.delay) {
            predicate.event = event;
            if (!predicate.delayTimer) {
                predicate.delayTimer = window.setTimeout(function () {
                    if (drag._startPredicateData !== predicate)
                        return;
                    if (!drag.item) {
                        drag._resetDefaultStartPredicate();
                        return;
                    }
                    if (predicate) {
                        predicate.delay = 0;
                        if (drag._startPredicateState === START_PREDICATE_PENDING &&
                            predicate.event &&
                            predicate.event.distance >= predicate.distance) {
                            drag._resetDefaultStartPredicate();
                            drag._startPredicateState = START_PREDICATE_RESOLVED;
                            drag._onStart(predicate.event);
                        }
                    }
                }, predicate.delay);
            }
            return;
        }
        if (event.distance < predicate.distance)
            return;
        return true;
    };
    const getTargetGrid = function (item, threshold) {
        const itemGrid = item.getGrid();
        const { dragSort } = itemGrid.settings;
        const grids = dragSort === true ? [itemGrid] : isFunction(dragSort) ? dragSort(item) : undefined;
        let target = null;
        if (!grids || !Array.isArray(grids) || !grids.length) {
            return target;
        }
        const itemRect = RECT_A;
        const targetRect = RECT_B;
        let bestScore = -1;
        let gridScore = 0;
        let grid;
        let container = null;
        let containerRect;
        let left = 0;
        let top = 0;
        let right = 0;
        let bottom = 0;
        let i = 0;
        const drag = item._drag;
        itemRect.width = item.width;
        itemRect.height = item.height;
        itemRect.left = drag._clientX;
        itemRect.top = drag._clientY;
        for (; i < grids.length; i++) {
            grid = grids[i];
            if (grid.isDestroyed())
                continue;
            grid._updateBoundingRect();
            left = Math.max(0, grid._rect.left);
            top = Math.max(0, grid._rect.top);
            right = Math.min(window.innerWidth, grid._rect.right);
            bottom = Math.min(window.innerHeight, grid._rect.bottom);
            container = grid.element.parentNode;
            while (container &&
                container !== document &&
                container !== document.documentElement &&
                container !== document.body) {
                if (container.getRootNode && container instanceof DocumentFragment) {
                    container = container.getRootNode().host;
                    continue;
                }
                if (getStyle(container, 'overflow') !== 'visible') {
                    containerRect = container.getBoundingClientRect();
                    left = Math.max(left, containerRect.left);
                    top = Math.max(top, containerRect.top);
                    right = Math.min(right, containerRect.right);
                    bottom = Math.min(bottom, containerRect.bottom);
                }
                if (getStyle(container, 'position') === 'fixed') {
                    break;
                }
                container = container.parentNode;
            }
            if (left >= right || top >= bottom)
                continue;
            targetRect.left = left;
            targetRect.top = top;
            targetRect.width = right - left;
            targetRect.height = bottom - top;
            gridScore = getIntersectionScore(itemRect, targetRect);
            if (gridScore > threshold && gridScore > bestScore) {
                bestScore = gridScore;
                target = grid;
            }
        }
        return target;
    };
    const defaultSortPredicate = function (item, options) {
        const drag = item._drag;
        const sortAction = (options && options.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE);
        const migrateAction = (options && options.migrateAction === ACTION_SWAP
            ? ACTION_SWAP
            : ACTION_MOVE);
        const sortThreshold = Math.min(Math.max(options && typeof options.threshold === 'number' ? options.threshold : 50, 1), 100);
        const grid = getTargetGrid(item, sortThreshold);
        if (!grid)
            return null;
        const isMigration = item.getGrid() !== grid;
        const itemRect = RECT_A;
        const targetRect = RECT_B;
        itemRect.width = item.width;
        itemRect.height = item.height;
        if (isMigration) {
            grid._updateBorders(true, false, true, false);
            itemRect.left = drag._clientX - (grid._rect.left + grid._borderLeft);
            itemRect.top = drag._clientY - (grid._rect.top + grid._borderTop);
        }
        else {
            itemRect.left =
                drag._translateX - item._containerDiffX + item.marginLeft;
            itemRect.top =
                drag._translateY - item._containerDiffY + item.marginTop;
        }
        let matchScore = 0;
        let matchIndex = -1;
        let hasValidTargets = false;
        for (let i = 0; i < grid.items.length; i++) {
            const target = grid.items[i];
            if (!target.isActive() || target === item) {
                continue;
            }
            hasValidTargets = true;
            targetRect.width = target.width;
            targetRect.height = target.height;
            targetRect.left = target.left + target.marginLeft;
            targetRect.top = target.top + target.marginTop;
            const score = getIntersectionScore(itemRect, targetRect);
            if (score > matchScore) {
                matchIndex = i;
                matchScore = score;
            }
        }
        if (isMigration && matchScore < sortThreshold) {
            matchIndex = hasValidTargets ? matchIndex : 0;
            matchScore = sortThreshold;
        }
        if (matchScore >= sortThreshold) {
            return {
                grid: grid,
                index: matchIndex,
                action: isMigration ? migrateAction : sortAction,
            };
        }
        return null;
    };
    class ItemDrag {
        constructor(item) {
            const element = item.element;
            const grid = item.getGrid();
            const { settings } = grid;
            this.item = item;
            this._originGridId = grid.id;
            this._isMigrated = false;
            this._isActive = false;
            this._isStarted = false;
            this._startPredicateState = START_PREDICATE_INACTIVE;
            this._startPredicateData = null;
            this._isSortNeeded = false;
            this._sortTimer = undefined;
            this._blockedSortIndex = null;
            this._sortX1 = 0;
            this._sortX2 = 0;
            this._sortY1 = 0;
            this._sortY2 = 0;
            this._container = null;
            this._containingBlock = null;
            this._dragStartEvent = null;
            this._dragEndEvent = null;
            this._dragMoveEvent = null;
            this._dragPrevMoveEvent = null;
            this._scrollEvent = null;
            this._translateX = 0;
            this._translateY = 0;
            this._clientX = 0;
            this._clientY = 0;
            this._scrollDiffX = 0;
            this._scrollDiffY = 0;
            this._moveDiffX = 0;
            this._moveDiffY = 0;
            this._containerDiffX = 0;
            this._containerDiffY = 0;
            this._preStartCheck = this._preStartCheck.bind(this);
            this._preEndCheck = this._preEndCheck.bind(this);
            this._onScroll = this._onScroll.bind(this);
            this._prepareStart = this._prepareStart.bind(this);
            this._applyStart = this._applyStart.bind(this);
            this._prepareMove = this._prepareMove.bind(this);
            this._applyMove = this._applyMove.bind(this);
            this._prepareScroll = this._prepareScroll.bind(this);
            this._applyScroll = this._applyScroll.bind(this);
            this._handleSort = this._handleSort.bind(this);
            this._handleSortDelayed = this._handleSortDelayed.bind(this);
            this.dragger = new Dragger((typeof settings.dragHandle === 'string' && element.querySelector(settings.dragHandle)) ||
                element, settings.dragCssProps, settings.dragEventListenerOptions);
            this.dragger.on('start', this._preStartCheck);
            this.dragger.on('move', this._preStartCheck);
            this.dragger.on('cancel', this._preEndCheck);
            this.dragger.on('end', this._preEndCheck);
        }
        isActive() {
            return this._isActive;
        }
        getOriginGrid() {
            return GRID_INSTANCES.get(this._originGridId) || null;
        }
        stop() {
            if (!this.item || !this.isActive())
                return;
            if (this._isMigrated) {
                this._finishMigration();
                return;
            }
            const { item } = this;
            ItemDrag.autoScroll.removeItem(item);
            cancelDragStartTick(item.id);
            cancelDragMoveTick(item.id);
            cancelDragScrollTick(item.id);
            this._cancelSort();
            if (this._isStarted) {
                const element = item.element;
                const grid = item.getGrid();
                const { itemDraggingClass } = grid.settings;
                this._unbindScrollHandler();
                if (element.parentNode !== grid.element) {
                    grid.element.appendChild(element);
                    item._setTranslate(this._translateX - item._containerDiffX, this._translateY - item._containerDiffY);
                    item._containerDiffX = this._containerDiffX = 0;
                    item._containerDiffY = this._containerDiffY = 0;
                    if (itemDraggingClass)
                        element.clientWidth;
                }
                removeClass(element, itemDraggingClass);
            }
            this._reset();
        }
        sort(force = false) {
            if (this.item && this.isActive() && this.item.isActive() && this._dragMoveEvent) {
                if (force) {
                    this._handleSort();
                }
                else {
                    addDragSortTick(this.item.id, this._handleSort);
                }
            }
        }
        destroy() {
            if (!this.item)
                return;
            this._isMigrated = false;
            this.stop();
            this.dragger.destroy();
            this.item = null;
        }
        _startPredicate(item, event) {
            const { dragStartPredicate } = item.getGrid().settings;
            return isFunction(dragStartPredicate)
                ? dragStartPredicate(item, event)
                : ItemDrag.defaultStartPredicate(item, event);
        }
        _reset() {
            this._isActive = false;
            this._isStarted = false;
            this._container = null;
            this._containingBlock = null;
            this._dragStartEvent = null;
            this._dragEndEvent = null;
            this._dragMoveEvent = null;
            this._dragPrevMoveEvent = null;
            this._scrollEvent = null;
            this._translateX = 0;
            this._translateY = 0;
            this._clientX = 0;
            this._clientY = 0;
            this._scrollDiffX = 0;
            this._scrollDiffY = 0;
            this._moveDiffX = 0;
            this._moveDiffY = 0;
            this._containerDiffX = 0;
            this._containerDiffY = 0;
        }
        _bindScrollHandler() {
            window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS$1);
        }
        _unbindScrollHandler() {
            window.removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS$1);
        }
        _resetHeuristics(x, y) {
            this._blockedSortIndex = null;
            this._sortX1 = this._sortX2 = x;
            this._sortY1 = this._sortY2 = y;
        }
        _checkHeuristics(x, y) {
            if (!this.item)
                return false;
            const { settings } = this.item.getGrid();
            const { minDragDistance, minBounceBackAngle } = settings.dragSortHeuristics;
            if (minDragDistance <= 0) {
                this._blockedSortIndex = null;
                return true;
            }
            const diffX = x - this._sortX2;
            const diffY = y - this._sortY2;
            const canCheckBounceBack = minDragDistance > 3 && minBounceBackAngle > 0;
            if (!canCheckBounceBack) {
                this._blockedSortIndex = null;
            }
            if (Math.abs(diffX) > minDragDistance || Math.abs(diffY) > minDragDistance) {
                if (canCheckBounceBack) {
                    const angle = Math.atan2(diffX, diffY);
                    const prevAngle = Math.atan2(this._sortX2 - this._sortX1, this._sortY2 - this._sortY1);
                    const deltaAngle = Math.atan2(Math.sin(angle - prevAngle), Math.cos(angle - prevAngle));
                    if (Math.abs(deltaAngle) > minBounceBackAngle) {
                        this._blockedSortIndex = null;
                    }
                }
                this._sortX1 = this._sortX2;
                this._sortY1 = this._sortY2;
                this._sortX2 = x;
                this._sortY2 = y;
                return true;
            }
            return false;
        }
        _resetDefaultStartPredicate() {
            const { _startPredicateData: predicate } = this;
            if (predicate) {
                if (predicate.delayTimer) {
                    predicate.delayTimer = void window.clearTimeout(predicate.delayTimer);
                }
                this._startPredicateData = null;
            }
        }
        _handleSort() {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            const { dragSort, dragSortHeuristics, dragAutoScroll } = item.getGrid().settings;
            if (!dragSort ||
                (!dragAutoScroll.sortDuringScroll &&
                    ItemDrag.autoScroll.isItemScrolling(item))) {
                this._sortX1 = this._sortX2 = this._translateX - item._containerDiffX;
                this._sortY1 = this._sortY2 = this._translateY - item._containerDiffY;
                this._isSortNeeded = true;
                if (this._sortTimer !== undefined) {
                    this._sortTimer = void window.clearTimeout(this._sortTimer);
                }
                return;
            }
            const shouldSort = this._checkHeuristics(this._translateX - item._containerDiffX, this._translateY - item._containerDiffY);
            if (!this._isSortNeeded && !shouldSort)
                return;
            const sortInterval = dragSortHeuristics.sortInterval;
            if (sortInterval <= 0 || this._isSortNeeded) {
                this._isSortNeeded = false;
                if (this._sortTimer !== undefined) {
                    this._sortTimer = void window.clearTimeout(this._sortTimer);
                }
                this._checkOverlap();
            }
            else if (this._sortTimer === undefined) {
                this._sortTimer = window.setTimeout(this._handleSortDelayed, sortInterval);
            }
        }
        _handleSortDelayed() {
            if (!this.item)
                return;
            this._isSortNeeded = true;
            this._sortTimer = undefined;
            addDragSortTick(this.item.id, this._handleSort);
        }
        _cancelSort() {
            if (!this.item)
                return;
            this._isSortNeeded = false;
            if (this._sortTimer !== undefined) {
                this._sortTimer = void window.clearTimeout(this._sortTimer);
            }
            cancelDragSortTick(this.item.id);
        }
        _finishSort() {
            if (!this.item)
                return;
            const { dragSort } = this.item.getGrid().settings;
            const needsFinalCheck = dragSort && (this._isSortNeeded || this._sortTimer !== undefined);
            this._cancelSort();
            if (needsFinalCheck)
                this._checkOverlap();
            if (dragSort)
                this._checkOverlap(true);
        }
        _checkOverlap(isDrop = false) {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            const element = item.element;
            const currentGrid = item.getGrid();
            const { settings } = currentGrid;
            let result = null;
            if (isFunction(settings.dragSortPredicate)) {
                result = settings.dragSortPredicate(item, (isDrop ? this._dragEndEvent : this._dragMoveEvent));
            }
            else if (!isDrop) {
                result = ItemDrag.defaultSortPredicate(item, settings.dragSortPredicate);
            }
            if (!result || typeof result.index !== 'number')
                return;
            const sortAction = result.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
            const targetGrid = result.grid || currentGrid;
            const isMigration = currentGrid !== targetGrid;
            const currentIndex = currentGrid.items.indexOf(item);
            const targetIndex = normalizeArrayIndex(targetGrid.items, result.index, isMigration && sortAction === ACTION_MOVE ? 1 : 0);
            if (!isMigration && targetIndex === this._blockedSortIndex) {
                return;
            }
            if (!isMigration) {
                if (currentIndex !== targetIndex) {
                    this._blockedSortIndex = currentIndex;
                    (sortAction === ACTION_SWAP ? arraySwap : arrayMove)(currentGrid.items, currentIndex, targetIndex);
                    if (currentGrid._hasListeners(EVENT_MOVE)) {
                        currentGrid._emit(EVENT_MOVE, {
                            item: item,
                            fromIndex: currentIndex,
                            toIndex: targetIndex,
                            action: sortAction,
                        });
                    }
                    currentGrid.layout();
                }
            }
            else {
                this._blockedSortIndex = null;
                const targetItem = targetGrid.items[targetIndex];
                const targetSettings = targetGrid.settings;
                if (currentGrid._hasListeners(EVENT_BEFORE_SEND)) {
                    currentGrid._emit(EVENT_BEFORE_SEND, {
                        item: item,
                        fromGrid: currentGrid,
                        fromIndex: currentIndex,
                        toGrid: targetGrid,
                        toIndex: targetIndex,
                    });
                }
                if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
                    targetGrid._emit(EVENT_BEFORE_RECEIVE, {
                        item: item,
                        fromGrid: currentGrid,
                        fromIndex: currentIndex,
                        toGrid: targetGrid,
                        toIndex: targetIndex,
                    });
                }
                if (!this.isActive() || currentGrid.isDestroyed() || targetGrid.isDestroyed()) {
                    return;
                }
                item._gridId = targetGrid.id;
                this._isMigrated = item._gridId !== this._originGridId;
                currentGrid.items.splice(currentIndex, 1);
                arrayInsert(targetGrid.items, item, targetIndex);
                item._sortData = null;
                const currentDragContainer = this._container;
                const currentContainingBlock = this._containingBlock;
                const targetDragContainer = targetSettings.dragContainer || targetGrid.element;
                const targetContainingBlock = getContainingBlock(targetDragContainer);
                let offsetDiff = getOffsetDiff(targetContainingBlock, getContainingBlock(targetGrid.element));
                item._containerDiffX = this._containerDiffX = offsetDiff.left;
                item._containerDiffY = this._containerDiffY = offsetDiff.top;
                if (targetDragContainer !== currentDragContainer) {
                    offsetDiff = getOffsetDiff(currentContainingBlock, targetContainingBlock);
                    this._container = targetDragContainer;
                    this._containingBlock = targetContainingBlock;
                    this._translateX -= offsetDiff.left;
                    this._translateY -= offsetDiff.top;
                    targetDragContainer.appendChild(element);
                    item._setTranslate(this._translateX, this._translateY);
                }
                if (settings.itemClass !== targetSettings.itemClass) {
                    removeClass(element, settings.itemClass);
                    addClass(element, targetSettings.itemClass);
                }
                if (settings.itemDraggingClass !== targetSettings.itemDraggingClass) {
                    removeClass(element, settings.itemDraggingClass);
                    addClass(element, targetSettings.itemDraggingClass);
                }
                if (item.isActive()) {
                    if (settings.itemVisibleClass !== targetSettings.itemVisibleClass) {
                        removeClass(element, settings.itemVisibleClass);
                        addClass(element, targetSettings.itemVisibleClass);
                    }
                    item._visibility.setStyles(targetSettings.visibleStyles);
                }
                else {
                    if (settings.itemHiddenClass !== targetSettings.itemHiddenClass) {
                        removeClass(element, settings.itemHiddenClass);
                        addClass(element, targetSettings.itemHiddenClass);
                    }
                    item._visibility.setStyles(targetSettings.hiddenStyles);
                }
                item._dragPlaceholder.updateClassName(targetSettings.itemPlaceholderClass);
                item._updateDimensions();
                if (currentGrid._hasListeners(EVENT_SEND)) {
                    currentGrid._emit(EVENT_SEND, {
                        item: item,
                        fromGrid: currentGrid,
                        fromIndex: currentIndex,
                        toGrid: targetGrid,
                        toIndex: targetIndex,
                    });
                }
                if (targetGrid._hasListeners(EVENT_RECEIVE)) {
                    targetGrid._emit(EVENT_RECEIVE, {
                        item: item,
                        fromGrid: currentGrid,
                        fromIndex: currentIndex,
                        toGrid: targetGrid,
                        toIndex: targetIndex,
                    });
                }
                if (sortAction === ACTION_SWAP && targetItem && targetItem.isActive()) {
                    if (targetGrid.items.indexOf(targetItem) > -1) {
                        targetGrid.send(targetItem, currentGrid, currentIndex, {
                            appendTo: currentDragContainer || document.body,
                            layoutSender: false,
                            layoutReceiver: false,
                        });
                    }
                }
                currentGrid.layout();
                targetGrid.layout();
            }
        }
        _finishMigration() {
            if (!this.item)
                return;
            const { item } = this;
            const { dragEnabled } = item.getGrid().settings;
            this.destroy();
            item._drag = dragEnabled ? new ItemDrag(item) : null;
            item._dragRelease.start();
        }
        _preStartCheck(event) {
            if (this._startPredicateState === START_PREDICATE_INACTIVE) {
                this._startPredicateState = START_PREDICATE_PENDING;
            }
            if (this._startPredicateState === START_PREDICATE_PENDING) {
                const shouldStart = this._startPredicate(this.item, event);
                if (shouldStart === true) {
                    this._startPredicateState = START_PREDICATE_RESOLVED;
                    this._onStart(event);
                }
                else if (shouldStart === false) {
                    this._startPredicateState = START_PREDICATE_INACTIVE;
                    this.dragger.reset();
                }
            }
            else if (this._startPredicateState === START_PREDICATE_RESOLVED && this.isActive()) {
                this._onMove(event);
            }
        }
        _preEndCheck(event) {
            const isResolved = this._startPredicateState === START_PREDICATE_RESOLVED;
            this._startPredicate(this.item, event);
            this._resetDefaultStartPredicate();
            this._startPredicateState = START_PREDICATE_INACTIVE;
            if (!isResolved || !this.isActive())
                return;
            if (this._isStarted) {
                this._onEnd(event);
            }
            else {
                this.stop();
            }
        }
        _onStart(event) {
            if (!this.item || !this.item.isActive())
                return;
            this._isActive = true;
            this._dragStartEvent = event;
            ItemDrag.autoScroll.addItem(this.item, this._translateX, this._translateY);
            addDragStartTick(this.item.id, this._prepareStart, this._applyStart);
        }
        _prepareStart() {
            if (!this.item || !this.isActive() || !this.item.isActive())
                return;
            const { item } = this;
            const element = item.element;
            const grid = item.getGrid();
            const dragContainer = grid.settings.dragContainer || grid.element;
            const containingBlock = getContainingBlock(dragContainer);
            const translate = item._getTranslate();
            const elementRect = element.getBoundingClientRect();
            this._container = dragContainer;
            this._containingBlock = containingBlock;
            this._clientX = elementRect.left;
            this._clientY = elementRect.top;
            this._translateX = translate.x;
            this._translateY = translate.y;
            this._scrollDiffX = this._scrollDiffY = 0;
            this._moveDiffX = this._moveDiffY = 0;
            this._containerDiffX = this._containerDiffY = 0;
            if (dragContainer !== grid.element) {
                const { left, top } = getOffsetDiff(containingBlock, grid.element);
                this._containerDiffX = left;
                this._containerDiffY = top;
            }
            this._resetHeuristics(this._translateX - item._containerDiffX, this._translateY - item._containerDiffY);
        }
        _applyStart() {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            if (!item.isActive())
                return;
            if (item.isPositioning()) {
                item._layout.stop(true, this._translateX, this._translateY);
            }
            const migrate = item._migrate;
            if (migrate.isActive()) {
                this._translateX -= item._containerDiffX;
                this._translateY -= item._containerDiffY;
                migrate.stop(true, this._translateX, this._translateY);
            }
            const release = item._dragRelease;
            if (item.isReleasing())
                release.reset();
            const grid = item.getGrid();
            const element = item.element;
            if (grid.settings.dragPlaceholder.enabled) {
                item._dragPlaceholder.create();
            }
            this._isStarted = true;
            if (this._dragStartEvent) {
                grid._emit(EVENT_DRAG_INIT, item, this._dragStartEvent);
            }
            if (element.parentNode !== this._container) {
                this._translateX += this._containerDiffX;
                this._translateY += this._containerDiffY;
                this._container.appendChild(element);
                item._setTranslate(this._translateX, this._translateY);
            }
            item._containerDiffX = this._containerDiffX;
            item._containerDiffY = this._containerDiffY;
            addClass(element, grid.settings.itemDraggingClass);
            this._bindScrollHandler();
            if (this._dragStartEvent) {
                grid._emit(EVENT_DRAG_START, item, this._dragStartEvent);
            }
        }
        _onMove(event) {
            if (!this.item)
                return;
            if (!this.item.isActive()) {
                this.stop();
                return;
            }
            const itemId = this.item.id;
            this._dragMoveEvent = event;
            addDragMoveTick(itemId, this._prepareMove, this._applyMove);
            addDragSortTick(itemId, this._handleSort);
        }
        _prepareMove() {
            if (!this.item || !this.isActive() || !this.item.isActive())
                return;
            const { dragAxis } = this.item.getGrid().settings;
            const nextEvent = this._dragMoveEvent;
            const prevEvent = (this._dragPrevMoveEvent || this._dragStartEvent || nextEvent);
            if (dragAxis !== 'y') {
                const moveDiffX = nextEvent.clientX - prevEvent.clientX;
                this._translateX = this._translateX - this._moveDiffX + moveDiffX;
                this._clientX = this._clientX - this._moveDiffX + moveDiffX;
                this._moveDiffX = moveDiffX;
            }
            if (dragAxis !== 'x') {
                const moveDiffY = nextEvent.clientY - prevEvent.clientY;
                this._translateY = this._translateY - this._moveDiffY + moveDiffY;
                this._clientY = this._clientY - this._moveDiffY + moveDiffY;
                this._moveDiffY = moveDiffY;
            }
            this._dragPrevMoveEvent = nextEvent;
        }
        _applyMove() {
            if (!this.item || !this.isActive() || !this.item.isActive())
                return;
            const { item } = this;
            const grid = item.getGrid();
            this._moveDiffX = this._moveDiffY = 0;
            item._setTranslate(this._translateX, this._translateY);
            if (this._dragMoveEvent) {
                grid._emit(EVENT_DRAG_MOVE, item, this._dragMoveEvent);
            }
            ItemDrag.autoScroll.updateItem(item, this._translateX, this._translateY);
        }
        _onScroll(event) {
            if (!this.item)
                return;
            if (!this.item.isActive()) {
                this.stop();
                return;
            }
            const itemId = this.item.id;
            this._scrollEvent = event;
            addDragScrollTick(itemId, this._prepareScroll, this._applyScroll);
            addDragSortTick(itemId, this._handleSort);
        }
        _prepareScroll() {
            if (!this.item || !this.isActive() || !this.item.isActive())
                return;
            const { item } = this;
            const grid = item.getGrid();
            if (this._container !== grid.element) {
                const { left, top } = getOffsetDiff(this._containingBlock, grid.element);
                item._containerDiffX = this._containerDiffX = left;
                item._containerDiffY = this._containerDiffY = top;
            }
            const { dragAxis } = grid.settings;
            const { left, top } = item.element.getBoundingClientRect();
            if (dragAxis !== 'y') {
                const scrollDiffX = this._clientX - this._moveDiffX - this._scrollDiffX - left;
                this._translateX = this._translateX - this._scrollDiffX + scrollDiffX;
                this._scrollDiffX = scrollDiffX;
            }
            if (dragAxis !== 'x') {
                const scrollDiffY = this._clientY - this._moveDiffY - this._scrollDiffY - top;
                this._translateY = this._translateY - this._scrollDiffY + scrollDiffY;
                this._scrollDiffY = scrollDiffY;
            }
        }
        _applyScroll() {
            if (!this.item || !this.isActive() || !this.item.isActive())
                return;
            const { item } = this;
            const grid = item.getGrid();
            this._scrollDiffX = this._scrollDiffY = 0;
            item._setTranslate(this._translateX, this._translateY);
            if (this._scrollEvent) {
                grid._emit(EVENT_DRAG_SCROLL, item, this._scrollEvent);
            }
        }
        _onEnd(event) {
            if (!this.item)
                return;
            const { item } = this;
            if (!item.isActive()) {
                this.stop();
                return;
            }
            const grid = item.getGrid();
            this._dragEndEvent = event;
            cancelDragStartTick(item.id);
            cancelDragMoveTick(item.id);
            cancelDragScrollTick(item.id);
            this._finishSort();
            this._unbindScrollHandler();
            this._reset();
            removeClass(item.element, grid.settings.itemDraggingClass);
            ItemDrag.autoScroll.removeItem(item);
            grid._emit(EVENT_DRAG_END, item, event);
            this._isMigrated ? this._finishMigration() : item._dragRelease.start();
        }
    }
    ItemDrag.autoScroll = new AutoScroller();
    ItemDrag.defaultStartPredicate = defaultStartPredicate;
    ItemDrag.defaultSortPredicate = defaultSortPredicate;

    const unprefixRegEx = /^(webkit|moz|ms|o|Webkit|Moz|MS|O)(?=[A-Z])/;
    const cache = new Map();
    function getUnprefixedPropName(prop) {
        let result = cache.get(prop);
        if (result)
            return result;
        result = prop.replace(unprefixRegEx, '');
        if (result !== prop) {
            result = result[0].toLowerCase() + result.slice(1);
        }
        cache.set(prop, result);
        return result;
    }

    const nativeCode = '[native code]';
    function isNative(feat) {
        return !!(feat &&
            isFunction(window.Symbol) &&
            isFunction(window.Symbol.toString) &&
            window.Symbol(feat).toString().indexOf(nativeCode) > -1);
    }

    function setStyles(element, styles) {
        let prop;
        for (prop in styles) {
            element.style[prop] = styles[prop] || '';
        }
    }

    const HAS_WEB_ANIMATIONS = isFunction(Element.prototype.animate);
    const HAS_NATIVE_WEB_ANIMATIONS = isNative(Element.prototype.animate);
    function createKeyframe(props, prefix) {
        const keyframe = {};
        let prop;
        for (prop in props) {
            keyframe[prefix ? prop : getUnprefixedPropName(prop)] = props[prop];
        }
        return keyframe;
    }
    class Animator {
        constructor(element) {
            this.element = element || null;
            this.animation = null;
            this._finishCallback = null;
            this._onFinish = this._onFinish.bind(this);
        }
        start(propsFrom, propsTo, options) {
            if (!this.element)
                return;
            const { element } = this;
            const { duration, easing, onFinish } = options || {};
            if (!HAS_WEB_ANIMATIONS) {
                setStyles(element, propsTo);
                this._finishCallback = isFunction(onFinish) ? onFinish : null;
                this._onFinish();
                return;
            }
            if (this.animation)
                this.animation.cancel();
            this.animation = element.animate([
                createKeyframe(propsFrom, HAS_NATIVE_WEB_ANIMATIONS),
                createKeyframe(propsTo, HAS_NATIVE_WEB_ANIMATIONS),
            ], {
                duration: duration || 300,
                easing: easing || 'ease',
            });
            this._finishCallback = isFunction(onFinish) ? onFinish : null;
            this.animation.onfinish = this._onFinish;
            setStyles(element, propsTo);
        }
        stop() {
            if (!this.element || !this.animation)
                return;
            this.animation.cancel();
            this.animation = this._finishCallback = null;
        }
        isAnimating() {
            return !!this.animation;
        }
        destroy() {
            if (!this.element)
                return;
            this.stop();
            this.element = null;
        }
        _onFinish() {
            const { _finishCallback } = this;
            this.animation = this._finishCallback = null;
            _finishCallback && _finishCallback();
        }
    }

    function createTranslate(x, y, translate3d = false) {
        return translate3d
            ? 'translate3d(' + x + 'px, ' + y + 'px, 0px)'
            : 'translateX(' + x + 'px) translateY(' + y + 'px)';
    }

    const translateValue = { x: 0, y: 0 };
    const transformNone = 'none';
    const rxMat3d = /^matrix3d/;
    const rxMatTx = /([^,]*,){4}/;
    const rxMat3dTx = /([^,]*,){12}/;
    const rxNextItem = /[^,]*,/;
    function getTranslate(element) {
        translateValue.x = 0;
        translateValue.y = 0;
        const transform = getStyle(element, transformStyle);
        if (!transform || transform === transformNone) {
            return translateValue;
        }
        const isMat3d = rxMat3d.test(transform);
        const tX = transform.replace(isMat3d ? rxMat3dTx : rxMatTx, '');
        const tY = tX.replace(rxNextItem, '');
        translateValue.x = parseFloat(tX) || 0;
        translateValue.y = parseFloat(tY) || 0;
        return translateValue;
    }

    const CURRENT_STYLES$1 = {};
    const TARGET_STYLES$1 = {};
    class ItemDragPlaceholder {
        constructor(item) {
            this.item = item;
            this.element = null;
            this.animator = new Animator();
            this.left = 0;
            this.top = 0;
            this._className = '';
            this._didMigrate = false;
            this._resetAfterLayout = false;
            this._transX = 0;
            this._transY = 0;
            this._nextTransX = 0;
            this._nextTransY = 0;
            this._setupAnimation = this._setupAnimation.bind(this);
            this._startAnimation = this._startAnimation.bind(this);
            this._updateDimensions = this._updateDimensions.bind(this);
            this._onLayoutStart = this._onLayoutStart.bind(this);
            this._onLayoutEnd = this._onLayoutEnd.bind(this);
            this._onReleaseEnd = this._onReleaseEnd.bind(this);
            this._onMigrate = this._onMigrate.bind(this);
            this._onHide = this._onHide.bind(this);
        }
        create() {
            if (!this.item)
                return;
            if (this.element) {
                this._resetAfterLayout = false;
                return;
            }
            const { item } = this;
            const grid = item.getGrid();
            const { settings } = grid;
            this.left = item.left;
            this.top = item.top;
            let element;
            if (isFunction(settings.dragPlaceholder.createElement)) {
                element = settings.dragPlaceholder.createElement(item);
            }
            else {
                element = document.createElement('div');
            }
            this.element = element;
            this.animator.element = element;
            this._className = settings.itemPlaceholderClass || '';
            if (this._className) {
                addClass(element, this._className);
            }
            setStyles(element, {
                position: 'absolute',
                left: '0px',
                top: '0px',
                width: item.width + 'px',
                height: item.height + 'px',
            });
            element.style[transformProp] = createTranslate(item.left + item.marginLeft, item.top + item.marginTop, settings.translate3d);
            grid.on(EVENT_LAYOUT_START, this._onLayoutStart);
            grid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
            grid.on(EVENT_BEFORE_SEND, this._onMigrate);
            grid.on(EVENT_HIDE_START, this._onHide);
            if (isFunction(settings.dragPlaceholder.onCreate)) {
                settings.dragPlaceholder.onCreate(item, element);
            }
            grid.element.appendChild(element);
        }
        reset() {
            var _a;
            if (!this.item || !this.element)
                return;
            const { item, element, animator } = this;
            const grid = item.getGrid();
            this._resetAfterLayout = false;
            cancelPlaceholderLayoutTick(item.id);
            cancelPlaceholderResizeTick(item.id);
            animator.stop();
            animator.element = null;
            grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
            grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
            grid.off(EVENT_BEFORE_SEND, this._onMigrate);
            grid.off(EVENT_HIDE_START, this._onHide);
            if (this._className) {
                removeClass(element, this._className);
                this._className = '';
            }
            (_a = element.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(element);
            this.element = null;
            const { onRemove } = grid.settings.dragPlaceholder;
            if (isFunction(onRemove))
                onRemove(item, element);
        }
        isActive() {
            return !!this.element;
        }
        updateDimensions() {
            if (!this.item || !this.isActive())
                return;
            addPlaceholderResizeTick(this.item.id, this._updateDimensions);
        }
        updateClassName(className) {
            if (!this.element)
                return;
            removeClass(this.element, this._className);
            this._className = className;
            addClass(this.element, className);
        }
        destroy() {
            this.reset();
            this.animator && this.animator.destroy();
            this.item = null;
        }
        _updateDimensions() {
            if (!this.item || !this.element)
                return;
            setStyles(this.element, {
                width: this.item.width + 'px',
                height: this.item.height + 'px',
            });
        }
        _onLayoutStart(items, isInstant) {
            if (!this.item || !this.element)
                return;
            const { item } = this;
            if (items.indexOf(item) === -1) {
                this.reset();
                return;
            }
            const nextLeft = item.left;
            const nextTop = item.top;
            const currentLeft = this.left;
            const currentTop = this.top;
            this.left = nextLeft;
            this.top = nextTop;
            if (!isInstant && !this._didMigrate && currentLeft === nextLeft && currentTop === nextTop) {
                return;
            }
            const nextX = nextLeft + item.marginLeft;
            const nextY = nextTop + item.marginTop;
            const grid = item.getGrid();
            const animEnabled = !isInstant && grid.settings.layoutDuration > 0;
            if (!animEnabled || this._didMigrate) {
                cancelPlaceholderLayoutTick(item.id);
                this.element.style[transformProp] = createTranslate(nextX, nextY, grid.settings.translate3d);
                this.animator.stop();
                if (this._didMigrate) {
                    grid.element.appendChild(this.element);
                    this._didMigrate = false;
                }
                return;
            }
            if (this.animator.animation) {
                this.animator.animation.onfinish = null;
            }
            this._nextTransX = nextX;
            this._nextTransY = nextY;
            addPlaceholderLayoutTick(item.id, this._setupAnimation, this._startAnimation);
        }
        _setupAnimation() {
            if (!this.element)
                return;
            const { x, y } = getTranslate(this.element);
            this._transX = x;
            this._transY = y;
        }
        _startAnimation() {
            if (!this.item || !this.element)
                return;
            const { animator } = this;
            const currentX = this._transX;
            const currentY = this._transY;
            const nextX = this._nextTransX;
            const nextY = this._nextTransY;
            const { layoutDuration, layoutEasing, translate3d } = this.item.getGrid().settings;
            if (currentX === nextX && currentY === nextY) {
                if (animator.isAnimating()) {
                    this.element.style[transformProp] = createTranslate(nextX, nextY, translate3d);
                    animator.stop();
                }
                return;
            }
            CURRENT_STYLES$1[transformProp] = createTranslate(currentX, currentY, translate3d);
            TARGET_STYLES$1[transformProp] = createTranslate(nextX, nextY, translate3d);
            animator.start(CURRENT_STYLES$1, TARGET_STYLES$1, {
                duration: layoutDuration,
                easing: layoutEasing,
                onFinish: this._onLayoutEnd,
            });
        }
        _onLayoutEnd() {
            if (this._resetAfterLayout) {
                this.reset();
            }
        }
        _onReleaseEnd(item) {
            if (this.item && this.item.id === item.id) {
                if (!this.animator.isAnimating()) {
                    this.reset();
                    return;
                }
                this._resetAfterLayout = true;
            }
        }
        _onMigrate(data) {
            if (!this.item || this.item !== data.item)
                return;
            const grid = this.item.getGrid();
            grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
            grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
            grid.off(EVENT_BEFORE_SEND, this._onMigrate);
            grid.off(EVENT_HIDE_START, this._onHide);
            const nextGrid = data.toGrid;
            nextGrid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
            nextGrid.on(EVENT_LAYOUT_START, this._onLayoutStart);
            nextGrid.on(EVENT_BEFORE_SEND, this._onMigrate);
            nextGrid.on(EVENT_HIDE_START, this._onHide);
            this._didMigrate = true;
        }
        _onHide(items) {
            if (this.item && items.indexOf(this.item) > -1)
                this.reset();
        }
    }

    const SCROLL_LISTENER_OPTIONS = HAS_PASSIVE_EVENTS ? { capture: true, passive: true } : true;
    class ItemDragRelease {
        constructor(item) {
            this.item = item;
            this._isActive = false;
            this._isPositioning = false;
            this._onScroll = this._onScroll.bind(this);
        }
        isActive() {
            return this._isActive;
        }
        isPositioning() {
            return this._isPositioning;
        }
        start() {
            if (!this.item || this.isActive())
                return;
            const { item } = this;
            const grid = item.getGrid();
            const { settings } = grid;
            this._isActive = true;
            addClass(item.element, settings.itemReleasingClass);
            if (!settings.dragRelease.useDragContainer) {
                this._placeToGrid();
            }
            else if (item.element.parentNode !== grid.element) {
                window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
            }
            grid._emit(EVENT_DRAG_RELEASE_START, item);
            if (!grid._nextLayoutData)
                item._layout.start(false);
        }
        stop(abort = false, left, top) {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            if (!abort && (left === undefined || top === undefined)) {
                left = item.left;
                top = item.top;
            }
            const didReparent = this._placeToGrid(left, top);
            this.reset(didReparent);
            if (!abort) {
                item.getGrid()._emit(EVENT_DRAG_RELEASE_END, item);
            }
        }
        reset(needsReflow = false) {
            if (!this.item)
                return;
            const { item } = this;
            const { itemReleasingClass } = item.getGrid().settings;
            this._isActive = false;
            this._isPositioning = false;
            cancelReleaseScrollTick(item.id);
            window.removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
            if (itemReleasingClass) {
                if (needsReflow)
                    item.element.clientWidth;
                removeClass(item.element, itemReleasingClass);
            }
        }
        destroy() {
            if (!this.item)
                return;
            this.stop(true);
            this.item = null;
        }
        _placeToGrid(left, top) {
            if (!this.item)
                return false;
            const { item } = this;
            const gridElement = item.getGrid().element;
            if (item.element.parentNode !== gridElement) {
                if (left === undefined || top === undefined) {
                    const { x, y } = item._getTranslate();
                    left = x - item._containerDiffX;
                    top = y - item._containerDiffY;
                }
                gridElement.appendChild(item.element);
                item._setTranslate(left, top);
                item._containerDiffX = 0;
                item._containerDiffY = 0;
                return true;
            }
            return false;
        }
        _onScroll() {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            let diffX = 0;
            let diffY = 0;
            addReleaseScrollTick(item.id, () => {
                if (!this.isActive())
                    return;
                const itemContainer = item.element.parentNode;
                if (itemContainer) {
                    const gridElement = item.getGrid().element;
                    const { left, top } = getOffsetDiff(itemContainer, gridElement, true);
                    diffX = left;
                    diffY = top;
                }
            }, () => {
                if (!this.isActive())
                    return;
                if (Math.abs(diffX - item._containerDiffX) > 0.1 ||
                    Math.abs(diffY - item._containerDiffY) > 0.1) {
                    item._containerDiffX = diffX;
                    item._containerDiffY = diffY;
                    item._dragPlaceholder.reset();
                    item._layout.stop(true, item.left, item.top);
                    this.stop(false, item.left, item.top);
                }
            });
        }
    }

    const MIN_ANIMATION_DISTANCE = 2;
    const CURRENT_STYLES = {};
    const TARGET_STYLES = {};
    const ANIM_OPTIONS = {
        duration: 0,
        easing: '',
        onFinish: undefined,
    };
    class ItemLayout {
        constructor(item) {
            this.item = item;
            this.animator = new Animator(item.element);
            this._skipNextAnimation = false;
            this._isActive = false;
            this._isInterrupted = false;
            this._easing = '';
            this._duration = 0;
            this._tX = 0;
            this._tY = 0;
            this._queue = 'layout-' + item.id;
            this._setupAnimation = this._setupAnimation.bind(this);
            this._startAnimation = this._startAnimation.bind(this);
            this._finish = this._finish.bind(this);
            const { style } = item.element;
            style.left = '0px';
            style.top = '0px';
            this.item._setTranslate(0, 0);
        }
        isActive() {
            return this._isActive;
        }
        start(instant, onFinish) {
            if (!this.item)
                return;
            const { item, animator } = this;
            const grid = item.getGrid();
            const release = item._dragRelease;
            const { settings } = grid;
            const isPositioning = this.isActive();
            const isJustReleased = release.isActive() && !release.isPositioning();
            const animDuration = isJustReleased ? settings.dragRelease.duration : settings.layoutDuration;
            const animEasing = isJustReleased ? settings.dragRelease.easing : settings.layoutEasing;
            const animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;
            if (isPositioning) {
                cancelLayoutTick(item.id);
                item._emitter.burst(this._queue, true, item);
            }
            if (isJustReleased)
                release._isPositioning = true;
            if (onFinish && isFunction(onFinish)) {
                item._emitter.on(this._queue, onFinish);
            }
            this._skipNextAnimation = false;
            if (!animEnabled) {
                item._setTranslate(item.left + item._containerDiffX, item.top + item._containerDiffY);
                animator.stop();
                this._finish();
                return;
            }
            if (animator.animation) {
                animator.animation.onfinish = null;
            }
            grid._itemLayoutNeedsDimensionRefresh = true;
            this._isActive = true;
            this._easing = animEasing;
            this._duration = animDuration;
            this._isInterrupted = isPositioning;
            addLayoutTick(item.id, this._setupAnimation, this._startAnimation);
        }
        stop(processCallbackQueue, left, top) {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            cancelLayoutTick(item.id);
            if (this.animator.isAnimating()) {
                if (left === undefined || top === undefined) {
                    const { x, y } = getTranslate(item.element);
                    item._setTranslate(x, y);
                }
                else {
                    item._setTranslate(left, top);
                }
                this.animator.stop();
            }
            const { itemPositioningClass } = item.getGrid().settings;
            removeClass(item.element, itemPositioningClass);
            this._isActive = false;
            if (processCallbackQueue) {
                item._emitter.burst(this._queue, true, item);
            }
        }
        destroy() {
            if (!this.item)
                return;
            this.stop(true, 0, 0);
            this.item._emitter.clear(this._queue);
            this.animator.destroy();
            const { style } = this.item.element;
            style[transformProp] = '';
            style.left = '';
            style.top = '';
            this.item = null;
        }
        _finish() {
            if (!this.item)
                return;
            const { item } = this;
            item._translateX = item.left + item._containerDiffX;
            item._translateY = item.top + item._containerDiffY;
            if (this.isActive()) {
                this._isActive = false;
                const { itemPositioningClass } = item.getGrid().settings;
                removeClass(item.element, itemPositioningClass);
            }
            if (item._dragRelease.isActive())
                item._dragRelease.stop();
            if (item._migrate.isActive())
                item._migrate.stop();
            item._emitter.burst(this._queue, false, item);
        }
        _setupAnimation() {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            const { x, y } = item._getTranslate();
            this._tX = x;
            this._tY = y;
            const grid = item.getGrid();
            if (grid.settings._animationWindowing && grid._itemLayoutNeedsDimensionRefresh) {
                grid._itemLayoutNeedsDimensionRefresh = false;
                grid._updateBoundingRect();
                grid._updateBorders(true, false, true, false);
            }
        }
        _startAnimation() {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            const { settings } = item.getGrid();
            const isInstant = this._duration <= 0;
            const nextLeft = item.left + item._containerDiffX;
            const nextTop = item.top + item._containerDiffY;
            const xDiff = Math.abs(item.left - (this._tX - item._containerDiffX));
            const yDiff = Math.abs(item.top - (this._tY - item._containerDiffY));
            if (isInstant ||
                (xDiff < MIN_ANIMATION_DISTANCE && yDiff < MIN_ANIMATION_DISTANCE) ||
                (settings._animationWindowing &&
                    !item._isInViewport(this._tX, this._tY, VIEWPORT_THRESHOLD) &&
                    !item._isInViewport(nextLeft, nextTop, VIEWPORT_THRESHOLD))) {
                if (this._isInterrupted || xDiff > 0.1 || yDiff > 0.1) {
                    item._setTranslate(nextLeft, nextTop);
                }
                this.animator.stop();
                this._finish();
                return;
            }
            if (!this._isInterrupted) {
                addClass(item.element, settings.itemPositioningClass);
            }
            CURRENT_STYLES[transformProp] = createTranslate(this._tX, this._tY, settings.translate3d);
            TARGET_STYLES[transformProp] = createTranslate(nextLeft, nextTop, settings.translate3d);
            ANIM_OPTIONS.duration = this._duration;
            ANIM_OPTIONS.easing = this._easing;
            ANIM_OPTIONS.onFinish = this._finish;
            item._translateX = item._translateY = undefined;
            this.animator.start(CURRENT_STYLES, TARGET_STYLES, ANIM_OPTIONS);
            ANIM_OPTIONS.onFinish = undefined;
        }
    }

    class ItemMigrate {
        constructor(item) {
            this.item = item;
            this.container = null;
            this._isActive = false;
        }
        isActive() {
            return this._isActive;
        }
        start(targetGrid, position, container) {
            if (!this.item)
                return;
            const item = this.item;
            const grid = item.getGrid();
            const element = item.element;
            const isActive = item.isActive();
            const isVisible = item.isVisible();
            const settings = grid.settings;
            const currentIndex = grid.items.indexOf(item);
            const targetElement = targetGrid.element;
            const targetSettings = targetGrid.settings;
            const targetItems = targetGrid.items;
            const targetContainer = container || document.body;
            let targetIndex = 0;
            if (typeof position === 'number') {
                targetIndex = normalizeArrayIndex(targetItems, position, 1);
            }
            else {
                const targetItem = targetGrid.getItem(position);
                if (!targetItem)
                    return;
                targetIndex = targetItems.indexOf(targetItem);
            }
            if (item._drag)
                item._drag.stop();
            if (this.isActive() || item.isPositioning() || item.isReleasing()) {
                let { x, y } = item._getTranslate();
                if (item.isPositioning()) {
                    item._layout.stop(true, x, y);
                }
                x -= item._containerDiffX;
                y -= item._containerDiffY;
                if (this.isActive()) {
                    this.stop(true, x, y);
                }
                else if (item.isReleasing()) {
                    item._dragRelease.stop(true, x, y);
                }
            }
            item._visibility.stop(true);
            if (grid._hasListeners(EVENT_BEFORE_SEND)) {
                grid._emit(EVENT_BEFORE_SEND, {
                    item: item,
                    fromGrid: grid,
                    fromIndex: currentIndex,
                    toGrid: targetGrid,
                    toIndex: targetIndex,
                });
            }
            if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
                targetGrid._emit(EVENT_BEFORE_RECEIVE, {
                    item: item,
                    fromGrid: grid,
                    fromIndex: currentIndex,
                    toGrid: targetGrid,
                    toIndex: targetIndex,
                });
            }
            if (item.isDestroyed() || grid.isDestroyed() || targetGrid.isDestroyed()) {
                return;
            }
            if (item._drag) {
                item._drag.destroy();
                item._drag = null;
            }
            if (settings.itemClass !== targetSettings.itemClass) {
                removeClass(element, settings.itemClass);
                addClass(element, targetSettings.itemClass);
            }
            const currentVisClass = isVisible ? settings.itemVisibleClass : settings.itemHiddenClass;
            const nextVisClass = isVisible
                ? targetSettings.itemVisibleClass
                : targetSettings.itemHiddenClass;
            if (currentVisClass !== nextVisClass) {
                removeClass(element, currentVisClass);
                addClass(element, nextVisClass);
            }
            grid.items.splice(currentIndex, 1);
            arrayInsert(targetItems, item, targetIndex);
            item._gridId = targetGrid.id;
            if (isActive) {
                const currentContainer = element.parentNode;
                if (targetContainer !== currentContainer) {
                    targetContainer.appendChild(element);
                    const offsetDiff = getOffsetDiff(targetContainer, currentContainer, true);
                    const t = item._getTranslate();
                    item._setTranslate(t.x + offsetDiff.left, t.y + offsetDiff.top);
                }
            }
            else {
                targetElement.appendChild(element);
            }
            item._visibility.setStyles(isVisible ? targetSettings.visibleStyles : targetSettings.hiddenStyles);
            if (isActive) {
                const { left, top } = getOffsetDiff(targetContainer, targetElement, true);
                item._containerDiffX = left;
                item._containerDiffY = top;
            }
            item._updateDimensions();
            item._sortData = null;
            if (targetSettings.dragEnabled) {
                item._drag = new ItemDrag(item);
            }
            if (isActive) {
                this._isActive = true;
                this.container = targetContainer;
            }
            else {
                this._isActive = false;
                this.container = null;
            }
            if (grid._hasListeners(EVENT_SEND)) {
                grid._emit(EVENT_SEND, {
                    item: item,
                    fromGrid: grid,
                    fromIndex: currentIndex,
                    toGrid: targetGrid,
                    toIndex: targetIndex,
                });
            }
            if (targetGrid._hasListeners(EVENT_RECEIVE)) {
                targetGrid._emit(EVENT_RECEIVE, {
                    item: item,
                    fromGrid: grid,
                    fromIndex: currentIndex,
                    toGrid: targetGrid,
                    toIndex: targetIndex,
                });
            }
        }
        stop(abort = false, left, top) {
            if (!this.item || !this.isActive())
                return;
            const { item } = this;
            const grid = item.getGrid();
            if (this.container !== grid.element) {
                if (left === undefined || top === undefined) {
                    if (abort) {
                        const t = item._getTranslate();
                        left = t.x - item._containerDiffX;
                        top = t.y - item._containerDiffY;
                    }
                    else {
                        left = item.left;
                        top = item.top;
                    }
                }
                grid.element.appendChild(item.element);
                item._setTranslate(left, top);
                item._containerDiffX = 0;
                item._containerDiffY = 0;
            }
            this._isActive = false;
            this.container = null;
        }
        destroy() {
            if (!this.item)
                return;
            this.stop(true);
            this.item = null;
        }
    }

    function getCurrentStyles(element, styles) {
        const result = {};
        let prop;
        if (Array.isArray(styles)) {
            let i = 0;
            for (; i < styles.length; i++) {
                prop = styles[i];
                result[prop] = getStyle(element, getStyleName(prop));
            }
        }
        else {
            for (prop in styles) {
                result[prop] = getStyle(element, getStyleName(prop));
            }
        }
        return result;
    }

    class ItemVisibility {
        constructor(item) {
            const element = item.element.children[0];
            if (!element) {
                throw new Error('No valid child element found within item element.');
            }
            const isActive = item.isActive();
            this.item = item;
            this.element = element;
            this.animator = new Animator(element);
            this._isHidden = !isActive;
            this._isHiding = false;
            this._isShowing = false;
            this._currentStyleProps = [];
            this._queue = 'visibility-' + item.id;
            this._finishShow = this._finishShow.bind(this);
            this._finishHide = this._finishHide.bind(this);
            item.element.style.display = isActive ? '' : 'none';
            const { settings } = item.getGrid();
            addClass(item.element, isActive ? settings.itemVisibleClass : settings.itemHiddenClass);
            this.setStyles(isActive ? settings.visibleStyles : settings.hiddenStyles);
        }
        isHidden() {
            return this._isHidden;
        }
        isHiding() {
            return this._isHiding;
        }
        isShowing() {
            return this._isShowing;
        }
        show(instant, onFinish) {
            if (!this.item)
                return;
            const { item } = this;
            const callback = isFunction(onFinish) ? onFinish : null;
            if (!this._isShowing && !this._isHidden) {
                callback && callback(false, item);
                return;
            }
            if (this._isShowing && !instant) {
                callback && item._emitter.on(this._queue, callback);
                return;
            }
            if (!this._isShowing) {
                item._emitter.burst(this._queue, true, item);
                const { settings } = item.getGrid();
                if (settings) {
                    removeClass(item.element, settings.itemHiddenClass);
                    addClass(item.element, settings.itemVisibleClass);
                }
                if (!this._isHiding)
                    item.element.style.display = '';
            }
            callback && item._emitter.on(this._queue, callback);
            this._isShowing = true;
            this._isHiding = this._isHidden = false;
            this._startAnimation(true, instant, this._finishShow);
        }
        hide(instant, onFinish) {
            if (!this.item)
                return;
            const { item } = this;
            const callback = isFunction(onFinish) ? onFinish : null;
            if (!this._isHiding && this._isHidden) {
                callback && callback(false, item);
                return;
            }
            if (this._isHiding && !instant) {
                callback && item._emitter.on(this._queue, callback);
                return;
            }
            if (!this._isHiding) {
                item._emitter.burst(this._queue, true, item);
                const { settings } = item.getGrid();
                addClass(item.element, settings.itemHiddenClass);
                removeClass(item.element, settings.itemVisibleClass);
            }
            callback && item._emitter.on(this._queue, callback);
            this._isHidden = this._isHiding = true;
            this._isShowing = false;
            this._startAnimation(false, instant, this._finishHide);
        }
        stop(processCallbackQueue) {
            if (!this.item || (!this._isHiding && !this._isShowing))
                return;
            const { item } = this;
            cancelVisibilityTick(item.id);
            this.animator.stop();
            if (processCallbackQueue) {
                item._emitter.burst(this._queue, true, item);
            }
        }
        setStyles(styles) {
            if (!this.element)
                return;
            const { element, _currentStyleProps } = this;
            this._removeCurrentStyles();
            let prop;
            for (prop in styles) {
                _currentStyleProps.push(prop);
                element.style[prop] = styles[prop];
            }
        }
        destroy() {
            if (!this.item)
                return;
            const { item } = this;
            const itemElement = item.element;
            const { settings } = item.getGrid();
            this.stop(true);
            item._emitter.clear(this._queue);
            this.animator.destroy();
            this._removeCurrentStyles();
            if (settings) {
                removeClass(itemElement, settings.itemVisibleClass);
                removeClass(itemElement, settings.itemHiddenClass);
            }
            itemElement.style.display = '';
            this._isHiding = this._isShowing = false;
            this._isHidden = true;
            this.item = null;
        }
        _startAnimation(toVisible, instant, onFinish) {
            if (!this.item || !this.element)
                return;
            const { item, element, animator } = this;
            const grid = item.getGrid();
            const { settings } = grid;
            const targetStyles = toVisible ? settings.visibleStyles : settings.hiddenStyles;
            const duration = toVisible ? settings.showDuration : settings.hideDuration;
            const easing = toVisible ? settings.showEasing : settings.hideEasing;
            const isInstant = instant || duration <= 0;
            if (!targetStyles) {
                animator.stop();
                onFinish && onFinish();
                return;
            }
            cancelVisibilityTick(item.id);
            if (isInstant) {
                setStyles(element, targetStyles);
                animator.stop();
                onFinish && onFinish();
                return;
            }
            if (animator.animation) {
                animator.animation.onfinish = null;
            }
            let currentStyles;
            let tX = 0;
            let tY = 0;
            grid._itemVisibilityNeedsDimensionRefresh = true;
            addVisibilityTick(item.id, () => {
                if (!this.item || (toVisible ? !this._isShowing : !this._isHiding))
                    return;
                currentStyles = getCurrentStyles(element, targetStyles);
                const { x, y } = item._getTranslate();
                tX = x;
                tY = y;
                if (settings._animationWindowing && grid._itemVisibilityNeedsDimensionRefresh) {
                    grid._itemVisibilityNeedsDimensionRefresh = false;
                    grid._updateBoundingRect();
                    grid._updateBorders(true, false, true, false);
                }
            }, () => {
                if (!this.item || (toVisible ? !this._isShowing : !this._isHiding))
                    return;
                if (settings._animationWindowing && !item._isInViewport(tX, tY, VIEWPORT_THRESHOLD)) {
                    if (!item.isActive() ||
                        !item._isInViewport(item.left + item._containerDiffX, item.top + item._containerDiffY, VIEWPORT_THRESHOLD)) {
                        setStyles(element, targetStyles);
                        animator.stop();
                        onFinish && onFinish();
                        return;
                    }
                }
                if (currentStyles) {
                    animator.start(currentStyles, targetStyles, {
                        duration: duration,
                        easing: easing,
                        onFinish: onFinish,
                    });
                }
            });
        }
        _finishShow() {
            if (!this.item || this._isHidden)
                return;
            this._isShowing = false;
            this.item._emitter.burst(this._queue, false, this.item);
        }
        _finishHide() {
            if (!this.item || !this._isHidden)
                return;
            const { item } = this;
            this._isHiding = false;
            item._layout.stop(true, 0, 0);
            item.element.style.display = 'none';
            item._emitter.burst(this._queue, false, item);
        }
        _removeCurrentStyles() {
            if (!this.element)
                return;
            const { element, _currentStyleProps } = this;
            let i = 0;
            for (; i < _currentStyleProps.length; i++) {
                element.style[_currentStyleProps[i]] = '';
            }
            _currentStyleProps.length = 0;
        }
    }

    let id = 0;
    function createUid() {
        return ++id;
    }

    const windowSize = {
        width: window.innerWidth,
        height: window.innerHeight,
    };
    window.addEventListener('resize', function () {
        windowSize.width = window.innerWidth;
        windowSize.height = window.innerHeight;
    });

    const targetRect = {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
    };
    const viewportRect = {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
    };
    function isInViewport(width, height, left, top, padding) {
        padding = padding || 0;
        targetRect.left = left;
        targetRect.top = top;
        targetRect.width = width;
        targetRect.height = height;
        viewportRect.left = 0 - padding;
        viewportRect.top = 0 - padding;
        viewportRect.width = windowSize.width + padding + padding;
        viewportRect.height = windowSize.height + padding + padding;
        return isOverlapping(targetRect, viewportRect);
    }

    const _getTranslateResult = { x: 0, y: 0 };
    const _getClientRootPositionResult = { left: 0, top: 0 };
    class Item {
        constructor(grid, element, isActive) {
            const { settings, element: gridElement, id: gridId } = grid;
            if (ITEM_ELEMENT_MAP) {
                if (ITEM_ELEMENT_MAP.has(element)) {
                    throw new Error('You can only create one Muuri Item per element!');
                }
                else {
                    ITEM_ELEMENT_MAP.set(element, this);
                }
            }
            this.id = createUid();
            this.element = element;
            this.left = 0;
            this.top = 0;
            this.width = 0;
            this.height = 0;
            this.marginLeft = 0;
            this.marginRight = 0;
            this.marginTop = 0;
            this.marginBottom = 0;
            this._gridId = gridId;
            this._isDestroyed = false;
            this._translateX = undefined;
            this._translateY = undefined;
            this._containerDiffX = 0;
            this._containerDiffY = 0;
            this._sortData = null;
            this._emitter = new Emitter();
            if (gridElement && element.parentNode !== gridElement) {
                gridElement.appendChild(element);
            }
            addClass(element, settings.itemClass);
            if (typeof isActive !== 'boolean') {
                isActive = getStyle(element, 'display') !== 'none';
            }
            this._isActive = isActive;
            this._visibility = new ItemVisibility(this);
            this._layout = new ItemLayout(this);
            this._migrate = new ItemMigrate(this);
            this._drag = settings.dragEnabled ? new ItemDrag(this) : null;
            this._dragRelease = new ItemDragRelease(this);
            this._dragPlaceholder = new ItemDragPlaceholder(this);
        }
        getGrid() {
            return GRID_INSTANCES.get(this._gridId) || null;
        }
        isActive() {
            return this._isActive;
        }
        isVisible() {
            return !this._visibility.isHidden();
        }
        isShowing() {
            return !!this._visibility.isShowing();
        }
        isHiding() {
            return !!this._visibility.isHiding();
        }
        isPositioning() {
            return !!this._layout.isActive();
        }
        isDragging() {
            var _a;
            return !!((_a = this._drag) === null || _a === void 0 ? void 0 : _a.isActive());
        }
        isReleasing() {
            return !!this._dragRelease.isActive();
        }
        isDestroyed() {
            return this._isDestroyed;
        }
        _updateDimensions(force) {
            if (this._isDestroyed)
                return;
            if (force !== true && !this.isVisible() && !this.isHiding())
                return;
            const element = this.element;
            const { width, height } = element.getBoundingClientRect();
            this.width = width;
            this.height = height;
            this.marginLeft = Math.max(0, getStyleAsFloat(element, 'margin-left'));
            this.marginRight = Math.max(0, getStyleAsFloat(element, 'margin-right'));
            this.marginTop = Math.max(0, getStyleAsFloat(element, 'margin-top'));
            this.marginBottom = Math.max(0, getStyleAsFloat(element, 'margin-bottom'));
            this._dragPlaceholder.updateDimensions();
        }
        _updateSortData() {
            if (this._isDestroyed)
                return;
            const { settings } = this.getGrid();
            const { sortData } = settings;
            this._sortData = {};
            if (sortData) {
                let prop;
                for (prop in sortData) {
                    this._sortData[prop] = sortData[prop](this, this.element);
                }
            }
        }
        _addToLayout(left = 0, top = 0) {
            if (this.isActive())
                return;
            this._isActive = true;
            this.left = left;
            this.top = top;
        }
        _removeFromLayout() {
            if (!this.isActive())
                return;
            this._isActive = false;
            this.left = 0;
            this.top = 0;
        }
        _canSkipLayout(left, top) {
            return (this.left === left &&
                this.top === top &&
                !this._migrate.isActive() &&
                !this._dragRelease.isActive() &&
                !this._layout._skipNextAnimation);
        }
        _setTranslate(x, y) {
            if (this._translateX === x && this._translateY === y)
                return;
            this._translateX = x;
            this._translateY = y;
            this.element.style[transformProp] = createTranslate(x, y, this.getGrid().settings.translate3d);
        }
        _getTranslate() {
            if (this._translateX === undefined || this._translateY === undefined) {
                const translate = getTranslate(this.element);
                _getTranslateResult.x = translate.x;
                _getTranslateResult.y = translate.y;
            }
            else {
                _getTranslateResult.x = this._translateX;
                _getTranslateResult.y = this._translateY;
            }
            return _getTranslateResult;
        }
        _getClientRootPosition() {
            const grid = this.getGrid();
            _getClientRootPositionResult.left = grid._rect.left + grid._borderLeft - this._containerDiffX;
            _getClientRootPositionResult.top = grid._rect.top + grid._borderTop - this._containerDiffY;
            return _getClientRootPositionResult;
        }
        _isInViewport(x, y, viewportThreshold = 0) {
            const rootPosition = this._getClientRootPosition();
            return isInViewport(this.width, this.height, rootPosition.left + this.marginLeft + x, rootPosition.top + this.marginTop + y, viewportThreshold || 0);
        }
        _destroy(removeElement = false) {
            var _a;
            if (this._isDestroyed)
                return;
            const element = this.element;
            const { settings } = this.getGrid();
            this._dragPlaceholder.destroy();
            this._dragRelease.destroy();
            this._migrate.destroy();
            this._layout.destroy();
            this._visibility.destroy();
            if (this._drag)
                this._drag.destroy();
            this._emitter.destroy();
            removeClass(element, settings.itemClass);
            if (removeElement)
                (_a = element.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(element);
            if (ITEM_ELEMENT_MAP)
                ITEM_ELEMENT_MAP.delete(element);
            this._isActive = false;
            this._isDestroyed = true;
        }
    }

    function createPackerProcessor(isWorker = false) {
        const SETTINGS = {
            fillGaps: 1,
            horizontal: 2,
            alignRight: 4,
            alignBottom: 8,
            rounding: 16,
        };
        const EPS = 0.001;
        const MIN_SLOT_SIZE = 0.5;
        function roundNumber(number) {
            return ((((number * 1000 + 0.5) << 0) / 10) << 0) / 100;
        }
        class PrivatePackerProcessor {
            constructor() {
                this._currentRects = [];
                this._nextRects = [];
                this._rectStore = [];
                this._slotSizes = [];
                this._shards = [];
                this._rectTarget = { left: 0, top: 0, width: 0, height: 0 };
                this._tempRectA = { left: 0, top: 0, width: 0, height: 0 };
                this._tempRectB = { left: 0, top: 0, width: 0, height: 0 };
                this._rectId = 0;
                this._slotIndex = -1;
                this._slot = { left: 0, top: 0, width: 0, height: 0 };
                this._sortRectsLeftTop = this._sortRectsLeftTop.bind(this);
                this._sortRectsTopLeft = this._sortRectsTopLeft.bind(this);
            }
            computeLayout(layout, settings) {
                const items = layout.items;
                if (!items.length)
                    return layout;
                const slots = layout.slots;
                const fillGaps = !!(settings & SETTINGS.fillGaps);
                const horizontal = !!(settings & SETTINGS.horizontal);
                const alignRight = !!(settings & SETTINGS.alignRight);
                const alignBottom = !!(settings & SETTINGS.alignBottom);
                const rounding = !!(settings & SETTINGS.rounding);
                const isPreProcessed = typeof items[0] === 'number';
                const bump = isPreProcessed ? 2 : 1;
                let i = 0;
                let slotWidth = 0;
                let slotHeight = 0;
                let slot;
                let item;
                for (i = 0; i < items.length; i += bump) {
                    if (isPreProcessed) {
                        slotWidth = items[i];
                        slotHeight = items[i + 1];
                    }
                    else {
                        item = items[i];
                        slotWidth = item.width + (item.marginLeft || 0) + (item.marginRight || 0);
                        slotHeight = item.height + (item.marginTop || 0) + (item.marginBottom || 0);
                    }
                    if (rounding) {
                        slotWidth = roundNumber(slotWidth);
                        slotHeight = roundNumber(slotHeight);
                    }
                    slot = this._computeNextSlot(layout, slotWidth, slotHeight, fillGaps, horizontal);
                    if (horizontal) {
                        if (slot.left + slot.width > layout.width) {
                            layout.width = slot.left + slot.width;
                        }
                    }
                    else {
                        if (slot.top + slot.height > layout.height) {
                            layout.height = slot.top + slot.height;
                        }
                    }
                    slots[++this._slotIndex] = slot.left;
                    slots[++this._slotIndex] = slot.top;
                    if (alignRight || alignBottom) {
                        this._slotSizes.push(slot.width, slot.height);
                    }
                }
                if (alignRight) {
                    for (i = 0; i < slots.length; i += 2) {
                        slots[i] = layout.width - (slots[i] + this._slotSizes[i]);
                    }
                }
                if (alignBottom) {
                    for (i = 1; i < slots.length; i += 2) {
                        slots[i] = layout.height - (slots[i] + this._slotSizes[i]);
                    }
                }
                this._slotSizes.length = 0;
                this._currentRects.length = 0;
                this._nextRects.length = 0;
                this._shards.length = 0;
                this._rectId = 0;
                this._slotIndex = -1;
                return layout;
            }
            _computeNextSlot(layout, slotWidth, slotHeight, fillGaps, horizontal) {
                const { _slot: slot, _currentRects: currentRects, _nextRects: nextRects } = this;
                let ignoreCurrentRects = false;
                let foundInitialSlot = false;
                let rect;
                let rectId;
                let i = 0;
                let j = 0;
                nextRects.length = 0;
                slot.left = 0;
                slot.top = 0;
                slot.width = slotWidth;
                slot.height = slotHeight;
                for (i = 0; i < currentRects.length; i++) {
                    rectId = currentRects[i];
                    if (!rectId)
                        continue;
                    rect = this._getRect(rectId);
                    if (slot.width <= rect.width + EPS && slot.height <= rect.height + EPS) {
                        foundInitialSlot = true;
                        slot.left = rect.left;
                        slot.top = rect.top;
                        break;
                    }
                }
                if (!foundInitialSlot) {
                    if (horizontal) {
                        slot.left = layout.width;
                        slot.top = 0;
                    }
                    else {
                        slot.left = 0;
                        slot.top = layout.height;
                    }
                    if (!fillGaps) {
                        ignoreCurrentRects = true;
                    }
                }
                if (!horizontal && slot.top + slot.height > layout.height + EPS) {
                    if (slot.left > MIN_SLOT_SIZE) {
                        nextRects.push(this._addRect(0, layout.height, slot.left, Infinity));
                    }
                    if (slot.left + slot.width < layout.width - MIN_SLOT_SIZE) {
                        nextRects.push(this._addRect(slot.left + slot.width, layout.height, layout.width - slot.left - slot.width, Infinity));
                    }
                    layout.height = slot.top + slot.height;
                }
                if (horizontal && slot.left + slot.width > layout.width + EPS) {
                    if (slot.top > MIN_SLOT_SIZE) {
                        nextRects.push(this._addRect(layout.width, 0, Infinity, slot.top));
                    }
                    if (slot.top + slot.height < layout.height - MIN_SLOT_SIZE) {
                        nextRects.push(this._addRect(layout.width, slot.top + slot.height, Infinity, layout.height - slot.top - slot.height));
                    }
                    layout.width = slot.left + slot.width;
                }
                if (!ignoreCurrentRects) {
                    if (fillGaps)
                        i = 0;
                    for (; i < currentRects.length; i++) {
                        rectId = currentRects[i];
                        if (!rectId)
                            continue;
                        rect = this._getRect(rectId);
                        const shards = this._splitRect(rect, slot);
                        for (j = 0; j < shards.length; j++) {
                            rectId = shards[j];
                            rect = this._getRect(rectId);
                            if (horizontal
                                ? rect.left + EPS < layout.width - EPS
                                : rect.top + EPS < layout.height - EPS) {
                                nextRects.push(rectId);
                            }
                        }
                    }
                }
                if (nextRects.length > 1) {
                    this._purgeRects(nextRects).sort(horizontal ? this._sortRectsLeftTop : this._sortRectsTopLeft);
                }
                this._currentRects = nextRects;
                this._nextRects = currentRects;
                return slot;
            }
            _addRect(left, top, width, height) {
                const rectId = ++this._rectId;
                this._rectStore[rectId] = left || 0;
                this._rectStore[++this._rectId] = top || 0;
                this._rectStore[++this._rectId] = width || 0;
                this._rectStore[++this._rectId] = height || 0;
                return rectId;
            }
            _getRect(id, target) {
                target = target || this._rectTarget;
                target.left = this._rectStore[id] || 0;
                target.top = this._rectStore[++id] || 0;
                target.width = this._rectStore[++id] || 0;
                target.height = this._rectStore[++id] || 0;
                return target;
            }
            _splitRect(rect, hole) {
                const { _shards: shards } = this;
                let width = 0;
                let height = 0;
                shards.length = 0;
                if (rect.left + rect.width <= hole.left + EPS ||
                    hole.left + hole.width <= rect.left + EPS ||
                    rect.top + rect.height <= hole.top + EPS ||
                    hole.top + hole.height <= rect.top + EPS) {
                    shards.push(this._addRect(rect.left, rect.top, rect.width, rect.height));
                    return shards;
                }
                width = hole.left - rect.left;
                if (width >= MIN_SLOT_SIZE) {
                    shards.push(this._addRect(rect.left, rect.top, width, rect.height));
                }
                width = rect.left + rect.width - (hole.left + hole.width);
                if (width >= MIN_SLOT_SIZE) {
                    shards.push(this._addRect(hole.left + hole.width, rect.top, width, rect.height));
                }
                height = hole.top - rect.top;
                if (height >= MIN_SLOT_SIZE) {
                    shards.push(this._addRect(rect.left, rect.top, rect.width, height));
                }
                height = rect.top + rect.height - (hole.top + hole.height);
                if (height >= MIN_SLOT_SIZE) {
                    shards.push(this._addRect(rect.left, hole.top + hole.height, rect.width, height));
                }
                return shards;
            }
            _isRectAWithinRectB(a, b) {
                return (a.left + EPS >= b.left &&
                    a.top + EPS >= b.top &&
                    a.left + a.width - EPS <= b.left + b.width &&
                    a.top + a.height - EPS <= b.top + b.height);
            }
            _purgeRects(rectIds) {
                const { _tempRectA: a, _tempRectB: b } = this;
                let i = rectIds.length;
                let j = 0;
                while (i--) {
                    j = rectIds.length;
                    if (!rectIds[i])
                        continue;
                    this._getRect(rectIds[i], a);
                    while (j--) {
                        if (!rectIds[j] || i === j)
                            continue;
                        this._getRect(rectIds[j], b);
                        if (this._isRectAWithinRectB(a, b)) {
                            rectIds[i] = 0;
                            break;
                        }
                    }
                }
                return rectIds;
            }
            _sortRectsTopLeft(aId, bId) {
                const { _tempRectA: a, _tempRectB: b } = this;
                this._getRect(aId, a);
                this._getRect(bId, b);
                return a.top < b.top && a.top + EPS < b.top
                    ? -1
                    : a.top > b.top && a.top - EPS > b.top
                        ? 1
                        : a.left < b.left && a.left + EPS < b.left
                            ? -1
                            : a.left > b.left && a.left - EPS > b.left
                                ? 1
                                : 0;
            }
            _sortRectsLeftTop(aId, bId) {
                const { _tempRectA: a, _tempRectB: b } = this;
                this._getRect(aId, a);
                this._getRect(bId, b);
                return a.left < b.left && a.left + EPS < b.left
                    ? -1
                    : a.left > b.left && a.left - EPS < b.left
                        ? 1
                        : a.top < b.top && a.top + EPS < b.top
                            ? -1
                            : a.top > b.top && a.top - EPS > b.top
                                ? 1
                                : 0;
            }
        }
        const processor = new PrivatePackerProcessor();
        if (isWorker) {
            const workerScope = self;
            const PACKET_INDEX_WIDTH = 1;
            const PACKET_INDEX_HEIGHT = 2;
            const PACKET_INDEX_SETTINGS = 3;
            const PACKET_HEADER_SLOTS = 4;
            workerScope.onmessage = function (msg) {
                const data = new Float32Array(msg.data);
                const items = data.subarray(PACKET_HEADER_SLOTS, data.length);
                const slots = new Float32Array(items.length);
                const settings = data[PACKET_INDEX_SETTINGS];
                const layout = {
                    items: items,
                    slots: slots,
                    width: data[PACKET_INDEX_WIDTH],
                    height: data[PACKET_INDEX_HEIGHT],
                };
                processor.computeLayout(layout, settings);
                data[PACKET_INDEX_WIDTH] = layout.width;
                data[PACKET_INDEX_HEIGHT] = layout.height;
                data.set(layout.slots, PACKET_HEADER_SLOTS);
                workerScope.postMessage(data.buffer, [data.buffer]);
            };
        }
        return processor;
    }

    let blobUrl = '';
    const allWorkers = new Set();
    function createWorkerProcessors(amount, onmessage) {
        const workers = [];
        if (amount > 0) {
            if (!blobUrl) {
                blobUrl = URL.createObjectURL(new Blob(['(' + createPackerProcessor.toString() + ')(true)'], {
                    type: 'application/javascript',
                }));
            }
            let i = 0;
            for (; i < amount; i++) {
                const worker = new Worker(blobUrl);
                worker.onmessage = onmessage;
                workers.push(worker);
                allWorkers.add(worker);
            }
        }
        return workers;
    }
    function destroyWorkerProcessors(workers) {
        let i = 0;
        for (; i < workers.length; i++) {
            const worker = workers[i];
            worker.onmessage = null;
            worker.onerror = null;
            worker.onmessageerror = null;
            worker.terminate();
            allWorkers.delete(worker);
        }
        if (blobUrl && !allWorkers.size) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = '';
        }
    }

    const SETTINGS = {
        fillGaps: 1,
        horizontal: 2,
        alignRight: 4,
        alignBottom: 8,
        rounding: 16,
    };
    const PACKET_INDEX = {
        id: 0,
        width: 1,
        height: 2,
        settings: 3,
        slots: 4,
    };
    const PACKER_PROCESSOR = createPackerProcessor();
    class Packer {
        constructor(numWorkers = 0, options) {
            this._settings = 0;
            this._asyncMode = true;
            this._workers = [];
            this._layoutWorkerQueue = [];
            this._layoutsProcessing = new Set();
            this._layoutWorkerData = new Map();
            this._onWorkerMessage = this._onWorkerMessage.bind(this);
            if (options)
                this.updateSettings(options);
            try {
                this._workers = createWorkerProcessors(numWorkers, this._onWorkerMessage);
                this._asyncMode = !!this._workers.length;
            }
            catch (e) { }
        }
        updateSettings(options) {
            let fillGaps = this._settings & SETTINGS.fillGaps;
            if (typeof options.fillGaps === 'boolean') {
                fillGaps = options.fillGaps ? SETTINGS.fillGaps : 0;
            }
            let horizontal = this._settings & SETTINGS.horizontal;
            if (typeof options.horizontal === 'boolean') {
                horizontal = options.horizontal ? SETTINGS.horizontal : 0;
            }
            let alignRight = this._settings & SETTINGS.alignRight;
            if (typeof options.alignRight === 'boolean') {
                alignRight = options.alignRight ? SETTINGS.alignRight : 0;
            }
            let alignBottom = this._settings & SETTINGS.alignBottom;
            if (typeof options.alignBottom === 'boolean') {
                alignBottom = options.alignBottom ? SETTINGS.alignBottom : 0;
            }
            let rounding = this._settings & SETTINGS.rounding;
            if (typeof options.rounding === 'boolean') {
                rounding = options.rounding ? SETTINGS.rounding : 0;
            }
            this._settings = fillGaps | horizontal | alignRight | alignBottom | rounding;
        }
        createLayout(layoutId, items, containerData, callback) {
            if (this._layoutWorkerData.has(layoutId)) {
                throw new Error('A layout with the provided id is currently being processed.');
            }
            const useSyncProcessing = !this._asyncMode || !items.length;
            const isHorizontal = this._settings & SETTINGS.horizontal;
            const layout = {
                id: layoutId,
                items: items,
                slots: new Float32Array(useSyncProcessing ? items.length * 2 : 0),
                width: isHorizontal ? 0 : containerData.width,
                height: !isHorizontal ? 0 : containerData.height,
                styles: {},
            };
            if (useSyncProcessing) {
                if (items.length)
                    PACKER_PROCESSOR.computeLayout(layout, this._settings);
                this._setContainerStyles(layout, containerData, this._settings);
                callback(layout);
                return;
            }
            const packet = new Float32Array(PACKET_INDEX.slots + items.length * 2);
            packet[PACKET_INDEX.id] = layoutId;
            packet[PACKET_INDEX.width] = layout.width;
            packet[PACKET_INDEX.height] = layout.height;
            packet[PACKET_INDEX.settings] = this._settings;
            let i = 0;
            let j = PACKET_INDEX.slots - 1;
            for (; i < items.length; i++) {
                const item = items[i];
                packet[++j] = item.width + (item.marginLeft || 0) + (item.marginRight || 0);
                packet[++j] = item.height + (item.marginTop || 0) + (item.marginBottom || 0);
            }
            this._layoutWorkerQueue.push(layoutId);
            this._layoutWorkerData.set(layoutId, Object.assign(Object.assign({}, layout), { container: containerData, settings: this._settings, callback: callback, packet: packet, aborted: false }));
            this._sendToWorker();
            return this.cancelLayout.bind(this, layoutId);
        }
        cancelLayout(layoutId) {
            const data = this._layoutWorkerData.get(layoutId);
            if (!data || data.aborted)
                return;
            if (data.worker) {
                data.aborted = true;
            }
            else {
                const queueIndex = this._layoutWorkerQueue.indexOf(layoutId);
                this._layoutWorkerQueue.splice(queueIndex, 1);
                this._layoutWorkerData.delete(layoutId);
            }
        }
        destroy() {
            this._layoutWorkerData.forEach((data) => {
                this.cancelLayout(data.id);
                if (data.worker)
                    this._workers.push(data.worker);
            });
            this._layoutWorkerData.clear();
            this._layoutsProcessing.clear();
            this._layoutWorkerQueue.length = 0;
            destroyWorkerProcessors(this._workers);
            this._workers.length = 0;
        }
        _sendToWorker() {
            if (!this._layoutWorkerQueue.length || !this._workers.length)
                return;
            const worker = this._workers.pop();
            const layoutId = this._layoutWorkerQueue.shift();
            const workerData = this._layoutWorkerData.get(layoutId);
            workerData.worker = worker;
            this._layoutsProcessing.add(layoutId);
            const { buffer } = workerData.packet;
            worker.postMessage(buffer, [buffer]);
        }
        _onWorkerMessage(msg) {
            const data = new Float32Array(msg.data);
            const layoutId = data[PACKET_INDEX.id];
            const layoutData = this._layoutWorkerData.get(layoutId);
            this._layoutWorkerData.delete(layoutId);
            this._layoutsProcessing.delete(layoutId);
            if (!layoutData)
                return;
            const { worker } = layoutData;
            if (worker)
                this._workers.push(worker);
            if (!layoutData.aborted) {
                const layout = {
                    id: layoutId,
                    items: layoutData.items,
                    slots: data.subarray(PACKET_INDEX.slots, data.length),
                    width: data[PACKET_INDEX.width],
                    height: data[PACKET_INDEX.height],
                    styles: {},
                };
                this._setContainerStyles(layout, layoutData.container, layoutData.settings);
                layoutData.callback(layout);
            }
            if (worker)
                this._sendToWorker();
        }
        _setContainerStyles(layout, containerData, settings) {
            const isHorizontal = !!(settings & SETTINGS.horizontal);
            const isBorderBox = containerData.boxSizing === 'border-box';
            const { borderLeft = 0, borderRight = 0, borderTop = 0, borderBottom = 0 } = containerData;
            const { styles, width, height } = layout;
            if (isHorizontal) {
                styles.width = (isBorderBox ? width + borderLeft + borderRight : width) + 'px';
            }
            else {
                styles.height = (isBorderBox ? height + borderTop + borderBottom : height) + 'px';
            }
        }
    }

    let debounceId = 0;
    function debounce(fn, durationMs) {
        let id = ++debounceId;
        let timer = 0;
        let lastTime = 0;
        let isCanceled = false;
        let tick = (time) => {
            if (isCanceled)
                return;
            if (lastTime)
                timer -= time - lastTime;
            lastTime = time;
            if (timer > 0) {
                tick && addDebounceTick(id, tick);
            }
            else {
                timer = lastTime = 0;
                fn();
            }
        };
        return function debouncedFn(cancel = false) {
            if (isCanceled)
                return;
            if (durationMs <= 0) {
                if (cancel !== true)
                    fn();
                return;
            }
            if (cancel === true) {
                isCanceled = true;
                timer = lastTime = 0;
                tick = undefined;
                cancelDebounceTick(id);
                return;
            }
            if (timer <= 0) {
                timer = durationMs;
                tick && tick(0);
            }
            else {
                timer = durationMs;
            }
        };
    }

    const matches = Element.prototype.matches ||
        Element.prototype.webkitMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        function () {
            return false;
        };
    function elementMatches(el, selector) {
        return matches.call(el, selector);
    }

    const htmlCollectionType = '[object HTMLCollection]';
    const nodeListType = '[object NodeList]';
    function isNodeListOrHTMLCollection(val) {
        const type = Object.prototype.toString.call(val);
        return type === htmlCollectionType || type === nodeListType;
    }

    const toString = Object.prototype.toString;
    function isPlainObject(val) {
        return typeof val === 'object' && toString.call(val) === '[object Object]';
    }

    function toArray(val) {
        return isNodeListOrHTMLCollection(val)
            ? Array.prototype.slice.call(val)
            : Array.prototype.concat(val);
    }

    let layoutId = 0;
    function createSettings(baseSettings, overrides = {}) {
        let newSettings = mergeObjects({}, baseSettings);
        newSettings = mergeObjects(newSettings, overrides);
        if (overrides.visibleStyles) {
            newSettings.visibleStyles = Object.assign({}, overrides.visibleStyles);
        }
        else if (baseSettings.visibleStyles) {
            newSettings.visibleStyles = Object.assign({}, baseSettings.visibleStyles);
        }
        if (overrides.hiddenStyles) {
            newSettings.hiddenStyles = Object.assign({}, overrides.hiddenStyles);
        }
        else if (baseSettings.hiddenStyles) {
            newSettings.hiddenStyles = Object.assign({}, baseSettings.hiddenStyles);
        }
        return newSettings;
    }
    function mergeObjects(target, source) {
        const sourceKeys = Object.keys(source);
        const length = sourceKeys.length;
        let i = 0;
        for (; i < length; i++) {
            const propName = sourceKeys[i];
            const isSourceObject = isPlainObject(source[propName]);
            if (isPlainObject(target[propName]) && isSourceObject) {
                target[propName] = mergeObjects(mergeObjects({}, target[propName]), source[propName]);
                continue;
            }
            if (isSourceObject) {
                target[propName] = mergeObjects({}, source[propName]);
                continue;
            }
            if (Array.isArray(source[propName])) {
                target[propName] = source[propName].slice(0);
                continue;
            }
            target[propName] = source[propName];
        }
        return target;
    }
    function getInitialGridElements(gridElement, elements) {
        if (elements === '*') {
            return gridElement.children;
        }
        if (typeof elements === 'string') {
            const result = [];
            const children = gridElement.children;
            let i = 0;
            for (; i < children.length; i++) {
                if (elementMatches(children[i], elements)) {
                    result.push(children[i]);
                }
            }
            return result;
        }
        if (Array.isArray(elements) || isNodeListOrHTMLCollection(elements)) {
            return elements;
        }
        return [];
    }
    function normalizeStyles(styles) {
        const normalized = {};
        const docElemStyle = document.documentElement.style;
        let prop;
        let prefixedProp;
        for (prop in styles) {
            if (!styles[prop])
                continue;
            prefixedProp = getPrefixedPropName(docElemStyle, prop);
            if (!prefixedProp)
                continue;
            normalized[prefixedProp] = styles[prop];
        }
        return normalized;
    }
    function createIndexMap(items) {
        const result = {};
        let i = 0;
        for (; i < items.length; i++) {
            result[items[i].id] = i;
        }
        return result;
    }
    function compareIndexMap(indexMap, itemA, itemB) {
        const indexA = indexMap[itemA.id];
        const indexB = indexMap[itemB.id];
        return indexA - indexB;
    }
    function isEqualObjects(a, b) {
        let key;
        for (key in a) {
            if (a[key] !== b[key])
                return false;
        }
        return Object.keys(a).length === Object.keys(b).length;
    }
    class Grid {
        constructor(element, options = {}) {
            if (typeof element === 'string') {
                const queriedElement = document.querySelector(element);
                if (!queriedElement)
                    throw new Error('No container element found.');
                element = queriedElement;
            }
            if (!element.isConnected || element === document.documentElement) {
                throw new Error('Container element must be an existing DOM element.');
            }
            const settings = createSettings(Grid.defaultOptions, options);
            settings.visibleStyles = normalizeStyles(settings.visibleStyles);
            settings.hiddenStyles = normalizeStyles(settings.hiddenStyles);
            this.id = createUid();
            this.element = element;
            this.settings = settings;
            this.items = [];
            this._isDestroyed = false;
            this._rect = { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 };
            this._borderLeft = 0;
            this._borderRight = 0;
            this._borderTop = 0;
            this._borderBottom = 0;
            this._boxSizing = '';
            this._layout = {
                id: 0,
                items: [],
                slots: [],
            };
            this._isLayoutFinished = true;
            this._nextLayoutData = null;
            this._resizeHandler = null;
            this._emitter = new Emitter();
            GRID_INSTANCES.set(this.id, this);
            addClass(element, settings.containerClass);
            this._bindLayoutOnResize(settings.layoutOnResize);
            this.add(getInitialGridElements(element, settings.items), { layout: false });
            if (settings.layoutOnInit) {
                this.layout(true);
            }
        }
        on(event, listener) {
            this._emitter.on(event, listener);
            return this;
        }
        off(event, listener) {
            this._emitter.off(event, listener);
            return this;
        }
        isDestroyed() {
            return this._isDestroyed;
        }
        getItem(target) {
            if (this._isDestroyed || (!target && target !== 0)) {
                return null;
            }
            if (typeof target === 'number') {
                return this.items[target > -1 ? target : this.items.length + target] || null;
            }
            if (target instanceof Item) {
                return target._gridId === this.id ? target : null;
            }
            const item = ITEM_ELEMENT_MAP.get(target);
            return item && item._gridId === this.id ? item : null;
        }
        getItems(targets) {
            if (this._isDestroyed || targets === undefined) {
                return this.items.slice(0);
            }
            const items = [];
            if (Array.isArray(targets) || isNodeListOrHTMLCollection(targets)) {
                let item;
                let i = 0;
                for (; i < targets.length; i++) {
                    item = this.getItem(targets[i]);
                    if (item)
                        items.push(item);
                }
            }
            else {
                const item = this.getItem(targets);
                if (item)
                    items.push(item);
            }
            return items;
        }
        updateSettings(options) {
            if (this._isDestroyed || !options)
                return this;
            const { settings, items } = this;
            const itemClasses = [];
            let dragEnabledChanged = false;
            let dragHandleChanged = false;
            let dragCssPropsChanged = false;
            let dragEventListenerOptionsChanged = false;
            let visibleStylesChanged = false;
            let hiddenStylesChanged = false;
            const nextSettings = createSettings(settings, options);
            nextSettings.visibleStyles = normalizeStyles(nextSettings.visibleStyles);
            nextSettings.hiddenStyles = normalizeStyles(nextSettings.hiddenStyles);
            this.settings = nextSettings;
            for (let option in options) {
                switch (option) {
                    case 'visibleStyles': {
                        visibleStylesChanged = !isEqualObjects(settings[option], nextSettings[option]);
                        break;
                    }
                    case 'hiddenStyles': {
                        hiddenStylesChanged = !isEqualObjects(settings[option], nextSettings[option]);
                        break;
                    }
                    case 'dragEnabled': {
                        dragEnabledChanged = settings[option] !== nextSettings[option];
                        break;
                    }
                    case 'dragHandle': {
                        dragHandleChanged = settings[option] !== nextSettings[option];
                        break;
                    }
                    case 'dragCssProps': {
                        dragCssPropsChanged = !isEqualObjects(settings[option], nextSettings[option]);
                        break;
                    }
                    case 'dragEventListenerOptions': {
                        dragEventListenerOptionsChanged = !isEqualObjects(settings[option], nextSettings[option]);
                        break;
                    }
                    case 'layoutOnResize': {
                        if (settings[option] !== nextSettings[option]) {
                            this._unbindLayoutOnResize();
                            this._bindLayoutOnResize(nextSettings[option]);
                        }
                        break;
                    }
                    case 'containerClass': {
                        if (settings[option] !== nextSettings[option]) {
                            removeClass(this.element, settings[option]);
                            addClass(this.element, nextSettings[option]);
                        }
                        break;
                    }
                    case 'itemClass':
                    case 'itemVisibleClass':
                    case 'itemHiddenClass':
                    case 'itemPositioningClass':
                    case 'itemDraggingClass':
                    case 'itemReleasingClass':
                    case 'itemPlaceholderClass': {
                        if (settings[option] !== nextSettings[option]) {
                            itemClasses.push(option, settings[option], nextSettings[option]);
                        }
                        break;
                    }
                }
            }
            if (itemClasses.length ||
                visibleStylesChanged ||
                hiddenStylesChanged ||
                dragEnabledChanged ||
                dragHandleChanged ||
                dragCssPropsChanged ||
                dragEventListenerOptionsChanged) {
                let i;
                let j;
                for (i = 0; i < items.length; i++) {
                    const item = items[i];
                    for (j = 0; j < itemClasses.length; j += 3) {
                        const option = itemClasses[j];
                        const currentValue = itemClasses[j + 1];
                        const nextValue = itemClasses[j + 2];
                        let switchClass = false;
                        switch (option) {
                            case 'itemClass': {
                                switchClass = true;
                                break;
                            }
                            case 'itemVisibleClass': {
                                switchClass = item.isVisible();
                                break;
                            }
                            case 'itemHiddenClass': {
                                switchClass = !item.isVisible();
                                break;
                            }
                            case 'itemPositioningClass': {
                                switchClass = item.isPositioning();
                                break;
                            }
                            case 'itemDraggingClass': {
                                switchClass = item.isDragging();
                                break;
                            }
                            case 'itemReleasingClass': {
                                switchClass = item.isReleasing();
                                break;
                            }
                            case 'itemPlaceholderClass': {
                                item._dragPlaceholder.updateClassName(nextValue);
                                break;
                            }
                        }
                        if (switchClass) {
                            removeClass(item.element, currentValue);
                            addClass(item.element, nextValue);
                        }
                    }
                    if (item.isActive()) {
                        if (visibleStylesChanged) {
                            item._visibility.setStyles(nextSettings.visibleStyles);
                            item._visibility.stop(true);
                        }
                    }
                    else {
                        if (hiddenStylesChanged) {
                            item._visibility.setStyles(nextSettings.hiddenStyles);
                            item._visibility.stop(true);
                        }
                    }
                    if ((dragHandleChanged || dragEnabledChanged) &&
                        item._drag &&
                        item._drag.getOriginGrid() === this) {
                        item._drag.destroy();
                        item._drag = null;
                    }
                    if (nextSettings.dragEnabled) {
                        if (item._drag) {
                            if (item._drag.getOriginGrid() === this) {
                                if (dragCssPropsChanged) {
                                    item._drag.dragger.setCssProps(nextSettings.dragCssProps);
                                }
                                if (dragEventListenerOptionsChanged) {
                                    item._drag.dragger.setListenerOptions(nextSettings.dragEventListenerOptions);
                                }
                            }
                        }
                        else {
                            item._drag = new ItemDrag(item);
                        }
                    }
                }
            }
            if ('sortData' in options) {
                this.refreshSortData();
            }
            return this;
        }
        refreshItems(items, force = false) {
            if (this._isDestroyed)
                return this;
            const targets = (items || this.items);
            let i;
            let item;
            let style;
            let hiddenItemStyles;
            if (force === true) {
                hiddenItemStyles = [];
                for (i = 0; i < targets.length; i++) {
                    item = targets[i];
                    if (!item.isVisible() && !item.isHiding()) {
                        style = item.element.style;
                        style.visibility = 'hidden';
                        style.display = '';
                        hiddenItemStyles.push(style);
                    }
                }
            }
            for (i = 0; i < targets.length; i++) {
                targets[i]._updateDimensions(force);
            }
            if (hiddenItemStyles) {
                for (i = 0; i < hiddenItemStyles.length; i++) {
                    style = hiddenItemStyles[i];
                    style.visibility = '';
                    style.display = 'none';
                }
                hiddenItemStyles.length = 0;
            }
            return this;
        }
        refreshSortData(items) {
            if (this._isDestroyed)
                return this;
            const targets = (items || this.items);
            let i = 0;
            for (; i < targets.length; i++) {
                targets[i]._updateSortData();
            }
            return this;
        }
        synchronize() {
            if (this._isDestroyed)
                return this;
            const { items } = this;
            if (!items.length)
                return this;
            let fragment;
            let element;
            let i = 0;
            for (; i < items.length; i++) {
                element = items[i].element;
                if (element.parentNode === this.element) {
                    if (!fragment)
                        fragment = document.createDocumentFragment();
                    fragment.appendChild(element);
                }
            }
            if (!fragment)
                return this;
            this.element.appendChild(fragment);
            this._emit(EVENT_SYNCHRONIZE);
            return this;
        }
        layout(instant = false, onFinish) {
            if (this._isDestroyed)
                return this;
            const unfinishedLayout = this._nextLayoutData;
            if (unfinishedLayout && isFunction(unfinishedLayout.cancel)) {
                unfinishedLayout.cancel();
            }
            const nextLayoutId = (layoutId = (layoutId % MAX_SAFE_FLOAT32_INTEGER) + 1);
            this._nextLayoutData = {
                id: nextLayoutId,
                instant: instant,
                onFinish: onFinish,
                cancel: null,
            };
            const { items } = this;
            const layoutItems = [];
            let i = 0;
            for (; i < items.length; i++) {
                if (items[i].isActive())
                    layoutItems.push(items[i]);
            }
            this._updateDimensions();
            const containerData = {
                width: this._rect.width - this._borderLeft - this._borderRight,
                height: this._rect.height - this._borderTop - this._borderBottom,
                borderLeft: this._borderLeft,
                borderRight: this._borderRight,
                borderTop: this._borderTop,
                borderBottom: this._borderBottom,
                boxSizing: this._boxSizing,
            };
            const { layout } = this.settings;
            let cancelLayout;
            if (isFunction(layout)) {
                cancelLayout = layout(nextLayoutId, this, layoutItems, containerData, (layoutData) => {
                    this._onLayoutDataReceived(layoutData);
                });
            }
            else {
                Grid.defaultPacker.updateSettings(layout);
                cancelLayout = Grid.defaultPacker.createLayout(nextLayoutId, layoutItems, containerData, (layoutData) => {
                    this._onLayoutDataReceived(Object.assign(Object.assign({}, layoutData), { items: layoutItems }));
                });
            }
            if (isFunction(cancelLayout) &&
                this._nextLayoutData &&
                this._nextLayoutData.id === nextLayoutId) {
                this._nextLayoutData.cancel = cancelLayout;
            }
            return this;
        }
        add(elements, options = {}) {
            if (this._isDestroyed || !elements)
                return [];
            const newElements = toArray(elements);
            if (!newElements.length)
                return [];
            const layout = options.layout ? options.layout : options.layout === undefined;
            const { items } = this;
            let needsLayout = false;
            let fragment;
            let element;
            let item;
            let i;
            for (i = 0; i < newElements.length; i++) {
                element = newElements[i];
                if (element.parentNode !== this.element) {
                    fragment = fragment || document.createDocumentFragment();
                    fragment.appendChild(element);
                }
            }
            if (fragment) {
                this.element.appendChild(fragment);
            }
            const newItems = [];
            for (i = 0; i < newElements.length; i++) {
                element = newElements[i];
                item = newItems[i] = new Item(this, element, options.active);
                if (item.isActive()) {
                    needsLayout = true;
                    item
                        ._layout._skipNextAnimation = true;
                }
            }
            for (i = 0; i < newItems.length; i++) {
                item = newItems[i];
                item._updateDimensions();
                item._updateSortData();
            }
            arrayInsert(items, newItems, options.index);
            if (this._hasListeners(EVENT_ADD)) {
                this._emit(EVENT_ADD, newItems.slice(0));
            }
            if (needsLayout && layout) {
                this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
            }
            return newItems;
        }
        remove(items, options = {}) {
            if (this._isDestroyed || !items.length)
                return [];
            const layout = options.layout ? options.layout : options.layout === undefined;
            const allItems = this.getItems();
            const targetItems = [];
            const indices = [];
            let needsLayout = false;
            let index;
            let item;
            let i;
            for (i = 0; i < items.length; i++) {
                item = items[i];
                if (item.isDestroyed())
                    continue;
                index = this.items.indexOf(item);
                if (index === -1)
                    continue;
                if (item.isActive())
                    needsLayout = true;
                targetItems.push(item);
                indices.push(allItems.indexOf(item));
                item._destroy(options.removeElements);
                this.items.splice(index, 1);
            }
            if (this._hasListeners(EVENT_REMOVE)) {
                this._emit(EVENT_REMOVE, targetItems.slice(0), indices);
            }
            if (needsLayout && layout) {
                this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
            }
            return targetItems;
        }
        show(items, options = {}) {
            if (!this._isDestroyed && items.length) {
                this._setItemsVisibility(items, true, options);
            }
            return this;
        }
        hide(items, options = {}) {
            if (!this._isDestroyed && items.length) {
                this._setItemsVisibility(items, false, options);
            }
            return this;
        }
        filter(predicate, options = {}) {
            if (this._isDestroyed || !this.items.length)
                return this;
            const itemsToShow = [];
            const itemsToHide = [];
            if (isFunction(predicate) || typeof predicate === 'string') {
                let item;
                let i;
                for (i = 0; i < this.items.length; i++) {
                    item = this.items[i];
                    if (isFunction(predicate) ? predicate(item) : elementMatches(item.element, predicate)) {
                        itemsToShow.push(item);
                    }
                    else {
                        itemsToHide.push(item);
                    }
                }
            }
            const onFinish = isFunction(options.onFinish) ? options.onFinish : undefined;
            let shownItems = [];
            let hiddenItems = [];
            let finishCounter = -1;
            if (itemsToShow.length) {
                this.show(itemsToShow, {
                    instant: !!options.instant,
                    syncWithLayout: !!options.syncWithLayout,
                    onFinish: onFinish
                        ? (items) => {
                            shownItems = items;
                            ++finishCounter && onFinish(shownItems, hiddenItems);
                        }
                        : undefined,
                    layout: false,
                });
            }
            else if (onFinish) {
                ++finishCounter && onFinish(shownItems, hiddenItems);
            }
            if (itemsToHide.length) {
                this.hide(itemsToHide, {
                    instant: !!options.instant,
                    syncWithLayout: !!options.syncWithLayout,
                    onFinish: onFinish
                        ? (items) => {
                            hiddenItems = items;
                            ++finishCounter && onFinish(shownItems, hiddenItems);
                        }
                        : undefined,
                    layout: false,
                });
            }
            else if (onFinish) {
                ++finishCounter && onFinish(shownItems, hiddenItems);
            }
            if (itemsToShow.length || itemsToHide.length) {
                if (this._hasListeners(EVENT_FILTER)) {
                    this._emit(EVENT_FILTER, itemsToShow.slice(0), itemsToHide.slice(0));
                }
                const layout = options.layout ? options.layout : options.layout === undefined;
                if (layout) {
                    this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
                }
            }
            return this;
        }
        sort(comparer, options = {}) {
            if (this._isDestroyed || this.items.length < 2)
                return this;
            const { items } = this;
            const origItems = items.slice(0);
            const layout = options.layout ? options.layout : options.layout === undefined;
            const isDescending = !!options.descending;
            let indexMap = null;
            if (isFunction(comparer)) {
                items.sort((a, b) => {
                    let result = isDescending ? -comparer(a, b) : comparer(a, b);
                    if (!result) {
                        if (!indexMap)
                            indexMap = createIndexMap(origItems);
                        result = isDescending ? compareIndexMap(indexMap, b, a) : compareIndexMap(indexMap, a, b);
                    }
                    return result;
                });
            }
            else if (typeof comparer === 'string') {
                const sortCriteria = comparer
                    .trim()
                    .split(' ')
                    .filter(function (val) {
                    return val;
                })
                    .map(function (val) {
                    return val.split(':');
                });
                items.sort((a, b) => {
                    let result = 0;
                    let i = 0;
                    for (; i < sortCriteria.length; i++) {
                        const criteriaName = sortCriteria[i][0];
                        const criteriaOrder = sortCriteria[i][1];
                        if (a._sortData === null)
                            a._updateSortData();
                        if (b._sortData === null)
                            b._updateSortData();
                        const valA = a._sortData[criteriaName];
                        const valB = b._sortData[criteriaName];
                        if (criteriaOrder === 'desc' || (!criteriaOrder && isDescending)) {
                            result = valB < valA ? -1 : valB > valA ? 1 : 0;
                        }
                        else {
                            result = valA < valB ? -1 : valA > valB ? 1 : 0;
                        }
                        if (result)
                            return result;
                    }
                    if (!result) {
                        if (!indexMap)
                            indexMap = createIndexMap(origItems);
                        result = isDescending
                            ? compareIndexMap(indexMap, b, a)
                            : compareIndexMap(indexMap, a, b);
                    }
                    return result;
                });
            }
            else if (Array.isArray(comparer)) {
                items.length = 0;
                items.push.apply(items, comparer);
            }
            else {
                throw new Error('Invalid comparer argument provided.');
            }
            if (this._hasListeners(EVENT_SORT)) {
                this._emit(EVENT_SORT, items.slice(0), origItems);
            }
            if (layout) {
                this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
            }
            return this;
        }
        move(item, position, options = {}) {
            if (this._isDestroyed || this.items.length < 2)
                return this;
            const { items } = this;
            const layout = options.layout ? options.layout : options.layout === undefined;
            const isSwap = options.action === ACTION_SWAP;
            const action = isSwap ? ACTION_SWAP : ACTION_MOVE;
            const fromItem = this.getItem(item);
            const toItem = this.getItem(position);
            if (fromItem && toItem && fromItem !== toItem) {
                const fromIndex = items.indexOf(fromItem);
                const toIndex = items.indexOf(toItem);
                if (isSwap) {
                    arraySwap(items, fromIndex, toIndex);
                }
                else {
                    arrayMove(items, fromIndex, toIndex);
                }
                if (this._hasListeners(EVENT_MOVE)) {
                    this._emit(EVENT_MOVE, {
                        item: fromItem,
                        fromIndex: fromIndex,
                        toIndex: toIndex,
                        action: action,
                    });
                }
                if (layout) {
                    this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
                }
            }
            return this;
        }
        send(item, targetGrid, position, options = {}) {
            if (this._isDestroyed || targetGrid._isDestroyed || this === targetGrid)
                return this;
            const targetItem = this.getItem(item);
            if (!targetItem)
                return this;
            targetItem._migrate.start(targetGrid, position, options.appendTo || document.body);
            if (targetItem._migrate.isActive() && targetItem.isActive()) {
                const layoutSender = options.layoutSender
                    ? options.layoutSender
                    : options.layoutSender === undefined;
                const layoutReceiver = options.layoutReceiver
                    ? options.layoutReceiver
                    : options.layoutReceiver === undefined;
                if (layoutSender) {
                    this.layout(layoutSender === INSTANT_LAYOUT, isFunction(layoutSender) ? layoutSender : undefined);
                }
                if (layoutReceiver) {
                    targetGrid.layout(layoutReceiver === INSTANT_LAYOUT, isFunction(layoutReceiver) ? layoutReceiver : undefined);
                }
            }
            return this;
        }
        destroy(removeElements = false) {
            if (this._isDestroyed)
                return this;
            const container = this.element;
            const items = this.getItems();
            const layoutStyles = (this._layout && this._layout.styles) || {};
            this._unbindLayoutOnResize();
            let i = 0;
            for (; i < items.length; i++)
                items[i]._destroy(removeElements);
            this.items.length = 0;
            removeClass(container, this.settings.containerClass);
            let prop;
            for (prop in layoutStyles)
                container.style[prop] = '';
            GRID_INSTANCES.delete(this.id);
            this._isDestroyed = true;
            this._emitter.emit(EVENT_DESTROY);
            this._emitter.destroy();
            return this;
        }
        _emit(event, ...args) {
            if (this._isDestroyed)
                return;
            this._emitter.emit(event, ...args);
        }
        _hasListeners(event) {
            if (this._isDestroyed)
                return false;
            return this._emitter.countListeners(event) > 0;
        }
        _updateBoundingRect() {
            const { _rect } = this;
            const { width, height, left, right, top, bottom } = this.element.getBoundingClientRect();
            _rect.width = width;
            _rect.height = height;
            _rect.left = left;
            _rect.right = right;
            _rect.top = top;
            _rect.bottom = bottom;
        }
        _updateBorders(left, right, top, bottom) {
            const { element } = this;
            if (left)
                this._borderLeft = getStyleAsFloat(element, 'border-left-width');
            if (right)
                this._borderRight = getStyleAsFloat(element, 'border-right-width');
            if (top)
                this._borderTop = getStyleAsFloat(element, 'border-top-width');
            if (bottom)
                this._borderBottom = getStyleAsFloat(element, 'border-bottom-width');
        }
        _updateDimensions() {
            this._updateBoundingRect();
            this._updateBorders(true, true, true, true);
            this._boxSizing = getStyle(this.element, 'box-sizing');
        }
        _bindLayoutOnResize(delay) {
            if (typeof delay !== 'number') {
                delay = delay === true ? 0 : -1;
            }
            if (delay >= 0) {
                this._resizeHandler = debounce(() => {
                    this.refreshItems().layout();
                }, delay);
                window.addEventListener('resize', this._resizeHandler);
            }
        }
        _unbindLayoutOnResize() {
            const { _resizeHandler } = this;
            if (isFunction(_resizeHandler)) {
                _resizeHandler(true);
                window.removeEventListener('resize', this._resizeHandler);
                this._resizeHandler = null;
            }
        }
        _onLayoutDataReceived(layout) {
            if (this._isDestroyed || !this._nextLayoutData || this._nextLayoutData.id !== layout.id)
                return;
            const { instant, onFinish } = this._nextLayoutData;
            const numItems = layout.items.length;
            let counter = numItems;
            let item;
            let left;
            let top;
            let i;
            this._nextLayoutData = null;
            if (!this._isLayoutFinished && this._hasListeners(EVENT_LAYOUT_ABORT)) {
                this._emit(EVENT_LAYOUT_ABORT, this._layout.items.slice(0));
            }
            this._layout = layout;
            const itemsToLayout = [];
            for (i = 0; i < numItems; i++) {
                item = layout.items[i];
                if (!item) {
                    --counter;
                    continue;
                }
                left = layout.slots[i * 2];
                top = layout.slots[i * 2 + 1];
                if (item._canSkipLayout(left, top)) {
                    --counter;
                    continue;
                }
                item.left = left;
                item.top = top;
                if (item.isActive() && !item.isDragging()) {
                    itemsToLayout.push(item);
                }
                else {
                    --counter;
                }
            }
            if (layout.styles) {
                setStyles(this.element, layout.styles);
            }
            if (this._hasListeners(EVENT_LAYOUT_START)) {
                this._emit(EVENT_LAYOUT_START, layout.items.slice(0), instant);
                if (this._layout.id !== layout.id)
                    return;
            }
            const tryFinish = () => {
                if (--counter > 0)
                    return;
                const isAborted = this._layout.id !== layout.id;
                if (!isAborted) {
                    this._isLayoutFinished = true;
                }
                if (isFunction(onFinish)) {
                    onFinish(layout.items.slice(0), isAborted);
                }
                if (!isAborted && this._hasListeners(EVENT_LAYOUT_END)) {
                    this._emit(EVENT_LAYOUT_END, layout.items.slice(0));
                }
            };
            if (!itemsToLayout.length) {
                tryFinish();
                return;
            }
            this._isLayoutFinished = false;
            for (i = 0; i < itemsToLayout.length; i++) {
                if (this._layout.id !== layout.id)
                    break;
                itemsToLayout[i]._layout.start(instant, tryFinish);
            }
            return;
        }
        _setItemsVisibility(items, toVisible, options = {}) {
            const targetItems = items.slice(0);
            const isInstant = options.instant === true;
            const callback = options.onFinish;
            const layout = options.layout ? options.layout : options.layout === undefined;
            const startEvent = toVisible ? EVENT_SHOW_START : EVENT_HIDE_START;
            const endEvent = toVisible ? EVENT_SHOW_END : EVENT_HIDE_END;
            const method = toVisible ? 'show' : 'hide';
            const completedItems = [];
            const hiddenItems = [];
            let needsLayout = false;
            let counter = targetItems.length;
            let item;
            let i;
            if (!counter) {
                if (isFunction(callback))
                    callback(targetItems);
                return;
            }
            for (i = 0; i < targetItems.length; i++) {
                item = targetItems[i];
                if ((toVisible && !item.isActive()) || (!toVisible && item.isActive())) {
                    needsLayout = true;
                }
                item._layout._skipNextAnimation = !!(toVisible && !item.isActive());
                if (toVisible && !item.isVisible() && !item.isHiding()) {
                    hiddenItems.push(item);
                }
                if (toVisible) {
                    item._addToLayout();
                }
                else {
                    item._removeFromLayout();
                }
            }
            if (hiddenItems.length) {
                this.refreshItems(hiddenItems, true);
                hiddenItems.length = 0;
            }
            const triggerVisibilityChange = () => {
                if (needsLayout && options.syncWithLayout !== false) {
                    this.off(EVENT_LAYOUT_START, triggerVisibilityChange);
                }
                if (this._hasListeners(startEvent)) {
                    this._emit(startEvent, targetItems.slice(0));
                }
                for (i = 0; i < targetItems.length; i++) {
                    item = targetItems[i];
                    if (item._gridId !== this.id) {
                        if (--counter < 1) {
                            if (isFunction(callback))
                                callback(completedItems.slice(0));
                            if (this._hasListeners(endEvent))
                                this._emit(endEvent, completedItems.slice(0));
                        }
                        continue;
                    }
                    item._visibility[method](isInstant, (interrupted, item) => {
                        if (!interrupted)
                            completedItems.push(item);
                        if (--counter < 1) {
                            if (isFunction(callback))
                                callback(completedItems.slice(0));
                            if (this._hasListeners(endEvent))
                                this._emit(endEvent, completedItems.slice(0));
                        }
                    });
                }
            };
            if (needsLayout && options.syncWithLayout !== false) {
                this.on(EVENT_LAYOUT_START, triggerVisibilityChange);
            }
            else {
                triggerVisibilityChange();
            }
            if (needsLayout && layout) {
                this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
            }
        }
    }
    Grid.Item = Item;
    Grid.ItemLayout = ItemLayout;
    Grid.ItemVisibility = ItemVisibility;
    Grid.ItemMigrate = ItemMigrate;
    Grid.ItemDrag = ItemDrag;
    Grid.ItemDragRelease = ItemDragRelease;
    Grid.ItemDragPlaceholder = ItemDragPlaceholder;
    Grid.AutoScroller = AutoScroller;
    Grid.Emitter = Emitter;
    Grid.Animator = Animator;
    Grid.Dragger = Dragger;
    Grid.Packer = Packer;
    Grid.defaultPacker = new Packer();
    Grid.defaultOptions = {
        items: '*',
        showDuration: 300,
        showEasing: 'ease',
        hideDuration: 300,
        hideEasing: 'ease',
        visibleStyles: {
            opacity: '1',
            transform: 'scale(1)',
        },
        hiddenStyles: {
            opacity: '0',
            transform: 'scale(0.5)',
        },
        layout: {
            fillGaps: false,
            horizontal: false,
            alignRight: false,
            alignBottom: false,
            rounding: false,
        },
        layoutOnResize: 150,
        layoutOnInit: true,
        layoutDuration: 300,
        layoutEasing: 'ease',
        sortData: null,
        translate3d: false,
        dragEnabled: false,
        dragContainer: null,
        dragHandle: null,
        dragStartPredicate: {
            distance: 0,
            delay: 0,
        },
        dragAxis: 'xy',
        dragSort: true,
        dragSortHeuristics: {
            sortInterval: 100,
            minDragDistance: 10,
            minBounceBackAngle: 1,
        },
        dragSortPredicate: {
            threshold: 50,
            action: ACTION_MOVE,
            migrateAction: ACTION_MOVE,
        },
        dragRelease: {
            duration: 300,
            easing: 'ease',
            useDragContainer: true,
        },
        dragCssProps: {
            touchAction: 'none',
            userSelect: 'none',
            userDrag: 'none',
            tapHighlightColor: 'rgba(0, 0, 0, 0)',
            touchCallout: 'none',
            contentZooming: 'none',
        },
        dragEventListenerOptions: {
            passive: true,
            capture: false,
        },
        dragPlaceholder: {
            enabled: false,
            createElement: null,
            onCreate: null,
            onRemove: null,
        },
        dragAutoScroll: {
            targets: [],
            handle: null,
            threshold: 50,
            safeZone: 0.2,
            speed: AutoScroller.smoothSpeed(1000, 2000, 2500),
            sortDuringScroll: true,
            smoothStop: false,
            onStart: null,
            onStop: null,
        },
        containerClass: 'muuri',
        itemClass: 'muuri-item',
        itemVisibleClass: 'muuri-item-shown',
        itemHiddenClass: 'muuri-item-hidden',
        itemPositioningClass: 'muuri-item-positioning',
        itemDraggingClass: 'muuri-item-dragging',
        itemReleasingClass: 'muuri-item-releasing',
        itemPlaceholderClass: 'muuri-item-placeholder',
        _animationWindowing: false,
    };

    return Grid;

})));
