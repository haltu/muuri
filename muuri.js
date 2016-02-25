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
- Streamline the events -> there are currently too many different events fired.
- Make sure functions that functions that assume items in Muuri check that items
  exist before going on executing themselves.
- arrayEach -> for loop
- Enforce and validate a specific coding style.
- Velocity should be the only hard dependency:
  - Get rid of Mezr dependency and instead inline a trimmed down version of it,
    which also accounts for the fixed element bug (when it sticks to the nearest
    transformed element instead of the window).
  - Instead of using Hammer build an adapter which can be used to apply
    drag events with any gesture library.
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

  // Muuri events.
  var evRefresh = 'refresh';
  var evSyncElements = 'syncelements';
  var evLayoutStart = 'layoutstart';
  var evLayoutEnd = 'layoutend';
  var evShowStart = 'showstart';
  var evShowEnd = 'showend';
  var evHideStart = 'hidestart';
  var evHideEnd = 'hideend';
  var evDestroy = 'destroy';

  // Muuri item events.
  var evItemInit = 'item-init';
  var evItemDragStart = 'item-dragstart';
  var evItemDragMove = 'item-dragmove';
  var evItemDragScroll = 'item-dragscroll';
  var evItemDragEnd = 'item-dragend';
  var evItemReleaseStart = 'item-releasestart';
  var evItemReleaseEnd = 'item-releaseend';
  var evItemSwap = 'item-swap';
  var evItemMove = 'item-move';
  var evItemRefresh = 'item-refresh';
  var evItemPositionStart = 'item-positionstart';
  var evItemPositionEnd = 'item-positionend';
  var evItemShowStart = 'item-showstart';
  var evItemShowEnd = 'item-showend';
  var evItemHideStart = 'item-hidestart';
  var evItemHideEnd = 'item-hideend';
  var evItemDestroy = 'item-destroy';

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
   * @param {*} [arg4]
   * @param {*} [arg5]
   * @returns {Emitter} returns the Emitter instance.
   */
  Emitter.prototype.emit = function (event, arg1, arg2, arg3, arg4, arg5) {

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
        argsLength === 3 ? listeners[i](arg1, arg2, arg3) :
        argsLength === 4 ? listeners[i](arg1, arg2, arg3, arg4) :
                           listeners[i](arg1, arg2, arg3, arg4, arg5);
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
    inst.element = stn.container;
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
      inst._resizeFn = function () {
        debounced();
      };
      global.addEventListener('resize', inst._resizeFn);
    }

    // Layout on init if enabled.
    if (stn.layoutOnInit) {
      inst.layout(false);
    }

  }

  /**
   * Return an array of visible items in correct order.
   *
   * @protected
   * @memberof Muuri.prototype
   * @returns {Array}
   */
  Muuri.prototype._getActiveItems = function () {

    return this.items.filter(function (item) {
      return item.isActive;
    });

  };

  /**
   * Calculate and return the virtual grid's slot width or height. Returns null
   * if there are no items.
   *
   * @protected
   * @memberof Muuri.prototype
   * @param {String} type - Must be "width" or "height".
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
      return item[type]
    }));
    var sizesLength = sizes.length;

    // Store the possible values and add the smallest size to the possibilities
    // right off the bat.
    var possibilities = [Math.min.apply(Math, sizes)];

    // Add all the differences between sizes to possibilites.
    for (var i = 0; i < sizesLength; i++) {
      var size = sizes[i];
      for (var ii = 0; i < sizesLength; ii++) {
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
  Muuri.prototype._positionItems = function () {

    var inst = this;
    var rowHeight = inst._rowHeight;
    var colWidth = inst._colWidth;
    var containerWidth = Mezr.width(inst.element, 'core');
    var grid = [];
    var items = inst._getActiveItems();
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
        item.left = 0;
        item.top = 0;
      }
      else {
        var slot = findSlot(grid, containerWidth, rowHeight, colWidth, item.width, item.height);
        item.left = slot.left;
        item.top = slot.top;
      }

      // Fill slot.
      fillSlots(grid, rowHeight, colWidth, item.width, item.height, item.left, item.top);

      // Update the data fillWidth and fillHeight.
      data.fillWidth = Math.max(data.fillWidth, item.left + item.width);
      data.fillHeight = Math.max(data.fillHeight, item.top + item.height);

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

    var inst = this;
    inst._emitter.on(event, listener);
    return inst;

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

    var inst = this;
    inst._emitter.off(event, listener);
    return inst;

  };

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
  Muuri.prototype.getItem = function (target) {

    var inst = this;

    if (!target) {

      return inst.items[0] || null;

    }
    else if (target instanceof Muuri.Item) {

      return target.muuri === inst;

    }
    else if (typeof target === 'number') {

      return inst.items[target] || null;

    }
    else {

      var ret = null;

      for (var i = 0, len = inst.items.length; i < len; i++) {

        var item = inst.items[i];

        if (item.element === target) {
          ret = item;
          break;
        }

      }

      return ret;

    }

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
  Muuri.prototype.getItems = function (targets) {

    var inst = this;

    // Return clone of all items instantly if no elements are provided.
    if (!targets) {
      return inst.items.concat();
    }

    var items = [];
    targets = [].concat(targets);

    for (var i = 0, len = targets.length; i < len; i++) {

      var item = inst.getItem(targets[i]);

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
  Muuri.prototype.addItems = function (elements, index) {

    var inst = this;
    var newItems = [];

    // Make sure elements is an array.
    elements = [].concat(elements);

    // Filter out all elements that exist already in current instance.
    for (var i = 0, len = inst.items.length; i < len; i++) {
      var item = inst.items[i];
      var index = elements.indexOf(item.element);
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
      newItems[newItems.length] = new Muuri.Item(inst, elements[i]);
    }

    // Normalize the index for the splice apply hackery so that value of -1
    // prepends the new items to the current items.
    index = index < 0 ? inst.items.length - index + 1 : index;

    // Add the new items to the items collection to correct index.
    inst.items.splice.apply(inst.items, [index, 0].concat(newItems));

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
  Muuri.prototype.removeItems = function (items, removeElement) {

    var inst = this;
    var indices = [];

    items = inst.getItems(items);

    for (var i = 0, len = items.length; i < len; i++) {
      indices[indices.length] = items[i].destroy(removeElement);
    }

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

    var inst = this;
    var items = inst._getActiveItems();

    // Refresh dimensions.
    for (var i = 0, len = items.length; i < len; i++) {
      items[i].refresh();
    }

    // Recalculate row height and column width.
    inst._rowHeight = inst._getSlotSize('height', items);
    inst._colWidth = inst._getSlotSize('width', items);

    // Emit refresh event.
    inst._emitter.emit(evRefresh);

  };

  /**
   * Order the item elements to match the order of the items. If the item's
   * element is not a child of the container is ignored and left untouched.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.syncElements = function () {

    var inst = this;
    var container = inst.element;

    for (var i = 0, len = inst.items.length; i < len; i++) {
      var item = inst.items[i];
      if (item.element.parentNode === container) {
        container.appendChild(item.element);
      }
    }

    // Emit "syncelements" event.
    inst._emitter.emit(evSyncElements);

  };

  /**
   * Calculate and apply Muuri instance's item positions.
   *
   * @public
   * @memberof Muuri.prototype
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
    var grid = inst._positionItems();
    var counter = -1;
    var itemsLength = grid.items.length;
    var tryFinish = function () {

      // If container and all items have finished their animations (if any).
      if (++counter === itemsLength) {

        // Call callback.
        if (typeof callback === 'function') {
          callback(inst);
        }

        // Emit "layoutend" event.
        emitter.emit(evLayoutEnd);

      }

    };

    // Stop currently running container animation.
    Velocity(inst.element, 'stop', inst._animQueue);

    // Emit "layoutstart" event.
    emitter.emit(evLayoutStart);

    // If container's current inline height matches the target height, let's
    // skip manipulating the DOM.
    if (parseFloat(inst.element.style.height) === grid.fillHeight) {

      tryFinish();

    }

    // Otherwise if container animations are enabled let's make it happen.
    else if (animEnabled && animDuration > 0) {

      Velocity(inst.element, {height: grid.fillHeight}, {
        duration: animDuration,
        easing: animEasing,
        complete: tryFinish,
        queue: inst._animQueue
      });

      Velocity.Utilities.dequeue(inst.element, inst._animQueue);

    }

    // In all other cases just set the height.
    else {

      setStyles(inst.element, {
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
        item.position(animEnabled, tryFinish);
      }

    }


  };

  /**
   * Show Muuri items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|Number|HTMLElement|Muuri.Item} items
   * @param {Function} [callback]
   */
  Muuri.prototype.show = function (items, callback) {

    var inst = this;

    // Sanitize items.
    items = inst.getItems(items);

    var emitter = inst._emitter;
    var isInterrupted = false;
    var counter = items.length;

    if (!counter) {

      if (typeof callback === 'function') {
        callback(items, isInterrupted);
      }

    }
    else {

      // Emit showstart event.
      emitter.emit(evShowStart, items);

      // Show items.
      for (var i = 0, len = items.length; i < len; i++) {
        items[i].show(function (interrupted) {

          // If the current item's animation was interrupted.
          if (interrupted) {
            isInterrupted = true;
          }

          // If all items have finished their animations.
          if (--counter < 1) {

            // Call callback.
            if (typeof callback === 'function') {
              callback(items, isInterrupted);
            }

            // Emit showend event.
            emitter.emit(evShowEnd, items, isInterrupted);

          }

        });
      }

    }

  };

  /**
   * Hide Muuri items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|Number|HTMLElement|Muuri.Item} items
   * @param {Function} [callback]
   */
  Muuri.prototype.hide = function (items, callback) {

    var inst = this;

    // Sanitize items.
    items = inst.getItems(items);

    var emitter = inst._emitter;
    var isInterrupted = false;
    var counter = items.length;

    if (!counter) {

      if (typeof callback === 'function') {
        callback(items, isInterrupted);
      }

    }
    else {

      // Emit hidestart event.
      emitter.emit(evHideStart, items);

      // Show items.
      for (var i = 0, len = items.length; i < len; i++) {
        items[i].hide(function (interrupted) {

          // If the current item's animation was interrupted.
          if (interrupted) {
            isInterrupted = true;
          }

          // If all items have finished their animations.
          if (--counter < 1) {

            // Call callback.
            if (typeof callback === 'function') {
              callback(items, isInterrupted);
            }

            // Emit hideend event.
            emitter.emit(evHideEnd, items, isInterrupted);

          }

        });
      }

    }

  };

  /**
   * Destroy Muuri instance.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.destroy = function () {

    var inst = this;

    // Unbind window resize event listener.
    if (inst._resizeFn) {
      global.removeEventListener('resize', inst._resizeFn);
    }

    // Restore items.
    arrayEach(inst.items.slice(), function (item) {
      item.destroy();
    });

    // Restore container.
    removeClass(inst.element, inst._settings.containerClass);
    setStyles(inst.element, {
      height: ''
    });

    // Emit "destroy" event.
    inst._emitter.emit(evDestroy);

    // Remove all event listeners.
    var events = inst._emitter._collection || {};
    for (var ev in events) {
      if (events.hasOwnProperty(ev) && Array.isArray(ev)) {
        events[ev].length = 0;
      }
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

    var inst = this;
    var stn = muuri._settings;
    var isHidden = getStyle(element, 'display') === 'none';

    inst.muuri = muuri;
    inst.element = element;
    inst.child = element.children[0];

    // Append the element within the Muuri container element if it is not there
    // already.
    if (element.parentNode !== muuri.element) {
      muuri.element.appendChild(element);
    }

    // Set item class.
    addClass(element, stn.itemClass);

    // Set up active state (defines if the item is considered part of the layout
    // or not).
    inst.isActive = isHidden ? false : true;

    // Set up positioning state (defines if the item is currently animating
    // it's position).
    inst.isPositioning = false;

    // Set up removing state (defines if the item is currently being removed).
    inst.isRemoving = false;

    // Set up visibility states.
    inst.isHidden = isHidden;
    inst.isHiding = false;
    inst.isShowing = false;

    // Visibility animation callback queue. Whenever a callback is provided for
    // show/hide methods and animation is enabled the callback is stored
    // temporarily to this array. The callbacks are called with the first
    // argument as false if the animation succeeded without interruptions and
    // with the first argument as true if the animation was interrupted.
    inst._peekabooQueue = [];

    // Set element's initial position.
    hookStyles(inst.element, {
      left: '0',
      top: '0',
      translateX: '0px',
      translateY: '0px'
    });

    // Set hidden/shown class.
    addClass(element, isHidden ? stn.hiddenClass : stn.shownClass);

    // Set hidden/shown styles for the child element.
    hookStyles(inst.child, {
      scale: isHidden ? 0 : 1,
      opacity: isHidden ? 0 : 1
    });

    // Enforce display "block" if element is visible.
    if (!isHidden) {
      setStyles(inst.element, {
        display: 'block'
      });
    }

    // Set up initial dimensions and positions.
    inst.refresh();
    inst.left = 0;
    inst.top = 0;

    // Set up drag & drop.
    inst._drag = {active: false};
    inst._release = {active: false};
    if (muuri._settings.dragEnabled) {
      inst._initDrag();
    }

    // Emit "item-init" event.
    inst.muuri._emitter.emit(evItemInit, inst);

  };

  /**
   * Make the item draggable with Hammer.js.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._initDrag = function () {

    var inst = this;
    var stn = inst.muuri._settings;

    // Initiate Hammer.
    var hammer = inst._hammer = new Hammer.Manager(inst.element);

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

    var inst = this;
    var drag = inst._drag;

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

    var inst = this;
    var drag = inst._drag;
    var emitter = inst.muuri._emitter;
    var stn = inst.muuri._settings;

    // If item is not active, don't start the drag.
    if (!inst.isActive) {
      return;
    }

    // Stop current positioning animation.
    if (inst.isPositioning) {
      inst._stopPositioning();
    }

    // Reset release data and remove release class if item is being released.
    if (inst._release.active) {
      removeClass(inst.element, stn.releasingClass);
      inst._resetReleaseData();
    }

    // Setup drag data.
    drag.active = true;
    drag.start = e;
    drag.move = e;
    drag.element = inst.element;
    drag.elemWidth = inst.width;
    drag.elemHeight = inst.height;

    // Get element's current position.
    var currentLeft = parseFloat(Velocity.hook(drag.element, 'translateX')) || 0;
    var currentTop = parseFloat(Velocity.hook(drag.element, 'translateY')) || 0;

    // Get container references.
    var defaultContainer = inst.muuri.element;
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
    arrayEach(drag.scrollParents, function (elem) {
      elem.addEventListener('scroll', drag.onScroll);
    });

    // Set drag class.
    addClass(drag.element, stn.draggingClass);

    // Emit "item-dragstart" event.
    emitter.emit(evItemDragStart, inst);

  };

  /**
   * Drag move handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragMove = function (e) {

    var inst = this;
    var drag = inst._drag;
    var emitter = inst.muuri._emitter;
    var stn = inst.muuri._settings;

    // If item is not active, reset drag.
    if (!inst.isActive) {
      inst._resetDrag();
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

    // Emit "item-dragmove" event.
    emitter.emit(evItemDragMove, inst);

  };

  /**
   * Drag scroll handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragScroll = function () {

    var inst = this;
    var drag = inst._drag;
    var emitter = inst.muuri._emitter;
    var stn = inst.muuri._settings;

    // Get containers.
    var defaultContainer = inst.muuri.element;
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

    // Emit "item-dragscroll" event.
    emitter.emit(evItemDragScroll, inst);

  };

  /**
   * Drag end handler.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._onDragEnd = function (e) {

    var inst = this;
    var drag = inst._drag;
    var emitter = inst.muuri._emitter;
    var stn = inst.muuri._settings;
    var release = inst._release;

    // If item is not active, reset drag.
    if (!inst.isActive) {
      inst._resetDrag();
      return;
    }

    // Finish currently queued overlap check.
    if (stn.dragSort) {
      drag.checkOverlap('finish');
    }

    // Remove scroll listeners
    arrayEach(drag.scrollParents, function (elem) {
      elem.removeEventListener('scroll', drag.onScroll);
    });

    // Remove drag classname from element.
    removeClass(drag.element, stn.draggingClass);

    // Flag drag as inactive.
    drag.active = false;

    // Emit "item-dragend" event.
    emitter.emit(evItemDragEnd, inst);

    // Setup release data.
    release.containerDiffX = drag.containerDiffX;
    release.containerDiffY = drag.containerDiffY;
    release.element = drag.element;

    // Reset drag data,
    inst._resetDragData();

    // Start the release process.
    inst._startRelease();

  };

  /**
   * Reset drag data and cancel any ongoing drag activity.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._resetDrag = function (e) {

    var inst = this;
    var drag = inst._drag;
    var stn = inst.muuri._settings;

    arrayEach(drag.scrollParents, function (elem) {
      elem.removeEventListener('scroll', drag.onScroll);
    });
    drag.checkOverlap('cancel');
    removeClass(drag.element, stn.draggingClass);
    inst._resetDragData();

  };

  /**
   * Reset release data.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._resetReleaseData = function () {

    var inst = this;
    var release = inst._release;

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

    var inst = this;
    var emitter = inst.muuri._emitter;
    var stn = inst.muuri._settings;
    var release = inst._release;

    // Flag release as active.
    release.active = true;

    // Add release classname to released element.
    addClass(release.element, stn.releasingClass);

    // Emit "item-releasestart" event.
    emitter.emit(evItemReleaseStart, inst);

    // Position the released item.
    inst.position();

  };

  /**
   * End the release process of an item.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._endRelease = function () {

    var inst = this;
    var emitter = inst.muuri._emitter;
    var stn = inst.muuri._settings;
    var release = inst._release;

    // Remove release classname from the released element.
    removeClass(release.element, stn.releasingClass);

    // If the released element is outside the muuri container put it back there
    // and adjust position accordingly.
    if (release.element.parentNode !== inst.muuri.element) {
      inst.muuri.element.appendChild(release.element);
      hookStyles(release.element, {
        translateX: inst.left + 'px',
        translateY: inst.top + 'px'
      });
    }

    // Reset release data.
    inst._resetReleaseData();

    // Emit "item-releaseend" event.
    emitter.emit(evItemReleaseEnd, inst);

  };

  /**
   * Check (during drag) if the item is overlapping another items and based on
   * the configurations do a relayout.
   *
   * @protected
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._checkOverlap = function () {

    var inst = this;
    var emitter = inst.muuri._emitter;
    var stn = inst.muuri._settings;
    var overlapTolerance = stn.dragOverlapTolerance;
    var overlapAction = stn.dragOverlapAction;
    var items = inst.muuri.items;
    var bestMatch = null;
    var instData = {
      width: inst._drag.elemWidth,
      height: inst._drag.elemHeight,
      left: inst._drag.gridX,
      top: inst._drag.gridY
    };

    // Find best match (the element with most overlap).
    arrayEach(items, function (item, i) {
      if (item.isActive && item !== inst) {
        var overlapScore = getOverlapScore(instData, item);
        if (!bestMatch || overlapScore > bestMatch.score) {
          bestMatch = {item: item, score: overlapScore};
        }
      }
    });

    // Check if the best match overlaps enough to justify a placement switch.
    if (bestMatch && bestMatch.score >= overlapTolerance) {

      var itemIndex = inst.index();
      var matchIndex = bestMatch.item.index();

      if (overlapAction === 'swap') {
        arraySwap(items, itemIndex, matchIndex);
        emitter.emit(evItemSwap, inst, itemIndex, matchIndex);
      }
      else {
        arrayMove(items, itemIndex, matchIndex);
        emitter.emit(evItemMove, inst, itemIndex, matchIndex);
      }

      inst.muuri.layout();

    }

  };

  /**
   * Process callback queue.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Array} queue
   * @param {Boolean} [interrupted=false]
   */
  Muuri.Item.prototype._processQueue = function (queue, interrupted) {

    arrayEach(queue.splice(0, queue.length), function (cb) {
      cb(interrupted);
    });

  };

  /**
   * Stop item's position animation if it is currently animating.
   *
   * @public
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype._stopPositioning = function () {

    var inst = this;
    var stn = inst.muuri._settings;

    if (inst.isPositioning) {

      // Stop animation.
      Velocity(inst.element, 'stop', inst.muuri._animQueue);

      // Remove visibility classes.
      removeClass(inst.element, stn.positioningClass);

      // Reset state.
      inst.isPositioning = false;

    }

  };

  /**
   * Get item's index.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @returns {Number}
   */
  Muuri.Item.prototype.index = function () {

    return this.muuri.items.indexOf(this);

  };

  /**
   * Recalculate item's dimensions.
   *
   * @public
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype.refresh = function () {

    var inst = this;

    if (!inst.isHidden) {
      inst.width = Math.round(Mezr.width(inst.element, 'margin'));
      inst.height = Math.round(Mezr.height(inst.element, 'margin'));
      inst.muuri._emitter.emit(evItemRefresh, inst);
    }

  };

  /**
   * Move item to an index. Accepts another Muuri. Item or an index of a
   * Muuri.Item as the target.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Number|Muuri.Item} target
   */
  Muuri.Item.prototype.moveTo = function (target) {

    var inst = this;
    var emitter = inst.muuri._emitter;
    var itemIndex = inst.index();
    var targetIndex = typeof target === 'number' ? target : target.index();

    if (itemIndex !== targetIndex) {
      arrayMove(inst.muuri.items, itemIndex, targetIndex);
      emitter.emit(evItemMove, inst, itemIndex, targetIndex);
    }

  };

  /**
   * Swap item's position with another item. Accepts another Muuri.Item or an
   * index of a Muuri.Item as the target.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Number|Muuri.Item} target
   */
  Muuri.Item.prototype.swapWith = function (target) {

    var inst = this;
    var emitter = inst.muuri._emitter;
    var itemIndex = inst.index();
    var targetIndex = typeof target === 'number' ? target : target.index();

    if (itemIndex !== targetIndex) {
      arraySwap(inst.muuri.items, itemIndex, targetIndex);
      emitter.emit(evItemSwap, inst, itemIndex, targetIndex);
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
  Muuri.Item.prototype.position = function (animate, callback) {

    var inst = this;
    var stn = inst.muuri._settings;
    var callback = typeof animate === 'boolean' ? callback : animate;
    var emitter = inst.muuri._emitter;
    var release = inst._release;
    var isJustReleased = release.active && release.positioningStarted === false;
    var animDuration = isJustReleased ? stn.dragReleaseDuration : stn.positionDuration;
    var animEasing = isJustReleased ? stn.dragReleaseEasing : stn.positionEasing;
    var animEnabled = animate === false ? false : animDuration > 0;
    var isPositioning = inst.isPositioning;
    var finish = function () {

      // Remove positioning classes.
      removeClass(inst.element, stn.positioningClass);

      // Mark the item as not positioning.
      inst.isPositioning = false;

      // Finish up release.
      if (release.active) {
        inst._endRelease();
      }

      // Call the callback.
      if (typeof callback === 'function') {
        callback(inst);
      }

      // Emit item-positionend event.
      emitter.emit(evItemPositionEnd, inst);

    };

    // Emit "item-positionstart" event.
    emitter.emit(evItemPositionStart, inst);

    // Stop currently running animation, if any.
    inst._stopPositioning();

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

      hookStyles(inst.element, {
        translateX: (inst.left + offsetLeft) + 'px',
        translateY: (inst.top + offsetTop) + 'px'
      });

      finish();

    }

    // If animations are needed, let's dive in.
    else {

      // Get current left and top position.
      var currentLeft = (parseFloat(Velocity.hook(inst.element, 'translateX')) || 0) + offsetLeft;
      var currentTop =  (parseFloat(Velocity.hook(inst.element, 'translateY')) || 0) + offsetTop;

      // If the item is already in correct position there's no need to animate
      // it.
      if (inst.left === currentLeft && inst.top === currentTop) {
        finish();
        return;
      }

      // Mark as positioning.
      inst.isPositioning = true;

      // Add positioning class if necessary.
      if (!isPositioning) {
        addClass(inst.element, stn.positioningClass);
      }

      // Set up the animation.
      Velocity(inst.element, {
        translateX: inst.left + offsetLeft,
        translateY: inst.top + offsetTop
      }, {
        duration: animDuration,
        easing: animEasing,
        complete: finish,
        queue: inst.muuri._animQueue
      });

      // Start the animation.
      Velocity.Utilities.dequeue(inst.element, inst.muuri._animQueue);

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
  Muuri.Item.prototype.show = function (animate, callback) {

    var inst = this;
    var stn = inst.muuri._settings;
    var emitter = inst.muuri._emitter;

    // Allow pasing the callback function also as the first argument.
    callback = typeof animate === 'function' ? animate : callback;

    // If item is currently being removed return immediately.
    if (inst.isRemoving) {

      return;

    }

    // If item is visible.
    else if (!inst.isHidden && !inst.isShowing) {

      // Call the callback and be done with it.
      if (typeof callback === 'function') {
        callback();
      }

    }

    // If item is animating to visible.
    else if (!inst.isHidden) {

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._peekabooQueue[inst._peekabooQueue.length] = callback;
      }

    }

    // If item is hidden or animating to hidden.
    else {

      var isHiding = inst.isHiding;

      // Stop animation.
      inst.muuri._itemHide.stop(inst);

      // Update states.
      inst.isActive = true;
      inst.isHidden = false;
      inst.isShowing = inst.isHiding = false;

      // Update classes.
      addClass(inst.element, stn.shownClass);
      removeClass(inst.element, stn.hiddenClass);

      // Set element's display style.
      setStyles(inst.element, {
        display: 'block'
      });

      // Process current callback queue.
      inst._processQueue(inst._peekabooQueue, true);

      // Emit item-hideend event with interrupted flag.
      if (isHiding) {
        emitter.emit(evItemHideEnd, inst, true);
      }

      // Emit item-showstart event.
      emitter.emit(evItemShowStart, inst);

      // Update state.
      inst.isShowing = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._peekabooQueue[inst._peekabooQueue.length] = callback;
      }

      // Animate child element.
      inst.muuri._itemShow.start(inst, animate, function () {

        // Process callback queue.
        inst._processQueue(inst._peekabooQueue);

        // Emit item-showend event.
        emitter.emit(evItemShowEnd, inst);

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
  Muuri.Item.prototype.hide = function (animate, callback) {

    var inst = this;
    var stn = inst.muuri._settings;
    var emitter = inst.muuri._emitter;

    // Allow pasing the callback function also as the first argument.
    callback = typeof animate === 'function' ? animate : callback;

    // If item is hidden.
    if (inst.isHidden && !inst.isHiding) {

      // Call the callback and be done with it.
      if (typeof callback === 'function') {
        callback();
      }

    }

    // If item is animating to hidden.
    else if (inst.isHidden) {

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._peekabooQueue[inst._peekabooQueue.length] = callback;
      }

    }

    // If item is visible or animating to visible.
    else {

      var isShowing = inst.isShowing;

      // Stop animation.
      inst.muuri._itemShow.stop(inst);

      // Update states.
      inst.isActive = false;
      inst.isHidden = true;
      inst.isShowing = inst.isHiding = false;

      // Update classes.
      addClass(inst.element, stn.hiddenClass);
      removeClass(inst.element, stn.shownClass);

      // Process current callback queue.
      inst._processQueue(inst._peekabooQueue, true);

      // Emit item-showend event with interrupted flag.
      if (isShowing) {
        emitter.emit(evItemShowEnd, inst, true);
      }

      // Emit item-hidestart event.
      emitter.emit(evItemHideStart, inst);

      // Animate child element.
      inst.muuri._itemHide.start(inst, animate, function () {

        // Hide element.
        setStyles(inst.element, {
          display: 'none'
        });

        // Process callback queue.
        inst._processQueue(inst._peekabooQueue);

        // Emit item-hideend event.
        emitter.emit(evItemHideEnd, inst);

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
  Muuri.Item.prototype.destroy = function (removeElement) {

    var inst = this;
    var stn = inst.muuri._settings;
    var emitter = inst.muuri._emitter;
    var index = inst.index();

    // Stop animations.
    inst._stopPositioning();
    inst.muuri._itemShow.stop(inst);
    inst.muuri._itemHide.stop(inst);

    // If item is being released, stop it gracefully.
    if (inst._release.active) {
      if (inst.element.parentNode !== inst.muuri.element) {
        inst.muuri.element.appendChild(inst.element);
      }
      inst._resetReleaseData();
    }

    // If item is being dragged, stop it gracefully.
    if (inst._drag.active) {
      if (inst.element.parentNode !== inst.muuri.element) {
        inst.muuri.element.appendChild(inst.element);
      }
      inst._resetDrag();
    }

    // Remove all inline styles.
    inst.element.removeAttribute('style');
    inst.child.removeAttribute('style');

    // Remove Muuri specific classes.
    removeClass(inst.element, stn.positioningClass);
    removeClass(inst.element, stn.draggingClass);
    removeClass(inst.element, stn.releasingClass);
    removeClass(inst.element, stn.itemClass);
    removeClass(inst.element, stn.shownClass);
    removeClass(inst.element, stn.hiddenClass);

    // Reset callback queues.
    inst._peekabooQueue.length = 0;

    // Destroy Hammer instance if it exists.
    if (inst._hammer) {
      inst._hammer.destroy();
    }

    // Remove item from Muuri instance if it still exists there.
    if (index > -1) {
      inst.muuri.items.splice(index, 1);
    }

    // Remove element from DOM.
    if (removeElement) {
      inst.element.parentNode.removeChild(inst.element);
    }

    // Render the instance unusable -> nullify all Muuri related properties.
    var props = Object.keys(inst).concat(Object.keys(Muuri.Item));
    for (var i = 0; i < props.length; i++) {
      inst[props[i]] = null;
    }

    // Emit "item-destroy" event.
    emitter.emit(evItemDestroy, index);

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
   * Loop array items. Provide the array as the first argument and a callback
   * function as the second argument, which will be called on each iteration
   * of the array. The callback function will receive the value of the array
   * iteration as the first argument and 0-based index as the second argument.
   * Returning a "truthy" value wihtin the callback breaks the loop.
   *
   * @private
   * @param {Array} array
   * @param {Function} callback
   * @returns {Array}
   */
  function arrayEach(array, callback) {

    for (var i = 0, len = array.length; i < len; i++) {
      if (callback(array[i], i)) {
        break;
      }
    }

    return array;

  }

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
   * Calculate how many percent the intersection area of two items is
   * from the maximum potential intersection area between the items.
   *
   * @param {Object} itemA
   * @param {Object} itemB
   * @returns {Number} A number between 0-100.
   */
  function getOverlapScore(itemA, itemB) {

    var intersection = Mezr.intersection(itemA, itemB, true);

    if (!intersection) {

      return 0;

    }
    else {

      var aUnpos = {
        width: itemA.width,
        height: itemA.height,
        left: 0,
        top: 0
      };

      var bUnpos = {
        width: itemB.width,
        height: itemB.height,
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
            Velocity(item.child, targetStyles, {
              duration: duration,
              easing: easing,
              queue: item.muuri._animQueue,
              complete: animDone
            });
            Velocity.Utilities.dequeue(item.child, item.muuri._animQueue);
          }
          else {
            hookStyles(item.child, targetStyles);
          }
        },
        stop: function (item) {
          Velocity(item.child, 'stop', item.muuri._animQueue);
        }
      };
    }

  }

  /**
   * Init
   */

  return Muuri;

}));