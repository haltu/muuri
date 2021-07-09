/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

import PackerProcessor, {
  createWorkerProcessors,
  destroyWorkerProcessors,
  isWorkerProcessorsSupported,
} from './PackerProcessor';

export var FILL_GAPS = 1;
export var HORIZONTAL = 2;
export var ALIGN_RIGHT = 4;
export var ALIGN_BOTTOM = 8;
export var ROUNDING = 16;
export var PACKET_INDEX_ID = 0;
export var PACKET_INDEX_WIDTH = 1;
export var PACKET_INDEX_HEIGHT = 2;
export var PACKET_INDEX_OPTIONS = 3;
export var PACKET_HEADER_SLOTS = 4;

/**
 * @class
 * @param {Number} [numWorkers=0]
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
  numWorkers = typeof numWorkers === 'number' ? Math.max(0, numWorkers) : 0;
  if (numWorkers && isWorkerProcessorsSupported()) {
    try {
      this._workers = createWorkerProcessors(numWorkers, this._onWorkerMessage);
    } catch (e) {
      this._processor = new PackerProcessor();
    }
  } else {
    this._processor = new PackerProcessor();
  }
}

Packer.prototype._sendToWorker = function () {
  if (!this._layoutQueue.length || !this._workers.length) return;

  var layoutId = this._layoutQueue.shift();
  var worker = this._workers.pop();
  var data = this._layoutWorkerData[layoutId];

  delete this._layoutWorkerData[layoutId];
  this._layoutWorkers[layoutId] = worker;
  worker.postMessage(data.buffer, [data.buffer]);
};

Packer.prototype._onWorkerMessage = function (msg) {
  var data = new Float32Array(msg.data);
  var layoutId = data[PACKET_INDEX_ID];
  var layout = this._layouts[layoutId];
  var callback = this._layoutCallbacks[layoutId];
  var worker = this._layoutWorkers[layoutId];

  if (layout) delete this._layouts[layoutId];
  if (callback) delete this._layoutCallbacks[layoutId];
  if (worker) delete this._layoutWorkers[layoutId];

  if (layout && callback) {
    layout.width = data[PACKET_INDEX_WIDTH];
    layout.height = data[PACKET_INDEX_HEIGHT];
    layout.slots = data.subarray(PACKET_HEADER_SLOTS, data.length);
    this._finalizeLayout(layout);
    callback(layout);
  }

  if (worker) {
    this._workers.push(worker);
    this._sendToWorker();
  }
};

Packer.prototype._finalizeLayout = function (layout) {
  var grid = layout._grid;
  var isHorizontal = layout._settings & HORIZONTAL;
  var isBorderBox = grid._boxSizing === 'border-box';

  delete layout._grid;
  delete layout._settings;

  layout.styles = {};

  if (isHorizontal) {
    layout.styles.width =
      (isBorderBox ? layout.width + grid._borderLeft + grid._borderRight : layout.width) + 'px';
  } else {
    layout.styles.height =
      (isBorderBox ? layout.height + grid._borderTop + grid._borderBottom : layout.height) + 'px';
  }

  return layout;
};

/**
 * @public
 * @param {Object} [options]
 * @param {Boolean} [options.fillGaps]
 * @param {Boolean} [options.horizontal]
 * @param {Boolean} [options.alignRight]
 * @param {Boolean} [options.alignBottom]
 * @param {Boolean} [options.rounding]
 */
Packer.prototype.setOptions = function (options) {
  if (!options) return;

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
};

/**
 * @public
 * @param {Grid} grid
 * @param {Number} layoutId
 * @param {Item[]} items
 * @param {Number} width
 * @param {Number} height
 * @param {Function} callback
 * @returns {?Function}
 */
Packer.prototype.createLayout = function (grid, layoutId, items, width, height, callback) {
  if (this._layouts[layoutId]) {
    throw new Error('A layout with the provided id is currently being processed.');
  }

  var horizontal = this._options & HORIZONTAL;
  var layout = {
    id: layoutId,
    items: items,
    slots: null,
    width: horizontal ? 0 : width,
    height: !horizontal ? 0 : height,
    // Temporary data, which will be removed before sending the layout data
    // outside of Packer's context.
    _grid: grid,
    _settings: this._options,
  };

  // If there are no items let's call the callback immediately.
  if (!items.length) {
    layout.slots = [];
    this._finalizeLayout(layout);
    callback(layout);
    return;
  }

  // Create layout synchronously if needed.
  if (this._processor) {
    layout.slots = window.Float32Array
      ? new Float32Array(items.length * 2)
      : new Array(items.length * 2);
    this._processor.computeLayout(layout, layout._settings);
    this._finalizeLayout(layout);
    callback(layout);
    return;
  }

  // Worker data.
  var data = new Float32Array(PACKET_HEADER_SLOTS + items.length * 2);

  // Worker data header.
  data[PACKET_INDEX_ID] = layoutId;
  data[PACKET_INDEX_WIDTH] = layout.width;
  data[PACKET_INDEX_HEIGHT] = layout.height;
  data[PACKET_INDEX_OPTIONS] = layout._settings;

  // Worker data items.
  var i, j, item;
  for (i = 0, j = PACKET_HEADER_SLOTS - 1, item; i < items.length; i++) {
    item = items[i];
    data[++j] = item._width + item._marginLeft + item._marginRight;
    data[++j] = item._height + item._marginTop + item._marginBottom;
  }

  this._layoutQueue.push(layoutId);
  this._layouts[layoutId] = layout;
  this._layoutCallbacks[layoutId] = callback;
  this._layoutWorkerData[layoutId] = data;

  this._sendToWorker();

  return this.cancelLayout.bind(this, layoutId);
};

/**
 * @public
 * @param {Number} layoutId
 */
Packer.prototype.cancelLayout = function (layoutId) {
  var layout = this._layouts[layoutId];
  if (!layout) return;

  delete this._layouts[layoutId];
  delete this._layoutCallbacks[layoutId];

  if (this._layoutWorkerData[layoutId]) {
    delete this._layoutWorkerData[layoutId];
    var queueIndex = this._layoutQueue.indexOf(layoutId);
    if (queueIndex > -1) this._layoutQueue.splice(queueIndex, 1);
  }
};

/**
 * @public
 */
Packer.prototype.destroy = function () {
  // Move all currently used workers back in the workers array.
  for (var key in this._layoutWorkers) {
    this._workers.push(this._layoutWorkers[key]);
  }

  // Destroy all instance's workers.
  destroyWorkerProcessors(this._workers);

  // Reset data.
  this._workers.length = 0;
  this._layoutQueue.length = 0;
  this._layouts = {};
  this._layoutCallbacks = {};
  this._layoutWorkers = {};
  this._layoutWorkerData = {};
};

export default Packer;
