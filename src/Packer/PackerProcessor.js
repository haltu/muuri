/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

function createPackerProcessor(isWorker) {
  var FILL_GAPS = 1;
  var HORIZONTAL = 2;
  var ALIGN_RIGHT = 4;
  var ALIGN_BOTTOM = 8;
  var ROUNDING = 16;

  var EPS = 0.001;
  var MIN_SLOT_SIZE = 0.5;

  // Rounds number first to three decimal precision and then floors the result
  // to two decimal precision.
  // Math.floor(Math.round(number * 1000) / 10) / 100
  function roundNumber(number) {
    return ((((number * 1000 + 0.5) << 0) / 10) << 0) / 100;
  }

  /**
   * @class
   */
  function PackerProcessor() {
    this.currentRects = [];
    this.nextRects = [];
    this.rectTarget = {};
    this.rectStore = [];
    this.slotSizes = [];
    this.rectId = 0;
    this.slotIndex = -1;
    this.slotData = { left: 0, top: 0, width: 0, height: 0 };
    this.sortRectsLeftTop = this.sortRectsLeftTop.bind(this);
    this.sortRectsTopLeft = this.sortRectsTopLeft.bind(this);
  }

  /**
   * Takes a layout object as an argument and computes positions (slots) for the
   * layout items. Also computes the final width and height of the layout. The
   * provided layout object's slots array is mutated as well as the width and
   * height properties.
   *
   * @param {Object} layout
   * @param {Number} layout.width
   *   - The start (current) width of the layout in pixels.
   * @param {Number} layout.height
   *   - The start (current) height of the layout in pixels.
   * @param {(Item[]|Number[])} layout.items
   *   - List of Muuri.Item instances or a list of item dimensions
   *     (e.g [ item1Width, item1Height, item2Width, item2Height, ... ]).
   * @param {(Array|Float32Array)} layout.slots
   *   - An Array/Float32Array instance which's length should equal to
   *     the amount of items times two. The position (width and height) of each
   *     item will be written into this array.
   * @param {Number} settings
   *   - The layout's settings as bitmasks.
   * @returns {Object}
   */
  PackerProcessor.prototype.computeLayout = function (layout, settings) {
    var items = layout.items;
    var slots = layout.slots;
    var fillGaps = !!(settings & FILL_GAPS);
    var horizontal = !!(settings & HORIZONTAL);
    var alignRight = !!(settings & ALIGN_RIGHT);
    var alignBottom = !!(settings & ALIGN_BOTTOM);
    var rounding = !!(settings & ROUNDING);
    var isPreProcessed = typeof items[0] === 'number';
    var i, bump, item, slotWidth, slotHeight, slot;

    // No need to go further if items do not exist.
    if (!items.length) return layout;

    // Compute slots for the items.
    bump = isPreProcessed ? 2 : 1;
    for (i = 0; i < items.length; i += bump) {
      // If items are pre-processed it means that items array contains only
      // the raw dimensions of the items. Otherwise we assume it is an array
      // of normal Muuri items.
      if (isPreProcessed) {
        slotWidth = items[i];
        slotHeight = items[i + 1];
      } else {
        item = items[i];
        slotWidth = item._width + item._marginLeft + item._marginRight;
        slotHeight = item._height + item._marginTop + item._marginBottom;
      }

      // If rounding is enabled let's round the item's width and height to
      // make the layout algorithm a bit more stable. This has a performance
      // cost so don't use this if not necessary.
      if (rounding) {
        slotWidth = roundNumber(slotWidth);
        slotHeight = roundNumber(slotHeight);
      }

      // Get slot data.
      slot = this.computeNextSlot(layout, slotWidth, slotHeight, fillGaps, horizontal);

      // Update layout width/height.
      if (horizontal) {
        if (slot.left + slot.width > layout.width) {
          layout.width = slot.left + slot.width;
        }
      } else {
        if (slot.top + slot.height > layout.height) {
          layout.height = slot.top + slot.height;
        }
      }

      // Add item slot data to layout slots.
      slots[++this.slotIndex] = slot.left;
      slots[++this.slotIndex] = slot.top;

      // Store the size too (for later usage) if needed.
      if (alignRight || alignBottom) {
        this.slotSizes.push(slot.width, slot.height);
      }
    }

    // If the alignment is set to right we need to adjust the results.
    if (alignRight) {
      for (i = 0; i < slots.length; i += 2) {
        slots[i] = layout.width - (slots[i] + this.slotSizes[i]);
      }
    }

    // If the alignment is set to bottom we need to adjust the results.
    if (alignBottom) {
      for (i = 1; i < slots.length; i += 2) {
        slots[i] = layout.height - (slots[i] + this.slotSizes[i]);
      }
    }

    // Reset stuff.
    this.slotSizes.length = 0;
    this.currentRects.length = 0;
    this.nextRects.length = 0;
    this.rectStore.length = 0;
    this.rectId = 0;
    this.slotIndex = -1;

    return layout;
  };

  /**
   * Calculate next slot in the layout. Returns a slot object with position and
   * dimensions data. The returned object is reused between calls.
   *
   * @param {Object} layout
   * @param {Number} slotWidth
   * @param {Number} slotHeight
   * @param {Boolean} fillGaps
   * @param {Boolean} horizontal
   * @returns {Object}
   */
  PackerProcessor.prototype.computeNextSlot = function (
    layout,
    slotWidth,
    slotHeight,
    fillGaps,
    horizontal
  ) {
    var slot = this.slotData;
    var currentRects = this.currentRects;
    var nextRects = this.nextRects;
    var ignoreCurrentRects = false;
    var rect;
    var rectId;
    var shards;
    var i;
    var j;

    // Reset new slots.
    nextRects.length = 0;

    // Set item slot initial data.
    slot.left = null;
    slot.top = null;
    slot.width = slotWidth;
    slot.height = slotHeight;

    // Try to find position for the slot from the existing free spaces in the
    // layout.
    for (i = 0; i < currentRects.length; i++) {
      rectId = currentRects[i];
      if (!rectId) continue;
      rect = this.getRect(rectId);
      if (slot.width <= rect.width + EPS && slot.height <= rect.height + EPS) {
        slot.left = rect.left;
        slot.top = rect.top;
        break;
      }
    }

    // If no position was found for the slot let's position the slot to
    // the bottom left (in vertical mode) or top right (in horizontal mode) of
    // the layout.
    if (slot.left === null) {
      if (horizontal) {
        slot.left = layout.width;
        slot.top = 0;
      } else {
        slot.left = 0;
        slot.top = layout.height;
      }

      // If gaps don't need filling let's throw away all the current free spaces
      // (currentRects).
      if (!fillGaps) {
        ignoreCurrentRects = true;
      }
    }

    // In vertical mode, if the slot's bottom overlaps the layout's bottom.
    if (!horizontal && slot.top + slot.height > layout.height + EPS) {
      // If slot is not aligned to the left edge, create a new free space to the
      // left of the slot.
      if (slot.left > MIN_SLOT_SIZE) {
        nextRects.push(this.addRect(0, layout.height, slot.left, Infinity));
      }

      // If slot is not aligned to the right edge, create a new free space to
      // the right of the slot.
      if (slot.left + slot.width < layout.width - MIN_SLOT_SIZE) {
        nextRects.push(
          this.addRect(
            slot.left + slot.width,
            layout.height,
            layout.width - slot.left - slot.width,
            Infinity
          )
        );
      }

      // Update layout height.
      layout.height = slot.top + slot.height;
    }

    // In horizontal mode, if the slot's right overlaps the layout's right edge.
    if (horizontal && slot.left + slot.width > layout.width + EPS) {
      // If slot is not aligned to the top, create a new free space above the
      // slot.
      if (slot.top > MIN_SLOT_SIZE) {
        nextRects.push(this.addRect(layout.width, 0, Infinity, slot.top));
      }

      // If slot is not aligned to the bottom, create a new free space below
      // the slot.
      if (slot.top + slot.height < layout.height - MIN_SLOT_SIZE) {
        nextRects.push(
          this.addRect(
            layout.width,
            slot.top + slot.height,
            Infinity,
            layout.height - slot.top - slot.height
          )
        );
      }

      // Update layout width.
      layout.width = slot.left + slot.width;
    }

    // Clean up the current free spaces making sure none of them overlap with
    // the slot. Split all overlapping free spaces into smaller shards that do
    // not overlap with the slot.
    if (!ignoreCurrentRects) {
      if (fillGaps) i = 0;
      for (; i < currentRects.length; i++) {
        rectId = currentRects[i];
        if (!rectId) continue;
        rect = this.getRect(rectId);
        shards = this.splitRect(rect, slot);
        for (j = 0; j < shards.length; j++) {
          rectId = shards[j];
          rect = this.getRect(rectId);
          // Make sure that the free space is within the boundaries of the
          // layout. This routine is critical to the algorithm as it makes sure
          // that there are no leftover spaces with infinite height/width.
          // It's also essential that we don't compare values absolutely to each
          // other but leave a little headroom (EPSILON) to get rid of false
          // positives.
          if (
            horizontal ? rect.left + EPS < layout.width - EPS : rect.top + EPS < layout.height - EPS
          ) {
            nextRects.push(rectId);
          }
        }
      }
    }

    // Sanitize and sort all the new free spaces that will be used in the next
    // iteration. This procedure is critical to make the bin-packing algorithm
    // work. The free spaces have to be in correct order in the beginning of the
    // next iteration.
    if (nextRects.length > 1) {
      this.purgeRects(nextRects).sort(horizontal ? this.sortRectsLeftTop : this.sortRectsTopLeft);
    }

    // Finally we need to make sure that `this.currentRects` points to
    // `nextRects` array as that is used in the next iteration's beginning when
    // we try to find a space for the next slot.
    this.currentRects = nextRects;
    this.nextRects = currentRects;

    return slot;
  };

  /**
   * Add a new rectangle to the rectangle store. Returns the id of the new
   * rectangle.
   *
   * @param {Number} left
   * @param {Number} top
   * @param {Number} width
   * @param {Number} height
   * @returns {Number}
   */
  PackerProcessor.prototype.addRect = function (left, top, width, height) {
    var rectId = ++this.rectId;
    this.rectStore[rectId] = left || 0;
    this.rectStore[++this.rectId] = top || 0;
    this.rectStore[++this.rectId] = width || 0;
    this.rectStore[++this.rectId] = height || 0;
    return rectId;
  };

  /**
   * Get rectangle data from the rectangle store by id. Optionally you can
   * provide a target object where the rectangle data will be written in. By
   * default an internal object is reused as a target object.
   *
   * @param {Number} id
   * @param {Object} [target]
   * @returns {Object}
   */
  PackerProcessor.prototype.getRect = function (id, target) {
    if (!target) target = this.rectTarget;
    target.left = this.rectStore[id] || 0;
    target.top = this.rectStore[++id] || 0;
    target.width = this.rectStore[++id] || 0;
    target.height = this.rectStore[++id] || 0;
    return target;
  };

  /**
   * Punch a hole into a rectangle and return the shards (1-4).
   *
   * @param {Object} rect
   * @param {Object} hole
   * @returns {Number[]}
   */
  PackerProcessor.prototype.splitRect = (function () {
    var shards = [];
    var width = 0;
    var height = 0;
    return function (rect, hole) {
      // Reset old shards.
      shards.length = 0;

      // If the slot does not overlap with the hole add slot to the return data
      // as is. Note that in this case we are eager to keep the slot as is if
      // possible so we use the EPSILON in favour of that logic.
      if (
        rect.left + rect.width <= hole.left + EPS ||
        hole.left + hole.width <= rect.left + EPS ||
        rect.top + rect.height <= hole.top + EPS ||
        hole.top + hole.height <= rect.top + EPS
      ) {
        shards.push(this.addRect(rect.left, rect.top, rect.width, rect.height));
        return shards;
      }

      // Left split.
      width = hole.left - rect.left;
      if (width >= MIN_SLOT_SIZE) {
        shards.push(this.addRect(rect.left, rect.top, width, rect.height));
      }

      // Right split.
      width = rect.left + rect.width - (hole.left + hole.width);
      if (width >= MIN_SLOT_SIZE) {
        shards.push(this.addRect(hole.left + hole.width, rect.top, width, rect.height));
      }

      // Top split.
      height = hole.top - rect.top;
      if (height >= MIN_SLOT_SIZE) {
        shards.push(this.addRect(rect.left, rect.top, rect.width, height));
      }

      // Bottom split.
      height = rect.top + rect.height - (hole.top + hole.height);
      if (height >= MIN_SLOT_SIZE) {
        shards.push(this.addRect(rect.left, hole.top + hole.height, rect.width, height));
      }

      return shards;
    };
  })();

  /**
   * Check if a rectangle is fully within another rectangle.
   *
   * @param {Object} a
   * @param {Object} b
   * @returns {Boolean}
   */
  PackerProcessor.prototype.isRectAWithinRectB = function (a, b) {
    return (
      a.left + EPS >= b.left &&
      a.top + EPS >= b.top &&
      a.left + a.width - EPS <= b.left + b.width &&
      a.top + a.height - EPS <= b.top + b.height
    );
  };

  /**
   * Loops through an array of rectangle ids and resets all that are fully
   * within another rectangle in the array. Resetting in this case means that
   * the rectangle id value is replaced with zero.
   *
   * @param {Number[]} rectIds
   * @returns {Number[]}
   */
  PackerProcessor.prototype.purgeRects = (function () {
    var rectA = {};
    var rectB = {};
    return function (rectIds) {
      var i = rectIds.length;
      var j;

      while (i--) {
        j = rectIds.length;
        if (!rectIds[i]) continue;
        this.getRect(rectIds[i], rectA);
        while (j--) {
          if (!rectIds[j] || i === j) continue;
          this.getRect(rectIds[j], rectB);
          if (this.isRectAWithinRectB(rectA, rectB)) {
            rectIds[i] = 0;
            break;
          }
        }
      }

      return rectIds;
    };
  })();

  /**
   * Sort rectangles with top-left gravity.
   *
   * @param {Number} aId
   * @param {Number} bId
   * @returns {Number}
   */
  PackerProcessor.prototype.sortRectsTopLeft = (function () {
    var rectA = {};
    var rectB = {};
    return function (aId, bId) {
      this.getRect(aId, rectA);
      this.getRect(bId, rectB);

      return rectA.top < rectB.top && rectA.top + EPS < rectB.top
        ? -1
        : rectA.top > rectB.top && rectA.top - EPS > rectB.top
        ? 1
        : rectA.left < rectB.left && rectA.left + EPS < rectB.left
        ? -1
        : rectA.left > rectB.left && rectA.left - EPS > rectB.left
        ? 1
        : 0;
    };
  })();

  /**
   * Sort rectangles with left-top gravity.
   *
   * @param {Number} aId
   * @param {Number} bId
   * @returns {Number}
   */
  PackerProcessor.prototype.sortRectsLeftTop = (function () {
    var rectA = {};
    var rectB = {};
    return function (aId, bId) {
      this.getRect(aId, rectA);
      this.getRect(bId, rectB);
      return rectA.left < rectB.left && rectA.left + EPS < rectB.left
        ? -1
        : rectA.left > rectB.left && rectA.left - EPS < rectB.left
        ? 1
        : rectA.top < rectB.top && rectA.top + EPS < rectB.top
        ? -1
        : rectA.top > rectB.top && rectA.top - EPS > rectB.top
        ? 1
        : 0;
    };
  })();

  if (isWorker) {
    var PACKET_INDEX_WIDTH = 1;
    var PACKET_INDEX_HEIGHT = 2;
    var PACKET_INDEX_OPTIONS = 3;
    var PACKET_HEADER_SLOTS = 4;
    var processor = new PackerProcessor();

    self.onmessage = function (msg) {
      var data = new Float32Array(msg.data);
      var items = data.subarray(PACKET_HEADER_SLOTS, data.length);
      var slots = new Float32Array(items.length);
      var settings = data[PACKET_INDEX_OPTIONS];
      var layout = {
        items: items,
        slots: slots,
        width: data[PACKET_INDEX_WIDTH],
        height: data[PACKET_INDEX_HEIGHT],
      };

      // Compute the layout (width / height / slots).
      processor.computeLayout(layout, settings);

      // Copy layout data to the return data.
      data[PACKET_INDEX_WIDTH] = layout.width;
      data[PACKET_INDEX_HEIGHT] = layout.height;
      data.set(layout.slots, PACKET_HEADER_SLOTS);

      // Send layout back to the main thread.
      postMessage(data.buffer, [data.buffer]);
    };
  }

  return PackerProcessor;
}

var PackerProcessor = createPackerProcessor();
export default PackerProcessor;

//
// WORKER UTILS
//

var blobUrl = null;
var activeWorkers = [];

export function createWorkerProcessors(amount, onmessage) {
  var workers = [];

  if (amount > 0) {
    if (!blobUrl) {
      blobUrl = URL.createObjectURL(
        new Blob(['(' + createPackerProcessor.toString() + ')(true)'], {
          type: 'application/javascript',
        })
      );
    }

    for (var i = 0, worker; i < amount; i++) {
      worker = new Worker(blobUrl);
      if (onmessage) worker.onmessage = onmessage;
      workers.push(worker);
      activeWorkers.push(worker);
    }
  }

  return workers;
}

export function destroyWorkerProcessors(workers) {
  var worker;
  var index;

  for (var i = 0; i < workers.length; i++) {
    worker = workers[i];
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();

    index = activeWorkers.indexOf(worker);
    if (index > -1) activeWorkers.splice(index, 1);
  }

  if (blobUrl && !activeWorkers.length) {
    URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  }
}

export function isWorkerProcessorsSupported() {
  return !!(window.Worker && window.URL && window.Blob);
}
