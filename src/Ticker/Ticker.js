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

  this._readQueue = [];
  this._writeQueue = [];
  this._reads = {};
  this._writes = {};

  this._batchReadQueue = [];
  this._batchWriteQueue = [];
  this._batchReads = {};
  this._batchWrites = {};

  this._step = this._step.bind(this);
}

Ticker.prototype._add = function(id, callback, queue, callbacks) {
  var index = queue.indexOf(id);
  if (index > -1) {
    queue[index] = undefined;
  }

  queue.push(id);
  callbacks[id] = callback;

  if (!this._nextStep) {
    this._nextStep = raf(this._step);
  }
};

Ticker.prototype._remove = function(id, queue, callbacks) {
  var index = queue.indexOf(id);
  if (index === -1) return;
  queue[index] = undefined;
  delete callbacks[id];
};

Ticker.prototype._step = function() {
  var readQueue = this._readQueue;
  var writeQueue = this._writeQueue;
  var reads = this._reads;
  var writes = this._writes;
  var batchReadQueue = this._batchReadQueue;
  var batchWriteQueue = this._batchWriteQueue;
  var batchReads = this._batchReads;
  var batchWrites = this._batchWrites;
  var nReads = readQueue.length;
  var nWrites = writeQueue.length;
  var i, id;

  this._nextStep = null;

  // Copy reads to batch.
  for (i = 0; i < nReads; i++) {
    id = readQueue[i];
    if (!id) continue;
    batchReadQueue.push(id);
    batchReads[id] = reads[id];
    delete reads[id];
  }

  // Copy writes to batch.
  for (i = 0; i < nWrites; i++) {
    id = writeQueue[i];
    if (!id) continue;
    batchWriteQueue.push(id);
    batchWrites[id] = writes[id];
    delete writes[id];
  }

  readQueue.length = 0;
  writeQueue.length = 0;

  nReads = batchReadQueue.length;
  nWrites = batchWriteQueue.length;

  // Process batch reads.
  for (i = 0; i < nReads; i++) {
    id = batchReadQueue[i];
    if (batchReads[id]) batchReads[id]();
    delete batchReads[id];
  }

  // Process batch writes.
  for (i = 0; i < nWrites; i++) {
    id = batchWriteQueue[i];
    if (batchWrites[id]) batchWrites[id]();
    delete batchWrites[id];
  }

  batchReadQueue.length = 0;
  batchWriteQueue.length = 0;
};

Ticker.prototype.read = function(id, callback) {
  this._add(id, callback, this._readQueue, this._reads);
};

Ticker.prototype.cancelRead = function(id) {
  this._remove(id, this._readQueue, this._reads);
};

Ticker.prototype.write = function(id, callback) {
  this._add(id, callback, this._writeQueue, this._writes);
};

Ticker.prototype.cancelWrite = function(id) {
  this._remove(id, this._writeQueue, this._writes);
};

export default Ticker;
