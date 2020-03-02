/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

import PackerWorker from 'web-worker:./PackerWorker.js';
import PackerProcessor from './PackerProcessor';
import {
  FILL_GAPS,
  HORIZONTAL,
  ALIGN_RIGHT,
  ALIGN_BOTTOM,
  ROUNDING,
  PACKET_INDEX_ID,
  PACKET_INDEX_WIDTH,
  PACKET_INDEX_HEIGHT,
  PACKET_INDEX_OPTIONS,
  PACKET_HEADER_SLOTS
} from './constants';

/**
 * @class
 * @param {Number} [numWorkers=2]
 * @param {Object} [options]
 * @param {Boolean} [options.fillGaps=false]
 * @param {Boolean} [options.horizontal=false]
 * @param {Boolean} [options.alignRight=false]
 * @param {Boolean} [options.alignBottom=false]
 * @param {Boolean} [options.rounding=false]
 */
function Packer(numWorkers, options) {
  this._options = 0;
  this._processor = null;
  this._layoutQueue = [];
  this._layouts = {};
  this._layoutCallbacks = {};
  this._layoutWorkers = {};
  this._layoutWorkerData = {};
  this._workers = [];
  this._onWorkerMessage = this._onWorkerMessage.bind(this);

  // Set initial options.
  this.setOptions(options);

  // Init the worker(s) or the processor if workers can't be used.
  var workerCount = typeof numWorkers === 'number' ? Math.max(0, numWorkers) : 0;
  if (workerCount && window.Worker) {
    for (var i = 0, worker; i < workerCount; i++) {
      worker = new PackerWorker();
      worker.onmessage = this._onWorkerMessage;
      this._workers.push(worker);
    }
  } else {
    this._processor = new PackerProcessor();
  }
}

Packer.prototype._sendToWorker = function() {
  if (!this._layoutQueue.length || !this._workers.length) return;

  var id = this._layoutQueue.shift();
  var worker = this._workers.pop();
  var data = this._layoutWorkerData[id];

  delete this._layoutWorkerData[id];
  this._layoutWorkers[id] = worker;
  worker.postMessage(data.buffer, [data.buffer]);
};

Packer.prototype._onWorkerMessage = function(msg) {
  var data = new Float32Array(msg.data);
  var id = data[PACKET_INDEX_ID];
  var layout = this._layouts[id];
  var callback = this._layoutCallbacks[id];
  var worker = this._layoutWorkers[id];

  if (layout) delete this._layoutCallbacks[id];
  if (callback) delete this._layoutCallbacks[id];
  if (worker) delete this._layoutWorkers[id];

  if (layout && callback) {
    layout.width = data[PACKET_INDEX_WIDTH];
    layout.height = data[PACKET_INDEX_HEIGHT];
    layout.slots = data.subarray(PACKET_HEADER_SLOTS, data.length);
    callback(layout);
  }

  if (worker) {
    this._workers.push(worker);
    this._sendToWorker();
  }
};

/**
 * @public
 * @memberof Packer.prototype
 * @param {Object} [options]
 * @param {Boolean} [options.fillGaps]
 * @param {Boolean} [options.horizontal]
 * @param {Boolean} [options.alignRight]
 * @param {Boolean} [options.alignBottom]
 * @param {Boolean} [options.rounding]
 * @returns {Packer}
 */
Packer.prototype.setOptions = function(options) {
  if (!options) return this;

  var fillGaps;
  if (typeof options.fillGaps === 'boolean') {
    fillGaps = options.fillGaps ? FILL_GAPS : 0;
  } else {
    fillGaps = this._options & FILL_GAPS;
  }

  var horizontal;
  if (typeof options.horizontal === 'boolean') {
    horizontal = options.horizontal ? HORIZONTAL : 0;
  } else {
    horizontal = this._options & HORIZONTAL;
  }

  var alignRight;
  if (typeof options.alignRight === 'boolean') {
    alignRight = options.alignRight ? ALIGN_RIGHT : 0;
  } else {
    alignRight = this._options & ALIGN_RIGHT;
  }

  var alignBottom;
  if (typeof options.alignBottom === 'boolean') {
    alignBottom = options.alignBottom ? ALIGN_BOTTOM : 0;
  } else {
    alignBottom = this._options & ALIGN_BOTTOM;
  }

  var rounding;
  if (typeof options.rounding === 'boolean') {
    rounding = options.rounding ? ROUNDING : 0;
  } else {
    rounding = this._options & ROUNDING;
  }

  this._options = fillGaps | horizontal | alignRight | alignBottom | rounding;

  return this;
};

/**
 * @public
 * @memberof Packer.prototype
 * @param {Number} id
 * @param {Item[]} items
 * @param {Number} width
 * @param {Number} height
 * @param {Function} callback
 */
Packer.prototype.createLayout = function(id, items, width, height, callback) {
  if (this._layouts[id]) {
    throw new Error('A layout with the provided id is currently being processed.');
  }

  var rounding = this._options & ROUNDING;
  var horizontal = this._options & HORIZONTAL;
  var layout = {
    id: id,
    items: items,
    slots: null,
    width: horizontal ? 0 : width,
    height: !horizontal ? 0 : height,
    setWidth: horizontal,
    setHeight: !horizontal,
    settings: this._options
  };

  // If there are no items let's call the callback immediately.
  if (!items.length) {
    layout.slots = [];
    if (rounding) {
      layout.width = Math.round(layout.width);
      layout.height = Math.round(layout.height);
    }
    callback(layout);
    return;
  }

  // Create layout synchronously if needed.
  if (this._processor) {
    layout.slots = window.Float32Array
      ? new Float32Array(items.length * 2)
      : new Array(items.length * 2);
    this._processor.fillLayout(layout);
    callback(layout);
    return;
  }

  // Worker data.
  var data = new Float32Array(PACKET_HEADER_SLOTS + items.length * 2);

  // Worker data header.
  data[PACKET_INDEX_ID] = id;
  data[PACKET_INDEX_WIDTH] = layout.width;
  data[PACKET_INDEX_HEIGHT] = layout.height;
  data[PACKET_INDEX_OPTIONS] = layout.settings;

  // Worker data items.
  var i, j, item;
  for (i = 0, j = PACKET_HEADER_SLOTS - 1, item; i < items.length; i++) {
    item = items[i];
    data[++j] = item._width + item._marginLeft + item._marginRight;
    data[++j] = item._height + item._marginTop + item._marginBottom;
  }

  this._layoutQueue.push(id);
  this._layouts[id] = layout;
  this._layoutCallbacks[id] = callback;
  this._layoutWorkerData[id] = data;

  this._sendToWorker();

  return this.cancelLayout.bind(this, id);
};

/**
 * @public
 * @memberof Packer.prototype
 * @param {Number} id
 */
Packer.prototype.cancelLayout = function(id) {
  var layout = this._layouts[id];
  if (!layout) return;

  delete this._layouts[id];
  delete this._layoutCallbacks[id];

  if (this._layoutWorkerData[id]) {
    delete this._layoutWorkerData[id];
    var queueIndex = this._layoutQueue.indexOf(id);
    if (queueIndex > -1) this._layoutQueue.splice(queueIndex, 1);
  }
};

/**
 * @public
 * @memberof Packer.prototype
 */
Packer.prototype.destroy = function() {
  var worker, id, i;

  // Terminate active workers.
  for (id in this._layoutWorkers) {
    worker = this._layoutWorkers[id];
    worker.onmessage = null;
    worker.terminate();
  }

  // Terminate idle workers.
  for (i = 0; i < this._workers.length; i++) {
    worker = this._workers[i];
    worker.onmessage = null;
    worker.terminate();
  }

  // Reset data.
  this._workers.length = 0;
  this._layoutQueue.length = 0;
  this._layouts = {};
  this._layoutCallbacks = {};
  this._layoutWorkers = {};
  this._layoutWorkerData = {};
};

export default Packer;
