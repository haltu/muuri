/*!
 * Muuri v0.2.1-dev
 * https://github.com/haltu/muuri
 * Copyright (c) 2015, Haltu Oy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*
  TODO
  ====
  * drag & drop heuristics, make them good and fast!
    -> When dragging items, don't count margins as part of the item.
    -> When dragging item slowly, don't switch the item back as long as the item
       is dragged towards it's new position.
    -> Allow dropping on empty slots (gaps).
  * "reset" method which safely updates options.
    -> should we have specific disabled/enable drag methods?
    -> should we have specific sort method for sorting the items?
  * "stagger" option to achieve similar animations as shuffle.js
  * Use Mezr v0.5.0 (when ready) instead of "borrowing it's functions".
    -> Reduces a LOT of code and a lot of future unit tests.
*/

(function (global, factory) {

  var libName = 'Muuri';
  var depVelocity = typeof jQuery === 'function' ? jQuery.Velocity : global.Velocity;
  var depHammer = global.Hammer;

  global[libName] = factory(global, depVelocity, depHammer);

}(this, function (global, Velocity, Hammer, undefined) {

  'use strict';

  // Document body needs to be ready for tests.
  if (!document.body) {
    throw Error('Muuri needs access to document.body to work.');
  }

  var uuid = 0;
  var noop = function () {};
  var raf = typeof global.requestAnimationFrame === 'function' ? global.requestAnimationFrame : null;

  // Event names.
  var evRefresh = 'refresh';
  var evSynchronize = 'synchronize';
  var evLayoutStart = 'layoutstart';
  var evLayoutEnd = 'layoutend';
  var evShowStart = 'showstart';
  var evShowEnd = 'showend';
  var evHideStart = 'hidestart';
  var evHideEnd = 'hideend';
  var evMove = 'move';
  var evSwap = 'swap';
  var evAdd = 'add';
  var evRemove = 'remove';
  var evDragStart = 'dragstart';
  var evDragMove = 'dragmove';
  var evDragScroll = 'dragscroll';
  var evDragEnd = 'dragend';
  var evReleaseStart = 'releasestart';
  var evReleaseEnd = 'releaseend';
  var evDestroy = 'destroy';

  // Get the primary supported transform property.
  var supportedTransform = (function () {
    var all = ['transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform'];
    for (var i = 0; i < all.length; i++) {
      if (document.documentElement.style[all[i]] !== undefined) {
        var prop = all[i];
        var prefix = prop.toLowerCase().split('transform')[0];
        return {
          prefix: prefix,
          prop: prop,
          style: prefix ? '-' + prefix + '-transform' : prop
        };
      }
    }
    return null;
  })();

  // Detect if current browser positions fixed elements relative to the nearest
  // ancestor transformed element instead of the window.
  // https://bugs.chromium.org/p/chromium/issues/detail?id=20574
  //
  // Borrowed from Mezr library:
  // https://github.com/niklasramo/mezr/blob/732cb1f5810b948b4fe8ffd85132d29543ece831/mezr.js#L95-L113
  // https://github.com/niklasramo/mezr/blob/732cb1f5810b948b4fe8ffd85132d29543ece831/mezr.js#L247-L300
  var hasBrokenW3CTELCS = (function () {

    // If the browser does not support transforms we can deduct that the
    // W3C TELCS is broken (non-existent).
    if (!supportedTransform) {
      return true;
    }

    var body = document.body;
    var outer = document.createElement('div');
    var inner = document.createElement('div');
    var leftUntransformed;
    var leftTransformed;

    setStyles(outer, {
      display: 'block',
      visibility: 'hidden',
      position: 'absolute',
      width: '1px',
      height: '1px',
      left: '1px',
      top: '0',
      margin: '0'
    });

    setStyles(inner, {
      display: 'block',
      position: 'fixed',
      width: '1px',
      height: '1px',
      left: '0',
      top: '0',
      margin: '0'
    });

    outer.appendChild(inner);
    body.appendChild(outer);
    leftUntransformed = inner.getBoundingClientRect().left;
    outer.style[supportedTransform.prop] = 'translateZ(0)';
    leftTransformed = inner.getBoundingClientRect().left;
    body.removeChild(outer);

    return leftTransformed === leftUntransformed;

  })();

  /**
   * Emitter
   * *******
   */

  /**
   * Event emitter constructor.
   *
   * This is a simplified version of jvent.js event emitter library:
   * https://github.com/pazguille/jvent/blob/0.2.0/dist/jvent.js
   *
   * @private
   */
  function Emitter() {}

  /**
   * Bind an event listener.
   *
   * @private
   * @memberof Emitter.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Emitter} returns the Emitter instance.
   */
  Emitter.prototype.on = function (event, listener) {

    var events = this._events = this._events || {};
    var listeners = events[event] || [];
    listeners[listeners.length] = listener;
    events[event] = listeners;

    return this;

  };

  /**
   * Unbind all event listeners that match the provided listener function.
   *
   * @private
   * @memberof Emitter.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Emitter} returns the Emitter instance.
   */
  Emitter.prototype.off = function (event, listener) {

    var events = this._events = this._events || {};
    var listeners = events[event] || [];
    var counter = listeners.length;

    if (counter) {
      while (counter--) {
        if (listener === listeners[i]) {
          listeners.splice(counter, 1);
        }
      }
    }

    return this;

  };

  /**
   * Emit all listeners in a specified event with the provided arguments.
   *
   * @private
   * @memberof Emitter.prototype
   * @param {String} event
   * @param {*} [arg1]
   * @param {*} [arg2]
   * @param {*} [arg3]
   * @returns {Emitter} returns the Emitter instance.
   */
  Emitter.prototype.emit = function (event, arg1, arg2, arg3) {

    var events = this._events = this._events || {};
    var listeners = events[event] || [];
    var listenersLength = listeners.length;

    if (listenersLength) {

      var argsLength = arguments.length - 1;
      listeners = listeners.concat();

      for (var i = 0; i < listenersLength; i++) {
        argsLength === 0 ? listeners[i]() :
        argsLength === 1 ? listeners[i](arg1) :
        argsLength === 2 ? listeners[i](arg1, arg2) :
                           listeners[i](arg1, arg2, arg3);
      }

    }

    return this;

  };

  /**
   * LayoutFirstFit v0.2.0
   * Copyright (c) 2016 Niklas Rämö <inramo@gmail.com>
   * Released under the MIT license
   *
   * The default Muuri layout method.
   *
   * @private
   * @param {object} settings
   */
  function LayoutFirstFit(settings) {

    var layout = this;

    // Empty slots data.
    var emptySlots = [];

    // Normalize settings.
    var fillGaps = settings.fillGaps ? true : false;
    var isHorizontal = settings.horizontal ? true : false;
    var alignRight = settings.alignRight ? true : false;
    var alignBottom = settings.alignBottom ? true : false;

    // Round container width and height.
    layout.width = Math.round(layout.width);
    layout.height = Math.round(layout.height);

    // Set horizontal/vertical mode.
    if (isHorizontal) {
      layout.setWidth = true;
      layout.width = 0;
    }
    else {
      layout.setHeight = true;
      layout.height = 0;
    }

    // No need to go further if items do not exist.
    if (!layout.items.length) {
      return;
    }

    // Find slots for items.
    for (var i = 0; i < layout.items.length; i++) {

      var item = layout.items[i];
      var slot = LayoutFirstFit.getSlot(layout, emptySlots, item._width, item._height, !isHorizontal, fillGaps);

      // Update layout height.
      if (isHorizontal) {
        layout.width = Math.max(layout.width, slot.left + slot.width);
      }
      else {
        layout.height = Math.max(layout.height, slot.top + slot.height);
      }

      // Add slot to slots data.
      layout.slots[item._id] = slot;

    }

    // If the alignment is set to right or bottom, we need to adjust the
    // results.
    if (alignRight || alignBottom) {
      for (var id in layout.slots) {
        var slot = layout.slots[id];
        if (alignRight) {
          slot.left = layout.width - (slot.left + slot.width);
        }
        if (alignBottom) {
          slot.top = layout.height - (slot.top + slot.height);
        }
      }
    }

  }

  /**
   * Calculate position for the layout item. Returns the left and top position
   * of the item in pixels.
   *
   * @private
   * @memberof LayoutFirstFit
   * @param {Muuri.Layout} layout
   * @param {Array} slots
   * @param {Number} itemWidth
   * @param {Number} itemHeight
   * @param {Boolean} vertical
   * @param {Boolean} fillGaps
   * @returns {Object}
   */
  LayoutFirstFit.getSlot = function (layout, slots, itemWidth, itemHeight, vertical, fillGaps) {

    var currentSlots = slots[0] || [];
    var newSlots = [];
    var item = {
      left: null,
      top: null,
      width: itemWidth,
      height: itemHeight
    };
    var i;
    var ii;
    var slot;
    var potentialSlots;
    var ignoreCurrentSlots;

    // Try to find a slot for the item.
    for (i = 0; i < currentSlots.length; i++) {
      slot = currentSlots[i];
      if (item.width <= slot.width && item.height <= slot.height) {
        item.left = slot.left;
        item.top = slot.top;
        break;
      }
    }

    // If no slot was found for the item.
    if (item.left === null) {

      // Position the item in to the bottom left (vertical mode) or top right
      // (horizontal mode) of the grid.
      item.left = vertical ? 0 : layout.width;
      item.top = vertical ? layout.height : 0;

      // If gaps don't needs filling do not add any current slots to the new
      // slots array.
      if (!fillGaps) {
        ignoreCurrentSlots = true;
      }

    }

    // In vertical mode, if the item's bottom overlaps the grid's bottom.
    if (vertical && (item.top + item.height) > layout.height) {

      // If item is not aligned to the left edge, create a new slot.
      if (item.left > 0) {
        newSlots[newSlots.length] = {
          left: 0,
          top: layout.height,
          width: item.left,
          height: Infinity
        };
      }

      // If item is not aligned to the right edge, create a new slot.
      if ((item.left + item.width) < layout.width) {
        newSlots[newSlots.length] = {
          left: item.left + item.width,
          top: layout.height,
          width: layout.width - item.left - item.width,
          height: Infinity
        };
      }

      // Update grid height.
      layout.height = item.top + item.height;

    }

    // In horizontal mode, if the item's right overlaps the grid's right edge.
    if (!vertical && (item.left + item.width) > layout.width) {

      // If item is not aligned to the top, create a new slot.
      if (item.top > 0) {
        newSlots[newSlots.length] = {
          left: layout.width,
          top: 0,
          width: Infinity,
          height: item.top
        };
      }

      // If item is not aligned to the bottom, create a new slot.
      if ((item.top + item.height) < layout.height) {
        newSlots[newSlots.length] = {
          left: layout.width,
          top: item.top + item.height,
          width: Infinity,
          height: layout.height - item.top - item.height
        };
      }

      // Update grid width.
      layout.width = item.left + item.width;

    }

    // Clean up the current slots making sure there are no old slots that
    // overlap with the item. If an old slot overlaps with the item, split it
    // into smaller slots if necessary.
    for (i = fillGaps ? 0 : ignoreCurrentSlots ? currentSlots.length : i; i < currentSlots.length; i++) {
      potentialSlots = LayoutFirstFit.splitRect(currentSlots[i], item);
      for (ii = 0; ii < potentialSlots.length; ii++) {
        slot = potentialSlots[ii];
        if (slot.width > 0 && slot.height > 0 && ((vertical && slot.top < layout.height) || (!vertical && slot.left < layout.width))) {
          newSlots[newSlots.length] = slot;
        }
      }
    }

    // Remove redundant slots and sort the new slots.
    LayoutFirstFit.purgeSlots(newSlots).sort(vertical ? LayoutFirstFit.sortRectsTopLeft : LayoutFirstFit.sortRectsLeftTop);

    // Update the slots data.
    slots[0] = newSlots;

    // Return the item.
    return item;

  };

  /**
   * Sort rectangles with top-left gravity. Assumes that objects with
   * properties left, top, width and height are being sorted.
   *
   * @private
   * @memberof LayoutFirstFit
   * @param {Object} a
   * @param {Object} b
   * @returns {Number}
   */
  LayoutFirstFit.sortRectsTopLeft = function (a, b) {

    return a.top < b.top ? -1 : (a.top > b.top ? 1 : (a.left < b.left ? -1 : (a.left > b.left ? 1 : 0)));

  };

  /**
   * Sort rectangles with left-top gravity. Assumes that objects with
   * properties left, top, width and height are being sorted.
   *
   * @private
   * @memberof LayoutFirstFit
   * @param {Object} a
   * @param {Object} b
   * @returns {Number}
   */
  LayoutFirstFit.sortRectsLeftTop = function (a, b) {

    return a.left < b.left ? -1 : (a.left > b.left ? 1 : (a.top < b.top ? -1 : (a.top > b.top ? 1 : 0)));

  };

  /**
   * Check if a rectabgle is fully within another rectangle. Assumes that the
   * rectangle object has the following properties: left, top, width and height.
   *
   * @private
   * @memberof LayoutFirstFit
   * @param {Object} a
   * @param {Object} b
   * @returns {Boolean}
   */
  LayoutFirstFit.isRectWithinRect = function (a, b) {

    return a.left >= b.left && a.top >= b.top && (a.left + a.width) <= (b.left + b.width) && (a.top + a.height) <= (b.top + b.height);

  };

  /**
   * Loops through an array of slots and removes all slots that are fully within
   * another slot in the array.
   *
   * @private
   * @memberof LayoutFirstFit
   * @param {Array} slots
   */
  LayoutFirstFit.purgeSlots = function (slots) {

    var i = slots.length;
    while (i--) {
      var slotA = slots[i];
      var ii = slots.length;
      while (ii--) {
        var slotB = slots[ii];
        if (i !== ii && LayoutFirstFit.isRectWithinRect(slotA, slotB)) {
          slots.splice(i, 1);
          break;
        }
      }
    }

    return slots;

  };

  /**
   * Compares a rectangle to another and splits it to smaller pieces (the parts
   * that exceed the other rectangles edges). At maximum generates four smaller
   * rectangles.
   *
   * @private
   * @memberof LayoutFirstFit
   * @param {Object} a
   * @param {Object} b
   * returns {Array}
   */
  LayoutFirstFit.splitRect = function (a, b) {

    var ret = [];
    var overlap = !(b.left > (a.left + a.width) || (b.left + b.width) < a.left || b.top > (a.top + a.height) || (b.top + b.height) < a.top);

    // If rect a does not overlap with rect b add rect a to the return data as
    // is.
    if (!overlap) {

      ret[0] = a;

    }
    // If rect a overlaps with rect b split rect a into smaller rectangles and
    // add them to the return data.
    else {

      // Left split.
      if (a.left < b.left) {
        ret[ret.length] = {
          left: a.left,
          top: a.top,
          width: b.left - a.left,
          height: a.height
        };
      }

      // Right split.
      if ((a.left + a.width) > (b.left + b.width)) {
        ret[ret.length] = {
          left: b.left + b.width,
          top: a.top,
          width: (a.left + a.width) - (b.left + b.width),
          height: a.height
        };
      }

      // Top split.
      if (a.top < b.top) {
        ret[ret.length] = {
          left: a.left,
          top: a.top,
          width: a.width,
          height: b.top - a.top
        };
      }

      // Bottom split.
      if ((a.top + a.height) > (b.top + b.height)) {
        ret[ret.length] = {
          left: a.left,
          top: b.top + b.height,
          width: a.width,
          height: (a.top + a.height) - (b.top + b.height)
        };
      }

    }

    return ret;

  };

  /**
   * Muuri
   * *****
   */

  /**
   * Creates a new Muuri instance.
   *
   * @public
   * @class
   * @param {Object} settings
   *
   * @example
   * var grid = new Muuri({
   *   container: document.getElementsByClassName('grid')[0],
   *   items: document.getElementsByClassName('item')
   * });
   */
  function Muuri(settings) {

    var inst = this;

    // Merge user settings with default settings.
    var stn = inst._settings = mergeObjects({}, Muuri.defaultSettings, settings || {});

    // Make sure a valid container element is provided before going continuing.
    if (!document.body.contains(stn.container)) {
      throw new Error('Container must be an existing DOM element');
    }

    // Setup container element.
    inst._element = stn.container;
    addClass(stn.container, stn.containerClass);

    // Instance id.
    inst._id = ++uuid;

    // Unique animation queue name.
    inst._animQueue = 'muuri-' + inst._id;

    // Create private eventize instance.
    inst._emitter = new Emitter();

    // Setup show and hide animations for items.
    inst._itemShow = typeof stn.show === 'function' ? stn.show() : showHideAnimation(stn.show, true);
    inst._itemHide = typeof stn.hide === 'function' ? stn.hide() : showHideAnimation(stn.hide);

    // Setup initial items.
    inst._items = [];
    for (var i = 0, len = stn.items.length; i < len; i++) {
      inst._items[inst._items.length] = new Muuri.Item(inst, stn.items[i]);
    }

    // Relayout on window resize if enabled.
    if (stn.layoutOnResize || stn.layoutOnResize === 0) {
      var debounced = debounce(function () {
        inst.refresh();
        inst.layout();
      }, stn.layoutOnResize);
      inst._resizeHandler = function () {
        debounced();
      };
      global.addEventListener('resize', inst._resizeHandler);
    }

    // Layout on init if enabled.
    if (stn.layoutOnInit) {
      inst.layout(true);
    }

  }

  /**
   * Get instance's item by element or by index. Target can also be a
   * Muuri item instance in which case the function returns the item if it
   * exists within related Muuri instance. If nothing is found with the
   * provided target null is returned.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {HTMLElement|Muuri.Item|Number} [target=0]
   * @returns {!Muuri.Item}
   */
  Muuri.prototype._getItem = function (target) {

    if (!target) {

      return this._items[0] || null;

    }
    else if (target instanceof Muuri.Item) {

      return target._muuri === this ? target : null;

    }
    else if (typeof target === 'number') {

      target = target > -1 ? target : this._items.length + target;
      return this._items[target] || null;

    }
    else {

      var ret = null;
      for (var i = 0, len = this._items.length; i < len; i++) {
        var item = this._items[i];
        if (item._element === target) {
          ret = item;
          break;
        }
      }
      return ret;

    }

  };

  /**
   * Bind an event listener.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Muuri} returns the Muuri instance.
   */
  Muuri.prototype.on = function (event, listener) {

    this._emitter.on(event, listener);
    return this;

  };

  /**
   * Unbind an event listener.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Muuri} returns the Muuri instance.
   */
  Muuri.prototype.off = function (event, listener) {

    this._emitter.off(event, listener);
    return this;

  };

  /**
   * Recalculate the width and height of the provided targets. If no targets are
   * provided all active items will be refreshed.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item|Number} [items]
   */
  Muuri.prototype.refresh = function (items) {

    // Get items.
    items = items ? this.get(items) : this.get('active');

    // Refresh dimensions.
    for (var i = 0, len = items.length; i < len; i++) {
      items[i]._refresh();
    }

    // Emit refresh event.
    this._emitter.emit(evRefresh, items);

  };

  /**
   * Get all items. Optionally you can provide specific targets (indices or
   * elements) and filter the results by the items' state (active/inactive).
   * Note that the returned array is not the same object used by the instance so
   * modifying it will not affect instance's items. All items that are not found
   * are omitted from the returned array.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item|Number} [targets]
   * @param {String} [state]
   * @returns {Array} Array of Muuri item instances.
   */
  Muuri.prototype.get = function (targets, state) {

    var hasTargets = targets && typeof targets !== 'string';

    state = !hasTargets ? targets : state;
    state = typeof state === 'string' ? state : null;
    targets = hasTargets ? [].concat(targets) : null;

    if (state || targets) {

      var items = targets || this._items;
      var ret = [];
      var isActive = state === 'active';
      var isInactive = state === 'inactive';

      for (var i = 0, len = items.length; i < len; i++) {
        var item = hasTargets ? this._getItem(items[i]) : items[i];
        if (item && (!state || (isActive && item._active) || (isInactive && !item._active))) {
          ret[ret.length] = item;
        }
      }

      return ret;

    }
    else {

      return this._items.concat();

    }

  };

  /**
   * Add new items by providing the elements you wish to add to the instance and
   * optionally provide the index where you want the items to be inserted into.
   * All elements that are not already children of the container element will be
   * automatically appended to the container. If an element has it's CSS display
   * property set to none it will be marked as inactive during the initiation
   * process. As long as the item is inactive it will not be part of the layout,
   * but it will retain it's index. You can activate items at any point
   * with muuri.show() method. This method will automatically call
   * muuri.layout() if one or more of the added elements are visible. If only
   * hidden items are added no layout will be called. All the new visible items
   * are positioned without animation during their first layout.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement} elements
   * @param {Number} [index=0]
   * @returns {Array}
   */
  Muuri.prototype.add = function (elements, index) {

    var newItems = [];
    var needsRelayout = false;

    // Make sure elements is an array.
    elements = [].concat(elements);

    // Filter out all elements that exist already in current instance.
    for (var i = 0, len = this._items.length; i < len; i++) {
      var item = this._items[i];
      var index = elements.indexOf(item._element);
      if (index > -1) {
        elements.splice(index, 1);
      }
    }

    // Return early if there are no valid items.
    if (!elements.length) {
      return newItems;
    }

    // Create new items.
    for (var i = 0, len = elements.length; i < len; i++) {
      var item = new Muuri.Item(this, elements[i]);
      newItems[newItems.length] = item;
      if (item._active) {
        needsRelayout = true;
        item._noLayoutAnimation = true;
      }
    }

    // Normalize the index for the splice apply hackery so that value of -1
    // prepends the new items to the current items.
    index = index < 0 ? this._items.length - index + 1 : index;

    // Add the new items to the items collection to correct index.
    this._items.splice.apply(this._items, [index, 0].concat(newItems));

    // If relayout is needed.
    if (needsRelayout) {
      this.layout();
    }

    // Emit add event.
    this._emitter.emit(evAdd, newItems);

    // Return new items
    return newItems;

  };

  /**
   * Remove items from muuri instances.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item|Number} items
   * @param {Boolean} [removeElement=false]
   * @returns {Array} The indices of removed items.
   */
  Muuri.prototype.remove = function (items, removeElement) {

    var indices = [];
    var needsRelayout = false;

    items = this.get(items);

    for (var i = 0, len = items.length; i < len; i++) {

      var item = items[i];

      // Check it refresh is needed.
      if (item._active) {
        needsRelayout = true;
      }

      // Remove item.
      indices[indices.length] = item._destroy(removeElement);

    }

    // If relayout is needed.
    if (needsRelayout) {
      this.layout();
    }

    this._emitter.emit(evRemove, indices);

    return indices;

  };

  /**
   * Order the item elements to match the order of the items. If the item's
   * element is not a child of the container it is ignored and left untouched.
   * This comes handy if you need to keep the DOM structure matched with the
   * order of the items.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.synchronize = function () {

    for (var i = 0, len = this._items.length; i < len; i++) {
      var item = this._items[i];
      if (item._element.parentNode === this._element) {
        this._element.appendChild(item._element);
      }
    }

    this._emitter.emit(evSynchronize);

  };

  /**
   * Calculate and apply Muuri instance's item positions.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Boolean} [instant=false]
   * @param {Function} [callback]
   */
  Muuri.prototype.layout = function (instant, callback) {

    var inst = this;
    var emitter = inst._emitter;
    var callback = typeof instant === 'function' ? instant : callback;
    var isInstant = instant === true;
    var layout = new Muuri.Layout(inst);
    var counter = -1;
    var itemsLength = layout.items.length;
    var completed = [];
    var tryFinish = function (interrupted, item) {

      // Push all items to the completed items array which were not interrupted.
      if (!interrupted) {
        completed[completed.length] = item;
      }

      // If container and all items have finished their animations (if any).
      if (++counter === itemsLength) {

        // Call callback.
        if (typeof callback === 'function') {
          callback(completed, layout);
        }

        // Emit layoutend event.
        emitter.emit(evLayoutEnd, completed, layout);

      }

    };

    // Emit layoutstart event.
    emitter.emit(evLayoutStart, layout.items, layout);

    // Set container's height if needed.
    if (layout.setHeight) {
      setStyles(inst._element, {
        height: layout.height + 'px'
      });
    }

    // Set container's width if needed.
    if (layout.setWidth) {
      setStyles(inst._element, {
        width: layout.width + 'px'
      });
    }

    // If there are now items let's finish quickly.
    if (!itemsLength) {

      tryFinish(true);

    }
    // If there are items let's position them.
    else {

      for (var i = 0, len = layout.items.length; i < len; i++) {

        var item = layout.items[i];
        var pos = layout.slots[item._id];

        // Update item's position.
        item._left = pos.left;
        item._top = pos.top;

        // Layout non-dragged items.
        item._drag.active ? tryFinish(false, item) : item._layout(isInstant, tryFinish);

      }

    }

  };

  /**
   * Show instance items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item|Number} items
   * @param {Boolean} [instant=false]
   * @param {Function} [callback]
   */
  Muuri.prototype.show = function (items, instant, callback) {

    showHideHandler(this, 'show', items, instant, callback);

  };

  /**
   * Hide instance items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item|Number} items
   * @param {Boolean} [instant=false]
   * @param {Function} [callback]
   */
  Muuri.prototype.hide = function (items, instant, callback) {

    showHideHandler(this, 'hide', items, instant, callback);

  };

  /**
   * Get item's index.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {HTMLElement|Muuri.Item|Number} item
   * @returns {Number}
   */
  Muuri.prototype.indexOf = function (item) {

    if (typeof item === 'number') {

      return item <= (this._items.length - 1) ? item : null;

    }
    else if (item instanceof Muuri.Item) {

      var index = this._items.indexOf(item);
      return index > -1 ? index : null;

    }
    else {

      var index = null;
      for (var i = 0, len = this._items.length; i < len; i++) {
        if (this._items[i]._element === item) {
          index = i;
          break;
        }
      }
      return index;

    }

  };

  /**
   * Move item to another index or in place of another item.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {HTMLElement|Muuri.Item|Number} targetFrom
   * @param {HTMLElement|Muuri.Item|Number} targetTo
   */
  Muuri.prototype.move = function (targetFrom, targetTo) {

    targetFrom = this._getItem(targetFrom);
    targetTo = this._getItem(targetTo);

    if (targetFrom && targetTo && (targetFrom !== targetTo)) {
      arrayMove(this._items, this._items.indexOf(targetFrom), this._items.indexOf(targetTo));
      this._emitter.emit(evMove, targetFrom, targetTo);
    }

  };

  /**
   * Swap positions of two items.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {HTMLElement|Muuri.Item|Number} targetA
   * @param {HTMLElement|Muuri.Item|Number} targetB
   */
  Muuri.prototype.swap = function (targetA, targetB) {

    targetA = this._getItem(targetA);
    targetB = this._getItem(targetB);

    if (targetA && targetB && (targetA !== targetB)) {
      arraySwap(this._items, this._items.indexOf(targetA), this._items.indexOf(targetB));
      this._emitter.emit(evSwap, targetA, targetB);
    }

  };

  /**
   * Destroy the instance.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.destroy = function () {

    // Unbind window resize event listener.
    if (this._resizeHandler) {
      global.removeEventListener('resize', this._resizeHandler);
    }

    // Destroy items.
    var items = this._items.concat();
    for (var i = 0, len = items.length; i < len; i++) {
      items[i]._destroy();
    }

    // Restore container.
    removeClass(this._element, this._settings.containerClass);
    setStyles(this._element, {
      height: ''
    });

    // Emit destroy event.
    this._emitter.emit(evDestroy);

    // Remove all event listeners.
    var events = this._emitter._events;
    if (events) {
      var eventNames = Object.keys(this._emitter._events);
      for (var i = 0, len = eventNames.length; i < len; i++) {
        events[eventNames[i]].length = 0;
      }
    }

    // Render the instance unusable -> nullify all Muuri related properties.
    var props = Object.keys(this).concat(Object.keys(Muuri.prototype));
    for (var i = 0; i < props.length; i++) {
      this[props[i]] = null;
    }

  };

  /**
   * Muuri - Item
   * ************
   */

  /**
   * Creates a new Muuri Item instance.
   *
   * @public
   * @class
   * @memberof Muuri
   * @param {Muuri} muuri
   * @param {HTMLElement} element
   */
  Muuri.Item = function (muuri, element) {

    // Make sure the item element is not a parent of the grid container element.
    if (element.contains(muuri._element)) {
      throw new Error('Item element must not be a parent of the grid container element');
    }

    // If the provided item element is not a direct child of the grid container
    // element, append it to the grid container.
    if (element.parentNode !== muuri._element) {
      muuri._element.appendChild(element);
    }

    var stn = muuri._settings;
    var isHidden = getStyle(element, 'display') === 'none';

    // Instance id.
    this._id = ++uuid;
    this._muuri = muuri;
    this._element = element;
    this._child = element.children[0];

    // Set item class.
    addClass(element, stn.itemClass);

    // Set up active state (defines if the item is considered part of the layout
    // or not).
    this._active = isHidden ? false : true;

    // Set up positioning state (defines if the item is currently animating
    // it's position).
    this._positioning = false;

    // Set up visibility states.
    this._hidden = isHidden;
    this._hiding = false;
    this._showing = false;

    // Visibility animation callback queue. Whenever a callback is provided for
    // show/hide methods and animation is enabled the callback is stored
    // temporarily to this array. The callbacks are called with the first
    // argument as false if the animation succeeded without interruptions and
    // with the first argument as true if the animation was interrupted.
    this._visibiliyQueue = [];

    // Layout animation callback queue. Whenever a callback is provided for
    // layout method and animation is enabled the callback is stored temporarily
    // to this array. The callbacks are called with the first argument as false
    // if the animation succeeded without interruptions and with the first
    // argument as true if the animation was interrupted.
    this._layoutQueue = [];

    // Set element's initial position.
    hookStyles(this._element, {
      left: '0',
      top: '0',
      translateX: '0px',
      translateY: '0px'
    });

    // Set hidden/shown class.
    addClass(element, isHidden ? stn.hiddenClass : stn.shownClass);

    // Set hidden/shown styles for the child element.
    hookStyles(this._child, {
      scale: isHidden ? 0 : 1,
      opacity: isHidden ? 0 : 1
    });

    // Enforce display "block" if element is visible.
    if (!isHidden) {
      setStyles(this._element, {
        display: 'block'
      });
    }

    // Set up initial dimensions and positions.
    this._refresh();
    this._left = 0;
    this._top = 0;

    // Set up drag & drop.
    this._drag = {active: false};
    this._release = {active: false};
    if (muuri._settings.dragEnabled) {
      this._initDrag();
    }

  };

  /**
   * Inspect instance's data.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype.inspect = function () {

    return {
      element: this._element,
      width: this._width,
      height: this._height,
      margin: {
        left: this._margin.left,
        top: this._margin.top,
        right: this._margin.right,
        bottom: this._margin.bottom
      },
      left: this._left,
      top: this._top,
      active: this._active,
      positioning: this._positioning,
      dragging: this._drag.active,
      releasing: this._release.active,
      visibility: this._hiding  ? 'hiding' : this._showing ? 'showing' : this._hidden  ? 'hidden' : 'shown'
    };

  };

  /**
   * Make the item draggable with Hammer.js.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._initDrag = function () {

    var inst = this;
    var stn = inst._muuri._settings;

    // Initiate Hammer.
    var hammer = inst._hammer = new Hammer.Manager(inst._element);

    // Add drag recognizer to hammer.
    hammer.add(new Hammer.Pan({
      event: 'drag',
      pointers: 1,
      threshold: 0,
      direction: Hammer.DIRECTION_ALL
    }));

    // Add draginit recognizer to hammer.
    hammer.add(new Hammer.Press({
      event: 'draginit',
      pointers: 1,
      threshold: 100,
      time: 0
    }));

    // This is not ideal, but saves us from a LOT of hacks. Let's try to keep
    // the default drag setup consistent across devices.
    hammer.set({ touchAction: 'none' });

    // Setup initial release data.
    inst._resetReleaseData();

    // Setup initial drag data.
    var drag = inst._drag;
    inst._resetDragData();

    // Add overlap checker function to drag data.
    drag.checkOverlap = debounce(function () {
      if (drag.active) {
        inst._checkOverlap();
      }
    }, stn.dragSortInterval);

    // Add predicate related data to drag data.
    var predicateResolved = false;
    drag.predicate = typeof stn.dragPredicate === 'function' ? stn.dragPredicate : dragPredicate;
    drag.predicateData = {};
    drag.isPredicateResolved = function () {
      return predicateResolved;
    };
    drag.resolvePredicate = function (e) {
      if (!predicateResolved && e.type !== 'draginitup' && e.type !== 'dragend' && e.type !== 'dragcancel') {
        predicateResolved = true;
        inst._onDragStart(e);
      }
    };

    // Add drag sroll handler.
    drag.onScroll = function (e) {
      if (raf) {
        raf(function () {
          inst._onDragScroll(e);
        });
      }
      else {
        inst._onDragScroll(e);
      }
    };

    // Bind drag events.
    hammer
    .on('draginit', function (e) {
      drag.predicateData = {};
      predicateResolved = false;
      drag.predicate.call(drag.predicateData, e, inst, drag.resolvePredicate);
    })
    .on('dragstart dragmove', function (e) {
      if (predicateResolved && drag.active) {
        inst._onDragMove(e);
      }
      drag.predicate.call(drag.predicateData, e, inst, drag.resolvePredicate);
    })
    .on('dragend dragcancel draginitup', function (e) {
      if (predicateResolved && drag.active) {
        inst._onDragEnd(e);
      }
      drag.predicate.call(drag.predicateData, e, inst, drag.resolvePredicate);
    });

  };

  /**
   * Reset drag data.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._resetDragData = function () {

    var drag = this._drag;

    // Is the drag active or not?
    drag.active = false;

    // Hammer dragstart/dragend event data.
    drag.start = null;
    drag.move = null;

    // The dragged Muuri.Item reference.
    drag.item = null;

    // The element that is currently dragged (instance element or it's clone).
    drag.element = null;

    // Dragged element's inline styles stored for graceful teardown.
    drag.elementStyles = null;

    // Scroll parents of the dragged element and muuri container.
    drag.scrollParents = [];

    // The current translateX/translateY position.
    drag.left = 0;
    drag.top = 0;

    // Dragged element's current position within the grid.
    drag.gridX = 0;
    drag.gridY = 0;

    // Dragged element's current offset from window's northwest corner. Does not
    // account for element's margins.
    drag.elemClientX = 0;
    drag.elemClientY = 0;

    // Offset difference between the dragged element's temporary drag container
    // and it's original container.
    drag.containerDiffX = 0;
    drag.containerDiffY = 0;

  };

  /**
   * Drag start handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragStart = function (e) {

    var drag = this._drag;
    var stn = this._muuri._settings;
    var isReleased = this._release.active;

    // If item is not active, don't start the drag.
    if (!this._active) {
      return;
    }

    // Stop current positioning animation.
    if (this._positioning) {
      this._stopLayout();
    }

    // If item is being released reset release data, remove release class and
    // import the current elementStyles to drag object.
    if (isReleased) {
      drag.elementStyles = this._release.elementStyles;
      removeClass(this._element, stn.releasingClass);
      this._resetReleaseData();
    }

    // Setup drag data.
    drag.active = true;
    drag.start = e;
    drag.move = e;
    drag.item = this;
    drag.element = this._element;

    // Get element's current position.
    var currentLeft = parseFloat(Velocity.hook(drag.element, 'translateX')) || 0;
    var currentTop = parseFloat(Velocity.hook(drag.element, 'translateY')) || 0;

    // Get container references.
    var muuriContainer = this._muuri._element;
    var dragContainer = stn.dragContainer;

    // Set initial left/top drag value.
    drag.left = drag.gridX = currentLeft;
    drag.top = drag.gridY = currentTop;

    // If a specific drag container is set and it is different from the
    // default muuri container we need to cast some extra spells.
    if (dragContainer && dragContainer !== muuriContainer) {

      // If dragged element is already in drag container.
      if (drag.element.parentNode === dragContainer) {

        // Get offset diff.
        var offsetDiff = getOffsetDiff(drag.element, muuriContainer);

        // Store the container offset diffs to drag data.
        drag.containerDiffX = offsetDiff.left;
        drag.containerDiffY = offsetDiff.top;

        // Set up relative drag position data.
        drag.gridX = currentLeft - drag.containerDiffX;
        drag.gridY = currentTop - drag.containerDiffY;

      }

      // If dragged element is not within the correct container.
      else {

        // Lock element's width, height, padding and margin before appending
        // to the temporary container because otherwise the element might
        // enlarge or shrink after the append procedure if the some of the
        // properties are defined in relative sizes.
        lockElementSize(drag);

        // Append element into correct container.
        dragContainer.appendChild(drag.element);

        // Get offset diff.
        var offsetDiff = getOffsetDiff(drag.element, muuriContainer);

        // Store the container offset diffs to drag data.
        drag.containerDiffX = offsetDiff.left;
        drag.containerDiffY = offsetDiff.top;

        // Set up drag position data.
        drag.left = currentLeft + drag.containerDiffX;
        drag.top = currentTop + drag.containerDiffY;

        // Fix position to account for the append procedure.
        hookStyles(drag.element, {
          translateX: drag.left + 'px',
          translateY: drag.top + 'px'
        });

      }

    }

    // Get and store element's current offset from window's northwest corner.
    var elemGbcr = drag.element.getBoundingClientRect();
    drag.elemClientX = elemGbcr.left;
    drag.elemClientY = elemGbcr.top;

    // Get drag scroll parents.
    drag.scrollParents = getScrollParents(drag.element);
    if (dragContainer && dragContainer !== muuriContainer) {
      drag.scrollParents = arrayUnique(drag.scrollParents.concat(getScrollParents(muuriContainer)));
    }

    // Bind scroll listeners.
    for (var i = 0, len = drag.scrollParents.length; i < len; i++) {
      drag.scrollParents[i].addEventListener('scroll', drag.onScroll);
    }

    // Set drag class.
    addClass(drag.element, stn.draggingClass);

    // Emit dragstart event.
    this._muuri._emitter.emit(evDragStart, this, generateDragEvent('dragstart', e, drag));

  };

  /**
   * Drag move handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragMove = function (e) {

    var drag = this._drag;
    var stn = this._muuri._settings;

    // If item is not active, reset drag.
    if (!this._active) {
      this._resetDrag();
      return;
    }

    // Get delta difference from last dragmove event.
    var xDiff = e.deltaX - drag.move.deltaX;
    var yDiff = e.deltaY - drag.move.deltaY;

    // Update move event.
    drag.move = e;

    // Update position data.
    drag.left += xDiff;
    drag.top += yDiff;
    drag.gridX += xDiff;
    drag.gridY += yDiff;
    drag.elemClientX += xDiff;
    drag.elemClientY += yDiff;

    // Update element's translateX/Y values.
    hookStyles(drag.element, {
      translateX: drag.left + 'px',
      translateY: drag.top + 'px'
    });

    // Overlap handling.
    if (stn.dragSort) {
      drag.checkOverlap();
    }

    // Emit item-dragmove event.
    this._muuri._emitter.emit(evDragMove, this, generateDragEvent('dragmove', e, drag));

  };

  /**
   * Drag scroll handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragScroll = function (e) {

    var drag = this._drag;
    var stn = this._muuri._settings;

    // Get containers.
    var muuriContainer = this._muuri._element;
    var dragContainer = stn.dragContainer;

    // Get offset diff.
    var elemGbcr = drag.element.getBoundingClientRect();
    var xDiff = drag.elemClientX - elemGbcr.left;
    var yDiff = drag.elemClientY - elemGbcr.top;

    // Update container diff.
    if (dragContainer && dragContainer !== muuriContainer) {

      // Get offset diff.
      var offsetDiff = getOffsetDiff(drag.element, muuriContainer);

      // Store the container offset diffs to drag data.
      drag.containerDiffX = offsetDiff.left;
      drag.containerDiffY = offsetDiff.top;

    }

    // Update position data.
    drag.left += xDiff;
    drag.top += yDiff;
    drag.gridX = drag.left - drag.containerDiffX;
    drag.gridY = drag.top - drag.containerDiffY;

    // Update element's translateX/Y values.
    hookStyles(drag.element, {
      translateX: drag.left + 'px',
      translateY: drag.top + 'px'
    });

    // Overlap handling.
    if (stn.dragSort) {
      drag.checkOverlap();
    }

    // Emit item-dragscroll event.
    this._muuri._emitter.emit(evDragScroll, this, generateDragEvent('dragscroll', e, drag));

  };

  /**
   * Drag end handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragEnd = function (e) {

    var drag = this._drag;
    var stn = this._muuri._settings;
    var release = this._release;

    // If item is not active, reset drag.
    if (!this._active) {
      this._resetDrag();
      return;
    }

    // Finish currently queued overlap check.
    if (stn.dragSort) {
      drag.checkOverlap('finish');
    }

    // Remove scroll listeners
    for (var i = 0, len = drag.scrollParents.length; i < len; i++) {
      drag.scrollParents[i].removeEventListener('scroll', drag.onScroll);
    }

    // Remove drag classname from element.
    removeClass(drag.element, stn.draggingClass);

    // Flag drag as inactive.
    drag.active = false;

    // Emit item-dragend event.
    this._muuri._emitter.emit(evDragEnd, this, generateDragEvent('dragend', e, drag));

    // Setup release data.
    release.item = drag.item;
    release.containerDiffX = drag.containerDiffX;
    release.containerDiffY = drag.containerDiffY;
    release.element = drag.element;
    release.elementStyles = drag.elementStyles;

    // Reset drag data.
    this._resetDragData();

    // Start the release process.
    this._startRelease();

  };

  /**
   * Reset drag data and cancel any ongoing drag activity.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._resetDrag = function (e) {

    var drag = this._drag;
    var stn = this._muuri._settings;

    // Remove scroll listeners
    for (var i = 0, len = drag.scrollParents.length; i < len; i++) {
      drag.scrollParents[i].removeEventListener('scroll', drag.onScroll);
    }

    // Cancel overlap check.
    drag.checkOverlap('cancel');

    // Remove draggin class.
    removeClass(drag.element, stn.draggingClass);

    // Remove dragged element's inline styles.
    unlockElementSize(drag);

    this._resetDragData();

  };

  /**
   * Reset release data.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._resetReleaseData = function () {

    var release = this._release;
    release.active = false;
    release.item = null;
    release.positioningStarted = false;
    release.containerDiffX = 0;
    release.containerDiffY = 0;
    release.element = null;
    release.elementStyles = null;

  };

  /**
   * Start the release process of an item.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._startRelease = function () {

    var stn = this._muuri._settings;
    var release = this._release;

    // Flag release as active.
    release.active = true;

    // Add release classname to released element.
    addClass(release.element, stn.releasingClass);

    // Emit releasestart event.
    this._muuri._emitter.emit(evReleaseStart, this);

    // Position the released item.
    this._layout(false);

  };

  /**
   * End the release process of an item.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._endRelease = function () {

    var stn = this._muuri._settings;
    var release = this._release;

    // Remove release classname from the released element.
    removeClass(release.element, stn.releasingClass);

    // If the released element is outside the muuri container put it back there
    // and adjust position accordingly.
    if (release.element.parentNode !== this._muuri._element) {
      this._muuri._element.appendChild(release.element);
      hookStyles(release.element, {
        translateX: this._left + 'px',
        translateY: this._top + 'px'
      });
    }

    // Unlock temporary inlined styles.
    unlockElementSize(release);

    // Reset release data.
    this._resetReleaseData();

    // Emit releaseend event.
    this._muuri._emitter.emit(evReleaseEnd, this);

  };

  /**
   * Check (during drag) if an item is overlapping other items and based on
   * the configuration do a relayout.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._checkOverlap = function () {

    var stn = this._muuri._settings;
    var overlapTolerance = stn.dragSortTolerance;
    var overlapAction = stn.dragSortAction;
    var items = this._muuri._items;
    var dragItem = this._drag.item;
    var bestMatch = null;
    var instIndex = 0;
    var instData = {
      width: dragItem._width - dragItem._margin.left - dragItem._margin.right,
      height: dragItem._height - dragItem._margin.top - dragItem._margin.bottom,
      left: this._drag.gridX + dragItem._margin.left,
      top: this._drag.gridY + dragItem._margin.top
    };

    // Find best match (the element with most overlap).
    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      if (item === this) {
        instIndex = i;
      }
      else if (item._active) {
        var overlapScore = getOverlapScore(instData, {
          width: item._width - item._margin.left - item._margin.right,
          height: item._height - item._margin.top - item._margin.bottom,
          left: item._left + item._margin.left,
          top: item._top + item._margin.top
        });
        if (!bestMatch || overlapScore > bestMatch.score) {
          bestMatch = {
            item: item,
            score: overlapScore,
            index: i
          };
        }
      }
    }

    // Check if the best match overlaps enough to justify a placement switch.
    if (bestMatch && bestMatch.score >= overlapTolerance) {
      if (overlapAction === 'swap') {
        arraySwap(items, instIndex, bestMatch.index);
        this._muuri._emitter.emit(evSwap, this, bestMatch.item);
      }
      else {
        arrayMove(items, instIndex, bestMatch.index);
        this._muuri._emitter.emit(evMove, this, bestMatch.item);
      }
      this._muuri.layout();
    }

  };

  /**
   * Stop item's position animation if it is currently animating.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._stopLayout = function () {

    var stn = this._muuri._settings;

    if (this._positioning) {

      // Stop animation.
      Velocity(this._element, 'stop', this._muuri._animQueue);

      // Remove visibility classes.
      removeClass(this._element, stn.positioningClass);

      // Reset state.
      this._positioning = false;

      // Process callback queue.
      processQueue(this._layoutQueue, true, this);

    }

  };

  /**
   * Recalculate item's dimensions.
   *
   * @public
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._refresh = function () {

    if (!this._hidden) {
      var widthData = getDimension(this._element, 'width', true);
      var heightData =  getDimension(this._element, 'height', true);
      this._width = Math.round(widthData.value);
      this._height = Math.round(heightData.value);
      this._margin = {
        left: Math.round(widthData.marginA),
        right: Math.round(widthData.marginB),
        top: Math.round(heightData.marginA),
        bottom: Math.round(heightData.marginB)
      };
    }

  };

  /**
   * Position item based on it's current data.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Boolean} instant
   * @param {Function} [callback]
   */
  Muuri.Item.prototype._layout = function (instant, callback) {

    var inst = this;
    var stn = inst._muuri._settings;
    var release = inst._release;
    var isJustReleased = release.active && release.positioningStarted === false;
    var animDuration = isJustReleased ? stn.dragReleaseDuration : stn.positionDuration;
    var animEasing = isJustReleased ? stn.dragReleaseEasing : stn.positionEasing;
    var animEnabled = instant === true || inst._noLayoutAnimation ? false : animDuration > 0;
    var isPositioning = inst._positioning;
    var finish = function () {

      // Remove positioning classes.
      removeClass(inst._element, stn.positioningClass);

      // Mark the item as not positioning.
      inst._positioning = false;

      // Finish up release.
      if (release.active) {
        inst._endRelease();
      }

      // Process the callback queue.
      processQueue(inst._layoutQueue, false, inst);

    };

    // Stop currently running animation, if any.
    inst._stopLayout();

    // Push the callback to the callback queue.
    if (typeof callback === 'function') {
      inst._layoutQueue[inst._layoutQueue.length] = callback;
    }

    // Mark release positiong as started.
    if (isJustReleased) {
      release.positioningStarted = true;
    }

    // Get item container offset. This applies only for release handling in the
    // scenario where the released element is not currently within the muuri
    // container.
    var offsetLeft = inst._release.active ? inst._release.containerDiffX : 0;
    var offsetTop = inst._release.active ? inst._release.containerDiffY : 0;

    // If no animations are needed, easy peasy!
    if (!animEnabled) {

      if (inst._noLayoutAnimation) {
        inst._noLayoutAnimation = false;
      }

      hookStyles(inst._element, {
        translateX: (inst._left + offsetLeft) + 'px',
        translateY: (inst._top + offsetTop) + 'px'
      });

      finish();

    }

    // If animations are needed, let's dive in.
    else {

      // Get current (relative) left and top position. Meaning that the
      // drga container's offset (if applicable) is subtracted from the current
      // translate values.
      var currentLeft = (parseFloat(Velocity.hook(inst._element, 'translateX')) || 0) - offsetLeft;
      var currentTop =  (parseFloat(Velocity.hook(inst._element, 'translateY')) || 0) - offsetTop;

      // If the item is already in correct position there's no need to animate
      // it.
      if (inst._left === currentLeft && inst._top === currentTop) {
        finish();
        return;
      }

      // Mark as positioning.
      inst._positioning = true;

      // Add positioning class if necessary.
      if (!isPositioning) {
        addClass(inst._element, stn.positioningClass);
      }

      // Set up the animation.
      Velocity(inst._element, {
        translateX: inst._left + offsetLeft,
        translateY: inst._top + offsetTop
      }, {
        duration: animDuration,
        easing: animEasing,
        complete: finish,
        queue: inst._muuri._animQueue
      });

      // Start the animation.
      Velocity.Utilities.dequeue(inst._element, inst._muuri._animQueue);

    }

  };

  /**
   * Show item.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Boolean} instant
   * @param {Function} [callback]
   */
  Muuri.Item.prototype._show = function (instant, callback) {

    var inst = this;
    var stn = inst._muuri._settings;

    // If item is visible.
    if (!inst._hidden && !inst._showing) {

      // Call the callback and be done with it.
      if (typeof callback === 'function') {
        callback(false, inst);
      }

    }

    // If item is animating to visible.
    else if (!inst._hidden) {

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibiliyQueue[inst._visibiliyQueue.length] = callback;
      }

    }

    // If item is hidden or animating to hidden.
    else {

      var isHiding = inst._hiding;

      // Stop animation.
      inst._muuri._itemHide.stop(inst);

      // Update states.
      inst._active = true;
      inst._hidden = false;
      inst._showing = inst._hiding = false;

      // Update classes.
      addClass(inst._element, stn.shownClass);
      removeClass(inst._element, stn.hiddenClass);

      // Set element's display style.
      setStyles(inst._element, {
        display: 'block'
      });

      // Process current callback queue.
      processQueue(inst._visibiliyQueue, true, inst);

      // Update state.
      inst._showing = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibiliyQueue[inst._visibiliyQueue.length] = callback;
      }

      // Animate child element.
      inst._muuri._itemShow.start(inst, instant, function () {

        // Process callback queue.
        processQueue(inst._visibiliyQueue, false, inst);

      });

    }

  };

  /**
   * Hide item.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Boolean} instant
   * @param {Function} [callback]
   */
  Muuri.Item.prototype._hide = function (instant, callback) {

    var inst = this;
    var stn = inst._muuri._settings;

    // If item is hidden.
    if (inst._hidden && !inst._hiding) {

      // Call the callback and be done with it.
      if (typeof callback === 'function') {
        callback(false, inst);
      }

    }

    // If item is animating to hidden.
    else if (inst._hidden) {

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibiliyQueue[inst._visibiliyQueue.length] = callback;
      }

    }

    // If item is visible or animating to visible.
    else {

      var isShowing = inst._showing;

      // Stop animation.
      inst._muuri._itemShow.stop(inst);

      // Update states.
      inst._active = false;
      inst._hidden = true;
      inst._showing = inst._hiding = false;

      // Update classes.
      addClass(inst._element, stn.hiddenClass);
      removeClass(inst._element, stn.shownClass);

      // Process current callback queue.
      processQueue(inst._visibiliyQueue, true, inst);

      // Update state.
      inst._hiding = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibiliyQueue[inst._visibiliyQueue.length] = callback;
      }

      // Animate child element.
      inst._muuri._itemHide.start(inst, instant, function () {

        // Hide element.
        setStyles(inst._element, {
          display: 'none'
        });

        // Process callback queue.
        processQueue(inst._visibiliyQueue, false, inst);

      });

    }

  };

  /**
   * Destroy item instance.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Boolean} [removeElement=false]
   */
  Muuri.Item.prototype._destroy = function (removeElement) {

    var muuri = this._muuri;
    var stn = this._muuri._settings;
    var element = this._element;
    var index = this._muuri._items.indexOf(this);

    // Stop animations.
    this._stopLayout();
    this._muuri._itemShow.stop(this);
    this._muuri._itemHide.stop(this);

    // If item is being released, stop it gracefully.
    if (this._release.active) {
      if (element.parentNode !== this._muuri._element) {
        this._muuri._element.appendChild(element);
      }
      this._resetReleaseData();
    }

    // If item is being dragged, stop it gracefully.
    if (this._drag.active) {
      if (element.parentNode !== this._muuri._element) {
        this._muuri._element.appendChild(element);
      }
      this._resetDrag();
    }

    // Destroy Hammer instance and custom touch listeners.
    if (this._hammer) {
      this._hammer.destroy();
    }

    // Remove all inline styles.
    element.removeAttribute('style');
    this._child.removeAttribute('style');

    // Handle visibility callback queue, fire all uncompleted callbacks with
    // interrupted flag.
    processQueue(this._visibiliyQueue, true, this);

    // Remove Muuri specific classes.
    removeClass(element, stn.positioningClass);
    removeClass(element, stn.draggingClass);
    removeClass(element, stn.releasingClass);
    removeClass(element, stn.itemClass);
    removeClass(element, stn.shownClass);
    removeClass(element, stn.hiddenClass);

    // Remove item from Muuri instance if it still exists there.
    if (index > -1) {
      this._muuri._items.splice(index, 1);
    }

    // Remove element from DOM.
    if (removeElement) {
      element.parentNode.removeChild(element);
    }

    // Render the instance unusable -> nullify all Muuri related properties.
    var props = Object.keys(this).concat(Object.keys(Muuri.Item.prototype));
    for (var i = 0; i < props.length; i++) {
      this[props[i]] = null;
    }

  };

  /**
   * Creates a new Muuri Layout instance.
   *
   * @public
   * @class
   * @memberof Muuri
   * @param {Muuri} muuri
   * @param {Muuri.Item[]} [items]
   */
  Muuri.Layout = function (muuri, items) {

    var stn = muuri._settings.layout;

    this.muuri = muuri;
    this.items = items ? items.concat() : muuri.get('active');
    this.slots = {};
    this.width = 0;
    this.height = 0;
    this.setWidth = false;
    this.setHeight = false;

    // Calculate the current width and height of the container.
    this.width = getDimension(muuri._element, 'width');
    this.height = getDimension(muuri._element, 'height');

    // If the user has provided custom function as a layout method invoke it.
    if (typeof stn === 'function') {

      stn.call(this);

    }
    // Otherwise parse the layout mode and settings from provided options and
    // do the calculations.
    else {

      // Parse the layout method name and settings from muuri settings.
      var noSettingsProvided = typeof stn === 'string';
      var methodName = noSettingsProvided ? stn : stn[0];

      // Make sure the provided layout method exists.
      if (typeof Muuri.Layout.methods[methodName] !== 'function') {
        throw new Error('Layout method "' + methodName +  '" does not exist.');
      }

      // Invoke the layout method.
      typeof Muuri.Layout.methods[methodName].call(this, noSettingsProvided ? {} : stn[1]);

    }

  };

  /**
   * Available layout methods.
   *
   * @public
   * @memberof Muuri.Layout
   */
  Muuri.Layout.methods = {
    firstFit: LayoutFirstFit
  };

  /**
   * Muuri - Settings
   * ****************
   */

  /**
   * Default settings.
   *
   * @public
   * @memberof Muuri
   * @property {HTMLElement} container
   * @property {Array} items
   * @property {Number} positionDuration
   * @property {Array|String} positionEasing
   * @property {!Function|Object} show
   * @property {!Function|Object} hide
   * @property {Array|String} layout
   * @property {!Number} layoutOnResize
   * @property {Boolean} layoutOnInit
   * @property {Boolean} dragEnabled
   * @property {!Function} dragPredicate
   * @property {Boolean} dragSort
   * @property {!HtmlElement} dragContainer
   * @property {Number} dragReleaseDuration
   * @property {Array|String} dragReleaseEasing
   * @property {Number} dragSortInterval
   * @property {Number} dragSortTolerance
   * @property {String} dragSortAction
   * @property {String} containerClass
   * @property {String} itemClass
   * @property {String} shownClass
   * @property {String} hiddenClass
   * @property {String} positioningClass
   * @property {String} draggingClass
   * @property {String} releasingClass
   */
  Muuri.defaultSettings = {

    // Container
    container: null,

    // Items
    items: [],
    positionDuration: 300,
    positionEasing: 'ease-out',
    show: {
      duration: 300,
      easing: 'ease-out'
    },
    hide: {
      duration: 300,
      easing: 'ease-out'
    },

    // Layout
    layout: 'firstFit',
    layoutOnResize: 100,
    layoutOnInit: true,

    // Drag & Drop
    dragEnabled: false,
    dragContainer: null,
    dragPredicate: null,
    dragSort: true,
    dragSortInterval: 50,
    dragSortTolerance: 50,
    dragSortAction: 'move',
    dragReleaseDuration: 300,
    dragReleaseEasing: 'ease-out',

    // Classnames
    containerClass: 'muuri',
    itemClass: 'muuri-item',
    shownClass: 'muuri-shown',
    hiddenClass: 'muuri-hidden',
    positioningClass: 'muuri-positioning',
    draggingClass: 'muuri-dragging',
    releasingClass: 'muuri-releasing'

  };

  /**
   * Helpers - Generic
   * *****************
   */

  /**
   * Swap array items.
   *
   * @param {Array} array
   * @param {Number} indexA
   * @param {Number} indexB
   */
  function arraySwap(array, indexA, indexB) {

    var temp = array[indexA];
    array[indexA] = array[indexB];
    array[indexB] = temp;

  }

  /**
   * Move array item to another index.
   *
   * @param {Array} array
   * @param {Number} fromIndex
   * @param {Number} toIndex
   */
  function arrayMove(array, fromIndex, toIndex) {

    array.splice(toIndex, 0, array.splice(fromIndex, 1)[0]);

  }

  /**
   * Returns a new duplicate free version of the provided array.
   *
   * @param {Array} array
   * @returns {Array}
   */
  function arrayUnique(array) {

    var ret = [];
    for (var i = 0, len = array.length; i < len; i++) {
      if (ret.indexOf(array[i]) === -1) {
        ret[ret.length] = array[i];
      }
    }
    return ret;

  }

  /**
   * Check if a value is a plain object.
   *
   * @param {*} val
   * @returns {Boolean}
   */
  function isPlainObject(val) {

    return typeof val === 'object' && Object.prototype.toString.call(val) === '[object Object]';

  }

  /**
   * Merge properties of provided objects. The first argument is considered as
   * the destination object which inherits the properties of the
   * following argument objects. Merges object properties recursively if the
   * property's type is object in destination object and the source object.
   *
   * @param {Object} dest
   * @param {...Object} sources
   * @returns {Object} Returns the destination object.
   */
  function mergeObjects(dest) {

    var sources = Array.prototype.slice.call(arguments, 1);

    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      for (var prop in source) {
        if (source.hasOwnProperty(prop)) {
          if (isPlainObject(dest[prop]) && isPlainObject(source[prop])) {
            mergeObjects(dest[prop], source[prop]);
          }
          else {
            dest[prop] = source[prop];
          }
        }
      }
    }

    return dest;

  }

  /**
   * Returns a function, that, as long as it continues to be invoked, will not
   * be triggered. The function will be called after it stops being called for
   * N milliseconds. The returned function accepts one argument which, when
   * being "finish", calls the debounced function immediately if it is currently
   * waiting to be called, and when being "cancel" cancels the currently queued
   * function call.
   *
   * @param {Function} fn
   * @param {Number} wait
   * @returns {Function}
   */
  function debounce(fn, wait) {

    var timeout;
    var actionCancel = 'cancel';
    var actionFinish = 'finish';

    return function (action) {

      if (timeout !== undefined) {
        timeout = global.clearTimeout(timeout);
        if (action === actionFinish) {
          fn();
        }
      }

      if (action !== actionCancel && action !== actionFinish) {
        timeout = global.setTimeout(function () {
          timeout = undefined;
          fn();
        }, wait);
      }

    };

  }

  /**
   * Get intersection area dimensions and position between two rectangles in 2d
   * space.
   *
   * @param {Object} a
   * @param {Object} b
   * @returns {?Object}
   */
  function getIntersection(a, b) {

    var ret = null;
    var overlap = {
      left: a.left - b.left,
      right: (b.left + b.width) - (a.left + a.width),
      top: a.top - b.top,
      bottom: (b.top + b.height) - (a.top + a.height)
    };
    var intersectionWidth = Math.max(a.width + Math.min(overlap.left, 0) + Math.min(overlap.right, 0), 0);
    var intersectionHeight = Math.max(a.height + Math.min(overlap.top, 0) + Math.min(overlap.bottom, 0), 0);
    var hasIntersection = intersectionWidth > 0 && intersectionHeight > 0;

    if (hasIntersection) {
      ret = {};
      ret.width = intersectionWidth;
      ret.height = intersectionHeight;
      ret.left = a.left + Math.abs(Math.min(overlap.left, 0));
      ret.right = ret.left + ret.width;
      ret.top = a.top + Math.abs(Math.min(overlap.top, 0));
      ret.bottom = ret.top + ret.height;
    }

    return ret;

  }

  /**
   * Helpers - DOM utils
   * *******************
   */

  /**
   * Returns the computed value of an element's style property as a string.
   *
   * @param {HTMLElement} element
   * @param {String} style
   * @returns {String}
   */
  function getStyle(element, style) {

    return global.getComputedStyle(element, null).getPropertyValue(style);

  }

  /**
   * Set inline styles to an element.
   *
   * @param {HTMLElement} element
   * @param {Object} styles
   */
  function setStyles(element, styles) {

    for (var prop in styles) {
      element.style[prop] = styles[prop];
    }

  }

  /**
   * Set inline styles to an element with Velocity's hook method.
   *
   * @param {HTMLElement} element
   * @param {Object} styles
   */
  function hookStyles(element, styles) {

    for (var prop in styles) {
      Velocity.hook(element, prop, styles[prop]);
    }

  }

  /**
   * Check if an element has a specific class name.
   *
   * @param {HTMLElement} el
   * @param {String} className
   * @returns {Boolean}
   */
  function hasClass(el, className) {

    return (' ' + el.className).indexOf(' ' + className) > -1;

  }

  /**
   * Add class to an element.
   *
   * @param {HTMLElement} el
   * @param {String} className
   */
  function addClass(el, className) {

    if (el.classList) {
      el.classList.add(className);
    }
    else if (hasClass(el, className)) {
      el.className += ' ' + className;
    }

  }

  /**
   * Remove class name from an element.
   *
   * @param {HTMLElement} el
   */
  function removeClass(el, className) {

    if (el.classList) {
      el.classList.remove(className);
    }
    else if (hasClass(el, className)) {
      el.className = (' ' + el.className + ' ').replace(' ' + className + ' ', ' ').trim();
    }

  }

  /**
   * Get element's width/height with padding or with padding, border and margin.
   * If withMargin flag is enabled the function will return an object
   * containing the margin values for each side and the actual dimension also.
   *
   * Borrowed from Mezr library:
   * https://github.com/niklasramo/mezr/blob/732cb1f5810b948b4fe8ffd85132d29543ece831/mezr.js#L511-L609
   *
   * @param {HTMLElement} el
   * @param {String} dimension
   * @param {Boolean} [withMargin=false]
   * @returns {Number|Object}
   */
  function getDimension(el, dimension, withMargin) {

    var ret = el.getBoundingClientRect()[dimension];
    var isHeight = dimension === 'height';
    var dimensionCapitalized = isHeight ? 'Height' : 'Width';
    var innerDimension = 'inner' + dimensionCapitalized;
    var clientDimension = 'client' + dimensionCapitalized;
    var edgeA = isHeight ? 'top' : 'left';
    var edgeB = isHeight ? 'bottom' : 'right';

    if (withMargin) {

      var marginA = parseFloat(getStyle(el, 'margin-' + edgeA));
      var marginB = parseFloat(getStyle(el, 'margin-' + edgeB));
      marginA = marginA > 0 ? marginA : 0;
      marginB = marginB > 0 ? marginB : 0;
      ret += marginA;
      ret += marginB;

    }
    else {

      var borderA;
      var borderB;

      if (el === document.documentElement) {
        ret -= global[innerDimension] - document.documentElement[clientDimension];
      }
      else {
        borderA = parseFloat(getStyle(el, 'border-' + edgeA + '-width'));
        borderB = parseFloat(getStyle(el, 'border-' + edgeB + '-width'));
        ret -= Math.round(ret) - el[clientDimension] - borderA - borderB;
      }

      ret -= borderA !== undefined ? borderA : parseFloat(getStyle(el, 'border-' + edgeA + '-width'));
      ret -= borderB !== undefined ? borderB : parseFloat(getStyle(el, 'border-' + edgeB + '-width'));

    }

    return !withMargin ? ret : {
      marginA: marginA,
      marginB: marginB,
      value: ret
    };

  }

  /**
   * Returns the element's offset, which in practice means the vertical and
   * horizontal distance between the element's northwest corner and the
   * document's northwest corner. This method is a stripped down version of
   * Mezr's offset method and tailored for Muuri specifically. By default the
   * element's "dimension edge" is considered to be the element's padding layer.
   *
   * Borrowed from Mezr library:
   * https://github.com/niklasramo/mezr/blob/732cb1f5810b948b4fe8ffd85132d29543ece831/mezr.js#L643-L714
   *
   * @param {HTMLElement} el
   * @returns {Offset}
   */
  function getOffset(el) {

    var offsetLeft = 0;
    var offsetTop = 0;
    var viewportScrollLeft = parseFloat(global.pageXOffset);
    var viewportScrollTop = parseFloat(global.pageYOffset);

    // For window we just need to get viewport's scroll distance.
    if (el.self === global.self) {
      offsetLeft = viewportScrollLeft;
      offsetTop = viewportScrollTop;
    }

    // For all elements except the document and window we can use the combination of gbcr and
    // viewport's scroll distance.
    else if (el !== document) {
      var gbcr = el.getBoundingClientRect();
      offsetLeft += gbcr.left + viewportScrollLeft + parseFloat(getStyle(el, 'border-left-width'));
      offsetTop += gbcr.top + viewportScrollTop + parseFloat(getStyle(el, 'border-top-width'));
    }

    return {
      left: offsetLeft,
      top: offsetTop
    };

  }

  /**
   * Returns the element's offset parent.
   *
   * Borrowed from Mezr library:
   * https://github.com/niklasramo/mezr/blob/732cb1f5810b948b4fe8ffd85132d29543ece831/mezr.js#L808-L859
   *
   * @param {HTMLElement} el
   * @returns {!HTMLElement}
   */
  function getOffsetParent(el) {

    var isFixed = getStyle(el, 'position') === 'fixed';

    if (isFixed && hasBrokenW3CTELCS) {
      return global;
    }

    var offsetParent = el === document.documentElement || el === global ? document : el.parentElement || null;

    if (isFixed) {
      while (offsetParent && offsetParent !== document && !isTransformed(offsetParent)) {
        offsetParent = offsetParent.parentElement || document;
      }
      return offsetParent === document ? global : offsetParent;
    }
    else {
      while (offsetParent && offsetParent !== document && getStyle(offsetParent, 'position') === 'static' && !isTransformed(offsetParent)) {
        offsetParent = offsetParent.parentElement || document;
      }
      return offsetParent;
    }

  }

  /**
   * Returns true if element is transformed, false if not. In practice the
   * element's display value must be anything else than "none" or "inline" as
   * well as have a valid transform value applied in order to be counted as a
   * transformed element.
   *
   * Borrowed from Mezr library:
   * https://github.com/niklasramo/mezr/blob/732cb1f5810b948b4fe8ffd85132d29543ece831/mezr.js#L302-L317
   *
   * @param {Element} el
   * @returns {Boolean}
   */
  function isTransformed(el) {

    var transform = getStyle(el, supportedTransform.style);
    var display = getStyle(el, 'display');

    return transform !== 'none' && display !== 'inline' && display !== 'none';

  }

  /**
   * Calculate the offset difference of two elements. The target element is is
   * always considered to be Muuri item's element which means that it's margins
   * are considered to be part of it's width and height. The anchor element's
   * width and height however always consist of the core and the padding only.
   *
   * @param {HTMLElement} target
   * @param {HTMLElement} anchor
   * @returns {PlaceData}
   */
  function getOffsetDiff(target, anchor) {

    var anchorOffset = getOffset(anchor);
    var targetZeroPosition = getOffset(getOffsetParent(target) || doc);
    targetZeroPosition.left -= Math.abs(Math.min(parseFloat(getStyle(target, 'margin-left')), 0));
    targetZeroPosition.top -= Math.abs(Math.min(parseFloat(getStyle(target, 'margin-top')), 0));

    return {
      left: anchorOffset.left - targetZeroPosition.left,
      top: anchorOffset.top - targetZeroPosition.top
    };

  }

  /**
   * Get element's scroll parents.
   *
   * Borrowed from jQuery UI library (and heavily modified):
   * https://github.com/jquery/jquery-ui/blob/63448148a217da7e64c04b21a04982f0d64aabaa/ui/scroll-parent.js
   *
   * @param {HTMLElement} element
   * @returns {Array}
   */
  function getScrollParents(element) {

    var ret = [];
    var overflowRegex = /(auto|scroll)/;
    var parent = element.parentNode;

    // If positioning of fixed elements is broken (according to W3C spec).
    if (hasBrokenW3CTELCS) {

      // If the element is fixed it can not have any scroll parents.
      if (getStyle(element, 'position') === 'fixed') {
        return ret;
      }

      // Find scroll parents.
      while (parent && parent !== document && parent !== document.documentElement) {
        if (overflowRegex.test(getStyle(parent, 'overflow') + getStyle(parent, 'overflow-y') + getStyle(parent, 'overflow-x'))) {
          ret[ret.length] = parent;
        }
        parent = getStyle(parent, 'position') === 'fixed' ? null : parent.parentNode;
      }

      // If parent is not fixed element, add window object as the last scroll
      // parent.
      if (parent !== null) {
        ret[ret.length] = global;
      }

    }
    // If fixed elements behave as defined in the W3C specification.
    else {

      // Find scroll parents.
      while (parent && parent !== document) {

        // If the currently looped element is fixed ignore all parents that are
        // not transformed.
        if (getStyle(element, 'position') === 'fixed' && !isTransformed(parent)) {
          parent = parent.parentNode;
          continue;
        }

        // Add the parent element to return items if it is scrollable.
        if (overflowRegex.test(getStyle(parent, 'overflow') + getStyle(parent, 'overflow-y') + getStyle(parent, 'overflow-x'))) {
          ret[ret.length] = parent;
        }

        // Update element and parent references.
        element = parent;
        parent = parent.parentNode;

      }

      // Replace reference of possible root element to window object.
      if (ret.length && ret[ret.length - 1] === document.documentElement) {
        ret[ret.length - 1] = global;
      }

    }

    return ret;

  }

  /**
   * Helpers - Muuri
   * ***************
   */

  /**
   * Calculate how many percent the intersection area of two items is from the
   * maximum potential intersection area between the items.
   *
   * @param {Object} a
   * @param {Object} b
   * @returns {Number} A number between 0-100.
   */
  function getOverlapScore(a, b) {

    var intersection = getIntersection(a, b);

    if (!intersection) {
      return 0;
    }

    var aNonPositioned = {
      width: a.width,
      height: a.height,
      left: 0,
      top: 0
    };

    var bNonPositioned = {
      width: b.width,
      height: b.height,
      left: 0,
      top: 0
    };

    var maxIntersection = getIntersection(aNonPositioned, bNonPositioned);

    return (intersection.width * intersection.height) / (maxIntersection.width * maxIntersection.height) * 100;

  }

  /**
   * Return parsed drag event data.
   *
   * @param {String} type
   * @param {Object} event
   * @param {Object} drag
   * @returns {Object}
   */
  function generateDragEvent(type, event, drag) {

    return {
      type: type,
      event: event,
      currentLeft: drag.left,
      currentTop: drag.top,
      gridLeft: drag.gridX,
      gridTop: drag.gridY
    };

  }

  /**
   * Default drag start predicate handler. The context of the function is
   * always a temporary object which is gets reset on each draginit event.
   *
   * @param {Object} e
   * @param {Muuri.Item} item
   * @param {Function} resolve
   */
  function dragPredicate(e, item, resolve) {

    if (!this.isResolved) {
      this.isResolved = true;
      resolve(e);
    }

  }

  /**
   * Lock dragged element's dimensions.
   *
   * @param {Object} data
   */
  function lockElementSize(data) {

    // Don't override existing element styles.
    if (!data.elementStyles) {

      var styles = ['width', 'height', 'padding', 'margin'];

      // Reset element styles.
      data.elementStyles = {};

      // Store current inline style values.
      for (var i = 0; i < 4; i++) {
        var style = styles[i];
        var value = data.element.style[style];
        data.elementStyles[style] = value || '';
      }

      // Set effective values as inline styles.
      for (var i = 0; i < 4; i++) {
        var style = styles[i];
        data.element.style[style] = getStyle(data.element, style);
      }

    }

  }

  /**
   * Unlock dragged element's dimensions.
   *
   * @param {Object} data
   */
  function unlockElementSize(data) {

    if (data.elementStyles) {
      for (var style in data.elementStyles) {
        data.element.style[style] = data.elementStyles[style];
      }
    }

  }

  /**
   * Show/hide Muuri instance's items.
   *
   * @private
   * @param {Muuri} inst
   * @param {String} method - "show" or "hide".
   * @param {Array|HTMLElement|Muuri.Item|Number} items
   * @param {Boolean} [instant=false]
   * @param {Function} [callback]
   */
  function showHideHandler(inst, method, items, instant, callback) {

    // Sanitize items.
    items = inst.get(items);

    // Sanitize callback.
    callback = typeof instant === 'function' ? instant : callback;

    var counter = items.length;

    // If there are no items call the callback, but don't emit any events.
    if (!counter) {

      if (typeof callback === 'function') {
        callback(items);
      }

    }
    // If we have some items let's dig in.
    else {

      var isShow = method === 'show';
      var startEvent = isShow ? evShowStart : evHideStart;
      var endEvent = isShow ? evShowEnd : evHideEnd;
      var isInstant = instant === true;
      var completed = [];
      var needsRelayout = false;
      var hiddenItems = [];

      // Emit showstart event.
      inst._emitter.emit(startEvent, items);

      // Show/hide items. The loop cycle must be wrapped in a function in order
      // to keep the correct reference of the item for the asynchronous callback
      // of the item's private show/hide method.
      for (var i = 0, len = items.length; i < len; i++) {

        var item = items[i];

        // Check if relayout or refresh is needed.
        if ((isShow && !item._active) || (!isShow && item._active)) {
          needsRelayout = true;
          if (isShow) {
            item._noLayoutAnimation = true;
            hiddenItems[hiddenItems.length] = item;
          }
        }

        // Hide/show the item.
        item['_' + method](isInstant, function (interrupted, item) {

          // If the current item's animation was not interrupted add it to the
          // completed set.
          if (!interrupted) {
            completed[completed.length] = item;
          }

          // If all items have finished their animations call the callback
          // and emit the event.
          if (--counter < 1) {
            if (typeof callback === 'function') {
              callback(completed);
            }
            inst._emitter.emit(endEvent, completed);
          }

        });

      }

      // Relayout only if needed.
      if (needsRelayout) {
        if (hiddenItems.length) {
          inst.refresh(hiddenItems);
        }
        inst.layout();
      }

    }

  }

  /**
   * Default item show/hide animation flow. Returns and object that contains
   * the animation start and stop method.
   *
   * @param {Object} opts
   * @param {Boolean} [isShow]
   * @returns {Object}
   */
  function showHideAnimation(opts, isShow) {

    var duration = (opts && opts.duration) || 0;
    var easing = (opts && opts.easing) || 'ease-out';

    if (!duration) {
      return {
        start: noop,
        stop: noop
      };
    }
    else {
      var targetStyles = isShow ? {opacity: 1, scale: 1} : {opacity: 0, scale: 0.5};
      return {
        start: function (item, instant, animDone) {
          if (instant) {
            hookStyles(item._child, targetStyles);
          }
          else {
            Velocity(item._child, targetStyles, {
              duration: duration,
              easing: easing,
              queue: item._muuri._animQueue,
              complete: animDone
            });
            Velocity.Utilities.dequeue(item._child, item._muuri._animQueue);
          }
        },
        stop: function (item) {
          Velocity(item._child, 'stop', item._muuri._animQueue);
        }
      };
    }

  }

  /**
   * Process item's callback queue.
   *
   * @private
   * @param {Array} queue
   * @param {Boolean} interrupted
   * @param {Muuri.Item} instance
   */
  function processQueue(queue, interrupted, instance) {

    var snapshot = queue.splice(0, queue.length);
    for (var i = 0, len = snapshot.length; i < len; i++) {
      snapshot[i](interrupted, instance);
    }

  }

  /**
   * Init
   */

  return Muuri;

}));
