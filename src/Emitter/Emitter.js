/**
 * Muuri Emitter
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Emitter/LICENSE.md
 */

/**
 * Event emitter constructor.
 *
 * @class
 */
function Emitter() {
  this._events = {};
  this._queue = [];
  this._counter = 0;
  this._isDestroyed = false;
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Bind an event listener.
 *
 * @public
 * @memberof Emitter.prototype
 * @param {String} event
 * @param {Function} listener
 * @returns {Emitter}
 */
Emitter.prototype.on = function(event, listener) {
  if (this._isDestroyed) return this;

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
 * @memberof Emitter.prototype
 * @param {String} event
 * @param {Function} [listener]
 * @returns {Emitter}
 */
Emitter.prototype.off = function(event, listener) {
  if (this._isDestroyed) return this;

  // Get listeners and return immediately if none is found.
  var listeners = this._events[event];
  if (!listeners || !listeners.length) return this;

  // If no specific listener is provided remove all listeners.
  if (!listener) {
    listeners.length = 0;
    return this;
  }

  // Remove all matching listeners.
  var i = listeners.length;
  while (i--) {
    if (listener === listeners[i]) listeners.splice(i, 1);
  }

  return this;
};

/**
 * Emit all listeners in a specified event with the provided arguments.
 *
 * @public
 * @memberof Emitter.prototype
 * @param {String} event
 * @param {*} [arg1]
 * @param {*} [arg2]
 * @param {*} [arg3]
 * @returns {Emitter}
 */
Emitter.prototype.emit = function(event, arg1, arg2, arg3) {
  if (this._isDestroyed) return this;

  // Get event listeners and quit early if there's no listeners.
  var listeners = this._events[event];
  if (!listeners || !listeners.length) return this;

  var queue = this._queue;
  var qLength = queue.length;
  var aLength = arguments.length - 1;
  var i;

  // Add the current listeners to the callback queue before we process them.
  // This is necessary to guarantee that all of the listeners are called in
  // correct order even if new event listeners are removed/added during
  // processing and/or events are emitted during processing.
  for (i = 0; i < listeners.length; i++) {
    queue.push(listeners[i]);
  }

  // Increment queue counter. This is needed for the scenarios where emit is
  // triggered while the queue is already processing. We need to keep track of
  // how many "queue processors" there are active so that we can safely reset
  // the queue in the end when the last queue processor is finished.
  ++this._counter;

  // Process the queue (the specific part of it for this emit).
  for (i = qLength, qLength = queue.length; i < qLength; i++) {
    // prettier-ignore
    aLength === 0 ? queue[i]() :
    aLength === 1 ? queue[i](arg1) :
    aLength === 2 ? queue[i](arg1, arg2) :
                    queue[i](arg1, arg2, arg3);

    // Stop processing if the emitter is destroyed.
    if (this._isDestroyed) return this;
  }

  // Decrement queue process counter.
  --this._counter;

  // Reset the queue if there are no more queue processes running.
  if (!this._counter) queue.length = 0;

  return this;
};

/**
 * Destroy emitter instance. Basically just removes all bound listeners.
 *
 * @public
 * @memberof Emitter.prototype
 * @returns {Emitter}
 */
Emitter.prototype.destroy = function() {
  if (this._isDestroyed) return this;

  var events = this._events;
  var event;

  // Flag as destroyed.
  this._isDestroyed = true;

  // Reset queue (if queue is currently processing this will also stop that).
  this._queue.length = this._counter = 0;

  // Remove all listeners.
  for (event in events) {
    if (events[event]) {
      events[event].length = 0;
      events[event] = undefined;
    }
  }

  return this;
};

export default Emitter;
