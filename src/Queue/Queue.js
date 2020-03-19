/**
 * Muuri Queue
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Queue/LICENSE.md
 */

/**
 * Queue constructor.
 *
 * @class
 */
function Queue() {
  this._queue = [];
  this._processQueue = [];
  this._processCounter = 0;
  this._isDestroyed = false;
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Add callback to the queue.
 *
 * @public
 * @param {Function} callback
 * @returns {Queue}
 */
Queue.prototype.add = function(callback) {
  if (this._isDestroyed) return this;
  this._queue.push(callback);
  return this;
};

/**
 * Process queue callbacks in the order they were insterted and reset the queue.
 * The provided arguments are passed on to the callbacks.
 *
 * @public
 * @param {...*} args
 * @returns {Queue}
 */
Queue.prototype.process = function() {
  if (this._isDestroyed) return this;

  var queue = this._queue;
  var queueLength = queue.length;

  // Quit early if the queue is empty.
  if (!queueLength) return this;

  var pQueue = this._processQueue;
  var pQueueLength = pQueue.length;
  var i;

  // Append the current queue callbacks to the process queue.
  for (i = 0; i < queueLength; i++) {
    pQueue.push(queue[i]);
  }

  // Reset queue.
  queue.length = 0;

  // Increment process counter.
  ++this._processCounter;

  // Call the new process queue callbacks.
  var indexFrom = pQueueLength;
  var indexTo = pQueue.length;
  for (i = indexFrom; i < indexTo; i++) {
    if (this._isDestroyed) return this;
    pQueue[i].apply(null, arguments);
  }

  // Decrement process counter.
  --this._processCounter;

  // Reset process queue once it has stop processing.
  if (!this._processCounter) {
    pQueue.length = 0;
  }

  return this;
};

/**
 * Destroy Queue instance.
 *
 * @public
 * @returns {Queue}
 */
Queue.prototype.destroy = function() {
  if (this._isDestroyed) return this;

  this._isDestroyed = true;
  this._queue.length = 0;
  this._processQueue.length = 0;
  this._processCounter = 0;

  return this;
};

export default Queue;
