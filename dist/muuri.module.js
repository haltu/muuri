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

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

var GRID_INSTANCES = new Map();
var ITEM_ELEMENT_MAP = new Map();
var ACTION_SWAP = 'swap';
var ACTION_MOVE = 'move';
var INSTANT_LAYOUT = 'instant';
var EVENT_SYNCHRONIZE = 'synchronize';
var EVENT_LAYOUT_START = 'layoutStart';
var EVENT_LAYOUT_END = 'layoutEnd';
var EVENT_LAYOUT_ABORT = 'layoutAbort';
var EVENT_ADD = 'add';
var EVENT_REMOVE = 'remove';
var EVENT_SHOW_START = 'showStart';
var EVENT_SHOW_END = 'showEnd';
var EVENT_HIDE_START = 'hideStart';
var EVENT_HIDE_END = 'hideEnd';
var EVENT_FILTER = 'filter';
var EVENT_SORT = 'sort';
var EVENT_MOVE = 'move';
var EVENT_SEND = 'send';
var EVENT_BEFORE_SEND = 'beforeSend';
var EVENT_RECEIVE = 'receive';
var EVENT_BEFORE_RECEIVE = 'beforeReceive';
var EVENT_DRAG_INIT = 'dragInit';
var EVENT_DRAG_START = 'dragStart';
var EVENT_DRAG_MOVE = 'dragMove';
var EVENT_DRAG_SCROLL = 'dragScroll';
var EVENT_DRAG_END = 'dragEnd';
var EVENT_DRAG_RELEASE_START = 'dragReleaseStart';
var EVENT_DRAG_RELEASE_END = 'dragReleaseEnd';
var EVENT_DESTROY = 'destroy';
var HAS_TOUCH_EVENTS = 'ontouchstart' in window;
var HAS_POINTER_EVENTS = !!window.PointerEvent;
var UA = window.navigator.userAgent.toLowerCase();
var IS_EDGE = UA.indexOf('edge') > -1;
var IS_IE = UA.indexOf('trident') > -1;
var IS_FIREFOX = UA.indexOf('firefox') > -1;
var IS_ANDROID = UA.indexOf('android') > -1;
var IS_IOS = /^(iPad|iPhone|iPod)/.test(window.navigator.platform) ||
    (/^Mac/.test(window.navigator.platform) && window.navigator.maxTouchPoints > 1);
var MAX_SAFE_FLOAT32_INTEGER = 16777216;
var VIEWPORT_THRESHOLD = 100;
var HAS_PASSIVE_EVENTS = (function () {
    var isPassiveEventsSupported = false;
    try {
        var passiveOpts = Object.defineProperty({}, 'passive', {
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

var raf = (window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame).bind(window);

var TickerLane = (function () {
    function TickerLane() {
        this._queue = [];
        this._indices = new Map();
        this._callbacks = new Map();
    }
    TickerLane.prototype.add = function (id, callback) {
        var _a = this, _queue = _a._queue, _indices = _a._indices, _callbacks = _a._callbacks;
        var index = _indices.get(id);
        if (index !== undefined)
            _queue[index] = undefined;
        _queue.push(id);
        _callbacks.set(id, callback);
        _indices.set(id, _queue.length - 1);
    };
    TickerLane.prototype.remove = function (id) {
        var _a = this, _queue = _a._queue, _indices = _a._indices, _callbacks = _a._callbacks;
        var index = _indices.get(id);
        if (index === undefined)
            return;
        _queue[index] = undefined;
        _callbacks.delete(id);
        _indices.delete(id);
    };
    TickerLane.prototype.flush = function (targetQueue, targetCallbacks) {
        var _a = this, _queue = _a._queue, _callbacks = _a._callbacks, _indices = _a._indices;
        var id;
        var i = 0;
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
    };
    return TickerLane;
}());
var Ticker = (function () {
    function Ticker(numLanes) {
        if (numLanes === void 0) { numLanes = 1; }
        this._nextStep = null;
        this._lanes = [];
        this._stepQueue = [];
        this._stepCallbacks = new Map();
        this._step = this._step.bind(this);
        var i = 0;
        for (; i < numLanes; i++) {
            this._lanes.push(new TickerLane());
        }
    }
    Ticker.prototype.add = function (laneIndex, id, callback) {
        var lane = this._lanes[laneIndex];
        if (lane) {
            lane.add(id, callback);
            if (!this._nextStep)
                this._nextStep = raf(this._step);
        }
    };
    Ticker.prototype.remove = function (laneIndex, id) {
        var lane = this._lanes[laneIndex];
        if (lane)
            lane.remove(id);
    };
    Ticker.prototype._step = function (time) {
        var _a = this, _lanes = _a._lanes, _stepQueue = _a._stepQueue, _stepCallbacks = _a._stepCallbacks;
        var i = 0;
        this._nextStep = null;
        for (i = 0; i < _lanes.length; i++) {
            _lanes[i].flush(_stepQueue, _stepCallbacks);
        }
        for (i = 0; i < _stepQueue.length; i++) {
            _stepCallbacks.get(_stepQueue[i])(time);
        }
        _stepQueue.length = 0;
        _stepCallbacks.clear();
    };
    return Ticker;
}());

var LAYOUT_READ = 'layoutRead';
var LAYOUT_WRITE = 'layoutWrite';
var VISIBILITY_READ = 'visibilityRead';
var VISIBILITY_WRITE = 'visibilityWrite';
var DRAG_START_READ = 'dragStartRead';
var DRAG_START_WRITE = 'dragStartWrite';
var DRAG_MOVE_READ = 'dragMoveRead';
var DRAG_MOVE_WRITE = 'dragMoveWrite';
var DRAG_SCROLL_READ = 'dragScrollRead';
var DRAG_SCROLL_WRITE = 'dragScrollWrite';
var DRAG_SORT_READ = 'dragSortRead';
var RELEASE_SCROLL_READ = 'releaseScrollRead';
var RELEASE_SCROLL_WRITE = 'releaseScrollWrite';
var PLACEHOLDER_LAYOUT_READ = 'placeholderLayoutRead';
var PLACEHOLDER_LAYOUT_WRITE = 'placeholderLayoutWrite';
var PLACEHOLDER_RESIZE_WRITE = 'placeholderResizeWrite';
var AUTO_SCROLL_READ = 'autoScrollRead';
var AUTO_SCROLL_WRITE = 'autoScrollWrite';
var DEBOUNCE_READ = 'debounceRead';
var LANE_READ = 0;
var LANE_READ_TAIL = 1;
var LANE_WRITE = 2;
var ticker = new Ticker(3);
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
    var area = getIntersectionArea(a, b);
    if (!area)
        return 0;
    var maxArea = Math.min(a.width, b.width) * Math.min(a.height, b.height);
    return (area / maxArea) * 100;
}

var cache = new WeakMap();
var cacheTimer = null;
var canClearCache = true;
var cacheTime = 1000;
var clearCache = function () {
    if (canClearCache) {
        canClearCache = true;
        return;
    }
    if (cacheTimer !== null) {
        window.clearInterval(cacheTimer);
        cacheTimer = null;
    }
    cache = new WeakMap();
};
function getStyle(element, prop) {
    if (!prop)
        return '';
    var styles = cache.get(element);
    if (!styles) {
        styles = window.getComputedStyle(element, null);
        cache.set(element, styles);
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

var R1 = {
    width: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
};
var R2 = __assign({}, R1);
var SPEED_DATA = {
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
var AXIS_X = 1;
var AXIS_Y = 2;
var FORWARD = 4;
var BACKWARD = 8;
var DIR_LEFT = (AXIS_X | BACKWARD);
var DIR_RIGHT = (AXIS_X | FORWARD);
var DIR_UP = (AXIS_Y | BACKWARD);
var DIR_DOWN = (AXIS_Y | FORWARD);
function pointerHandle(pointerSize) {
    var rect = { left: 0, top: 0, width: 0, height: 0 };
    var size = pointerSize || 1;
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
        var targetSpeed = 0;
        if (!data.isEnding) {
            if (data.threshold > 0) {
                var factor = data.threshold - Math.max(0, data.distance);
                targetSpeed = (maxSpeed / data.threshold) * factor;
            }
            else {
                targetSpeed = maxSpeed;
            }
        }
        var currentSpeed = data.speed;
        if (currentSpeed === targetSpeed)
            return targetSpeed;
        var nextSpeed = targetSpeed;
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
function getContentRect(element, result) {
    if (result === void 0) { result = { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 }; }
    if (isWindow(element)) {
        result.width = document.documentElement.clientWidth;
        result.height = document.documentElement.clientHeight;
        result.left = 0;
        result.right = result.width;
        result.top = 0;
        result.bottom = result.height;
    }
    else {
        var _a = element.getBoundingClientRect(), left = _a.left, top_1 = _a.top;
        var borderLeft = element.clientLeft || getStyleAsFloat(element, 'border-left-width');
        var borderTop = element.clientTop || getStyleAsFloat(element, 'border-top-width');
        result.width = element.clientWidth;
        result.height = element.clientHeight;
        result.left = left + borderLeft;
        result.right = result.left + result.width;
        result.top = top_1 + borderTop;
        result.bottom = result.top + result.height;
    }
    return result;
}
function getItemAutoScrollSettings(item) {
    return item.getGrid().settings.dragAutoScroll;
}
function prepareItemScrollSync(item) {
    var drag = item._drag;
    if (drag)
        drag._prepareScroll();
}
function applyItemScrollSync(item) {
    if (!item.isActive())
        return;
    var drag = item._drag;
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
var ObjectPool = (function () {
    function ObjectPool(createObject, onRelease) {
        this._pool = [];
        this._createObject = createObject;
        this._onRelease = onRelease;
    }
    ObjectPool.prototype.pick = function () {
        return this._pool.pop() || this._createObject();
    };
    ObjectPool.prototype.release = function (object) {
        if (this._pool.indexOf(object) !== -1)
            return;
        this._onRelease && this._onRelease(object);
        this._pool.push(object);
    };
    ObjectPool.prototype.reset = function () {
        this._pool.length = 0;
    };
    return ObjectPool;
}());
var ScrollAction = (function () {
    function ScrollAction() {
        this.element = null;
        this.requestX = null;
        this.requestY = null;
        this.scrollLeft = 0;
        this.scrollTop = 0;
    }
    ScrollAction.prototype.reset = function () {
        if (this.requestX)
            this.requestX.action = null;
        if (this.requestY)
            this.requestY.action = null;
        this.element = null;
        this.requestX = null;
        this.requestY = null;
        this.scrollLeft = 0;
        this.scrollTop = 0;
    };
    ScrollAction.prototype.addRequest = function (request) {
        if (AXIS_X & request.direction) {
            this.requestX && this.removeRequest(this.requestX);
            this.requestX = request;
        }
        else {
            this.requestY && this.removeRequest(this.requestY);
            this.requestY = request;
        }
        request.action = this;
    };
    ScrollAction.prototype.removeRequest = function (request) {
        if (this.requestX === request) {
            this.requestX = null;
            request.action = null;
        }
        else if (this.requestY === request) {
            this.requestY = null;
            request.action = null;
        }
    };
    ScrollAction.prototype.computeScrollValues = function () {
        if (!this.element)
            return;
        this.scrollLeft = this.requestX ? this.requestX.value : getScrollLeft(this.element);
        this.scrollTop = this.requestY ? this.requestY.value : getScrollTop(this.element);
    };
    ScrollAction.prototype.scroll = function () {
        if (!this.element)
            return;
        if (this.element.scrollTo) {
            this.element.scrollTo(this.scrollLeft, this.scrollTop);
        }
        else {
            this.element.scrollLeft = this.scrollLeft;
            this.element.scrollTop = this.scrollTop;
        }
    };
    return ScrollAction;
}());
var ScrollRequest = (function () {
    function ScrollRequest() {
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
    ScrollRequest.prototype.reset = function () {
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
    };
    ScrollRequest.prototype.hasReachedEnd = function () {
        return FORWARD & this.direction ? this.value >= this.maxValue : this.value <= 0;
    };
    ScrollRequest.prototype.computeCurrentScrollValue = function () {
        if (!this.element)
            return 0;
        if (this.value !== this.value) {
            return AXIS_X & this.direction ? getScrollLeft(this.element) : getScrollTop(this.element);
        }
        return Math.max(0, Math.min(this.value, this.maxValue));
    };
    ScrollRequest.prototype.computeNextScrollValue = function () {
        var delta = this.speed * (this.deltaTime / 1000);
        var nextValue = FORWARD & this.direction ? this.value + delta : this.value - delta;
        return Math.max(0, Math.min(nextValue, this.maxValue));
    };
    ScrollRequest.prototype.computeSpeed = function () {
        if (!this.item || !this.element)
            return 0;
        var speed = getItemAutoScrollSettings(this.item).speed;
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
    };
    ScrollRequest.prototype.tick = function (deltaTime) {
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
    };
    ScrollRequest.prototype.onStart = function () {
        if (!this.item || !this.element)
            return;
        var onStart = getItemAutoScrollSettings(this.item).onStart;
        if (isFunction(onStart))
            onStart(this.item, this.element, this.direction);
    };
    ScrollRequest.prototype.onStop = function () {
        if (!this.item || !this.element)
            return;
        var onStop = getItemAutoScrollSettings(this.item).onStop;
        if (isFunction(onStop))
            onStop(this.item, this.element, this.direction);
        var drag = this.item._drag;
        if (drag)
            drag.sort();
    };
    return ScrollRequest;
}());
var ItemDragAutoScroll = (function () {
    function ItemDragAutoScroll() {
        var _a;
        this._isDestroyed = false;
        this._isTicking = false;
        this._tickTime = 0;
        this._tickDeltaTime = 0;
        this._items = [];
        this._actions = [];
        this._requests = (_a = {},
            _a[AXIS_X] = new Map(),
            _a[AXIS_Y] = new Map(),
            _a);
        this._requestOverlapCheck = new Map();
        this._dragPositions = new Map();
        this._dragDirections = new Map();
        this._overlapCheckInterval = 150;
        this._requestPool = new ObjectPool(function () { return new ScrollRequest(); }, function (request) { return request.reset(); });
        this._actionPool = new ObjectPool(function () { return new ScrollAction(); }, function (action) { return action.reset(); });
        this._readTick = this._readTick.bind(this);
        this._writeTick = this._writeTick.bind(this);
    }
    ItemDragAutoScroll.prototype.isDestroyed = function () {
        return this._isDestroyed;
    };
    ItemDragAutoScroll.prototype.addItem = function (item, posX, posY) {
        if (this._isDestroyed)
            return;
        var index = this._items.indexOf(item);
        if (index === -1) {
            this._items.push(item);
            this._requestOverlapCheck.set(item.id, this._tickTime);
            this._dragDirections.set(item.id, [0, 0]);
            this._dragPositions.set(item.id, [posX, posY]);
            if (!this._isTicking)
                this._startTicking();
        }
    };
    ItemDragAutoScroll.prototype.updateItem = function (item, posX, posY) {
        if (this._isDestroyed)
            return;
        var dragPositions = this._dragPositions.get(item.id);
        var dragDirections = this._dragDirections.get(item.id);
        if (!dragPositions || !dragDirections)
            return;
        var prevX = dragPositions[0];
        var prevY = dragPositions[1];
        dragDirections[0] = posX > prevX ? DIR_RIGHT : posX < prevX ? DIR_LEFT : dragDirections[0] || 0;
        dragDirections[1] = posY > prevY ? DIR_DOWN : posY < prevY ? DIR_UP : dragDirections[1] || 0;
        dragPositions[0] = posX;
        dragPositions[1] = posY;
        this._requestOverlapCheck.set(item.id, this._requestOverlapCheck.get(item.id) || this._tickTime);
    };
    ItemDragAutoScroll.prototype.removeItem = function (item) {
        if (this._isDestroyed)
            return;
        var index = this._items.indexOf(item);
        if (index === -1)
            return;
        var itemId = item.id;
        var reqX = this._requests[AXIS_X].get(itemId);
        if (reqX) {
            this._cancelItemScroll(item, AXIS_X);
            this._requests[AXIS_X].delete(itemId);
        }
        var reqY = this._requests[AXIS_Y].get(itemId);
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
    };
    ItemDragAutoScroll.prototype.isItemScrollingX = function (item) {
        var reqX = this._requests[AXIS_X].get(item.id);
        return !!(reqX && reqX.isActive);
    };
    ItemDragAutoScroll.prototype.isItemScrollingY = function (item) {
        var reqY = this._requests[AXIS_Y].get(item.id);
        return !!(reqY && reqY.isActive);
    };
    ItemDragAutoScroll.prototype.isItemScrolling = function (item) {
        return this.isItemScrollingX(item) || this.isItemScrollingY(item);
    };
    ItemDragAutoScroll.prototype.destroy = function () {
        if (this._isDestroyed)
            return;
        var items = this._items.slice(0);
        var i = 0;
        for (; i < items.length; i++) {
            this.removeItem(items[i]);
        }
        this._actions.length = 0;
        this._requestPool.reset();
        this._actionPool.reset();
        this._isDestroyed = true;
    };
    ItemDragAutoScroll.prototype._readTick = function (time) {
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
    };
    ItemDragAutoScroll.prototype._writeTick = function () {
        if (this._isDestroyed)
            return;
        this._applyActions();
        addAutoScrollTick(this._readTick, this._writeTick);
    };
    ItemDragAutoScroll.prototype._startTicking = function () {
        this._isTicking = true;
        addAutoScrollTick(this._readTick, this._writeTick);
    };
    ItemDragAutoScroll.prototype._stopTicking = function () {
        this._isTicking = false;
        this._tickTime = 0;
        this._tickDeltaTime = 0;
        cancelAutoScrollTick();
    };
    ItemDragAutoScroll.prototype._getItemHandleRect = function (item, handle, rect) {
        if (rect === void 0) { rect = { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 }; }
        var drag = item._drag;
        if (handle) {
            var ev = (drag._dragMoveEvent || drag._dragStartEvent);
            var data = handle(item, drag._clientX, drag._clientY, item.width, item.height, ev.clientX, ev.clientY);
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
    };
    ItemDragAutoScroll.prototype._requestItemScroll = function (item, axis, element, direction, threshold, distance, maxValue) {
        var reqMap = this._requests[axis];
        var request = reqMap.get(item.id);
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
    };
    ItemDragAutoScroll.prototype._cancelItemScroll = function (item, axis) {
        var reqMap = this._requests[axis];
        var request = reqMap.get(item.id);
        if (!request)
            return;
        if (request.action)
            request.action.removeRequest(request);
        this._requestPool.release(request);
        reqMap.delete(item.id);
    };
    ItemDragAutoScroll.prototype._checkItemOverlap = function (item, checkX, checkY) {
        var settings = getItemAutoScrollSettings(item);
        var threshold = settings.threshold, safeZone = settings.safeZone, handle = settings.handle, _targets = settings.targets;
        var targets = typeof _targets === 'function' ? _targets(item) : _targets;
        if (!targets || !targets.length) {
            checkX && this._cancelItemScroll(item, AXIS_X);
            checkY && this._cancelItemScroll(item, AXIS_Y);
            return;
        }
        var dragDirections = this._dragDirections.get(item.id);
        var dragDirectionX = (dragDirections && dragDirections[0]) || 0;
        var dragDirectionY = (dragDirections && dragDirections[1]) || 0;
        if (!dragDirectionX && !dragDirectionY) {
            checkX && this._cancelItemScroll(item, AXIS_X);
            checkY && this._cancelItemScroll(item, AXIS_Y);
            return;
        }
        var itemRect = this._getItemHandleRect(item, handle, R1);
        var xElement = null;
        var xPriority = -Infinity;
        var xThreshold = 0;
        var xScore = 0;
        var xDirection = 0;
        var xDistance = 0;
        var xMaxScroll = 0;
        var yElement = null;
        var yPriority = -Infinity;
        var yThreshold = 0;
        var yScore = 0;
        var yDirection = 0;
        var yDistance = 0;
        var yMaxScroll = 0;
        var i = 0;
        for (; i < targets.length; i++) {
            var target = targets[i];
            var targetThreshold = target.threshold || threshold;
            var testAxisX = !!(checkX && dragDirectionX && target.axis !== AXIS_Y);
            var testAxisY = !!(checkY && dragDirectionY && target.axis !== AXIS_X);
            var testPriority = target.priority || 0;
            if ((!testAxisX || testPriority < xPriority) && (!testAxisY || testPriority < yPriority)) {
                continue;
            }
            var testElement = getScrollElement(target.element || target);
            var testMaxScrollX = testAxisX ? getScrollLeftMax(testElement) : -1;
            var testMaxScrollY = testAxisY ? getScrollTopMax(testElement) : -1;
            if (!testMaxScrollX && !testMaxScrollY)
                continue;
            var testRect = getContentRect(testElement, R2);
            var testScore = getIntersectionScore(itemRect, testRect);
            if (testScore <= 0)
                continue;
            if (testAxisX &&
                testPriority >= xPriority &&
                testMaxScrollX > 0 &&
                (testPriority > xPriority || testScore > xScore)) {
                var testDistance = 0;
                var testDirection = 0;
                var testThreshold = computeThreshold(targetThreshold, testRect.width);
                var testEdgeOffset = computeEdgeOffset(testThreshold, safeZone, itemRect.width, testRect.width);
                if (dragDirectionX === DIR_RIGHT) {
                    testDistance = testRect.right + testEdgeOffset - itemRect.right;
                    if (testDistance <= testThreshold && getScrollLeft(testElement) < testMaxScrollX) {
                        testDirection = DIR_RIGHT;
                    }
                }
                else if (dragDirectionX === DIR_LEFT) {
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
            if (testAxisY &&
                testPriority >= yPriority &&
                testMaxScrollY > 0 &&
                (testPriority > yPriority || testScore > yScore)) {
                var testDistance = 0;
                var testDirection = 0;
                var testThreshold = computeThreshold(targetThreshold, testRect.height);
                var testEdgeOffset = computeEdgeOffset(testThreshold, safeZone, itemRect.height, testRect.height);
                if (dragDirectionY === DIR_DOWN) {
                    testDistance = testRect.bottom + testEdgeOffset - itemRect.bottom;
                    if (testDistance <= testThreshold && getScrollTop(testElement) < testMaxScrollY) {
                        testDirection = DIR_DOWN;
                    }
                }
                else if (dragDirectionY === DIR_UP) {
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
    };
    ItemDragAutoScroll.prototype._updateScrollRequest = function (scrollRequest) {
        var item = scrollRequest.item;
        var _a = getItemAutoScrollSettings(item), threshold = _a.threshold, safeZone = _a.safeZone, smoothStop = _a.smoothStop, handle = _a.handle, _targets = _a.targets;
        var targets = typeof _targets === 'function' ? _targets(item) : _targets;
        var targetCount = (targets && targets.length) || 0;
        var itemRect = this._getItemHandleRect(item, handle, R1);
        var hasReachedEnd = null;
        var i = 0;
        for (; i < targetCount; i++) {
            var target = targets[i];
            var testElement = getScrollElement(target.element || target);
            if (testElement !== scrollRequest.element)
                continue;
            var testIsAxisX = !!(AXIS_X & scrollRequest.direction);
            if (testIsAxisX) {
                if (target.axis === AXIS_Y)
                    continue;
            }
            else {
                if (target.axis === AXIS_X)
                    continue;
            }
            var testMaxScroll = testIsAxisX
                ? getScrollLeftMax(testElement)
                : getScrollTopMax(testElement);
            if (testMaxScroll <= 0) {
                break;
            }
            var testRect = getContentRect(testElement, R2);
            var testScore = getIntersectionScore(itemRect, testRect);
            if (testScore <= 0) {
                break;
            }
            var targetThreshold = typeof target.threshold === 'number' ? target.threshold : threshold;
            var testThreshold = computeThreshold(targetThreshold, testIsAxisX ? testRect.width : testRect.height);
            var testEdgeOffset = computeEdgeOffset(testThreshold, safeZone, testIsAxisX ? itemRect.width : itemRect.height, testIsAxisX ? testRect.width : testRect.height);
            var testDistance = 0;
            if (scrollRequest.direction === DIR_LEFT) {
                testDistance = itemRect.left - (testRect.left - testEdgeOffset);
            }
            else if (scrollRequest.direction === DIR_RIGHT) {
                testDistance = testRect.right + testEdgeOffset - itemRect.right;
            }
            else if (scrollRequest.direction === DIR_UP) {
                testDistance = itemRect.top - (testRect.top - testEdgeOffset);
            }
            else {
                testDistance = testRect.bottom + testEdgeOffset - itemRect.bottom;
            }
            if (testDistance > testThreshold) {
                break;
            }
            var testScroll = testIsAxisX ? getScrollLeft(testElement) : getScrollTop(testElement);
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
    };
    ItemDragAutoScroll.prototype._updateRequests = function () {
        var items = this._items;
        var requestsX = this._requests[AXIS_X];
        var requestsY = this._requests[AXIS_Y];
        var i = 0;
        for (; i < items.length; i++) {
            var item = items[i];
            var checkTime = this._requestOverlapCheck.get(item.id) || 0;
            var needsCheck = checkTime > 0 && this._tickTime - checkTime > this._overlapCheckInterval;
            var checkX = true;
            var reqX = requestsX.get(item.id);
            if (reqX && reqX.isActive) {
                checkX = !this._updateScrollRequest(reqX);
                if (checkX) {
                    needsCheck = true;
                    this._cancelItemScroll(item, AXIS_X);
                }
            }
            var checkY = true;
            var reqY = requestsY.get(item.id);
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
    };
    ItemDragAutoScroll.prototype._requestAction = function (request, axis) {
        var actions = this._actions;
        var isAxisX = axis === AXIS_X;
        var action = null;
        var i = 0;
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
    };
    ItemDragAutoScroll.prototype._updateActions = function () {
        var items = this._items;
        var requests = this._requests;
        var actions = this._actions;
        var i = 0;
        for (i = 0; i < items.length; i++) {
            var reqX = requests[AXIS_X].get(items[i].id);
            var reqY = requests[AXIS_Y].get(items[i].id);
            if (reqX)
                this._requestAction(reqX, AXIS_X);
            if (reqY)
                this._requestAction(reqY, AXIS_Y);
        }
        for (i = 0; i < actions.length; i++) {
            actions[i].computeScrollValues();
        }
    };
    ItemDragAutoScroll.prototype._applyActions = function () {
        var actions = this._actions;
        if (!actions.length)
            return;
        var i = 0;
        for (i = 0; i < actions.length; i++) {
            actions[i].scroll();
            this._actionPool.release(actions[i]);
        }
        actions.length = 0;
        var items = this._items;
        for (i = 0; i < items.length; i++)
            prepareItemScrollSync(items[i]);
        for (i = 0; i < items.length; i++)
            applyItemScrollSync(items[i]);
    };
    ItemDragAutoScroll.AXIS_X = AXIS_X;
    ItemDragAutoScroll.AXIS_Y = AXIS_Y;
    ItemDragAutoScroll.DIR_LEFT = DIR_LEFT;
    ItemDragAutoScroll.DIR_RIGHT = DIR_RIGHT;
    ItemDragAutoScroll.DIR_UP = DIR_UP;
    ItemDragAutoScroll.DIR_DOWN = DIR_DOWN;
    ItemDragAutoScroll.smoothSpeed = smoothSpeed;
    ItemDragAutoScroll.pointerHandle = pointerHandle;
    return ItemDragAutoScroll;
}());

var Emitter = (function () {
    function Emitter() {
        this._events = {};
        this._queue = [];
        this._counter = 0;
        this._clearOnEmit = false;
    }
    Emitter.prototype.on = function (event, listener) {
        if (!this._events)
            return this;
        var listeners = this._events[event] || [];
        this._events[event] = listeners;
        listeners.push(listener);
        return this;
    };
    Emitter.prototype.off = function (event, listener) {
        if (!this._events)
            return this;
        var listeners = this._events[event];
        if (!listeners || !listeners.length)
            return this;
        var index = 0;
        while ((index = listeners.indexOf(listener)) !== -1) {
            listeners.splice(index, 1);
        }
        return this;
    };
    Emitter.prototype.clear = function (event) {
        if (!this._events)
            return this;
        var listeners = this._events[event];
        if (listeners) {
            listeners.length = 0;
            delete this._events[event];
        }
        return this;
    };
    Emitter.prototype.emit = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this._events) {
            this._clearOnEmit = false;
            return this;
        }
        var listeners = this._events[event];
        if (!listeners || !listeners.length) {
            this._clearOnEmit = false;
            return this;
        }
        var queue = this._queue;
        var startIndex = queue.length;
        queue.push.apply(queue, listeners);
        if (this._clearOnEmit) {
            listeners.length = 0;
            this._clearOnEmit = false;
        }
        ++this._counter;
        var i = startIndex;
        var endIndex = queue.length;
        for (; i < endIndex; i++) {
            queue[i].apply(queue, args);
            if (!this._events)
                return this;
        }
        --this._counter;
        if (!this._counter)
            queue.length = 0;
        return this;
    };
    Emitter.prototype.burst = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this._events)
            return this;
        this._clearOnEmit = true;
        return this.emit.apply(this, __spreadArrays([event], args));
    };
    Emitter.prototype.countListeners = function (event) {
        if (!this._events)
            return 0;
        var listeners = this._events[event];
        return listeners ? listeners.length : 0;
    };
    Emitter.prototype.destroy = function () {
        if (!this._events)
            return this;
        this._queue.length = this._counter = 0;
        this._events = null;
        return this;
    };
    return Emitter;
}());

var POINTER_OUT_EVENT = 'pointerout';
var WAIT_DURATION = 100;
var EdgeHack = (function () {
    function EdgeHack(dragger) {
        this._dragger = dragger;
        this._timeout = null;
        this._outEvent = null;
        this._isActive = false;
        this._addBehaviour = this._addBehaviour.bind(this);
        this._removeBehaviour = this._removeBehaviour.bind(this);
        this._onTimeout = this._onTimeout.bind(this);
        this._resetData = this._resetData.bind(this);
        this._onStart = this._onStart.bind(this);
        this._onOut = this._onOut.bind(this);
        this._dragger.on('start', this._onStart);
    }
    EdgeHack.prototype.destroy = function () {
        this._dragger.off('start', this._onStart);
        this._removeBehaviour();
    };
    EdgeHack.prototype._addBehaviour = function () {
        if (this._isActive)
            return;
        this._isActive = true;
        this._dragger.on('move', this._resetData);
        this._dragger.on('cancel', this._removeBehaviour);
        this._dragger.on('end', this._removeBehaviour);
        window.addEventListener(POINTER_OUT_EVENT, this._onOut);
    };
    EdgeHack.prototype._removeBehaviour = function () {
        if (!this._isActive)
            return;
        this._dragger.off('move', this._resetData);
        this._dragger.off('cancel', this._removeBehaviour);
        this._dragger.off('end', this._removeBehaviour);
        window.removeEventListener(POINTER_OUT_EVENT, this._onOut);
        this._resetData();
        this._isActive = false;
    };
    EdgeHack.prototype._resetData = function () {
        if (this._timeout !== null) {
            window.clearTimeout(this._timeout);
            this._timeout = null;
        }
        this._outEvent = null;
    };
    EdgeHack.prototype._onStart = function (e) {
        if (e.pointerType === 'mouse')
            return;
        this._addBehaviour();
    };
    EdgeHack.prototype._onOut = function (e) {
        if (!this._dragger.getTrackedTouch(e))
            return;
        this._resetData();
        this._outEvent = e;
        this._timeout = window.setTimeout(this._onTimeout, WAIT_DURATION);
    };
    EdgeHack.prototype._onTimeout = function () {
        var outEvent = this._outEvent;
        this._resetData();
        if (outEvent && this._dragger.isActive())
            this._dragger.onCancel(outEvent);
    };
    return EdgeHack;
}());

var vendorPrefixes = ['', 'webkit', 'moz', 'ms', 'o', 'Webkit', 'Moz', 'MS', 'O'];
var cache$1 = new Map();
function getPrefixedPropName(style, styleProp) {
    var prefixedProp = cache$1.get(styleProp);
    if (prefixedProp)
        return prefixedProp;
    var camelProp = styleProp[0].toUpperCase() + styleProp.slice(1);
    var i = 0;
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

var POINTER_EVENTS = {
    start: 'pointerdown',
    move: 'pointermove',
    cancel: 'pointercancel',
    end: 'pointerup',
};
var TOUCH_EVENTS = {
    start: 'touchstart',
    move: 'touchmove',
    cancel: 'touchcancel',
    end: 'touchend',
};
var MOUSE_EVENTS = {
    start: 'mousedown',
    move: 'mousemove',
    cancel: '',
    end: 'mouseup',
};
var SOURCE_EVENTS = __assign({}, (HAS_TOUCH_EVENTS ? TOUCH_EVENTS : HAS_POINTER_EVENTS ? POINTER_EVENTS : MOUSE_EVENTS));
var DRAGGER_EVENTS = {
    start: 'start',
    move: 'move',
    cancel: 'cancel',
    end: 'end',
};
var CAPTURE = 1;
var PASSIVE = 2;
var TA_AUTO = 'auto';
var TA_PROP = 'touchAction';
var TA_PROP_PREFIXED = getPrefixedPropName(document.documentElement.style, TA_PROP);
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
        var i = 0;
        for (; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === id) {
                return e.changedTouches[i];
            }
        }
        return null;
    }
    return e;
}
var DragProxy = (function () {
    function DragProxy(listenerType) {
        this._emitter = new Emitter();
        this._listenerOptions = getListenerOptions(listenerType);
        this._draggers = new Set();
        this._onMove = this._onMove.bind(this);
        this._onCancel = this._onCancel.bind(this);
        this._onEnd = this._onEnd.bind(this);
    }
    DragProxy.prototype.hasDragger = function (dragger) {
        return this._draggers.has(dragger);
    };
    DragProxy.prototype.addDragger = function (dragger) {
        if (this._draggers.has(dragger))
            return;
        this._draggers.add(dragger);
        this._emitter.on(DRAGGER_EVENTS.move, dragger.onMove);
        this._emitter.on(DRAGGER_EVENTS.cancel, dragger.onCancel);
        this._emitter.on(DRAGGER_EVENTS.end, dragger.onEnd);
        if (this._draggers.size === 1) {
            this._activate();
        }
    };
    DragProxy.prototype.removeDragger = function (dragger) {
        if (!this._draggers.has(dragger))
            return;
        this._draggers.delete(dragger);
        this._emitter.off(DRAGGER_EVENTS.move, dragger.onMove);
        this._emitter.off(DRAGGER_EVENTS.cancel, dragger.onCancel);
        this._emitter.off(DRAGGER_EVENTS.end, dragger.onEnd);
        if (this._draggers.size === 0) {
            this._deactivate();
        }
    };
    DragProxy.prototype.destroy = function () {
        if (this._draggers.size)
            this._deactivate();
        this._draggers.clear();
        this._emitter.destroy();
    };
    DragProxy.prototype._activate = function () {
        window.addEventListener(SOURCE_EVENTS.move, this._onMove, this._listenerOptions);
        window.addEventListener(SOURCE_EVENTS.end, this._onEnd, this._listenerOptions);
        if (SOURCE_EVENTS.cancel) {
            window.addEventListener(SOURCE_EVENTS.cancel, this._onCancel, this._listenerOptions);
        }
    };
    DragProxy.prototype._deactivate = function () {
        window.removeEventListener(SOURCE_EVENTS.move, this._onMove, this._listenerOptions);
        window.removeEventListener(SOURCE_EVENTS.end, this._onEnd, this._listenerOptions);
        if (SOURCE_EVENTS.cancel) {
            window.removeEventListener(SOURCE_EVENTS.cancel, this._onCancel, this._listenerOptions);
        }
    };
    DragProxy.prototype._onMove = function (e) {
        this._emitter.emit(DRAGGER_EVENTS.move, e);
    };
    DragProxy.prototype._onCancel = function (e) {
        this._emitter.emit(DRAGGER_EVENTS.cancel, e);
    };
    DragProxy.prototype._onEnd = function (e) {
        this._emitter.emit(DRAGGER_EVENTS.end, e);
    };
    return DragProxy;
}());
var dragProxies = [new DragProxy(0), new DragProxy(1)];
if (HAS_PASSIVE_EVENTS)
    dragProxies.push(new DragProxy(2), new DragProxy(3));
var Dragger = (function () {
    function Dragger(element, cssProps, listenerOptions) {
        if (listenerOptions === void 0) { listenerOptions = {}; }
        var _a = listenerOptions.capture, capture = _a === void 0 ? true : _a, _b = listenerOptions.passive, passive = _b === void 0 ? true : _b;
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
        this._edgeHack = HAS_POINTER_EVENTS && (IS_EDGE || IS_IE) ? new EdgeHack(this) : null;
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
    Dragger.prototype.getTrackedTouch = function (e) {
        if (this._pointerId === null)
            return null;
        return getTouchById(e, this._pointerId);
    };
    Dragger.prototype.onStart = function (e) {
        if (!this.element)
            return;
        if (this._pointerId !== null)
            return;
        this._pointerId = getEventPointerId(e);
        if (this._pointerId === null)
            return;
        var touch = this.getTrackedTouch(e);
        if (!touch)
            return;
        this._startX = this._currentX = touch.clientX;
        this._startY = this._currentY = touch.clientY;
        this._startTime = Date.now();
        this._isActive = true;
        this._emit(DRAGGER_EVENTS.start, e);
        if (this._isActive) {
            var proxy = dragProxies[this._listenerType];
            if (proxy)
                proxy.addDragger(this);
        }
    };
    Dragger.prototype.onMove = function (e) {
        var touch = this.getTrackedTouch(e);
        if (!touch)
            return;
        this._currentX = touch.clientX;
        this._currentY = touch.clientY;
        this._emit(DRAGGER_EVENTS.move, e);
    };
    Dragger.prototype.onCancel = function (e) {
        if (!this.getTrackedTouch(e))
            return;
        this._emit(DRAGGER_EVENTS.cancel, e);
        this.reset();
    };
    Dragger.prototype.onEnd = function (e) {
        if (!this.getTrackedTouch(e))
            return;
        this._emit(DRAGGER_EVENTS.end, e);
        this.reset();
    };
    Dragger.prototype.isActive = function () {
        return this._isActive;
    };
    Dragger.prototype.setTouchAction = function (value) {
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
    };
    Dragger.prototype.setCssProps = function (newProps) {
        if (!this.element)
            return;
        var currentProps = this._cssProps;
        var element = this.element;
        var currentProp = '';
        for (currentProp in currentProps) {
            element.style[currentProp] = currentProps[currentProp];
            delete currentProps[currentProp];
        }
        var prop;
        for (prop in newProps) {
            var propValue = newProps[prop] || '';
            if (!propValue)
                continue;
            if (prop === TA_PROP) {
                this.setTouchAction(propValue);
                continue;
            }
            var prefixedProp = getPrefixedPropName(element.style, prop);
            if (!prefixedProp)
                continue;
            currentProps[prefixedProp] = '';
            element.style[prefixedProp] = propValue;
        }
    };
    Dragger.prototype.setListenerOptions = function (options) {
        if (!this.element)
            return;
        var _a = options.capture, capture = _a === void 0 ? true : _a, _b = options.passive, passive = _b === void 0 ? true : _b;
        var current = this._listenerType;
        var next = getListenerType(capture, passive);
        if (current !== next) {
            this.element.removeEventListener(SOURCE_EVENTS.start, this.onStart, getListenerOptions(this._listenerType));
            var currentProxy = dragProxies[this._listenerType];
            var isActive = currentProxy ? currentProxy.hasDragger(this) : false;
            if (isActive)
                currentProxy.removeDragger(this);
            this._listenerType = next;
            this.element.addEventListener(SOURCE_EVENTS.start, this.onStart, getListenerOptions(this._listenerType));
            if (isActive) {
                var nextProxy = dragProxies[this._listenerType];
                if (nextProxy)
                    nextProxy.addDragger(this);
            }
        }
    };
    Dragger.prototype.getDeltaX = function () {
        return this._currentX - this._startX;
    };
    Dragger.prototype.getDeltaY = function () {
        return this._currentY - this._startY;
    };
    Dragger.prototype.getDistance = function () {
        var x = this.getDeltaX();
        var y = this.getDeltaY();
        return Math.sqrt(x * x + y * y);
    };
    Dragger.prototype.getDeltaTime = function () {
        return this._startTime ? Date.now() - this._startTime : 0;
    };
    Dragger.prototype.on = function (event, listener) {
        this._emitter.on(event, listener);
    };
    Dragger.prototype.off = function (event, listener) {
        this._emitter.off(event, listener);
    };
    Dragger.prototype.reset = function () {
        this._pointerId = null;
        this._startTime = 0;
        this._startX = 0;
        this._startY = 0;
        this._currentX = 0;
        this._currentY = 0;
        this._isActive = false;
        var proxy = dragProxies[this._listenerType];
        if (proxy)
            proxy.removeDragger(this);
    };
    Dragger.prototype.destroy = function () {
        var element = this.element;
        if (!element)
            return;
        if (this._edgeHack)
            this._edgeHack.destroy();
        this.reset();
        this._emitter.destroy();
        element.removeEventListener(SOURCE_EVENTS.start, this.onStart, getListenerOptions(this._listenerType));
        element.removeEventListener('dragstart', preventDefault, false);
        element.removeEventListener(TOUCH_EVENTS.start, preventDefault, true);
        var prop;
        for (prop in this._cssProps) {
            element.style[prop] = '';
        }
        this._cssProps = {};
        this.element = null;
    };
    Dragger.prototype._createEvent = function (type, e) {
        var touch = this.getTrackedTouch(e);
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
    };
    Dragger.prototype._emit = function (type, e) {
        this._emitter.emit(type, this._createEvent(type, e));
    };
    return Dragger;
}());

function addClass(element, className) {
    className && element.classList.add(className);
}

function arrayInsert(array, items, index) {
    if (index === void 0) { index = -1; }
    if (index < 0)
        index = array.length - index + 1;
    Array.isArray(items) ? array.splice.apply(array, __spreadArrays([index, 0], items)) : array.splice(index, 0, items);
}

function normalizeArrayIndex(array, index, sizeOffset) {
    if (sizeOffset === void 0) { sizeOffset = 0; }
    var maxIndex = Math.max(0, array.length - 1 + sizeOffset);
    return index > maxIndex ? maxIndex : index < 0 ? Math.max(maxIndex + index + 1, 0) : index;
}

function arrayMove(array, fromIndex, toIndex) {
    if (array.length < 2)
        return;
    var from = normalizeArrayIndex(array, fromIndex);
    var to = normalizeArrayIndex(array, toIndex);
    if (from !== to) {
        array.splice(to, 0, array.splice(from, 1)[0]);
    }
}

function arraySwap(array, index, withIndex) {
    if (array.length < 2)
        return;
    var indexA = normalizeArrayIndex(array, index);
    var indexB = normalizeArrayIndex(array, withIndex);
    if (indexA !== indexB) {
        var temp = array[indexA];
        array[indexA] = array[indexB];
        array[indexB] = temp;
    }
}

var transformProp = getPrefixedPropName(document.documentElement.style, 'transform') || 'transform';

var styleNameRegEx = /([A-Z])/g;
var prefixRegex = /^(webkit-|moz-|ms-|o-)/;
var msPrefixRegex = /^(-m-s-)/;
function getStyleName(styleProp) {
    var styleName = styleProp.replace(styleNameRegEx, '-$1').toLowerCase();
    styleName = styleName.replace(prefixRegex, '-$1');
    styleName = styleName.replace(msPrefixRegex, '-ms-');
    return styleName;
}

var transformStyle = getStyleName(transformProp);

var transformNone = 'none';
var displayInline = 'inline';
var displayNone = 'none';
var displayStyle = 'display';
function isTransformed(element) {
    var transform = getStyle(element, transformStyle);
    if (!transform || transform === transformNone)
        return false;
    var display = getStyle(element, displayStyle);
    if (display === displayInline || display === displayNone)
        return false;
    return true;
}

function getContainingBlock(element) {
    var res = element || document;
    while (res &&
        res !== document &&
        getStyle(res, 'position') === 'static' &&
        !isTransformed(res)) {
        res = res.parentElement || document;
    }
    return res;
}

var offsetA = { left: 0, top: 0 };
var offsetB = { left: 0, top: 0 };
var offsetDiff = { left: 0, top: 0 };
function getOffset(element, offset) {
    if (offset === void 0) { offset = { left: 0, top: 0 }; }
    offset.left = 0;
    offset.top = 0;
    if (element === document)
        return offset;
    offset.left = window.pageXOffset || 0;
    offset.top = window.pageYOffset || 0;
    if ('self' in element && element.self === window.self)
        return offset;
    var _a = element.getBoundingClientRect(), left = _a.left, top = _a.top;
    offset.left += left;
    offset.top += top;
    offset.left += getStyleAsFloat(element, 'border-left-width');
    offset.top += getStyleAsFloat(element, 'border-top-width');
    return offset;
}
function getOffsetDiff(elemA, elemB, compareContainingBlocks) {
    if (compareContainingBlocks === void 0) { compareContainingBlocks = false; }
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

var START_PREDICATE_INACTIVE = 0;
var START_PREDICATE_PENDING = 1;
var START_PREDICATE_RESOLVED = 2;
var SCROLL_LISTENER_OPTIONS = HAS_PASSIVE_EVENTS ? { capture: true, passive: true } : true;
var RECT_A = { left: 0, top: 0, width: 0, height: 0 };
var RECT_B = { left: 0, top: 0, width: 0, height: 0 };
var defaultStartPredicate = function (item, event, options) {
    if (event.isFinal)
        return;
    var drag = item._drag;
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
    var predicate = drag._startPredicateData;
    if (!predicate) {
        predicate = drag._startPredicateData = { distance: 0, delay: 0 };
        var dragStartPredicate = item.getGrid().settings.dragStartPredicate;
        var config = options || dragStartPredicate;
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
var getTargetGrid = function (item, threshold) {
    var itemGrid = item.getGrid();
    var dragSort = itemGrid.settings.dragSort;
    var grids = dragSort === true ? [itemGrid] : isFunction(dragSort) ? dragSort(item) : undefined;
    var target = null;
    if (!grids || !Array.isArray(grids) || !grids.length) {
        return target;
    }
    var itemRect = RECT_A;
    var targetRect = RECT_B;
    var bestScore = -1;
    var gridScore = 0;
    var grid;
    var container = null;
    var containerRect;
    var left = 0;
    var top = 0;
    var right = 0;
    var bottom = 0;
    var i = 0;
    var drag = item._drag;
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
var defaultSortPredicate = function (item, options) {
    var drag = item._drag;
    var sortAction = (options && options.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE);
    var migrateAction = (options && options.migrateAction === ACTION_SWAP
        ? ACTION_SWAP
        : ACTION_MOVE);
    var sortThreshold = Math.min(Math.max(options && typeof options.threshold === 'number' ? options.threshold : 50, 1), 100);
    var grid = getTargetGrid(item, sortThreshold);
    if (!grid)
        return null;
    var isMigration = item.getGrid() !== grid;
    var itemRect = RECT_A;
    var targetRect = RECT_B;
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
    var matchScore = 0;
    var matchIndex = -1;
    var hasValidTargets = false;
    for (var i = 0; i < grid.items.length; i++) {
        var target = grid.items[i];
        if (!target.isActive() || target === item) {
            continue;
        }
        hasValidTargets = true;
        targetRect.width = target.width;
        targetRect.height = target.height;
        targetRect.left = target.left + target.marginLeft;
        targetRect.top = target.top + target.marginTop;
        var score = getIntersectionScore(itemRect, targetRect);
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
var ItemDrag = (function () {
    function ItemDrag(item) {
        var element = item.element;
        var grid = item.getGrid();
        var settings = grid.settings;
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
    ItemDrag.prototype.isActive = function () {
        return this._isActive;
    };
    ItemDrag.prototype.getOriginGrid = function () {
        return GRID_INSTANCES.get(this._originGridId) || null;
    };
    ItemDrag.prototype.stop = function () {
        if (!this.item || !this.isActive())
            return;
        if (this._isMigrated) {
            this._finishMigration();
            return;
        }
        var item = this.item;
        ItemDrag.autoScroll.removeItem(item);
        cancelDragStartTick(item.id);
        cancelDragMoveTick(item.id);
        cancelDragScrollTick(item.id);
        this._cancelSort();
        if (this._isStarted) {
            var element = item.element;
            var grid = item.getGrid();
            var itemDraggingClass = grid.settings.itemDraggingClass;
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
    };
    ItemDrag.prototype.sort = function (force) {
        if (force === void 0) { force = false; }
        if (this.item && this.isActive() && this.item.isActive() && this._dragMoveEvent) {
            if (force) {
                this._handleSort();
            }
            else {
                addDragSortTick(this.item.id, this._handleSort);
            }
        }
    };
    ItemDrag.prototype.destroy = function () {
        if (!this.item)
            return;
        this._isMigrated = false;
        this.stop();
        this.dragger.destroy();
        this.item = null;
    };
    ItemDrag.prototype._startPredicate = function (item, event) {
        var dragStartPredicate = item.getGrid().settings.dragStartPredicate;
        return isFunction(dragStartPredicate)
            ? dragStartPredicate(item, event)
            : ItemDrag.defaultStartPredicate(item, event);
    };
    ItemDrag.prototype._reset = function () {
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
    };
    ItemDrag.prototype._bindScrollHandler = function () {
        window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    };
    ItemDrag.prototype._unbindScrollHandler = function () {
        window.removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    };
    ItemDrag.prototype._resetHeuristics = function (x, y) {
        this._blockedSortIndex = null;
        this._sortX1 = this._sortX2 = x;
        this._sortY1 = this._sortY2 = y;
    };
    ItemDrag.prototype._checkHeuristics = function (x, y) {
        if (!this.item)
            return false;
        var settings = this.item.getGrid().settings;
        var _a = settings.dragSortHeuristics, minDragDistance = _a.minDragDistance, minBounceBackAngle = _a.minBounceBackAngle;
        if (minDragDistance <= 0) {
            this._blockedSortIndex = null;
            return true;
        }
        var diffX = x - this._sortX2;
        var diffY = y - this._sortY2;
        var canCheckBounceBack = minDragDistance > 3 && minBounceBackAngle > 0;
        if (!canCheckBounceBack) {
            this._blockedSortIndex = null;
        }
        if (Math.abs(diffX) > minDragDistance || Math.abs(diffY) > minDragDistance) {
            if (canCheckBounceBack) {
                var angle = Math.atan2(diffX, diffY);
                var prevAngle = Math.atan2(this._sortX2 - this._sortX1, this._sortY2 - this._sortY1);
                var deltaAngle = Math.atan2(Math.sin(angle - prevAngle), Math.cos(angle - prevAngle));
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
    };
    ItemDrag.prototype._resetDefaultStartPredicate = function () {
        var predicate = this._startPredicateData;
        if (predicate) {
            if (predicate.delayTimer) {
                predicate.delayTimer = void window.clearTimeout(predicate.delayTimer);
            }
            this._startPredicateData = null;
        }
    };
    ItemDrag.prototype._handleSort = function () {
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        var _a = item.getGrid().settings, dragSort = _a.dragSort, dragSortHeuristics = _a.dragSortHeuristics, dragAutoScroll = _a.dragAutoScroll;
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
        var shouldSort = this._checkHeuristics(this._translateX - item._containerDiffX, this._translateY - item._containerDiffY);
        if (!this._isSortNeeded && !shouldSort)
            return;
        var sortInterval = dragSortHeuristics.sortInterval;
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
    };
    ItemDrag.prototype._handleSortDelayed = function () {
        if (!this.item)
            return;
        this._isSortNeeded = true;
        this._sortTimer = undefined;
        addDragSortTick(this.item.id, this._handleSort);
    };
    ItemDrag.prototype._cancelSort = function () {
        if (!this.item)
            return;
        this._isSortNeeded = false;
        if (this._sortTimer !== undefined) {
            this._sortTimer = void window.clearTimeout(this._sortTimer);
        }
        cancelDragSortTick(this.item.id);
    };
    ItemDrag.prototype._finishSort = function () {
        if (!this.item)
            return;
        var dragSort = this.item.getGrid().settings.dragSort;
        var needsFinalCheck = dragSort && (this._isSortNeeded || this._sortTimer !== undefined);
        this._cancelSort();
        if (needsFinalCheck)
            this._checkOverlap();
        if (dragSort)
            this._checkOverlap(true);
    };
    ItemDrag.prototype._checkOverlap = function (isDrop) {
        if (isDrop === void 0) { isDrop = false; }
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        var element = item.element;
        var currentGrid = item.getGrid();
        var settings = currentGrid.settings;
        var result = null;
        if (isFunction(settings.dragSortPredicate)) {
            result = settings.dragSortPredicate(item, (isDrop ? this._dragEndEvent : this._dragMoveEvent));
        }
        else if (!isDrop) {
            result = ItemDrag.defaultSortPredicate(item, settings.dragSortPredicate);
        }
        if (!result || typeof result.index !== 'number')
            return;
        var sortAction = result.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
        var targetGrid = result.grid || currentGrid;
        var isMigration = currentGrid !== targetGrid;
        var currentIndex = currentGrid.items.indexOf(item);
        var targetIndex = normalizeArrayIndex(targetGrid.items, result.index, isMigration && sortAction === ACTION_MOVE ? 1 : 0);
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
            var targetItem = targetGrid.items[targetIndex];
            var targetSettings = targetGrid.settings;
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
            var currentDragContainer = this._container;
            var targetDragContainer = targetSettings.dragContainer || targetGrid.element;
            var offsetDiff = getOffsetDiff(targetDragContainer, targetGrid.element, true);
            item._containerDiffX = this._containerDiffX = offsetDiff.left;
            item._containerDiffY = this._containerDiffY = offsetDiff.top;
            if (targetDragContainer !== currentDragContainer) {
                offsetDiff = getOffsetDiff(currentDragContainer, targetDragContainer, true);
                this._containingBlock = getContainingBlock(targetDragContainer);
                this._container = targetDragContainer;
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
    };
    ItemDrag.prototype._finishMigration = function () {
        if (!this.item)
            return;
        var item = this.item;
        var dragEnabled = item.getGrid().settings.dragEnabled;
        this.destroy();
        item._drag = dragEnabled ? new ItemDrag(item) : null;
        item._dragRelease.start();
    };
    ItemDrag.prototype._preStartCheck = function (event) {
        if (this._startPredicateState === START_PREDICATE_INACTIVE) {
            this._startPredicateState = START_PREDICATE_PENDING;
        }
        if (this._startPredicateState === START_PREDICATE_PENDING) {
            var shouldStart = this._startPredicate(this.item, event);
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
    };
    ItemDrag.prototype._preEndCheck = function (event) {
        var isResolved = this._startPredicateState === START_PREDICATE_RESOLVED;
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
    };
    ItemDrag.prototype._onStart = function (event) {
        if (!this.item || !this.item.isActive())
            return;
        this._isActive = true;
        this._dragStartEvent = event;
        ItemDrag.autoScroll.addItem(this.item, this._translateX, this._translateY);
        addDragStartTick(this.item.id, this._prepareStart, this._applyStart);
    };
    ItemDrag.prototype._prepareStart = function () {
        if (!this.item || !this.isActive() || !this.item.isActive())
            return;
        var item = this.item;
        var element = item.element;
        var grid = item.getGrid();
        var dragContainer = grid.settings.dragContainer || grid.element;
        var containingBlock = getContainingBlock(dragContainer);
        var translate = item._getTranslate();
        var elementRect = element.getBoundingClientRect();
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
            var _a = getOffsetDiff(containingBlock, grid.element), left = _a.left, top_1 = _a.top;
            this._containerDiffX = left;
            this._containerDiffY = top_1;
        }
        this._resetHeuristics(this._translateX - item._containerDiffX, this._translateY - item._containerDiffY);
    };
    ItemDrag.prototype._applyStart = function () {
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        if (!item.isActive())
            return;
        if (item.isPositioning()) {
            item._layout.stop(true, this._translateX, this._translateY);
        }
        var migrate = item._migrate;
        if (migrate.isActive()) {
            this._translateX -= item._containerDiffX;
            this._translateY -= item._containerDiffY;
            migrate.stop(true, this._translateX, this._translateY);
        }
        var release = item._dragRelease;
        if (item.isReleasing())
            release.reset();
        var grid = item.getGrid();
        var element = item.element;
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
    };
    ItemDrag.prototype._onMove = function (event) {
        if (!this.item)
            return;
        if (!this.item.isActive()) {
            this.stop();
            return;
        }
        var itemId = this.item.id;
        this._dragMoveEvent = event;
        addDragMoveTick(itemId, this._prepareMove, this._applyMove);
        addDragSortTick(itemId, this._handleSort);
    };
    ItemDrag.prototype._prepareMove = function () {
        if (!this.item || !this.isActive() || !this.item.isActive())
            return;
        var dragAxis = this.item.getGrid().settings.dragAxis;
        var nextEvent = this._dragMoveEvent;
        var prevEvent = (this._dragPrevMoveEvent || this._dragStartEvent || nextEvent);
        if (dragAxis !== 'y') {
            var moveDiffX = nextEvent.clientX - prevEvent.clientX;
            this._translateX = this._translateX - this._moveDiffX + moveDiffX;
            this._clientX = this._clientX - this._moveDiffX + moveDiffX;
            this._moveDiffX = moveDiffX;
        }
        if (dragAxis !== 'x') {
            var moveDiffY = nextEvent.clientY - prevEvent.clientY;
            this._translateY = this._translateY - this._moveDiffY + moveDiffY;
            this._clientY = this._clientY - this._moveDiffY + moveDiffY;
            this._moveDiffY = moveDiffY;
        }
        this._dragPrevMoveEvent = nextEvent;
    };
    ItemDrag.prototype._applyMove = function () {
        if (!this.item || !this.isActive() || !this.item.isActive())
            return;
        var item = this.item;
        var grid = item.getGrid();
        this._moveDiffX = this._moveDiffY = 0;
        item._setTranslate(this._translateX, this._translateY);
        if (this._dragMoveEvent) {
            grid._emit(EVENT_DRAG_MOVE, item, this._dragMoveEvent);
        }
        ItemDrag.autoScroll.updateItem(item, this._translateX, this._translateY);
    };
    ItemDrag.prototype._onScroll = function (event) {
        if (!this.item)
            return;
        if (!this.item.isActive()) {
            this.stop();
            return;
        }
        var itemId = this.item.id;
        this._scrollEvent = event;
        addDragScrollTick(itemId, this._prepareScroll, this._applyScroll);
        addDragSortTick(itemId, this._handleSort);
    };
    ItemDrag.prototype._prepareScroll = function () {
        if (!this.item || !this.isActive() || !this.item.isActive())
            return;
        var item = this.item;
        var grid = item.getGrid();
        if (this._container !== grid.element) {
            var _a = getOffsetDiff(this._containingBlock, grid.element), left_1 = _a.left, top_2 = _a.top;
            item._containerDiffX = this._containerDiffX = left_1;
            item._containerDiffY = this._containerDiffY = top_2;
        }
        var dragAxis = grid.settings.dragAxis;
        var _b = item.element.getBoundingClientRect(), left = _b.left, top = _b.top;
        if (dragAxis !== 'y') {
            var scrollDiffX = this._clientX - this._moveDiffX - this._scrollDiffX - left;
            this._translateX = this._translateX - this._scrollDiffX + scrollDiffX;
            this._scrollDiffX = scrollDiffX;
        }
        if (dragAxis !== 'x') {
            var scrollDiffY = this._clientY - this._moveDiffY - this._scrollDiffY - top;
            this._translateY = this._translateY - this._scrollDiffY + scrollDiffY;
            this._scrollDiffY = scrollDiffY;
        }
    };
    ItemDrag.prototype._applyScroll = function () {
        if (!this.item || !this.isActive() || !this.item.isActive())
            return;
        var item = this.item;
        var grid = item.getGrid();
        this._scrollDiffX = this._scrollDiffY = 0;
        item._setTranslate(this._translateX, this._translateY);
        if (this._scrollEvent) {
            grid._emit(EVENT_DRAG_SCROLL, item, this._scrollEvent);
        }
    };
    ItemDrag.prototype._onEnd = function (event) {
        if (!this.item)
            return;
        var item = this.item;
        if (!item.isActive()) {
            this.stop();
            return;
        }
        var grid = item.getGrid();
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
    };
    ItemDrag.autoScroll = new ItemDragAutoScroll();
    ItemDrag.defaultStartPredicate = defaultStartPredicate;
    ItemDrag.defaultSortPredicate = defaultSortPredicate;
    return ItemDrag;
}());

var unprefixRegEx = /^(webkit|moz|ms|o|Webkit|Moz|MS|O)(?=[A-Z])/;
var cache$2 = new Map();
function getUnprefixedPropName(prop) {
    var result = cache$2.get(prop);
    if (result)
        return result;
    result = prop.replace(unprefixRegEx, '');
    if (result !== prop) {
        result = result[0].toLowerCase() + result.slice(1);
    }
    cache$2.set(prop, result);
    return result;
}

var nativeCode = '[native code]';
function isNative(feat) {
    return !!(feat &&
        isFunction(window.Symbol) &&
        isFunction(window.Symbol.toString) &&
        window.Symbol(feat).toString().indexOf(nativeCode) > -1);
}

function setStyles(element, styles) {
    var prop;
    for (prop in styles) {
        element.style[prop] = styles[prop] || '';
    }
}

var HAS_WEB_ANIMATIONS = isFunction(Element.prototype.animate);
var HAS_NATIVE_WEB_ANIMATIONS = isNative(Element.prototype.animate);
function createKeyframe(props, prefix) {
    var keyframe = {};
    var prop;
    for (prop in props) {
        keyframe[prefix ? prop : getUnprefixedPropName(prop)] = props[prop];
    }
    return keyframe;
}
var Animator = (function () {
    function Animator(element) {
        this.element = element || null;
        this.animation = null;
        this._finishCallback = null;
        this._onFinish = this._onFinish.bind(this);
    }
    Animator.prototype.start = function (propsFrom, propsTo, options) {
        if (!this.element)
            return;
        var element = this.element;
        var _a = options || {}, duration = _a.duration, easing = _a.easing, onFinish = _a.onFinish;
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
    };
    Animator.prototype.stop = function () {
        if (!this.element || !this.animation)
            return;
        this.animation.cancel();
        this.animation = this._finishCallback = null;
    };
    Animator.prototype.isAnimating = function () {
        return !!this.animation;
    };
    Animator.prototype.destroy = function () {
        if (!this.element)
            return;
        this.stop();
        this.element = null;
    };
    Animator.prototype._onFinish = function () {
        var _finishCallback = this._finishCallback;
        this.animation = this._finishCallback = null;
        _finishCallback && _finishCallback();
    };
    return Animator;
}());

function getTranslateString(x, y) {
    return 'translateX(' + x + 'px) translateY(' + y + 'px)';
}

var translateValue = { x: 0, y: 0 };
var transformNone$1 = 'none';
var rxMat3d = /^matrix3d/;
var rxMatTx = /([^,]*,){4}/;
var rxMat3dTx = /([^,]*,){12}/;
var rxNextItem = /[^,]*,/;
function getTranslate(element) {
    translateValue.x = 0;
    translateValue.y = 0;
    var transform = getStyle(element, transformStyle);
    if (!transform || transform === transformNone$1) {
        return translateValue;
    }
    var isMat3d = rxMat3d.test(transform);
    var tX = transform.replace(isMat3d ? rxMat3dTx : rxMatTx, '');
    var tY = tX.replace(rxNextItem, '');
    translateValue.x = parseFloat(tX) || 0;
    translateValue.y = parseFloat(tY) || 0;
    return translateValue;
}

var CURRENT_STYLES = {};
var TARGET_STYLES = {};
var ItemDragPlaceholder = (function () {
    function ItemDragPlaceholder(item) {
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
    ItemDragPlaceholder.prototype.create = function () {
        if (!this.item)
            return;
        if (this.element) {
            this._resetAfterLayout = false;
            return;
        }
        var item = this.item;
        var grid = item.getGrid();
        var settings = grid.settings;
        this.left = item.left;
        this.top = item.top;
        var element;
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
        element.style[transformProp] = getTranslateString(item.left + item.marginLeft, item.top + item.marginTop);
        grid.on(EVENT_LAYOUT_START, this._onLayoutStart);
        grid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
        grid.on(EVENT_BEFORE_SEND, this._onMigrate);
        grid.on(EVENT_HIDE_START, this._onHide);
        if (isFunction(settings.dragPlaceholder.onCreate)) {
            settings.dragPlaceholder.onCreate(item, element);
        }
        grid.element.appendChild(element);
    };
    ItemDragPlaceholder.prototype.reset = function () {
        var _a;
        if (!this.item || !this.element)
            return;
        var _b = this, item = _b.item, element = _b.element, animator = _b.animator;
        var grid = item.getGrid();
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
        var onRemove = grid.settings.dragPlaceholder.onRemove;
        if (isFunction(onRemove))
            onRemove(item, element);
    };
    ItemDragPlaceholder.prototype.isActive = function () {
        return !!this.element;
    };
    ItemDragPlaceholder.prototype.updateDimensions = function () {
        if (!this.item || !this.isActive())
            return;
        addPlaceholderResizeTick(this.item.id, this._updateDimensions);
    };
    ItemDragPlaceholder.prototype.updateClassName = function (className) {
        if (!this.element)
            return;
        removeClass(this.element, this._className);
        this._className = className;
        addClass(this.element, className);
    };
    ItemDragPlaceholder.prototype.destroy = function () {
        this.reset();
        this.animator && this.animator.destroy();
        this.item = null;
    };
    ItemDragPlaceholder.prototype._updateDimensions = function () {
        if (!this.item || !this.element)
            return;
        setStyles(this.element, {
            width: this.item.width + 'px',
            height: this.item.height + 'px',
        });
    };
    ItemDragPlaceholder.prototype._onLayoutStart = function (items, isInstant) {
        if (!this.item || !this.element)
            return;
        var item = this.item;
        if (items.indexOf(item) === -1) {
            this.reset();
            return;
        }
        var nextLeft = item.left;
        var nextTop = item.top;
        var currentLeft = this.left;
        var currentTop = this.top;
        this.left = nextLeft;
        this.top = nextTop;
        if (!isInstant && !this._didMigrate && currentLeft === nextLeft && currentTop === nextTop) {
            return;
        }
        var nextX = nextLeft + item.marginLeft;
        var nextY = nextTop + item.marginTop;
        var grid = item.getGrid();
        var animEnabled = !isInstant && grid.settings.layoutDuration > 0;
        if (!animEnabled || this._didMigrate) {
            cancelPlaceholderLayoutTick(item.id);
            this.element.style[transformProp] = getTranslateString(nextX, nextY);
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
    };
    ItemDragPlaceholder.prototype._setupAnimation = function () {
        if (!this.element)
            return;
        var _a = getTranslate(this.element), x = _a.x, y = _a.y;
        this._transX = x;
        this._transY = y;
    };
    ItemDragPlaceholder.prototype._startAnimation = function () {
        if (!this.item || !this.element)
            return;
        var animator = this.animator;
        var currentX = this._transX;
        var currentY = this._transY;
        var nextX = this._nextTransX;
        var nextY = this._nextTransY;
        if (currentX === nextX && currentY === nextY) {
            if (animator.isAnimating()) {
                this.element.style[transformProp] = getTranslateString(nextX, nextY);
                animator.stop();
            }
            return;
        }
        var _a = this.item.getGrid().settings, layoutDuration = _a.layoutDuration, layoutEasing = _a.layoutEasing;
        CURRENT_STYLES[transformProp] = getTranslateString(currentX, currentY);
        TARGET_STYLES[transformProp] = getTranslateString(nextX, nextY);
        animator.start(CURRENT_STYLES, TARGET_STYLES, {
            duration: layoutDuration,
            easing: layoutEasing,
            onFinish: this._onLayoutEnd,
        });
    };
    ItemDragPlaceholder.prototype._onLayoutEnd = function () {
        if (this._resetAfterLayout) {
            this.reset();
        }
    };
    ItemDragPlaceholder.prototype._onReleaseEnd = function (item) {
        if (this.item && this.item.id === item.id) {
            if (!this.animator.isAnimating()) {
                this.reset();
                return;
            }
            this._resetAfterLayout = true;
        }
    };
    ItemDragPlaceholder.prototype._onMigrate = function (data) {
        if (!this.item || this.item !== data.item)
            return;
        var grid = this.item.getGrid();
        grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
        grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
        grid.off(EVENT_BEFORE_SEND, this._onMigrate);
        grid.off(EVENT_HIDE_START, this._onHide);
        var nextGrid = data.toGrid;
        nextGrid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
        nextGrid.on(EVENT_LAYOUT_START, this._onLayoutStart);
        nextGrid.on(EVENT_BEFORE_SEND, this._onMigrate);
        nextGrid.on(EVENT_HIDE_START, this._onHide);
        this._didMigrate = true;
    };
    ItemDragPlaceholder.prototype._onHide = function (items) {
        if (this.item && items.indexOf(this.item) > -1)
            this.reset();
    };
    return ItemDragPlaceholder;
}());

var SCROLL_LISTENER_OPTIONS$1 = HAS_PASSIVE_EVENTS ? { capture: true, passive: true } : true;
var ItemDragRelease = (function () {
    function ItemDragRelease(item) {
        this.item = item;
        this._isActive = false;
        this._isPositioning = false;
        this._onScroll = this._onScroll.bind(this);
    }
    ItemDragRelease.prototype.isActive = function () {
        return this._isActive;
    };
    ItemDragRelease.prototype.isPositioning = function () {
        return this._isPositioning;
    };
    ItemDragRelease.prototype.start = function () {
        if (!this.item || this.isActive())
            return;
        var item = this.item;
        var grid = item.getGrid();
        var settings = grid.settings;
        this._isActive = true;
        addClass(item.element, settings.itemReleasingClass);
        if (!settings.dragRelease.useDragContainer) {
            this._placeToGrid();
        }
        else if (item.element.parentNode !== grid.element) {
            window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS$1);
        }
        grid._emit(EVENT_DRAG_RELEASE_START, item);
        if (!grid._nextLayoutData)
            item._layout.start(false);
    };
    ItemDragRelease.prototype.stop = function (abort, left, top) {
        if (abort === void 0) { abort = false; }
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        if (!abort && (left === undefined || top === undefined)) {
            left = item.left;
            top = item.top;
        }
        var didReparent = this._placeToGrid(left, top);
        this.reset(didReparent);
        if (!abort) {
            item.getGrid()._emit(EVENT_DRAG_RELEASE_END, item);
        }
    };
    ItemDragRelease.prototype.reset = function (needsReflow) {
        if (needsReflow === void 0) { needsReflow = false; }
        if (!this.item)
            return;
        var item = this.item;
        var itemReleasingClass = item.getGrid().settings.itemReleasingClass;
        this._isActive = false;
        this._isPositioning = false;
        cancelReleaseScrollTick(item.id);
        window.removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS$1);
        if (itemReleasingClass) {
            if (needsReflow)
                item.element.clientWidth;
            removeClass(item.element, itemReleasingClass);
        }
    };
    ItemDragRelease.prototype.destroy = function () {
        if (!this.item)
            return;
        this.stop(true);
        this.item = null;
    };
    ItemDragRelease.prototype._placeToGrid = function (left, top) {
        if (!this.item)
            return false;
        var item = this.item;
        var gridElement = item.getGrid().element;
        if (item.element.parentNode !== gridElement) {
            if (left === undefined || top === undefined) {
                var _a = item._getTranslate(), x = _a.x, y = _a.y;
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
    };
    ItemDragRelease.prototype._onScroll = function () {
        var _this = this;
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        var diffX = 0;
        var diffY = 0;
        addReleaseScrollTick(item.id, function () {
            if (!_this.isActive())
                return;
            var itemContainer = item.element.parentNode;
            if (itemContainer) {
                var gridElement = item.getGrid().element;
                var _a = getOffsetDiff(itemContainer, gridElement, true), left = _a.left, top_1 = _a.top;
                diffX = left;
                diffY = top_1;
            }
        }, function () {
            if (!_this.isActive())
                return;
            if (Math.abs(diffX - item._containerDiffX) > 0.1 ||
                Math.abs(diffY - item._containerDiffY) > 0.1) {
                item._containerDiffX = diffX;
                item._containerDiffY = diffY;
                item._dragPlaceholder.reset();
                item._layout.stop(true, item.left, item.top);
                _this.stop(false, item.left, item.top);
            }
        });
    };
    return ItemDragRelease;
}());

var MIN_ANIMATION_DISTANCE = 2;
var CURRENT_STYLES$1 = {};
var TARGET_STYLES$1 = {};
var ANIM_OPTIONS = {
    duration: 0,
    easing: '',
    onFinish: undefined,
};
var ItemLayout = (function () {
    function ItemLayout(item) {
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
        var style = item.element.style;
        style.left = '0px';
        style.top = '0px';
        this.item._setTranslate(0, 0);
    }
    ItemLayout.prototype.isActive = function () {
        return this._isActive;
    };
    ItemLayout.prototype.start = function (instant, onFinish) {
        if (!this.item)
            return;
        var _a = this, item = _a.item, animator = _a.animator;
        var grid = item.getGrid();
        var release = item._dragRelease;
        var settings = grid.settings;
        var isPositioning = this.isActive();
        var isJustReleased = release.isActive() && !release.isPositioning();
        var animDuration = isJustReleased ? settings.dragRelease.duration : settings.layoutDuration;
        var animEasing = isJustReleased ? settings.dragRelease.easing : settings.layoutEasing;
        var animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;
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
    };
    ItemLayout.prototype.stop = function (processCallbackQueue, left, top) {
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        cancelLayoutTick(item.id);
        if (this.animator.isAnimating()) {
            if (left === undefined || top === undefined) {
                var _a = getTranslate(item.element), x = _a.x, y = _a.y;
                item._setTranslate(x, y);
            }
            else {
                item._setTranslate(left, top);
            }
            this.animator.stop();
        }
        var itemPositioningClass = item.getGrid().settings.itemPositioningClass;
        removeClass(item.element, itemPositioningClass);
        this._isActive = false;
        if (processCallbackQueue) {
            item._emitter.burst(this._queue, true, item);
        }
    };
    ItemLayout.prototype.destroy = function () {
        if (!this.item)
            return;
        this.stop(true, 0, 0);
        this.item._emitter.clear(this._queue);
        this.animator.destroy();
        var style = this.item.element.style;
        style[transformProp] = '';
        style.left = '';
        style.top = '';
        this.item = null;
    };
    ItemLayout.prototype._finish = function () {
        if (!this.item)
            return;
        var item = this.item;
        item._translateX = item.left + item._containerDiffX;
        item._translateY = item.top + item._containerDiffY;
        if (this.isActive()) {
            this._isActive = false;
            var itemPositioningClass = item.getGrid().settings.itemPositioningClass;
            removeClass(item.element, itemPositioningClass);
        }
        if (item._dragRelease.isActive())
            item._dragRelease.stop();
        if (item._migrate.isActive())
            item._migrate.stop();
        item._emitter.burst(this._queue, false, item);
    };
    ItemLayout.prototype._setupAnimation = function () {
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        var _a = item._getTranslate(), x = _a.x, y = _a.y;
        this._tX = x;
        this._tY = y;
        var grid = item.getGrid();
        if (grid.settings._animationWindowing && grid._itemLayoutNeedsDimensionRefresh) {
            grid._itemLayoutNeedsDimensionRefresh = false;
            grid._updateBoundingRect();
            grid._updateBorders(true, false, true, false);
        }
    };
    ItemLayout.prototype._startAnimation = function () {
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        var settings = item.getGrid().settings;
        var isInstant = this._duration <= 0;
        var nextLeft = item.left + item._containerDiffX;
        var nextTop = item.top + item._containerDiffY;
        var xDiff = Math.abs(item.left - (this._tX - item._containerDiffX));
        var yDiff = Math.abs(item.top - (this._tY - item._containerDiffY));
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
        CURRENT_STYLES$1[transformProp] = getTranslateString(this._tX, this._tY);
        TARGET_STYLES$1[transformProp] = getTranslateString(nextLeft, nextTop);
        ANIM_OPTIONS.duration = this._duration;
        ANIM_OPTIONS.easing = this._easing;
        ANIM_OPTIONS.onFinish = this._finish;
        item._translateX = item._translateY = undefined;
        this.animator.start(CURRENT_STYLES$1, TARGET_STYLES$1, ANIM_OPTIONS);
        ANIM_OPTIONS.onFinish = undefined;
    };
    return ItemLayout;
}());

var ItemMigrate = (function () {
    function ItemMigrate(item) {
        this.item = item;
        this.container = null;
        this._isActive = false;
    }
    ItemMigrate.prototype.isActive = function () {
        return this._isActive;
    };
    ItemMigrate.prototype.start = function (targetGrid, position, container) {
        if (!this.item)
            return;
        var item = this.item;
        var grid = item.getGrid();
        var element = item.element;
        var isActive = item.isActive();
        var isVisible = item.isVisible();
        var settings = grid.settings;
        var currentIndex = grid.items.indexOf(item);
        var targetElement = targetGrid.element;
        var targetSettings = targetGrid.settings;
        var targetItems = targetGrid.items;
        var targetContainer = container || document.body;
        var targetIndex = 0;
        if (typeof position === 'number') {
            targetIndex = normalizeArrayIndex(targetItems, position, 1);
        }
        else {
            var targetItem = targetGrid.getItem(position);
            if (!targetItem)
                return;
            targetIndex = targetItems.indexOf(targetItem);
        }
        if (item._drag)
            item._drag.stop();
        if (this.isActive() || item.isPositioning() || item.isReleasing()) {
            var _a = item._getTranslate(), x = _a.x, y = _a.y;
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
        var currentVisClass = isVisible ? settings.itemVisibleClass : settings.itemHiddenClass;
        var nextVisClass = isVisible
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
            var currentContainer = element.parentNode;
            if (targetContainer !== currentContainer) {
                targetContainer.appendChild(element);
                var offsetDiff = getOffsetDiff(targetContainer, currentContainer, true);
                var t = item._getTranslate();
                item._setTranslate(t.x + offsetDiff.left, t.y + offsetDiff.top);
            }
        }
        else {
            targetElement.appendChild(element);
        }
        item._visibility.setStyles(isVisible ? targetSettings.visibleStyles : targetSettings.hiddenStyles);
        if (isActive) {
            var _b = getOffsetDiff(targetContainer, targetElement, true), left = _b.left, top_1 = _b.top;
            item._containerDiffX = left;
            item._containerDiffY = top_1;
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
    };
    ItemMigrate.prototype.stop = function (abort, left, top) {
        if (abort === void 0) { abort = false; }
        if (!this.item || !this.isActive())
            return;
        var item = this.item;
        var grid = item.getGrid();
        if (this.container !== grid.element) {
            if (left === undefined || top === undefined) {
                if (abort) {
                    var t = item._getTranslate();
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
    };
    ItemMigrate.prototype.destroy = function () {
        if (!this.item)
            return;
        this.stop(true);
        this.item = null;
    };
    return ItemMigrate;
}());

function getCurrentStyles(element, styles) {
    var result = {};
    var prop;
    if (Array.isArray(styles)) {
        var i = 0;
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

var ItemVisibility = (function () {
    function ItemVisibility(item) {
        var element = item.element.children[0];
        if (!element) {
            throw new Error('No valid child element found within item element.');
        }
        var isActive = item.isActive();
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
        var settings = item.getGrid().settings;
        addClass(item.element, isActive ? settings.itemVisibleClass : settings.itemHiddenClass);
        this.setStyles(isActive ? settings.visibleStyles : settings.hiddenStyles);
    }
    ItemVisibility.prototype.isHidden = function () {
        return this._isHidden;
    };
    ItemVisibility.prototype.isHiding = function () {
        return this._isHiding;
    };
    ItemVisibility.prototype.isShowing = function () {
        return this._isShowing;
    };
    ItemVisibility.prototype.show = function (instant, onFinish) {
        if (!this.item)
            return;
        var item = this.item;
        var callback = isFunction(onFinish) ? onFinish : null;
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
            var settings = item.getGrid().settings;
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
    };
    ItemVisibility.prototype.hide = function (instant, onFinish) {
        if (!this.item)
            return;
        var item = this.item;
        var callback = isFunction(onFinish) ? onFinish : null;
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
            var settings = item.getGrid().settings;
            addClass(item.element, settings.itemHiddenClass);
            removeClass(item.element, settings.itemVisibleClass);
        }
        callback && item._emitter.on(this._queue, callback);
        this._isHidden = this._isHiding = true;
        this._isShowing = false;
        this._startAnimation(false, instant, this._finishHide);
    };
    ItemVisibility.prototype.stop = function (processCallbackQueue) {
        if (!this.item || (!this._isHiding && !this._isShowing))
            return;
        var item = this.item;
        cancelVisibilityTick(item.id);
        this.animator.stop();
        if (processCallbackQueue) {
            item._emitter.burst(this._queue, true, item);
        }
    };
    ItemVisibility.prototype.setStyles = function (styles) {
        if (!this.element)
            return;
        var _a = this, element = _a.element, _currentStyleProps = _a._currentStyleProps;
        this._removeCurrentStyles();
        var prop;
        for (prop in styles) {
            _currentStyleProps.push(prop);
            element.style[prop] = styles[prop];
        }
    };
    ItemVisibility.prototype.destroy = function () {
        if (!this.item)
            return;
        var item = this.item;
        var itemElement = item.element;
        var settings = item.getGrid().settings;
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
    };
    ItemVisibility.prototype._startAnimation = function (toVisible, instant, onFinish) {
        var _this = this;
        if (!this.item || !this.element)
            return;
        var _a = this, item = _a.item, element = _a.element, animator = _a.animator;
        var grid = item.getGrid();
        var settings = grid.settings;
        var targetStyles = toVisible ? settings.visibleStyles : settings.hiddenStyles;
        var duration = toVisible ? settings.showDuration : settings.hideDuration;
        var easing = toVisible ? settings.showEasing : settings.hideEasing;
        var isInstant = instant || duration <= 0;
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
        var currentStyles;
        var tX = 0;
        var tY = 0;
        grid._itemVisibilityNeedsDimensionRefresh = true;
        addVisibilityTick(item.id, function () {
            if (!_this.item || (toVisible ? !_this._isShowing : !_this._isHiding))
                return;
            currentStyles = getCurrentStyles(element, targetStyles);
            var _a = item._getTranslate(), x = _a.x, y = _a.y;
            tX = x;
            tY = y;
            if (settings._animationWindowing && grid._itemVisibilityNeedsDimensionRefresh) {
                grid._itemVisibilityNeedsDimensionRefresh = false;
                grid._updateBoundingRect();
                grid._updateBorders(true, false, true, false);
            }
        }, function () {
            if (!_this.item || (toVisible ? !_this._isShowing : !_this._isHiding))
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
    };
    ItemVisibility.prototype._finishShow = function () {
        if (!this.item || this._isHidden)
            return;
        this._isShowing = false;
        this.item._emitter.burst(this._queue, false, this.item);
    };
    ItemVisibility.prototype._finishHide = function () {
        if (!this.item || !this._isHidden)
            return;
        var item = this.item;
        this._isHiding = false;
        item._layout.stop(true, 0, 0);
        item.element.style.display = 'none';
        item._emitter.burst(this._queue, false, item);
    };
    ItemVisibility.prototype._removeCurrentStyles = function () {
        if (!this.element)
            return;
        var _a = this, element = _a.element, _currentStyleProps = _a._currentStyleProps;
        var i = 0;
        for (; i < _currentStyleProps.length; i++) {
            element.style[_currentStyleProps[i]] = '';
        }
        _currentStyleProps.length = 0;
    };
    return ItemVisibility;
}());

var id = 0;
function createUid() {
    return ++id;
}

var windowSize = {
    width: window.innerWidth,
    height: window.innerHeight,
};
window.addEventListener('resize', function () {
    windowSize.width = window.innerWidth;
    windowSize.height = window.innerHeight;
});

var targetRect = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
};
var viewportRect = {
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

var _getTranslateResult = { x: 0, y: 0 };
var _getClientRootPositionResult = { left: 0, top: 0 };
var Item = (function () {
    function Item(grid, element, isActive) {
        var settings = grid.settings, gridElement = grid.element, gridId = grid.id;
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
    Item.prototype.getGrid = function () {
        return GRID_INSTANCES.get(this._gridId) || null;
    };
    Item.prototype.isActive = function () {
        return this._isActive;
    };
    Item.prototype.isVisible = function () {
        return !this._visibility.isHidden();
    };
    Item.prototype.isShowing = function () {
        return !!this._visibility.isShowing();
    };
    Item.prototype.isHiding = function () {
        return !!this._visibility.isHiding();
    };
    Item.prototype.isPositioning = function () {
        return !!this._layout.isActive();
    };
    Item.prototype.isDragging = function () {
        var _a;
        return !!((_a = this._drag) === null || _a === void 0 ? void 0 : _a.isActive());
    };
    Item.prototype.isReleasing = function () {
        return !!this._dragRelease.isActive();
    };
    Item.prototype.isDestroyed = function () {
        return this._isDestroyed;
    };
    Item.prototype._updateDimensions = function (force) {
        if (this._isDestroyed)
            return;
        if (force !== true && !this.isVisible() && !this.isHiding())
            return;
        var element = this.element;
        var _a = element.getBoundingClientRect(), width = _a.width, height = _a.height;
        this.width = width;
        this.height = height;
        this.marginLeft = Math.max(0, getStyleAsFloat(element, 'margin-left'));
        this.marginRight = Math.max(0, getStyleAsFloat(element, 'margin-right'));
        this.marginTop = Math.max(0, getStyleAsFloat(element, 'margin-top'));
        this.marginBottom = Math.max(0, getStyleAsFloat(element, 'margin-bottom'));
        this._dragPlaceholder.updateDimensions();
    };
    Item.prototype._updateSortData = function () {
        if (this._isDestroyed)
            return;
        var settings = this.getGrid().settings;
        var sortData = settings.sortData;
        this._sortData = {};
        if (sortData) {
            var prop = void 0;
            for (prop in sortData) {
                this._sortData[prop] = sortData[prop](this, this.element);
            }
        }
    };
    Item.prototype._addToLayout = function (left, top) {
        if (left === void 0) { left = 0; }
        if (top === void 0) { top = 0; }
        if (this.isActive())
            return;
        this._isActive = true;
        this.left = left;
        this.top = top;
    };
    Item.prototype._removeFromLayout = function () {
        if (!this.isActive())
            return;
        this._isActive = false;
        this.left = 0;
        this.top = 0;
    };
    Item.prototype._canSkipLayout = function (left, top) {
        return (this.left === left &&
            this.top === top &&
            !this._migrate.isActive() &&
            !this._dragRelease.isActive() &&
            !this._layout._skipNextAnimation);
    };
    Item.prototype._setTranslate = function (x, y) {
        if (this._translateX === x && this._translateY === y)
            return;
        this._translateX = x;
        this._translateY = y;
        this.element.style[transformProp] = getTranslateString(x, y);
    };
    Item.prototype._getTranslate = function () {
        if (this._translateX === undefined || this._translateY === undefined) {
            var translate = getTranslate(this.element);
            _getTranslateResult.x = translate.x;
            _getTranslateResult.y = translate.y;
        }
        else {
            _getTranslateResult.x = this._translateX;
            _getTranslateResult.y = this._translateY;
        }
        return _getTranslateResult;
    };
    Item.prototype._getClientRootPosition = function () {
        var grid = this.getGrid();
        _getClientRootPositionResult.left = grid._rect.left + grid._borderLeft - this._containerDiffX;
        _getClientRootPositionResult.top = grid._rect.top + grid._borderTop - this._containerDiffY;
        return _getClientRootPositionResult;
    };
    Item.prototype._isInViewport = function (x, y, viewportThreshold) {
        if (viewportThreshold === void 0) { viewportThreshold = 0; }
        var rootPosition = this._getClientRootPosition();
        return isInViewport(this.width, this.height, rootPosition.left + this.marginLeft + x, rootPosition.top + this.marginTop + y, viewportThreshold || 0);
    };
    Item.prototype._destroy = function (removeElement) {
        var _a;
        if (removeElement === void 0) { removeElement = false; }
        if (this._isDestroyed)
            return;
        var element = this.element;
        var settings = this.getGrid().settings;
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
    };
    return Item;
}());

function createPackerProcessor(isWorker) {
    if (isWorker === void 0) { isWorker = false; }
    var SETTINGS = {
        fillGaps: 1,
        horizontal: 2,
        alignRight: 4,
        alignBottom: 8,
        rounding: 16,
    };
    var EPS = 0.001;
    var MIN_SLOT_SIZE = 0.5;
    function roundNumber(number) {
        return ((((number * 1000 + 0.5) << 0) / 10) << 0) / 100;
    }
    var PrivatePackerProcessor = (function () {
        function PrivatePackerProcessor() {
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
        PrivatePackerProcessor.prototype.computeLayout = function (layout, settings) {
            var items = layout.items;
            if (!items.length)
                return layout;
            var slots = layout.slots;
            var fillGaps = !!(settings & SETTINGS.fillGaps);
            var horizontal = !!(settings & SETTINGS.horizontal);
            var alignRight = !!(settings & SETTINGS.alignRight);
            var alignBottom = !!(settings & SETTINGS.alignBottom);
            var rounding = !!(settings & SETTINGS.rounding);
            var isPreProcessed = typeof items[0] === 'number';
            var bump = isPreProcessed ? 2 : 1;
            var i = 0;
            var slotWidth = 0;
            var slotHeight = 0;
            var slot;
            var item;
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
        };
        PrivatePackerProcessor.prototype._computeNextSlot = function (layout, slotWidth, slotHeight, fillGaps, horizontal) {
            var _a = this, slot = _a._slot, currentRects = _a._currentRects, nextRects = _a._nextRects;
            var ignoreCurrentRects = false;
            var foundInitialSlot = false;
            var rect;
            var rectId;
            var i = 0;
            var j = 0;
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
                    var shards = this._splitRect(rect, slot);
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
        };
        PrivatePackerProcessor.prototype._addRect = function (left, top, width, height) {
            var rectId = ++this._rectId;
            this._rectStore[rectId] = left || 0;
            this._rectStore[++this._rectId] = top || 0;
            this._rectStore[++this._rectId] = width || 0;
            this._rectStore[++this._rectId] = height || 0;
            return rectId;
        };
        PrivatePackerProcessor.prototype._getRect = function (id, target) {
            target = target || this._rectTarget;
            target.left = this._rectStore[id] || 0;
            target.top = this._rectStore[++id] || 0;
            target.width = this._rectStore[++id] || 0;
            target.height = this._rectStore[++id] || 0;
            return target;
        };
        PrivatePackerProcessor.prototype._splitRect = function (rect, hole) {
            var shards = this._shards;
            var width = 0;
            var height = 0;
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
        };
        PrivatePackerProcessor.prototype._isRectAWithinRectB = function (a, b) {
            return (a.left + EPS >= b.left &&
                a.top + EPS >= b.top &&
                a.left + a.width - EPS <= b.left + b.width &&
                a.top + a.height - EPS <= b.top + b.height);
        };
        PrivatePackerProcessor.prototype._purgeRects = function (rectIds) {
            var _a = this, a = _a._tempRectA, b = _a._tempRectB;
            var i = rectIds.length;
            var j = 0;
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
        };
        PrivatePackerProcessor.prototype._sortRectsTopLeft = function (aId, bId) {
            var _a = this, a = _a._tempRectA, b = _a._tempRectB;
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
        };
        PrivatePackerProcessor.prototype._sortRectsLeftTop = function (aId, bId) {
            var _a = this, a = _a._tempRectA, b = _a._tempRectB;
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
        };
        return PrivatePackerProcessor;
    }());
    var processor = new PrivatePackerProcessor();
    if (isWorker) {
        var workerScope_1 = self;
        var PACKET_INDEX_WIDTH_1 = 1;
        var PACKET_INDEX_HEIGHT_1 = 2;
        var PACKET_INDEX_SETTINGS_1 = 3;
        var PACKET_HEADER_SLOTS_1 = 4;
        workerScope_1.onmessage = function (msg) {
            var data = new Float32Array(msg.data);
            var items = data.subarray(PACKET_HEADER_SLOTS_1, data.length);
            var slots = new Float32Array(items.length);
            var settings = data[PACKET_INDEX_SETTINGS_1];
            var layout = {
                items: items,
                slots: slots,
                width: data[PACKET_INDEX_WIDTH_1],
                height: data[PACKET_INDEX_HEIGHT_1],
            };
            processor.computeLayout(layout, settings);
            data[PACKET_INDEX_WIDTH_1] = layout.width;
            data[PACKET_INDEX_HEIGHT_1] = layout.height;
            data.set(layout.slots, PACKET_HEADER_SLOTS_1);
            workerScope_1.postMessage(data.buffer, [data.buffer]);
        };
    }
    return processor;
}

var blobUrl = '';
var allWorkers = new Set();
function createWorkerProcessors(amount, onmessage) {
    var workers = [];
    if (amount > 0) {
        if (!blobUrl) {
            blobUrl = URL.createObjectURL(new Blob(['(' + createPackerProcessor.toString() + ')(true)'], {
                type: 'application/javascript',
            }));
        }
        var i = 0;
        for (; i < amount; i++) {
            var worker = new Worker(blobUrl);
            worker.onmessage = onmessage;
            workers.push(worker);
            allWorkers.add(worker);
        }
    }
    return workers;
}
function destroyWorkerProcessors(workers) {
    var i = 0;
    for (; i < workers.length; i++) {
        var worker = workers[i];
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

var SETTINGS = {
    fillGaps: 1,
    horizontal: 2,
    alignRight: 4,
    alignBottom: 8,
    rounding: 16,
};
var PACKET_INDEX = {
    id: 0,
    width: 1,
    height: 2,
    settings: 3,
    slots: 4,
};
var PACKER_PROCESSOR = createPackerProcessor();
var Packer = (function () {
    function Packer(numWorkers, options) {
        if (numWorkers === void 0) { numWorkers = 0; }
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
    Packer.prototype.updateSettings = function (options) {
        var fillGaps = this._settings & SETTINGS.fillGaps;
        if (typeof options.fillGaps === 'boolean') {
            fillGaps = options.fillGaps ? SETTINGS.fillGaps : 0;
        }
        var horizontal = this._settings & SETTINGS.horizontal;
        if (typeof options.horizontal === 'boolean') {
            horizontal = options.horizontal ? SETTINGS.horizontal : 0;
        }
        var alignRight = this._settings & SETTINGS.alignRight;
        if (typeof options.alignRight === 'boolean') {
            alignRight = options.alignRight ? SETTINGS.alignRight : 0;
        }
        var alignBottom = this._settings & SETTINGS.alignBottom;
        if (typeof options.alignBottom === 'boolean') {
            alignBottom = options.alignBottom ? SETTINGS.alignBottom : 0;
        }
        var rounding = this._settings & SETTINGS.rounding;
        if (typeof options.rounding === 'boolean') {
            rounding = options.rounding ? SETTINGS.rounding : 0;
        }
        this._settings = fillGaps | horizontal | alignRight | alignBottom | rounding;
    };
    Packer.prototype.createLayout = function (layoutId, items, containerData, callback) {
        if (this._layoutWorkerData.has(layoutId)) {
            throw new Error('A layout with the provided id is currently being processed.');
        }
        var useSyncProcessing = !this._asyncMode || !items.length;
        var isHorizontal = this._settings & SETTINGS.horizontal;
        var layout = {
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
        var packet = new Float32Array(PACKET_INDEX.slots + items.length * 2);
        packet[PACKET_INDEX.id] = layoutId;
        packet[PACKET_INDEX.width] = layout.width;
        packet[PACKET_INDEX.height] = layout.height;
        packet[PACKET_INDEX.settings] = this._settings;
        var i = 0;
        var j = PACKET_INDEX.slots - 1;
        for (; i < items.length; i++) {
            var item = items[i];
            packet[++j] = item.width + (item.marginLeft || 0) + (item.marginRight || 0);
            packet[++j] = item.height + (item.marginTop || 0) + (item.marginBottom || 0);
        }
        this._layoutWorkerQueue.push(layoutId);
        this._layoutWorkerData.set(layoutId, __assign(__assign({}, layout), { container: containerData, settings: this._settings, callback: callback, packet: packet, aborted: false }));
        this._sendToWorker();
        return this.cancelLayout.bind(this, layoutId);
    };
    Packer.prototype.cancelLayout = function (layoutId) {
        var data = this._layoutWorkerData.get(layoutId);
        if (!data || data.aborted)
            return;
        if (data.worker) {
            data.aborted = true;
        }
        else {
            var queueIndex = this._layoutWorkerQueue.indexOf(layoutId);
            this._layoutWorkerQueue.splice(queueIndex, 1);
            this._layoutWorkerData.delete(layoutId);
        }
    };
    Packer.prototype.destroy = function () {
        var _this = this;
        this._layoutWorkerData.forEach(function (data) {
            _this.cancelLayout(data.id);
            if (data.worker)
                _this._workers.push(data.worker);
        });
        this._layoutWorkerData.clear();
        this._layoutsProcessing.clear();
        this._layoutWorkerQueue.length = 0;
        destroyWorkerProcessors(this._workers);
        this._workers.length = 0;
    };
    Packer.prototype._sendToWorker = function () {
        if (!this._layoutWorkerQueue.length || !this._workers.length)
            return;
        var worker = this._workers.pop();
        var layoutId = this._layoutWorkerQueue.shift();
        var workerData = this._layoutWorkerData.get(layoutId);
        workerData.worker = worker;
        this._layoutsProcessing.add(layoutId);
        var buffer = workerData.packet.buffer;
        worker.postMessage(buffer, [buffer]);
    };
    Packer.prototype._onWorkerMessage = function (msg) {
        var data = new Float32Array(msg.data);
        var layoutId = data[PACKET_INDEX.id];
        var layoutData = this._layoutWorkerData.get(layoutId);
        this._layoutWorkerData.delete(layoutId);
        this._layoutsProcessing.delete(layoutId);
        if (!layoutData)
            return;
        var worker = layoutData.worker;
        if (worker)
            this._workers.push(worker);
        if (!layoutData.aborted) {
            var layout = {
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
    };
    Packer.prototype._setContainerStyles = function (layout, containerData, settings) {
        var isHorizontal = !!(settings & SETTINGS.horizontal);
        var isBorderBox = containerData.boxSizing === 'border-box';
        var _a = containerData.borderLeft, borderLeft = _a === void 0 ? 0 : _a, _b = containerData.borderRight, borderRight = _b === void 0 ? 0 : _b, _c = containerData.borderTop, borderTop = _c === void 0 ? 0 : _c, _d = containerData.borderBottom, borderBottom = _d === void 0 ? 0 : _d;
        var styles = layout.styles, width = layout.width, height = layout.height;
        if (isHorizontal) {
            styles.width = (isBorderBox ? width + borderLeft + borderRight : width) + 'px';
        }
        else {
            styles.height = (isBorderBox ? height + borderTop + borderBottom : height) + 'px';
        }
    };
    return Packer;
}());

var debounceId = 0;
function debounce(fn, durationMs) {
    var id = ++debounceId;
    var timer = 0;
    var lastTime = 0;
    var isCanceled = false;
    var tick = function (time) {
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
    return function debouncedFn(cancel) {
        if (cancel === void 0) { cancel = false; }
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

var matches = Element.prototype.matches ||
    Element.prototype.webkitMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    function () {
        return false;
    };
function elementMatches(el, selector) {
    return matches.call(el, selector);
}

var htmlCollectionType = '[object HTMLCollection]';
var nodeListType = '[object NodeList]';
function isNodeListOrHTMLCollection(val) {
    var type = Object.prototype.toString.call(val);
    return type === htmlCollectionType || type === nodeListType;
}

var toString = Object.prototype.toString;
function isPlainObject(val) {
    return typeof val === 'object' && toString.call(val) === '[object Object]';
}

function toArray(val) {
    return isNodeListOrHTMLCollection(val)
        ? Array.prototype.slice.call(val)
        : Array.prototype.concat(val);
}

var layoutId = 0;
function createSettings(baseSettings, overrides) {
    if (overrides === void 0) { overrides = {}; }
    var newSettings = mergeObjects({}, baseSettings);
    newSettings = mergeObjects(newSettings, overrides);
    if (overrides.visibleStyles) {
        newSettings.visibleStyles = __assign({}, overrides.visibleStyles);
    }
    else if (baseSettings.visibleStyles) {
        newSettings.visibleStyles = __assign({}, baseSettings.visibleStyles);
    }
    if (overrides.hiddenStyles) {
        newSettings.hiddenStyles = __assign({}, overrides.hiddenStyles);
    }
    else if (baseSettings.hiddenStyles) {
        newSettings.hiddenStyles = __assign({}, baseSettings.hiddenStyles);
    }
    return newSettings;
}
function mergeObjects(target, source) {
    var sourceKeys = Object.keys(source);
    var length = sourceKeys.length;
    var i = 0;
    for (; i < length; i++) {
        var propName = sourceKeys[i];
        var isSourceObject = isPlainObject(source[propName]);
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
        var result = [];
        var children = gridElement.children;
        var i = 0;
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
    var normalized = {};
    var docElemStyle = document.documentElement.style;
    var prop;
    var prefixedProp;
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
    var result = {};
    var i = 0;
    for (; i < items.length; i++) {
        result[items[i].id] = i;
    }
    return result;
}
function compareIndexMap(indexMap, itemA, itemB) {
    var indexA = indexMap[itemA.id];
    var indexB = indexMap[itemB.id];
    return indexA - indexB;
}
function isEqualObjects(a, b) {
    var key;
    for (key in a) {
        if (a[key] !== b[key])
            return false;
    }
    return Object.keys(a).length === Object.keys(b).length;
}
var Grid = (function () {
    function Grid(element, options) {
        if (options === void 0) { options = {}; }
        if (typeof element === 'string') {
            var queriedElement = document.querySelector(element);
            if (!queriedElement)
                throw new Error('No container element found.');
            element = queriedElement;
        }
        var isElementInDom = element.getRootNode
            ? element.getRootNode({ composed: true }) === document
            : document.body.contains(element);
        if (!isElementInDom || element === document.documentElement) {
            throw new Error('Container element must be an existing DOM element.');
        }
        var settings = createSettings(Grid.defaultOptions, options);
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
    Grid.prototype.on = function (event, listener) {
        this._emitter.on(event, listener);
        return this;
    };
    Grid.prototype.off = function (event, listener) {
        this._emitter.off(event, listener);
        return this;
    };
    Grid.prototype.isDestroyed = function () {
        return this._isDestroyed;
    };
    Grid.prototype.getItem = function (target) {
        if (this._isDestroyed || (!target && target !== 0)) {
            return null;
        }
        if (typeof target === 'number') {
            return this.items[target > -1 ? target : this.items.length + target] || null;
        }
        if (target instanceof Item) {
            return target._gridId === this.id ? target : null;
        }
        var item = ITEM_ELEMENT_MAP.get(target);
        return item && item._gridId === this.id ? item : null;
    };
    Grid.prototype.getItems = function (targets) {
        if (this._isDestroyed || targets === undefined) {
            return this.items.slice(0);
        }
        var items = [];
        if (Array.isArray(targets) || isNodeListOrHTMLCollection(targets)) {
            var item = void 0;
            var i = 0;
            for (; i < targets.length; i++) {
                item = this.getItem(targets[i]);
                if (item)
                    items.push(item);
            }
        }
        else {
            var item = this.getItem(targets);
            if (item)
                items.push(item);
        }
        return items;
    };
    Grid.prototype.updateSettings = function (options) {
        if (this._isDestroyed || !options)
            return this;
        var _a = this, settings = _a.settings, items = _a.items;
        var itemClasses = [];
        var dragEnabledChanged = false;
        var dragHandleChanged = false;
        var dragCssPropsChanged = false;
        var dragEventListenerOptionsChanged = false;
        var visibleStylesChanged = false;
        var hiddenStylesChanged = false;
        var nextSettings = createSettings(settings, options);
        nextSettings.visibleStyles = normalizeStyles(nextSettings.visibleStyles);
        nextSettings.hiddenStyles = normalizeStyles(nextSettings.hiddenStyles);
        this.settings = nextSettings;
        for (var option in options) {
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
            var i = void 0;
            var j = void 0;
            for (i = 0; i < items.length; i++) {
                var item = items[i];
                for (j = 0; j < itemClasses.length; j += 3) {
                    var option = itemClasses[j];
                    var currentValue = itemClasses[j + 1];
                    var nextValue = itemClasses[j + 2];
                    var switchClass = false;
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
    };
    Grid.prototype.refreshItems = function (items, force) {
        if (force === void 0) { force = false; }
        if (this._isDestroyed)
            return this;
        var targets = (items || this.items);
        var i;
        var item;
        var style;
        var hiddenItemStyles;
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
    };
    Grid.prototype.refreshSortData = function (items) {
        if (this._isDestroyed)
            return this;
        var targets = (items || this.items);
        var i = 0;
        for (; i < targets.length; i++) {
            targets[i]._updateSortData();
        }
        return this;
    };
    Grid.prototype.synchronize = function () {
        if (this._isDestroyed)
            return this;
        var items = this.items;
        if (!items.length)
            return this;
        var fragment;
        var element;
        var i = 0;
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
    };
    Grid.prototype.layout = function (instant, onFinish) {
        var _this = this;
        if (instant === void 0) { instant = false; }
        if (this._isDestroyed)
            return this;
        var unfinishedLayout = this._nextLayoutData;
        if (unfinishedLayout && isFunction(unfinishedLayout.cancel)) {
            unfinishedLayout.cancel();
        }
        var nextLayoutId = (layoutId = (layoutId % MAX_SAFE_FLOAT32_INTEGER) + 1);
        this._nextLayoutData = {
            id: nextLayoutId,
            instant: instant,
            onFinish: onFinish,
            cancel: null,
        };
        var items = this.items;
        var layoutItems = [];
        var i = 0;
        for (; i < items.length; i++) {
            if (items[i].isActive())
                layoutItems.push(items[i]);
        }
        this._updateDimensions();
        var containerData = {
            width: this._rect.width - this._borderLeft - this._borderRight,
            height: this._rect.height - this._borderTop - this._borderBottom,
            borderLeft: this._borderLeft,
            borderRight: this._borderRight,
            borderTop: this._borderTop,
            borderBottom: this._borderBottom,
            boxSizing: this._boxSizing,
        };
        var layout = this.settings.layout;
        var cancelLayout;
        if (isFunction(layout)) {
            cancelLayout = layout(nextLayoutId, this, layoutItems, containerData, function (layoutData) {
                _this._onLayoutDataReceived(layoutData);
            });
        }
        else {
            Grid.defaultPacker.updateSettings(layout);
            cancelLayout = Grid.defaultPacker.createLayout(nextLayoutId, layoutItems, containerData, function (layoutData) {
                _this._onLayoutDataReceived(__assign(__assign({}, layoutData), { items: layoutItems }));
            });
        }
        if (isFunction(cancelLayout) &&
            this._nextLayoutData &&
            this._nextLayoutData.id === nextLayoutId) {
            this._nextLayoutData.cancel = cancelLayout;
        }
        return this;
    };
    Grid.prototype.add = function (elements, options) {
        if (options === void 0) { options = {}; }
        if (this._isDestroyed || !elements)
            return [];
        var newElements = toArray(elements);
        if (!newElements.length)
            return [];
        var layout = options.layout ? options.layout : options.layout === undefined;
        var items = this.items;
        var needsLayout = false;
        var fragment;
        var element;
        var item;
        var i;
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
        var newItems = [];
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
    };
    Grid.prototype.remove = function (items, options) {
        if (options === void 0) { options = {}; }
        if (this._isDestroyed || !items.length)
            return [];
        var layout = options.layout ? options.layout : options.layout === undefined;
        var allItems = this.getItems();
        var targetItems = [];
        var indices = [];
        var needsLayout = false;
        var index;
        var item;
        var i;
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
    };
    Grid.prototype.show = function (items, options) {
        if (options === void 0) { options = {}; }
        if (!this._isDestroyed && items.length) {
            this._setItemsVisibility(items, true, options);
        }
        return this;
    };
    Grid.prototype.hide = function (items, options) {
        if (options === void 0) { options = {}; }
        if (!this._isDestroyed && items.length) {
            this._setItemsVisibility(items, false, options);
        }
        return this;
    };
    Grid.prototype.filter = function (predicate, options) {
        if (options === void 0) { options = {}; }
        if (this._isDestroyed || !this.items.length)
            return this;
        var itemsToShow = [];
        var itemsToHide = [];
        if (isFunction(predicate) || typeof predicate === 'string') {
            var item = void 0;
            var i = void 0;
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
        var onFinish = isFunction(options.onFinish) ? options.onFinish : undefined;
        var shownItems = [];
        var hiddenItems = [];
        var finishCounter = -1;
        if (itemsToShow.length) {
            this.show(itemsToShow, {
                instant: !!options.instant,
                syncWithLayout: !!options.syncWithLayout,
                onFinish: onFinish
                    ? function (items) {
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
                    ? function (items) {
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
            var layout = options.layout ? options.layout : options.layout === undefined;
            if (layout) {
                this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
            }
        }
        return this;
    };
    Grid.prototype.sort = function (comparer, options) {
        if (options === void 0) { options = {}; }
        if (this._isDestroyed || this.items.length < 2)
            return this;
        var items = this.items;
        var origItems = items.slice(0);
        var layout = options.layout ? options.layout : options.layout === undefined;
        var isDescending = !!options.descending;
        var indexMap = null;
        if (isFunction(comparer)) {
            items.sort(function (a, b) {
                var result = isDescending ? -comparer(a, b) : comparer(a, b);
                if (!result) {
                    if (!indexMap)
                        indexMap = createIndexMap(origItems);
                    result = isDescending ? compareIndexMap(indexMap, b, a) : compareIndexMap(indexMap, a, b);
                }
                return result;
            });
        }
        else if (typeof comparer === 'string') {
            var sortCriteria_1 = comparer
                .trim()
                .split(' ')
                .filter(function (val) {
                return val;
            })
                .map(function (val) {
                return val.split(':');
            });
            items.sort(function (a, b) {
                var result = 0;
                var i = 0;
                for (; i < sortCriteria_1.length; i++) {
                    var criteriaName = sortCriteria_1[i][0];
                    var criteriaOrder = sortCriteria_1[i][1];
                    if (a._sortData === null)
                        a._updateSortData();
                    if (b._sortData === null)
                        b._updateSortData();
                    var valA = a._sortData[criteriaName];
                    var valB = b._sortData[criteriaName];
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
    };
    Grid.prototype.move = function (item, position, options) {
        if (options === void 0) { options = {}; }
        if (this._isDestroyed || this.items.length < 2)
            return this;
        var items = this.items;
        var layout = options.layout ? options.layout : options.layout === undefined;
        var isSwap = options.action === ACTION_SWAP;
        var action = isSwap ? ACTION_SWAP : ACTION_MOVE;
        var fromItem = this.getItem(item);
        var toItem = this.getItem(position);
        if (fromItem && toItem && fromItem !== toItem) {
            var fromIndex = items.indexOf(fromItem);
            var toIndex = items.indexOf(toItem);
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
    };
    Grid.prototype.send = function (item, targetGrid, position, options) {
        if (options === void 0) { options = {}; }
        if (this._isDestroyed || targetGrid._isDestroyed || this === targetGrid)
            return this;
        var targetItem = this.getItem(item);
        if (!targetItem)
            return this;
        targetItem._migrate.start(targetGrid, position, options.appendTo || document.body);
        if (targetItem._migrate.isActive() && targetItem.isActive()) {
            var layoutSender = options.layoutSender
                ? options.layoutSender
                : options.layoutSender === undefined;
            var layoutReceiver = options.layoutReceiver
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
    };
    Grid.prototype.destroy = function (removeElements) {
        if (removeElements === void 0) { removeElements = false; }
        if (this._isDestroyed)
            return this;
        var container = this.element;
        var items = this.getItems();
        var layoutStyles = (this._layout && this._layout.styles) || {};
        this._unbindLayoutOnResize();
        var i = 0;
        for (; i < items.length; i++)
            items[i]._destroy(removeElements);
        this.items.length = 0;
        removeClass(container, this.settings.containerClass);
        var prop;
        for (prop in layoutStyles)
            container.style[prop] = '';
        GRID_INSTANCES.delete(this.id);
        this._isDestroyed = true;
        this._emitter.emit(EVENT_DESTROY);
        this._emitter.destroy();
        return this;
    };
    Grid.prototype._emit = function (event) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this._isDestroyed)
            return;
        (_a = this._emitter).emit.apply(_a, __spreadArrays([event], args));
    };
    Grid.prototype._hasListeners = function (event) {
        if (this._isDestroyed)
            return false;
        return this._emitter.countListeners(event) > 0;
    };
    Grid.prototype._updateBoundingRect = function () {
        var _rect = this._rect;
        var _a = this.element.getBoundingClientRect(), width = _a.width, height = _a.height, left = _a.left, right = _a.right, top = _a.top, bottom = _a.bottom;
        _rect.width = width;
        _rect.height = height;
        _rect.left = left;
        _rect.right = right;
        _rect.top = top;
        _rect.bottom = bottom;
    };
    Grid.prototype._updateBorders = function (left, right, top, bottom) {
        var element = this.element;
        if (left)
            this._borderLeft = getStyleAsFloat(element, 'border-left-width');
        if (right)
            this._borderRight = getStyleAsFloat(element, 'border-right-width');
        if (top)
            this._borderTop = getStyleAsFloat(element, 'border-top-width');
        if (bottom)
            this._borderBottom = getStyleAsFloat(element, 'border-bottom-width');
    };
    Grid.prototype._updateDimensions = function () {
        this._updateBoundingRect();
        this._updateBorders(true, true, true, true);
        this._boxSizing = getStyle(this.element, 'box-sizing');
    };
    Grid.prototype._bindLayoutOnResize = function (delay) {
        var _this = this;
        if (typeof delay !== 'number') {
            delay = delay === true ? 0 : -1;
        }
        if (delay >= 0) {
            this._resizeHandler = debounce(function () {
                _this.refreshItems().layout();
            }, delay);
            window.addEventListener('resize', this._resizeHandler);
        }
    };
    Grid.prototype._unbindLayoutOnResize = function () {
        var _resizeHandler = this._resizeHandler;
        if (isFunction(_resizeHandler)) {
            _resizeHandler(true);
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
    };
    Grid.prototype._onLayoutDataReceived = function (layout) {
        var _this = this;
        if (this._isDestroyed || !this._nextLayoutData || this._nextLayoutData.id !== layout.id)
            return;
        var _a = this._nextLayoutData, instant = _a.instant, onFinish = _a.onFinish;
        var numItems = layout.items.length;
        var counter = numItems;
        var item;
        var left;
        var top;
        var i;
        this._nextLayoutData = null;
        if (!this._isLayoutFinished && this._hasListeners(EVENT_LAYOUT_ABORT)) {
            this._emit(EVENT_LAYOUT_ABORT, this._layout.items.slice(0));
        }
        this._layout = layout;
        var itemsToLayout = [];
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
        var tryFinish = function () {
            if (--counter > 0)
                return;
            var isAborted = _this._layout.id !== layout.id;
            if (!isAborted) {
                _this._isLayoutFinished = true;
            }
            if (isFunction(onFinish)) {
                onFinish(layout.items.slice(0), isAborted);
            }
            if (!isAborted && _this._hasListeners(EVENT_LAYOUT_END)) {
                _this._emit(EVENT_LAYOUT_END, layout.items.slice(0));
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
    };
    Grid.prototype._setItemsVisibility = function (items, toVisible, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var targetItems = items.slice(0);
        var isInstant = options.instant === true;
        var callback = options.onFinish;
        var layout = options.layout ? options.layout : options.layout === undefined;
        var startEvent = toVisible ? EVENT_SHOW_START : EVENT_HIDE_START;
        var endEvent = toVisible ? EVENT_SHOW_END : EVENT_HIDE_END;
        var method = toVisible ? 'show' : 'hide';
        var completedItems = [];
        var hiddenItems = [];
        var needsLayout = false;
        var counter = targetItems.length;
        var item;
        var i;
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
        var triggerVisibilityChange = function () {
            if (needsLayout && options.syncWithLayout !== false) {
                _this.off(EVENT_LAYOUT_START, triggerVisibilityChange);
            }
            if (_this._hasListeners(startEvent)) {
                _this._emit(startEvent, targetItems.slice(0));
            }
            for (i = 0; i < targetItems.length; i++) {
                item = targetItems[i];
                if (item._gridId !== _this.id) {
                    if (--counter < 1) {
                        if (isFunction(callback))
                            callback(completedItems.slice(0));
                        if (_this._hasListeners(endEvent))
                            _this._emit(endEvent, completedItems.slice(0));
                    }
                    continue;
                }
                item._visibility[method](isInstant, function (interrupted, item) {
                    if (!interrupted)
                        completedItems.push(item);
                    if (--counter < 1) {
                        if (isFunction(callback))
                            callback(completedItems.slice(0));
                        if (_this._hasListeners(endEvent))
                            _this._emit(endEvent, completedItems.slice(0));
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
    };
    Grid.Item = Item;
    Grid.ItemLayout = ItemLayout;
    Grid.ItemVisibility = ItemVisibility;
    Grid.ItemMigrate = ItemMigrate;
    Grid.ItemDrag = ItemDrag;
    Grid.ItemDragRelease = ItemDragRelease;
    Grid.ItemDragPlaceholder = ItemDragPlaceholder;
    Grid.ItemDragAutoScroll = ItemDragAutoScroll;
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
            speed: ItemDragAutoScroll.smoothSpeed(1000, 2000, 2500),
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
}());

export default Grid;
