/**
 * Muuri Dragger
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Dragger/LICENSE.md
 */

import Emitter from '../Emitter/Emitter';

import isPassiveEventsSupported from '../utils/isPassiveEventsSupported';
import getPrefixedPropName from '../utils/getPrefixedPropName';
import raf from '../utils/raf';

var events = {
  start: 'start',
  move: 'move',
  end: 'end',
  cancel: 'cancel'
};

var hasTouchEvents = 'ontouchstart' in window;
var hasPointerEvents = window.PointerEvent;
var hasMsPointerEvents = window.navigator.msPointerEnabled;
var isAndroid = /(android)/i.test(navigator.userAgent);
var listenerOptions = isPassiveEventsSupported ? { passive: true } : false;

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
  this._startEvent = null;

  this._onStart = this._onStart.bind(this);
  this._abortNonCancelable = this._abortNonCancelable.bind(this);
  this._triggerStart = this._triggerStart.bind(this);
  this._onMove = this._onMove.bind(this);
  this._onCancel = this._onCancel.bind(this);
  this._onEnd = this._onEnd.bind(this);

  this.pointerId = null;
  this.startTime = 0;
  this.startX = 0;
  this.startY = 0;
  this.currentX = 0;
  this.currentY = 0;

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
  element.addEventListener(Dragger._events.start, this._onStart, listenerOptions);

  // If we have touch events, but no pointer events we need to also listen for
  // mouse events in addition to touch events for devices which support both
  // mouse and touch interaction.
  if (hasTouchEvents && !hasPointerEvents && !hasMsPointerEvents) {
    element.addEventListener(Dragger._mouseEvents.start, this._onStart, listenerOptions);
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
    Dragger._bindWindowListeners();
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
    Dragger._unbindWindowListeners();
  }
};

Dragger._bindWindowListeners = function() {
  var events = Dragger._events;
  window.addEventListener(events.move, Dragger._onMove, listenerOptions);
  window.addEventListener(events.end, Dragger._onEnd, listenerOptions);
  events.cancel && window.addEventListener(events.cancel, Dragger._onCancel, listenerOptions);
};

Dragger._unbindWindowListeners = function() {
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

Dragger.prototype._reset = function() {
  if (this._isDestroyed) return;

  this.pointerId = null;
  this.startTime = 0;
  this.startX = 0;
  this.startY = 0;
  this.currentX = 0;
  this.currentY = 0;
  this._startEvent = null;

  this._element.removeEventListener(
    Dragger._touchEvents.start,
    this._abortNonCancelable,
    listenerOptions
  );

  Dragger._deactivateInstance(this);
};

Dragger.prototype._onStart = function(e) {
  if (this._isDestroyed) return;

  // Make sure the element is not being dragged currently.
  if (this.isDragging()) return;

  // Special cancelable check for Android to prevent drag procedure from
  // starting if native scrolling is in progress. Part 1.
  if (isAndroid && e.cancelable === false) return;

  // Make sure left button is pressed on mouse.
  if (e.button) return;

  // Get (and set) pointer id.
  this.pointerId = Dragger._getEventPointerId(e);
  if (this.pointerId === null) return;

  // Store the start event and trigger start (async or sync).
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
    raf(this._triggerStart);
  } else {
    this._triggerStart();
  }
};

Dragger.prototype._abortNonCancelable = function(e) {
  this._element.removeEventListener(
    Dragger._touchEvents.start,
    this._abortNonCancelable,
    listenerOptions
  );

  if (this._startEvent && e.cancelable === false) {
    this.pointerId = null;
    this._startEvent = null;
  }
};

Dragger.prototype._triggerStart = function() {
  var e = this._startEvent;
  if (!e) return;

  this._startEvent = null;

  var touch = this.getTrackedTouch(e);
  if (!touch) return;

  // Set up init data and emit start event.
  this.startX = this.currentX = touch.clientX;
  this.startY = this.currentY = touch.clientY;
  this.startTime = Date.now();
  this._emitter.emit(events.start, e);
  Dragger._activateInstance(this);
};

Dragger.prototype._onMove = function(e) {
  var touch = this.getTrackedTouch(e);
  if (!touch) return;

  this.currentX = touch.clientX;
  this.currentY = touch.clientY;
  this._emitter.emit(events.move, e);
};

Dragger.prototype._onCancel = function(e) {
  if (!this.getTrackedTouch(e)) return;

  this._emitter.emit(events.cancel, e);
  this._reset();
};

Dragger.prototype._onEnd = function(e) {
  if (!this.getTrackedTouch(e)) return;

  this._emitter.emit(events.end, e);
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
  return this.pointerId !== null;
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
  // we can do for now.
  if (hasTouchEvents) {
    this._element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, false);
    if (this._element.style[taPropPrefixed] !== value) {
      this._element.addEventListener(Dragger._touchEvents.start, Dragger._preventDefault, false);
    }
  }
};

/**
 * Update element's CSS properties.
 *
 * @public
 * @memberof Dragger.prototype
 * @param {Object} props
 */
Dragger.prototype.setCssProps = function(props) {
  if (!props) return;

  var prop;
  var prefixedProp;

  for (prop in props) {
    // Special handling for touch-action.
    if (prop === taProp) {
      this.setTouchAction(props[prop]);
      continue;
    }

    // Get prefixed prop and skip if it does not exist.
    prefixedProp = getPrefixedPropName(this._element.style, prop);
    if (!prefixedProp) continue;

    // Store the prop and add the style.
    this._cssProps[prefixedProp] = '';
    this._element.style[prefixedProp] = props[prop];
  }
};

/**
 * If the provided event is a PointerEvent this method will return it if it has
 * the same pointerId as the instance. If the provided event is a TouchEvent
 * this method will try to look for a Touch instance in the changedTouches that
 * has an identifier matching this instance's pointerId. If the provided event
 * is a MouseEvent (or just any other event than PointerEvent or TouchEvent)
 * it will be returned immediately.
 *
 * @public
 * @memberof Dragger.prototype
 * @returns {!(Touch|PointerEvent|MouseEvent)}
 */
Dragger.prototype.getTrackedTouch = function(e) {
  if (this.pointerId === null) {
    return null;
  } else {
    return Dragger._getTouchById(e, this.pointerId);
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
  return this.currentX - this.startX;
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
  return this.currentY - this.startY;
};

/**
 * How far (in pixels) has pointer moved from start position.
 *
 * @public
 * @memberof Dragger.prototype
 * @returns {Number}
 */
Dragger.prototype.getDeltaDistance = function() {
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
  return this.startTime ? Date.now() - this.startTime : 0;
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
  element.removeEventListener(events.start, this._onStart, listenerOptions);
  element.removeEventListener(Dragger._mouseEvents.start, this._onStart, listenerOptions);
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
