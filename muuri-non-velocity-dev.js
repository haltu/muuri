/*!
 * Muuri v0.3.0-dev
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

TODO v0.3.0
===========
* [x] Review/refactor the codebase to be less prone to errors.
      - [x] Move variables to the top of the function scope.
      - [x] Use native array methods instead of for loops where reasonable.
      - [x] Use .push() instead of arr[arr.length] = 'foo'.
      - [x] Optimize all functions where arguments is used.
* [x] Bring in Mezr 0.6.0 as a hard dependency.
* [x] When dragging items, don't count margins as part of the item.
* [x] Allow defining custom drag predicate.
* [~] Deprecate Velocity.js hard dependency and embrace BYO attitude. By default
      Muuri should use CSS transitions, but also allow using any animation
      library via adapters.
* [ ] Deprecate Mezr as a hard dependency. Instead, fork it and include a
      stripped down version of it inlined.
* [ ] More unit tests.
* [ ] Create an ESLint config for the project.
* [ ] Allow dropping on empty slots (gaps).
* [ ] Optional drag placeholder.
* [ ] Reset method which safely updates options. Main use case is making it
      possible to toggle drag on and off.
* [ ] Stagger option(s) to achieve similar animations as shuffle.js.
* [ ] Perf optimizations.
     - [ ] If array's size is known use new Array(size) to initialize array.
     - [ ] No more for in loops.
*/

(function (global, factory) {

  var libName = 'Muuri';
  var mezr = global.mezr;
  var Hammer = global.Hammer;

  global[libName] = factory(global, mezr, Hammer);

}(this, function (global, mezr, Hammer, undefined) {

  'use strict';

  var libName = 'Muuri';

  // Check that we have mezr.
  if (!mezr) {
    throw Error('[' + libName + '] required dependency mezr is not defined.');
  }

  var uuid = 0;
  var noop = function () {};
  var raf = global.requestAnimationFrame ||
            global.webkitRequestAnimationFrame ||
            global.mozRequestAnimationFrame ||
            global.msRequestAnimationFrame ||
            global.oRequestAnimationFrame ||
            null;

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

    listeners.push(listener);
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
    var argsLength;
    var i;

    if (listenersLength) {

      argsLength = arguments.length - 1;
      listeners = listeners.concat();

      for (i = 0; i < listenersLength; i++) {
        argsLength === 0 ? listeners[i]() :
        argsLength === 1 ? listeners[i](arg1) :
        argsLength === 2 ? listeners[i](arg1, arg2) :
                           listeners[i](arg1, arg2, arg3);
      }

    }

    return this;

  };

  /* TODO: Miniscule CSS transition controller to replace Velocity. */

  function Animate(elem) {

    this._element = elem;
    this._isAnimating = false;
    this._animatedStyles = [];
    this._callback = null;

  }

  Animate.prototype.start = function (props, opts) {

    // TODO: Add some intelligence by comparing the new props to old props. If
    // a prop is already in the target value don't add it to the list of
    // animated styles.

    var inst = this;
    var elem = inst._element;
    var styleProps = props || {};
    var options = opts || {};
    var done = options.done;
    var animatedStyles = Object.keys(styleProps);
    var transProps = {
      transitionProperty: animatedStyles.join(','),
      transitionDuration: (options.duration || 400) + 'ms',
      transitionDelay: (options.delay || 0) + 'ms',
      transitionEasing: options.easing || 'ease'
    };

    // Stop current animation.
    inst.stop();

    // Store animated styles.
    inst._animatedStyles = animatedStyles;

    // Set as animating.
    inst._isAnimating = true;

    // Bind callback.
    inst._callback = function () {
      inst.stop();
      if (typeof done === 'function') {
        done();
      }
    };
    elem.addEventListener('transitionend', inst._callback, true);

    // Set transition styles.
    setStyles(elem, transProps);

    // Set target styles.
    setStyles(elem, styleProps);

  };

  Animate.prototype.stop = function () {

    var inst = this;
    var styles = {};

    // If is animating.
    if (inst._isAnimating) {

      // Unbind transitionend listener.
      if (typeof inst._callback === 'function') {
        inst._element.removeEventListener('transitionend', inst._callback, true);
        inst._callback = null;
      }

      // Get current values of all animated styles.
      inst._animatedStyles.forEach(function (styleName) {
        styles[styleName] = getStyle(inst._element, styleName);
      });

      // Add transition props to styles.
      styles['transitionProperty'] = '';
      styles['transitionDuration'] = '';
      styles['transitionDelay'] = '';
      styles['transitionEasing'] = '';

      // Set animating state as false.
      inst._isAnimating = false;

      // Set styles.
      setStyles(inst._element, styles);

    }

  };

  Animate.prototype.isAnimating = function () {

    return this._isAnimating;

  };

  Animate.prototype.destroy = function () {

    this.stop();
    this._element = null;
    this._isAnimating = null;
    this._animatedStyles = null;
    this._callback = null;

  };

  /**
   * LayoutFirstFit v0.3.0
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
    layout.items.forEach(function (item) {

      var slot = LayoutFirstFit.getSlot(layout, emptySlots, item._width, item._height, !isHorizontal, fillGaps);

      // Update layout width/height.
      if (isHorizontal) {
        layout.width = Math.max(layout.width, slot.left + slot.width);
      }
      else {
        layout.height = Math.max(layout.height, slot.top + slot.height);
      }

      // Add slot to slots data.
      layout.slots[item._id] = slot;

    });

    // If the alignment is set to right or bottom, we need to adjust the
    // results.
    if (alignRight || alignBottom) {
      Object.keys(layout.slots).forEach(function (slotId) {

        var slot = layout.slots[slotId];

        if (alignRight) {
          slot.left = layout.width - (slot.left + slot.width);
        }

        if (alignBottom) {
          slot.top = layout.height - (slot.top + slot.height);
        }

      });
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
        newSlots.push({
          left: 0,
          top: layout.height,
          width: item.left,
          height: Infinity
        });
      }

      // If item is not aligned to the right edge, create a new slot.
      if ((item.left + item.width) < layout.width) {
        newSlots.push({
          left: item.left + item.width,
          top: layout.height,
          width: layout.width - item.left - item.width,
          height: Infinity
        });
      }

      // Update grid height.
      layout.height = item.top + item.height;

    }

    // In horizontal mode, if the item's right overlaps the grid's right edge.
    if (!vertical && (item.left + item.width) > layout.width) {

      // If item is not aligned to the top, create a new slot.
      if (item.top > 0) {
        newSlots.push({
          left: layout.width,
          top: 0,
          width: Infinity,
          height: item.top
        });
      }

      // If item is not aligned to the bottom, create a new slot.
      if ((item.top + item.height) < layout.height) {
        newSlots.push({
          left: layout.width,
          top: item.top + item.height,
          width: Infinity,
          height: layout.height - item.top - item.height
        });
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
          newSlots.push(slot);
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
    var ii;
    var slotA;
    var slotB;

    while (i--) {
      slotA = slots[i];
      ii = slots.length;
      while (ii--) {
        slotB = slots[ii];
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
        ret.push({
          left: a.left,
          top: a.top,
          width: b.left - a.left,
          height: a.height
        });
      }

      // Right split.
      if ((a.left + a.width) > (b.left + b.width)) {
        ret.push({
          left: b.left + b.width,
          top: a.top,
          width: (a.left + a.width) - (b.left + b.width),
          height: a.height
        });
      }

      // Top split.
      if (a.top < b.top) {
        ret.push({
          left: a.left,
          top: a.top,
          width: a.width,
          height: b.top - a.top
        });
      }

      // Bottom split.
      if ((a.top + a.height) > (b.top + b.height)) {
        ret.push({
          left: a.left,
          top: b.top + b.height,
          width: a.width,
          height: (a.top + a.height) - (b.top + b.height)
        });
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
    var debounced;

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

    // Create private eventize instance.
    inst._emitter = new Emitter();

    // Setup show and hide animations for items.
    inst._itemShow = typeof stn.show === 'function' ? stn.show() : animateVisibility(stn.show, 'show');
    inst._itemHide = typeof stn.hide === 'function' ? stn.hide() : animateVisibility(stn.hide, 'hide');

    // Setup drag sort handler.
    inst._dragSort = typeof stn.dragSortPredicate === 'function' ? stn.dragSortPredicate : dragSortHandler;

    // Setup initial items.
    inst._items = [].concat(stn.items).map(function (elem) {
      return new Muuri.Item(inst, elem);
    });

    // Relayout on window resize if enabled.
    if (stn.layoutOnResize || stn.layoutOnResize === 0) {

      debounced = debounce(function () {
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

    var index;
    var ret;
    var item;
    var i;

    // If no target is specified, return the first item or null.
    if (!target) {

      return this._items[0] || null;

    }
    // If the target is instance of Muuri.Item return it if it is attached to
    // the this Muuri instance, otherwise return null.
    else if (target instanceof Muuri.Item) {

      return target._muuri === this ? target : null;

    }
    // If target is number return the item in that index. If the number is lower
    // than zero look for the item starting from the end of the items array. For
    // example -1 for the last item, -2 for the second last item, etc.
    else if (typeof target === 'number') {

      index = target > -1 ? target : this._items.length + target;

      return this._items[index] || null;

    }
    // In other cases let's assume that the target is an element, so let's try
    // to find an item that matches the element and return it. If item is not
    // found return null.
    else {

      ret = null;

      for (i = 0; i < this._items.length; i++) {
        item = this._items[i];
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
    var targetItems = this.get(items || 'active');

    // Refresh dimensions.
    targetItems.forEach(function (item) {
      item._refresh();
    });

    // Emit refresh event.
    this._emitter.emit(evRefresh, targetItems);

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
    var targetItems = hasTargets ? [].concat(targets) : null;
    var targetState = !hasTargets ? targets : state;
    var ret = [];

    // Sanitize target state.
    targetState = typeof targetState === 'string' ? targetState : null;

    // If target state or target items are defined return filtered results.
    if (targetState || targetItems) {

      (targetItems || this._items).forEach(function (val) {
        var item = hasTargets ? this._getItem(val) : val;
        if (item && (!targetState || (targetState === 'active' && item._active) || (targetState === 'inactive' && !item._active))) {
          ret.push(item);
        }
      }, this);

      return ret;

    }

    // Otherwise return all items.
    else {

      return ret.concat(this._items);

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
   * @param {Number} [index=-1]
   * @returns {Array}
   */
  Muuri.prototype.add = function (elements, index) {

    var newItems = [];
    var needsRelayout = false;

    // Make sure elements is an array.
    elements = [].concat(elements);

    // Filter out all elements that exist already in current instance.
    this._items.forEach(function (item) {
      var elemIndex = elements.indexOf(item._element);
      if (elemIndex > -1) {
        elements.splice(elemIndex, 1);
      }
    });

    // Return early if there are no valid items.
    if (!elements.length) {
      return newItems;
    }

    // Create new items.
    elements.forEach(function (elem) {
      var item = new Muuri.Item(this, elem);
      newItems.push(item);
      if (item._active) {
        needsRelayout = true;
        item._noLayoutAnimation = true;
      }
    }, this);

    // Normalize the index for the splice apply hackery so that value of -1
    // appends the new items to the current items.
    index = typeof index === 'number' ? index : -1;
    index = index < 0 ? this._items.length - index + 1 : index;

    // Add the new items to the items collection to correct index.
    this._items.splice.apply(this._items, [index, 0].concat(newItems));

    // If relayout is needed.
    if (needsRelayout) {
      this.layout();
    }

    // Emit add event.
    this._emitter.emit(evAdd, newItems);

    // Return new items.
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

    this.get(items).forEach(function (item) {

      // Check if refresh is needed.
      if (item._active) {
        needsRelayout = true;
      }

      // Remove item.
      indices.push(item._destroy(removeElement));

    });

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

    this._items.forEach(function (item) {
      if (item._element.parentNode === this._element) {
        this._element.appendChild(item._element);
      }
    }, this);

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
    var cb = typeof instant === 'function' ? instant : callback;
    var isInstant = instant === true;
    var layout = new Muuri.Layout(inst);
    var counter = -1;
    var itemsLength = layout.items.length;
    var completed = [];
    var tryFinish = function (interrupted, item) {

      // Push all items to the completed items array which were not interrupted.
      if (!interrupted) {
        completed.push(item);
      }

      // If container and all items have finished their animations (if any).
      if (++counter === itemsLength) {

        // Call callback.
        if (typeof cb === 'function') {
          cb(completed, layout);
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

      layout.items.forEach(function (item) {

        var position = layout.slots[item._id];

        // Update item's position.
        item._left = position.left;
        item._top = position.top;

        // Layout non-dragged items.
        if (item._drag.active) {
          tryFinish(false, item);
        }
        else {
          item._layout(isInstant, tryFinish);
        }

      });

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

    toggleVisibility(this, 'show', items, instant, callback);

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

    toggleVisibility(this, 'hide', items, instant, callback);

  };

  /**
   * Get item's index. Returns -1 if the item is not found.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {HTMLElement|Muuri.Item|Number} item
   * @returns {Number}
   */
  Muuri.prototype.indexOf = function (item) {

    var i;
    var len;

    // If item is a number assume it is an index and verify that an item exits
    // in that index. If it exists, return the index. Otherwise return -1.
    if (typeof item === 'number') {

      return item <= (this._items.length - 1) ? item : -1;

    }

    // If the item is a Muuri item get it's index or return -1 if the item
    // does not exist in the Muuri instance.
    else if (item instanceof Muuri.Item) {

      return this._items.indexOf(item);

    }
    else {

      for (i = 0, len = this._items.length; i < len; i++) {
        if (this._items[i]._element === item) {
          return i;
        }
      }

      return -1;

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
    this._items.concat().forEach(function (item) {
      item._destroy();
    });

    // Restore container.
    removeClass(this._element, this._settings.containerClass);
    setStyles(this._element, {
      height: ''
    });

    // Emit destroy event.
    this._emitter.emit(evDestroy);

    // Remove all event listeners.
    if (this._emitter._events) {
      Object.keys(this._emitter._events).forEach(function (eventName) {
        this._emitter._events[eventName].length = 0;
      }, this);
    }

    // Render the instance unusable -> nullify all Muuri related properties.
    Object.keys(this).concat(Object.keys(Muuri.prototype)).forEach(function (propName) {
      this[propName] = null;
    }, this);

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

    var stn = muuri._settings;
    var isHidden;

    // Make sure the item element is not a parent of the grid container element.
    if (element.contains(muuri._element)) {
      throw new Error('Item element must not be a parent of the grid container element');
    }

    // If the provided item element is not a direct child of the grid container
    // element, append it to the grid container.
    if (element.parentNode !== muuri._element) {
      muuri._element.appendChild(element);
    }

    // Check if the element is hidden.
    isHidden = getStyle(element, 'display') === 'none';

    // Instance id.
    this._id = ++uuid;
    this._muuri = muuri;
    this._element = element;
    this._child = element.children[0];
    this._animate = new Animate(element);
    this._animateChild = new Animate(this._child);

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
    this._visibilityQueue = [];

    // Layout animation callback queue. Whenever a callback is provided for
    // layout method and animation is enabled the callback is stored temporarily
    // to this array. The callbacks are called with the first argument as false
    // if the animation succeeded without interruptions and with the first
    // argument as true if the animation was interrupted.
    this._layoutQueue = [];

    // Set element's initial position.
    setStyles(this._element, {
      left: '0',
      top: '0',
      transform: 'translateX(0px) translateY(0px)'
    });

    // Set hidden/shown class.
    addClass(element, isHidden ? stn.hiddenClass : stn.shownClass);

    // Set hidden/shown styles for the child element.
    setStyles(this._child, {
      opacity: isHidden ? 0 : 1,
      transform: isHidden ? 'scale(0.5)' : 'scale(1)'
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
      visibility: this._hiding ? 'hiding' :
                  this._showing ? 'showing' :
                  this._hidden ? 'hidden' : 'shown'
    };

  };

  /**
   * Make the item draggable with Hammer.js.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._initDrag = function () {

    // Check that we have Hammer.
    if (!Hammer) {
      throw Error('[' + libName + '] required dependency Hammer is not defined.');
    }

    var inst = this;
    var stn = inst._muuri._settings;
    var drag = inst._drag;
    var predicateResolved = false;
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
    hammer.set({touchAction: 'none'});

    // Setup initial release data.
    inst._resetReleaseData();

    // Setup initial drag data.
    inst._resetDragData();

    // Add overlap checker function to drag data.
    drag.checkOverlap = debounce(function () {
      if (drag.active) {
        inst._checkOverlap();
      }
    }, stn.dragSortInterval);

    // Add predicate related data to drag data.
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

    // Hammer event data.
    drag.start = null;
    drag.lastMove = null;
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
    var currentLeft;
    var currentTop;
    var muuriContainer;
    var dragContainer;
    var offsetDiff;
    var elemGbcr;

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
    drag.lastMove = e;
    drag.move = e;
    drag.item = this;
    drag.element = this._element;

    // Get element's current position.
    currentLeft = getTranslateValue(drag.element, 'x');
    currentTop = getTranslateValue(drag.element, 'y');

    // Get container references.
    muuriContainer = this._muuri._element;
    dragContainer = stn.dragContainer;

    // Set initial left/top drag value.
    drag.left = drag.gridX = currentLeft;
    drag.top = drag.gridY = currentTop;

    // If a specific drag container is set and it is different from the
    // default muuri container we need to cast some extra spells.
    if (dragContainer && dragContainer !== muuriContainer) {

      // If dragged element is already in drag container.
      if (drag.element.parentNode === dragContainer) {

        // Get offset diff.
        offsetDiff = getOffsetDiff(drag.element, muuriContainer);

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
        offsetDiff = getOffsetDiff(drag.element, muuriContainer);

        // Store the container offset diffs to drag data.
        drag.containerDiffX = offsetDiff.left;
        drag.containerDiffY = offsetDiff.top;

        // Set up drag position data.
        drag.left = currentLeft + drag.containerDiffX;
        drag.top = currentTop + drag.containerDiffY;

        // Fix position to account for the append procedure.
        setStyles(drag.element, {
          transform: 'translateX(' + drag.left + 'px) translateY(' + drag.top + 'px)'
        });

      }

    }

    // Get and store element's current offset from window's northwest corner.
    elemGbcr = drag.element.getBoundingClientRect();
    drag.elemClientX = elemGbcr.left;
    drag.elemClientY = elemGbcr.top;

    // Get drag scroll parents.
    drag.scrollParents = getScrollParents(drag.element);
    if (dragContainer && dragContainer !== muuriContainer) {
      drag.scrollParents = arrayUnique(drag.scrollParents.concat(getScrollParents(muuriContainer)));
    }

    // Bind scroll listeners.
    drag.scrollParents.forEach(function (scrollParent) {
      scrollParent.addEventListener('scroll', drag.onScroll);
    });

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
    var xDiff;
    var yDiff;

    // If item is not active, reset drag.
    if (!this._active) {
      this._resetDrag();
      return;
    }

    // Get delta difference from last dragmove event.
    xDiff = e.deltaX - drag.move.deltaX;
    yDiff = e.deltaY - drag.move.deltaY;

    // Update move events.
    drag.lastMove = drag.move;
    drag.move = e;

    // Update position data.
    drag.left += xDiff;
    drag.top += yDiff;
    drag.gridX += xDiff;
    drag.gridY += yDiff;
    drag.elemClientX += xDiff;
    drag.elemClientY += yDiff;

    // Update element's translateX/Y values.
    setStyles(drag.element, {
      transform: 'translateX(' + drag.left + 'px) translateY(' + drag.top + 'px)'
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
    var muuriContainer = this._muuri._element;
    var dragContainer = stn.dragContainer;
    var elemGbcr = drag.element.getBoundingClientRect();
    var xDiff = drag.elemClientX - elemGbcr.left;
    var yDiff = drag.elemClientY - elemGbcr.top;
    var offsetDiff;

    // Update container diff.
    if (dragContainer && dragContainer !== muuriContainer) {

      // Get offset diff.
      offsetDiff = getOffsetDiff(drag.element, muuriContainer);

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
    setStyles(drag.element, {
      transform: 'translateX(' + drag.left + 'px) translateY(' + drag.top + 'px)'
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

    // Remove scroll listeners.
    drag.scrollParents.forEach(function (scrollParent) {
      scrollParent.removeEventListener('scroll', drag.onScroll);
    });

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
  Muuri.Item.prototype._resetDrag = function () {

    var drag = this._drag;
    var stn = this._muuri._settings;

    // Remove scroll listeners.
    drag.scrollParents.forEach(function (scrollParent) {
      scrollParent.removeEventListener('scroll', drag.onScroll);
    });

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
      setStyles(release.element, {
        transform: 'translateX(' + this._left + 'px) translateY(' + this._top + 'px)'
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
   * @todo
   * - Optimize for all layout methods which's order is guaranteed (no empty gap
   *   filling). Do the check only for those items which overlap the dragged
   *   item.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._checkOverlap = function () {

    var muuri = this._muuri;
    var sortResult = muuri._dragSort(this);
    var items;
    var action;
    var from;
    var to;
    var elemFrom;
    var elemTo;

    if (sortResult) {

      items = muuri._items;
      action = sortResult.action || 'move';
      from = sortResult.from;
      to = sortResult.to;
      elemFrom = items[from]._element;
      elemTo = items[to]._element;

      if (action === 'swap') {
        arraySwap(items, from, to);
        muuri._emitter.emit(evSwap, elemFrom, elemTo);
      }
      else {
        arrayMove(items, from, to);
        muuri._emitter.emit(evMove, elemFrom, elemTo);
      }

      muuri.layout();

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
      this._animate.stop();

      // Remove positioning class.
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
      this._width = Math.round(mezr.width(this._element, 'margin'));
      this._height = Math.round(mezr.height(this._element, 'margin'));
      this._margin = {};
      ['left', 'right', 'top', 'bottom'].forEach(function (val) {
        this._margin[val] = Math.round(getStyleAsFloat(this._element, 'margin-' + val));
      }, this);
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
    var animDuration = isJustReleased ? stn.dragReleaseDuration : stn.layoutDuration;
    var animEasing = isJustReleased ? stn.dragReleaseEasing : stn.layoutEasing;
    var animEnabled = instant === true || inst._noLayoutAnimation ? false : animDuration > 0;
    var isPositioning = inst._positioning;
    var offsetLeft;
    var offsetTop;
    var currentLeft;
    var currentTop;
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
      inst._layoutQueue.push(callback);
    }

    // Mark release positiong as started.
    if (isJustReleased) {
      release.positioningStarted = true;
    }

    // Get item container offset. This applies only for release handling in the
    // scenario where the released element is not currently within the muuri
    // container.
    offsetLeft = inst._release.active ? inst._release.containerDiffX : 0;
    offsetTop = inst._release.active ? inst._release.containerDiffY : 0;

    // If no animations are needed, easy peasy!
    if (!animEnabled) {

      if (inst._noLayoutAnimation) {
        inst._noLayoutAnimation = false;
      }

      setStyles(inst._element, {
        transform: 'translateX(' + (inst._left + offsetLeft) + 'px) translateY(' + (inst._top + offsetTop) + 'px)'
      });

      finish();

    }

    // If animations are needed, let's dive in.
    else {

      // Get current (relative) left and top position. Meaning that the
      // drga container's offset (if applicable) is subtracted from the current
      // translate values.
      currentLeft = getTranslateValue(inst._element, 'x') - offsetLeft;
      currentTop = getTranslateValue(inst._element, 'y') - offsetTop;

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

      // Animate.
      inst._animate.start({
        transform: 'translateX(' + (inst._left + offsetLeft) + 'px) translateY(' + (inst._top + offsetTop) + 'px)'
      }, {
        duration: animDuration,
        easing: animEasing,
        done: finish
      });

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
        inst._visibilityQueue.push(callback);
      }

    }

    // If item is hidden or animating to hidden.
    else {

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
      processQueue(inst._visibilityQueue, true, inst);

      // Update state.
      inst._showing = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibilityQueue.push(callback);
      }

      // Animate child element.
      inst._muuri._itemShow.start(inst, instant, function () {

        // Process callback queue.
        processQueue(inst._visibilityQueue, false, inst);

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
        inst._visibilityQueue.push(callback);
      }

    }

    // If item is visible or animating to visible.
    else {

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
      processQueue(inst._visibilityQueue, true, inst);

      // Update state.
      inst._hiding = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibilityQueue.push(callback);
      }

      // Animate child element.
      inst._muuri._itemHide.start(inst, instant, function () {

        // Hide element.
        setStyles(inst._element, {
          display: 'none'
        });

        // Process callback queue.
        processQueue(inst._visibilityQueue, false, inst);

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
    var stn = muuri._settings;
    var element = this._element;
    var index = muuri._items.indexOf(this);

    // Stop animations.
    this._stopLayout();
    muuri._itemShow.stop(this);
    muuri._itemHide.stop(this);

    // If item is being released, stop it gracefully.
    if (this._release.active) {
      if (element.parentNode !== muuri._element) {
        muuri._element.appendChild(element);
      }
      this._resetReleaseData();
    }

    // If item is being dragged, stop it gracefully.
    if (this._drag.active) {
      if (element.parentNode !== muuri._element) {
        muuri._element.appendChild(element);
      }
      this._resetDrag();
    }

    // Destroy Hammer instance and custom touch listeners.
    if (this._hammer) {
      this._hammer.destroy();
    }

    // Destroy animation handlers.
    this._animate.destroy();
    this._animateChild.destroy();

    // Remove all inline styles.
    element.removeAttribute('style');
    this._child.removeAttribute('style');

    // Handle visibility callback queue, fire all uncompleted callbacks with
    // interrupted flag.
    processQueue(this._visibilityQueue, true, this);

    // Remove Muuri specific classes.
    removeClass(element, stn.positioningClass);
    removeClass(element, stn.draggingClass);
    removeClass(element, stn.releasingClass);
    removeClass(element, stn.itemClass);
    removeClass(element, stn.shownClass);
    removeClass(element, stn.hiddenClass);

    // Remove item from Muuri instance if it still exists there.
    if (index > -1) {
      muuri._items.splice(index, 1);
    }

    // Remove element from DOM.
    if (removeElement) {
      element.parentNode.removeChild(element);
    }

    // Render the instance unusable -> nullify all Muuri related properties.
    Object.keys(this).concat(Object.keys(Muuri.Item.prototype)).forEach(function (propName) {
      this[propName] = null;
    }, this);

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
    var noSettingsProvided;
    var methodName;

    this.muuri = muuri;
    this.items = items ? items.concat() : muuri.get('active');
    this.slots = {};
    this.width = 0;
    this.height = 0;
    this.setWidth = false;
    this.setHeight = false;

    // Calculate the current width and height of the container.
    this.width = mezr.width(muuri._element, 'padding');
    this.height = mezr.height(muuri._element, 'padding');

    // If the user has provided custom function as a layout method invoke it.
    if (typeof stn === 'function') {

      stn.call(this);

    }

    // Otherwise parse the layout mode and settings from provided options and
    // do the calculations.
    else {

      // Parse the layout method name and settings from muuri settings.
      noSettingsProvided = typeof stn === 'string';
      methodName = noSettingsProvided ? stn : stn[0];

      // Make sure the provided layout method exists.
      if (typeof Muuri.Layout.methods[methodName] !== 'function') {
        throw new Error('Layout method "' + methodName + '" does not exist.');
      }

      // Invoke the layout method.
      Muuri.Layout.methods[methodName].call(this, noSettingsProvided ? {} : stn[1]);

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
   * @property {Number} layoutDuration
   * @property {Array|String} layoutEasing
   * @property {!Function|Object} show
   * @property {Number} [show.duration=300]
   * @property {String} [show.easing='ease-out']
   * @property {!Function|Object} hide
   * @property {Number} [hide.duration=300]
   * @property {String} [hide.easing='ease-out']
   * @property {Array|String} layout
   * @property {!Number} layoutOnResize
   * @property {Boolean} layoutOnInit
   * @property {Boolean} dragEnabled
   * @property {!HtmlElement} dragContainer
   * @property {!Function} dragPredicate
   * @property {Boolean} dragSort
   * @property {Number} dragSortInterval
   * @property {!Function|Object} dragSortHandler
   * @property {Number} dragSortHandler.tolerance
   * @property {String} dragSortHandler.action
   * @property {Number} dragReleaseDuration
   * @property {Array|String} dragReleaseEasing
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

    // Show/hide animations
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
    layoutDuration: 300,
    layoutEasing: 'ease-out',

    // Drag & Drop
    dragEnabled: false,
    dragContainer: null,
    dragPredicate: null,
    dragSort: true,
    dragSortInterval: 50,
    dragSortPredicate: {
      tolerance: 50,
      action: 'move'
    },
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

    array.forEach(function (val) {
      if (ret.indexOf(val) < 0) {
        ret.push(val);
      }
    });

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

    var len = arguments.length;
    var i;

    for (i = 1; i < len; i++) {
      Object.keys(arguments[i]).forEach(function (prop) {
        if (isPlainObject(dest[prop]) && isPlainObject(this[prop])) {
          mergeObjects(dest[prop], this[prop]);
        }
        else {
          dest[prop] = this[prop];
        }
      }, arguments[i]);
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
   * Returns the element's translateX/Y value as a float. Assumes that the
   * translate value is defined as pixels.
   *
   * @param {HTMLElement} element
   * @param {String} axis
   * @returns {Number}
   */
  function getTranslateValue(element, axis) {

    return parseFloat((getStyle(element, 'transform') || '').split('translate' + axis.toUpperCase() + '(')[1]) || 0;

  }

  /**
   * Returns the computed value of an element's style property transformed into
   * a float value.
   *
   * @private
   * @param {HTMLElement} el
   * @param {String} style
   * @returns {Number}
   */
  function getStyleAsFloat(el, style) {

    return parseFloat(getStyle(el, style)) || 0;

  }

  /**
   * Set inline styles to an element.
   *
   * @param {HTMLElement} element
   * @param {Object} styles
   */
  function setStyles(element, styles) {

    Object.keys(styles).forEach(function (styleName) {
      element.style[styleName] = styles[styleName];
    });

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
   * Returns true if element is transformed, false if not. In practice the element's display value
   * must be anything else than "none" or "inline" as well as have a valid transform value applied
   * in order to be counted as a transformed element.
   *
   * Borrowed from Mezr (v0.6.0):
   * https://github.com/niklasramo/mezr/blob/0.6.0/mezr.js#L658
   *
   * @private
   * @param {HTMLElement} el
   * @returns {Boolean}
   */
  function isTransformed(el) {

    var transform = getStyle(el, mezr._settings.transform.styleName);
    var display = getStyle(el, 'display');

    return transform !== 'none' && display !== 'inline' && display !== 'none';

  }

  /**
   * Calculate the offset difference between target's containing block and the
   * anchor.
   *
   * @param {HTMLElement} target
   * @param {HTMLElement} anchor
   * @returns {PlaceData}
   */
  function getOffsetDiff(target, anchor) {

    return mezr.offset([anchor, 'padding'], [mezr.containingBlock(target) || document, 'padding']);

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

    // If transformed elements leak fixed elements.
    if (mezr._settings.transformLeaksFixed) {

      // If the element is fixed it can not have any scroll parents.
      if (getStyle(element, 'position') === 'fixed') {
        return ret;
      }

      // Find scroll parents.
      while (parent && parent !== document && parent !== document.documentElement) {
        if (overflowRegex.test(getStyle(parent, 'overflow') + getStyle(parent, 'overflow-y') + getStyle(parent, 'overflow-x'))) {
          ret.push(parent);
        }
        parent = getStyle(parent, 'position') === 'fixed' ? null : parent.parentNode;
      }

      // If parent is not fixed element, add window object as the last scroll
      // parent.
      if (parent !== null) {
        ret.push(global);
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
          ret.push(parent);
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
   * @returns {Object}
   *   - An object with two properties: "score" and "intersection". The score is
   *     a number between 0-100. The intersection is an object containing the
   *     data for the intersection area.
   */
  function getSortOverlapData(a, b) {

    var ret = {
      intersection: mezr.intersection(a, b),
      score: 0
    };

    if (!ret.intersection) {
      return ret;
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

    var maxIntersection = mezr.intersection(aNonPositioned, bNonPositioned);

    ret.score = (ret.intersection.width * ret.intersection.height) / (maxIntersection.width * maxIntersection.height) * 100;

    return ret;

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

      // Reset element styles.
      data.elementStyles = {};

      ['width', 'height', 'padding', 'margin'].forEach(function (styleName) {

        // Store current inline style values.
        data.elementStyles[styleName] = data.element.style[styleName] || '';

        // Set effective values as inline styles.
        data.element.style[styleName] = getStyle(data.element, styleName);

      });

    }

  }

  /**
   * Unlock dragged element's dimensions.
   *
   * @param {Object} data
   */
  function unlockElementSize(data) {

    if (data.elementStyles) {
      Object.keys(data).forEach(function (styleName) {
        data.element.style[styleName] = data.elementStyles[styleName];
      });
    }

  }

  /**
   * Show or hide Muuri instance's items.
   *
   * @private
   * @param {Muuri} inst
   * @param {String} method - "show" or "hide".
   * @param {Array|HTMLElement|Muuri.Item|Number} items
   * @param {Boolean} [instant=false]
   * @param {Function} [callback]
   */
  function toggleVisibility(inst, method, items, instant, callback) {

    var targetItems = inst.get(items);
    var cb = typeof instant === 'function' ? instant : callback;
    var counter = targetItems.length;
    var isShow = method === 'show';
    var startEvent = isShow ? evShowStart : evHideStart;
    var endEvent = isShow ? evShowEnd : evHideEnd;
    var isInstant = instant === true;
    var needsRelayout = false;
    var completed;
    var hiddenItems;

    // If there are no items call the callback, but don't emit any events.
    if (!counter) {

      if (typeof callback === 'function') {
        callback(targetItems);
      }

    }
    // If we have some items let's dig in.
    else {

      completed = [];
      hiddenItems = [];

      // Emit showstart event.
      inst._emitter.emit(startEvent, targetItems);

      // Show/hide items.
      targetItems.forEach(function (item) {

        // Check if relayout or refresh is needed.
        if ((isShow && !item._active) || (!isShow && item._active)) {
          needsRelayout = true;
          if (isShow) {
            item._noLayoutAnimation = true;
            hiddenItems.push(item);
          }
        }

        // Show/hide the item.
        item['_' + method](isInstant, function (interrupted, item) {

          // If the current item's animation was not interrupted add it to the
          // completed set.
          if (!interrupted) {
            completed.push(item);
          }

          // If all items have finished their animations call the callback
          // and emit the event.
          if (--counter < 1) {
            if (typeof cb === 'function') {
              cb(completed);
            }
            inst._emitter.emit(endEvent, completed);
          }

        });

      });

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
   * @param {String} [type]
   * @returns {Object}
   */
  function animateVisibility(opts, type) {

    var duration = parseInt(opts && opts.duration) || 0;
    var easing = (opts && opts.easing) || 'ease-out';
    var targetStyles;

    // If duration is zero or lower, we don't need any animations.
    if (duration <= 0) {

      return {
        start: noop,
        stop: noop
      };

    }

    // If we have valid duration let's bind animations.
    else {

      targetStyles = type === 'show' ? {opacity: 1, transform: 'scale(1)'} : {opacity: 0, transform: 'scale(0.5)'};

      return {

        start: function (item, instant, animDone) {

          if (instant) {
            setStyles(item._child, targetStyles);
          }
          else {
            item._animateChild.start(targetStyles, {
              duration: duration,
              easing: easing,
              done: animDone
            });
          }

        },

        stop: function (item) {

          item._animateChild.stop();

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

    queue.splice(0, queue.length).forEach(function (callback) {
      callback(interrupted, instance);
    });

  }

  /**
   * Default handler for drag sort event.
   *
   * @private
   * @param {Muuri.Item} targetItem
   */
  function dragSortHandler(targetItem) {

    var muuri = targetItem._muuri;
    var stn = muuri._settings;
    var config = stn.dragSortPredicate || {};
    var tolerance = config.tolerance || 50;
    var action = config.action || 'move';
    var items = muuri._items;
    var drag = targetItem._drag;
    var instData = {
      width: drag.item._width - drag.item._margin.left - drag.item._margin.right,
      height: drag.item._height - drag.item._margin.top - drag.item._margin.bottom,
      left: drag.gridX + drag.item._margin.left,
      top: drag.gridY + drag.item._margin.top
    };
    var targetIndex = 0;
    var bestMatchScore = null;
    var bestMatchIndex;

    // Find best match (the element with most overlap).
    items.forEach(function (item, i) {

      var itemData;
      var overlap;

      // If the item is the dragged item, save it's index.
      if (item === targetItem) {

        targetIndex = i;

      }
      // Otherwise, if the item is active.
      else if (item._active) {

        // Get marginless item data.
        itemData = {
          width: item._width - item._margin.left - item._margin.right,
          height: item._height - item._margin.top - item._margin.bottom,
          left: item._left + item._margin.left,
          top: item._top + item._margin.top
        };

        // Get marginless overlap data.
        overlap = getSortOverlapData(instData, itemData);

        // Update best match if the overlap score is higher than the current
        // best match.
        if (bestMatchScore === null || overlap.score > bestMatchScore) {
          bestMatchScore = overlap.score;
          bestMatchIndex = i;
        }

      }

    });

    // Check if the best match overlaps enough to justify a placement switch.
    if (bestMatchScore !== null && bestMatchScore >= tolerance) {

      return {
        action: action,
        from: targetIndex,
        to: bestMatchIndex
      };

    }

    return false;

  }

  /**
   * Init
   */

  return Muuri;

}));
