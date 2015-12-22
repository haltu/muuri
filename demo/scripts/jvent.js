/*!
 * jvent - v0.2.0
 *
 * Copyright (c) 2014, @pazguille <guille87paz@gmail.com>
 * Released under the MIT license.
 */
(function(window) {
'use strict';

function Jvent() {}

/**
 * Adds a listener to the collection for a specified event.
 * @public
 * @function
 * @name Jvent#on
 * @param {string} event Event name.
 * @param {function} listener Listener function.
 * @example
 * // Will add a event listener to the "ready" event
 * var startDoingStuff = function (event, param1, param2, ...) {
 *   // Some code here!
 * };
 *
 * me.on("ready", startDoingStuff);
 */
Jvent.prototype.on = function(event, listener) {
  this._collection = this._collection || {};
  this._collection[event] = this._collection[event] || [];
  this._collection[event].push(listener);
  return this;
};

/**
 * Adds a one time listener to the collection for a specified event. It will execute only once.
 * @public
 * @function
 * @name Jvent#once
 * @param {string} event Event name.
 * @param {function} listener Listener function.
 * @returns itself
 * @example
 * // Will add a event handler to the "contentLoad" event once
 * me.once("contentLoad", startDoingStuff);
 */
Jvent.prototype.once = function (event, listener) {
  var that = this;

  function fn() {
    that.off(event, fn);
    listener.apply(this, arguments);
  }

  fn.listener = listener;

  this.on(event, fn);

  return this;
};

/**
 * Removes a listener from the collection for a specified event.
 * @public
 * @function
 * @name Jvent#off
 * @param {string} event Event name.
 * @param {function} listener Listener function.
 * @returns itself
 * @example
 * // Will remove event handler to the "ready" event
 * var startDoingStuff = function () {
 *   // Some code here!
 * };
 *
 * me.off("ready", startDoingStuff);
 */
Jvent.prototype.off = function (event, listener) {

  var listeners = this._collection[event],
      j = 0;

  if (listeners !== undefined) {
    for (j; j < listeners.length; j += 1) {
      if (listeners[j] === listener || listeners[j].listener === listener) {
        listeners.splice(j, 1);
        break;
      }
    }
  }

  if (listeners.length === 0) {
    this.removeAllListeners(event);
  }

  return this;
};

/**
 * Removes all listeners from the collection for a specified event.
 * @public
 * @function
 * @name Jvent#removeAllListeners
 * @param {string} event Event name.
 * @returns itself
 * @example
 * me.removeAllListeners("ready");
 */
Jvent.prototype.removeAllListeners = function (event) {
  this._collection = this._collection || {};
  delete this._collection[event];
  return this;
};

/**
 * Returns all listeners from the collection for a specified event.
 * @public
 * @function
 * @name Jvent#listeners
 * @param {string} event Event name.
 * @returns Array
 * @example
 * me.listeners("ready");
 */
Jvent.prototype.listeners = function (event) {
  this._collection = this._collection || {};
  return this._collection[event];
};

/**
 * Execute each item in the listener collection in order with the specified data.
 * @name Jvent#emit
 * @public
 * @protected
 * @param {string} event The name of the event you want to emit.
 * @param {...object} var_args Data to pass to the listeners.
 * @example
 * // Will emit the "ready" event with "param1" and "param2" as arguments.
 * me.emit("ready", "param1", "param2");
 */
Jvent.prototype.emit = function () {
  if (this._collection === undefined) {
    return this;
  }

  var args = [].slice.call(arguments, 0), // converted to array
      event = args.shift(),
      listeners = this._collection[event],
      i = 0,
      len;

  if (listeners) {
    listeners = listeners.slice(0);
    len = listeners.length;
    for (i; i < len; i += 1) {
      listeners[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Expose
 */
// AMD
if (typeof window.define === 'function' && window.define.amd !== undefined) {
  window.define('Jvent', [], function () {
    return Jvent;
  });
// CommonJS
} else if (typeof module !== 'undefined' && module.exports !== undefined) {
  module.exports = Jvent;
// Browser
} else {
  window.Jvent = Jvent;
};

}(this));