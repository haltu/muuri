/**
* Muuri v0.9.1
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
  (global = global || self, global.Muuri = factory());
}(this, (function () { 'use strict';

  var GRID_INSTANCES = {};
  var ITEM_ELEMENT_MAP = typeof Map === 'function' ? new Map() : null;

  var ACTION_SWAP = 'swap';
  var ACTION_MOVE = 'move';

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
  var HAS_MS_POINTER_EVENTS = !!window.navigator.msPointerEnabled;

  var MAX_SAFE_FLOAT32_INTEGER = 16777216;

  /**
   * Event emitter constructor.
   *
   * @class
   */
  function Emitter() {
    this._events = {};
    this._queue = [];
    this._counter = 0;
    this._clearOnEmit = false;
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Bind an event listener.
   *
   * @public
   * @param {String} event
   * @param {Function} listener
   * @returns {Emitter}
   */
  Emitter.prototype.on = function (event, listener) {
    if (!this._events || !event || !listener) return this;

    // Get listeners queue and create it if it does not exist.
    var listeners = this._events[event];
    if (!listeners) listeners = this._events[event] = [];

    // Add the listener to the queue.
    listeners.push(listener);

    return this;
  };

  /**
   * Unbind all event listeners that match the provided listener function.
   *
   * @public
   * @param {String} event
   * @param {Function} listener
   * @returns {Emitter}
   */
  Emitter.prototype.off = function (event, listener) {
    if (!this._events || !event || !listener) return this;

    // Get listeners and return immediately if none is found.
    var listeners = this._events[event];
    if (!listeners || !listeners.length) return this;

    // Remove all matching listeners.
    var index;
    while ((index = listeners.indexOf(listener)) !== -1) {
      listeners.splice(index, 1);
    }

    return this;
  };

  /**
   * Unbind all listeners of the provided event.
   *
   * @public
   * @param {String} event
   * @returns {Emitter}
   */
  Emitter.prototype.clear = function (event) {
    if (!this._events || !event) return this;

    var listeners = this._events[event];
    if (listeners) {
      listeners.length = 0;
      delete this._events[event];
    }

    return this;
  };

  /**
   * Emit all listeners in a specified event with the provided arguments.
   *
   * @public
   * @param {String} event
   * @param {...*} [args]
   * @returns {Emitter}
   */
  Emitter.prototype.emit = function (event) {
    if (!this._events || !event) {
      this._clearOnEmit = false;
      return this;
    }

    // Get event listeners and quit early if there's no listeners.
    var listeners = this._events[event];
    if (!listeners || !listeners.length) {
      this._clearOnEmit = false;
      return this;
    }

    var queue = this._queue;
    var startIndex = queue.length;
    var argsLength = arguments.length - 1;
    var args;

    // If we have more than 3 arguments let's put the arguments in an array and
    // apply it to the listeners.
    if (argsLength > 3) {
      args = [];
      args.push.apply(args, arguments);
      args.shift();
    }

    // Add the current listeners to the callback queue before we process them.
    // This is necessary to guarantee that all of the listeners are called in
    // correct order even if new event listeners are removed/added during
    // processing and/or events are emitted during processing.
    queue.push.apply(queue, listeners);

    // Reset the event's listeners if need be.
    if (this._clearOnEmit) {
      listeners.length = 0;
      this._clearOnEmit = false;
    }

    // Increment queue counter. This is needed for the scenarios where emit is
    // triggered while the queue is already processing. We need to keep track of
    // how many "queue processors" there are active so that we can safely reset
    // the queue in the end when the last queue processor is finished.
    ++this._counter;

    // Process the queue (the specific part of it for this emit).
    var i = startIndex;
    var endIndex = queue.length;
    for (; i < endIndex; i++) {
      // prettier-ignore
      argsLength === 0 ? queue[i]() :
      argsLength === 1 ? queue[i](arguments[1]) :
      argsLength === 2 ? queue[i](arguments[1], arguments[2]) :
      argsLength === 3 ? queue[i](arguments[1], arguments[2], arguments[3]) :
                         queue[i].apply(null, args);

      // Stop processing if the emitter is destroyed.
      if (!this._events) return this;
    }

    // Decrement queue process counter.
    --this._counter;

    // Reset the queue if there are no more queue processes running.
    if (!this._counter) queue.length = 0;

    return this;
  };

  /**
   * Emit all listeners in a specified event with the provided arguments and
   * remove the event's listeners just before calling the them. This method allows
   * the emitter to serve as a queue where all listeners are called only once.
   *
   * @public
   * @param {String} event
   * @param {...*} [args]
   * @returns {Emitter}
   */
  Emitter.prototype.burst = function () {
    if (!this._events) return this;
    this._clearOnEmit = true;
    this.emit.apply(this, arguments);
    return this;
  };

  /**
   * Check how many listeners there are for a specific event.
   *
   * @public
   * @param {String} event
   * @returns {Boolean}
   */
  Emitter.prototype.countListeners = function (event) {
    if (!this._events) return 0;
    var listeners = this._events[event];
    return listeners ? listeners.length : 0;
  };

  /**
   * Destroy emitter instance. Basically just removes all bound listeners.
   *
   * @public
   * @returns {Emitter}
   */
  Emitter.prototype.destroy = function () {
    if (!this._events) return this;
    this._queue.length = this._counter = 0;
    this._events = null;
    return this;
  };

  var pointerout = HAS_POINTER_EVENTS ? 'pointerout' : HAS_MS_POINTER_EVENTS ? 'MSPointerOut' : '';
  var waitDuration = 100;

  /**
   * If you happen to use Edge or IE on a touch capable device there is a
   * a specific case where pointercancel and pointerend events are never emitted,
   * even though one them should always be emitted when you release your finger
   * from the screen. The bug appears specifically when Muuri shifts the dragged
   * element's position in the DOM after pointerdown event, IE and Edge don't like
   * that behaviour and quite often forget to emit the pointerend/pointercancel
   * event. But, they do emit pointerout event so we utilize that here.
   * Specifically, if there has been no pointermove event within 100 milliseconds
   * since the last pointerout event we force cancel the drag operation. This hack
   * works surprisingly well 99% of the time. There is that 1% chance there still
   * that dragged items get stuck but it is what it is.
   *
   * @class
   * @param {Dragger} dragger
   */
  function EdgeHack(dragger) {
    if (!pointerout) return;

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

  /**
   * @private
   */
  EdgeHack.prototype._addBehaviour = function () {
    if (this._isActive) return;
    this._isActive = true;
    this._dragger.on('move', this._resetData);
    this._dragger.on('cancel', this._removeBehaviour);
    this._dragger.on('end', this._removeBehaviour);
    window.addEventListener(pointerout, this._onOut);
  };

  /**
   * @private
   */
  EdgeHack.prototype._removeBehaviour = function () {
    if (!this._isActive) return;
    this._dragger.off('move', this._resetData);
    this._dragger.off('cancel', this._removeBehaviour);
    this._dragger.off('end', this._removeBehaviour);
    window.removeEventListener(pointerout, this._onOut);
    this._resetData();
    this._isActive = false;
  };

  /**
   * @private
   */
  EdgeHack.prototype._resetData = function () {
    window.clearTimeout(this._timeout);
    this._timeout = null;
    this._outEvent = null;
  };

  /**
   * @private
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  EdgeHack.prototype._onStart = function (e) {
    if (e.pointerType === 'mouse') return;
    this._addBehaviour();
  };

  /**
   * @private
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  EdgeHack.prototype._onOut = function (e) {
    if (!this._dragger._getTrackedTouch(e)) return;
    this._resetData();
    this._outEvent = e;
    this._timeout = window.setTimeout(this._onTimeout, waitDuration);
  };

  /**
   * @private
   */
  EdgeHack.prototype._onTimeout = function () {
    var e = this._outEvent;
    this._resetData();
    if (this._dragger.isActive()) this._dragger._onCancel(e);
  };

  /**
   * @public
   */
  EdgeHack.prototype.destroy = function () {
    if (!pointerout) return;
    this._dragger.off('start', this._onStart);
    this._removeBehaviour();
  };

  // Playing it safe here, test all potential prefixes capitalized and lowercase.
  var vendorPrefixes = ['', 'webkit', 'moz', 'ms', 'o', 'Webkit', 'Moz', 'MS', 'O'];
  var cache = {};

  /**
   * Get prefixed CSS property name when given a non-prefixed CSS property name.
   * Returns null if the property is not supported at all.
   *
   * @param {CSSStyleDeclaration} style
   * @param {String} prop
   * @returns {String}
   */
  function getPrefixedPropName(style, prop) {
    var prefixedProp = cache[prop] || '';
    if (prefixedProp) return prefixedProp;

    var camelProp = prop[0].toUpperCase() + prop.slice(1);
    var i = 0;
    while (i < vendorPrefixes.length) {
      prefixedProp = vendorPrefixes[i] ? vendorPrefixes[i] + camelProp : prop;
      if (prefixedProp in style) {
        cache[prop] = prefixedProp;
        return prefixedProp;
      }
      ++i;
    }

    return '';
  }

  /**
   * Check if passive events are supported.
   * https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection
   *
   * @returns {Boolean}
   */
  function hasPassiveEvents() {
    var isPassiveEventsSupported = false;

    try {
      var passiveOpts = Object.defineProperty({}, 'passive', {
        get: function () {
          isPassiveEventsSupported = true;
        },
      });
      window.addEventListener('testPassive', null, passiveOpts);
      window.removeEventListener('testPassive', null, passiveOpts);
    } catch (e) {}

    return isPassiveEventsSupported;
  }

  var ua = window.navigator.userAgent.toLowerCase();
  var isEdge = ua.indexOf('edge') > -1;
  var isIE = ua.indexOf('trident') > -1;
  var isFirefox = ua.indexOf('firefox') > -1;
  var isAndroid = ua.indexOf('android') > -1;

  var listenerOptions = hasPassiveEvents() ? { passive: true } : false;

  var taProp = 'touchAction';
  var taPropPrefixed = getPrefixedPropName(document.documentElement.style, taProp);
  var taDefaultValue = 'auto';

  /**
   * Creates a new Dragger instance for an element.
   *
   * @public
   * @class
   * @param {HTMLElement} element
   * @param {Object} [cssProps]
   */
  function Dragger(element, cssProps) {
    this._element = element;
    this._emitter = new Emitter();
    this._isDestroyed = false;
    this._cssProps = {};
    this._touchAction = '';
    this._isActive = false;

    this._pointerId = null;
    this._startTime = 0;
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;

    this._onStart = this._onStart.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onCancel = this._onCancel.bind(this);
    this._onEnd = this._onEnd.bind(this);

    // Can't believe had to build a freaking class for a hack!
    this._edgeHack = null;
    if ((isEdge || isIE) && (HAS_POINTER_EVENTS || HAS_MS_POINTER_EVENTS)) {
      this._edgeHack = new EdgeHack(this);
    }

    // Apply initial CSS props.
    this.setCssProps(cssProps);

    // If touch action was not provided with initial CSS props let's assume it's
    // auto.
    if (!this._touchAction) {
      this.setTouchAction(taDefaultValue);
    }

    // Prevent native link/image dragging for the item and it's children.
    element.addEventListener('dragstart', Dragger._preventDefault, false);

    // Listen to start event.
    element.addEventListener(Dragger._inputEvents.start, this._onStart, listenerOptions);
  }

  /**
   * Protected properties
   * ********************
   */

  Dragger._pointerEvents = {
    start: 'pointerdown',
    move: 'pointermove',
    cancel: 'pointercancel',
    end: 'pointerup',
  };

  Dragger._msPointerEvents = {
    start: 'MSPointerDown',
    move: 'MSPointerMove',
    cancel: 'MSPointerCancel',
    end: 'MSPointerUp',
  };

  Dragger._touchEvents = {
    start: 'touchstart',
    move: 'touchmove',
    cancel: 'touchcancel',
    end: 'touchend',
  };

  Dragger._mouseEvents = {
    start: 'mousedown',
    move: 'mousemove',
    cancel: '',
    end: 'mouseup',
  };

  Dragger._inputEvents = (function () {
    if (HAS_TOUCH_EVENTS) return Dragger._touchEvents;
    if (HAS_POINTER_EVENTS) return Dragger._pointerEvents;
    if (HAS_MS_POINTER_EVENTS) return Dragger._msPointerEvents;
    return Dragger._mouseEvents;
  })();

  Dragger._emitter = new Emitter();

  Dragger._emitterEvents = {
    start: 'start',
    move: 'move',
    end: 'end',
    cancel: 'cancel',
  };

  Dragger._activeInstances = [];

  /**
   * Protected static methods
   * ************************
   */

  Dragger._preventDefault = function (e) {
    if (e.preventDefault && e.cancelable !== false) e.preventDefault();
  };

  Dragger._activateInstance = function (instance) {
    var index = Dragger._activeInstances.indexOf(instance);
    if (index > -1) return;

    Dragger._activeInstances.push(instance);
    Dragger._emitter.on(Dragger._emitterEvents.move, instance._onMove);
    Dragger._emitter.on(Dragger._emitterEvents.cancel, instance._onCancel);
    Dragger._emitter.on(Dragger._emitterEvents.end, instance._onEnd);

    if (Dragger._activeInstances.length === 1) {
      Dragger._bindListeners();
    }
  };

  Dragger._deactivateInstance = function (instance) {
    var index = Dragger._activeInstances.indexOf(instance);
    if (index === -1) return;

    Dragger._activeInstances.splice(index, 1);
    Dragger._emitter.off(Dragger._emitterEvents.move, instance._onMove);
    Dragger._emitter.off(Dragger._emitterEvents.cancel, instance._onCancel);
    Dragger._emitter.off(Dragger._emitterEvents.end, instance._onEnd);

    if (!Dragger._activeInstances.length) {
      Dragger._unbindListeners();
    }
  };

  Dragger._bindListeners = function () {
    window.addEventListener(Dragger._inputEvents.move, Dragger._onMove, listenerOptions);
    window.addEventListener(Dragger._inputEvents.end, Dragger._onEnd, listenerOptions);
    if (Dragger._inputEvents.cancel) {
      window.addEventListener(Dragger._inputEvents.cancel, Dragger._onCancel, listenerOptions);
    }
  };

  Dragger._unbindListeners = function () {
    window.removeEventListener(Dragger._inputEvents.move, Dragger._onMove, listenerOptions);
    window.removeEventListener(Dragger._inputEvents.end, Dragger._onEnd, listenerOptions);
    if (Dragger._inputEvents.cancel) {
      window.removeEventListener(Dragger._inputEvents.cancel, Dragger._onCancel, listenerOptions);
    }
  };

  Dragger._getEventPointerId = function (event) {
    // If we have pointer id available let's use it.
    if (typeof event.pointerId === 'number') {
      return event.pointerId;
    }

    // For touch events let's get the first changed touch's identifier.
    if (event.changedTouches) {
      return event.changedTouches[0] ? event.changedTouches[0].identifier : null;
    }

    // For mouse/other events let's provide a static id.
    return 1;
  };

  Dragger._getTouchById = function (event, id) {
    // If we have a pointer event return the whole event if there's a match, and
    // null otherwise.
    if (typeof event.pointerId === 'number') {
      return event.pointerId === id ? event : null;
    }

    // For touch events let's check if there's a changed touch object that matches
    // the pointerId in which case return the touch object.
    if (event.changedTouches) {
      for (var i = 0; i < event.changedTouches.length; i++) {
        if (event.changedTouches[i].identifier === id) {
          return event.changedTouches[i];
        }
      }
      return null;
    }

    // For mouse/other events let's assume there's only one pointer and just
    // return the event.
    return event;
  };

  Dragger._onMove = function (e) {
    Dragger._emitter.emit(Dragger._emitterEvents.move, e);
  };

  Dragger._onCancel = function (e) {
    Dragger._emitter.emit(Dragger._emitterEvents.cancel, e);
  };

  Dragger._onEnd = function (e) {
    Dragger._emitter.emit(Dragger._emitterEvents.end, e);
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Reset current drag operation (if any).
   *
   * @private
   */
  Dragger.prototype._reset = function () {
    this._pointerId = null;
    this._startTime = 0;
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;
    this._isActive = false;
    Dragger._deactivateInstance(this);
  };

  /**
   * Create a custom dragger event from a raw event.
   *
   * @private
   * @param {String} type
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   * @returns {Object}
   */
  Dragger.prototype._createEvent = function (type, e) {
    var touch = this._getTrackedTouch(e);
    return {
      // Hammer.js compatibility interface.
      type: type,
      srcEvent: e,
      distance: this.getDistance(),
      deltaX: this.getDeltaX(),
      deltaY: this.getDeltaY(),
      deltaTime: type === Dragger._emitterEvents.start ? 0 : this.getDeltaTime(),
      isFirst: type === Dragger._emitterEvents.start,
      isFinal: type === Dragger._emitterEvents.end || type === Dragger._emitterEvents.cancel,
      pointerType: e.pointerType || (e.touches ? 'touch' : 'mouse'),
      // Partial Touch API interface.
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

  /**
   * Emit a raw event as dragger event internally.
   *
   * @private
   * @param {String} type
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._emit = function (type, e) {
    this._emitter.emit(type, this._createEvent(type, e));
  };

  /**
   * If the provided event is a PointerEvent this method will return it if it has
   * the same pointerId as the instance. If the provided event is a TouchEvent
   * this method will try to look for a Touch instance in the changedTouches that
   * has an identifier matching this instance's pointerId. If the provided event
   * is a MouseEvent (or just any other event than PointerEvent or TouchEvent)
   * it will be returned immediately.
   *
   * @private
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   * @returns {?(Touch|PointerEvent|MouseEvent)}
   */
  Dragger.prototype._getTrackedTouch = function (e) {
    if (this._pointerId === null) return null;
    return Dragger._getTouchById(e, this._pointerId);
  };

  /**
   * Handler for start event.
   *
   * @private
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._onStart = function (e) {
    if (this._isDestroyed) return;

    // If pointer id is already assigned let's return early.
    if (this._pointerId !== null) return;

    // Get (and set) pointer id.
    this._pointerId = Dragger._getEventPointerId(e);
    if (this._pointerId === null) return;

    // Setup initial data and emit start event.
    var touch = this._getTrackedTouch(e);
    this._startX = this._currentX = touch.clientX;
    this._startY = this._currentY = touch.clientY;
    this._startTime = Date.now();
    this._isActive = true;
    this._emit(Dragger._emitterEvents.start, e);

    // If the drag procedure was not reset within the start procedure let's
    // activate the instance (start listening to move/cancel/end events).
    if (this._isActive) {
      Dragger._activateInstance(this);
    }
  };

  /**
   * Handler for move event.
   *
   * @private
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._onMove = function (e) {
    var touch = this._getTrackedTouch(e);
    if (!touch) return;
    this._currentX = touch.clientX;
    this._currentY = touch.clientY;
    this._emit(Dragger._emitterEvents.move, e);
  };

  /**
   * Handler for cancel event.
   *
   * @private
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._onCancel = function (e) {
    if (!this._getTrackedTouch(e)) return;
    this._emit(Dragger._emitterEvents.cancel, e);
    this._reset();
  };

  /**
   * Handler for end event.
   *
   * @private
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._onEnd = function (e) {
    if (!this._getTrackedTouch(e)) return;
    this._emit(Dragger._emitterEvents.end, e);
    this._reset();
  };

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Check if the element is being dragged at the moment.
   *
   * @public
   * @returns {Boolean}
   */
  Dragger.prototype.isActive = function () {
    return this._isActive;
  };

  /**
   * Set element's touch-action CSS property.
   *
   * @public
   * @param {String} value
   */
  Dragger.prototype.setTouchAction = function (value) {
    // Store unmodified touch action value (we trust user input here).
    this._touchAction = value;

    // Set touch-action style.
    if (taPropPrefixed) {
      this._cssProps[taPropPrefixed] = '';
      this._element.style[taPropPrefixed] = value;
    }

    // If we have an unsupported touch-action value let's add a special listener
    // that prevents default action on touch start event. A dirty hack, but best
    // we can do for now. The other options would be to somehow polyfill the
    // unsupported touch action behavior with custom heuristics which sounds like
    // a can of worms. We do a special exception here for Firefox Android which's
    // touch-action does not work properly if the dragged element is moved in the
    // the DOM tree on touchstart.
    if (HAS_TOUCH_EVENTS) {
      this._element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, true);
      if (this._element.style[taPropPrefixed] !== value || (isFirefox && isAndroid)) {
        this._element.addEventListener(Dragger._touchEvents.start, Dragger._preventDefault, true);
      }
    }
  };

  /**
   * Update element's CSS properties. Accepts an object with camel cased style
   * props with value pairs as it's first argument.
   *
   * @public
   * @param {Object} [newProps]
   */
  Dragger.prototype.setCssProps = function (newProps) {
    if (!newProps) return;

    var currentProps = this._cssProps;
    var element = this._element;
    var prop;
    var prefixedProp;

    // Reset current props.
    for (prop in currentProps) {
      element.style[prop] = currentProps[prop];
      delete currentProps[prop];
    }

    // Set new props.
    for (prop in newProps) {
      // Make sure we have a value for the prop.
      if (!newProps[prop]) continue;

      // Special handling for touch-action.
      if (prop === taProp) {
        this.setTouchAction(newProps[prop]);
        continue;
      }

      // Get prefixed prop and skip if it does not exist.
      prefixedProp = getPrefixedPropName(element.style, prop);
      if (!prefixedProp) continue;

      // Store the prop and add the style.
      currentProps[prefixedProp] = '';
      element.style[prefixedProp] = newProps[prop];
    }
  };

  /**
   * How much the pointer has moved on x-axis from start position, in pixels.
   * Positive value indicates movement from left to right.
   *
   * @public
   * @returns {Number}
   */
  Dragger.prototype.getDeltaX = function () {
    return this._currentX - this._startX;
  };

  /**
   * How much the pointer has moved on y-axis from start position, in pixels.
   * Positive value indicates movement from top to bottom.
   *
   * @public
   * @returns {Number}
   */
  Dragger.prototype.getDeltaY = function () {
    return this._currentY - this._startY;
  };

  /**
   * How far (in pixels) has pointer moved from start position.
   *
   * @public
   * @returns {Number}
   */
  Dragger.prototype.getDistance = function () {
    var x = this.getDeltaX();
    var y = this.getDeltaY();
    return Math.sqrt(x * x + y * y);
  };

  /**
   * How long has pointer been dragged.
   *
   * @public
   * @returns {Number}
   */
  Dragger.prototype.getDeltaTime = function () {
    return this._startTime ? Date.now() - this._startTime : 0;
  };

  /**
   * Bind drag event listeners.
   *
   * @public
   * @param {String} eventName
   *   - 'start', 'move', 'cancel' or 'end'.
   * @param {Function} listener
   */
  Dragger.prototype.on = function (eventName, listener) {
    this._emitter.on(eventName, listener);
  };

  /**
   * Unbind drag event listeners.
   *
   * @public
   * @param {String} eventName
   *   - 'start', 'move', 'cancel' or 'end'.
   * @param {Function} listener
   */
  Dragger.prototype.off = function (eventName, listener) {
    this._emitter.off(eventName, listener);
  };

  /**
   * Destroy the instance and unbind all drag event listeners.
   *
   * @public
   */
  Dragger.prototype.destroy = function () {
    if (this._isDestroyed) return;

    var element = this._element;

    if (this._edgeHack) this._edgeHack.destroy();

    // Reset data and deactivate the instance.
    this._reset();

    // Destroy emitter.
    this._emitter.destroy();

    // Unbind event handlers.
    element.removeEventListener(Dragger._inputEvents.start, this._onStart, listenerOptions);
    element.removeEventListener('dragstart', Dragger._preventDefault, false);
    element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, true);

    // Reset styles.
    for (var prop in this._cssProps) {
      element.style[prop] = this._cssProps[prop];
      delete this._cssProps[prop];
    }

    // Reset data.
    this._element = null;

    // Mark as destroyed.
    this._isDestroyed = true;
  };

  var dt = 1000 / 60;

  var raf = (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      return this.setTimeout(function () {
        callback(Date.now());
      }, dt);
    }
  ).bind(window);

  /**
   * A ticker system for handling DOM reads and writes in an efficient way.
   *
   * @class
   */
  function Ticker(numLanes) {
    this._nextStep = null;
    this._lanes = [];
    this._stepQueue = [];
    this._stepCallbacks = {};
    this._step = this._step.bind(this);
    for (var i = 0; i < numLanes; i++) {
      this._lanes.push(new TickerLane());
    }
  }

  Ticker.prototype._step = function (time) {
    var lanes = this._lanes;
    var stepQueue = this._stepQueue;
    var stepCallbacks = this._stepCallbacks;
    var i, j, id, laneQueue, laneCallbacks, laneIndices;

    this._nextStep = null;

    for (i = 0; i < lanes.length; i++) {
      laneQueue = lanes[i].queue;
      laneCallbacks = lanes[i].callbacks;
      laneIndices = lanes[i].indices;
      for (j = 0; j < laneQueue.length; j++) {
        id = laneQueue[j];
        if (!id) continue;
        stepQueue.push(id);
        stepCallbacks[id] = laneCallbacks[id];
        delete laneCallbacks[id];
        delete laneIndices[id];
      }
      laneQueue.length = 0;
    }

    for (i = 0; i < stepQueue.length; i++) {
      id = stepQueue[i];
      if (stepCallbacks[id]) stepCallbacks[id](time);
      delete stepCallbacks[id];
    }

    stepQueue.length = 0;
  };

  Ticker.prototype.add = function (laneIndex, id, callback) {
    this._lanes[laneIndex].add(id, callback);
    if (!this._nextStep) this._nextStep = raf(this._step);
  };

  Ticker.prototype.remove = function (laneIndex, id) {
    this._lanes[laneIndex].remove(id);
  };

  /**
   * A lane for ticker.
   *
   * @class
   */
  function TickerLane() {
    this.queue = [];
    this.indices = {};
    this.callbacks = {};
  }

  TickerLane.prototype.add = function (id, callback) {
    var index = this.indices[id];
    if (index !== undefined) this.queue[index] = undefined;
    this.queue.push(id);
    this.callbacks[id] = callback;
    this.indices[id] = this.queue.length - 1;
  };

  TickerLane.prototype.remove = function (id) {
    var index = this.indices[id];
    if (index === undefined) return;
    this.queue[index] = undefined;
    delete this.callbacks[id];
    delete this.indices[id];
  };

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

  var AXIS_X = 1;
  var AXIS_Y = 2;
  var FORWARD = 4;
  var BACKWARD = 8;
  var LEFT = AXIS_X | BACKWARD;
  var RIGHT = AXIS_X | FORWARD;
  var UP = AXIS_Y | BACKWARD;
  var DOWN = AXIS_Y | FORWARD;

  var functionType = 'function';

  /**
   * Check if a value is a function.
   *
   * @param {*} val
   * @returns {Boolean}
   */
  function isFunction(val) {
    return typeof val === functionType;
  }

  var isWeakMapSupported = typeof WeakMap === 'function';
  var cache$1 = isWeakMapSupported ? new WeakMap() : null;
  var cacheInterval = 3000;
  var cacheTimer;
  var canClearCache = true;
  var clearCache = function () {
    if (canClearCache) {
      cacheTimer = window.clearInterval(cacheTimer);
      cache$1 = isWeakMapSupported ? new WeakMap() : null;
    } else {
      canClearCache = true;
    }
  };

  /**
   * Returns the computed value of an element's style property as a string.
   *
   * @param {HTMLElement} element
   * @param {String} style
   * @returns {String}
   */
  function getStyle(element, style) {
    var styles = cache$1 && cache$1.get(element);

    if (!styles) {
      styles = window.getComputedStyle(element, null);
      if (cache$1) cache$1.set(element, styles);
    }

    if (cache$1) {
      if (!cacheTimer) {
        cacheTimer = window.setInterval(clearCache, cacheInterval);
      } else {
        canClearCache = false;
      }
    }

    return styles.getPropertyValue(style);
  }

  /**
   * Returns the computed value of an element's style property transformed into
   * a float value.
   *
   * @param {HTMLElement} el
   * @param {String} style
   * @returns {Number}
   */
  function getStyleAsFloat(el, style) {
    return parseFloat(getStyle(el, style)) || 0;
  }

  var DOC_ELEM = document.documentElement;
  var BODY = document.body;
  var THRESHOLD_DATA = { value: 0, offset: 0 };

  /**
   * @param {HTMLElement|Window} element
   * @returns {HTMLElement|Window}
   */
  function getScrollElement(element) {
    if (element === window || element === DOC_ELEM || element === BODY) {
      return window;
    } else {
      return element;
    }
  }

  /**
   * @param {HTMLElement|Window} element
   * @returns {Number}
   */
  function getScrollLeft(element) {
    return element === window ? element.pageXOffset : element.scrollLeft;
  }

  /**
   * @param {HTMLElement|Window} element
   * @returns {Number}
   */
  function getScrollTop(element) {
    return element === window ? element.pageYOffset : element.scrollTop;
  }

  /**
   * @param {HTMLElement|Window} element
   * @returns {Number}
   */
  function getScrollLeftMax(element) {
    if (element === window) {
      return DOC_ELEM.scrollWidth - DOC_ELEM.clientWidth;
    } else {
      return element.scrollWidth - element.clientWidth;
    }
  }

  /**
   * @param {HTMLElement|Window} element
   * @returns {Number}
   */
  function getScrollTopMax(element) {
    if (element === window) {
      return DOC_ELEM.scrollHeight - DOC_ELEM.clientHeight;
    } else {
      return element.scrollHeight - element.clientHeight;
    }
  }

  /**
   * Get window's or element's client rectangle data relative to the element's
   * content dimensions (includes inner size + padding, excludes scrollbars,
   * borders and margins).
   *
   * @param {HTMLElement|Window} element
   * @returns {Rectangle}
   */
  function getContentRect(element, result) {
    result = result || {};

    if (element === window) {
      result.width = DOC_ELEM.clientWidth;
      result.height = DOC_ELEM.clientHeight;
      result.left = 0;
      result.right = result.width;
      result.top = 0;
      result.bottom = result.height;
    } else {
      var bcr = element.getBoundingClientRect();
      var borderLeft = element.clientLeft || getStyleAsFloat(element, 'border-left-width');
      var borderTop = element.clientTop || getStyleAsFloat(element, 'border-top-width');
      result.width = element.clientWidth;
      result.height = element.clientHeight;
      result.left = bcr.left + borderLeft;
      result.right = result.left + result.width;
      result.top = bcr.top + borderTop;
      result.bottom = result.top + result.height;
    }

    return result;
  }

  /**
   * @param {Item} item
   * @returns {Object}
   */
  function getItemAutoScrollSettings(item) {
    return item._drag._getGrid()._settings.dragAutoScroll;
  }

  /**
   * @param {Item} item
   */
  function prepareItemScrollSync(item) {
    if (!item._drag) return;
    item._drag._prepareScroll();
  }

  /**
   * @param {Item} item
   */
  function applyItemScrollSync(item) {
    if (!item._drag || !item._isActive) return;
    var drag = item._drag;
    drag._scrollDiffX = drag._scrollDiffY = 0;
    item._setTranslate(drag._left, drag._top);
  }

  /**
   * Compute threshold value and edge offset.
   *
   * @param {Number} threshold
   * @param {Number} safeZone
   * @param {Number} itemSize
   * @param {Number} targetSize
   * @returns {Object}
   */
  function computeThreshold(threshold, safeZone, itemSize, targetSize) {
    THRESHOLD_DATA.value = Math.min(targetSize / 2, threshold);
    THRESHOLD_DATA.offset =
      Math.max(0, itemSize + THRESHOLD_DATA.value * 2 + targetSize * safeZone - targetSize) / 2;
    return THRESHOLD_DATA;
  }

  function ScrollRequest() {
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

  function ScrollAction() {
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

  function Pool(createItem, releaseItem) {
    this.pool = [];
    this.createItem = createItem;
    this.releaseItem = releaseItem;
  }

  Pool.prototype.pick = function () {
    return this.pool.pop() || this.createItem();
  };

  Pool.prototype.release = function (item) {
    this.releaseItem(item);
    if (this.pool.indexOf(item) !== -1) return;
    this.pool.push(item);
  };

  Pool.prototype.reset = function () {
    this.pool.length = 0;
  };

  /**
   * Check if two rectangles are overlapping.
   *
   * @param {Object} a
   * @param {Object} b
   * @returns {Number}
   */
  function isOverlapping(a, b) {
    return !(
      a.left + a.width <= b.left ||
      b.left + b.width <= a.left ||
      a.top + a.height <= b.top ||
      b.top + b.height <= a.top
    );
  }

  /**
   * Calculate intersection area between two rectangle.
   *
   * @param {Object} a
   * @param {Object} b
   * @returns {Number}
   */
  function getIntersectionArea(a, b) {
    if (!isOverlapping(a, b)) return 0;
    var width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
    var height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
    return width * height;
  }

  /**
   * Calculate how many percent the intersection area of two rectangles is from
   * the maximum potential intersection area between the rectangles.
   *
   * @param {Object} a
   * @param {Object} b
   * @returns {Number}
   */
  function getIntersectionScore(a, b) {
    var area = getIntersectionArea(a, b);
    if (!area) return 0;
    var maxArea = Math.min(a.width, b.width) * Math.min(a.height, b.height);
    return (area / maxArea) * 100;
  }

  var RECT_1 = {
    width: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  var RECT_2 = {
    width: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  function AutoScroller() {
    this._isDestroyed = false;
    this._isTicking = false;
    this._tickTime = 0;
    this._tickDeltaTime = 0;
    this._items = [];
    this._actions = [];
    this._requests = {};
    this._requests[AXIS_X] = {};
    this._requests[AXIS_Y] = {};
    this._requestOverlapCheck = {};
    this._dragPositions = {};
    this._dragDirections = {};
    this._overlapCheckInterval = 150;

    this._requestPool = new Pool(
      function () {
        return new ScrollRequest();
      },
      function (request) {
        request.reset();
      }
    );

    this._actionPool = new Pool(
      function () {
        return new ScrollAction();
      },
      function (action) {
        action.reset();
      }
    );

    this._readTick = this._readTick.bind(this);
    this._writeTick = this._writeTick.bind(this);
  }

  AutoScroller.AXIS_X = AXIS_X;
  AutoScroller.AXIS_Y = AXIS_Y;
  AutoScroller.FORWARD = FORWARD;
  AutoScroller.BACKWARD = BACKWARD;
  AutoScroller.LEFT = LEFT;
  AutoScroller.RIGHT = RIGHT;
  AutoScroller.UP = UP;
  AutoScroller.DOWN = DOWN;

  AutoScroller.smoothSpeed = function (maxSpeed, acceleration, deceleration) {
    return function (item, element, data) {
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

  AutoScroller.pointerHandle = function (pointerSize) {
    var rect = { left: 0, top: 0, width: 0, height: 0 };
    var size = pointerSize || 1;
    return function (item, x, y, w, h, pX, pY) {
      rect.left = pX - size * 0.5;
      rect.top = pY - size * 0.5;
      rect.width = size;
      rect.height = size;
      return rect;
    };
  };

  AutoScroller.prototype._readTick = function (time) {
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
  };

  AutoScroller.prototype._writeTick = function () {
    if (this._isDestroyed) return;
    this._applyActions();
    addAutoScrollTick(this._readTick, this._writeTick);
  };

  AutoScroller.prototype._startTicking = function () {
    this._isTicking = true;
    addAutoScrollTick(this._readTick, this._writeTick);
  };

  AutoScroller.prototype._stopTicking = function () {
    this._isTicking = false;
    this._tickTime = 0;
    this._tickDeltaTime = 0;
    cancelAutoScrollTick();
  };

  AutoScroller.prototype._getItemHandleRect = function (item, handle, rect) {
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

  AutoScroller.prototype._requestItemScroll = function (
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
      request = this._requestPool.pick();
    }

    request.item = item;
    request.element = element;
    request.direction = direction;
    request.threshold = threshold;
    request.distance = distance;
    request.maxValue = maxValue;
    reqMap[item._id] = request;
  };

  AutoScroller.prototype._cancelItemScroll = function (item, axis) {
    var reqMap = this._requests[axis];
    var request = reqMap[item._id];
    if (!request) return;
    if (request.action) request.action.removeRequest(request);
    this._requestPool.release(request);
    delete reqMap[item._id];
  };

  AutoScroller.prototype._checkItemOverlap = function (item, checkX, checkY) {
    var settings = getItemAutoScrollSettings(item);
    var targets = isFunction(settings.targets) ? settings.targets(item) : settings.targets;
    var threshold = settings.threshold;
    var safeZone = settings.safeZone;

    if (!targets || !targets.length) {
      checkX && this._cancelItemScroll(item, AXIS_X);
      checkY && this._cancelItemScroll(item, AXIS_Y);
      return;
    }

    var dragDirections = this._dragDirections[item._id];
    var dragDirectionX = dragDirections[0];
    var dragDirectionY = dragDirections[1];

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
          typeof target.threshold === 'number' ? target.threshold : threshold,
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
          typeof target.threshold === 'number' ? target.threshold : threshold,
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

  AutoScroller.prototype._updateScrollRequest = function (scrollRequest) {
    var item = scrollRequest.item;
    var settings = getItemAutoScrollSettings(item);
    var targets = isFunction(settings.targets) ? settings.targets(item) : settings.targets;
    var targetCount = (targets && targets.length) || 0;
    var threshold = settings.threshold;
    var safeZone = settings.safeZone;
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

    for (var i = 0; i < targetCount; i++) {
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
      testThreshold = computeThreshold(
        typeof target.threshold === 'number' ? target.threshold : threshold,
        safeZone,
        testIsAxisX ? itemRect.width : itemRect.height,
        testIsAxisX ? testRect.width : testRect.height
      );

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

    // Before we end the request, let's see if we need to stop the scrolling
    // smoothly or immediately.
    if (settings.smoothStop === true && scrollRequest.speed > 0) {
      if (hasReachedEnd === null) hasReachedEnd = scrollRequest.hasReachedEnd();
      scrollRequest.isEnding = hasReachedEnd ? false : true;
    } else {
      scrollRequest.isEnding = false;
    }

    return scrollRequest.isEnding;
  };

  AutoScroller.prototype._updateRequests = function () {
    var items = this._items;
    var requestsX = this._requests[AXIS_X];
    var requestsY = this._requests[AXIS_Y];
    var item, reqX, reqY, checkTime, needsCheck, checkX, checkY;

    for (var i = 0; i < items.length; i++) {
      item = items[i];
      checkTime = this._requestOverlapCheck[item._id];
      needsCheck = checkTime > 0 && this._tickTime - checkTime > this._overlapCheckInterval;

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

  AutoScroller.prototype._requestAction = function (request, axis) {
    var actions = this._actions;
    var isAxisX = axis === AXIS_X;
    var action = null;

    for (var i = 0; i < actions.length; i++) {
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
        this._cancelItemScroll(request.item, axis);
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
  };

  AutoScroller.prototype._updateActions = function () {
    var items = this._items;
    var requests = this._requests;
    var actions = this._actions;
    var itemId;
    var reqX;
    var reqY;
    var i;

    // Generate actions.
    for (i = 0; i < items.length; i++) {
      itemId = items[i]._id;
      reqX = requests[AXIS_X][itemId];
      reqY = requests[AXIS_Y][itemId];
      if (reqX) this._requestAction(reqX, AXIS_X);
      if (reqY) this._requestAction(reqY, AXIS_Y);
    }

    // Compute actions' scroll values.
    for (i = 0; i < actions.length; i++) {
      actions[i].computeScrollValues();
    }
  };

  AutoScroller.prototype._applyActions = function () {
    var actions = this._actions;
    var items = this._items;
    var i;

    // No actions -> no scrolling.
    if (!actions.length) return;

    // Scroll all the required elements.
    for (i = 0; i < actions.length; i++) {
      actions[i].scroll();
      this._actionPool.release(actions[i]);
    }

    // Reset actions.
    actions.length = 0;

    // Sync the item position immediately after all the auto-scrolling business is
    // finished. Without this procedure the items will jitter during auto-scroll
    // (in some cases at least) since the drag scroll handler is async (bound to
    // raf tick). Note that this procedure should not emit any dragScroll events,
    // because otherwise they would be emitted twice for the same event.
    for (i = 0; i < items.length; i++) prepareItemScrollSync(items[i]);
    for (i = 0; i < items.length; i++) applyItemScrollSync(items[i]);
  };

  AutoScroller.prototype._updateDragDirection = function (item) {
    var dragPositions = this._dragPositions[item._id];
    var dragDirections = this._dragDirections[item._id];
    var x1 = item._drag._left;
    var y1 = item._drag._top;
    if (dragPositions.length) {
      var x2 = dragPositions[0];
      var y2 = dragPositions[1];
      dragDirections[0] = x1 > x2 ? RIGHT : x1 < x2 ? LEFT : dragDirections[0] || 0;
      dragDirections[1] = y1 > y2 ? DOWN : y1 < y2 ? UP : dragDirections[1] || 0;
    }
    dragPositions[0] = x1;
    dragPositions[1] = y1;
  };

  AutoScroller.prototype.addItem = function (item) {
    if (this._isDestroyed) return;
    var index = this._items.indexOf(item);
    if (index === -1) {
      this._items.push(item);
      this._requestOverlapCheck[item._id] = this._tickTime;
      this._dragDirections[item._id] = [0, 0];
      this._dragPositions[item._id] = [];
      if (!this._isTicking) this._startTicking();
    }
  };

  AutoScroller.prototype.updateItem = function (item) {
    if (this._isDestroyed) return;
    this._updateDragDirection(item);
    if (!this._requestOverlapCheck[item._id]) {
      this._requestOverlapCheck[item._id] = this._tickTime;
    }
  };

  AutoScroller.prototype.removeItem = function (item) {
    if (this._isDestroyed) return;

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

    delete this._requestOverlapCheck[itemId];
    delete this._dragPositions[itemId];
    delete this._dragDirections[itemId];
    this._items.splice(index, 1);

    if (this._isTicking && !this._items.length) {
      this._stopTicking();
    }
  };

  AutoScroller.prototype.isItemScrollingX = function (item) {
    var reqX = this._requests[AXIS_X][item._id];
    return !!(reqX && reqX.isActive);
  };

  AutoScroller.prototype.isItemScrollingY = function (item) {
    var reqY = this._requests[AXIS_Y][item._id];
    return !!(reqY && reqY.isActive);
  };

  AutoScroller.prototype.isItemScrolling = function (item) {
    return this.isItemScrollingX(item) || this.isItemScrollingY(item);
  };

  AutoScroller.prototype.destroy = function () {
    if (this._isDestroyed) return;

    var items = this._items.slice(0);
    for (var i = 0; i < items.length; i++) {
      this.removeItem(items[i]);
    }

    this._actions.length = 0;
    this._requestPool.reset();
    this._actionPool.reset();

    this._isDestroyed = true;
  };

  var ElProto = window.Element.prototype;
  var matchesFn =
    ElProto.matches ||
    ElProto.matchesSelector ||
    ElProto.webkitMatchesSelector ||
    ElProto.mozMatchesSelector ||
    ElProto.msMatchesSelector ||
    ElProto.oMatchesSelector ||
    function () {
      return false;
    };

  /**
   * Check if element matches a CSS selector.
   *
   * @param {Element} el
   * @param {String} selector
   * @returns {Boolean}
   */
  function elementMatches(el, selector) {
    return matchesFn.call(el, selector);
  }

  /**
   * Add class to an element.
   *
   * @param {HTMLElement} element
   * @param {String} className
   */
  function addClass(element, className) {
    if (!className) return;

    if (element.classList) {
      element.classList.add(className);
    } else {
      if (!elementMatches(element, '.' + className)) {
        element.className += ' ' + className;
      }
    }
  }

  var tempArray = [];
  var numberType = 'number';

  /**
   * Insert an item or an array of items to array to a specified index. Mutates
   * the array. The index can be negative in which case the items will be added
   * to the end of the array.
   *
   * @param {Array} array
   * @param {*} items
   * @param {Number} [index=-1]
   */
  function arrayInsert(array, items, index) {
    var startIndex = typeof index === numberType ? index : -1;
    if (startIndex < 0) startIndex = array.length - startIndex + 1;

    array.splice.apply(array, tempArray.concat(startIndex, 0, items));
    tempArray.length = 0;
  }

  /**
   * Normalize array index. Basically this function makes sure that the provided
   * array index is within the bounds of the provided array and also transforms
   * negative index to the matching positive index. The third (optional) argument
   * allows you to define offset for array's length in case you are adding items
   * to the array or removing items from the array.
   *
   * @param {Array} array
   * @param {Number} index
   * @param {Number} [sizeOffset]
   */
  function normalizeArrayIndex(array, index, sizeOffset) {
    var maxIndex = Math.max(0, array.length - 1 + (sizeOffset || 0));
    return index > maxIndex ? maxIndex : index < 0 ? Math.max(maxIndex + index + 1, 0) : index;
  }

  /**
   * Move array item to another index.
   *
   * @param {Array} array
   * @param {Number} fromIndex
   *   - Index (positive or negative) of the item that will be moved.
   * @param {Number} toIndex
   *   - Index (positive or negative) where the item should be moved to.
   */
  function arrayMove(array, fromIndex, toIndex) {
    // Make sure the array has two or more items.
    if (array.length < 2) return;

    // Normalize the indices.
    var from = normalizeArrayIndex(array, fromIndex);
    var to = normalizeArrayIndex(array, toIndex);

    // Add target item to the new position.
    if (from !== to) {
      array.splice(to, 0, array.splice(from, 1)[0]);
    }
  }

  /**
   * Swap array items.
   *
   * @param {Array} array
   * @param {Number} index
   *   - Index (positive or negative) of the item that will be swapped.
   * @param {Number} withIndex
   *   - Index (positive or negative) of the other item that will be swapped.
   */
  function arraySwap(array, index, withIndex) {
    // Make sure the array has two or more items.
    if (array.length < 2) return;

    // Normalize the indices.
    var indexA = normalizeArrayIndex(array, index);
    var indexB = normalizeArrayIndex(array, withIndex);
    var temp;

    // Swap the items.
    if (indexA !== indexB) {
      temp = array[indexA];
      array[indexA] = array[indexB];
      array[indexB] = temp;
    }
  }

  var transformProp = getPrefixedPropName(document.documentElement.style, 'transform') || 'transform';

  var styleNameRegEx = /([A-Z])/g;
  var prefixRegex = /^(webkit-|moz-|ms-|o-)/;
  var msPrefixRegex = /^(-m-s-)/;

  /**
   * Transforms a camel case style property to kebab case style property. Handles
   * vendor prefixed properties elegantly as well, e.g. "WebkitTransform" and
   * "webkitTransform" are both transformed into "-webkit-transform".
   *
   * @param {String} property
   * @returns {String}
   */
  function getStyleName(property) {
    // Initial slicing, turns "fooBarProp" into "foo-bar-prop".
    var styleName = property.replace(styleNameRegEx, '-$1').toLowerCase();

    // Handle properties that start with "webkit", "moz", "ms" or "o" prefix (we
    // need to add an extra '-' to the beginnig).
    styleName = styleName.replace(prefixRegex, '-$1');

    // Handle properties that start with "MS" prefix (we need to transform the
    // "-m-s-" into "-ms-").
    styleName = styleName.replace(msPrefixRegex, '-ms-');

    return styleName;
  }

  var transformStyle = getStyleName(transformProp);

  var transformNone = 'none';
  var displayInline = 'inline';
  var displayNone = 'none';
  var displayStyle = 'display';

  /**
   * Returns true if element is transformed, false if not. In practice the
   * element's display value must be anything else than "none" or "inline" as
   * well as have a valid transform value applied in order to be counted as a
   * transformed element.
   *
   * Borrowed from Mezr (v0.6.1):
   * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L661
   *
   * @param {HTMLElement} element
   * @returns {Boolean}
   */
  function isTransformed(element) {
    var transform = getStyle(element, transformStyle);
    if (!transform || transform === transformNone) return false;

    var display = getStyle(element, displayStyle);
    if (display === displayInline || display === displayNone) return false;

    return true;
  }

  /**
   * Returns an absolute positioned element's containing block, which is
   * considered to be the closest ancestor element that the target element's
   * positioning is relative to. Disclaimer: this only works as intended for
   * absolute positioned elements.
   *
   * @param {HTMLElement} element
   * @returns {(Document|Element)}
   */
  function getContainingBlock(element) {
    // As long as the containing block is an element, static and not
    // transformed, try to get the element's parent element and fallback to
    // document. https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L339
    var doc = document;
    var res = element || doc;
    while (res && res !== doc && getStyle(res, 'position') === 'static' && !isTransformed(res)) {
      res = res.parentElement || doc;
    }
    return res;
  }

  var offsetA = {};
  var offsetB = {};
  var offsetDiff = {};

  /**
   * Returns the element's document offset, which in practice means the vertical
   * and horizontal distance between the element's northwest corner and the
   * document's northwest corner. Note that this function always returns the same
   * object so be sure to read the data from it instead using it as a reference.
   *
   * @param {(Document|Element|Window)} element
   * @param {Object} [offsetData]
   *   - Optional data object where the offset data will be inserted to. If not
   *     provided a new object will be created for the return data.
   * @returns {Object}
   */
  function getOffset(element, offsetData) {
    var offset = offsetData || {};
    var rect;

    // Set up return data.
    offset.left = 0;
    offset.top = 0;

    // Document's offsets are always 0.
    if (element === document) return offset;

    // Add viewport scroll left/top to the respective offsets.
    offset.left = window.pageXOffset || 0;
    offset.top = window.pageYOffset || 0;

    // Window's offsets are the viewport scroll left/top values.
    if (element.self === window.self) return offset;

    // Add element's client rects to the offsets.
    rect = element.getBoundingClientRect();
    offset.left += rect.left;
    offset.top += rect.top;

    // Exclude element's borders from the offset.
    offset.left += getStyleAsFloat(element, 'border-left-width');
    offset.top += getStyleAsFloat(element, 'border-top-width');

    return offset;
  }

  /**
   * Calculate the offset difference two elements.
   *
   * @param {HTMLElement} elemA
   * @param {HTMLElement} elemB
   * @param {Boolean} [compareContainingBlocks=false]
   *   - When this is set to true the containing blocks of the provided elements
   *     will be used for calculating the difference. Otherwise the provided
   *     elements will be compared directly.
   * @returns {Object}
   */
  function getOffsetDiff(elemA, elemB, compareContainingBlocks) {
    offsetDiff.left = 0;
    offsetDiff.top = 0;

    // If elements are same let's return early.
    if (elemA === elemB) return offsetDiff;

    // Compare containing blocks if necessary.
    if (compareContainingBlocks) {
      elemA = getContainingBlock(elemA);
      elemB = getContainingBlock(elemB);

      // If containing blocks are identical, let's return early.
      if (elemA === elemB) return offsetDiff;
    }

    // Finally, let's calculate the offset diff.
    getOffset(elemA, offsetA);
    getOffset(elemB, offsetB);
    offsetDiff.left = offsetB.left - offsetA.left;
    offsetDiff.top = offsetB.top - offsetA.top;

    return offsetDiff;
  }

  /**
   * Check if overflow style value is scrollable.
   *
   * @param {String} value
   * @returns {Boolean}
   */
  function isScrollableOverflow(value) {
    return value === 'auto' || value === 'scroll' || value === 'overlay';
  }

  /**
   * Check if an element is scrollable.
   *
   * @param {HTMLElement} element
   * @returns {Boolean}
   */
  function isScrollable(element) {
    return (
      isScrollableOverflow(getStyle(element, 'overflow')) ||
      isScrollableOverflow(getStyle(element, 'overflow-x')) ||
      isScrollableOverflow(getStyle(element, 'overflow-y'))
    );
  }

  /**
   * Collect element's ancestors that are potentially scrollable elements. The
   * provided element is also also included in the check, meaning that if it is
   * scrollable it is added to the result array.
   *
   * @param {HTMLElement} element
   * @param {Array} [result]
   * @returns {Array}
   */
  function getScrollableAncestors(element, result) {
    result = result || [];

    // Find scroll parents.
    while (element && element !== document) {
      // If element is inside ShadowDOM let's get it's host node from the real
      // DOM and continue looping.
      if (element.getRootNode && element instanceof DocumentFragment) {
        element = element.getRootNode().host;
        continue;
      }

      // If element is scrollable let's add it to the scrollable list.
      if (isScrollable(element)) {
        result.push(element);
      }

      element = element.parentNode;
    }

    // Always add window to the results.
    result.push(window);

    return result;
  }

  var translateValue = {};
  var transformNone$1 = 'none';
  var rxMat3d = /^matrix3d/;
  var rxMatTx = /([^,]*,){4}/;
  var rxMat3dTx = /([^,]*,){12}/;
  var rxNextItem = /[^,]*,/;

  /**
   * Returns the element's computed translateX and translateY values as a floats.
   * The returned object is always the same object and updated every time this
   * function is called.
   *
   * @param {HTMLElement} element
   * @returns {Object}
   */
  function getTranslate(element) {
    translateValue.x = 0;
    translateValue.y = 0;

    var transform = getStyle(element, transformStyle);
    if (!transform || transform === transformNone$1) {
      return translateValue;
    }

    // Transform style can be in either matrix3d(...) or matrix(...).
    var isMat3d = rxMat3d.test(transform);
    var tX = transform.replace(isMat3d ? rxMat3dTx : rxMatTx, '');
    var tY = tX.replace(rxNextItem, '');

    translateValue.x = parseFloat(tX) || 0;
    translateValue.y = parseFloat(tY) || 0;

    return translateValue;
  }

  /**
   * Remove class from an element.
   *
   * @param {HTMLElement} element
   * @param {String} className
   */
  function removeClass(element, className) {
    if (!className) return;

    if (element.classList) {
      element.classList.remove(className);
    } else {
      if (elementMatches(element, '.' + className)) {
        element.className = (' ' + element.className + ' ')
          .replace(' ' + className + ' ', ' ')
          .trim();
      }
    }
  }

  var START_PREDICATE_INACTIVE = 0;
  var START_PREDICATE_PENDING = 1;
  var START_PREDICATE_RESOLVED = 2;
  var SCROLL_LISTENER_OPTIONS = hasPassiveEvents() ? { passive: true } : false;

  /**
   * Bind touch interaction to an item.
   *
   * @class
   * @param {Item} item
   */
  function ItemDrag(item) {
    var element = item._element;
    var grid = item.getGrid();
    var settings = grid._settings;

    this._item = item;
    this._gridId = grid._id;
    this._isDestroyed = false;
    this._isMigrating = false;

    // Start predicate data.
    this._startPredicate = isFunction(settings.dragStartPredicate)
      ? settings.dragStartPredicate
      : ItemDrag.defaultStartPredicate;
    this._startPredicateState = START_PREDICATE_INACTIVE;
    this._startPredicateResult = undefined;

    // Data for drag sort predicate heuristics.
    this._isSortNeeded = false;
    this._sortTimer = undefined;
    this._blockedSortIndex = null;
    this._sortX1 = 0;
    this._sortX2 = 0;
    this._sortY1 = 0;
    this._sortY2 = 0;

    // Setup item's initial drag data.
    this._reset();

    // Bind the methods that needs binding.
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

    // Get drag handle element.
    this._handle = (settings.dragHandle && element.querySelector(settings.dragHandle)) || element;

    // Init dragger.
    this._dragger = new Dragger(this._handle, settings.dragCssProps);
    this._dragger.on('start', this._preStartCheck);
    this._dragger.on('move', this._preStartCheck);
    this._dragger.on('cancel', this._preEndCheck);
    this._dragger.on('end', this._preEndCheck);
  }

  /**
   * Public properties
   * *****************
   */

  /**
   * @public
   * @static
   * @type {AutoScroller}
   */
  ItemDrag.autoScroller = new AutoScroller();

  /**
   * Public static methods
   * *********************
   */

  /**
   * Default drag start predicate handler that handles anchor elements
   * gracefully. The return value of this function defines if the drag is
   * started, rejected or pending. When true is returned the dragging is started
   * and when false is returned the dragging is rejected. If nothing is returned
   * the predicate will be called again on the next drag movement.
   *
   * @public
   * @static
   * @param {Item} item
   * @param {Object} event
   * @param {Object} [options]
   *   - An optional options object which can be used to pass the predicate
   *     it's options manually. By default the predicate retrieves the options
   *     from the grid's settings.
   * @returns {(Boolean|undefined)}
   */
  ItemDrag.defaultStartPredicate = function (item, event, options) {
    var drag = item._drag;

    // Make sure left button is pressed on mouse.
    if (event.isFirst && event.srcEvent.button) {
      return false;
    }

    // If the start event is trusted, non-cancelable and it's default action has
    // not been prevented it is in most cases a sign that the gesture would be
    // cancelled anyways right after it has started (e.g. starting drag while
    // the page is scrolling).
    if (
      event.isFirst &&
      event.srcEvent.isTrusted === true &&
      event.srcEvent.defaultPrevented === false &&
      event.srcEvent.cancelable === false
    ) {
      return false;
    }

    // Final event logic. At this stage return value does not matter anymore,
    // the predicate is either resolved or it's not and there's nothing to do
    // about it. Here we just reset data and if the item element is a link
    // we follow it (if there has only been slight movement).
    if (event.isFinal) {
      drag._finishStartPredicate(event);
      return;
    }

    // Setup predicate data from options if not already set.
    var predicate = drag._startPredicateData;
    if (!predicate) {
      var config = options || drag._getGrid()._settings.dragStartPredicate || {};
      drag._startPredicateData = predicate = {
        distance: Math.max(config.distance, 0) || 0,
        delay: Math.max(config.delay, 0) || 0,
      };
    }

    // If delay is defined let's keep track of the latest event and initiate
    // delay if it has not been done yet.
    if (predicate.delay) {
      predicate.event = event;
      if (!predicate.delayTimer) {
        predicate.delayTimer = window.setTimeout(function () {
          predicate.delay = 0;
          if (drag._resolveStartPredicate(predicate.event)) {
            drag._forceResolveStartPredicate(predicate.event);
            drag._resetStartPredicate();
          }
        }, predicate.delay);
      }
    }

    return drag._resolveStartPredicate(event);
  };

  /**
   * Default drag sort predicate.
   *
   * @public
   * @static
   * @param {Item} item
   * @param {Object} [options]
   * @param {Number} [options.threshold=50]
   * @param {String} [options.action='move']
   * @returns {?Object}
   *   - Returns `null` if no valid index was found. Otherwise returns drag sort
   *     command.
   */
  ItemDrag.defaultSortPredicate = (function () {
    var itemRect = {};
    var targetRect = {};
    var returnData = {};
    var gridsArray = [];
    var minThreshold = 1;
    var maxThreshold = 100;

    function getTargetGrid(item, rootGrid, threshold) {
      var target = null;
      var dragSort = rootGrid._settings.dragSort;
      var bestScore = -1;
      var gridScore;
      var grids;
      var grid;
      var container;
      var containerRect;
      var left;
      var top;
      var right;
      var bottom;
      var i;

      // Get potential target grids.
      if (dragSort === true) {
        gridsArray[0] = rootGrid;
        grids = gridsArray;
      } else if (isFunction(dragSort)) {
        grids = dragSort.call(rootGrid, item);
      }

      // Return immediately if there are no grids.
      if (!grids || !Array.isArray(grids) || !grids.length) {
        return target;
      }

      // Loop through the grids and get the best match.
      for (i = 0; i < grids.length; i++) {
        grid = grids[i];

        // Filter out all destroyed grids.
        if (grid._isDestroyed) continue;

        // Compute the grid's client rect an clamp the initial boundaries to
        // viewport dimensions.
        grid._updateBoundingRect();
        left = Math.max(0, grid._left);
        top = Math.max(0, grid._top);
        right = Math.min(window.innerWidth, grid._right);
        bottom = Math.min(window.innerHeight, grid._bottom);

        // The grid might be inside one or more elements that clip it's visibility
        // (e.g overflow scroll/hidden) so we want to find out the visible portion
        // of the grid in the viewport and use that in our calculations.
        container = grid._element.parentNode;
        while (
          container &&
          container !== document &&
          container !== document.documentElement &&
          container !== document.body
        ) {
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

        // No need to go further if target rect does not have visible area.
        if (left >= right || top >= bottom) continue;

        // Check how much dragged element overlaps the container element.
        targetRect.left = left;
        targetRect.top = top;
        targetRect.width = right - left;
        targetRect.height = bottom - top;
        gridScore = getIntersectionScore(itemRect, targetRect);

        // Check if this grid is the best match so far.
        if (gridScore > threshold && gridScore > bestScore) {
          bestScore = gridScore;
          target = grid;
        }
      }

      // Always reset grids array.
      gridsArray.length = 0;

      return target;
    }

    return function (item, options) {
      var drag = item._drag;
      var rootGrid = drag._getGrid();

      // Get drag sort predicate settings.
      var sortThreshold = options && typeof options.threshold === 'number' ? options.threshold : 50;
      var sortAction = options && options.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
      var migrateAction =
        options && options.migrateAction === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;

      // Sort threshold must be a positive number capped to a max value of 100. If
      // that's not the case this function will not work correctly. So let's clamp
      // the threshold just in case.
      sortThreshold = Math.min(Math.max(sortThreshold, minThreshold), maxThreshold);

      // Populate item rect data.
      itemRect.width = item._width;
      itemRect.height = item._height;
      itemRect.left = drag._clientX;
      itemRect.top = drag._clientY;

      // Calculate the target grid.
      var grid = getTargetGrid(item, rootGrid, sortThreshold);

      // Return early if we found no grid container element that overlaps the
      // dragged item enough.
      if (!grid) return null;

      var isMigration = item.getGrid() !== grid;
      var gridOffsetLeft = 0;
      var gridOffsetTop = 0;
      var matchScore = 0;
      var matchIndex = -1;
      var hasValidTargets = false;
      var target;
      var score;
      var i;

      // If item is moved within it's originating grid adjust item's left and
      // top props. Otherwise if item is moved to/within another grid get the
      // container element's offset (from the element's content edge).
      if (grid === rootGrid) {
        itemRect.left = drag._gridX + item._marginLeft;
        itemRect.top = drag._gridY + item._marginTop;
      } else {
        grid._updateBorders(1, 0, 1, 0);
        gridOffsetLeft = grid._left + grid._borderLeft;
        gridOffsetTop = grid._top + grid._borderTop;
      }

      // Loop through the target grid items and try to find the best match.
      for (i = 0; i < grid._items.length; i++) {
        target = grid._items[i];

        // If the target item is not active or the target item is the dragged
        // item let's skip to the next item.
        if (!target._isActive || target === item) {
          continue;
        }

        // Mark the grid as having valid target items.
        hasValidTargets = true;

        // Calculate the target's overlap score with the dragged item.
        targetRect.width = target._width;
        targetRect.height = target._height;
        targetRect.left = target._left + target._marginLeft + gridOffsetLeft;
        targetRect.top = target._top + target._marginTop + gridOffsetTop;
        score = getIntersectionScore(itemRect, targetRect);

        // Update best match index and score if the target's overlap score with
        // the dragged item is higher than the current best match score.
        if (score > matchScore) {
          matchIndex = i;
          matchScore = score;
        }
      }

      // If there is no valid match and the dragged item is being moved into
      // another grid we need to do some guess work here. If there simply are no
      // valid targets (which means that the dragged item will be the only active
      // item in the new grid) we can just add it as the first item. If we have
      // valid items in the new grid and the dragged item is overlapping one or
      // more of the items in the new grid let's make an exception with the
      // threshold and just pick the item which the dragged item is overlapping
      // most. However, if the dragged item is not overlapping any of the valid
      // items in the new grid let's position it as the last item in the grid.
      if (isMigration && matchScore < sortThreshold) {
        matchIndex = hasValidTargets ? matchIndex : 0;
        matchScore = sortThreshold;
      }

      // Check if the best match overlaps enough to justify a placement switch.
      if (matchScore >= sortThreshold) {
        returnData.grid = grid;
        returnData.index = matchIndex;
        returnData.action = isMigration ? migrateAction : sortAction;
        return returnData;
      }

      return null;
    };
  })();

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Abort dragging and reset drag data.
   *
   * @public
   */
  ItemDrag.prototype.stop = function () {
    if (!this._isActive) return;

    // If the item is being dropped into another grid, finish it up and return
    // immediately.
    if (this._isMigrating) {
      this._finishMigration();
      return;
    }

    // Cancel queued ticks.
    var itemId = this._item._id;
    cancelDragStartTick(itemId);
    cancelDragMoveTick(itemId);
    cancelDragScrollTick(itemId);

    // Cancel sort procedure.
    this._cancelSort();

    if (this._isStarted) {
      // Remove scroll listeners.
      this._unbindScrollListeners();

      var element = item._element;
      var grid = this._getGrid();
      var draggingClass = grid._settings.itemDraggingClass;

      // Append item element to the container if it's not it's child. Also make
      // sure the translate values are adjusted to account for the DOM shift.
      if (element.parentNode !== grid._element) {
        grid._element.appendChild(element);
        item._setTranslate(this._gridX, this._gridY);

        // We need to do forced reflow to make sure the dragging class is removed
        // gracefully.
        // eslint-disable-next-line
        if (draggingClass) element.clientWidth;
      }

      // Remove dragging class.
      removeClass(element, draggingClass);
    }

    // Reset drag data.
    this._reset();
  };

  /**
   * Manually trigger drag sort. This is only needed for special edge cases where
   * e.g. you have disabled sort and want to trigger a sort right after enabling
   * it (and don't want to wait for the next move/scroll event).
   *
   * @private
   * @param {Boolean} [force=false]
   */
  ItemDrag.prototype.sort = function (force) {
    var item = this._item;
    if (item._isActive && this._dragMoveEvent) {
      if (force === true) {
        this._handleSort();
      } else {
        addDragSortTick(item._id, this._handleSort);
      }
    }
  };

  /**
   * Destroy instance.
   *
   * @public
   */
  ItemDrag.prototype.destroy = function () {
    if (this._isDestroyed) return;
    this.stop();
    this._dragger.destroy();
    ItemDrag.autoScroller.removeItem(this._item);
    this._isDestroyed = true;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Get Grid instance.
   *
   * @private
   * @returns {?Grid}
   */
  ItemDrag.prototype._getGrid = function () {
    return GRID_INSTANCES[this._gridId] || null;
  };

  /**
   * Setup/reset drag data.
   *
   * @private
   */
  ItemDrag.prototype._reset = function () {
    this._isActive = false;
    this._isStarted = false;

    // The dragged item's container element.
    this._container = null;

    // The dragged item's containing block.
    this._containingBlock = null;

    // Drag/scroll event data.
    this._dragStartEvent = null;
    this._dragMoveEvent = null;
    this._dragPrevMoveEvent = null;
    this._scrollEvent = null;

    // All the elements which need to be listened for scroll events during
    // dragging.
    this._scrollers = [];

    // The current translateX/translateY position.
    this._left = 0;
    this._top = 0;

    // Dragged element's current position within the grid.
    this._gridX = 0;
    this._gridY = 0;

    // Dragged element's current offset from window's northwest corner. Does
    // not account for element's margins.
    this._clientX = 0;
    this._clientY = 0;

    // Keep track of the clientX/Y diff for scrolling.
    this._scrollDiffX = 0;
    this._scrollDiffY = 0;

    // Keep track of the clientX/Y diff for moving.
    this._moveDiffX = 0;
    this._moveDiffY = 0;

    // Offset difference between the dragged element's temporary drag
    // container and it's original container.
    this._containerDiffX = 0;
    this._containerDiffY = 0;
  };

  /**
   * Bind drag scroll handlers to all scrollable ancestor elements of the
   * dragged element and the drag container element.
   *
   * @private
   */
  ItemDrag.prototype._bindScrollListeners = function () {
    var gridContainer = this._getGrid()._element;
    var dragContainer = this._container;
    var scrollers = this._scrollers;
    var gridScrollers;
    var i;

    // Get dragged element's scrolling parents.
    scrollers.length = 0;
    getScrollableAncestors(this._item._element.parentNode, scrollers);

    // If drag container is defined and it's not the same element as grid
    // container then we need to add the grid container and it's scroll parents
    // to the elements which are going to be listener for scroll events.
    if (dragContainer !== gridContainer) {
      gridScrollers = [];
      getScrollableAncestors(gridContainer, gridScrollers);
      for (i = 0; i < gridScrollers.length; i++) {
        if (scrollers.indexOf(gridScrollers[i]) < 0) {
          scrollers.push(gridScrollers[i]);
        }
      }
    }

    // Bind scroll listeners.
    for (i = 0; i < scrollers.length; i++) {
      scrollers[i].addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    }
  };

  /**
   * Unbind currently bound drag scroll handlers from all scrollable ancestor
   * elements of the dragged element and the drag container element.
   *
   * @private
   */
  ItemDrag.prototype._unbindScrollListeners = function () {
    var scrollers = this._scrollers;
    var i;

    for (i = 0; i < scrollers.length; i++) {
      scrollers[i].removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    }

    scrollers.length = 0;
  };

  /**
   * Unbind currently bound drag scroll handlers from all scrollable ancestor
   * elements of the dragged element and the drag container element.
   *
   * @private
   * @param {Object} event
   * @returns {Boolean}
   */
  ItemDrag.prototype._resolveStartPredicate = function (event) {
    var predicate = this._startPredicateData;
    if (event.distance < predicate.distance || predicate.delay) return;
    this._resetStartPredicate();
    return true;
  };

  /**
   * Forcefully resolve drag start predicate.
   *
   * @private
   * @param {Object} event
   */
  ItemDrag.prototype._forceResolveStartPredicate = function (event) {
    if (!this._isDestroyed && this._startPredicateState === START_PREDICATE_PENDING) {
      this._startPredicateState = START_PREDICATE_RESOLVED;
      this._onStart(event);
    }
  };

  /**
   * Finalize start predicate.
   *
   * @private
   * @param {Object} event
   */
  ItemDrag.prototype._finishStartPredicate = function (event) {
    var element = this._item._element;

    // Check if this is a click (very subjective heuristics).
    var isClick = Math.abs(event.deltaX) < 2 && Math.abs(event.deltaY) < 2 && event.deltaTime < 200;

    // Reset predicate.
    this._resetStartPredicate();

    // If the gesture can be interpreted as click let's try to open the element's
    // href url (if it is an anchor element).
    if (isClick) openAnchorHref(element);
  };

  /**
   * Reset drag sort heuristics.
   *
   * @private
   * @param {Number} x
   * @param {Number} y
   */
  ItemDrag.prototype._resetHeuristics = function (x, y) {
    this._blockedSortIndex = null;
    this._sortX1 = this._sortX2 = x;
    this._sortY1 = this._sortY2 = y;
  };

  /**
   * Run heuristics and return true if overlap check can be performed, and false
   * if it can not.
   *
   * @private
   * @param {Number} x
   * @param {Number} y
   * @returns {Boolean}
   */
  ItemDrag.prototype._checkHeuristics = function (x, y) {
    var settings = this._getGrid()._settings.dragSortHeuristics;
    var minDist = settings.minDragDistance;

    // Skip heuristics if not needed.
    if (minDist <= 0) {
      this._blockedSortIndex = null;
      return true;
    }

    var diffX = x - this._sortX2;
    var diffY = y - this._sortY2;

    // If we can't do proper bounce back check make sure that the blocked index
    // is not set.
    var canCheckBounceBack = minDist > 3 && settings.minBounceBackAngle > 0;
    if (!canCheckBounceBack) {
      this._blockedSortIndex = null;
    }

    if (Math.abs(diffX) > minDist || Math.abs(diffY) > minDist) {
      // Reset blocked index if angle changed enough. This check requires a
      // minimum value of 3 for minDragDistance to function properly.
      if (canCheckBounceBack) {
        var angle = Math.atan2(diffX, diffY);
        var prevAngle = Math.atan2(this._sortX2 - this._sortX1, this._sortY2 - this._sortY1);
        var deltaAngle = Math.atan2(Math.sin(angle - prevAngle), Math.cos(angle - prevAngle));
        if (Math.abs(deltaAngle) > settings.minBounceBackAngle) {
          this._blockedSortIndex = null;
        }
      }

      // Update points.
      this._sortX1 = this._sortX2;
      this._sortY1 = this._sortY2;
      this._sortX2 = x;
      this._sortY2 = y;

      return true;
    }

    return false;
  };

  /**
   * Reset for default drag start predicate function.
   *
   * @private
   */
  ItemDrag.prototype._resetStartPredicate = function () {
    var predicate = this._startPredicateData;
    if (predicate) {
      if (predicate.delayTimer) {
        predicate.delayTimer = window.clearTimeout(predicate.delayTimer);
      }
      this._startPredicateData = null;
    }
  };

  /**
   * Handle the sorting procedure. Manage drag sort heuristics/interval and
   * check overlap when necessary.
   *
   * @private
   */
  ItemDrag.prototype._handleSort = function () {
    var settings = this._getGrid()._settings;

    // No sorting when drag sort is disabled. Also, account for the scenario where
    // dragSort is temporarily disabled during drag procedure so we need to reset
    // sort timer heuristics state too.
    if (
      !settings.dragSort ||
      (!settings.dragAutoScroll.sortDuringScroll && ItemDrag.autoScroller.isItemScrolling(this._item))
    ) {
      this._sortX1 = this._sortX2 = this._gridX;
      this._sortY1 = this._sortY2 = this._gridY;
      // We set this to true intentionally so that overlap check would be
      // triggered as soon as possible after sort becomes enabled again.
      this._isSortNeeded = true;
      if (this._sortTimer !== undefined) {
        this._sortTimer = window.clearTimeout(this._sortTimer);
      }
      return;
    }

    // If sorting is enabled we always need to run the heuristics check to keep
    // the tracked coordinates updated. We also allow an exception when the sort
    // timer is finished because the heuristics are intended to prevent overlap
    // checks based on the dragged element's immediate movement and a delayed
    // overlap check is valid if it comes through, because it was valid when it
    // was invoked.
    var shouldSort = this._checkHeuristics(this._gridX, this._gridY);
    if (!this._isSortNeeded && !shouldSort) return;

    var sortInterval = settings.dragSortHeuristics.sortInterval;
    if (sortInterval <= 0 || this._isSortNeeded) {
      this._isSortNeeded = false;
      if (this._sortTimer !== undefined) {
        this._sortTimer = window.clearTimeout(this._sortTimer);
      }
      this._checkOverlap();
    } else if (this._sortTimer === undefined) {
      this._sortTimer = window.setTimeout(this._handleSortDelayed, sortInterval);
    }
  };

  /**
   * Delayed sort handler.
   *
   * @private
   */
  ItemDrag.prototype._handleSortDelayed = function () {
    this._isSortNeeded = true;
    this._sortTimer = undefined;
    addDragSortTick(this._item._id, this._handleSort);
  };

  /**
   * Cancel and reset sort procedure.
   *
   * @private
   */
  ItemDrag.prototype._cancelSort = function () {
    this._isSortNeeded = false;
    if (this._sortTimer !== undefined) {
      this._sortTimer = window.clearTimeout(this._sortTimer);
    }
    cancelDragSortTick(this._item._id);
  };

  /**
   * Handle the ending of the drag procedure for sorting.
   *
   * @private
   */
  ItemDrag.prototype._finishSort = function () {
    var isSortEnabled = this._getGrid()._settings.dragSort;
    var needsFinalCheck = isSortEnabled && (this._isSortNeeded || this._sortTimer !== undefined);
    this._cancelSort();
    if (needsFinalCheck) this._checkOverlap();
  };

  /**
   * Check (during drag) if an item is overlapping other items and based on
   * the configuration layout the items.
   *
   * @private
   */
  ItemDrag.prototype._checkOverlap = function () {
    if (!this._isActive) return;

    var item = this._item;
    var settings = this._getGrid()._settings;
    var result;
    var currentGrid;
    var currentIndex;
    var targetGrid;
    var targetIndex;
    var targetItem;
    var sortAction;
    var isMigration;

    // Get overlap check result.
    if (isFunction(settings.dragSortPredicate)) {
      result = settings.dragSortPredicate(item, this._dragMoveEvent);
    } else {
      result = ItemDrag.defaultSortPredicate(item, settings.dragSortPredicate);
    }

    // Let's make sure the result object has a valid index before going further.
    if (!result || typeof result.index !== 'number') return;

    sortAction = result.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
    currentGrid = item.getGrid();
    targetGrid = result.grid || currentGrid;
    isMigration = currentGrid !== targetGrid;
    currentIndex = currentGrid._items.indexOf(item);
    targetIndex = normalizeArrayIndex(
      targetGrid._items,
      result.index,
      isMigration && sortAction === ACTION_MOVE ? 1 : 0
    );

    // Prevent position bounce.
    if (!isMigration && targetIndex === this._blockedSortIndex) {
      return;
    }

    // If the item was moved within it's current grid.
    if (!isMigration) {
      // Make sure the target index is not the current index.
      if (currentIndex !== targetIndex) {
        this._blockedSortIndex = currentIndex;

        // Do the sort.
        (sortAction === ACTION_SWAP ? arraySwap : arrayMove)(
          currentGrid._items,
          currentIndex,
          targetIndex
        );

        // Emit move event.
        if (currentGrid._hasListeners(EVENT_MOVE)) {
          currentGrid._emit(EVENT_MOVE, {
            item: item,
            fromIndex: currentIndex,
            toIndex: targetIndex,
            action: sortAction,
          });
        }

        // Layout the grid.
        currentGrid.layout();
      }
    }

    // If the item was moved to another grid.
    else {
      this._blockedSortIndex = null;

      // Let's fetch the target item when it's still in it's original index.
      targetItem = targetGrid._items[targetIndex];

      // Emit beforeSend event.
      if (currentGrid._hasListeners(EVENT_BEFORE_SEND)) {
        currentGrid._emit(EVENT_BEFORE_SEND, {
          item: item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex,
        });
      }

      // Emit beforeReceive event.
      if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
        targetGrid._emit(EVENT_BEFORE_RECEIVE, {
          item: item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex,
        });
      }

      // Update item's grid id reference.
      item._gridId = targetGrid._id;

      // Update drag instance's migrating indicator.
      this._isMigrating = item._gridId !== this._gridId;

      // Move item instance from current grid to target grid.
      currentGrid._items.splice(currentIndex, 1);
      arrayInsert(targetGrid._items, item, targetIndex);

      // Reset sort data.
      item._sortData = null;

      // Emit send event.
      if (currentGrid._hasListeners(EVENT_SEND)) {
        currentGrid._emit(EVENT_SEND, {
          item: item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex,
        });
      }

      // Emit receive event.
      if (targetGrid._hasListeners(EVENT_RECEIVE)) {
        targetGrid._emit(EVENT_RECEIVE, {
          item: item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex,
        });
      }

      // If the sort action is "swap" let's respect it and send the target item
      // (if it exists) from the target grid to the originating grid. This process
      // is done on purpose after the dragged item placed within the target grid
      // so that we can keep this implementation as simple as possible utilizing
      // the existing API.
      if (sortAction === ACTION_SWAP && targetItem && targetItem.isActive()) {
        // Sanity check to make sure that the target item is still part of the
        // target grid. It could have been manipulated in the event handlers.
        if (targetGrid._items.indexOf(targetItem) > -1) {
          targetGrid.send(targetItem, currentGrid, currentIndex, {
            appendTo: this._container || document.body,
            layoutSender: false,
            layoutReceiver: false,
          });
        }
      }

      // Layout both grids.
      currentGrid.layout();
      targetGrid.layout();
    }
  };

  /**
   * If item is dragged into another grid, finish the migration process
   * gracefully.
   *
   * @private
   */
  ItemDrag.prototype._finishMigration = function () {
    var item = this._item;
    var release = item._dragRelease;
    var element = item._element;
    var isActive = item._isActive;
    var targetGrid = item.getGrid();
    var targetGridElement = targetGrid._element;
    var targetSettings = targetGrid._settings;
    var targetContainer = targetSettings.dragContainer || targetGridElement;
    var currentSettings = this._getGrid()._settings;
    var currentContainer = element.parentNode;
    var currentVisClass = isActive
      ? currentSettings.itemVisibleClass
      : currentSettings.itemHiddenClass;
    var nextVisClass = isActive ? targetSettings.itemVisibleClass : targetSettings.itemHiddenClass;
    var translate;
    var offsetDiff;

    // Destroy current drag. Note that we need to set the migrating flag to
    // false first, because otherwise we create an infinite loop between this
    // and the drag.stop() method.
    this._isMigrating = false;
    this.destroy();

    // Update item class.
    if (currentSettings.itemClass !== targetSettings.itemClass) {
      removeClass(element, currentSettings.itemClass);
      addClass(element, targetSettings.itemClass);
    }

    // Update visibility class.
    if (currentVisClass !== nextVisClass) {
      removeClass(element, currentVisClass);
      addClass(element, nextVisClass);
    }

    // Move the item inside the target container if it's different than the
    // current container.
    if (targetContainer !== currentContainer) {
      targetContainer.appendChild(element);
      offsetDiff = getOffsetDiff(currentContainer, targetContainer, true);
      translate = getTranslate(element);
      translate.x -= offsetDiff.left;
      translate.y -= offsetDiff.top;
    }

    // Update item's cached dimensions.
    item._refreshDimensions();

    // Calculate the offset difference between target's drag container (if any)
    // and actual grid container element. We save it later for the release
    // process.
    offsetDiff = getOffsetDiff(targetContainer, targetGridElement, true);
    release._containerDiffX = offsetDiff.left;
    release._containerDiffY = offsetDiff.top;

    // Recreate item's drag handler.
    item._drag = targetSettings.dragEnabled ? new ItemDrag(item) : null;

    // Adjust the position of the item element if it was moved from a container
    // to another.
    if (targetContainer !== currentContainer) {
      item._setTranslate(translate.x, translate.y);
    }

    // Update child element's styles to reflect the current visibility state.
    item._visibility.setStyles(isActive ? targetSettings.visibleStyles : targetSettings.hiddenStyles);

    // Start the release.
    release.start();
  };

  /**
   * Drag pre-start handler.
   *
   * @private
   * @param {Object} event
   */
  ItemDrag.prototype._preStartCheck = function (event) {
    // Let's activate drag start predicate state.
    if (this._startPredicateState === START_PREDICATE_INACTIVE) {
      this._startPredicateState = START_PREDICATE_PENDING;
    }

    // If predicate is pending try to resolve it.
    if (this._startPredicateState === START_PREDICATE_PENDING) {
      this._startPredicateResult = this._startPredicate(this._item, event);
      if (this._startPredicateResult === true) {
        this._startPredicateState = START_PREDICATE_RESOLVED;
        this._onStart(event);
      } else if (this._startPredicateResult === false) {
        this._resetStartPredicate(event);
        this._dragger._reset();
        this._startPredicateState = START_PREDICATE_INACTIVE;
      }
    }

    // Otherwise if predicate is resolved and drag is active, move the item.
    else if (this._startPredicateState === START_PREDICATE_RESOLVED && this._isActive) {
      this._onMove(event);
    }
  };

  /**
   * Drag pre-end handler.
   *
   * @private
   * @param {Object} event
   */
  ItemDrag.prototype._preEndCheck = function (event) {
    var isResolved = this._startPredicateState === START_PREDICATE_RESOLVED;

    // Do final predicate check to allow user to unbind stuff for the current
    // drag procedure within the predicate callback. The return value of this
    // check will have no effect to the state of the predicate.
    this._startPredicate(this._item, event);

    this._startPredicateState = START_PREDICATE_INACTIVE;

    if (!isResolved || !this._isActive) return;

    if (this._isStarted) {
      this._onEnd(event);
    } else {
      this.stop();
    }
  };

  /**
   * Drag start handler.
   *
   * @private
   * @param {Object} event
   */
  ItemDrag.prototype._onStart = function (event) {
    var item = this._item;
    if (!item._isActive) return;

    this._isActive = true;
    this._dragStartEvent = event;
    ItemDrag.autoScroller.addItem(item);

    addDragStartTick(item._id, this._prepareStart, this._applyStart);
  };

  /**
   * Prepare item to be dragged.
   *
   * @private
   *  ItemDrag.prototype
   */
  ItemDrag.prototype._prepareStart = function () {
    var item = this._item;
    if (!item._isActive) return;

    var element = item._element;
    var grid = this._getGrid();
    var settings = grid._settings;
    var gridContainer = grid._element;
    var dragContainer = settings.dragContainer || gridContainer;
    var containingBlock = getContainingBlock(dragContainer);
    var translate = getTranslate(element);
    var elementRect = element.getBoundingClientRect();
    var hasDragContainer = dragContainer !== gridContainer;

    this._container = dragContainer;
    this._containingBlock = containingBlock;
    this._clientX = elementRect.left;
    this._clientY = elementRect.top;
    this._left = this._gridX = translate.x;
    this._top = this._gridY = translate.y;
    this._scrollDiffX = this._scrollDiffY = 0;
    this._moveDiffX = this._moveDiffY = 0;

    this._resetHeuristics(this._gridX, this._gridY);

    // If a specific drag container is set and it is different from the
    // grid's container element we store the offset between containers.
    if (hasDragContainer) {
      var offsetDiff = getOffsetDiff(containingBlock, gridContainer);
      this._containerDiffX = offsetDiff.left;
      this._containerDiffY = offsetDiff.top;
    }
  };

  /**
   * Start drag for the item.
   *
   * @private
   */
  ItemDrag.prototype._applyStart = function () {
    var item = this._item;
    if (!item._isActive) return;

    var grid = this._getGrid();
    var element = item._element;
    var release = item._dragRelease;
    var migrate = item._migrate;
    var hasDragContainer = this._container !== grid._element;

    if (item.isPositioning()) {
      item._layout.stop(true, this._left, this._top);
    }

    if (migrate._isActive) {
      this._left -= migrate._containerDiffX;
      this._top -= migrate._containerDiffY;
      this._gridX -= migrate._containerDiffX;
      this._gridY -= migrate._containerDiffY;
      migrate.stop(true, this._left, this._top);
    }

    if (item.isReleasing()) {
      release._reset();
    }

    if (grid._settings.dragPlaceholder.enabled) {
      item._dragPlaceholder.create();
    }

    this._isStarted = true;

    grid._emit(EVENT_DRAG_INIT, item, this._dragStartEvent);

    if (hasDragContainer) {
      // If the dragged element is a child of the drag container all we need to
      // do is setup the relative drag position data.
      if (element.parentNode === this._container) {
        this._gridX -= this._containerDiffX;
        this._gridY -= this._containerDiffY;
      }
      // Otherwise we need to append the element inside the correct container,
      // setup the actual drag position data and adjust the element's translate
      // values to account for the DOM position shift.
      else {
        this._left += this._containerDiffX;
        this._top += this._containerDiffY;
        this._container.appendChild(element);
        item._setTranslate(this._left, this._top);
      }
    }

    addClass(element, grid._settings.itemDraggingClass);
    this._bindScrollListeners();
    grid._emit(EVENT_DRAG_START, item, this._dragStartEvent);
  };

  /**
   * Drag move handler.
   *
   * @private
   * @param {Object} event
   */
  ItemDrag.prototype._onMove = function (event) {
    var item = this._item;

    if (!item._isActive) {
      this.stop();
      return;
    }

    this._dragMoveEvent = event;
    addDragMoveTick(item._id, this._prepareMove, this._applyMove);
    addDragSortTick(item._id, this._handleSort);
  };

  /**
   * Prepare dragged item for moving.
   *
   * @private
   */
  ItemDrag.prototype._prepareMove = function () {
    var item = this._item;

    if (!item._isActive) return;

    var settings = this._getGrid()._settings;
    var axis = settings.dragAxis;
    var nextEvent = this._dragMoveEvent;
    var prevEvent = this._dragPrevMoveEvent || this._dragStartEvent || nextEvent;

    // Update horizontal position data.
    if (axis !== 'y') {
      var moveDiffX = nextEvent.clientX - prevEvent.clientX;
      this._left = this._left - this._moveDiffX + moveDiffX;
      this._gridX = this._gridX - this._moveDiffX + moveDiffX;
      this._clientX = this._clientX - this._moveDiffX + moveDiffX;
      this._moveDiffX = moveDiffX;
    }

    // Update vertical position data.
    if (axis !== 'x') {
      var moveDiffY = nextEvent.clientY - prevEvent.clientY;
      this._top = this._top - this._moveDiffY + moveDiffY;
      this._gridY = this._gridY - this._moveDiffY + moveDiffY;
      this._clientY = this._clientY - this._moveDiffY + moveDiffY;
      this._moveDiffY = moveDiffY;
    }

    this._dragPrevMoveEvent = nextEvent;
  };

  /**
   * Apply movement to dragged item.
   *
   * @private
   */
  ItemDrag.prototype._applyMove = function () {
    var item = this._item;
    if (!item._isActive) return;

    this._moveDiffX = this._moveDiffY = 0;
    item._setTranslate(this._left, this._top);
    this._getGrid()._emit(EVENT_DRAG_MOVE, item, this._dragMoveEvent);
    ItemDrag.autoScroller.updateItem(item);
  };

  /**
   * Drag scroll handler.
   *
   * @private
   * @param {Object} event
   */
  ItemDrag.prototype._onScroll = function (event) {
    var item = this._item;

    if (!item._isActive) {
      this.stop();
      return;
    }

    this._scrollEvent = event;
    addDragScrollTick(item._id, this._prepareScroll, this._applyScroll);
    addDragSortTick(item._id, this._handleSort);
  };

  /**
   * Prepare dragged item for scrolling.
   *
   * @private
   */
  ItemDrag.prototype._prepareScroll = function () {
    var item = this._item;

    // If item is not active do nothing.
    if (!item._isActive) return;

    var element = item._element;
    var grid = this._getGrid();
    var gridContainer = grid._element;
    var axis = grid._settings.dragAxis;
    var moveX = axis !== 'y';
    var moveY = axis !== 'x';
    var rect = element.getBoundingClientRect();

    // Update container diff.
    if (this._container !== gridContainer) {
      var offsetDiff = getOffsetDiff(this._containingBlock, gridContainer);
      this._containerDiffX = offsetDiff.left;
      this._containerDiffY = offsetDiff.top;
    }

    // Update horizontal position data.
    if (moveX) {
      var scrollDiffX = this._clientX - this._moveDiffX - this._scrollDiffX - rect.left;
      this._left = this._left - this._scrollDiffX + scrollDiffX;
      this._scrollDiffX = scrollDiffX;
    }

    // Update vertical position data.
    if (moveY) {
      var scrollDiffY = this._clientY - this._moveDiffY - this._scrollDiffY - rect.top;
      this._top = this._top - this._scrollDiffY + scrollDiffY;
      this._scrollDiffY = scrollDiffY;
    }

    // Update grid position.
    this._gridX = this._left - this._containerDiffX;
    this._gridY = this._top - this._containerDiffY;
  };

  /**
   * Apply scroll to dragged item.
   *
   * @private
   */
  ItemDrag.prototype._applyScroll = function () {
    var item = this._item;
    if (!item._isActive) return;

    this._scrollDiffX = this._scrollDiffY = 0;
    item._setTranslate(this._left, this._top);
    this._getGrid()._emit(EVENT_DRAG_SCROLL, item, this._scrollEvent);
  };

  /**
   * Drag end handler.
   *
   * @private
   * @param {Object} event
   */
  ItemDrag.prototype._onEnd = function (event) {
    var item = this._item;
    var element = item._element;
    var grid = this._getGrid();
    var settings = grid._settings;
    var release = item._dragRelease;

    // If item is not active, reset drag.
    if (!item._isActive) {
      this.stop();
      return;
    }

    // Cancel queued ticks.
    cancelDragStartTick(item._id);
    cancelDragMoveTick(item._id);
    cancelDragScrollTick(item._id);

    // Finish sort procedure (does final overlap check if needed).
    this._finishSort();

    // Remove scroll listeners.
    this._unbindScrollListeners();

    // Setup release data.
    release._containerDiffX = this._containerDiffX;
    release._containerDiffY = this._containerDiffY;

    // Reset drag data.
    this._reset();

    // Remove drag class name from element.
    removeClass(element, settings.itemDraggingClass);

    // Stop auto-scroll.
    ItemDrag.autoScroller.removeItem(item);

    // Emit dragEnd event.
    grid._emit(EVENT_DRAG_END, item, event);

    // Finish up the migration process or start the release process.
    this._isMigrating ? this._finishMigration() : release.start();
  };

  /**
   * Private helpers
   * ***************
   */

  /**
   * Check if an element is an anchor element and open the href url if possible.
   *
   * @param {HTMLElement} element
   */
  function openAnchorHref(element) {
    // Make sure the element is anchor element.
    if (element.tagName.toLowerCase() !== 'a') return;

    // Get href and make sure it exists.
    var href = element.getAttribute('href');
    if (!href) return;

    // Finally let's navigate to the link href.
    var target = element.getAttribute('target');
    if (target && target !== '_self') {
      window.open(href, target);
    } else {
      window.location.href = href;
    }
  }

  /**
   * Get current values of the provided styles definition object or array.
   *
   * @param {HTMLElement} element
   * @param {(Object|Array} styles
   * @return {Object}
   */
  function getCurrentStyles(element, styles) {
    var result = {};
    var prop, i;

    if (Array.isArray(styles)) {
      for (i = 0; i < styles.length; i++) {
        prop = styles[i];
        result[prop] = getStyle(element, getStyleName(prop));
      }
    } else {
      for (prop in styles) {
        result[prop] = getStyle(element, getStyleName(prop));
      }
    }

    return result;
  }

  var unprefixRegEx = /^(webkit|moz|ms|o|Webkit|Moz|MS|O)(?=[A-Z])/;
  var cache$2 = {};

  /**
   * Remove any potential vendor prefixes from a property name.
   *
   * @param {String} prop
   * @returns {String}
   */
  function getUnprefixedPropName(prop) {
    var result = cache$2[prop];
    if (result) return result;

    result = prop.replace(unprefixRegEx, '');

    if (result !== prop) {
      result = result[0].toLowerCase() + result.slice(1);
    }

    cache$2[prop] = result;

    return result;
  }

  var nativeCode = '[native code]';

  /**
   * Check if a value (e.g. a method or constructor) is native code. Good for
   * detecting when a polyfill is used and when not.
   *
   * @param {*} feat
   * @returns {Boolean}
   */
  function isNative(feat) {
    var S = window.Symbol;
    return !!(
      feat &&
      isFunction(S) &&
      isFunction(S.toString) &&
      S(feat).toString().indexOf(nativeCode) > -1
    );
  }

  /**
   * Set inline styles to an element.
   *
   * @param {HTMLElement} element
   * @param {Object} styles
   */
  function setStyles(element, styles) {
    for (var prop in styles) {
      element.style[prop] = styles[prop];
    }
  }

  var HAS_WEB_ANIMATIONS = !!(Element && isFunction(Element.prototype.animate));
  var HAS_NATIVE_WEB_ANIMATIONS = !!(Element && isNative(Element.prototype.animate));

  /**
   * Item animation handler powered by Web Animations API.
   *
   * @class
   * @param {HTMLElement} element
   */
  function Animator(element) {
    this._element = element;
    this._animation = null;
    this._duration = 0;
    this._easing = '';
    this._callback = null;
    this._props = [];
    this._values = [];
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
   * @param {Object} propsFrom
   * @param {Object} propsTo
   * @param {Object} [options]
   * @param {Number} [options.duration=300]
   * @param {String} [options.easing='ease']
   * @param {Function} [options.onFinish]
   */
  Animator.prototype.start = function (propsFrom, propsTo, options) {
    if (this._isDestroyed) return;

    var element = this._element;
    var opts = options || {};

    // If we don't have web animations available let's not animate.
    if (!HAS_WEB_ANIMATIONS) {
      setStyles(element, propsTo);
      this._callback = isFunction(opts.onFinish) ? opts.onFinish : null;
      this._onFinish();
      return;
    }

    var animation = this._animation;
    var currentProps = this._props;
    var currentValues = this._values;
    var duration = opts.duration || 300;
    var easing = opts.easing || 'ease';
    var cancelAnimation = false;
    var propName, propCount, propIndex;

    // If we have an existing animation running, let's check if it needs to be
    // cancelled or if it can continue running.
    if (animation) {
      propCount = 0;

      // Cancel animation if duration or easing has changed.
      if (duration !== this._duration || easing !== this._easing) {
        cancelAnimation = true;
      }

      // Check if the requested animation target props and values match with the
      // current props and values.
      if (!cancelAnimation) {
        for (propName in propsTo) {
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
        if (propCount !== currentProps.length) {
          cancelAnimation = true;
        }
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

    // Start the animation. We need to provide unprefixed property names to the
    // Web Animations polyfill if it is being used. If we have native Web
    // Animations available we need to provide prefixed properties instead.
    this._duration = duration;
    this._easing = easing;
    this._animation = element.animate(
      [
        createFrame(propsFrom, HAS_NATIVE_WEB_ANIMATIONS),
        createFrame(propsTo, HAS_NATIVE_WEB_ANIMATIONS),
      ],
      {
        duration: duration,
        easing: easing,
      }
    );
    this._animation.onfinish = this._onFinish;

    // Set the end styles. This makes sure that the element stays at the end
    // values after animation is finished.
    setStyles(element, propsTo);
  };

  /**
   * Stop instance's current animation if running.
   *
   * @public
   */
  Animator.prototype.stop = function () {
    if (this._isDestroyed || !this._animation) return;
    this._animation.cancel();
    this._animation = this._callback = null;
    this._props.length = this._values.length = 0;
  };

  /**
   * Read the current values of the element's animated styles from the DOM.
   *
   * @public
   * @return {Object}
   */
  Animator.prototype.getCurrentStyles = function () {
    return getCurrentStyles(element, currentProps);
  };

  /**
   * Check if the item is being animated currently.
   *
   * @public
   * @return {Boolean}
   */
  Animator.prototype.isAnimating = function () {
    return !!this._animation;
  };

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   */
  Animator.prototype.destroy = function () {
    if (this._isDestroyed) return;
    this.stop();
    this._element = null;
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
   */
  Animator.prototype._onFinish = function () {
    var callback = this._callback;
    this._animation = this._callback = null;
    this._props.length = this._values.length = 0;
    callback && callback();
  };

  /**
   * Private helpers
   * ***************
   */

  function createFrame(props, prefix) {
    var frame = {};
    for (var prop in props) {
      frame[prefix ? prop : getUnprefixedPropName(prop)] = props[prop];
    }
    return frame;
  }

  /**
   * Transform translateX and translateY value into CSS transform style
   * property's value.
   *
   * @param {Number} x
   * @param {Number} y
   * @returns {String}
   */
  function getTranslateString(x, y) {
    return 'translateX(' + x + 'px) translateY(' + y + 'px)';
  }

  /**
   * Drag placeholder.
   *
   * @class
   * @param {Item} item
   */
  function ItemDragPlaceholder(item) {
    this._item = item;
    this._animation = new Animator();
    this._element = null;
    this._className = '';
    this._didMigrate = false;
    this._resetAfterLayout = false;
    this._left = 0;
    this._top = 0;
    this._transX = 0;
    this._transY = 0;
    this._nextTransX = 0;
    this._nextTransY = 0;

    // Bind animation handlers.
    this._setupAnimation = this._setupAnimation.bind(this);
    this._startAnimation = this._startAnimation.bind(this);
    this._updateDimensions = this._updateDimensions.bind(this);

    // Bind event handlers.
    this._onLayoutStart = this._onLayoutStart.bind(this);
    this._onLayoutEnd = this._onLayoutEnd.bind(this);
    this._onReleaseEnd = this._onReleaseEnd.bind(this);
    this._onMigrate = this._onMigrate.bind(this);
    this._onHide = this._onHide.bind(this);
  }

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Update placeholder's dimensions to match the item's dimensions.
   *
   * @private
   */
  ItemDragPlaceholder.prototype._updateDimensions = function () {
    if (!this.isActive()) return;
    setStyles(this._element, {
      width: this._item._width + 'px',
      height: this._item._height + 'px',
    });
  };

  /**
   * Move placeholder to a new position.
   *
   * @private
   * @param {Item[]} items
   * @param {Boolean} isInstant
   */
  ItemDragPlaceholder.prototype._onLayoutStart = function (items, isInstant) {
    var item = this._item;

    // If the item is not part of the layout anymore reset placeholder.
    if (items.indexOf(item) === -1) {
      this.reset();
      return;
    }

    var nextLeft = item._left;
    var nextTop = item._top;
    var currentLeft = this._left;
    var currentTop = this._top;

    // Keep track of item layout position.
    this._left = nextLeft;
    this._top = nextTop;

    // If item's position did not change, and the item did not migrate and the
    // layout is not instant and we can safely skip layout.
    if (!isInstant && !this._didMigrate && currentLeft === nextLeft && currentTop === nextTop) {
      return;
    }

    // Slots data is calculated with item margins added to them so we need to add
    // item's left and top margin to the slot data to get the placeholder's
    // next position.
    var nextX = nextLeft + item._marginLeft;
    var nextY = nextTop + item._marginTop;

    // Just snap to new position without any animations if no animation is
    // required or if placeholder moves between grids.
    var grid = item.getGrid();
    var animEnabled = !isInstant && grid._settings.layoutDuration > 0;
    if (!animEnabled || this._didMigrate) {
      // Cancel potential (queued) layout tick.
      cancelPlaceholderLayoutTick(item._id);

      // Snap placeholder to correct position.
      this._element.style[transformProp] = getTranslateString(nextX, nextY);
      this._animation.stop();

      // Move placeholder inside correct container after migration.
      if (this._didMigrate) {
        grid.getElement().appendChild(this._element);
        this._didMigrate = false;
      }

      return;
    }

    // Start the placeholder's layout animation in the next tick. We do this to
    // avoid layout thrashing.
    this._nextTransX = nextX;
    this._nextTransY = nextY;
    addPlaceholderLayoutTick(item._id, this._setupAnimation, this._startAnimation);
  };

  /**
   * Prepare placeholder for layout animation.
   *
   * @private
   */
  ItemDragPlaceholder.prototype._setupAnimation = function () {
    if (!this.isActive()) return;

    var translate = getTranslate(this._element);
    this._transX = translate.x;
    this._transY = translate.y;
  };

  /**
   * Start layout animation.
   *
   * @private
   */
  ItemDragPlaceholder.prototype._startAnimation = function () {
    if (!this.isActive()) return;

    var animation = this._animation;
    var currentX = this._transX;
    var currentY = this._transY;
    var nextX = this._nextTransX;
    var nextY = this._nextTransY;

    // If placeholder is already in correct position let's just stop animation
    // and be done with it.
    if (currentX === nextX && currentY === nextY) {
      if (animation.isAnimating()) {
        this._element.style[transformProp] = getTranslateString(nextX, nextY);
        animation.stop();
      }
      return;
    }

    // Otherwise let's start the animation.
    var settings = this._item.getGrid()._settings;
    var currentStyles = {};
    var targetStyles = {};
    currentStyles[transformProp] = getTranslateString(currentX, currentY);
    targetStyles[transformProp] = getTranslateString(nextX, nextY);
    animation.start(currentStyles, targetStyles, {
      duration: settings.layoutDuration,
      easing: settings.layoutEasing,
      onFinish: this._onLayoutEnd,
    });
  };

  /**
   * Layout end handler.
   *
   * @private
   */
  ItemDragPlaceholder.prototype._onLayoutEnd = function () {
    if (this._resetAfterLayout) {
      this.reset();
    }
  };

  /**
   * Drag end handler. This handler is called when dragReleaseEnd event is
   * emitted and receives the event data as it's argument.
   *
   * @private
   * @param {Item} item
   */
  ItemDragPlaceholder.prototype._onReleaseEnd = function (item) {
    if (item._id === this._item._id) {
      // If the placeholder is not animating anymore we can safely reset it.
      if (!this._animation.isAnimating()) {
        this.reset();
        return;
      }

      // If the placeholder item is still animating here, let's wait for it to
      // finish it's animation.
      this._resetAfterLayout = true;
    }
  };

  /**
   * Migration start handler. This handler is called when beforeSend event is
   * emitted and receives the event data as it's argument.
   *
   * @private
   * @param {Object} data
   * @param {Item} data.item
   * @param {Grid} data.fromGrid
   * @param {Number} data.fromIndex
   * @param {Grid} data.toGrid
   * @param {Number} data.toIndex
   */
  ItemDragPlaceholder.prototype._onMigrate = function (data) {
    // Make sure we have a matching item.
    if (data.item !== this._item) return;

    var grid = this._item.getGrid();
    var nextGrid = data.toGrid;

    // Unbind listeners from current grid.
    grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.off(EVENT_BEFORE_SEND, this._onMigrate);
    grid.off(EVENT_HIDE_START, this._onHide);

    // Bind listeners to the next grid.
    nextGrid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    nextGrid.on(EVENT_LAYOUT_START, this._onLayoutStart);
    nextGrid.on(EVENT_BEFORE_SEND, this._onMigrate);
    nextGrid.on(EVENT_HIDE_START, this._onHide);

    // Mark the item as migrated.
    this._didMigrate = true;
  };

  /**
   * Reset placeholder if the associated item is hidden.
   *
   * @private
   * @param {Item[]} items
   */
  ItemDragPlaceholder.prototype._onHide = function (items) {
    if (items.indexOf(this._item) > -1) this.reset();
  };

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Create placeholder. Note that this method only writes to DOM and does not
   * read anything from DOM so it should not cause any additional layout
   * thrashing when it's called at the end of the drag start procedure.
   *
   * @public
   */
  ItemDragPlaceholder.prototype.create = function () {
    // If we already have placeholder set up we can skip the initiation logic.
    if (this.isActive()) {
      this._resetAfterLayout = false;
      return;
    }

    var item = this._item;
    var grid = item.getGrid();
    var settings = grid._settings;
    var animation = this._animation;

    // Keep track of layout position.
    this._left = item._left;
    this._top = item._top;

    // Create placeholder element.
    var element;
    if (isFunction(settings.dragPlaceholder.createElement)) {
      element = settings.dragPlaceholder.createElement(item);
    } else {
      element = document.createElement('div');
    }
    this._element = element;

    // Update element to animation instance.
    animation._element = element;

    // Add placeholder class to the placeholder element.
    this._className = settings.itemPlaceholderClass || '';
    if (this._className) {
      addClass(element, this._className);
    }

    // Set initial styles.
    setStyles(element, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: item._width + 'px',
      height: item._height + 'px',
    });

    // Set initial position.
    element.style[transformProp] = getTranslateString(
      item._left + item._marginLeft,
      item._top + item._marginTop
    );

    // Bind event listeners.
    grid.on(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.on(EVENT_BEFORE_SEND, this._onMigrate);
    grid.on(EVENT_HIDE_START, this._onHide);

    // onCreate hook.
    if (isFunction(settings.dragPlaceholder.onCreate)) {
      settings.dragPlaceholder.onCreate(item, element);
    }

    // Insert the placeholder element to the grid.
    grid.getElement().appendChild(element);
  };

  /**
   * Reset placeholder data.
   *
   * @public
   */
  ItemDragPlaceholder.prototype.reset = function () {
    if (!this.isActive()) return;

    var element = this._element;
    var item = this._item;
    var grid = item.getGrid();
    var settings = grid._settings;
    var animation = this._animation;

    // Reset flag.
    this._resetAfterLayout = false;

    // Cancel potential (queued) layout tick.
    cancelPlaceholderLayoutTick(item._id);
    cancelPlaceholderResizeTick(item._id);

    // Reset animation instance.
    animation.stop();
    animation._element = null;

    // Unbind event listeners.
    grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.off(EVENT_BEFORE_SEND, this._onMigrate);
    grid.off(EVENT_HIDE_START, this._onHide);

    // Remove placeholder class from the placeholder element.
    if (this._className) {
      removeClass(element, this._className);
      this._className = '';
    }

    // Remove element.
    element.parentNode.removeChild(element);
    this._element = null;

    // onRemove hook. Note that here we use the current grid's onRemove callback
    // so if the item has migrated during drag the onRemove method will not be
    // the originating grid's method.
    if (isFunction(settings.dragPlaceholder.onRemove)) {
      settings.dragPlaceholder.onRemove(item, element);
    }
  };

  /**
   * Check if placeholder is currently active (visible).
   *
   * @public
   * @returns {Boolean}
   */
  ItemDragPlaceholder.prototype.isActive = function () {
    return !!this._element;
  };

  /**
   * Get placeholder element.
   *
   * @public
   * @returns {?HTMLElement}
   */
  ItemDragPlaceholder.prototype.getElement = function () {
    return this._element;
  };

  /**
   * Update placeholder's dimensions to match the item's dimensions. Note that
   * the updating is done asynchronously in the next tick to avoid layout
   * thrashing.
   *
   * @public
   */
  ItemDragPlaceholder.prototype.updateDimensions = function () {
    if (!this.isActive()) return;
    addPlaceholderResizeTick(this._item._id, this._updateDimensions);
  };

  /**
   * Destroy placeholder instance.
   *
   * @public
   */
  ItemDragPlaceholder.prototype.destroy = function () {
    this.reset();
    this._animation.destroy();
    this._item = this._animation = null;
  };

  /**
   * The release process handler constructor. Although this might seem as proper
   * fit for the drag process this needs to be separated into it's own logic
   * because there might be a scenario where drag is disabled, but the release
   * process still needs to be implemented (dragging from a grid to another).
   *
   * @class
   * @param {Item} item
   */
  function ItemDragRelease(item) {
    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._isPositioningStarted = false;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Start the release process of an item.
   *
   * @public
   */
  ItemDragRelease.prototype.start = function () {
    if (this._isDestroyed || this._isActive) return;

    var item = this._item;
    var grid = item.getGrid();
    var settings = grid._settings;

    this._isActive = true;
    addClass(item._element, settings.itemReleasingClass);
    if (!settings.dragRelease.useDragContainer) {
      this._placeToGrid();
    }
    grid._emit(EVENT_DRAG_RELEASE_START, item);

    // Let's start layout manually _only_ if there is no unfinished layout in
    // about to finish.
    if (!grid._nextLayoutData) item._layout.start(false);
  };

  /**
   * End the release process of an item. This method can be used to abort an
   * ongoing release process (animation) or finish the release process.
   *
   * @public
   * @param {Boolean} [abort=false]
   *  - Should the release be aborted? When true, the release end event won't be
   *    emitted. Set to true only when you need to abort the release process
   *    while the item is animating to it's position.
   * @param {Number} [left]
   *  - The element's current translateX value (optional).
   * @param {Number} [top]
   *  - The element's current translateY value (optional).
   */
  ItemDragRelease.prototype.stop = function (abort, left, top) {
    if (this._isDestroyed || !this._isActive) return;

    var item = this._item;
    var grid = item.getGrid();

    if (!abort && (left === undefined || top === undefined)) {
      left = item._left;
      top = item._top;
    }

    var didReparent = this._placeToGrid(left, top);
    this._reset(didReparent);

    if (!abort) grid._emit(EVENT_DRAG_RELEASE_END, item);
  };

  ItemDragRelease.prototype.isJustReleased = function () {
    return this._isActive && this._isPositioningStarted === false;
  };

  /**
   * Destroy instance.
   *
   * @public
   */
  ItemDragRelease.prototype.destroy = function () {
    if (this._isDestroyed) return;
    this.stop(true);
    this._item = null;
    this._isDestroyed = true;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Move the element back to the grid container element if it does not exist
   * there already.
   *
   * @private
   * @param {Number} [left]
   *  - The element's current translateX value (optional).
   * @param {Number} [top]
   *  - The element's current translateY value (optional).
   * @returns {Boolean}
   *   - Returns `true` if the element was reparented.
   */
  ItemDragRelease.prototype._placeToGrid = function (left, top) {
    if (this._isDestroyed) return;

    var item = this._item;
    var element = item._element;
    var container = item.getGrid()._element;
    var didReparent = false;

    if (element.parentNode !== container) {
      if (left === undefined || top === undefined) {
        var translate = getTranslate(element);
        left = translate.x - this._containerDiffX;
        top = translate.y - this._containerDiffY;
      }

      container.appendChild(element);
      item._setTranslate(left, top);
      didReparent = true;
    }

    this._containerDiffX = 0;
    this._containerDiffY = 0;

    return didReparent;
  };

  /**
   * Reset data and remove releasing class.
   *
   * @private
   * @param {Boolean} [needsReflow]
   */
  ItemDragRelease.prototype._reset = function (needsReflow) {
    if (this._isDestroyed) return;

    var item = this._item;
    var releasingClass = item.getGrid()._settings.itemReleasingClass;

    this._isActive = false;
    this._isPositioningStarted = false;
    this._containerDiffX = 0;
    this._containerDiffY = 0;

    // If the element was just reparented we need to do a forced reflow to remove
    // the class gracefully.
    if (releasingClass) {
      // eslint-disable-next-line
      if (needsReflow) item._element.clientWidth;
      removeClass(item._element, releasingClass);
    }
  };

  var MIN_ANIMATION_DISTANCE = 2;

  /**
   * Layout manager for Item instance, handles the positioning of an item.
   *
   * @class
   * @param {Item} item
   */
  function ItemLayout(item) {
    var element = item._element;
    var elementStyle = element.style;

    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._isInterrupted = false;
    this._currentStyles = {};
    this._targetStyles = {};
    this._nextLeft = 0;
    this._nextTop = 0;
    this._offsetLeft = 0;
    this._offsetTop = 0;
    this._skipNextAnimation = false;
    this._animOptions = {
      onFinish: this._finish.bind(this),
      duration: 0,
      easing: 0,
    };

    // Set element's initial position styles.
    elementStyle.left = '0px';
    elementStyle.top = '0px';
    item._setTranslate(0, 0);

    this._animation = new Animator(element);
    this._queue = 'layout-' + item._id;

    // Bind animation handlers and finish method.
    this._setupAnimation = this._setupAnimation.bind(this);
    this._startAnimation = this._startAnimation.bind(this);
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Start item layout based on it's current data.
   *
   * @public
   * @param {Boolean} instant
   * @param {Function} [onFinish]
   */
  ItemLayout.prototype.start = function (instant, onFinish) {
    if (this._isDestroyed) return;

    var item = this._item;
    var release = item._dragRelease;
    var gridSettings = item.getGrid()._settings;
    var isPositioning = this._isActive;
    var isJustReleased = release.isJustReleased();
    var animDuration = isJustReleased
      ? gridSettings.dragRelease.duration
      : gridSettings.layoutDuration;
    var animEasing = isJustReleased ? gridSettings.dragRelease.easing : gridSettings.layoutEasing;
    var animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;

    // If the item is currently positioning cancel potential queued layout tick
    // and process current layout callback queue with interrupted flag on.
    if (isPositioning) {
      cancelLayoutTick(item._id);
      item._emitter.burst(this._queue, true, item);
    }

    // Mark release positioning as started.
    if (isJustReleased) release._isPositioningStarted = true;

    // Push the callback to the callback queue.
    if (isFunction(onFinish)) {
      item._emitter.on(this._queue, onFinish);
    }

    // Reset animation skipping flag.
    this._skipNextAnimation = false;

    // If no animations are needed, easy peasy!
    if (!animEnabled) {
      this._updateOffsets();
      item._setTranslate(this._nextLeft, this._nextTop);
      this._animation.stop();
      this._finish();
      return;
    }

    // Kick off animation to be started in the next tick.
    this._isActive = true;
    this._animOptions.easing = animEasing;
    this._animOptions.duration = animDuration;
    this._isInterrupted = isPositioning;
    addLayoutTick(item._id, this._setupAnimation, this._startAnimation);
  };

  /**
   * Stop item's position animation if it is currently animating.
   *
   * @public
   * @param {Boolean} processCallbackQueue
   * @param {Number} [left]
   * @param {Number} [top]
   */
  ItemLayout.prototype.stop = function (processCallbackQueue, left, top) {
    if (this._isDestroyed || !this._isActive) return;

    var item = this._item;

    // Cancel animation init.
    cancelLayoutTick(item._id);

    // Stop animation.
    if (this._animation.isAnimating()) {
      if (left === undefined || top === undefined) {
        var translate = getTranslate(item._element);
        left = translate.x;
        top = translate.y;
      }
      item._setTranslate(left, top);
      this._animation.stop();
    }

    // Remove positioning class.
    removeClass(item._element, item.getGrid()._settings.itemPositioningClass);

    // Reset active state.
    this._isActive = false;

    // Process callback queue if needed.
    if (processCallbackQueue) {
      item._emitter.burst(this._queue, true, item);
    }
  };

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   */
  ItemLayout.prototype.destroy = function () {
    if (this._isDestroyed) return;

    var elementStyle = this._item._element.style;

    this.stop(true, 0, 0);
    this._item._emitter.clear(this._queue);
    this._animation.destroy();

    elementStyle[transformProp] = '';
    elementStyle.left = '';
    elementStyle.top = '';

    this._item = null;
    this._currentStyles = null;
    this._targetStyles = null;
    this._animOptions = null;
    this._isDestroyed = true;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Calculate and update item's current layout offset data.
   *
   * @private
   */
  ItemLayout.prototype._updateOffsets = function () {
    if (this._isDestroyed) return;

    var item = this._item;
    var migrate = item._migrate;
    var release = item._dragRelease;

    this._offsetLeft = release._isActive
      ? release._containerDiffX
      : migrate._isActive
      ? migrate._containerDiffX
      : 0;

    this._offsetTop = release._isActive
      ? release._containerDiffY
      : migrate._isActive
      ? migrate._containerDiffY
      : 0;

    this._nextLeft = this._item._left + this._offsetLeft;
    this._nextTop = this._item._top + this._offsetTop;
  };

  /**
   * Finish item layout procedure.
   *
   * @private
   */
  ItemLayout.prototype._finish = function () {
    if (this._isDestroyed) return;

    var item = this._item;
    var migrate = item._migrate;
    var release = item._dragRelease;

    // Update internal translate values.
    item._tX = this._nextLeft;
    item._tY = this._nextTop;

    // Mark the item as inactive and remove positioning classes.
    if (this._isActive) {
      this._isActive = false;
      removeClass(item._element, item.getGrid()._settings.itemPositioningClass);
    }

    // Finish up release and migration.
    if (release._isActive) release.stop();
    if (migrate._isActive) migrate.stop();

    // Process the callback queue.
    item._emitter.burst(this._queue, false, item);
  };

  /**
   * Prepare item for layout animation.
   *
   * @private
   */
  ItemLayout.prototype._setupAnimation = function () {
    var item = this._item;
    if (item._tX === undefined || item._tY === undefined) {
      var translate = getTranslate(item._element);
      item._tX = translate.x;
      item._tY = translate.y;
    }
  };

  /**
   * Start layout animation.
   *
   * @private
   */
  ItemLayout.prototype._startAnimation = function () {
    var item = this._item;
    var settings = item.getGrid()._settings;
    var isInstant = this._animOptions.duration <= 0;

    // Let's update the offset data and target styles.
    this._updateOffsets();

    var xDiff = Math.abs(item._left - (item._tX - this._offsetLeft));
    var yDiff = Math.abs(item._top - (item._tY - this._offsetTop));

    // If there is no need for animation or if the item is already in correct
    // position (or near it) let's finish the process early.
    if (isInstant || (xDiff < MIN_ANIMATION_DISTANCE && yDiff < MIN_ANIMATION_DISTANCE)) {
      if (xDiff || yDiff || this._isInterrupted) {
        item._setTranslate(this._nextLeft, this._nextTop);
      }
      this._animation.stop();
      this._finish();
      return;
    }

    // Set item's positioning class if needed.
    if (!this._isInterrupted) {
      addClass(item._element, settings.itemPositioningClass);
    }

    // Get current/next styles for animation.
    this._currentStyles[transformProp] = getTranslateString(item._tX, item._tY);
    this._targetStyles[transformProp] = getTranslateString(this._nextLeft, this._nextTop);

    // Set internal translation values to undefined for the duration of the
    // animation since they will be changing on each animation frame for the
    // duration of the animation and tracking them would mean reading the DOM on
    // each frame, which is pretty darn expensive.
    item._tX = item._tY = undefined;

    // Start animation.
    this._animation.start(this._currentStyles, this._targetStyles, this._animOptions);
  };

  /**
   * The migrate process handler constructor.
   *
   * @class
   * @param {Item} item
   */
  function ItemMigrate(item) {
    // Private props.
    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._container = false;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Start the migrate process of an item.
   *
   * @public
   * @param {Grid} targetGrid
   * @param {(HTMLElement|Number|Item)} position
   * @param {HTMLElement} [container]
   */
  ItemMigrate.prototype.start = function (targetGrid, position, container) {
    if (this._isDestroyed) return;

    var item = this._item;
    var element = item._element;
    var isActive = item.isActive();
    var isVisible = item.isVisible();
    var grid = item.getGrid();
    var settings = grid._settings;
    var targetSettings = targetGrid._settings;
    var targetElement = targetGrid._element;
    var targetItems = targetGrid._items;
    var currentIndex = grid._items.indexOf(item);
    var targetContainer = container || document.body;
    var targetIndex;
    var targetItem;
    var currentContainer;
    var offsetDiff;
    var containerDiff;
    var translate;
    var translateX;
    var translateY;
    var currentVisClass;
    var nextVisClass;

    // Get target index.
    if (typeof position === 'number') {
      targetIndex = normalizeArrayIndex(targetItems, position, 1);
    } else {
      targetItem = targetGrid.getItem(position);
      if (!targetItem) return;
      targetIndex = targetItems.indexOf(targetItem);
    }

    // Get current translateX and translateY values if needed.
    if (item.isPositioning() || this._isActive || item.isReleasing()) {
      translate = getTranslate(element);
      translateX = translate.x;
      translateY = translate.y;
    }

    // Abort current positioning.
    if (item.isPositioning()) {
      item._layout.stop(true, translateX, translateY);
    }

    // Abort current migration.
    if (this._isActive) {
      translateX -= this._containerDiffX;
      translateY -= this._containerDiffY;
      this.stop(true, translateX, translateY);
    }

    // Abort current release.
    if (item.isReleasing()) {
      translateX -= item._dragRelease._containerDiffX;
      translateY -= item._dragRelease._containerDiffY;
      item._dragRelease.stop(true, translateX, translateY);
    }

    // Stop current visibility animation.
    item._visibility.stop(true);

    // Destroy current drag.
    if (item._drag) item._drag.destroy();

    // Emit beforeSend event.
    if (grid._hasListeners(EVENT_BEFORE_SEND)) {
      grid._emit(EVENT_BEFORE_SEND, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Emit beforeReceive event.
    if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
      targetGrid._emit(EVENT_BEFORE_RECEIVE, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Update item class.
    if (settings.itemClass !== targetSettings.itemClass) {
      removeClass(element, settings.itemClass);
      addClass(element, targetSettings.itemClass);
    }

    // Update visibility class.
    currentVisClass = isVisible ? settings.itemVisibleClass : settings.itemHiddenClass;
    nextVisClass = isVisible ? targetSettings.itemVisibleClass : targetSettings.itemHiddenClass;
    if (currentVisClass !== nextVisClass) {
      removeClass(element, currentVisClass);
      addClass(element, nextVisClass);
    }

    // Move item instance from current grid to target grid.
    grid._items.splice(currentIndex, 1);
    arrayInsert(targetItems, item, targetIndex);

    // Update item's grid id reference.
    item._gridId = targetGrid._id;

    // If item is active we need to move the item inside the target container for
    // the duration of the (potential) animation if it's different than the
    // current container.
    if (isActive) {
      currentContainer = element.parentNode;
      if (targetContainer !== currentContainer) {
        targetContainer.appendChild(element);
        offsetDiff = getOffsetDiff(targetContainer, currentContainer, true);
        if (!translate) {
          translate = getTranslate(element);
          translateX = translate.x;
          translateY = translate.y;
        }
        item._setTranslate(translateX + offsetDiff.left, translateY + offsetDiff.top);
      }
    }
    // If item is not active let's just append it to the target grid's element.
    else {
      targetElement.appendChild(element);
    }

    // Update child element's styles to reflect the current visibility state.
    item._visibility.setStyles(
      isVisible ? targetSettings.visibleStyles : targetSettings.hiddenStyles
    );

    // Get offset diff for the migration data, if the item is active.
    if (isActive) {
      containerDiff = getOffsetDiff(targetContainer, targetElement, true);
    }

    // Update item's cached dimensions.
    item._refreshDimensions();

    // Reset item's sort data.
    item._sortData = null;

    // Create new drag handler.
    item._drag = targetSettings.dragEnabled ? new ItemDrag(item) : null;

    // Setup migration data.
    if (isActive) {
      this._isActive = true;
      this._container = targetContainer;
      this._containerDiffX = containerDiff.left;
      this._containerDiffY = containerDiff.top;
    } else {
      this._isActive = false;
      this._container = null;
      this._containerDiffX = 0;
      this._containerDiffY = 0;
    }

    // Emit send event.
    if (grid._hasListeners(EVENT_SEND)) {
      grid._emit(EVENT_SEND, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Emit receive event.
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

  /**
   * End the migrate process of an item. This method can be used to abort an
   * ongoing migrate process (animation) or finish the migrate process.
   *
   * @public
   * @param {Boolean} [abort=false]
   *  - Should the migration be aborted?
   * @param {Number} [left]
   *  - The element's current translateX value (optional).
   * @param {Number} [top]
   *  - The element's current translateY value (optional).
   */
  ItemMigrate.prototype.stop = function (abort, left, top) {
    if (this._isDestroyed || !this._isActive) return;

    var item = this._item;
    var element = item._element;
    var grid = item.getGrid();
    var gridElement = grid._element;
    var translate;

    if (this._container !== gridElement) {
      if (left === undefined || top === undefined) {
        if (abort) {
          translate = getTranslate(element);
          left = translate.x - this._containerDiffX;
          top = translate.y - this._containerDiffY;
        } else {
          left = item._left;
          top = item._top;
        }
      }

      gridElement.appendChild(element);
      item._setTranslate(left, top);
    }

    this._isActive = false;
    this._container = null;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
  };

  /**
   * Destroy instance.
   *
   * @public
   */
  ItemMigrate.prototype.destroy = function () {
    if (this._isDestroyed) return;
    this.stop(true);
    this._item = null;
    this._isDestroyed = true;
  };

  /**
   * Visibility manager for Item instance, handles visibility of an item.
   *
   * @class
   * @param {Item} item
   */
  function ItemVisibility(item) {
    var isActive = item._isActive;
    var element = item._element;
    var childElement = element.children[0];
    var settings = item.getGrid()._settings;

    if (!childElement) {
      throw new Error('No valid child element found within item element.');
    }

    this._item = item;
    this._isDestroyed = false;
    this._isHidden = !isActive;
    this._isHiding = false;
    this._isShowing = false;
    this._childElement = childElement;
    this._currentStyleProps = [];
    this._animation = new Animator(childElement);
    this._queue = 'visibility-' + item._id;
    this._finishShow = this._finishShow.bind(this);
    this._finishHide = this._finishHide.bind(this);

    element.style.display = isActive ? '' : 'none';
    addClass(element, isActive ? settings.itemVisibleClass : settings.itemHiddenClass);
    this.setStyles(isActive ? settings.visibleStyles : settings.hiddenStyles);
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Show item.
   *
   * @public
   * @param {Boolean} instant
   * @param {Function} [onFinish]
   */
  ItemVisibility.prototype.show = function (instant, onFinish) {
    if (this._isDestroyed) return;

    var item = this._item;
    var element = item._element;
    var callback = isFunction(onFinish) ? onFinish : null;
    var grid = item.getGrid();
    var settings = grid._settings;

    // If item is visible call the callback and be done with it.
    if (!this._isShowing && !this._isHidden) {
      callback && callback(false, item);
      return;
    }

    // If item is showing and does not need to be shown instantly, let's just
    // push callback to the callback queue and be done with it.
    if (this._isShowing && !instant) {
      callback && item._emitter.on(this._queue, callback);
      return;
    }

    // If the item is hiding or hidden process the current visibility callback
    // queue with the interrupted flag active, update classes and set display
    // to block if necessary.
    if (!this._isShowing) {
      item._emitter.burst(this._queue, true, item);
      removeClass(element, settings.itemHiddenClass);
      addClass(element, settings.itemVisibleClass);
      if (!this._isHiding) element.style.display = '';
    }

    // Push callback to the callback queue.
    callback && item._emitter.on(this._queue, callback);

    // Update visibility states.
    this._isShowing = true;
    this._isHiding = this._isHidden = false;

    // Finally let's start show animation.
    this._startAnimation(true, instant, this._finishShow);
  };

  /**
   * Hide item.
   *
   * @public
   * @param {Boolean} instant
   * @param {Function} [onFinish]
   */
  ItemVisibility.prototype.hide = function (instant, onFinish) {
    if (this._isDestroyed) return;

    var item = this._item;
    var element = item._element;
    var callback = isFunction(onFinish) ? onFinish : null;
    var grid = item.getGrid();
    var settings = grid._settings;

    // If item is already hidden call the callback and be done with it.
    if (!this._isHiding && this._isHidden) {
      callback && callback(false, item);
      return;
    }

    // If item is hiding and does not need to be hidden instantly, let's just
    // push callback to the callback queue and be done with it.
    if (this._isHiding && !instant) {
      callback && item._emitter.on(this._queue, callback);
      return;
    }

    // If the item is showing or visible process the current visibility callback
    // queue with the interrupted flag active, update classes and set display
    // to block if necessary.
    if (!this._isHiding) {
      item._emitter.burst(this._queue, true, item);
      addClass(element, settings.itemHiddenClass);
      removeClass(element, settings.itemVisibleClass);
    }

    // Push callback to the callback queue.
    callback && item._emitter.on(this._queue, callback);

    // Update visibility states.
    this._isHidden = this._isHiding = true;
    this._isShowing = false;

    // Finally let's start hide animation.
    this._startAnimation(false, instant, this._finishHide);
  };

  /**
   * Stop current hiding/showing process.
   *
   * @public
   * @param {Boolean} processCallbackQueue
   */
  ItemVisibility.prototype.stop = function (processCallbackQueue) {
    if (this._isDestroyed) return;
    if (!this._isHiding && !this._isShowing) return;

    var item = this._item;

    cancelVisibilityTick(item._id);
    this._animation.stop();
    if (processCallbackQueue) {
      item._emitter.burst(this._queue, true, item);
    }
  };

  /**
   * Reset all existing visibility styles and apply new visibility styles to the
   * visibility element. This method should be used to set styles when there is a
   * chance that the current style properties differ from the new ones (basically
   * on init and on migrations).
   *
   * @public
   * @param {Object} styles
   */
  ItemVisibility.prototype.setStyles = function (styles) {
    var childElement = this._childElement;
    var currentStyleProps = this._currentStyleProps;
    this._removeCurrentStyles();
    for (var prop in styles) {
      currentStyleProps.push(prop);
      childElement.style[prop] = styles[prop];
    }
  };

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   */
  ItemVisibility.prototype.destroy = function () {
    if (this._isDestroyed) return;

    var item = this._item;
    var element = item._element;
    var grid = item.getGrid();
    var settings = grid._settings;

    this.stop(true);
    item._emitter.clear(this._queue);
    this._animation.destroy();
    this._removeCurrentStyles();
    removeClass(element, settings.itemVisibleClass);
    removeClass(element, settings.itemHiddenClass);
    element.style.display = '';

    // Reset state.
    this._isHiding = this._isShowing = false;
    this._isDestroyed = this._isHidden = true;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Start visibility animation.
   *
   * @private
   * @param {Boolean} toVisible
   * @param {Boolean} [instant]
   * @param {Function} [onFinish]
   */
  ItemVisibility.prototype._startAnimation = function (toVisible, instant, onFinish) {
    if (this._isDestroyed) return;

    var item = this._item;
    var animation = this._animation;
    var childElement = this._childElement;
    var settings = item.getGrid()._settings;
    var targetStyles = toVisible ? settings.visibleStyles : settings.hiddenStyles;
    var duration = toVisible ? settings.showDuration : settings.hideDuration;
    var easing = toVisible ? settings.showEasing : settings.hideEasing;
    var isInstant = instant || duration <= 0;
    var currentStyles;

    // No target styles? Let's quit early.
    if (!targetStyles) {
      onFinish && onFinish();
      return;
    }

    // Cancel queued visibility tick.
    cancelVisibilityTick(item._id);

    // If we need to apply the styles instantly without animation.
    if (isInstant) {
      setStyles(childElement, targetStyles);
      animation.stop();
      onFinish && onFinish();
      return;
    }

    // Start the animation in the next tick (to avoid layout thrashing).
    addVisibilityTick(
      item._id,
      function () {
        currentStyles = getCurrentStyles(childElement, targetStyles);
      },
      function () {
        animation.start(currentStyles, targetStyles, {
          duration: duration,
          easing: easing,
          onFinish: onFinish,
        });
      }
    );
  };

  /**
   * Finish show procedure.
   *
   * @private
   */
  ItemVisibility.prototype._finishShow = function () {
    if (this._isHidden) return;
    this._isShowing = false;
    this._item._emitter.burst(this._queue, false, this._item);
  };

  /**
   * Finish hide procedure.
   *
   * @private
   */
  ItemVisibility.prototype._finishHide = function () {
    if (!this._isHidden) return;
    var item = this._item;
    this._isHiding = false;
    item._layout.stop(true, 0, 0);
    item._element.style.display = 'none';
    item._emitter.burst(this._queue, false, item);
  };

  /**
   * Remove currently applied visibility related inline style properties.
   *
   * @private
   */
  ItemVisibility.prototype._removeCurrentStyles = function () {
    var childElement = this._childElement;
    var currentStyleProps = this._currentStyleProps;

    for (var i = 0; i < currentStyleProps.length; i++) {
      childElement.style[currentStyleProps[i]] = '';
    }

    currentStyleProps.length = 0;
  };

  var id = 0;

  /**
   * Returns a unique numeric id (increments a base value on every call).
   * @returns {Number}
   */
  function createUid() {
    return ++id;
  }

  /**
   * Creates a new Item instance for a Grid instance.
   *
   * @class
   * @param {Grid} grid
   * @param {HTMLElement} element
   * @param {Boolean} [isActive]
   */
  function Item(grid, element, isActive) {
    var settings = grid._settings;

    // Store item/element pair to a map (for faster item querying by element).
    if (ITEM_ELEMENT_MAP) {
      if (ITEM_ELEMENT_MAP.has(element)) {
        throw new Error('You can only create one Muuri Item per element!');
      } else {
        ITEM_ELEMENT_MAP.set(element, this);
      }
    }

    this._id = createUid();
    this._gridId = grid._id;
    this._element = element;
    this._isDestroyed = false;
    this._left = 0;
    this._top = 0;
    this._width = 0;
    this._height = 0;
    this._marginLeft = 0;
    this._marginRight = 0;
    this._marginTop = 0;
    this._marginBottom = 0;
    this._tX = undefined;
    this._tY = undefined;
    this._sortData = null;
    this._emitter = new Emitter();

    // If the provided item element is not a direct child of the grid container
    // element, append it to the grid container. Note, we are indeed reading the
    // DOM here but it's a property that does not cause reflowing.
    if (element.parentNode !== grid._element) {
      grid._element.appendChild(element);
    }

    // Set item class.
    addClass(element, settings.itemClass);

    // If isActive is not defined, let's try to auto-detect it. Note, we are
    // indeed reading the DOM here but it's a property that does not cause
    // reflowing.
    if (typeof isActive !== 'boolean') {
      isActive = getStyle(element, 'display') !== 'none';
    }

    // Set up active state (defines if the item is considered part of the layout
    // or not).
    this._isActive = isActive;

    // Setup visibility handler.
    this._visibility = new ItemVisibility(this);

    // Set up layout handler.
    this._layout = new ItemLayout(this);

    // Set up migration handler data.
    this._migrate = new ItemMigrate(this);

    // Set up drag handler.
    this._drag = settings.dragEnabled ? new ItemDrag(this) : null;

    // Set up release handler. Note that although this is fully linked to dragging
    // this still needs to be always instantiated to handle migration scenarios
    // correctly.
    this._dragRelease = new ItemDragRelease(this);

    // Set up drag placeholder handler. Note that although this is fully linked to
    // dragging this still needs to be always instantiated to handle migration
    // scenarios correctly.
    this._dragPlaceholder = new ItemDragPlaceholder(this);

    // Note! You must call the following methods before you start using the
    // instance. They are deliberately not called in the end as it would cause
    // potentially a massive amount of reflows if multiple items were instantiated
    // in a loop.
    // this._refreshDimensions();
    // this._refreshSortData();
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Get the instance grid reference.
   *
   * @public
   * @returns {Grid}
   */
  Item.prototype.getGrid = function () {
    return GRID_INSTANCES[this._gridId];
  };

  /**
   * Get the instance element.
   *
   * @public
   * @returns {HTMLElement}
   */
  Item.prototype.getElement = function () {
    return this._element;
  };

  /**
   * Get instance element's cached width.
   *
   * @public
   * @returns {Number}
   */
  Item.prototype.getWidth = function () {
    return this._width;
  };

  /**
   * Get instance element's cached height.
   *
   * @public
   * @returns {Number}
   */
  Item.prototype.getHeight = function () {
    return this._height;
  };

  /**
   * Get instance element's cached margins.
   *
   * @public
   * @returns {Object}
   *   - The returned object contains left, right, top and bottom properties
   *     which indicate the item element's cached margins.
   */
  Item.prototype.getMargin = function () {
    return {
      left: this._marginLeft,
      right: this._marginRight,
      top: this._marginTop,
      bottom: this._marginBottom,
    };
  };

  /**
   * Get instance element's cached position.
   *
   * @public
   * @returns {Object}
   *   - The returned object contains left and top properties which indicate the
   *     item element's cached position in the grid.
   */
  Item.prototype.getPosition = function () {
    return {
      left: this._left,
      top: this._top,
    };
  };

  /**
   * Is the item active?
   *
   * @public
   * @returns {Boolean}
   */
  Item.prototype.isActive = function () {
    return this._isActive;
  };

  /**
   * Is the item visible?
   *
   * @public
   * @returns {Boolean}
   */
  Item.prototype.isVisible = function () {
    return !!this._visibility && !this._visibility._isHidden;
  };

  /**
   * Is the item being animated to visible?
   *
   * @public
   * @returns {Boolean}
   */
  Item.prototype.isShowing = function () {
    return !!(this._visibility && this._visibility._isShowing);
  };

  /**
   * Is the item being animated to hidden?
   *
   * @public
   * @returns {Boolean}
   */
  Item.prototype.isHiding = function () {
    return !!(this._visibility && this._visibility._isHiding);
  };

  /**
   * Is the item positioning?
   *
   * @public
   * @returns {Boolean}
   */
  Item.prototype.isPositioning = function () {
    return !!(this._layout && this._layout._isActive);
  };

  /**
   * Is the item being dragged (or queued for dragging)?
   *
   * @public
   * @returns {Boolean}
   */
  Item.prototype.isDragging = function () {
    return !!(this._drag && this._drag._isActive);
  };

  /**
   * Is the item being released?
   *
   * @public
   * @returns {Boolean}
   */
  Item.prototype.isReleasing = function () {
    return !!(this._dragRelease && this._dragRelease._isActive);
  };

  /**
   * Is the item destroyed?
   *
   * @public
   * @returns {Boolean}
   */
  Item.prototype.isDestroyed = function () {
    return this._isDestroyed;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Recalculate item's dimensions.
   *
   * @private
   * @param {Boolean} [force=false]
   */
  Item.prototype._refreshDimensions = function (force) {
    if (this._isDestroyed) return;
    if (force !== true && this._visibility._isHidden) return;

    var element = this._element;
    var dragPlaceholder = this._dragPlaceholder;
    var rect = element.getBoundingClientRect();

    // Calculate width and height.
    this._width = rect.width;
    this._height = rect.height;

    // Calculate margins (ignore negative margins).
    this._marginLeft = Math.max(0, getStyleAsFloat(element, 'margin-left'));
    this._marginRight = Math.max(0, getStyleAsFloat(element, 'margin-right'));
    this._marginTop = Math.max(0, getStyleAsFloat(element, 'margin-top'));
    this._marginBottom = Math.max(0, getStyleAsFloat(element, 'margin-bottom'));

    // Keep drag placeholder's dimensions synced with the item's.
    if (dragPlaceholder) dragPlaceholder.updateDimensions();
  };

  /**
   * Fetch and store item's sort data.
   *
   * @private
   */
  Item.prototype._refreshSortData = function () {
    if (this._isDestroyed) return;

    var data = (this._sortData = {});
    var getters = this.getGrid()._settings.sortData;
    var prop;

    for (prop in getters) {
      data[prop] = getters[prop](this, this._element);
    }
  };

  /**
   * Add item to layout.
   *
   * @private
   */
  Item.prototype._addToLayout = function (left, top) {
    if (this._isActive === true) return;
    this._isActive = true;
    this._left = left || 0;
    this._top = top || 0;
  };

  /**
   * Remove item from layout.
   *
   * @private
   */
  Item.prototype._removeFromLayout = function () {
    if (this._isActive === false) return;
    this._isActive = false;
    this._left = 0;
    this._top = 0;
  };

  /**
   * Check if the layout procedure can be skipped for the item.
   *
   * @private
   * @param {Number} left
   * @param {Number} top
   * @returns {Boolean}
   */
  Item.prototype._canSkipLayout = function (left, top) {
    return (
      this._left === left &&
      this._top === top &&
      !this._migrate._isActive &&
      !this._layout._skipNextAnimation &&
      !this._dragRelease.isJustReleased()
    );
  };

  /**
   * Set the provided left and top arguments as the item element's translate
   * values in the DOM. This method keeps track of the currently applied
   * translate values and skips the update operation if the provided values are
   * identical to the currently applied values. Returns `false` if there was no
   * need for update and `true` if the translate value was updated.
   *
   * @private
   * @param {Number} left
   * @param {Number} top
   * @returns {Boolean}
   */
  Item.prototype._setTranslate = function (left, top) {
    if (this._tX === left && this._tY === top) return false;
    this._tX = left;
    this._tY = top;
    this._element.style[transformProp] = getTranslateString(left, top);
    return true;
  };

  /**
   * Destroy item instance.
   *
   * @private
   * @param {Boolean} [removeElement=false]
   */
  Item.prototype._destroy = function (removeElement) {
    if (this._isDestroyed) return;

    var element = this._element;
    var grid = this.getGrid();
    var settings = grid._settings;

    // Destroy handlers.
    this._dragPlaceholder.destroy();
    this._dragRelease.destroy();
    this._migrate.destroy();
    this._layout.destroy();
    this._visibility.destroy();
    if (this._drag) this._drag.destroy();

    // Destroy emitter.
    this._emitter.destroy();

    // Remove item class.
    removeClass(element, settings.itemClass);

    // Remove element from DOM.
    if (removeElement) element.parentNode.removeChild(element);

    // Remove item/element pair from map.
    if (ITEM_ELEMENT_MAP) ITEM_ELEMENT_MAP.delete(element);

    // Reset state.
    this._isActive = false;
    this._isDestroyed = true;
  };

  function createPackerProcessor(isWorker) {
    var FILL_GAPS = 1;
    var HORIZONTAL = 2;
    var ALIGN_RIGHT = 4;
    var ALIGN_BOTTOM = 8;
    var ROUNDING = 16;

    var EPS = 0.001;
    var MIN_SLOT_SIZE = 0.5;

    // Rounds number first to three decimal precision and then floors the result
    // to two decimal precision.
    // Math.floor(Math.round(number * 1000) / 10) / 100
    function roundNumber(number) {
      return ((((number * 1000 + 0.5) << 0) / 10) << 0) / 100;
    }

    /**
     * @class
     */
    function PackerProcessor() {
      this.currentRects = [];
      this.nextRects = [];
      this.rectTarget = {};
      this.rectStore = [];
      this.slotSizes = [];
      this.rectId = 0;
      this.slotIndex = -1;
      this.slotData = { left: 0, top: 0, width: 0, height: 0 };
      this.sortRectsLeftTop = this.sortRectsLeftTop.bind(this);
      this.sortRectsTopLeft = this.sortRectsTopLeft.bind(this);
    }

    /**
     * Takes a layout object as an argument and computes positions (slots) for the
     * layout items. Also computes the final width and height of the layout. The
     * provided layout object's slots array is mutated as well as the width and
     * height properties.
     *
     * @param {Object} layout
     * @param {Number} layout.width
     *   - The start (current) width of the layout in pixels.
     * @param {Number} layout.height
     *   - The start (current) height of the layout in pixels.
     * @param {(Item[]|Number[])} layout.items
     *   - List of Muuri.Item instances or a list of item dimensions
     *     (e.g [ item1Width, item1Height, item2Width, item2Height, ... ]).
     * @param {(Array|Float32Array)} layout.slots
     *   - An Array/Float32Array instance which's length should equal to
     *     the amount of items times two. The position (width and height) of each
     *     item will be written into this array.
     * @param {Number} settings
     *   - The layout's settings as bitmasks.
     * @returns {Object}
     */
    PackerProcessor.prototype.computeLayout = function (layout, settings) {
      var items = layout.items;
      var slots = layout.slots;
      var fillGaps = !!(settings & FILL_GAPS);
      var horizontal = !!(settings & HORIZONTAL);
      var alignRight = !!(settings & ALIGN_RIGHT);
      var alignBottom = !!(settings & ALIGN_BOTTOM);
      var rounding = !!(settings & ROUNDING);
      var isPreProcessed = typeof items[0] === 'number';
      var i, bump, item, slotWidth, slotHeight, slot;

      // No need to go further if items do not exist.
      if (!items.length) return layout;

      // Compute slots for the items.
      bump = isPreProcessed ? 2 : 1;
      for (i = 0; i < items.length; i += bump) {
        // If items are pre-processed it means that items array contains only
        // the raw dimensions of the items. Otherwise we assume it is an array
        // of normal Muuri items.
        if (isPreProcessed) {
          slotWidth = items[i];
          slotHeight = items[i + 1];
        } else {
          item = items[i];
          slotWidth = item._width + item._marginLeft + item._marginRight;
          slotHeight = item._height + item._marginTop + item._marginBottom;
        }

        // If rounding is enabled let's round the item's width and height to
        // make the layout algorithm a bit more stable. This has a performance
        // cost so don't use this if not necessary.
        if (rounding) {
          slotWidth = roundNumber(slotWidth);
          slotHeight = roundNumber(slotHeight);
        }

        // Get slot data.
        slot = this.computeNextSlot(layout, slotWidth, slotHeight, fillGaps, horizontal);

        // Update layout width/height.
        if (horizontal) {
          if (slot.left + slot.width > layout.width) {
            layout.width = slot.left + slot.width;
          }
        } else {
          if (slot.top + slot.height > layout.height) {
            layout.height = slot.top + slot.height;
          }
        }

        // Add item slot data to layout slots.
        slots[++this.slotIndex] = slot.left;
        slots[++this.slotIndex] = slot.top;

        // Store the size too (for later usage) if needed.
        if (alignRight || alignBottom) {
          this.slotSizes.push(slot.width, slot.height);
        }
      }

      // If the alignment is set to right we need to adjust the results.
      if (alignRight) {
        for (i = 0; i < slots.length; i += 2) {
          slots[i] = layout.width - (slots[i] + this.slotSizes[i]);
        }
      }

      // If the alignment is set to bottom we need to adjust the results.
      if (alignBottom) {
        for (i = 1; i < slots.length; i += 2) {
          slots[i] = layout.height - (slots[i] + this.slotSizes[i]);
        }
      }

      // Reset stuff.
      this.slotSizes.length = 0;
      this.currentRects.length = 0;
      this.nextRects.length = 0;
      this.rectId = 0;
      this.slotIndex = -1;

      return layout;
    };

    /**
     * Calculate next slot in the layout. Returns a slot object with position and
     * dimensions data. The returned object is reused between calls.
     *
     * @param {Object} layout
     * @param {Number} slotWidth
     * @param {Number} slotHeight
     * @param {Boolean} fillGaps
     * @param {Boolean} horizontal
     * @returns {Object}
     */
    PackerProcessor.prototype.computeNextSlot = function (
      layout,
      slotWidth,
      slotHeight,
      fillGaps,
      horizontal
    ) {
      var slot = this.slotData;
      var currentRects = this.currentRects;
      var nextRects = this.nextRects;
      var ignoreCurrentRects = false;
      var rect;
      var rectId;
      var shards;
      var i;
      var j;

      // Reset new slots.
      nextRects.length = 0;

      // Set item slot initial data.
      slot.left = null;
      slot.top = null;
      slot.width = slotWidth;
      slot.height = slotHeight;

      // Try to find position for the slot from the existing free spaces in the
      // layout.
      for (i = 0; i < currentRects.length; i++) {
        rectId = currentRects[i];
        if (!rectId) continue;
        rect = this.getRect(rectId);
        if (slot.width <= rect.width + EPS && slot.height <= rect.height + EPS) {
          slot.left = rect.left;
          slot.top = rect.top;
          break;
        }
      }

      // If no position was found for the slot let's position the slot to
      // the bottom left (in vertical mode) or top right (in horizontal mode) of
      // the layout.
      if (slot.left === null) {
        if (horizontal) {
          slot.left = layout.width;
          slot.top = 0;
        } else {
          slot.left = 0;
          slot.top = layout.height;
        }

        // If gaps don't need filling let's throw away all the current free spaces
        // (currentRects).
        if (!fillGaps) {
          ignoreCurrentRects = true;
        }
      }

      // In vertical mode, if the slot's bottom overlaps the layout's bottom.
      if (!horizontal && slot.top + slot.height > layout.height + EPS) {
        // If slot is not aligned to the left edge, create a new free space to the
        // left of the slot.
        if (slot.left > MIN_SLOT_SIZE) {
          nextRects.push(this.addRect(0, layout.height, slot.left, Infinity));
        }

        // If slot is not aligned to the right edge, create a new free space to
        // the right of the slot.
        if (slot.left + slot.width < layout.width - MIN_SLOT_SIZE) {
          nextRects.push(
            this.addRect(
              slot.left + slot.width,
              layout.height,
              layout.width - slot.left - slot.width,
              Infinity
            )
          );
        }

        // Update layout height.
        layout.height = slot.top + slot.height;
      }

      // In horizontal mode, if the slot's right overlaps the layout's right edge.
      if (horizontal && slot.left + slot.width > layout.width + EPS) {
        // If slot is not aligned to the top, create a new free space above the
        // slot.
        if (slot.top > MIN_SLOT_SIZE) {
          nextRects.push(this.addRect(layout.width, 0, Infinity, slot.top));
        }

        // If slot is not aligned to the bottom, create a new free space below
        // the slot.
        if (slot.top + slot.height < layout.height - MIN_SLOT_SIZE) {
          nextRects.push(
            this.addRect(
              layout.width,
              slot.top + slot.height,
              Infinity,
              layout.height - slot.top - slot.height
            )
          );
        }

        // Update layout width.
        layout.width = slot.left + slot.width;
      }

      // Clean up the current free spaces making sure none of them overlap with
      // the slot. Split all overlapping free spaces into smaller shards that do
      // not overlap with the slot.
      if (!ignoreCurrentRects) {
        if (fillGaps) i = 0;
        for (; i < currentRects.length; i++) {
          rectId = currentRects[i];
          if (!rectId) continue;
          rect = this.getRect(rectId);
          shards = this.splitRect(rect, slot);
          for (j = 0; j < shards.length; j++) {
            rectId = shards[j];
            rect = this.getRect(rectId);
            // Make sure that the free space is within the boundaries of the
            // layout. This routine is critical to the algorithm as it makes sure
            // that there are no leftover spaces with infinite height/width.
            // It's also essential that we don't compare values absolutely to each
            // other but leave a little headroom (EPSILON) to get rid of false
            // positives.
            if (
              horizontal ? rect.left + EPS < layout.width - EPS : rect.top + EPS < layout.height - EPS
            ) {
              nextRects.push(rectId);
            }
          }
        }
      }

      // Sanitize and sort all the new free spaces that will be used in the next
      // iteration. This procedure is critical to make the bin-packing algorithm
      // work. The free spaces have to be in correct order in the beginning of the
      // next iteration.
      if (nextRects.length > 1) {
        this.purgeRects(nextRects).sort(horizontal ? this.sortRectsLeftTop : this.sortRectsTopLeft);
      }

      // Finally we need to make sure that `this.currentRects` points to
      // `nextRects` array as that is used in the next iteration's beginning when
      // we try to find a space for the next slot.
      this.currentRects = nextRects;
      this.nextRects = currentRects;

      return slot;
    };

    /**
     * Add a new rectangle to the rectangle store. Returns the id of the new
     * rectangle.
     *
     * @param {Number} left
     * @param {Number} top
     * @param {Number} width
     * @param {Number} height
     * @returns {Number}
     */
    PackerProcessor.prototype.addRect = function (left, top, width, height) {
      var rectId = ++this.rectId;
      this.rectStore[rectId] = left || 0;
      this.rectStore[++this.rectId] = top || 0;
      this.rectStore[++this.rectId] = width || 0;
      this.rectStore[++this.rectId] = height || 0;
      return rectId;
    };

    /**
     * Get rectangle data from the rectangle store by id. Optionally you can
     * provide a target object where the rectangle data will be written in. By
     * default an internal object is reused as a target object.
     *
     * @param {Number} id
     * @param {Object} [target]
     * @returns {Object}
     */
    PackerProcessor.prototype.getRect = function (id, target) {
      if (!target) target = this.rectTarget;
      target.left = this.rectStore[id] || 0;
      target.top = this.rectStore[++id] || 0;
      target.width = this.rectStore[++id] || 0;
      target.height = this.rectStore[++id] || 0;
      return target;
    };

    /**
     * Punch a hole into a rectangle and return the shards (1-4).
     *
     * @param {Object} rect
     * @param {Object} hole
     * @returns {Number[]}
     */
    PackerProcessor.prototype.splitRect = (function () {
      var shards = [];
      var width = 0;
      var height = 0;
      return function (rect, hole) {
        // Reset old shards.
        shards.length = 0;

        // If the slot does not overlap with the hole add slot to the return data
        // as is. Note that in this case we are eager to keep the slot as is if
        // possible so we use the EPSILON in favour of that logic.
        if (
          rect.left + rect.width <= hole.left + EPS ||
          hole.left + hole.width <= rect.left + EPS ||
          rect.top + rect.height <= hole.top + EPS ||
          hole.top + hole.height <= rect.top + EPS
        ) {
          shards.push(this.addRect(rect.left, rect.top, rect.width, rect.height));
          return shards;
        }

        // Left split.
        width = hole.left - rect.left;
        if (width >= MIN_SLOT_SIZE) {
          shards.push(this.addRect(rect.left, rect.top, width, rect.height));
        }

        // Right split.
        width = rect.left + rect.width - (hole.left + hole.width);
        if (width >= MIN_SLOT_SIZE) {
          shards.push(this.addRect(hole.left + hole.width, rect.top, width, rect.height));
        }

        // Top split.
        height = hole.top - rect.top;
        if (height >= MIN_SLOT_SIZE) {
          shards.push(this.addRect(rect.left, rect.top, rect.width, height));
        }

        // Bottom split.
        height = rect.top + rect.height - (hole.top + hole.height);
        if (height >= MIN_SLOT_SIZE) {
          shards.push(this.addRect(rect.left, hole.top + hole.height, rect.width, height));
        }

        return shards;
      };
    })();

    /**
     * Check if a rectangle is fully within another rectangle.
     *
     * @param {Object} a
     * @param {Object} b
     * @returns {Boolean}
     */
    PackerProcessor.prototype.isRectAWithinRectB = function (a, b) {
      return (
        a.left + EPS >= b.left &&
        a.top + EPS >= b.top &&
        a.left + a.width - EPS <= b.left + b.width &&
        a.top + a.height - EPS <= b.top + b.height
      );
    };

    /**
     * Loops through an array of rectangle ids and resets all that are fully
     * within another rectangle in the array. Resetting in this case means that
     * the rectangle id value is replaced with zero.
     *
     * @param {Number[]} rectIds
     * @returns {Number[]}
     */
    PackerProcessor.prototype.purgeRects = (function () {
      var rectA = {};
      var rectB = {};
      return function (rectIds) {
        var i = rectIds.length;
        var j;

        while (i--) {
          j = rectIds.length;
          if (!rectIds[i]) continue;
          this.getRect(rectIds[i], rectA);
          while (j--) {
            if (!rectIds[j] || i === j) continue;
            this.getRect(rectIds[j], rectB);
            if (this.isRectAWithinRectB(rectA, rectB)) {
              rectIds[i] = 0;
              break;
            }
          }
        }

        return rectIds;
      };
    })();

    /**
     * Sort rectangles with top-left gravity.
     *
     * @param {Number} aId
     * @param {Number} bId
     * @returns {Number}
     */
    PackerProcessor.prototype.sortRectsTopLeft = (function () {
      var rectA = {};
      var rectB = {};
      return function (aId, bId) {
        this.getRect(aId, rectA);
        this.getRect(bId, rectB);

        return rectA.top < rectB.top && rectA.top + EPS < rectB.top
          ? -1
          : rectA.top > rectB.top && rectA.top - EPS > rectB.top
          ? 1
          : rectA.left < rectB.left && rectA.left + EPS < rectB.left
          ? -1
          : rectA.left > rectB.left && rectA.left - EPS > rectB.left
          ? 1
          : 0;
      };
    })();

    /**
     * Sort rectangles with left-top gravity.
     *
     * @param {Number} aId
     * @param {Number} bId
     * @returns {Number}
     */
    PackerProcessor.prototype.sortRectsLeftTop = (function () {
      var rectA = {};
      var rectB = {};
      return function (aId, bId) {
        this.getRect(aId, rectA);
        this.getRect(bId, rectB);
        return rectA.left < rectB.left && rectA.left + EPS < rectB.left
          ? -1
          : rectA.left > rectB.left && rectA.left - EPS < rectB.left
          ? 1
          : rectA.top < rectB.top && rectA.top + EPS < rectB.top
          ? -1
          : rectA.top > rectB.top && rectA.top - EPS > rectB.top
          ? 1
          : 0;
      };
    })();

    if (isWorker) {
      var PACKET_INDEX_WIDTH = 1;
      var PACKET_INDEX_HEIGHT = 2;
      var PACKET_INDEX_OPTIONS = 3;
      var PACKET_HEADER_SLOTS = 4;
      var processor = new PackerProcessor();

      self.onmessage = function (msg) {
        var data = new Float32Array(msg.data);
        var items = data.subarray(PACKET_HEADER_SLOTS, data.length);
        var slots = new Float32Array(items.length);
        var settings = data[PACKET_INDEX_OPTIONS];
        var layout = {
          items: items,
          slots: slots,
          width: data[PACKET_INDEX_WIDTH],
          height: data[PACKET_INDEX_HEIGHT],
        };

        // Compute the layout (width / height / slots).
        processor.computeLayout(layout, settings);

        // Copy layout data to the return data.
        data[PACKET_INDEX_WIDTH] = layout.width;
        data[PACKET_INDEX_HEIGHT] = layout.height;
        data.set(layout.slots, PACKET_HEADER_SLOTS);

        // Send layout back to the main thread.
        postMessage(data.buffer, [data.buffer]);
      };
    }

    return PackerProcessor;
  }

  var PackerProcessor = createPackerProcessor();

  //
  // WORKER UTILS
  //

  var blobUrl = null;
  var activeWorkers = [];

  function createWorkerProcessors(amount, onmessage) {
    var workers = [];

    if (amount > 0) {
      if (!blobUrl) {
        blobUrl = URL.createObjectURL(
          new Blob(['(' + createPackerProcessor.toString() + ')(true)'], {
            type: 'application/javascript',
          })
        );
      }

      for (var i = 0, worker; i < amount; i++) {
        worker = new Worker(blobUrl);
        if (onmessage) worker.onmessage = onmessage;
        workers.push(worker);
        activeWorkers.push(worker);
      }
    }

    return workers;
  }

  function destroyWorkerProcessors(workers) {
    var worker;
    var index;

    for (var i = 0; i < workers.length; i++) {
      worker = workers[i];
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();

      index = activeWorkers.indexOf(worker);
      if (index > -1) activeWorkers.splice(index, 1);
    }

    if (blobUrl && !activeWorkers.length) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
  }

  function isWorkerProcessorsSupported() {
    return !!(window.Worker && window.URL && window.Blob);
  }

  var FILL_GAPS = 1;
  var HORIZONTAL = 2;
  var ALIGN_RIGHT = 4;
  var ALIGN_BOTTOM = 8;
  var ROUNDING = 16;
  var PACKET_INDEX_ID = 0;
  var PACKET_INDEX_WIDTH = 1;
  var PACKET_INDEX_HEIGHT = 2;
  var PACKET_INDEX_OPTIONS = 3;
  var PACKET_HEADER_SLOTS = 4;

  /**
   * @class
   * @param {Number} [numWorkers=0]
   * @param {Object} [options]
   * @param {Boolean} [options.fillGaps=false]
   * @param {Boolean} [options.horizontal=false]
   * @param {Boolean} [options.alignRight=false]
   * @param {Boolean} [options.alignBottom=false]
   * @param {Boolean} [options.rounding=false]
   */
  function Packer(numWorkers, options) {
    this._options = 0;
    this._processor = null;
    this._layoutQueue = [];
    this._layouts = {};
    this._layoutCallbacks = {};
    this._layoutWorkers = {};
    this._layoutWorkerData = {};
    this._workers = [];
    this._onWorkerMessage = this._onWorkerMessage.bind(this);

    // Set initial options.
    this.setOptions(options);

    // Init the worker(s) or the processor if workers can't be used.
    numWorkers = typeof numWorkers === 'number' ? Math.max(0, numWorkers) : 0;
    if (numWorkers && isWorkerProcessorsSupported()) {
      try {
        this._workers = createWorkerProcessors(numWorkers, this._onWorkerMessage);
      } catch (e) {
        this._processor = new PackerProcessor();
      }
    } else {
      this._processor = new PackerProcessor();
    }
  }

  Packer.prototype._sendToWorker = function () {
    if (!this._layoutQueue.length || !this._workers.length) return;

    var layoutId = this._layoutQueue.shift();
    var worker = this._workers.pop();
    var data = this._layoutWorkerData[layoutId];

    delete this._layoutWorkerData[layoutId];
    this._layoutWorkers[layoutId] = worker;
    worker.postMessage(data.buffer, [data.buffer]);
  };

  Packer.prototype._onWorkerMessage = function (msg) {
    var data = new Float32Array(msg.data);
    var layoutId = data[PACKET_INDEX_ID];
    var layout = this._layouts[layoutId];
    var callback = this._layoutCallbacks[layoutId];
    var worker = this._layoutWorkers[layoutId];

    if (layout) delete this._layoutCallbacks[layoutId];
    if (callback) delete this._layoutCallbacks[layoutId];
    if (worker) delete this._layoutWorkers[layoutId];

    if (layout && callback) {
      layout.width = data[PACKET_INDEX_WIDTH];
      layout.height = data[PACKET_INDEX_HEIGHT];
      layout.slots = data.subarray(PACKET_HEADER_SLOTS, data.length);
      this._finalizeLayout(layout);
      callback(layout);
    }

    if (worker) {
      this._workers.push(worker);
      this._sendToWorker();
    }
  };

  Packer.prototype._finalizeLayout = function (layout) {
    var grid = layout._grid;
    var isHorizontal = layout._settings & HORIZONTAL;
    var isBorderBox = grid._boxSizing === 'border-box';

    delete layout._grid;
    delete layout._settings;

    layout.styles = {};

    if (isHorizontal) {
      layout.styles.width =
        (isBorderBox ? layout.width + grid._borderLeft + grid._borderRight : layout.width) + 'px';
    } else {
      layout.styles.height =
        (isBorderBox ? layout.height + grid._borderTop + grid._borderBottom : layout.height) + 'px';
    }

    return layout;
  };

  /**
   * @public
   * @param {Object} [options]
   * @param {Boolean} [options.fillGaps]
   * @param {Boolean} [options.horizontal]
   * @param {Boolean} [options.alignRight]
   * @param {Boolean} [options.alignBottom]
   * @param {Boolean} [options.rounding]
   */
  Packer.prototype.setOptions = function (options) {
    if (!options) return;

    var fillGaps;
    if (typeof options.fillGaps === 'boolean') {
      fillGaps = options.fillGaps ? FILL_GAPS : 0;
    } else {
      fillGaps = this._options & FILL_GAPS;
    }

    var horizontal;
    if (typeof options.horizontal === 'boolean') {
      horizontal = options.horizontal ? HORIZONTAL : 0;
    } else {
      horizontal = this._options & HORIZONTAL;
    }

    var alignRight;
    if (typeof options.alignRight === 'boolean') {
      alignRight = options.alignRight ? ALIGN_RIGHT : 0;
    } else {
      alignRight = this._options & ALIGN_RIGHT;
    }

    var alignBottom;
    if (typeof options.alignBottom === 'boolean') {
      alignBottom = options.alignBottom ? ALIGN_BOTTOM : 0;
    } else {
      alignBottom = this._options & ALIGN_BOTTOM;
    }

    var rounding;
    if (typeof options.rounding === 'boolean') {
      rounding = options.rounding ? ROUNDING : 0;
    } else {
      rounding = this._options & ROUNDING;
    }

    this._options = fillGaps | horizontal | alignRight | alignBottom | rounding;
  };

  /**
   * @public
   * @param {Grid} grid
   * @param {Number} layoutId
   * @param {Item[]} items
   * @param {Number} width
   * @param {Number} height
   * @param {Function} callback
   * @returns {?Function}
   */
  Packer.prototype.createLayout = function (grid, layoutId, items, width, height, callback) {
    if (this._layouts[layoutId]) {
      throw new Error('A layout with the provided id is currently being processed.');
    }

    var horizontal = this._options & HORIZONTAL;
    var layout = {
      id: layoutId,
      items: items,
      slots: null,
      width: horizontal ? 0 : width,
      height: !horizontal ? 0 : height,
      // Temporary data, which will be removed before sending the layout data
      // outside of Packer's context.
      _grid: grid,
      _settings: this._options,
    };

    // If there are no items let's call the callback immediately.
    if (!items.length) {
      layout.slots = [];
      this._finalizeLayout(layout);
      callback(layout);
      return;
    }

    // Create layout synchronously if needed.
    if (this._processor) {
      layout.slots = window.Float32Array
        ? new Float32Array(items.length * 2)
        : new Array(items.length * 2);
      this._processor.computeLayout(layout, layout._settings);
      this._finalizeLayout(layout);
      callback(layout);
      return;
    }

    // Worker data.
    var data = new Float32Array(PACKET_HEADER_SLOTS + items.length * 2);

    // Worker data header.
    data[PACKET_INDEX_ID] = layoutId;
    data[PACKET_INDEX_WIDTH] = layout.width;
    data[PACKET_INDEX_HEIGHT] = layout.height;
    data[PACKET_INDEX_OPTIONS] = layout._settings;

    // Worker data items.
    var i, j, item;
    for (i = 0, j = PACKET_HEADER_SLOTS - 1, item; i < items.length; i++) {
      item = items[i];
      data[++j] = item._width + item._marginLeft + item._marginRight;
      data[++j] = item._height + item._marginTop + item._marginBottom;
    }

    this._layoutQueue.push(layoutId);
    this._layouts[layoutId] = layout;
    this._layoutCallbacks[layoutId] = callback;
    this._layoutWorkerData[layoutId] = data;

    this._sendToWorker();

    return this.cancelLayout.bind(this, layoutId);
  };

  /**
   * @public
   * @param {Number} layoutId
   */
  Packer.prototype.cancelLayout = function (layoutId) {
    var layout = this._layouts[layoutId];
    if (!layout) return;

    delete this._layouts[layoutId];
    delete this._layoutCallbacks[layoutId];

    if (this._layoutWorkerData[layoutId]) {
      delete this._layoutWorkerData[layoutId];
      var queueIndex = this._layoutQueue.indexOf(layoutId);
      if (queueIndex > -1) this._layoutQueue.splice(queueIndex, 1);
    }
  };

  /**
   * @public
   */
  Packer.prototype.destroy = function () {
    // Move all currently used workers back in the workers array.
    for (var key in this._layoutWorkers) {
      this._workers.push(this._layoutWorkers[key]);
    }

    // Destroy all instance's workers.
    destroyWorkerProcessors(this._workers);

    // Reset data.
    this._workers.length = 0;
    this._layoutQueue.length = 0;
    this._layouts = {};
    this._layoutCallbacks = {};
    this._layoutWorkers = {};
    this._layoutWorkerData = {};
  };

  var debounceId = 0;

  /**
   * Returns a function, that, as long as it continues to be invoked, will not
   * be triggered. The function will be called after it stops being called for
   * N milliseconds. The returned function accepts one argument which, when
   * being `true`, cancels the debounce function immediately. When the debounce
   * function is canceled it cannot be invoked again.
   *
   * @param {Function} fn
   * @param {Number} durationMs
   * @returns {Function}
   */
  function debounce(fn, durationMs) {
    var id = ++debounceId;
    var timer = 0;
    var lastTime = 0;
    var isCanceled = false;
    var tick = function (time) {
      if (isCanceled) return;

      if (lastTime) timer -= time - lastTime;
      lastTime = time;

      if (timer > 0) {
        addDebounceTick(id, tick);
      } else {
        timer = lastTime = 0;
        fn();
      }
    };

    return function (cancel) {
      if (isCanceled) return;

      if (durationMs <= 0) {
        if (cancel !== true) fn();
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
        tick(0);
      } else {
        timer = durationMs;
      }
    };
  }

  var htmlCollectionType = '[object HTMLCollection]';
  var nodeListType = '[object NodeList]';

  /**
   * Check if a value is a node list or a html collection.
   *
   * @param {*} val
   * @returns {Boolean}
   */
  function isNodeList(val) {
    var type = Object.prototype.toString.call(val);
    return type === htmlCollectionType || type === nodeListType;
  }

  var objectType = 'object';
  var objectToStringType = '[object Object]';
  var toString = Object.prototype.toString;

  /**
   * Check if a value is a plain object.
   *
   * @param {*} val
   * @returns {Boolean}
   */
  function isPlainObject(val) {
    return typeof val === objectType && toString.call(val) === objectToStringType;
  }

  function noop() {}

  /**
   * Converts a value to an array or clones an array.
   *
   * @param {*} val
   * @returns {Array}
   */
  function toArray(val) {
    return isNodeList(val) ? Array.prototype.slice.call(val) : Array.prototype.concat(val);
  }

  var NUMBER_TYPE = 'number';
  var STRING_TYPE = 'string';
  var INSTANT_LAYOUT = 'instant';
  var layoutId = 0;

  /**
   * Creates a new Grid instance.
   *
   * @class
   * @param {(HTMLElement|String)} element
   * @param {Object} [options]
   * @param {(String|HTMLElement[]|NodeList|HTMLCollection)} [options.items="*"]
   * @param {Number} [options.showDuration=300]
   * @param {String} [options.showEasing="ease"]
   * @param {Object} [options.visibleStyles={opacity: "1", transform: "scale(1)"}]
   * @param {Number} [options.hideDuration=300]
   * @param {String} [options.hideEasing="ease"]
   * @param {Object} [options.hiddenStyles={opacity: "0", transform: "scale(0.5)"}]
   * @param {(Function|Object)} [options.layout]
   * @param {Boolean} [options.layout.fillGaps=false]
   * @param {Boolean} [options.layout.horizontal=false]
   * @param {Boolean} [options.layout.alignRight=false]
   * @param {Boolean} [options.layout.alignBottom=false]
   * @param {Boolean} [options.layout.rounding=false]
   * @param {(Boolean|Number)} [options.layoutOnResize=150]
   * @param {Boolean} [options.layoutOnInit=true]
   * @param {Number} [options.layoutDuration=300]
   * @param {String} [options.layoutEasing="ease"]
   * @param {?Object} [options.sortData=null]
   * @param {Boolean} [options.dragEnabled=false]
   * @param {?String} [options.dragHandle=null]
   * @param {?HtmlElement} [options.dragContainer=null]
   * @param {?Function} [options.dragStartPredicate]
   * @param {Number} [options.dragStartPredicate.distance=0]
   * @param {Number} [options.dragStartPredicate.delay=0]
   * @param {String} [options.dragAxis="xy"]
   * @param {(Boolean|Function)} [options.dragSort=true]
   * @param {Object} [options.dragSortHeuristics]
   * @param {Number} [options.dragSortHeuristics.sortInterval=100]
   * @param {Number} [options.dragSortHeuristics.minDragDistance=10]
   * @param {Number} [options.dragSortHeuristics.minBounceBackAngle=1]
   * @param {(Function|Object)} [options.dragSortPredicate]
   * @param {Number} [options.dragSortPredicate.threshold=50]
   * @param {String} [options.dragSortPredicate.action="move"]
   * @param {String} [options.dragSortPredicate.migrateAction="move"]
   * @param {Object} [options.dragRelease]
   * @param {Number} [options.dragRelease.duration=300]
   * @param {String} [options.dragRelease.easing="ease"]
   * @param {Boolean} [options.dragRelease.useDragContainer=true]
   * @param {Object} [options.dragCssProps]
   * @param {Object} [options.dragPlaceholder]
   * @param {Boolean} [options.dragPlaceholder.enabled=false]
   * @param {?Function} [options.dragPlaceholder.createElement=null]
   * @param {?Function} [options.dragPlaceholder.onCreate=null]
   * @param {?Function} [options.dragPlaceholder.onRemove=null]
   * @param {Object} [options.dragAutoScroll]
   * @param {(Function|Array)} [options.dragAutoScroll.targets=[]]
   * @param {?Function} [options.dragAutoScroll.handle=null]
   * @param {Number} [options.dragAutoScroll.threshold=50]
   * @param {Number} [options.dragAutoScroll.safeZone=0.2]
   * @param {(Function|Number)} [options.dragAutoScroll.speed]
   * @param {Boolean} [options.dragAutoScroll.sortDuringScroll=true]
   * @param {Boolean} [options.dragAutoScroll.smoothStop=false]
   * @param {?Function} [options.dragAutoScroll.onStart=null]
   * @param {?Function} [options.dragAutoScroll.onStop=null]
   * @param {String} [options.containerClass="muuri"]
   * @param {String} [options.itemClass="muuri-item"]
   * @param {String} [options.itemVisibleClass="muuri-item-visible"]
   * @param {String} [options.itemHiddenClass="muuri-item-hidden"]
   * @param {String} [options.itemPositioningClass="muuri-item-positioning"]
   * @param {String} [options.itemDraggingClass="muuri-item-dragging"]
   * @param {String} [options.itemReleasingClass="muuri-item-releasing"]
   * @param {String} [options.itemPlaceholderClass="muuri-item-placeholder"]
   */
  function Grid(element, options) {
    // Allow passing element as selector string
    if (typeof element === STRING_TYPE) {
      element = document.querySelector(element);
    }

    // Throw an error if the container element is not body element or does not
    // exist within the body element.
    var isElementInDom = element.getRootNode
      ? element.getRootNode({ composed: true }) === document
      : document.body.contains(element);
    if (!isElementInDom || element === document.documentElement) {
      throw new Error('Container element must be an existing DOM element.');
    }

    // Create instance settings by merging the options with default options.
    var settings = mergeSettings(Grid.defaultOptions, options);
    settings.visibleStyles = normalizeStyles(settings.visibleStyles);
    settings.hiddenStyles = normalizeStyles(settings.hiddenStyles);
    if (!isFunction(settings.dragSort)) {
      settings.dragSort = !!settings.dragSort;
    }

    this._id = createUid();
    this._element = element;
    this._settings = settings;
    this._isDestroyed = false;
    this._items = [];
    this._layout = {
      id: 0,
      items: [],
      slots: [],
    };
    this._isLayoutFinished = true;
    this._nextLayoutData = null;
    this._emitter = new Emitter();
    this._onLayoutDataReceived = this._onLayoutDataReceived.bind(this);

    // Store grid instance to the grid instances collection.
    GRID_INSTANCES[this._id] = this;

    // Add container element's class name.
    addClass(element, settings.containerClass);

    // If layoutOnResize option is a valid number sanitize it and bind the resize
    // handler.
    bindLayoutOnResize(this, settings.layoutOnResize);

    // Add initial items.
    this.add(getInitialGridElements(element, settings.items), { layout: false });

    // Layout on init if necessary.
    if (settings.layoutOnInit) {
      this.layout(true);
    }
  }

  /**
   * Public properties
   * *****************
   */

  /**
   * @public
   * @static
   * @see Item
   */
  Grid.Item = Item;

  /**
   * @public
   * @static
   * @see ItemLayout
   */
  Grid.ItemLayout = ItemLayout;

  /**
   * @public
   * @static
   * @see ItemVisibility
   */
  Grid.ItemVisibility = ItemVisibility;

  /**
   * @public
   * @static
   * @see ItemMigrate
   */
  Grid.ItemMigrate = ItemMigrate;

  /**
   * @public
   * @static
   * @see ItemDrag
   */
  Grid.ItemDrag = ItemDrag;

  /**
   * @public
   * @static
   * @see ItemDragRelease
   */
  Grid.ItemDragRelease = ItemDragRelease;

  /**
   * @public
   * @static
   * @see ItemDragPlaceholder
   */
  Grid.ItemDragPlaceholder = ItemDragPlaceholder;

  /**
   * @public
   * @static
   * @see Emitter
   */
  Grid.Emitter = Emitter;

  /**
   * @public
   * @static
   * @see Animator
   */
  Grid.Animator = Animator;

  /**
   * @public
   * @static
   * @see Dragger
   */
  Grid.Dragger = Dragger;

  /**
   * @public
   * @static
   * @see Packer
   */
  Grid.Packer = Packer;

  /**
   * @public
   * @static
   * @see AutoScroller
   */
  Grid.AutoScroller = AutoScroller;

  /**
   * The default Packer instance used by default for all layouts.
   *
   * @public
   * @static
   * @type {Packer}
   */
  Grid.defaultPacker = new Packer(2);

  /**
   * Default options for Grid instance.
   *
   * @public
   * @static
   * @type {Object}
   */
  Grid.defaultOptions = {
    // Initial item elements
    items: '*',

    // Default show animation
    showDuration: 300,
    showEasing: 'ease',

    // Default hide animation
    hideDuration: 300,
    hideEasing: 'ease',

    // Item's visible/hidden state styles
    visibleStyles: {
      opacity: '1',
      transform: 'scale(1)',
    },
    hiddenStyles: {
      opacity: '0',
      transform: 'scale(0.5)',
    },

    // Layout
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

    // Sorting
    sortData: null,

    // Drag & Drop
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

    // Classnames
    containerClass: 'muuri',
    itemClass: 'muuri-item',
    itemVisibleClass: 'muuri-item-shown',
    itemHiddenClass: 'muuri-item-hidden',
    itemPositioningClass: 'muuri-item-positioning',
    itemDraggingClass: 'muuri-item-dragging',
    itemReleasingClass: 'muuri-item-releasing',
    itemPlaceholderClass: 'muuri-item-placeholder',
  };

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Bind an event listener.
   *
   * @public
   * @param {String} event
   * @param {Function} listener
   * @returns {Grid}
   */
  Grid.prototype.on = function (event, listener) {
    this._emitter.on(event, listener);
    return this;
  };

  /**
   * Unbind an event listener.
   *
   * @public
   * @param {String} event
   * @param {Function} listener
   * @returns {Grid}
   */
  Grid.prototype.off = function (event, listener) {
    this._emitter.off(event, listener);
    return this;
  };

  /**
   * Get the container element.
   *
   * @public
   * @returns {HTMLElement}
   */
  Grid.prototype.getElement = function () {
    return this._element;
  };

  /**
   * Get instance's item by element or by index. Target can also be an Item
   * instance in which case the function returns the item if it exists within
   * related Grid instance. If nothing is found with the provided target, null
   * is returned.
   *
   * @private
   * @param {(HtmlElement|Number|Item)} [target]
   * @returns {?Item}
   */
  Grid.prototype.getItem = function (target) {
    // If no target is specified or the instance is destroyed, return null.
    if (this._isDestroyed || (!target && target !== 0)) {
      return null;
    }

    // If target is number return the item in that index. If the number is lower
    // than zero look for the item starting from the end of the items array. For
    // example -1 for the last item, -2 for the second last item, etc.
    if (typeof target === NUMBER_TYPE) {
      return this._items[target > -1 ? target : this._items.length + target] || null;
    }

    // If the target is an instance of Item return it if it is attached to this
    // Grid instance, otherwise return null.
    if (target instanceof Item) {
      return target._gridId === this._id ? target : null;
    }

    // In other cases let's assume that the target is an element, so let's try
    // to find an item that matches the element and return it. If item is not
    // found return null.
    if (ITEM_ELEMENT_MAP) {
      var item = ITEM_ELEMENT_MAP.get(target);
      return item && item._gridId === this._id ? item : null;
    } else {
      for (var i = 0; i < this._items.length; i++) {
        if (this._items[i]._element === target) {
          return this._items[i];
        }
      }
    }

    return null;
  };

  /**
   * Get all items. Optionally you can provide specific targets (elements,
   * indices and item instances). All items that are not found are omitted from
   * the returned array.
   *
   * @public
   * @param {(HtmlElement|Number|Item|Array)} [targets]
   * @returns {Item[]}
   */
  Grid.prototype.getItems = function (targets) {
    // Return all items immediately if no targets were provided or if the
    // instance is destroyed.
    if (this._isDestroyed || targets === undefined) {
      return this._items.slice(0);
    }

    var items = [];
    var i, item;

    if (Array.isArray(targets) || isNodeList(targets)) {
      for (i = 0; i < targets.length; i++) {
        item = this.getItem(targets[i]);
        if (item) items.push(item);
      }
    } else {
      item = this.getItem(targets);
      if (item) items.push(item);
    }

    return items;
  };

  /**
   * Update the cached dimensions of the instance's items. By default all the
   * items are refreshed, but you can also provide an array of target items as the
   * first argument if you want to refresh specific items. Note that all hidden
   * items are not refreshed by default since their "display" property is "none"
   * and their dimensions are therefore not readable from the DOM. However, if you
   * do want to force update hidden item dimensions too you can provide `true`
   * as the second argument, which makes the elements temporarily visible while
   * their dimensions are being read.
   *
   * @public
   * @param {Item[]} [items]
   * @param {Boolean} [force=false]
   * @returns {Grid}
   */
  Grid.prototype.refreshItems = function (items, force) {
    if (this._isDestroyed) return this;

    var targets = items || this._items;
    var i, item, style, hiddenItemStyles;

    if (force === true) {
      hiddenItemStyles = [];
      for (i = 0; i < targets.length; i++) {
        item = targets[i];
        if (!item.isVisible() && !item.isHiding()) {
          style = item.getElement().style;
          style.visibility = 'hidden';
          style.display = '';
          hiddenItemStyles.push(style);
        }
      }
    }

    for (i = 0; i < targets.length; i++) {
      targets[i]._refreshDimensions(force);
    }

    if (force === true) {
      for (i = 0; i < hiddenItemStyles.length; i++) {
        style = hiddenItemStyles[i];
        style.visibility = '';
        style.display = 'none';
      }
      hiddenItemStyles.length = 0;
    }

    return this;
  };

  /**
   * Update the sort data of the instance's items. By default all the items are
   * refreshed, but you can also provide an array of target items if you want to
   * refresh specific items.
   *
   * @public
   * @param {Item[]} [items]
   * @returns {Grid}
   */
  Grid.prototype.refreshSortData = function (items) {
    if (this._isDestroyed) return this;

    var targets = items || this._items;
    for (var i = 0; i < targets.length; i++) {
      targets[i]._refreshSortData();
    }

    return this;
  };

  /**
   * Synchronize the item elements to match the order of the items in the DOM.
   * This comes handy if you need to keep the DOM structure matched with the
   * order of the items. Note that if an item's element is not currently a child
   * of the container element (if it is dragged for example) it is ignored and
   * left untouched.
   *
   * @public
   * @returns {Grid}
   */
  Grid.prototype.synchronize = function () {
    if (this._isDestroyed) return this;

    var items = this._items;
    if (!items.length) return this;

    var fragment;
    var element;

    for (var i = 0; i < items.length; i++) {
      element = items[i]._element;
      if (element.parentNode === this._element) {
        fragment = fragment || document.createDocumentFragment();
        fragment.appendChild(element);
      }
    }

    if (!fragment) return this;

    this._element.appendChild(fragment);
    this._emit(EVENT_SYNCHRONIZE);

    return this;
  };

  /**
   * Calculate and apply item positions.
   *
   * @public
   * @param {Boolean} [instant=false]
   * @param {Function} [onFinish]
   * @returns {Grid}
   */
  Grid.prototype.layout = function (instant, onFinish) {
    if (this._isDestroyed) return this;

    // Cancel unfinished layout algorithm if possible.
    var unfinishedLayout = this._nextLayoutData;
    if (unfinishedLayout && isFunction(unfinishedLayout.cancel)) {
      unfinishedLayout.cancel();
    }

    // Compute layout id (let's stay in Float32 range).
    layoutId = (layoutId % MAX_SAFE_FLOAT32_INTEGER) + 1;
    var nextLayoutId = layoutId;

    // Store data for next layout.
    this._nextLayoutData = {
      id: nextLayoutId,
      instant: instant,
      onFinish: onFinish,
      cancel: null,
    };

    // Collect layout items (all active grid items).
    var items = this._items;
    var layoutItems = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i]._isActive) layoutItems.push(items[i]);
    }

    // Compute new layout.
    this._refreshDimensions();
    var gridWidth = this._width - this._borderLeft - this._borderRight;
    var gridHeight = this._height - this._borderTop - this._borderBottom;
    var layoutSettings = this._settings.layout;
    var cancelLayout;
    if (isFunction(layoutSettings)) {
      cancelLayout = layoutSettings(
        this,
        nextLayoutId,
        layoutItems,
        gridWidth,
        gridHeight,
        this._onLayoutDataReceived
      );
    } else {
      Grid.defaultPacker.setOptions(layoutSettings);
      cancelLayout = Grid.defaultPacker.createLayout(
        this,
        nextLayoutId,
        layoutItems,
        gridWidth,
        gridHeight,
        this._onLayoutDataReceived
      );
    }

    // Store layout cancel method if available.
    if (
      isFunction(cancelLayout) &&
      this._nextLayoutData &&
      this._nextLayoutData.id === nextLayoutId
    ) {
      this._nextLayoutData.cancel = cancelLayout;
    }

    return this;
  };

  /**
   * Add new items by providing the elements you wish to add to the instance and
   * optionally provide the index where you want the items to be inserted into.
   * All elements that are not already children of the container element will be
   * automatically appended to the container element. If an element has it's CSS
   * display property set to "none" it will be marked as inactive during the
   * initiation process. As long as the item is inactive it will not be part of
   * the layout, but it will retain it's index. You can activate items at any
   * point with grid.show() method. This method will automatically call
   * grid.layout() if one or more of the added elements are visible. If only
   * hidden items are added no layout will be called. All the new visible items
   * are positioned without animation during their first layout.
   *
   * @public
   * @param {(HTMLElement|HTMLElement[])} elements
   * @param {Object} [options]
   * @param {Number} [options.index=-1]
   * @param {Boolean} [options.active]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Item[]}
   */
  Grid.prototype.add = function (elements, options) {
    if (this._isDestroyed || !elements) return [];

    var newItems = toArray(elements);
    if (!newItems.length) return newItems;

    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var items = this._items;
    var needsLayout = false;
    var fragment;
    var element;
    var item;
    var i;

    // Collect all the elements that are not child of the grid element into a
    // document fragment.
    for (i = 0; i < newItems.length; i++) {
      element = newItems[i];
      if (element.parentNode !== this._element) {
        fragment = fragment || document.createDocumentFragment();
        fragment.appendChild(element);
      }
    }

    // If we have a fragment, let's append it to the grid element. We could just
    // not do this and the `new Item()` instantiation would handle this for us,
    // but this way we can add the elements into the DOM a bit faster.
    if (fragment) {
      this._element.appendChild(fragment);
    }

    // Map provided elements into new grid items.
    for (i = 0; i < newItems.length; i++) {
      element = newItems[i];
      item = newItems[i] = new Item(this, element, opts.active);

      // If the item to be added is active, we need to do a layout. Also, we
      // need to mark the item with the skipNextAnimation flag to make it
      // position instantly (without animation) during the next layout. Without
      // the hack the item would animate to it's new position from the northwest
      // corner of the grid, which feels a bit buggy (imho).
      if (item._isActive) {
        needsLayout = true;
        item._layout._skipNextAnimation = true;
      }
    }

    // Set up the items' initial dimensions and sort data. This needs to be done
    // in a separate loop to avoid layout thrashing.
    for (i = 0; i < newItems.length; i++) {
      item = newItems[i];
      item._refreshDimensions();
      item._refreshSortData();
    }

    // Add the new items to the items collection to correct index.
    arrayInsert(items, newItems, opts.index);

    // Emit add event.
    if (this._hasListeners(EVENT_ADD)) {
      this._emit(EVENT_ADD, newItems.slice(0));
    }

    // If layout is needed.
    if (needsLayout && layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }

    return newItems;
  };

  /**
   * Remove items from the instance.
   *
   * @public
   * @param {Item[]} items
   * @param {Object} [options]
   * @param {Boolean} [options.removeElements=false]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Item[]}
   */
  Grid.prototype.remove = function (items, options) {
    if (this._isDestroyed || !items.length) return [];

    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var needsLayout = false;
    var allItems = this.getItems();
    var targetItems = [];
    var indices = [];
    var index;
    var item;
    var i;

    // Remove the individual items.
    for (i = 0; i < items.length; i++) {
      item = items[i];
      if (item._isDestroyed) continue;

      index = this._items.indexOf(item);
      if (index === -1) continue;

      if (item._isActive) needsLayout = true;

      targetItems.push(item);
      indices.push(allItems.indexOf(item));
      item._destroy(opts.removeElements);
      this._items.splice(index, 1);
    }

    // Emit remove event.
    if (this._hasListeners(EVENT_REMOVE)) {
      this._emit(EVENT_REMOVE, targetItems.slice(0), indices);
    }

    // If layout is needed.
    if (needsLayout && layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }

    return targetItems;
  };

  /**
   * Show specific instance items.
   *
   * @public
   * @param {Item[]} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {Boolean} [options.syncWithLayout=true]
   * @param {Function} [options.onFinish]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.show = function (items, options) {
    if (!this._isDestroyed && items.length) {
      this._setItemsVisibility(items, true, options);
    }
    return this;
  };

  /**
   * Hide specific instance items.
   *
   * @public
   * @param {Item[]} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {Boolean} [options.syncWithLayout=true]
   * @param {Function} [options.onFinish]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.hide = function (items, options) {
    if (!this._isDestroyed && items.length) {
      this._setItemsVisibility(items, false, options);
    }
    return this;
  };

  /**
   * Filter items. Expects at least one argument, a predicate, which should be
   * either a function or a string. The predicate callback is executed for every
   * item in the instance. If the return value of the predicate is truthy the
   * item in question will be shown and otherwise hidden. The predicate callback
   * receives the item instance as it's argument. If the predicate is a string
   * it is considered to be a selector and it is checked against every item
   * element in the instance with the native element.matches() method. All the
   * matching items will be shown and others hidden.
   *
   * @public
   * @param {(Function|String)} predicate
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {Boolean} [options.syncWithLayout=true]
   * @param {FilterCallback} [options.onFinish]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.filter = function (predicate, options) {
    if (this._isDestroyed || !this._items.length) return this;

    var itemsToShow = [];
    var itemsToHide = [];
    var isPredicateString = typeof predicate === STRING_TYPE;
    var isPredicateFn = isFunction(predicate);
    var opts = options || {};
    var isInstant = opts.instant === true;
    var syncWithLayout = opts.syncWithLayout;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var onFinish = isFunction(opts.onFinish) ? opts.onFinish : null;
    var tryFinishCounter = -1;
    var tryFinish = noop;
    var item;
    var i;

    // If we have onFinish callback, let's create proper tryFinish callback.
    if (onFinish) {
      tryFinish = function () {
        ++tryFinishCounter && onFinish(itemsToShow.slice(0), itemsToHide.slice(0));
      };
    }

    // Check which items need to be shown and which hidden.
    if (isPredicateFn || isPredicateString) {
      for (i = 0; i < this._items.length; i++) {
        item = this._items[i];
        if (isPredicateFn ? predicate(item) : elementMatches(item._element, predicate)) {
          itemsToShow.push(item);
        } else {
          itemsToHide.push(item);
        }
      }
    }

    // Show items that need to be shown.
    if (itemsToShow.length) {
      this.show(itemsToShow, {
        instant: isInstant,
        syncWithLayout: syncWithLayout,
        onFinish: tryFinish,
        layout: false,
      });
    } else {
      tryFinish();
    }

    // Hide items that need to be hidden.
    if (itemsToHide.length) {
      this.hide(itemsToHide, {
        instant: isInstant,
        syncWithLayout: syncWithLayout,
        onFinish: tryFinish,
        layout: false,
      });
    } else {
      tryFinish();
    }

    // If there are any items to filter.
    if (itemsToShow.length || itemsToHide.length) {
      // Emit filter event.
      if (this._hasListeners(EVENT_FILTER)) {
        this._emit(EVENT_FILTER, itemsToShow.slice(0), itemsToHide.slice(0));
      }

      // If layout is needed.
      if (layout) {
        this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
      }
    }

    return this;
  };

  /**
   * Sort items. There are three ways to sort the items. The first is simply by
   * providing a function as the comparer which works identically to native
   * array sort. Alternatively you can sort by the sort data you have provided
   * in the instance's options. Just provide the sort data key(s) as a string
   * (separated by space) and the items will be sorted based on the provided
   * sort data keys. Lastly you have the opportunity to provide a presorted
   * array of items which will be used to sync the internal items array in the
   * same order.
   *
   * @public
   * @param {(Function|String|Item[])} comparer
   * @param {Object} [options]
   * @param {Boolean} [options.descending=false]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.sort = (function () {
    var sortComparer;
    var isDescending;
    var origItems;
    var indexMap;

    function defaultComparer(a, b) {
      var result = 0;
      var criteriaName;
      var criteriaOrder;
      var valA;
      var valB;

      // Loop through the list of sort criteria.
      for (var i = 0; i < sortComparer.length; i++) {
        // Get the criteria name, which should match an item's sort data key.
        criteriaName = sortComparer[i][0];
        criteriaOrder = sortComparer[i][1];

        // Get items' cached sort values for the criteria. If the item has no sort
        // data let's update the items sort data (this is a lazy load mechanism).
        valA = (a._sortData ? a : a._refreshSortData())._sortData[criteriaName];
        valB = (b._sortData ? b : b._refreshSortData())._sortData[criteriaName];

        // Sort the items in descending order if defined so explicitly. Otherwise
        // sort items in ascending order.
        if (criteriaOrder === 'desc' || (!criteriaOrder && isDescending)) {
          result = valB < valA ? -1 : valB > valA ? 1 : 0;
        } else {
          result = valA < valB ? -1 : valA > valB ? 1 : 0;
        }

        // If we have -1 or 1 as the return value, let's return it immediately.
        if (result) return result;
      }

      // If values are equal let's compare the item indices to make sure we
      // have a stable sort. Note that this is not necessary in evergreen browsers
      // because Array.sort() is nowadays stable. However, in order to guarantee
      // same results in older browsers we need this.
      if (!result) {
        if (!indexMap) indexMap = createIndexMap(origItems);
        result = isDescending ? compareIndexMap(indexMap, b, a) : compareIndexMap(indexMap, a, b);
      }
      return result;
    }

    function customComparer(a, b) {
      var result = isDescending ? -sortComparer(a, b) : sortComparer(a, b);
      if (!result) {
        if (!indexMap) indexMap = createIndexMap(origItems);
        result = isDescending ? compareIndexMap(indexMap, b, a) : compareIndexMap(indexMap, a, b);
      }
      return result;
    }

    return function (comparer, options) {
      if (this._isDestroyed || this._items.length < 2) return this;

      var items = this._items;
      var opts = options || {};
      var layout = opts.layout ? opts.layout : opts.layout === undefined;

      // Setup parent scope data.
      isDescending = !!opts.descending;
      origItems = items.slice(0);
      indexMap = null;

      // If function is provided do a native array sort.
      if (isFunction(comparer)) {
        sortComparer = comparer;
        items.sort(customComparer);
      }
      // Otherwise if we got a string, let's sort by the sort data as provided in
      // the instance's options.
      else if (typeof comparer === STRING_TYPE) {
        sortComparer = comparer
          .trim()
          .split(' ')
          .filter(function (val) {
            return val;
          })
          .map(function (val) {
            return val.split(':');
          });
        items.sort(defaultComparer);
      }
      // Otherwise if we got an array, let's assume it's a presorted array of the
      // items and order the items based on it. Here we blindly trust that the
      // presorted array consists of the same item instances as the current
      // `gird._items` array.
      else if (Array.isArray(comparer)) {
        items.length = 0;
        items.push.apply(items, comparer);
      }
      // Otherwise let's throw an error.
      else {
        sortComparer = isDescending = origItems = indexMap = null;
        throw new Error('Invalid comparer argument provided.');
      }

      // Emit sort event.
      if (this._hasListeners(EVENT_SORT)) {
        this._emit(EVENT_SORT, items.slice(0), origItems);
      }

      // If layout is needed.
      if (layout) {
        this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
      }

      // Reset data (to avoid mem leaks).
      sortComparer = isDescending = origItems = indexMap = null;

      return this;
    };
  })();

  /**
   * Move item to another index or in place of another item.
   *
   * @public
   * @param {(HtmlElement|Number|Item)} item
   * @param {(HtmlElement|Number|Item)} position
   * @param {Object} [options]
   * @param {String} [options.action="move"]
   *   - Accepts either "move" or "swap".
   *   - "move" moves the item in place of the other item.
   *   - "swap" swaps the position of the items.
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.move = function (item, position, options) {
    if (this._isDestroyed || this._items.length < 2) return this;

    var items = this._items;
    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var isSwap = opts.action === ACTION_SWAP;
    var action = isSwap ? ACTION_SWAP : ACTION_MOVE;
    var fromItem = this.getItem(item);
    var toItem = this.getItem(position);
    var fromIndex;
    var toIndex;

    // Make sure the items exist and are not the same.
    if (fromItem && toItem && fromItem !== toItem) {
      // Get the indices of the items.
      fromIndex = items.indexOf(fromItem);
      toIndex = items.indexOf(toItem);

      // Do the move/swap.
      if (isSwap) {
        arraySwap(items, fromIndex, toIndex);
      } else {
        arrayMove(items, fromIndex, toIndex);
      }

      // Emit move event.
      if (this._hasListeners(EVENT_MOVE)) {
        this._emit(EVENT_MOVE, {
          item: fromItem,
          fromIndex: fromIndex,
          toIndex: toIndex,
          action: action,
        });
      }

      // If layout is needed.
      if (layout) {
        this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
      }
    }

    return this;
  };

  /**
   * Send item to another Grid instance.
   *
   * @public
   * @param {(HtmlElement|Number|Item)} item
   * @param {Grid} targetGrid
   * @param {(HtmlElement|Number|Item)} position
   * @param {Object} [options]
   * @param {HTMLElement} [options.appendTo=document.body]
   * @param {(Boolean|Function|String)} [options.layoutSender=true]
   * @param {(Boolean|Function|String)} [options.layoutReceiver=true]
   * @returns {Grid}
   */
  Grid.prototype.send = function (item, targetGrid, position, options) {
    if (this._isDestroyed || targetGrid._isDestroyed || this === targetGrid) return this;

    // Make sure we have a valid target item.
    item = this.getItem(item);
    if (!item) return this;

    var opts = options || {};
    var container = opts.appendTo || document.body;
    var layoutSender = opts.layoutSender ? opts.layoutSender : opts.layoutSender === undefined;
    var layoutReceiver = opts.layoutReceiver
      ? opts.layoutReceiver
      : opts.layoutReceiver === undefined;

    // Start the migration process.
    item._migrate.start(targetGrid, position, container);

    // If migration was started successfully and the item is active, let's layout
    // the grids.
    if (item._migrate._isActive && item._isActive) {
      if (layoutSender) {
        this.layout(
          layoutSender === INSTANT_LAYOUT,
          isFunction(layoutSender) ? layoutSender : undefined
        );
      }
      if (layoutReceiver) {
        targetGrid.layout(
          layoutReceiver === INSTANT_LAYOUT,
          isFunction(layoutReceiver) ? layoutReceiver : undefined
        );
      }
    }

    return this;
  };

  /**
   * Destroy the instance.
   *
   * @public
   * @param {Boolean} [removeElements=false]
   * @returns {Grid}
   */
  Grid.prototype.destroy = function (removeElements) {
    if (this._isDestroyed) return this;

    var container = this._element;
    var items = this._items.slice(0);
    var layoutStyles = (this._layout && this._layout.styles) || {};
    var i, prop;

    // Unbind window resize event listener.
    unbindLayoutOnResize(this);

    // Destroy items.
    for (i = 0; i < items.length; i++) items[i]._destroy(removeElements);
    this._items.length = 0;

    // Restore container.
    removeClass(container, this._settings.containerClass);
    for (prop in layoutStyles) container.style[prop] = '';

    // Emit destroy event and unbind all events.
    this._emit(EVENT_DESTROY);
    this._emitter.destroy();

    // Remove reference from the grid instances collection.
    delete GRID_INSTANCES[this._id];

    // Flag instance as destroyed.
    this._isDestroyed = true;

    return this;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Emit a grid event.
   *
   * @private
   * @param {String} event
   * @param {...*} [arg]
   */
  Grid.prototype._emit = function () {
    if (this._isDestroyed) return;
    this._emitter.emit.apply(this._emitter, arguments);
  };

  /**
   * Check if there are any events listeners for an event.
   *
   * @private
   * @param {String} event
   * @returns {Boolean}
   */
  Grid.prototype._hasListeners = function (event) {
    if (this._isDestroyed) return false;
    return this._emitter.countListeners(event) > 0;
  };

  /**
   * Update container's width, height and offsets.
   *
   * @private
   */
  Grid.prototype._updateBoundingRect = function () {
    var element = this._element;
    var rect = element.getBoundingClientRect();
    this._width = rect.width;
    this._height = rect.height;
    this._left = rect.left;
    this._top = rect.top;
    this._right = rect.right;
    this._bottom = rect.bottom;
  };

  /**
   * Update container's border sizes.
   *
   * @private
   * @param {Boolean} left
   * @param {Boolean} right
   * @param {Boolean} top
   * @param {Boolean} bottom
   */
  Grid.prototype._updateBorders = function (left, right, top, bottom) {
    var element = this._element;
    if (left) this._borderLeft = getStyleAsFloat(element, 'border-left-width');
    if (right) this._borderRight = getStyleAsFloat(element, 'border-right-width');
    if (top) this._borderTop = getStyleAsFloat(element, 'border-top-width');
    if (bottom) this._borderBottom = getStyleAsFloat(element, 'border-bottom-width');
  };

  /**
   * Refresh all of container's internal dimensions and offsets.
   *
   * @private
   */
  Grid.prototype._refreshDimensions = function () {
    this._updateBoundingRect();
    this._updateBorders(1, 1, 1, 1);
    this._boxSizing = getStyle(this._element, 'box-sizing');
  };

  /**
   * Calculate and apply item positions.
   *
   * @private
   * @param {Object} layout
   */
  Grid.prototype._onLayoutDataReceived = (function () {
    var itemsToLayout = [];
    return function (layout) {
      if (this._isDestroyed || !this._nextLayoutData || this._nextLayoutData.id !== layout.id) return;

      var grid = this;
      var instant = this._nextLayoutData.instant;
      var onFinish = this._nextLayoutData.onFinish;
      var numItems = layout.items.length;
      var counter = numItems;
      var item;
      var left;
      var top;
      var i;

      // Reset next layout data.
      this._nextLayoutData = null;

      if (!this._isLayoutFinished && this._hasListeners(EVENT_LAYOUT_ABORT)) {
        this._emit(EVENT_LAYOUT_ABORT, this._layout.items.slice(0));
      }

      // Update the layout reference.
      this._layout = layout;

      // Update the item positions and collect all items that need to be laid
      // out. It is critical that we update the item position _before_ the
      // layoutStart event as the new data might be needed in the callback.
      itemsToLayout.length = 0;
      for (i = 0; i < numItems; i++) {
        item = layout.items[i];

        // Make sure we have a matching item.
        if (!item) {
          --counter;
          continue;
        }

        // Get the item's new left and top values.
        left = layout.slots[i * 2];
        top = layout.slots[i * 2 + 1];

        // Let's skip the layout process if we can. Possibly avoids a lot of DOM
        // operations which saves us some CPU cycles.
        if (item._canSkipLayout(left, top)) {
          --counter;
          continue;
        }

        // Update the item's position.
        item._left = left;
        item._top = top;

        // Only active non-dragged items need to be moved.
        if (item.isActive() && !item.isDragging()) {
          itemsToLayout.push(item);
        }
      }

      // Set layout styles to the grid element.
      if (layout.styles) {
        setStyles(this._element, layout.styles);
      }

      // layoutStart event is intentionally emitted after the container element's
      // dimensions are set, because otherwise there would be no hook for reacting
      // to container dimension changes.
      if (this._hasListeners(EVENT_LAYOUT_START)) {
        this._emit(EVENT_LAYOUT_START, layout.items.slice(0), instant === true);
      }

      function tryFinish() {
        if (--counter > 0) return;

        var hasLayoutChanged = grid._layout.id !== layout.id;
        var callback = isFunction(instant) ? instant : onFinish;

        if (!hasLayoutChanged) {
          grid._isLayoutFinished = true;
        }

        if (isFunction(callback)) {
          callback(layout.items.slice(0), hasLayoutChanged);
        }

        if (!hasLayoutChanged && grid._hasListeners(EVENT_LAYOUT_END)) {
          grid._emit(EVENT_LAYOUT_END, layout.items.slice(0));
        }
      }

      if (!itemsToLayout.length) {
        tryFinish();
        return this;
      }

      this._isLayoutFinished = false;

      for (i = 0; i < itemsToLayout.length; i++) {
        if (this._layout.id !== layout.id) break;
        itemsToLayout[i]._layout.start(instant === true, tryFinish);
      }

      if (this._layout.id === layout.id) {
        itemsToLayout.length = 0;
      }

      return this;
    };
  })();

  /**
   * Show or hide Grid instance's items.
   *
   * @private
   * @param {Item[]} items
   * @param {Boolean} toVisible
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {Boolean} [options.syncWithLayout=true]
   * @param {Function} [options.onFinish]
   * @param {(Boolean|Function|String)} [options.layout=true]
   */
  Grid.prototype._setItemsVisibility = function (items, toVisible, options) {
    var grid = this;
    var targetItems = items.slice(0);
    var opts = options || {};
    var isInstant = opts.instant === true;
    var callback = opts.onFinish;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var counter = targetItems.length;
    var startEvent = toVisible ? EVENT_SHOW_START : EVENT_HIDE_START;
    var endEvent = toVisible ? EVENT_SHOW_END : EVENT_HIDE_END;
    var method = toVisible ? 'show' : 'hide';
    var needsLayout = false;
    var completedItems = [];
    var hiddenItems = [];
    var item;
    var i;

    // If there are no items call the callback, but don't emit any events.
    if (!counter) {
      if (isFunction(callback)) callback(targetItems);
      return;
    }

    // Prepare the items.
    for (i = 0; i < targetItems.length; i++) {
      item = targetItems[i];

      // If inactive item is shown or active item is hidden we need to do
      // layout.
      if ((toVisible && !item._isActive) || (!toVisible && item._isActive)) {
        needsLayout = true;
      }

      // If inactive item is shown we also need to do a little hack to make the
      // item not animate it's next positioning (layout).
      item._layout._skipNextAnimation = !!(toVisible && !item._isActive);

      // If a hidden item is being shown we need to refresh the item's
      // dimensions.
      if (toVisible && item._visibility._isHidden) {
        hiddenItems.push(item);
      }

      // Add item to layout or remove it from layout.
      if (toVisible) {
        item._addToLayout();
      } else {
        item._removeFromLayout();
      }
    }

    // Force refresh the dimensions of all hidden items.
    if (hiddenItems.length) {
      this.refreshItems(hiddenItems, true);
      hiddenItems.length = 0;
    }

    // Show the items in sync with the next layout.
    function triggerVisibilityChange() {
      if (needsLayout && opts.syncWithLayout !== false) {
        grid.off(EVENT_LAYOUT_START, triggerVisibilityChange);
      }

      if (grid._hasListeners(startEvent)) {
        grid._emit(startEvent, targetItems.slice(0));
      }

      for (i = 0; i < targetItems.length; i++) {
        // Make sure the item is still in the original grid. There is a chance
        // that the item starts migrating before tiggerVisibilityChange is called.
        if (targetItems[i]._gridId !== grid._id) {
          if (--counter < 1) {
            if (isFunction(callback)) callback(completedItems.slice(0));
            if (grid._hasListeners(endEvent)) grid._emit(endEvent, completedItems.slice(0));
          }
          continue;
        }

        targetItems[i]._visibility[method](isInstant, function (interrupted, item) {
          // If the current item's animation was not interrupted add it to the
          // completedItems array.
          if (!interrupted) completedItems.push(item);

          // If all items have finished their animations call the callback
          // and emit showEnd/hideEnd event.
          if (--counter < 1) {
            if (isFunction(callback)) callback(completedItems.slice(0));
            if (grid._hasListeners(endEvent)) grid._emit(endEvent, completedItems.slice(0));
          }
        });
      }
    }

    // Trigger the visibility change, either async with layout or instantly.
    if (needsLayout && opts.syncWithLayout !== false) {
      this.on(EVENT_LAYOUT_START, triggerVisibilityChange);
    } else {
      triggerVisibilityChange();
    }

    // Trigger layout if needed.
    if (needsLayout && layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }
  };

  /**
   * Private helpers
   * ***************
   */

  /**
   * Merge default settings with user settings. The returned object is a new
   * object with merged values. The merging is a deep merge meaning that all
   * objects and arrays within the provided settings objects will be also merged
   * so that modifying the values of the settings object will have no effect on
   * the returned object.
   *
   * @param {Object} defaultSettings
   * @param {Object} [userSettings]
   * @returns {Object} Returns a new object.
   */
  function mergeSettings(defaultSettings, userSettings) {
    // Create a fresh copy of default settings.
    var settings = mergeObjects({}, defaultSettings);

    // Merge user settings to default settings.
    if (userSettings) {
      settings = mergeObjects(settings, userSettings);
    }

    // Handle visible/hidden styles manually so that the whole object is
    // overridden instead of the props.

    if (userSettings && userSettings.visibleStyles) {
      settings.visibleStyles = userSettings.visibleStyles;
    } else if (defaultSettings && defaultSettings.visibleStyles) {
      settings.visibleStyles = defaultSettings.visibleStyles;
    }

    if (userSettings && userSettings.hiddenStyles) {
      settings.hiddenStyles = userSettings.hiddenStyles;
    } else if (defaultSettings && defaultSettings.hiddenStyles) {
      settings.hiddenStyles = defaultSettings.hiddenStyles;
    }

    return settings;
  }

  /**
   * Merge two objects recursively (deep merge). The source object's properties
   * are merged to the target object.
   *
   * @param {Object} target
   *   - The target object.
   * @param {Object} source
   *   - The source object.
   * @returns {Object} Returns the target object.
   */
  function mergeObjects(target, source) {
    var sourceKeys = Object.keys(source);
    var length = sourceKeys.length;
    var isSourceObject;
    var propName;
    var i;

    for (i = 0; i < length; i++) {
      propName = sourceKeys[i];
      isSourceObject = isPlainObject(source[propName]);

      // If target and source values are both objects, merge the objects and
      // assign the merged value to the target property.
      if (isPlainObject(target[propName]) && isSourceObject) {
        target[propName] = mergeObjects(mergeObjects({}, target[propName]), source[propName]);
        continue;
      }

      // If source's value is object and target's is not let's clone the object as
      // the target's value.
      if (isSourceObject) {
        target[propName] = mergeObjects({}, source[propName]);
        continue;
      }

      // If source's value is an array let's clone the array as the target's
      // value.
      if (Array.isArray(source[propName])) {
        target[propName] = source[propName].slice(0);
        continue;
      }

      // In all other cases let's just directly assign the source's value as the
      // target's value.
      target[propName] = source[propName];
    }

    return target;
  }

  /**
   * Collect and return initial items for grid.
   *
   * @param {HTMLElement} gridElement
   * @param {?(HTMLElement[]|NodeList|HtmlCollection|String)} elements
   * @returns {(HTMLElement[]|NodeList|HtmlCollection)}
   */
  function getInitialGridElements(gridElement, elements) {
    // If we have a wildcard selector let's return all the children.
    if (elements === '*') {
      return gridElement.children;
    }

    // If we have some more specific selector, let's filter the elements.
    if (typeof elements === STRING_TYPE) {
      var result = [];
      var children = gridElement.children;
      for (var i = 0; i < children.length; i++) {
        if (elementMatches(children[i], elements)) {
          result.push(children[i]);
        }
      }
      return result;
    }

    // If we have an array of elements or a node list.
    if (Array.isArray(elements) || isNodeList(elements)) {
      return elements;
    }

    // Otherwise just return an empty array.
    return [];
  }

  /**
   * Bind grid's resize handler to window.
   *
   * @param {Grid} grid
   * @param {(Number|Boolean)} delay
   */
  function bindLayoutOnResize(grid, delay) {
    if (typeof delay !== NUMBER_TYPE) {
      delay = delay === true ? 0 : -1;
    }

    if (delay >= 0) {
      grid._resizeHandler = debounce(function () {
        grid.refreshItems().layout();
      }, delay);

      window.addEventListener('resize', grid._resizeHandler);
    }
  }

  /**
   * Unbind grid's resize handler from window.
   *
   * @param {Grid} grid
   */
  function unbindLayoutOnResize(grid) {
    if (grid._resizeHandler) {
      grid._resizeHandler(true);
      window.removeEventListener('resize', grid._resizeHandler);
      grid._resizeHandler = null;
    }
  }

  /**
   * Normalize style declaration object, returns a normalized (new) styles object
   * (prefixed properties and invalid properties removed).
   *
   * @param {Object} styles
   * @returns {Object}
   */
  function normalizeStyles(styles) {
    var normalized = {};
    var docElemStyle = document.documentElement.style;
    var prop, prefixedProp;

    // Normalize visible styles (prefix and remove invalid).
    for (prop in styles) {
      if (!styles[prop]) continue;
      prefixedProp = getPrefixedPropName(docElemStyle, prop);
      if (!prefixedProp) continue;
      normalized[prefixedProp] = styles[prop];
    }

    return normalized;
  }

  /**
   * Create index map from items.
   *
   * @param {Item[]} items
   * @returns {Object}
   */
  function createIndexMap(items) {
    var result = {};
    for (var i = 0; i < items.length; i++) {
      result[items[i]._id] = i;
    }
    return result;
  }

  /**
   * Sort comparer function for items' index map.
   *
   * @param {Object} indexMap
   * @param {Item} itemA
   * @param {Item} itemB
   * @returns {Number}
   */
  function compareIndexMap(indexMap, itemA, itemB) {
    var indexA = indexMap[itemA._id];
    var indexB = indexMap[itemB._id];
    return indexA - indexB;
  }

  return Grid;

})));
