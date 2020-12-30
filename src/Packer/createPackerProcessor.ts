/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

import { Rect } from '../types';
import {
  PackerLayoutData,
  PackerLayoutItem,
  PackerLayoutPacket,
  PackerLayoutSettingsMasks,
} from './Packer';

interface PackerProcessorLayoutData extends Pick<PackerLayoutData, 'width' | 'height' | 'slots'> {
  items: Float32Array | PackerLayoutItem[];
}

type PackerRectId = number;

type PackerLayoutSettings = number;

interface PackerProcessor {
  computeLayout(
    layout: PackerProcessorLayoutData,
    settings: PackerLayoutSettings
  ): PackerProcessorLayoutData;
}

export default function createPackerProcessor(isWorker = false): PackerProcessor {
  const SETTINGS: PackerLayoutSettingsMasks = {
    fillGaps: 1,
    horizontal: 2,
    alignRight: 4,
    alignBottom: 8,
    rounding: 16,
  };
  const EPS = 0.001;
  const MIN_SLOT_SIZE = 0.5;

  // Rounds number first to three decimal precision and then floors the result
  // to two decimal precision.
  // Math.floor(Math.round(number * 1000) / 10) / 100
  function roundNumber(number: number) {
    return ((((number * 1000 + 0.5) << 0) / 10) << 0) / 100;
  }

  class PrivatePackerProcessor implements PackerProcessor {
    protected _currentRects: PackerRectId[];
    protected _nextRects: PackerRectId[];
    protected _rectStore: number[];
    protected _slotSizes: number[];
    protected _shards: PackerRectId[];
    protected _rectTarget: Rect;
    protected _tempRectA: Rect;
    protected _tempRectB: Rect;
    protected _rectId: PackerRectId;
    protected _slotIndex: number;
    protected _slot: Rect;

    constructor() {
      this._currentRects = [];
      this._nextRects = [];
      this._rectStore = [];
      this._slotSizes = [];
      this._shards = [];
      this._rectTarget = { left: 0, top: 0, width: 0, height: 0 };
      this._tempRectA = { left: 0, top: 0, width: 0, height: 0 };
      this._tempRectB = { left: 0, top: 0, width: 0, height: 0 };
      this._rectId = 0;
      this._slotIndex = -1;
      this._slot = { left: 0, top: 0, width: 0, height: 0 };
      this._sortRectsLeftTop = this._sortRectsLeftTop.bind(this);
      this._sortRectsTopLeft = this._sortRectsTopLeft.bind(this);
    }

    /**
     * Takes a layout object as an argument and computes positions (slots) for
     * the layout items. Also computes the final width and height of the layout.
     * The provided layout object's slots array is mutated as well as the width
     * and height properties.
     */
    computeLayout(layout: PackerProcessorLayoutData, settings: PackerLayoutSettings) {
      const items = layout.items;
      if (!items.length) return layout;

      const slots = layout.slots;
      const fillGaps = !!(settings & SETTINGS.fillGaps);
      const horizontal = !!(settings & SETTINGS.horizontal);
      const alignRight = !!(settings & SETTINGS.alignRight);
      const alignBottom = !!(settings & SETTINGS.alignBottom);
      const rounding = !!(settings & SETTINGS.rounding);
      const isPreProcessed = typeof items[0] === 'number';
      const bump = isPreProcessed ? 2 : 1;

      let i = 0;
      let slotWidth = 0;
      let slotHeight = 0;
      let slot: Rect;
      let item: PackerLayoutItem;

      // Compute slots for the items.
      for (i = 0; i < items.length; i += bump) {
        // If items are pre-processed it means that items array contains only
        // the raw dimensions of the items. Otherwise we assume it is an array
        // of normal Muuri items.
        if (isPreProcessed) {
          slotWidth = items[i] as number;
          slotHeight = items[i + 1] as number;
        } else {
          item = items[i] as PackerLayoutItem;
          slotWidth = item.width + (item.marginLeft || 0) + (item.marginRight || 0);
          slotHeight = item.height + (item.marginTop || 0) + (item.marginBottom || 0);
        }

        // If rounding is enabled let's round the item's width and height to
        // make the layout algorithm a bit more stable. This has a performance
        // cost so don't use this if not necessary.
        if (rounding) {
          slotWidth = roundNumber(slotWidth);
          slotHeight = roundNumber(slotHeight);
        }

        // Get slot data.
        slot = this._computeNextSlot(layout, slotWidth, slotHeight, fillGaps, horizontal);

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
        slots[++this._slotIndex] = slot.left;
        slots[++this._slotIndex] = slot.top;

        // Store the size too (for later usage) if needed.
        if (alignRight || alignBottom) {
          this._slotSizes.push(slot.width, slot.height);
        }
      }

      // If the alignment is set to right we need to adjust the results.
      if (alignRight) {
        for (i = 0; i < slots.length; i += 2) {
          slots[i] = layout.width - (slots[i] + this._slotSizes[i]);
        }
      }

      // If the alignment is set to bottom we need to adjust the results.
      if (alignBottom) {
        for (i = 1; i < slots.length; i += 2) {
          slots[i] = layout.height - (slots[i] + this._slotSizes[i]);
        }
      }

      // Reset stuff.
      this._slotSizes.length = 0;
      this._currentRects.length = 0;
      this._nextRects.length = 0;
      this._shards.length = 0;
      this._rectId = 0;
      this._slotIndex = -1;

      return layout;
    }

    /**
     * Calculate next slot in the layout. Returns a slot object with position
     * and dimensions data. The returned object is reused between calls.
     */
    protected _computeNextSlot(
      layout: PackerProcessorLayoutData,
      slotWidth: number,
      slotHeight: number,
      fillGaps: boolean,
      horizontal: boolean
    ) {
      const { _slot: slot, _currentRects: currentRects, _nextRects: nextRects } = this;
      let ignoreCurrentRects = false;
      let foundInitialSlot = false;
      let rect: Rect;
      let rectId: number;
      let i = 0;
      let j = 0;

      // Reset new slots.
      nextRects.length = 0;

      // Set item slot initial data.
      slot.left = 0;
      slot.top = 0;
      slot.width = slotWidth;
      slot.height = slotHeight;

      // Try to find position for the slot from the existing free spaces in the
      // layout.
      for (i = 0; i < currentRects.length; i++) {
        rectId = currentRects[i];
        if (!rectId) continue;
        rect = this._getRect(rectId);
        if (slot.width <= rect.width + EPS && slot.height <= rect.height + EPS) {
          foundInitialSlot = true;
          slot.left = rect.left;
          slot.top = rect.top;
          break;
        }
      }

      // If no position was found for the slot let's position the slot to
      // the bottom left (in vertical mode) or top right (in horizontal mode) of
      // the layout.
      if (!foundInitialSlot) {
        if (horizontal) {
          slot.left = layout.width;
          slot.top = 0;
        } else {
          slot.left = 0;
          slot.top = layout.height;
        }

        // If gaps don't need filling let's throw away all the current free
        // spaces (currentRects).
        if (!fillGaps) {
          ignoreCurrentRects = true;
        }
      }

      // In vertical mode, if the slot's bottom overlaps the layout's bottom.
      if (!horizontal && slot.top + slot.height > layout.height + EPS) {
        // If slot is not aligned to the left edge, create a new free space to
        // the left of the slot.
        if (slot.left > MIN_SLOT_SIZE) {
          nextRects.push(this._addRect(0, layout.height, slot.left, Infinity));
        }

        // If slot is not aligned to the right edge, create a new free space to
        // the right of the slot.
        if (slot.left + slot.width < layout.width - MIN_SLOT_SIZE) {
          nextRects.push(
            this._addRect(
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

      // In horizontal mode, if the slot's right overlaps the layout's right
      // edge.
      if (horizontal && slot.left + slot.width > layout.width + EPS) {
        // If slot is not aligned to the top, create a new free space above the
        // slot.
        if (slot.top > MIN_SLOT_SIZE) {
          nextRects.push(this._addRect(layout.width, 0, Infinity, slot.top));
        }

        // If slot is not aligned to the bottom, create a new free space below
        // the slot.
        if (slot.top + slot.height < layout.height - MIN_SLOT_SIZE) {
          nextRects.push(
            this._addRect(
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
          rect = this._getRect(rectId);
          const shards = this._splitRect(rect, slot);
          for (j = 0; j < shards.length; j++) {
            rectId = shards[j];
            rect = this._getRect(rectId);
            // Make sure that the free space is within the boundaries of the
            // layout. This routine is critical to the algorithm as it makes
            // sure that there are no leftover spaces with infinite
            // height/width. It's also essential that we don't compare values
            // absolutely to each other but leave a little headroom (EPSILON) to
            // get rid of false positives.
            if (
              horizontal
                ? rect.left + EPS < layout.width - EPS
                : rect.top + EPS < layout.height - EPS
            ) {
              nextRects.push(rectId);
            }
          }
        }
      }

      // Sanitize and sort all the new free spaces that will be used in the next
      // iteration. This procedure is critical to make the bin-packing algorithm
      // work. The free spaces have to be in correct order in the beginning of
      // the next iteration.
      if (nextRects.length > 1) {
        this._purgeRects(nextRects).sort(
          horizontal ? this._sortRectsLeftTop : this._sortRectsTopLeft
        );
      }

      // Finally we need to make sure that `this.currentRects` points to
      // `nextRects` array as that is used in the next iteration's beginning
      // when we try to find a space for the next slot.
      this._currentRects = nextRects;
      this._nextRects = currentRects;

      return slot;
    }

    /**
     * Add a new rectangle to the rectangle store. Returns the id of the new
     * rectangle.
     */
    protected _addRect(left: number, top: number, width: number, height: number) {
      const rectId = ++this._rectId;
      this._rectStore[rectId] = left || 0;
      this._rectStore[++this._rectId] = top || 0;
      this._rectStore[++this._rectId] = width || 0;
      this._rectStore[++this._rectId] = height || 0;
      return rectId;
    }

    /**
     * Get rectangle data from the rectangle store by id. Optionally you can
     * provide a target object where the rectangle data will be written in. By
     * default an internal object is reused as a target object.
     */
    protected _getRect(id: PackerRectId, target?: Rect) {
      target = target || this._rectTarget;
      target.left = this._rectStore[id] || 0;
      target.top = this._rectStore[++id] || 0;
      target.width = this._rectStore[++id] || 0;
      target.height = this._rectStore[++id] || 0;
      return target;
    }

    /**
     * Punch a hole into a rectangle and return the shards (1-4).
     */
    protected _splitRect(rect: Rect, hole: Rect): PackerRectId[] {
      const { _shards: shards } = this;
      let width = 0;
      let height = 0;

      // Reset shards.
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
        shards.push(this._addRect(rect.left, rect.top, rect.width, rect.height));
        return shards;
      }

      // Left split.
      width = hole.left - rect.left;
      if (width >= MIN_SLOT_SIZE) {
        shards.push(this._addRect(rect.left, rect.top, width, rect.height));
      }

      // Right split.
      width = rect.left + rect.width - (hole.left + hole.width);
      if (width >= MIN_SLOT_SIZE) {
        shards.push(this._addRect(hole.left + hole.width, rect.top, width, rect.height));
      }

      // Top split.
      height = hole.top - rect.top;
      if (height >= MIN_SLOT_SIZE) {
        shards.push(this._addRect(rect.left, rect.top, rect.width, height));
      }

      // Bottom split.
      height = rect.top + rect.height - (hole.top + hole.height);
      if (height >= MIN_SLOT_SIZE) {
        shards.push(this._addRect(rect.left, hole.top + hole.height, rect.width, height));
      }

      return shards;
    }

    /**
     * Check if a rectangle is fully within another rectangle.
     */
    protected _isRectAWithinRectB(a: Rect, b: Rect) {
      return (
        a.left + EPS >= b.left &&
        a.top + EPS >= b.top &&
        a.left + a.width - EPS <= b.left + b.width &&
        a.top + a.height - EPS <= b.top + b.height
      );
    }

    /**
     * Loops through an array of rectangle ids and resets all that are fully
     * within another rectangle in the array. Resetting in this case means that
     * the rectangle id value is replaced with zero.
     */
    protected _purgeRects(rectIds: number[]) {
      const { _tempRectA: a, _tempRectB: b } = this;
      let i = rectIds.length;
      let j = 0;

      while (i--) {
        j = rectIds.length;
        if (!rectIds[i]) continue;
        this._getRect(rectIds[i], a);
        while (j--) {
          if (!rectIds[j] || i === j) continue;
          this._getRect(rectIds[j], b);
          if (this._isRectAWithinRectB(a, b)) {
            rectIds[i] = 0;
            break;
          }
        }
      }

      return rectIds;
    }

    /**
     * Sort rectangles with top-left gravity.
     */
    protected _sortRectsTopLeft(aId: number, bId: number) {
      const { _tempRectA: a, _tempRectB: b } = this;
      this._getRect(aId, a);
      this._getRect(bId, b);
      return a.top < b.top && a.top + EPS < b.top
        ? -1
        : a.top > b.top && a.top - EPS > b.top
        ? 1
        : a.left < b.left && a.left + EPS < b.left
        ? -1
        : a.left > b.left && a.left - EPS > b.left
        ? 1
        : 0;
    }

    /**
     * Sort rectangles with left-top gravity.
     */
    protected _sortRectsLeftTop(aId: number, bId: number) {
      const { _tempRectA: a, _tempRectB: b } = this;
      this._getRect(aId, a);
      this._getRect(bId, b);
      return a.left < b.left && a.left + EPS < b.left
        ? -1
        : a.left > b.left && a.left - EPS < b.left
        ? 1
        : a.top < b.top && a.top + EPS < b.top
        ? -1
        : a.top > b.top && a.top - EPS > b.top
        ? 1
        : 0;
    }
  }

  const processor = new PrivatePackerProcessor();

  if (isWorker) {
    const workerScope = self as DedicatedWorkerGlobalScope;
    const PACKET_INDEX_WIDTH: PackerLayoutPacket['width'] = 1;
    const PACKET_INDEX_HEIGHT: PackerLayoutPacket['height'] = 2;
    const PACKET_INDEX_SETTINGS: PackerLayoutPacket['settings'] = 3;
    const PACKET_HEADER_SLOTS: PackerLayoutPacket['slots'] = 4;

    workerScope.onmessage = function (msg: { data: Float32Array }) {
      const data = new Float32Array(msg.data);
      const items = data.subarray(PACKET_HEADER_SLOTS, data.length);
      const slots = new Float32Array(items.length);
      const settings: PackerLayoutSettings = data[PACKET_INDEX_SETTINGS];
      const layout: PackerProcessorLayoutData = {
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
      workerScope.postMessage(data.buffer, [data.buffer]);
    };
  }

  return processor;
}
