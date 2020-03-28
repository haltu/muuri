/**
 * Muuri Ticker
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Ticker/LICENSE.md
 */

import raf from '../utils/raf';

/**
 * A ticker system for handling DOM reads and writes in an efficient way.
 *
 * @class
 */
function Ticker(numLanes) {
  this._nextStep = null;
  this._lanes = [];
  this._stepQueue = [];
  this._stepCallbacks = {};
  this._step = this._step.bind(this);
  for (var i = 0; i < numLanes; i++) {
    this._lanes.push(new TickerLane());
  }
}

Ticker.prototype._step = function (time) {
  var lanes = this._lanes;
  var stepQueue = this._stepQueue;
  var stepCallbacks = this._stepCallbacks;
  var i, j, id, laneQueue, laneCallbacks, laneIndices;

  this._nextStep = null;

  for (i = 0; i < lanes.length; i++) {
    laneQueue = lanes[i].queue;
    laneCallbacks = lanes[i].callbacks;
    laneIndices = lanes[i].indices;
    for (j = 0; j < laneQueue.length; j++) {
      id = laneQueue[j];
      if (!id) continue;
      stepQueue.push(id);
      stepCallbacks[id] = laneCallbacks[id];
      delete laneCallbacks[id];
      delete laneIndices[id];
    }
    laneQueue.length = 0;
  }

  for (i = 0; i < stepQueue.length; i++) {
    id = stepQueue[i];
    if (stepCallbacks[id]) stepCallbacks[id](time);
    delete stepCallbacks[id];
  }

  stepQueue.length = 0;
};

Ticker.prototype.add = function (laneIndex, id, callback) {
  this._lanes[laneIndex].add(id, callback);
  if (!this._nextStep) this._nextStep = raf(this._step);
};

Ticker.prototype.remove = function (laneIndex, id) {
  this._lanes[laneIndex].remove(id);
};

/**
 * A lane for ticker.
 *
 * @class
 */
function TickerLane() {
  this.queue = [];
  this.indices = {};
  this.callbacks = {};
}

TickerLane.prototype.add = function (id, callback) {
  var index = this.indices[id];
  if (index !== undefined) this.queue[index] = undefined;
  this.queue.push(id);
  this.callbacks[id] = callback;
  this.indices[id] = this.queue.length - 1;
};

TickerLane.prototype.remove = function (id) {
  var index = this.indices[id];
  if (index === undefined) return;
  this.queue[index] = undefined;
  delete this.callbacks[id];
  delete this.indices[id];
};

export default Ticker;
