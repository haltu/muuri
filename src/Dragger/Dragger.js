/**
 * Muuri Dragger
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Dragger/LICENSE.md
 */

import Emitter from '../Emitter/Emitter';

import isPassiveEventsSupported from '../utils/isPassiveEventsSupported';
import getPrefixedPropName from '../utils/getPrefixedPropName';

var hasTouchEvents = 'ontouchstart' in window;
var hasPointerEvents = window.PointerEvent;
var hasMsPointerEvents = window.navigator.msPointerEnabled;
var iOS = !!(navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform));
var listenerOptions = isPassiveEventsSupported ? { passive: true } : false;

var taProp = 'touchAction';
var taPropPrefixed = getPrefixedPropName(document.documentElement.style, taProp);
var taValueAuto = 'auto';
var taValueManipulation = 'manipulation';

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

  this._onStart = this._onStart.bind(this);
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
    this.setTouchAction(taValueAuto);
  }

  // Prevent native link/image dragging for the item and it's ancestors.
  element.addEventListener('dragstart', Dragger._preventDefault, false);

  // Listen to start event.
  element.addEventListener(Dragger._events.start, this._onStart, listenerOptions);
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
  // It is important that the touch events are always preferred over pointer
  // events, because otherwise browser's normal scrolling behaviour would kick
  // in on touch devices when dragging happens even if touch-action is none.
  if (hasTouchEvents) return Dragger._touchEvents;
  if (hasPointerEvents) return Dragger._pointerEvents;
  if (hasMsPointerEvents) return Dragger._msPointerEvents;
  return Dragger._mouseEvents;
})();

Dragger._activeInstances = [];

/**
 * Protected static methods
 * ************************
 */

Dragger._preventDefault = function(e) {
  if (e.preventDefault && e.cancelable !== false) e.preventDefault();
};

Dragger._onMove = function(e) {
  var draggers = Dragger._activeInstances.slice();
  for (var i = 0; i < draggers.length; i++) {
    draggers[i]._onMove(e);
  }
};

Dragger._onCancel = function(e) {
  var draggers = Dragger._activeInstances.slice();
  for (var i = 0; i < draggers.length; i++) {
    draggers[i]._onCancel(e);
  }
};

Dragger._onEnd = function(e) {
  var draggers = Dragger._activeInstances.slice();
  for (var i = 0; i < draggers.length; i++) {
    draggers[i]._onEnd(e);
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

/**
 * Private prototype methods
 * *************************
 */

Dragger.prototype._reset = function() {
  this.pointerId = null;
  this.startTime = 0;
  this.startX = 0;
  this.startY = 0;
  this.currentX = 0;
  this.currentY = 0;

  // Remove instance from active instances.
  var instanceIndex = Dragger._activeInstances.indexOf(this);
  if (instanceIndex > -1) {
    Dragger._activeInstances.splice(instanceIndex, 1);
  }

  // Stop listening to document if there are no active instances.
  if (!Dragger._activeInstances.length) {
    Dragger._unbindWindowListeners();
  }
};

Dragger.prototype._onStart = function(e) {
  if (this._isDestroyed) return;

  // Make sure the element is not being dragged currently.
  if (this.isDragging()) return;

  // When you try to start dragging while the element's ancestor is being
  // scrolled on a touch device the browser will force stop the drag procedure
  // pretty soon after it has started. To avoid starting the drag in the first
  // place we can check if the event is not cancelable which is an indicator of
  // such a scenario (except on iOS).
  if (!iOS && e.cancelable === false) return;

  // Make sure left button is pressed on mouse.
  if (e.button) return;

  // Get pointer id.
  this.pointerId = Dragger._getEventPointerId(e);
  if (this.pointerId === null) return;

  var touch = this.getTrackedTouch(e);
  this.startX = this.currentX = touch.clientX;
  this.startY = this.currentY = touch.clientY;
  this.startTime = Date.now();

  this._emitter.emit('start', e);

  // If the document listeners are not bound yet, bind them.
  if (!Dragger._activeInstances.length) {
    Dragger._bindWindowListeners();
  }

  // Add instance to active instances.
  Dragger._activeInstances.push(this);
};

Dragger.prototype._onMove = function(e) {
  var touch = this.getTrackedTouch(e);
  if (!touch) return;

  this.currentX = touch.clientX;
  this.currentY = touch.clientY;
  this._emitter.emit('move', e);
};

Dragger.prototype._onCancel = function(e) {
  if (!this.getTrackedTouch(e)) return;

  this._emitter.emit('cancel', e);
  this._reset();
};

Dragger.prototype._onEnd = function(e) {
  if (!this.getTrackedTouch(e)) return;

  this._emitter.emit('end', e);
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
  this._touchAction = value;

  // Set touch-action style.
  if (taPropPrefixed) {
    this._cssProps[taPropPrefixed] = '';
    this._element.style[taPropPrefixed] = value;
  }

  // Since iOS Safari only supports touch-action "auto" and "manipulation" we
  // need to manually prevent default action for it if touch-action is set to
  // a value that may block native scrolling. Not elegant, but best we can do
  // here really.
  if (hasTouchEvents && iOS) {
    this._element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, false);
    if (value !== taValueAuto && value !== taValueManipulation) {
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
 * @param {String[]} events
 *   - 'start', 'move', 'cancel' or 'end'.
 * @param {Function} listener
 */
Dragger.prototype.on = function(events, listener) {
  if (this._isDestroyed) return;

  var eventsArray = events.split(' ');
  for (var i = 0; i < eventsArray.length; i++) {
    if (Dragger._events[eventsArray[i]]) {
      this._emitter.on(eventsArray[i], listener);
    }
  }
};

/**
 * Unbind drag event listeners.
 *
 * @public
 * @memberof Dragger.prototype
 * @param {String[]} events
 *   - 'start', 'move', 'cancel' or 'end'.
 * @param {Function} listener
 */
Dragger.prototype.off = function(events, listener) {
  if (this._isDestroyed) return;

  var eventsArray = events.split(' ');
  for (var i = 0; i < eventsArray.length; i++) {
    if (Dragger._events[eventsArray[i]]) {
      this._emitter.off(eventsArray[i], listener);
    }
  }
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

  // Mark destroyed.
  this._isDestroyed = true;

  // Destroy emitter.
  this._emitter.destroy();

  // Unbind event handlers.
  element.removeEventListener(events.start, this._onStart, listenerOptions);
  element.removeEventListener('dragstart', Dragger._preventDefault, false);
  element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, false);

  // Remove instance from active instances.
  var instanceIndex = Dragger._activeInstances.indexOf(this);
  if (instanceIndex > -1) {
    Dragger._activeInstances.splice(instanceIndex, 1);
  }

  // Stop listening to document if there are no active instances.
  if (!Dragger._activeInstances.length) {
    Dragger._unbindWindowListeners();
  }

  // Reset styles.
  for (var prop in this._cssProps) {
    element.style[prop] = this._cssProps[prop];
    delete this._cssProps[prop];
  }

  // Reset data.
  this._element = null;
};

export default Dragger;
