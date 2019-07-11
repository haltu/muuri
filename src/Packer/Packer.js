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
 */
function Packer() {
  this._slots = [];
  this._slotSizes = [];
  this._freeSlots = [];
  this._newSlots = [];
  this._rectItem = {};
  this._rectStore = [];
  this._rectId = 0;

  // The layout return data, which will be populated in getLayout.
  this._layout = {
    slots: null,
    setWidth: false,
    setHeight: false,
    width: false,
    height: false
  };

  // Bind sort handlers.
  this._sortRectsLeftTop = this._sortRectsLeftTop.bind(this);
  this._sortRectsTopLeft = this._sortRectsTopLeft.bind(this);
}

/**
 * @public
 * @memberof Packer.prototype
 * @param {Item[]} items
 * @param {Number} width
 * @param {Number} height
 * @param {Number[]} [slots]
 * @param {Object} [options]
 * @param {Boolean} [options.fillGaps=false]
 * @param {Boolean} [options.horizontal=false]
 * @param {Boolean} [options.alignRight=false]
 * @param {Boolean} [options.alignBottom=false]
 * @returns {LayoutData}
 */
Packer.prototype.getLayout = function(items, width, height, slots, options) {
  var layout = this._layout;
  var fillGaps = !!(options && options.fillGaps);
  var isHorizontal = !!(options && options.horizontal);
  var alignRight = !!(options && options.alignRight);
  var alignBottom = !!(options && options.alignBottom);
  var rounding = !!(options && options.rounding);
  var slotSizes = this._slotSizes;
  var i;

  // Reset layout data.
  layout.slots = slots ? slots : this._slots;
  layout.width = isHorizontal ? 0 : rounding ? Math.round(width) : width;
  layout.height = !isHorizontal ? 0 : rounding ? Math.round(height) : height;
  layout.setWidth = isHorizontal;
  layout.setHeight = !isHorizontal;

  // Make sure slots and slot size arrays are reset.
  layout.slots.length = 0;
  slotSizes.length = 0;

  // No need to go further if items do not exist.
  if (!items.length) return layout;

  // Find slots for items.
  for (i = 0; i < items.length; i++) {
    this._addSlot(items[i], isHorizontal, fillGaps, rounding, alignRight || alignBottom);
  }

  // If the alignment is set to right we need to adjust the results.
  if (alignRight) {
    for (i = 0; i < layout.slots.length; i = i + 2) {
      layout.slots[i] = layout.width - (layout.slots[i] + slotSizes[i]);
    }
  }

  // If the alignment is set to bottom we need to adjust the results.
  if (alignBottom) {
    for (i = 1; i < layout.slots.length; i = i + 2) {
      layout.slots[i] = layout.height - (layout.slots[i] + slotSizes[i]);
    }
  }

  // Reset slots arrays and rect id.
  slotSizes.length = 0;
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
 * @param {Item} item
 * @param {Boolean} isHorizontal
 * @param {Boolean} fillGaps
 * @param {Boolean} rounding
 * @returns {Array}
 */
Packer.prototype._addSlot = (function() {
  var eps = 0.001;
  var itemSlot = {};
  return function(item, isHorizontal, fillGaps, rounding, trackSize) {
    var layout = this._layout;
    var freeSlots = this._freeSlots;
    var newSlots = this._newSlots;
    var rect;
    var rectId;
    var potentialSlots;
    var ignoreCurrentSlots;
    var i;
    var ii;

    // Reset new slots.
    newSlots.length = 0;

    // Set item slot initial data.
    itemSlot.left = null;
    itemSlot.top = null;
    itemSlot.width = item._width + item._marginLeft + item._marginRight;
    itemSlot.height = item._height + item._marginTop + item._marginBottom;

    // Round item slot width and height if needed.
    if (rounding) {
      itemSlot.width = Math.round(itemSlot.width);
      itemSlot.height = Math.round(itemSlot.height);
    }

    // Try to find a slot for the item.
    for (i = 0; i < freeSlots.length; i++) {
      rectId = freeSlots[i];
      if (!rectId) continue;
      rect = this._getRect(rectId);
      if (itemSlot.width <= rect.width + eps && itemSlot.height <= rect.height + eps) {
        itemSlot.left = rect.left;
        itemSlot.top = rect.top;
        break;
      }
    }

    // If no slot was found for the item.
    if (itemSlot.left === null) {
      // Position the item in to the bottom left (vertical mode) or top right
      // (horizontal mode) of the grid.
      itemSlot.left = !isHorizontal ? 0 : layout.width;
      itemSlot.top = !isHorizontal ? layout.height : 0;

      // If gaps don't need filling do not add any current slots to the new
      // slots array.
      if (!fillGaps) {
        ignoreCurrentSlots = true;
      }
    }

    // In vertical mode, if the item's bottom overlaps the grid's bottom.
    if (!isHorizontal && itemSlot.top + itemSlot.height > layout.height) {
      // If item is not aligned to the left edge, create a new slot.
      if (itemSlot.left > 0) {
        newSlots.push(this._addRect(0, layout.height, itemSlot.left, Infinity));
      }

      // If item is not aligned to the right edge, create a new slot.
      if (itemSlot.left + itemSlot.width < layout.width) {
        newSlots.push(
          this._addRect(
            itemSlot.left + itemSlot.width,
            layout.height,
            layout.width - itemSlot.left - itemSlot.width,
            Infinity
          )
        );
      }

      // Update grid height.
      layout.height = itemSlot.top + itemSlot.height;
    }

    // In horizontal mode, if the item's right overlaps the grid's right edge.
    if (isHorizontal && itemSlot.left + itemSlot.width > layout.width) {
      // If item is not aligned to the top, create a new slot.
      if (itemSlot.top > 0) {
        newSlots.push(this._addRect(layout.width, 0, Infinity, itemSlot.top));
      }

      // If item is not aligned to the bottom, create a new slot.
      if (itemSlot.top + itemSlot.height < layout.height) {
        newSlots.push(
          this._addRect(
            layout.width,
            itemSlot.top + itemSlot.height,
            Infinity,
            layout.height - itemSlot.top - itemSlot.height
          )
        );
      }

      // Update grid width.
      layout.width = itemSlot.left + itemSlot.width;
    }

    // Clean up the current slots making sure there are no old slots that
    // overlap with the item. If an old slot overlaps with the item, split it
    // into smaller slots if necessary.
    for (i = fillGaps ? 0 : ignoreCurrentSlots ? freeSlots.length : i; i < freeSlots.length; i++) {
      rectId = freeSlots[i];
      if (!rectId) continue;
      rect = this._getRect(rectId);
      potentialSlots = this._splitRect(rect, itemSlot);
      for (ii = 0; ii < potentialSlots.length; ii++) {
        rectId = potentialSlots[ii];
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
      layout.width = Math.max(layout.width, itemSlot.left + itemSlot.width);
    } else {
      layout.height = Math.max(layout.height, itemSlot.top + itemSlot.height);
    }

    // Add item slot data to layout slots (and store the slot size for later
    // usage too if necessary).
    layout.slots.push(itemSlot.left, itemSlot.top);
    if (trackSize) this._slotSizes.push(itemSlot.width, itemSlot.height);

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
    var ii;

    while (i--) {
      ii = rectIds.length;
      if (!rectIds[i]) continue;
      this._getRect(rectIds[i], rectA);
      while (ii--) {
        if (!rectIds[ii] || i === ii) continue;
        if (this._isRectWithinRect(rectA, this._getRect(rectIds[ii], rectB))) {
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
