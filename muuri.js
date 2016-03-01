/*!
Muuri v0.1.0-nightly
Copyright (c) 2015, Haltu Oy

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*

TODO - CRITICAL
***************
- Find a way to get the "offsetDiff" without mezr using already existing data.
- Inline element dimension getter functions.
- Account for fixed elements that do not attach themselves to window but the
  closest transformed element when calculating offsets and scrollparents.
- Test the dragging / scrolling experience on multiple devices and make fixes
  as required.

TODO - NICE TO HAVE
*******************
- Review the docs and the inline jsdocs and make sure they match.
- Pretty demo site.
- Check if animation perf can be improved. For example animate only elements
  which will be visible in the viewport's current position at some point of
  their animation. Other elements could be just snapped to place. This could
  be an optional feature since there is the possibility that user scrolls
  while the animation is running which would not look right for the user.
- Enforce and validate a specific coding style.
- Smarter overlap algorithm that takes into account the drad direction and
  possibly also velocity.

*/

(function (global, factory) {

  var libName = 'Muuri';
  var depMezr = global.mezr;
  var depVelocity = typeof jQuery === 'function' ? jQuery.Velocity : global.Velocity;
  var depHammer = global.Hammer;
  global[libName] = factory(global, depMezr, depVelocity, depHammer);

}(this, function (global, Mezr, Velocity, Hammer, undefined) {

  /**
   * Constants
   * *********
   */

  var uuid = 0;
  var noop = function () {};

  // Events.
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

    var events = this._events || {};
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

    var events = this._events || {};
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

    var events = this._events || {};
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

    // Unique animation queue name.
    inst._animQueue = 'muuri-' + ++uuid;

    // Create private eventize instance.
    inst._emitter = new Emitter();

    // Setup container element.
    inst._element = stn.container;
    addClass(stn.container, stn.containerClass);

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
   * Calculate the minimum slot width and height for the virtual grid, based on
   * the items.
   *
   * @protected
   * @memberof Muuri.prototype
   * @param {Array} items
   * @returns {Object}
   */
  Muuri.prototype._getSlotSize = function (items) {

    var ret = {
      width: 0,
      height: 0
    };
    var widthsTemp = {};
    var heightsTemp = {};
    var widths = [];
    var heights = [];

    // First of all, let's store all different widths and heights of the
    // provided items.
    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      widthsTemp[item._width] = item._width;
      heightsTemp[item._height] = item._height;
    }

    // Transform the temporary widths object into an array.
    for (var prop in widthsTemp) {
      widths[widths.length] = widthsTemp[prop];
    }

    // Transform the temporary heights object into an array.
    for (var prop in heightsTemp) {
      heights[heights.length] = heightsTemp[prop];
    }

    // Calculate the slot width and height.
    for (var i = 0; i < 2; i++) {

      var sizes = i === 0 ? widths : heights;
      var sizesLength = sizes.length;
      var possibilities = [Math.min.apply(Math, sizes)];

      for (var ii = 0; ii < sizesLength; ii++) {
        var size = sizes[ii];
        for (var iii = 0; iii < sizesLength; iii++) {
          var diff = Math.abs(size - sizes[iii]);
          if (diff > 0) {
            possibilities[possibilities.length] = diff;
          }
        }
      }

      var result = Math.min.apply(Math, possibilities);

      if (i === 0) {
        ret.width = result;
      }
      else {
        ret.height = result;
      }

    }

    return ret;

  }

  /**
   * Calculate and set positions of currently active items and return a data
   * object containing data about the generated "virtual grid".
   *
   * @protected
   * @memberof Muuri.prototype
   * @param {Array} items
   * @returns {Object}
   */
  Muuri.prototype._generateLayout = function (items) {

    items = items || this.get('active');

    var slots = [];
    var fillWidth = 0;
    var fillHeight = 0;
    var slotWidth = 0;
    var slotHeight = 0;

    if (items.length) {

      var grid = [];
      var containerWidth = Mezr.width(this._element, 'core');
      var slotSize = this._getSlotSize(items);

      slotWidth = slotSize.width;
      slotHeight = slotSize.height;

      // Find slots for items.
      for (var i = 0, len = items.length; i < len; i++) {

        var item = items[i];
        var slot = i === 0 ? {left: 0, top: 0} : findSlot(grid, containerWidth, slotHeight, slotWidth, item._width, item._height);

        // Fill slot.
        fillSlots(grid, slotHeight, slotWidth, item._width, item._height, slot.left, slot.top);

        // Update fillWidth and fillHeight.
        fillWidth = Math.max(fillWidth, slot.left + item._width);
        fillHeight = Math.max(fillHeight, slot.top + item._height);

        // Push the slot data to return data.
        slots[i] = slot;

      }

    }

    return {
      items: items,
      slots: slots,
      fillWidth: fillWidth,
      fillHeight: fillHeight,
      slotWidth: slotWidth,
      slotHeight: slotHeight
    };

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
   * @param {String} [filter]
   * @returns {Array} Array of Muuri item instances.
   */
  Muuri.prototype.get = function (targets, filter) {

    var hasTargets = targets && typeof targets !== 'string';

    filter = !hasTargets ? targets : filter;
    filter = typeof filter === 'string' ? filter : null;
    targets = hasTargets ? [].concat(targets) : null;

    if (filter || targets) {

      var items = targets || this._items;
      var ret = [];
      var isActive = filter === 'active';
      var isInactive = filter === 'inactive';

      for (var i = 0, len = items.length; i < len; i++) {
        var item = hasTargets ? this._getItem(items[i]) : items[i];
        if (item && (!filter || (isActive && item._active) || (isInactive && !item._active))) {
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
    var animDuration = inst._settings.containerDuration;
    var animEasing = inst._settings.containerEasing;
    var layout = inst._generateLayout();
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

    // Stop currently running container animation.
    Velocity(inst._element, 'stop', inst._animQueue);

    // Emit layoutstart event.
    emitter.emit(evLayoutStart, layout.items, layout);

    // If container's current inline height does not match the target height,
    // let's adjust it's size.
    if (parseFloat(inst._element.style.height) !== layout.fillHeight) {

      // If container animations are enabled let's animate.
      if (!isInstant && animDuration > 0) {

        Velocity(inst._element, {height: layout.fillHeight}, {
          duration: animDuration,
          easing: animEasing,
          queue: inst._animQueue
        });

        Velocity.Utilities.dequeue(inst._element, inst._animQueue);

      }
      // Otherwise let's just set the height.
      else {

        setStyles(inst._element, {
          height: layout.fillHeight + 'px'
        });

      }

    }

    if (!itemsLength) {

      tryFinish(true);

    }
    else {

      // Position items.
      for (var i = 0, len = layout.items.length; i < len; i++) {

        var item = layout.items[i];

        // Update item's position.
        item._left = layout.slots[i].left;
        item._top = layout.slots[i].top;

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

    // Append the element within the Muuri container element if it is not there
    // already.
    if (element.parentNode !== muuri._element) {
      muuri._element.appendChild(element);
    }

    var stn = muuri._settings;
    var isHidden = getStyle(element, 'display') === 'none';

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
    this._peekabooQueue = [];

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
    }, stn.dragOverlapInterval);

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
    drag.onScroll = function () {
      inst._onDragScroll();
    };

    // Bind drag events.
    hammer
    .on('draginit', function (e) {
      drag.predicateData = {};
      predicateResolved = false;
      drag.predicate(e, inst, drag.resolvePredicate, drag.predicateData);
    })
    .on('dragstart dragmove', function (e) {
      if (predicateResolved && drag.active) {
        inst._onDragMove(e);
      }
      drag.predicate(e, inst, drag.resolvePredicate, drag.predicateData);
    })
    .on('dragend dragcancel draginitup', function (e) {
      if (predicateResolved && drag.active) {
        inst._onDragEnd(e);
      }
      drag.predicate(e, inst, drag.resolvePredicate, drag.predicateData);
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

    // The element that is currently dragged (instance element or it's clone).
    drag.element = null;

    // The curently dragged element's width and height.
    drag.elemWidth = 0;
    drag.elemHeight = 0;

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
    var emitter = this._muuri._emitter;
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
    drag.element = this._element;
    drag.elemWidth = this._width;
    drag.elemHeight = this._height;

    // Get element's current position.
    var currentLeft = parseFloat(Velocity.hook(drag.element, 'translateX')) || 0;
    var currentTop = parseFloat(Velocity.hook(drag.element, 'translateY')) || 0;

    // Get container references.
    var defaultContainer = this._muuri._element;
    var dragContainer = stn.dragContainer;

    // Set initial left/top drag value.
    drag.left = drag.gridX = currentLeft;
    drag.top = drag.gridY = currentTop;

    // If a specific drag container is set and it is different from the
    // default muuri container we need to cast some extra spells.
    if (dragContainer && dragContainer !== defaultContainer) {

      // If dragged element is already in drag container.
      if (drag.element.parentNode === dragContainer) {

        // Get offset diff.
        var offsetDiff = Mezr.place([drag.element, 'margin'], {
          my: 'left top',
          at: 'left top',
          of: [defaultContainer, 'padding']
        });

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
        var offsetDiff = Mezr.place([drag.element, 'margin'], {
          my: 'left top',
          at: 'left top',
          of: [defaultContainer, 'padding']
        });

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
    drag.scrollParents = arrayUnique(getScrollParents(drag.element).concat(getScrollParents(defaultContainer)));

    // Bind scroll listeners.
    for (var i = 0, len = drag.scrollParents.length; i < len; i++) {
      drag.scrollParents[i].addEventListener('scroll', drag.onScroll);
    }

    // Set drag class.
    addClass(drag.element, stn.draggingClass);

    // Emit item-dragstart event.
    emitter.emit(evDragStart, this, parseDragEventData(drag));

  };

  /**
   * Drag move handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragMove = function (e) {

    var drag = this._drag;
    var emitter = this._muuri._emitter;
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
    emitter.emit(evDragMove, this, parseDragEventData(drag));

  };

  /**
   * Drag scroll handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragScroll = function () {

    var drag = this._drag;
    var emitter = this._muuri._emitter;
    var stn = this._muuri._settings;

    // Get containers.
    var defaultContainer = this._muuri._element;
    var dragContainer = stn.dragContainer;

    // Get offset diff.
    var elemGbcr = drag.element.getBoundingClientRect();
    var xDiff = drag.elemClientX - elemGbcr.left;
    var yDiff = drag.elemClientY - elemGbcr.top;

    // Update container diff.
    if (dragContainer && dragContainer !== defaultContainer) {

      // Get offset diff.
      // TODO: Speed up this function by providing mezr parsed data instead
      // of elements. This way mezr will work a LOT faster.
      var offsetDiff = Mezr.place([drag.element, 'margin'], {
        my: 'left top',
        at: 'left top',
        of: [defaultContainer, 'padding']
      });

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
    emitter.emit(evDragScroll, this, parseDragEventData(drag));

  };

  /**
   * Drag end handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragEnd = function (e) {

    var drag = this._drag;
    var emitter = this._muuri._emitter;
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
    emitter.emit(evDragEnd, this, parseDragEventData(drag));

    // Setup release data.
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

    for (var i = 0, len = drag.scrollParents.length; i < len; i++) {
      drag.scrollParents[i].removeEventListener('scroll', drag.onScroll);
    }

    drag.checkOverlap('cancel');
    removeClass(drag.element, stn.draggingClass);
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
   Muuri.Item.prototype._checkOverlap = function() {

    var stn = this._muuri._settings;
    var overlapTolerance = stn.dragOverlapTolerance;
    var overlapAction = stn.dragOverlapAction;
    var items = this._muuri._items;
    var bestMatch = null;
    var instIndex = 0;
    var instData = {
      width: this._drag.elemWidth,
      height: this._drag.elemHeight,
      left: this._drag.gridX,
      top: this._drag.gridY
    };

    // Find best match (the element with most overlap).
    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      if (item === this) {
        instIndex = i;
      }
      else if (item._active) {
        var overlapScore = getOverlapScore(instData, {
          width: item._width,
          height: item._height,
          left: item._left,
          top: item._top
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
      this._width = Math.round(Mezr.width(this._element, 'margin'));
      this._height = Math.round(Mezr.height(this._element, 'margin'));
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
    var emitter = inst._muuri._emitter;
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

      // Get current left and top position.
      var currentLeft = (parseFloat(Velocity.hook(inst._element, 'translateX')) || 0) + offsetLeft;
      var currentTop =  (parseFloat(Velocity.hook(inst._element, 'translateY')) || 0) + offsetTop;

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
    var emitter = inst._muuri._emitter;

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
        inst._peekabooQueue[inst._peekabooQueue.length] = callback;
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
      processQueue(inst._peekabooQueue, true, inst);

      // Update state.
      inst._showing = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._peekabooQueue[inst._peekabooQueue.length] = callback;
      }

      // Animate child element.
      inst._muuri._itemShow.start(inst, instant, function () {

        // Process callback queue.
        processQueue(inst._peekabooQueue, false, inst);

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
    var emitter = inst._muuri._emitter;

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
        inst._peekabooQueue[inst._peekabooQueue.length] = callback;
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
      processQueue(inst._peekabooQueue, true, inst);

      // Update state.
      inst._hiding = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._peekabooQueue[inst._peekabooQueue.length] = callback;
      }

      // Animate child element.
      inst._muuri._itemHide.start(inst, instant, function () {

        // Hide element.
        setStyles(inst._element, {
          display: 'none'
        });

        // Process callback queue.
        processQueue(inst._peekabooQueue, false, inst);

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

    // Remove all inline styles.
    element.removeAttribute('style');
    this._child.removeAttribute('style');

    // Remove Muuri specific classes.
    removeClass(element, stn.positioningClass);
    removeClass(element, stn.draggingClass);
    removeClass(element, stn.releasingClass);
    removeClass(element, stn.itemClass);
    removeClass(element, stn.shownClass);
    removeClass(element, stn.hiddenClass);

    // Handle visibility callback queue, fire all uncompleted callbacks with
    // interrupted flag.
    processQueue(this._peekabooQueue, true, this);

    // Destroy Hammer instance if it exists.
    if (this._hammer) {
      this._hammer.destroy();
    }

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
   * Muuri - Settings
   * ****************
   */

  /**
   * Default settings.
   *
   * @public
   * @memberof Muuri
   * @property {HTMLElement} container
   * @property {Number} containerDuration
   * @property {Array|String} containerEasing
   * @property {Array} items
   * @property {Number} positionDuration
   * @property {Array|String} positionEasing
   * @property {!Function|Object} show
   * @property {!Function|Object} hide
   * @property {!Number} layoutOnResize
   * @property {Boolean} layoutOnInit
   * @property {Boolean} dragEnabled
   * @property {!Function} dragPredicate
   * @property {Boolean} dragSort
   * @property {!HtmlElement} dragContainer
   * @property {Number} dragReleaseDuration
   * @property {Array|String} dragReleaseEasing
   * @property {Number} dragOverlapInterval
   * @property {Number} dragOverlapTolerance
   * @property {String} dragOverlapAction
   * @property {Number} dragOverlapInterval
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
    containerDuration: 300,
    containerEasing: 'ease-out',

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
    layoutOnResize: 100,
    layoutOnInit: true,

    // Drag & Drop
    dragEnabled: true,
    dragPredicate: null,
    dragSort: true,
    dragContainer: document.body,
    dragReleaseDuration: 300,
    dragReleaseEasing: 'ease-out',
    dragOverlapInterval: 50,
    dragOverlapTolerance: 50,
    dragOverlapAction: 'move',

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
        timeout = global.setTimeout(function() {
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
  function getIntersection(a, b, returnData) {

    var overlap = {
      left: a.left - b.left,
      right: (b.left + b.width) - (a.left + a.width),
      top: a.top - b.top,
      bottom: (b.top + b.height) - (a.top + a.height)
    };
    var intersectionWidth = Math.max(a.width + Math.min(overlap.left, 0) + Math.min(overlap.right, 0), 0);
    var intersectionHeight = Math.max(a.height + Math.min(overlap.top, 0) + Math.min(overlap.bottom, 0), 0);
    var hasIntersection = intersectionWidth > 0 && intersectionHeight > 0;

    return !hasIntersection ? null : {
      width: intersectionWidth,
      height: intersectionHeight,
      left: a.left + Math.abs(Math.min(overlap.left, 0)),
      top: a.top + Math.abs(Math.min(overlap.top, 0))
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
   * Get element's scroll containers.
   *
   * @param {HTMLElement} element
   * @returns {Array}
   */
  function getScrollParents(element) {

    var ret = [global];

    // Return instantly if element is fixed.
    if (getStyle(element, 'position') === 'fixed') {
      return ret;
    }

    // Get scroll parents.
    var overflowRegex = /(auto|scroll)/;
    var parent = element.parentNode;
    while (parent && parent !== document && parent !== document.documentElement) {
      if (overflowRegex.test(getStyle(parent, 'overflow') + getStyle(parent, 'overflow-y') + getStyle(parent, 'overflow-x'))) {
        ret[ret.length] = parent;
      }
      parent = getStyle(parent, 'position') === 'fixed' ? null : parent.parentNode;
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

    var aUnpos = {
      width: a.width,
      height: a.height,
      left: 0,
      top: 0
    };

    var bUnpos = {
      width: b.width,
      height: b.height,
      left: 0,
      top: 0
    };

    var maxIntersection = getIntersection(aUnpos, bUnpos);

    return (intersection.width * intersection.height) / (maxIntersection.width * maxIntersection.height) * 100;

  }

  /**
   * Helper utility for layout calculations. Fills slots in a virtual grid.
   *
   * @param {Array} grid
   * @param {Number} rowHeight
   * @param {Number} colWidth
   * @param {Number} itemWidth
   * @param {Number} itemHeight
   * @param {Number} itemLeft
   * @param {Number} itemTop
   */
  function fillSlots(grid, rowHeight, colWidth, itemWidth, itemHeight, itemLeft, itemTop) {

    var slotWidth = itemWidth / colWidth;
    var slotHeight = itemHeight / rowHeight;
    var slotX = itemLeft / colWidth;
    var slotY = itemTop / rowHeight;
    var y = slotY;
    var x = slotX;
    var yLen = slotY + slotHeight;
    var xLen = slotX + slotWidth;

    for (y = slotY; y < yLen; y++) {
      var row = grid[y] = grid[y] || [];
      for (x = slotX; x < xLen; x++) {
        row[x] = 1;
      }
    }

  }

  /**
   * Helper utility for layout calculations. Finds slots in a virtual grid.
   * Returns an object containing the item's left and top position.
   *
   * @param {Array} grid
   * @param {Number} containerWidth
   * @param {Number} rowHeight
   * @param {Number} colWidth
   * @param {Number} itemWidth
   * @param {Number} itemHeight
   * @returns {Object}
   */
  function findSlot(grid, containerWidth, rowHeight, colWidth, itemWidth, itemHeight) {

    // If the item width exceeds the container width we can simplify the
    // algorithm a lot. Just position the item to the next free row.
    if (itemWidth > containerWidth) {
      return {
        left: 0,
        top: grid.length * rowHeight
      };
    }

    var slotWidth = itemWidth / colWidth;
    var slotHeight = itemHeight / rowHeight;
    var xEdge = Math.floor(containerWidth / colWidth);
    var x = 0;
    var y = 0;
    var yLen = grid.length + 1;

    yLoop:
    for (y = 0; y < yLen; y++) {

      // Always reset x when starting to iterate.
      x = 0;

      // If the row does not exist, we are sure that there is nothing below it
      // or on it and can safely quit here.
      if (!grid[y]) {
        break;
      }

      // Otherwise let's check inspect the row's slots.
      xLoop:
      for (x = 0; x < xEdge; x++) {

        // If slot won't fit in the current row break x-loop instantly.
        if ((slotWidth + x) > xEdge) {
          break;
        }

        // If the slot is taken move on to the next slot in the row.
        if (grid[y][x]) {
          continue;
        }

        // Otherwise, let's check if this position is suitable for the item.

        var isMatch = true;
        var y2 = y;
        var y2Len = y + slotHeight;
        var x2 = x;
        var x2Len = x + slotWidth;

        y2Loop:
        for (y2 = y2; y2 < y2Len; y2++) {

          // If the row does not exist, we are sure that there is nothing below
          // it or on it and can safely quit here.
          if (!grid[y2]) {
            break;
          }

          // If the slot is taken we can deduct that the item won't fit here.
          x2Loop:
          for (x2 = x; x2 < x2Len; x2++) {
            if (grid[y2][x2]) {
              isMatch = false;
              break y2Loop;
            }
          }

        }

        // If match was found break the main loop.
        if (isMatch) {
          break yLoop;
        }

      }

    }

    return {
      left: x * colWidth,
      top: y * rowHeight
    };

  }

  /**
   * Return parsed drag event data.
   *
   * @param {Object} drag
   * @returns {Object}
   */
  function parseDragEventData(drag) {

    return {
      start: drag.start,
      move: drag.move,
      left: drag.left,
      top: drag.top,
      gridX: drag.gridX,
      gridY: drag.gridY,
      clientX: drag.elemClientX,
      clientY: drag.elemClientY
    };

  }

  /**
   * Default drag start predicate handler.
   *
   * @param {Object} e
   * @param {Muuri.Item} item
   * @param {Function} resolvePredicate
   * @param {Object} predicateData
   */
  function dragPredicate(e, item, resolvePredicate, predicateData) {

    // Cancel timeout if it's still running and we are at the end of the flow.
    if (predicateData.timeout && (e.type === 'dragend' || e.type === 'dragcancel' || e.type === 'draginitup')) {
      predicateData.timeout = global.clearTimeout(predicateData.timeout)
    }

    // If predicate is already handled, don't go further.
    if (predicateData.isRejected || predicateData.isResolved) {
      return;
    }

    // For touch input we need to add a bit of delay before the drag can
    // begin in order not to break native scrolling.
    if (e.pointerType === 'touch') {

      predicateData.e = e;
      if (e.type === 'draginit') {
        predicateData.timeout = global.setTimeout(function() {
          predicateData.isResolved = true;
          resolvePredicate(predicateData.e);
        }, 100);
      }
      else if (Math.abs(e.deltaY) > 40 || Math.abs(e.deltaX) > 40) {
        predicateData.isRejected = true;
        predicateData.timeout = global.clearTimeout(predicateData.timeout);
      }

    }

    // For other input types we can just specify a little threshold.
    else {

      if (Math.abs(e.deltaY) > 5 || Math.abs(e.deltaX) > 5) {
        predicateData.isResolved = true;
        resolvePredicate(e);
      }

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
      var targetStyles = isShow ? {opacity: 1, scale: 1} : {opacity: 0, scale: 0};
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