/**
 * Muuri Ticker
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Ticker/LICENSE.md
 */

import raf from '../utils/raf';

/**
 * A ticker system for handling DOM reads and writes in an efficient way.
 * Contains a read queue and a write queue that are processed on the next
 * animation frame when needed.
 *
 * @class
 */
function Ticker() {
  this._nextStep = null;

  this._queue = [];
  this._reads = {};
  this._writes = {};

  this._batch = [];
  this._batchReads = {};
  this._batchWrites = {};

  this._step = this._step.bind(this);
}

Ticker.prototype.add = function(id, readOperation, writeOperation, isPrioritized) {
  // First, let's check if an item has been added to the queues with the same id
  // and if so -> remove it.
  var currentIndex = this._queue.indexOf(id);
  if (currentIndex > -1) this._queue[currentIndex] = undefined;

  // Add entry.
  isPrioritized ? this._queue.unshift(id) : this._queue.push(id);
  this._reads[id] = readOperation;
  this._writes[id] = writeOperation;

  // Finally, let's kick-start the next tick if it is not running yet.
  if (!this._nextStep) this._nextStep = raf(this._step);
};

Ticker.prototype.cancel = function(id) {
  var currentIndex = this._queue.indexOf(id);
  if (currentIndex > -1) {
    this._queue[currentIndex] = undefined;
    delete this._reads[id];
    delete this._writes[id];
  }
};

Ticker.prototype._step = function() {
  var queue = this._queue;
  var reads = this._reads;
  var writes = this._writes;
  var batch = this._batch;
  var batchReads = this._batchReads;
  var batchWrites = this._batchWrites;
  var length = queue.length;
  var id;
  var i;

  // Reset ticker.
  this._nextStep = null;

  // Setup queues and callback placeholders.
  for (i = 0; i < length; i++) {
    id = queue[i];
    if (!id) continue;

    batch.push(id);

    batchReads[id] = reads[id];
    delete reads[id];

    batchWrites[id] = writes[id];
    delete writes[id];
  }

  // Reset queue.
  queue.length = 0;

  // Process read callbacks.
  for (i = 0; i < length; i++) {
    id = batch[i];
    if (batchReads[id]) {
      batchReads[id]();
      delete batchReads[id];
    }
  }

  // Process write callbacks.
  for (i = 0; i < length; i++) {
    id = batch[i];
    if (batchWrites[id]) {
      batchWrites[id]();
      delete batchWrites[id];
    }
  }

  // Reset batch.
  batch.length = 0;

  // Restart the ticker if needed.
  if (!this._nextStep && queue.length) {
    this._nextStep = raf(this._step);
  }
};

export default Ticker;
