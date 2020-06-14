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

export default Emitter;
