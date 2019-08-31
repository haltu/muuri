/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

/**
 * This is the default layout algorithm for Muuri. Based on MAXRECTS approach
 * as described by Jukka Jylänki in his survey: "A Thousand Ways to Pack the
 * Bin - A Practical Approach to Two-Dimensional Rectangle Bin Packing.".
 *
 * @class
 * @param {Object} [options]
 * @param {Boolean} [options.fillGaps=false]
 * @param {Boolean} [options.horizontal=false]
 * @param {Boolean} [options.alignRight=false]
 * @param {Boolean} [options.alignBottom=false]
 * @param {Boolean} [options.rounding=false]
 */
function Packer(options) {
  this._slotSizes = [];
  this._freeSlots = [];
  this._newSlots = [];
  this._rectItem = {};
  this._rectStore = [];
  this._rectId = 0;
  this._sortRectsLeftTop = this._sortRectsLeftTop.bind(this);
  this._sortRectsTopLeft = this._sortRectsTopLeft.bind(this);
  this.setOptions(options);
}

/**
 * @public
 * @memberof Packer.prototype
 * @param {Object} [options]
 * @param {Boolean} [options.fillGaps=false]
 * @param {Boolean} [options.horizontal=false]
 * @param {Boolean} [options.alignRight=false]
 * @param {Boolean} [options.alignBottom=false]
 * @param {Boolean} [options.rounding=false]
 * @returns {Packer}
 */
Packer.prototype.setOptions = function(options) {
  this._fillGaps = !!(options && options.fillGaps);
  this._isHorizontal = !!(options && options.horizontal);
  this._alignRight = !!(options && options.alignRight);
  this._alignBottom = !!(options && options.alignBottom);
  this._rounding = !!(options && options.rounding);
  return this;
};

/**
 * @public
 * @memberof Packer.prototype
 * @param {Item[]} items
 * @param {Number} width
 * @param {Number} height
 * @returns {Object}
 */
Packer.prototype.getLayout = function(items, width, height) {
  var layout = {
    slots: [],
    width: this._isHorizontal ? 0 : this._rounding ? Math.round(width) : width,
    height: !this._isHorizontal ? 0 : this._rounding ? Math.round(height) : height,
    setWidth: this._isHorizontal,
    setHeight: !this._isHorizontal
  };
  var i;

  // No need to go further if items do not exist.
  if (!items.length) return layout;

  // Find slots for items.
  for (i = 0; i < items.length; i++) {
    this._addSlot(layout, items[i]);
  }

  // If the alignment is set to right we need to adjust the results.
  if (this._alignRight) {
    for (i = 0; i < layout.slots.length; i = i + 2) {
      layout.slots[i] = layout.width - (layout.slots[i] + this._slotSizes[i]);
    }
  }

  // If the alignment is set to bottom we need to adjust the results.
  if (this._alignBottom) {
    for (i = 1; i < layout.slots.length; i = i + 2) {
      layout.slots[i] = layout.height - (layout.slots[i] + this._slotSizes[i]);
    }
  }

  // Reset slots arrays and rect id.
  this._slotSizes.length = 0;
  this._freeSlots.length = 0;
  this._newSlots.length = 0;
  this._rectId = 0;

  return layout;
};

/**
 * Calculate position for the layout item. Returns the left and top position
 * of the item in pixels.
 *
 * @private
 * @memberof Packer.prototype
 * @param {Object} layout
 * @param {Item} item
 * @returns {Array}
 */
Packer.prototype._addSlot = (function() {
  var eps = 0.001;
  var slot = {};
  return function(layout, item) {
    var isHorizontal = this._isHorizontal;
    var fillGaps = this._fillGaps;
    var freeSlots = this._freeSlots;
    var newSlots = this._newSlots;
    var rect;
    var rectId;
    var potentialSlots;
    var ignoreCurrentSlots;
    var i;
    var j;

    // Reset new slots.
    newSlots.length = 0;

    // Set item slot initial data.
    slot.left = null;
    slot.top = null;
    slot.width = item._width + item._marginLeft + item._marginRight;
    slot.height = item._height + item._marginTop + item._marginBottom;

    // Round item slot width and height if needed.
    if (this._rounding) {
      slot.width = Math.round(slot.width);
      slot.height = Math.round(slot.height);
    }

    // Try to find a slot for the item.
    for (i = 0; i < freeSlots.length; i++) {
      rectId = freeSlots[i];
      if (!rectId) continue;
      rect = this._getRect(rectId);
      if (slot.width <= rect.width + eps && slot.height <= rect.height + eps) {
        slot.left = rect.left;
        slot.top = rect.top;
        break;
      }
    }

    // If no slot was found for the item.
    if (slot.left === null) {
      // Position the item in to the bottom left (vertical mode) or top right
      // (horizontal mode) of the grid.
      slot.left = !isHorizontal ? 0 : layout.width;
      slot.top = !isHorizontal ? layout.height : 0;

      // If gaps don't need filling do not add any current slots to the new
      // slots array.
      if (!fillGaps) {
        ignoreCurrentSlots = true;
      }
    }

    // In vertical mode, if the item's bottom overlaps the grid's bottom.
    if (!isHorizontal && slot.top + slot.height > layout.height) {
      // If item is not aligned to the left edge, create a new slot.
      if (slot.left > 0) {
        newSlots.push(this._addRect(0, layout.height, slot.left, Infinity));
      }

      // If item is not aligned to the right edge, create a new slot.
      if (slot.left + slot.width < layout.width) {
        newSlots.push(
          this._addRect(
            slot.left + slot.width,
            layout.height,
            layout.width - slot.left - slot.width,
            Infinity
          )
        );
      }

      // Update grid height.
      layout.height = slot.top + slot.height;
    }

    // In horizontal mode, if the item's right overlaps the grid's right edge.
    if (isHorizontal && slot.left + slot.width > layout.width) {
      // If item is not aligned to the top, create a new slot.
      if (slot.top > 0) {
        newSlots.push(this._addRect(layout.width, 0, Infinity, slot.top));
      }

      // If item is not aligned to the bottom, create a new slot.
      if (slot.top + slot.height < layout.height) {
        newSlots.push(
          this._addRect(
            layout.width,
            slot.top + slot.height,
            Infinity,
            layout.height - slot.top - slot.height
          )
        );
      }

      // Update grid width.
      layout.width = slot.left + slot.width;
    }

    // Clean up the current slots making sure there are no old slots that
    // overlap with the item. If an old slot overlaps with the item, split it
    // into smaller slots if necessary.
    for (i = fillGaps ? 0 : ignoreCurrentSlots ? freeSlots.length : i; i < freeSlots.length; i++) {
      rectId = freeSlots[i];
      if (!rectId) continue;
      rect = this._getRect(rectId);
      potentialSlots = this._splitRect(rect, slot);
      for (j = 0; j < potentialSlots.length; j++) {
        rectId = potentialSlots[j];
        rect = this._getRect(rectId);
        // Let's make sure here that we have a big enough slot
        // (width/height > 0.49px) and also let's make sure that the slot is
        // within the boundaries of the grid.
        if (
          rect.width > 0.49 &&
          rect.height > 0.49 &&
          ((!isHorizontal && rect.top < layout.height) ||
            (isHorizontal && rect.left < layout.width))
        ) {
          newSlots.push(rectId);
        }
      }
    }

    // Sanitize new slots.
    if (newSlots.length) {
      this._purgeRects(newSlots).sort(
        isHorizontal ? this._sortRectsLeftTop : this._sortRectsTopLeft
      );
    }

    // Update layout width/height.
    if (isHorizontal) {
      layout.width = Math.max(layout.width, slot.left + slot.width);
    } else {
      layout.height = Math.max(layout.height, slot.top + slot.height);
    }

    // Add item slot data to layout slots (and store the slot size for later
    // usage too if necessary).
    layout.slots.push(slot.left, slot.top);
    if (this._alignRight || this._alignBottom) {
      this._slotSizes.push(slot.width, slot.height);
    }

    // Free/new slots switcheroo!
    this._freeSlots = newSlots;
    this._newSlots = freeSlots;
  };
})();

/**
 * Add a new rectangle to the rectangle store. Returns the id of the new
 * rectangle.
 *
 * @private
 * @memberof Packer.prototype
 * @param {Number} left
 * @param {Number} top
 * @param {Number} width
 * @param {Number} height
 * @returns {RectId}
 */
Packer.prototype._addRect = function(left, top, width, height) {
  var rectId = ++this._rectId;
  var rectStore = this._rectStore;

  rectStore[rectId] = left || 0;
  rectStore[++this._rectId] = top || 0;
  rectStore[++this._rectId] = width || 0;
  rectStore[++this._rectId] = height || 0;

  return rectId;
};

/**
 * Get rectangle data from the rectangle store by id. Optionally you can
 * provide a target object where the rectangle data will be written in. By
 * default an internal object is reused as a target object.
 *
 * @private
 * @memberof Packer.prototype
 * @param {RectId} id
 * @param {Object} [target]
 * @returns {Object}
 */
Packer.prototype._getRect = function(id, target) {
  var rectItem = target ? target : this._rectItem;
  var rectStore = this._rectStore;

  rectItem.left = rectStore[id] || 0;
  rectItem.top = rectStore[++id] || 0;
  rectItem.width = rectStore[++id] || 0;
  rectItem.height = rectStore[++id] || 0;

  return rectItem;
};

/**
 * Punch a hole into a rectangle and split the remaining area into smaller
 * rectangles (4 at max).
 *
 * @private
 * @memberof Packer.prototype
 * @param {Rectangle} rect
 * @param {Rectangle} hole
 * @returns {RectId[]}
 */
Packer.prototype._splitRect = (function() {
  var results = [];
  return function(rect, hole) {
    // Reset old results.
    results.length = 0;

    // If the rect does not overlap with the hole add rect to the return data
    // as is.
    if (!this._doRectsOverlap(rect, hole)) {
      results.push(this._addRect(rect.left, rect.top, rect.width, rect.height));
      return results;
    }

    // Left split.
    if (rect.left < hole.left) {
      results.push(this._addRect(rect.left, rect.top, hole.left - rect.left, rect.height));
    }

    // Right split.
    if (rect.left + rect.width > hole.left + hole.width) {
      results.push(
        this._addRect(
          hole.left + hole.width,
          rect.top,
          rect.left + rect.width - (hole.left + hole.width),
          rect.height
        )
      );
    }

    // Top split.
    if (rect.top < hole.top) {
      results.push(this._addRect(rect.left, rect.top, rect.width, hole.top - rect.top));
    }

    // Bottom split.
    if (rect.top + rect.height > hole.top + hole.height) {
      results.push(
        this._addRect(
          rect.left,
          hole.top + hole.height,
          rect.width,
          rect.top + rect.height - (hole.top + hole.height)
        )
      );
    }

    return results;
  };
})();

/**
 * Check if two rectangles overlap.
 *
 * @private
 * @memberof Packer.prototype
 * @param {Rectangle} a
 * @param {Rectangle} b
 * @returns {Boolean}
 */
Packer.prototype._doRectsOverlap = function(a, b) {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
};

/**
 * Check if a rectangle is fully within another rectangle.
 *
 * @private
 * @memberof Packer.prototype
 * @param {Rectangle} a
 * @param {Rectangle} b
 * @returns {Boolean}
 */
Packer.prototype._isRectWithinRect = function(a, b) {
  return (
    a.left >= b.left &&
    a.top >= b.top &&
    a.left + a.width <= b.left + b.width &&
    a.top + a.height <= b.top + b.height
  );
};

/**
 * Loops through an array of rectangle ids and resets all that are fully
 * within another rectangle in the array. Resetting in this case means that
 * the rectangle id value is replaced with zero.
 *
 * @private
 * @memberof Packer.prototype
 * @param {RectId[]} rectIds
 * @returns {RectId[]}
 */
Packer.prototype._purgeRects = (function() {
  var rectA = {};
  var rectB = {};
  return function(rectIds) {
    var i = rectIds.length;
    var j;

    while (i--) {
      j = rectIds.length;
      if (!rectIds[i]) continue;
      this._getRect(rectIds[i], rectA);
      while (j--) {
        if (!rectIds[j] || i === j) continue;
        if (this._isRectWithinRect(rectA, this._getRect(rectIds[j], rectB))) {
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
 * @private
 * @memberof Packer.prototype
 * @param {RectId} aId
 * @param {RectId} bId
 * @returns {Number}
 */
Packer.prototype._sortRectsTopLeft = (function() {
  var rectA = {};
  var rectB = {};
  return function(aId, bId) {
    this._getRect(aId, rectA);
    this._getRect(bId, rectB);
    // prettier-ignore
    return rectA.top < rectB.top ? -1 :
           rectA.top > rectB.top ? 1 :
           rectA.left < rectB.left ? -1 :
           rectA.left > rectB.left ? 1 : 0;
  };
})();

/**
 * Sort rectangles with left-top gravity.
 *
 * @private
 * @memberof Packer.prototype
 * @param {RectId} aId
 * @param {RectId} bId
 * @returns {Number}
 */
Packer.prototype._sortRectsLeftTop = (function() {
  var rectA = {};
  var rectB = {};
  return function(aId, bId) {
    this._getRect(aId, rectA);
    this._getRect(bId, rectB);
    // prettier-ignore
    return rectA.left < rectB.left ? -1 :
           rectA.left > rectB.left ? 1 :
           rectA.top < rectB.top ? -1 :
           rectA.top > rectB.top ? 1 : 0;
  };
})();

export default Packer;
