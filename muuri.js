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
TODO
****
- Allow placing hidden item's in their correct position somehow. Crucial for
  when showing hidden elements, we need to set their position before showing
  them.
- Allow doing a layout on specific items and allow doing an instant layout.
- Allow doing an instant show/hide.
- Make sure there is no unnecessary looping of items occuring internally.
- Get rid of Mezr dependency.
- Check if animation perf can be improved. For example animate only elements
  which will be visible in the viewport's current position at some point of
  their animation. Other elements could be just snapped to place. This could
  be an optional feature since there is the possibility that user scrolls
  while the animation is running which would not look right for the user.
- Enforce and validate a specific coding style.
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
  var evRefresh = 'refresh';
  var evSynchronize = 'synchronize';
  var evLayoutStart = 'layoutstart';
  var evLayoutEnd = 'layoutend';
  var evShowStart = 'showstart';
  var evPositionStart = 'positionstart';
  var evPositionEnd = 'positionend';
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
    inst.items = [];
    for (var i = 0, len = stn.items.length; i < len; i++) {
      inst.items[inst.items.length] = new Muuri.Item(inst, stn.items[i]);
    }

    // Calculate grid's row height and column width.
    inst._rowHeight = inst._getSlotSize('height');
    inst._colWidth = inst._getSlotSize('width');

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
      inst.layout(false);
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
   * @param {Number|HTMLElement|Muuri.Item} [target=0]
   * @returns {!Muuri.Item}
   */
  Muuri.prototype._getItem = function (target) {

    if (!target) {

      return this.items[0] || null;

    }
    else if (target instanceof Muuri.Item) {

      return target._muuri === this ? target : null;

    }
    else if (typeof target === 'number') {

      return this.items[target] || null;

    }
    else {

      var ret = null;

      for (var i = 0, len = this.items.length; i < len; i++) {

        var item = this.items[i];

        if (item._element === target) {
          ret = item;
          break;
        }

      }

      return ret;

    }

  };

  /**
   * Return an array of visible items in correct order.
   *
   * @protected
   * @memberof Muuri.prototype
   * @returns {Array}
   */
  Muuri.prototype._getActiveItems = function () {

    var ret = [];
    var items = this.items;

    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      if (item._active) {
        ret[ret.length] = item;
      }
    }

    return ret;

  };

  /**
   * Calculate and return the virtual grid's slot width or height. Returns null
   * if there are no items.
   *
   * @protected
   * @memberof Muuri.prototype
   * @param {String} type - "width" or "height".
   * @param {Array} [items]
   * @returns {!Number}
   */
  Muuri.prototype._getSlotSize = function (type, items) {

    // If no items are provided get all active items by default.
    var items = items ? items : this._getActiveItems();

    // Return early if there are no items.
    if (!items.length) {
      return null;
    }

    // Get sizes for the specified type.
    var sizes = arrayUnique(items.map(function (item) {
      return item['_' + type]
    }));

    var sizesLength = sizes.length;

    // Store the possible values and add the smallest size to the possibilities
    // right off the bat.
    var possibilities = [Math.min.apply(Math, sizes)];

    // Add all the differences between sizes to possibilites.
    for (var i = 0; i < sizesLength; i++) {
      var size = sizes[i];
      for (var ii = 0; ii < sizesLength; ii++) {
        var diff = Math.abs(size - sizes[ii]);
        if (diff > 0) {
          possibilities[possibilities.length] = diff;
        }
      }
    }

    // And voila! We have a winner.
    return Math.min.apply(Math, possibilities);

  };

  /**
   * Calculate and set positions of currently active items and return a data
   * object containing data about the generated "virtual grid".
   *
   * @protected
   * @memberof Muuri.prototype
   * @returns {Object}
   */
  Muuri.prototype._generateLayout = function () {

    var rowHeight = this._rowHeight;
    var colWidth = this._colWidth;
    var containerWidth = Mezr.width(this._element, 'core');
    var grid = [];
    var items = this._getActiveItems();
    var data = {
      items: items,
      containerWidth: containerWidth,
      fillWidth: 0,
      fillHeight: 0
    };

    // Loop visible items.
    for (var i = 0, len = items.length; i < len; i++) {

      var item = items[i];

      // Find slot.
      if (i === 0) {
        item._left = 0;
        item._top = 0;
      }
      else {
        var slot = findSlot(grid, containerWidth, rowHeight, colWidth, item._width, item._height);
        item._left = slot.left;
        item._top = slot.top;
      }

      // Fill slot.
      fillSlots(grid, rowHeight, colWidth, item._width, item._height, item._left, item._top);

      // Update the data fillWidth and fillHeight.
      data.fillWidth = Math.max(data.fillWidth, item._left + item._width);
      data.fillHeight = Math.max(data.fillHeight, item._top + item._height);

    }

    return data;

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
   * Get instance's items that match the provided targets. If no elements are
   * provided returns all Muuri's items. Note that the returned array is not the
   * same object used by the instance so modifying it will not affect instance's
   * items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|Number|HTMLElement|Muuri.Item} [targets]
   * @returns {Array} Array of Muuri item instances.
   */
  Muuri.prototype.get = function (targets) {

    // Return clone of all items instantly if no elements are provided.
    if (!targets) {
      return this.items.concat();
    }

    var items = [];
    targets = [].concat(targets);

    for (var i = 0, len = targets.length; i < len; i++) {

      var item = this._getItem(targets[i]);

      if (item) {
        items[items.length] = item;
      }

    }

    return items;

  };

  /**
   * Register DOM elements as Muuri items. Returns the new items that were
   * registered. All items that are not already children of the container
   * element will be automatically appended to the container.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement} elements
   * @param {Number} [index=0]
   * @returns {Array}
   */
  Muuri.prototype.add = function (elements, index) {

    var newItems = [];
    var needsRefresh = false;

    // Make sure elements is an array.
    elements = [].concat(elements);

    // Filter out all elements that exist already in current instance.
    for (var i = 0, len = this.items.length; i < len; i++) {
      var item = this.items[i];
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
        needsRefresh = true;
      }
    }

    // Normalize the index for the splice apply hackery so that value of -1
    // prepends the new items to the current items.
    index = index < 0 ? this.items.length - index + 1 : index;

    // Add the new items to the items collection to correct index.
    this.items.splice.apply(this.items, [index, 0].concat(newItems));

    // If refresh is needed.
    if (needsRefresh) {
      this.refresh();
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
   * @param {Array|Number|HTMLElement|Muuri.Item} items
   * @param {Boolean} [removeElement=false]
   * @returns {Array} The indices of removed items.
   */
  Muuri.prototype.remove = function (items, removeElement) {

    var indices = [];
    var needsRefresh = false;

    items = this.get(items);

    for (var i = 0, len = items.length; i < len; i++) {

      var item = items[i];

      // Check it refresh is needed.
      if (item._active) {
        needsRefresh = true;
      }

      // Remove item.
      indices[indices.length] = item._destroy(removeElement);

    }

    // If refresh is needed.
    if (needsRefresh) {
      this.refresh();
      this.layout();
    }

    this._emitter.emit(evRemove, indices);

    return indices;

  };

  /**
   * Refresh Muuri instance's items' dimensions and recalculate minimum row
   * height and column width.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.refresh = function () {

    // Get active items.
    var items = this._getActiveItems();

    // Refresh dimensions.
    for (var i = 0, len = items.length; i < len; i++) {
      items[i]._refresh();
    }

    // Recalculate row height and column width.
    this._rowHeight = this._getSlotSize('height', items);
    this._colWidth = this._getSlotSize('width', items);

    // Emit refresh event.
    this._emitter.emit(evRefresh);

  };

  /**
   * Order the item elements to match the order of the items. If the item's
   * element is not a child of the container is ignored and left untouched.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.synchronize = function () {

    for (var i = 0, len = this.items.length; i < len; i++) {
      var item = this.items[i];
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
   * @param {Array|Number|Element|Muuri.Item} [items] // TODO
   * @param {Boolean} [animate=true] Should the positioning be animated?
   * @param {Function} [callback]
   */
  Muuri.prototype.layout = function (animate, callback) {

    var inst = this;
    var emitter = inst._emitter;
    var callback = typeof animate === 'boolean' ? callback : animate;
    var animEnabled = animate === false ? false : true;
    var animDuration = inst._settings.containerDuration;
    var animEasing = inst._settings.containerEasing;
    var grid = inst._generateLayout();
    var counter = -1;
    var itemsLength = grid.items.length;
    var tryFinish = function () {

      // If container and all items have finished their animations (if any).
      if (++counter === itemsLength) {

        // Call callback.
        if (typeof callback === 'function') {
          callback(inst);
        }

        // Emit layoutend event.
        emitter.emit(evLayoutEnd);

      }

    };

    // Stop currently running container animation.
    Velocity(inst._element, 'stop', inst._animQueue);

    // Emit layoutstart event.
    emitter.emit(evLayoutStart);

    // If container's current inline height matches the target height, let's
    // skip manipulating the DOM.
    if (parseFloat(inst._element.style.height) === grid.fillHeight) {

      tryFinish();

    }

    // Otherwise if container animations are enabled let's make it happen.
    else if (animEnabled && animDuration > 0) {

      Velocity(inst._element, {height: grid.fillHeight}, {
        duration: animDuration,
        easing: animEasing,
        complete: tryFinish,
        queue: inst._animQueue
      });

      Velocity.Utilities.dequeue(inst._element, inst._animQueue);

    }

    // In all other cases just set the height.
    else {

      setStyles(inst._element, {
        height: grid.fillHeight + 'px'
      });

      tryFinish();

    }

    // Position items.
    for (var i = 0, len = grid.items.length; i < len; i++) {

      var item = grid.items[i];

      if (item._drag.active) {
        tryFinish();
      }
      else {
        item._layout(animEnabled, tryFinish);
      }

    }

  };

  /**
   * Show instance items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|Number|HTMLElement|Muuri.Item} items
   * @param {Function} [callback]
   */
  Muuri.prototype.show = function (items, callback) {

    showHideHandler(this, 'show', items, callback);

  };

  /**
   * Hide instance items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|Number|HTMLElement|Muuri.Item} items
   * @param {Function} [callback]
   */
  Muuri.prototype.hide = function (items, callback) {

    showHideHandler(this, 'hide', items, callback);

  };

  /**
   * Get item's index.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Number|Element|Muuri.Item} item
   * @returns {Number}
   */
  Muuri.prototype.indexOf = function (item) {

    if (typeof item === 'number') {

      return item <= (this.items.length - 1) ? item : null;

    }
    else if (item instanceof Muuri.Item) {

      var index = this.items.indexOf(item);
      return index > -1 ? index : null;

    }
    else {

      var index = null;
      for (var i = 0, len = this.items.length; i < len; i++) {
        if (inst.items[i]._element === item) {
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
   * @param {Number|Element|Muuri.Item} item
   * @param {Number|Element|Muuri.Item} target
   */
  Muuri.prototype.move = function (item, target) {

    item = this._getItem(item);
    target = this._getItem(target);

    if (item && target && (item !== target)) {
      arrayMove(this.items, this.items.indexOf(item), this.items.indexOf(target));
      this._emitter.emit(evMove, item, target);
    }

  };

  /**
   * Swap positions of two items.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Number|Element|Muuri.Item} item
   * @param {Number|Element|Muuri.Item} target
   */
  Muuri.prototype.swap = function (item, target) {

    item = this._getItem(item);
    target = this._getItem(target);

    if (item && target && (item !== target)) {
      arraySwap(this.items, this.items.indexOf(item), this.items.indexOf(target));
      this._emitter.emit(evSwap, item, target);
    }

  };

  /**
   * Destroy Muuri instance.
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
    var items = this.items.concat();
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

    // If item is not active, don't start the drag.
    if (!this._active) {
      return;
    }

    // Stop current positioning animation.
    if (this._positioning) {
      this._stopLayout();
    }

    // Reset release data and remove release class if item is being released.
    if (this._release.active) {
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

        // TODO: Set element's inline width and height before appending since
        // otherwise it might enlarge or shrink after append procedure,
        // especially if the element's widht/height is defined in relative
        // units (% or em).

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
    emitter.emit(evDragStart, this);

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
    emitter.emit(evDragMove, this);

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
    emitter.emit(evDragScroll, this);

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
    emitter.emit(evDragEnd, this);

    // Setup release data.
    release.containerDiffX = drag.containerDiffX;
    release.containerDiffY = drag.containerDiffY;
    release.element = drag.element;

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

  };

  /**
   * Start the release process of an item.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._startRelease = function () {

    var emitter = this._muuri._emitter;
    var stn = this._muuri._settings;
    var release = this._release;

    // Flag release as active.
    release.active = true;

    // Add release classname to released element.
    addClass(release.element, stn.releasingClass);

    // Emit item-releasestart event.
    emitter.emit(evReleaseStart, this);

    // Position the released item.
    this._layout();

  };

  /**
   * End the release process of an item.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._endRelease = function () {

    var emitter = this._muuri._emitter;
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

    // Reset release data.
    this._resetReleaseData();

    // Emit item-releaseend event.
    emitter.emit(evReleaseEnd, this);

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
    var items = this._muuri.items;
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
   * @param {Boolean} [animate=true] Should we animate the positioning?
   * @param {Function} [callback]
   */
  Muuri.Item.prototype._layout = function (animate, callback) {

    var inst = this;
    var stn = inst._muuri._settings;
    var callback = typeof animate === 'boolean' ? callback : animate;
    var emitter = inst._muuri._emitter;
    var release = inst._release;
    var isJustReleased = release.active && release.positioningStarted === false;
    var animDuration = isJustReleased ? stn.dragReleaseDuration : stn.positionDuration;
    var animEasing = isJustReleased ? stn.dragReleaseEasing : stn.positionEasing;
    var animEnabled = animate === false ? false : animDuration > 0;
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

      // Call the callback.
      if (typeof callback === 'function') {
        callback(inst);
      }

      // Emit item-positionend event.
      emitter.emit(evPositionEnd, inst);

    };

    // Emit item-positionstart event.
    emitter.emit(evPositionStart, inst);

    // Stop currently running animation, if any.
    inst._stopLayout();

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
   * @param {Boolean} [animate=true]
   * @param {Function} [callback]
   */
  Muuri.Item.prototype._show = function (animate, callback) {

    var inst = this;
    var stn = inst._muuri._settings;
    var emitter = inst._muuri._emitter;

    // Allow pasing the callback function also as the first argument.
    callback = typeof animate === 'function' ? animate : callback;

    // If item is visible.
    if (!inst._hidden && !inst._showing) {

      // Call the callback and be done with it.
      if (typeof callback === 'function') {
        callback();
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
      processQueue(inst._peekabooQueue, true);

      // Update state.
      inst._showing = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._peekabooQueue[inst._peekabooQueue.length] = callback;
      }

      // Animate child element.
      inst._muuri._itemShow.start(inst, animate, function () {

        // Process callback queue.
        processQueue(inst._peekabooQueue);

      });

    }

  };

  /**
   * Hide item.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Boolean} [animate=true]
   * @param {Function} [callback]
   */
  Muuri.Item.prototype._hide = function (animate, callback) {

    var inst = this;
    var stn = inst._muuri._settings;
    var emitter = inst._muuri._emitter;

    // Allow pasing the callback function also as the first argument.
    callback = typeof animate === 'function' ? animate : callback;

    // If item is hidden.
    if (inst._hidden && !inst._hiding) {

      // Call the callback and be done with it.
      if (typeof callback === 'function') {
        callback();
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
      processQueue(inst._peekabooQueue, true);

      // Animate child element.
      inst._muuri._itemHide.start(inst, animate, function () {

        // Hide element.
        setStyles(inst._element, {
          display: 'none'
        });

        // Process callback queue.
        processQueue(inst._peekabooQueue);

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
    var index = this._muuri.items.indexOf(this);

    // Stop animations.
    this._stopLayout();
    this._muuri._itemShow.stop(this);
    this._muuri._itemHide.stop(this);

    // If item is being released, stop it gracefully.
    if (this._release.active) {
      if (this._element.parentNode !== this._muuri._element) {
        this._muuri._element.appendChild(this._element);
      }
      this._resetReleaseData();
    }

    // If item is being dragged, stop it gracefully.
    if (this._drag.active) {
      if (this._element.parentNode !== this._muuri._element) {
        this._muuri._element.appendChild(this._element);
      }
      this._resetDrag();
    }

    // Remove all inline styles.
    this._element.removeAttribute('style');
    this._child.removeAttribute('style');

    // Remove Muuri specific classes.
    removeClass(this._element, stn.positioningClass);
    removeClass(this._element, stn.draggingClass);
    removeClass(this._element, stn.releasingClass);
    removeClass(this._element, stn.itemClass);
    removeClass(this._element, stn.shownClass);
    removeClass(this._element, stn.hiddenClass);

    // Handle visibility callback queue, fire all uncompleted callbacks with
    // interrupted flag.
    processQueue(this._peekabooQueue, true);

    // Destroy Hammer instance if it exists.
    if (this._hammer) {
      this._hammer.destroy();
    }

    // Remove item from Muuri instance if it still exists there.
    if (index > -1) {
      this._muuri.items.splice(index, 1);
    }

    // Remove element from DOM.
    if (removeElement) {
      this._element.parentNode.removeChild(this._element);
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

    var intersection = Mezr.intersection(a, b, true);

    if (!intersection) {

      return 0;

    }
    else {

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

      var maxIntersection = Mezr.intersection(aUnpos, bUnpos, true);

      return (intersection.width * intersection.height) / (maxIntersection.width * maxIntersection.height) * 100;

    }

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
   * Show/hide Muuri instance's items.
   *
   * @private
   * @param {Muuri} inst
   * @param {String} method - "show" or "hide".
   * @param {Array|Number|HTMLElement|Muuri.Item} items
   * @param {Function} [callback]
   */
  function showHideHandler(inst, method, items, callback) {

    // Sanitize items.
    items = inst.get(items);

    var counter = items.length;

    // If there are no items call the callback, but don't emit any events.
    if (!counter) {

      if (typeof callback === 'function') {
        callback(items);
      }

    }
    // If we have some items let's dig in.
    else {

      var startEvent = method === 'show' ? evShowStart : evHideStart;
      var endEvent = method === 'show' ? evShowEnd : evHideEnd;
      var isInterrupted = false;
      var completed = [];
      var needsRefresh = false;

      // Emit showstart event.
      inst._emitter.emit(startEvent, items);

      // Show/hide items. The loop cycle must be wrapped in a function in order
      // to keep the correct reference of the item for the asynchronous callback
      // of the item's private show/hide method.
      for (var i = 0, len = items.length; i < len; i++) {
        (function (i) {

          var item = items[i];

          // Check if refresh is needed.
          if ((method === 'show' && !item._active) || (method === 'hide' && item._active)) {
            needsRefresh = true;
          }

          item['_' + method](function (interrupted) {

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

        })(i);
      }

      // Refresh and layout only if neeeed.
      if (needsRefresh) {
        inst.refresh();
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
        start: function (item, animate, animDone) {
          if (animate) {
            Velocity(item._child, targetStyles, {
              duration: duration,
              easing: easing,
              queue: item._muuri._animQueue,
              complete: animDone
            });
            Velocity.Utilities.dequeue(item._child, item._muuri._animQueue);
          }
          else {
            hookStyles(item._child, targetStyles);
          }
        },
        stop: function (item) {
          Velocity(item._child, 'stop', item._muuri._animQueue);
        }
      };
    }

  }

  /**
   * Process callback queue.
   *
   * @private
   * @param {Array} queue
   * @param {Boolean} [interrupted=false]
   */
  function processQueue(queue, interrupted) {

    var snapshot = queue.splice(0, queue.length);
    for (var i = 0, len = snapshot.length; i < len; i++) {
      snapshot[i](interrupted);
    }

  };

  /**
   * Init
   */

  return Muuri;

}));