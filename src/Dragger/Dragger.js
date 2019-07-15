/**
 * Muuri Dragger
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Dragger/LICENSE.md
 */

import Emitter from '../Emitter/Emitter';

import getPrefixedPropName from '../utils/getPrefixedPropName';
import raf from '../utils/raf';

// Detect support for passive events:
// https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection
var isPassiveEventsSupported = false;
try {
  var passiveOpts = Object.defineProperty({}, 'passive', {
    get: function() {
      isPassiveEventsSupported = true;
    }
  });
  window.addEventListener('testPassive', null, passiveOpts);
  window.removeEventListener('testPassive', null, passiveOpts);
} catch (e) {}

// Dragger events.
export var events = {
  start: 'start',
  move: 'move',
  end: 'end',
  cancel: 'cancel'
};

var hasTouchEvents = !!('ontouchstart' in window || window.TouchEvent);
var hasPointerEvents = !!window.PointerEvent;
var hasMsPointerEvents = !!window.navigator.msPointerEnabled;
var isAndroid = /(android)/i.test(window.navigator.userAgent);
var listenerOptions = isPassiveEventsSupported ? { passive: true } : false;

var taProp = 'touchAction';
var taPropPrefixed = getPrefixedPropName(window.document.documentElement.style, taProp);
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
  this._startEvent = null;

  this._pointerId = null;
  this._startTime = 0;
  this._startX = 0;
  this._startY = 0;
  this._currentX = 0;
  this._currentY = 0;

  this._preStartCheck = this._preStartCheck.bind(this);
  this._abortNonCancelable = this._abortNonCancelable.bind(this);
  this._onStart = this._onStart.bind(this);
  this._onMove = this._onMove.bind(this);
  this._onCancel = this._onCancel.bind(this);
  this._onEnd = this._onEnd.bind(this);

  // Apply initial css props.
  this.setCssProps(cssProps);

  // If touch action was not provided with initial css props let's assume it's
  // auto.
  if (!this._touchAction) {
    this.setTouchAction(taDefaultValue);
  }

  // Prevent native link/image dragging for the item and it's ancestors.
  element.addEventListener('dragstart', Dragger._preventDefault, false);

  // Listen to start event.
  element.addEventListener(Dragger._events.start, this._preStartCheck, listenerOptions);

  // If we have touch events, but no pointer events we need to also listen for
  // mouse events in addition to touch events for devices which support both
  // mouse and touch interaction.
  if (hasTouchEvents && !hasPointerEvents && !hasMsPointerEvents) {
    element.addEventListener(Dragger._mouseEvents.start, this._preStartCheck, listenerOptions);
  }
}

/**
 * Protected properties
 * ********************
 */

Dragger._pointerEvents = {
  start: 'pointerdown',
  move: 'pointermove',
  cancel: 'pointercancel',
  end: 'pointerup'
};

Dragger._msPointerEvents = {
  start: 'MSPointerDown',
  move: 'MSPointerMove',
  cancel: 'MSPointerCancel',
  end: 'MSPointerUp'
};

Dragger._touchEvents = {
  start: 'touchstart',
  move: 'touchmove',
  cancel: 'touchcancel',
  end: 'touchend'
};

Dragger._mouseEvents = {
  start: 'mousedown',
  move: 'mousemove',
  cancel: '',
  end: 'mouseup'
};

Dragger._events = (function() {
  if (hasPointerEvents) return Dragger._pointerEvents;
  if (hasMsPointerEvents) return Dragger._msPointerEvents;
  if (hasTouchEvents) return Dragger._touchEvents;
  return Dragger._mouseEvents;
})();

Dragger._emitter = new Emitter();

Dragger._activeInstances = [];

/**
 * Protected static methods
 * ************************
 */

Dragger._preventDefault = function(e) {
  if (e.preventDefault && e.cancelable !== false) e.preventDefault();
};

Dragger._activateInstance = function(instance) {
  var index = Dragger._activeInstances.indexOf(instance);
  if (index > -1) return;

  Dragger._activeInstances.push(instance);
  Dragger._emitter.on(events.move, instance._onMove);
  Dragger._emitter.on(events.cancel, instance._onCancel);
  Dragger._emitter.on(events.end, instance._onEnd);

  if (Dragger._activeInstances.length === 1) {
    Dragger._bindListeners();
  }
};

Dragger._deactivateInstance = function(instance) {
  var index = Dragger._activeInstances.indexOf(instance);
  if (index === -1) return;

  Dragger._activeInstances.splice(index, 1);
  Dragger._emitter.off(events.move, instance._onMove);
  Dragger._emitter.off(events.cancel, instance._onCancel);
  Dragger._emitter.off(events.end, instance._onEnd);

  if (!Dragger._activeInstances.length) {
    Dragger._unbindListeners();
  }
};

Dragger._bindListeners = function() {
  var events = Dragger._events;
  window.addEventListener(events.move, Dragger._onMove, listenerOptions);
  window.addEventListener(events.end, Dragger._onEnd, listenerOptions);
  events.cancel && window.addEventListener(events.cancel, Dragger._onCancel, listenerOptions);
};

Dragger._unbindListeners = function() {
  var events = Dragger._events;
  window.removeEventListener(events.move, Dragger._onMove, listenerOptions);
  window.removeEventListener(events.end, Dragger._onEnd, listenerOptions);
  events.cancel && window.removeEventListener(events.cancel, Dragger._onCancel, listenerOptions);
};

Dragger._getEventPointerId = function(event) {
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

Dragger._getTouchById = function(event, id) {
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

Dragger._onMove = function(e) {
  Dragger._emitter.emit(events.move, e);
};

Dragger._onCancel = function(e) {
  Dragger._emitter.emit(events.cancel, e);
};

Dragger._onEnd = function(e) {
  Dragger._emitter.emit(events.end, e);
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Reset current drag operation (if any).
 *
 * @private
 * @memberof Dragger.prototype
 */
Dragger.prototype._reset = function() {
  if (this._isDestroyed) return;

  this._pointerId = null;
  this._startTime = 0;
  this._startX = 0;
  this._startY = 0;
  this._currentX = 0;
  this._currentY = 0;
  this._startEvent = null;

  this._element.removeEventListener(
    Dragger._touchEvents.start,
    this._abortNonCancelable,
    listenerOptions
  );

  Dragger._deactivateInstance(this);
};

/**
 * Create a custom dragger event from a raw event.
 *
 * @private
 * @memberof Dragger.prototype
 * @param {String} type
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 * @returns {DraggerEvent}
 */
Dragger.prototype._createEvent = function(type, e) {
  var touch = this._getTrackedTouch(e);
  return {
    // Hammer.js compatibility interface.
    type: type,
    srcEvent: e,
    distance: this.getDistance(),
    deltaX: this.getDeltaX(),
    deltaY: this.getDeltaY(),
    deltaTime: type === events.start ? 0 : this.getDeltaTime(),
    isFirst: type === events.start,
    isFinal: type === events.end || type === events.cancel,
    // Partial Touch API interface.
    identifier: this._pointerId,
    screenX: touch.screenX,
    screenY: touch.screenY,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pageX: touch.pageX,
    pageY: touch.pageY,
    target: touch.target
  };
};

/**
 * Emit a raw event as dragger event internally.
 *
 * @private
 * @memberof Dragger.prototype
 * @param {String} type
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 */
Dragger.prototype._emit = function(type, e) {
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
 * @memberof Dragger.prototype
 * @param {(PointerEvent|TouchEvent|MouseEvent)}
 * @returns {?(Touch|PointerEvent|MouseEvent)}
 */
Dragger.prototype._getTrackedTouch = function(e) {
  if (this._pointerId === null) {
    return null;
  } else {
    return Dragger._getTouchById(e, this._pointerId);
  }
};

/**
 * A pre-handler for start event that checks if we can start dragging.
 *
 * @private
 * @memberof Dragger.prototype
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 */
Dragger.prototype._preStartCheck = function(e) {
  if (this._isDestroyed) return;

  // Make sure the element is not being dragged currently.
  if (this.isDragging()) return;

  // Special cancelable check for Android to prevent drag procedure from
  // starting if native scrolling is in progress. Part 1.
  if (isAndroid && e.cancelable === false) return;

  // Make sure left button is pressed on mouse.
  if (e.button) return;

  // Get (and set) pointer id.
  this._pointerId = Dragger._getEventPointerId(e);
  if (this._pointerId === null) return;

  // Store the start event and trigger start (async or sync). Pointer events
  // are emitted before touch events if the browser supports both of them. And
  // if you try to move an element before `touchstart` is emitted the pointer
  // events for that element will be canceled. The fix is to delay the emitted
  // pointer events in such a scenario by one frame so that `touchstart` has
  // time to be emitted before the element is (potentially) moved.
  this._startEvent = e;
  if (hasTouchEvents && (hasPointerEvents || hasMsPointerEvents)) {
    // Special cancelable check for Android to prevent drag procedure from
    // starting if native scrolling is in progress. Part 2.
    if (isAndroid) {
      this._element.addEventListener(
        Dragger._touchEvents.start,
        this._abortNonCancelable,
        listenerOptions
      );
    }
    raf(this._onStart);
  } else {
    this._onStart();
  }
};

/**
 * Abort start event if it turns out to be non-cancelable.
 *
 * @private
 * @memberof Dragger.prototype
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 */
Dragger.prototype._abortNonCancelable = function(e) {
  this._element.removeEventListener(
    Dragger._touchEvents.start,
    this._abortNonCancelable,
    listenerOptions
  );

  if (this._startEvent && e.cancelable === false) {
    this._pointerId = null;
    this._startEvent = null;
  }
};

/**
 * Start the drag procedure if possible.
 *
 * @private
 * @memberof Dragger.prototype
 */
Dragger.prototype._onStart = function() {
  var e = this._startEvent;
  if (!e) return;

  this._startEvent = null;

  var touch = this._getTrackedTouch(e);
  if (!touch) return;

  // Set up init data and emit start event.
  this._startX = this._currentX = touch.clientX;
  this._startY = this._currentY = touch.clientY;
  this._startTime = Date.now();
  this._emit(events.start, e);
  Dragger._activateInstance(this);
};

/**
 * Handler for move event.
 *
 * @private
 * @memberof Dragger.prototype
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 */
Dragger.prototype._onMove = function(e) {
  var touch = this._getTrackedTouch(e);
  if (!touch) return;

  this._currentX = touch.clientX;
  this._currentY = touch.clientY;
  this._emit(events.move, e);
};

/**
 * Handler for move cancel event.
 *
 * @private
 * @memberof Dragger.prototype
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 */
Dragger.prototype._onCancel = function(e) {
  if (!this._getTrackedTouch(e)) return;

  this._emit(events.cancel, e);
  this._reset();
};

/**
 * Handler for end event.
 *
 * @private
 * @memberof Dragger.prototype
 * @param {(PointerEvent|TouchEvent|MouseEvent)} e
 */
Dragger.prototype._onEnd = function(e) {
  if (!this._getTrackedTouch(e)) return;

  this._emit(events.end, e);
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
 * @memberof Dragger.prototype
 * @returns {Boolean}
 */
Dragger.prototype.isDragging = function() {
  return this._pointerId !== null;
};

/**
 * Set element's touch-action CSS property.
 *
 * @public
 * @memberof Dragger.prototype
 * @param {String} value
 */
Dragger.prototype.setTouchAction = function(value) {
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
  // a can of worms.
  if (hasTouchEvents) {
    this._element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, false);
    if (this._element.style[taPropPrefixed] !== value) {
      this._element.addEventListener(Dragger._touchEvents.start, Dragger._preventDefault, false);
    }
  }
};

/**
 * Update element's CSS properties. Accepts an object with camel cased style
 * props with value pairs as it's first argument.
 *
 * @public
 * @memberof Dragger.prototype
 * @param {Object} [newProps]
 */
Dragger.prototype.setCssProps = function(newProps) {
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
 * @memberof Dragger.prototype
 * @returns {Number}
 */
Dragger.prototype.getDeltaX = function() {
  return this._currentX - this._startX;
};

/**
 * How much the pointer has moved on y-axis from start position, in pixels.
 * Positive value indicates movement from top to bottom.
 *
 * @public
 * @memberof Dragger.prototype
 * @returns {Number}
 */
Dragger.prototype.getDeltaY = function() {
  return this._currentY - this._startY;
};

/**
 * How far (in pixels) has pointer moved from start position.
 *
 * @public
 * @memberof Dragger.prototype
 * @returns {Number}
 */
Dragger.prototype.getDistance = function() {
  var x = this.getDeltaX();
  var y = this.getDeltaY();
  return Math.sqrt(x * x + y * y);
};

/**
 * How long has pointer been dragged.
 *
 * @public
 * @memberof Dragger.prototype
 * @returns {Number}
 */
Dragger.prototype.getDeltaTime = function() {
  return this._startTime ? Date.now() - this._startTime : 0;
};

/**
 * Bind drag event listeners.
 *
 * @public
 * @memberof Dragger.prototype
 * @param {String} eventName
 *   - 'start', 'move', 'cancel' or 'end'.
 * @param {Function} listener
 */
Dragger.prototype.on = function(eventName, listener) {
  this._emitter.on(eventName, listener);
};

/**
 * Unbind drag event listeners.
 *
 * @public
 * @memberof Dragger.prototype
 * @param {String} eventName
 *   - 'start', 'move', 'cancel' or 'end'.
 * @param {Function} listener
 */
Dragger.prototype.off = function(events, listener) {
  this._emitter.off(eventName, listener);
};

/**
 * Destroy the instance and unbind all drag event listeners.
 *
 * @public
 * @memberof Dragger.prototype
 */
Dragger.prototype.destroy = function() {
  if (this._isDestroyed) return;

  var element = this._element;
  var events = Dragger._events;

  // Reset data and deactivate the instance.
  this._reset();

  // Destroy emitter.
  this._emitter.destroy();

  // Unbind event handlers.
  element.removeEventListener(events.start, this._preStartCheck, listenerOptions);
  element.removeEventListener(Dragger._mouseEvents.start, this._preStartCheck, listenerOptions);
  element.removeEventListener('dragstart', Dragger._preventDefault, false);
  element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, false);

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

export default Dragger;
