/**
 * Muuri Dragger
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Dragger/LICENSE.md
 */

// TODO: Mousemove events are triggered more than once per frame -> optimize!
// TODO: Study passive events more: https://developers.google.com/web/updates/2016/06/passive-event-listeners
// TODO: Make item movement update while scrolling smoother (horrible on FF).
// TODO: Consider creating a wrapper for the emitted event for easier access.

import Emitter from '../Emitter/Emitter';

import isPassiveEventsSupported from '../utils/isPassiveEventsSupported';
import getPrefixedPropName from '../utils/getPrefixedPropName';

var hasPointerEvents = window.PointerEvent;
var hasMsPointerEvents = window.navigator.msPointerEnabled;
var hasTouchEvents = 'ontouchstart' in window;
var listenerOptions = isPassiveEventsSupported ? { passive: true } : false;

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

  this._onStart = this._onStart.bind(this);
  this._onMove = this._onMove.bind(this);
  this._onCancel = this._onCancel.bind(this);
  this._onEnd = this._onEnd.bind(this);

  this.pointerId = 0;
  this.startTime = 0;
  this.startX = 0;
  this.startY = 0;
  this.currentX = 0;
  this.currentY = 0;

  if (cssProps) {
    var prop, prefixedProp;
    for (prop in cssProps) {
      prefixedProp = getPrefixedPropName(element.style, prop);
      if (prefixedProp) {
        this._cssProps[prefixedProp] = element.style[prefixedProp];
        element.style[prefixedProp] = cssProps[prop];
      }
    }
  }

  element.addEventListener(
    Dragger._events.start,
    this._onStart,
    Dragger._usePassiveEvents ? listenerOptions : false
  );
}

/**
 * Protected properties
 * ********************
 */

Dragger._events = (function() {
  // Pointer events.
  if (hasPointerEvents) {
    return {
      start: 'pointerdown',
      move: 'pointermove',
      cancel: 'pointercancel',
      end: 'pointerup'
    };
  }

  // IE10 Pointer events.
  if (hasMsPointerEvents) {
    return {
      start: 'MSPointerDown',
      move: 'MSPointerMove',
      cancel: 'MSPointerCancel',
      end: 'MSPointerUp'
    };
  }

  // Touch events.
  if (hasTouchEvents) {
    return {
      start: 'touchstart',
      move: 'touchmove',
      cancel: 'touchcancel',
      end: 'touchend'
    };
  }

  // Mouse events.
  return {
    start: 'mousedown',
    move: 'mousemove',
    cancel: '',
    end: 'mouseup'
  };
})();

Dragger._activeInstances = [];

Dragger._usePassiveEvents = true;

/**
 * Protected static methods
 * ************************
 */

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
  var opts = Dragger._usePassiveEvents ? listenerOptions : false;
  window.addEventListener(events.move, Dragger._onMove, opts);
  window.addEventListener(events.end, Dragger._onEnd, opts);
  events.cancel && window.addEventListener(events.cancel, Dragger._onCancel, opts);
};

Dragger._unbindWindowListeners = function() {
  var events = Dragger._events;
  var opts = Dragger._usePassiveEvents ? listenerOptions : false;
  window.removeEventListener(events.move, Dragger._onMove, opts);
  window.removeEventListener(events.end, Dragger._onEnd, opts);
  events.cancel && window.removeEventListener(events.cancel, Dragger._onCancel, opts);
};

Dragger._getEventPointerId = function(event) {
  // If we have pointer id available let's use it.
  if (typeof event.pointerId === 'number') {
    return event.pointerId;
  }

  // For touch events let's get the first changed touch's identifier.
  if (event.changedTouches) {
    return event.changedTouches[0] ? event.changedTouches[0].identifier : 0;
  }

  // For mouse events let's provide a static id.
  return 1;
};

Dragger._getEventInterface = function(event, pointerId) {
  // If we have pointer id available let's use it.
  if (typeof event.pointerId === 'number') {
    return event.pointerId === pointerId ? event : null;
  }

  // For touch events let's check if the pointer with the provided id is
  // within changed touches.
  if (event.changedTouches) {
    for (var i = 0; i < event.changedTouches.length; i++) {
      if (event.changedTouches[i].identifier === pointerId) {
        return event.changedTouches[i];
      }
    }
    return null;
  }

  // For mouse events there's always one pointer.
  return event;
};

/**
 * Private prototype methods
 * *************************
 */

Dragger.prototype._reset = function() {
  this.pointerId = 0;
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
  if (this._isDestroyed || this.pointerId) return;

  // Make sure left button is pressed on mouse.
  if (e.button) return;

  // Get pointer id.
  var pointerId = Dragger._getEventPointerId(e);
  if (!pointerId) return;

  var eventData = this.getEventInterface(e);

  this.pointerId = pointerId;
  this.startX = this.currentX = eventData.clientX;
  this.startY = this.currentY = eventData.clientY;
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
  var eventData = this.getEventInterface(e);
  if (!eventData) return;

  this.currentX = eventData.clientX;
  this.currentY = eventData.clientY;
  this._emitter.emit('move', e);
};

Dragger.prototype._onCancel = function(e) {
  if (!this.getEventInterface(e)) return;

  this._emitter.emit('cancel', e);
  this._reset();
};

Dragger.prototype._onEnd = function(e) {
  if (!this.getEventInterface(e)) return;

  this._emitter.emit('end', e);
  this._reset();
};

/**
 * Public prototype methods
 * ************************
 */

Dragger.prototype.getEventInterface = function(e) {
  return (this.pointerId && Dragger._getEventInterface(e, this.pointerId)) || null;
};

/**
 * @public
 * @memberof Dragger.prototype
 * @returns {Number}
 */
Dragger.prototype.getDeltaX = function() {
  return this.currentX - this.startX;
};

/**
 * @public
 * @memberof Dragger.prototype
 * @returns {Number}
 */
Dragger.prototype.getDeltaY = function() {
  return this.currentY - this.startY;
};

/**
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
 * @public
 * @memberof Dragger.prototype
 * @returns {Number}
 */
Dragger.prototype.getDeltaTime = function() {
  return Date.now() - this.startTime;
};

/**
 * Bind drag event listeners.
 *
 * @public
 * @memberof Dragger.prototype
 * @param {String[]} events
 *   - 'start', 'move', 'cancel' or 'end'.
 * @param {Function} listener
 * @returns {Dragger}
 */
Dragger.prototype.on = function(events, listener) {
  if (this._isDestroyed) return this;

  var eventsArray = events.split(' ');
  for (var i = 0; i < eventsArray.length; i++) {
    if (Dragger._events[eventsArray[i]]) {
      this._emitter.on(eventsArray[i], listener);
    }
  }

  return this;
};

/**
 * Unbind drag event listeners.
 *
 * @public
 * @memberof Dragger.prototype
 * @param {String[]} events
 *   - 'start', 'move', 'cancel' or 'end'.
 * @param {Function} listener
 * @returns {Dragger}
 */
Dragger.prototype.off = function(events, listener) {
  if (this._isDestroyed) return this;

  var eventsArray = events.split(' ');
  for (var i = 0; i < eventsArray.length; i++) {
    if (Dragger._events[eventsArray[i]]) {
      this._emitter.off(eventsArray[i], listener);
    }
  }

  return this;
};

/**
 * Destroy the instance and unbind all drag event listeners.
 *
 * @public
 * @memberof Dragger.prototype
 * @returns {Dragger}
 */
Dragger.prototype.destroy = function() {
  if (this._isDestroyed) return this;

  var element = this._element;
  var events = Dragger._events;

  // Mark a destroyed.
  this._isDestroyed = true;

  // Destroy emitter.
  this._emitter.destroy();

  // Unbind start event handler.
  element.removeEventListener(
    events.start,
    this._onStart,
    Dragger._usePassiveEvents ? listenerOptions : false
  );

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

  return this;
};

export default Dragger;
