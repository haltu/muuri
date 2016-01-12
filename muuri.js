/*!
Muuri v0.0.8-dev
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
- Dragged item should keep track of it's original index in DOM before moving
  the item to drag container so that the release end function can put the
  element back to it's original place.
- Get rid of the even emitter dependency and built lightweight in-house
  solution.
- Allow connecting muuri instances so that items can be dragged from one to
  another.
- Handle scrolling the scroll container element during drag. Note that this
  can be left out since it is pretty easy to hook into the drag events and
  build your own scroll logic.
- Allow easy customizing of show and hide animations.
*/

(function (global, factory) {

  var libName = 'Muuri';
  var depJvent = global.Jvent;
  var depMezr = global.mezr;
  var depVelocity = typeof jQuery === 'function' ? jQuery.Velocity : global.Velocity;
  var depHammer = global.Hammer;
  global[libName] = factory(global, depJvent, depMezr, depVelocity, depHammer);

}(this, function (global, EventEmitter, Mezr, Velocity, Hammer, undefined) {

  /**
   * Constants
   * *********
   */

  var muuriId = 0;

  /**
   * Muuri constructor
   * *****************
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
    var stn = inst._settings = mergeObjects([{}, Muuri.defaultSettings, settings || {}]);

    // Instance id.
    inst._id = ++muuriId;

    // Unique animation queue name.
    inst._animQueue = 'muuri-' + inst._id;

    // Create private eventize instance.
    inst._emitter = new EventEmitter();

    // Setup container element.
    inst.element = stn.container;
    addClass(stn.container, stn.containerClass);

    // Setup initial items.
    inst.items = [];
    arrayEach(stn.items, function (element) {
      inst.items.push(new Muuri.Item(inst, element));
    });

    // Calculate grid's row height and column width.
    inst._rowHeight = inst._getSlotSize('height');
    inst._colWidth = inst._getSlotSize('width');

    // Relayout on window resize if enabled.
    if (stn.layoutOnResize || stn.layoutOnResize === 0) {
      var debounced = debounce(function () {
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
   * Calculate and return the virtual grid's slot width or height.
   *
   * @protected
   * @memberof Muuri.prototype
   * @param {String} type - Must be "width" or "height".
   * @param {Array} [items]
   * @returns {Number}
   */
  Muuri.prototype._getSlotSize = function (type, items) {

    var items = items ? items : this._getActiveItems();
    var hash = {};
    var sizes = [];
    var possibilities = [];

    // Generate hashtable.
    arrayEach(items, function (item) {
      hash[item[type]] = item[type];
    });

    // Transform hashtable to simple array.
    for (var prop in hash) {
      if (hash.hasOwnProperty(prop)) {
        sizes.push(hash[prop]);
      }
    }

    // Add the smallest size to the possibilities.
    possibilities.push(Math.min.apply(Math, sizes));

    // Add all the differences between sizes to possibilites.
    arrayEach(sizes, function (size) {
      arrayEach(sizes, function (sizeCompare) {
        var diff = Math.abs(size - sizeCompare);
        if (diff > 0) {
          possibilities.push(diff);
        }
      });
    });

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
    var containerWidth = mezr.width(inst.element, 'core');
    var grid = [];
    var items = inst._getActiveItems();
    var data = {
      items: items,
      containerWidth: containerWidth,
      fillWidth: 0,
      fillHeight: 0
    };

    // Loop visible items.
    arrayEach(items, function (item, i) {

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

    });

    return data;

  };

  /**
   * Bind an event listener.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {String} eventName
   * @param {Function} listener
   */
  Muuri.prototype.on = function (eventName, listener) {

    var inst = this;
    inst._emitter.on(eventName, listener);
    return inst;

  };

  /**
   * Bind a one-off event listener.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {String} eventName
   * @param {Function} listener
   */
  Muuri.prototype.once = function (eventName, listener) {

    var inst = this;
    inst._emitter.once(eventName, listener);
    return inst;

  };

  /**
   * Unbind an event listener.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {String} eventName
   * @param {Function} listener
   */
  Muuri.prototype.off = function (eventName, listener) {

    var inst = this;
    inst._emitter.off(name, listener);
    return inst;

  };

  /**
   * Get Muuri instance item by element or by index.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Number|HTMLElement} [target=0]
   * @returns {!Muuri.Item}
   */
  Muuri.prototype.getItem = function (target) {

    var inst = this;

    if (!target) {
      return inst.items[0] || null;
    }
    else if (typeOf(target) === 'number') {
      return inst.items[target] || null;
    }
    else {
      var ret = null;
      arrayEach(inst.items, function (item) {
        if (item.element === target) {
          ret = item;
          return true;
        }
      });
      return ret;
    }

  };

  /**
   * Get Muuri instances items that match the provided elements. If no elements
   * are provided returns all Muuri's items. Note that the returned array
   * is not the same object used by the Muuri instance so modifying it will
   * not affect Muuri's items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement} [elements]
   * @returns {Array} array of Muuri.Item instances
   */
  Muuri.prototype.getItems = function (elements) {

    var inst = this;

    // Return clone of all items instantly if no elements are provided.
    if (!elements) {
      return inst.items.slice();
    }

    var ret = [];
    arrayEach(typeOf(elements) === 'array' ? elements : [elements], function (elem) {
      ret.push(inst.getItem(elem));
    });

    return ret;

  };

  /**
   * Register existing DOM elements as Muuri items. Returns the new items that
   * were registered.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement} elements
   * @param {Number} [index=0]
   * @returns {Array}
   */
  Muuri.prototype.register = function (elements, index) {

    var inst = this;
    var newItems = [];

    // Make sure elements is an array.
    elements = typeOf(elements) === 'array' ? elements : [elements];

    // Filter out all elements that exist already in current instance.
    arrayEach(inst.items, function (item) {
      var index = elements.indexOf(item.element);
      if (index > -1) {
        elements.splice(index, 1);
      }
    });

    // Return early if there are no addable items.
    if (!elements.length) {
      return newItems;
    }

    // Create new items.
    arrayEach(elements, function (element) {
      newItems.push(new Muuri.Item(inst, element));
    });

    // Normalize the index for the splice apply hackery so that value of -1
    // prepends the new items to the current items.
    index = index < 0 ? inst.items.length - index + 1 : index;

    // Add the new items to the items collection to correct index.
    inst.items.splice.apply(inst.items, [index, 0].concat(newItems));

    // Emit "register" event.
    inst._emitter.emit('register', newItems);

    // Return new items
    return newItems;

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

    // Refresh items' dimensions.
    arrayEach(items, function (item) {
      item.refresh();
    });

    // Recalculate grid's row height and column width.
    inst._rowHeight = inst._getSlotSize('height', items);
    inst._colWidth = inst._getSlotSize('width', items);

    // Emit "refresh" event.
    inst._emitter.emit('refresh');

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

    arrayEach(inst.items, function (item) {
      if (item.element.parentNode === container) {
        container.appendChild(item.element);
      }
    });

    // Emit "syncelements" event.
    inst._emitter.emit('syncelements');

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
    var callback = typeOf(animate) === 'boolean' ? callback : animate;
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
        if (typeOf(callback) === 'function') {
          callback(inst);
        }

        // Emit "layoutend" event.
        emitter.emit('layoutend');

      }

    };

    // Stop currently running container animation.
    Velocity(inst.element, 'stop', inst._animQueue);

    // Emit "layoutstart" event.
    emitter.emit('layoutstart');

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
    arrayEach(grid.items, function (item) {
      if (item._drag.active) {
        tryFinish();
      }
      else {
        item.position(animEnabled, tryFinish);
      }
    });


  };

  /**
   * Show Muuri items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item} items
   * @param {Function} [callback]
   */
  Muuri.prototype.show = function (items, callback) {

    var inst = this;
    var emitter = inst._emitter;
    var finalItems = [];
    var isInterrupted = false;

    // Sanitize items.
    items = typeOf(items) === 'array' ? items : [items];
    var counter = items.length;

    // Function for attempting to finish the method process.
    var tryFinish = function (interrupted) {

      // If the current item's animation was interrupted.
      if (interrupted) {
        isInterrupted = true;
      }

      // If all items have finished their animations (if any).
      if (--counter < 1) {

        // Call callback.
        if (typeOf(callback) === 'function') {
          callback(finalItems, isInterrupted);
        }

        // Emit "showend" event.
        if (finalItems.length) {
          emitter.emit('showend', finalItems, isInterrupted);
        }

      }

    };

    // Sanitize items.
    arrayEach(items, function (item) {
      item = item instanceof Muuri.Item ? item : inst.getItem(item);
      if (item) {
        finalItems.push(item);
      }
    });

    // Show items.
    if (finalItems.length) {
      emitter.emit('showstart', finalItems);
      arrayEach(finalItems, function (item) {
        item.show(tryFinish);
      });
    }
    else {
      tryFinish();
    }

  };

  /**
   * Hide Muuri items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item} items
   * @param {Function} [callback]
   */
  Muuri.prototype.hide = function (items, callback) {

    var inst = this;
    var emitter = inst._emitter;
    var finalItems = [];
    var isInterrupted = false;

    // Sanitize items.
    items = typeOf(items) === 'array' ? items : [items];
    var counter = items.length;

    // Function for attempting to finish the method process.
    var tryFinish = function (interrupted) {

      // If the current item's animation was interrupted.
      if (interrupted) {
        isInterrupted = true;
      }

      // If all items have finished their animations (if any).
      if (--counter < 1) {

        // Call callback.
        if (typeOf(callback) === 'function') {
          callback(finalItems, isInterrupted);
        }

        // Emit "hideend" event.
        if (finalItems.length) {
          emitter.emit('hideend', finalItems, isInterrupted);
        }

      }

    };

    // Sanitize items.
    arrayEach(items, function (item) {
      item = item instanceof Muuri.Item ? item : inst.getItem(item);
      if (item) {
        finalItems.push(item);
      }
    });

    // Hide items.
    if (finalItems.length) {
      emitter.emit('hidestart', finalItems);
      arrayEach(finalItems, function (item) {
        item.hide(tryFinish);
      });
    }
    else {
      tryFinish();
    }

  };

  /**
   * Register existing DOM elements as Muuri items and animate them in.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement} elements
   * @param {Number} [index=0]
   * @param {Function} [callback]
   */
  Muuri.prototype.add = function (elements, index, callback) {

    var inst = this;
    var emitter = inst._emitter;

    // Allow callback to be the second argument.
    callback = typeOf(index) === 'function' ? index : callback;

    // Normalize index.
    index = typeOf(index) === 'number' ? index : 0;

    // Register new items.
    var newItems = inst.register(elements, index);
    var newItemsLength = newItems.length;

    // Create a process end handler.
    var finish = function (items, interrupted) {

      // Call callback function.
      if (typeOf(callback) === 'function') {
        callback(items, interrupted);
      }

      // Emit "addend" event.
      if (newItemsLength) {
        emitter.emit('addend', items, interrupted);
      }

    };

    // If there are new items
    if (newItemsLength) {

      // Emit "addstart" event.
      emitter.emit('addstart', newItems);

      // Make sure all items are visible.
      arrayEach(newItems, function (item) {
        item.show(false);
      });

      // Position items.
      inst._positionItems();

      // Set up items to their correct positions and hide them.
      arrayEach(newItems, function (item) {
        item.position(false);
        item.hide(false);
      });

      // Show items.
      inst.show(newItems, finish);

    }
    else {

      finish(newItems);

    }

  };

  /**
   * Remove items from muuri instance and their elements from DOM.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item} items
   * @param {Function} [callback]
   */
  Muuri.prototype.remove = function (items, callback) {

    var inst = this;
    var emitter = inst._emitter;
    var finalItems = [];

    // Create a process end handler.
    var finish = function () {

      // Call callback function.
      if (typeOf(callback) === 'function') {
        callback();
      }

      // Emit "removeend" event.
      if (finalItems.length) {
        emitter.emit('removeend', finalItems);
      }

    };

    // Sanitize items.
    items = typeOf(items) === 'array' ? items : [items];

    // Get items.
    arrayEach(items, function (item) {
      finalItems.push(item instanceof Muuri.Item ? item : inst.getItem(item));
    });

    // If items exist.
    if (finalItems.length) {

      // Emit "removestart" event.
      emitter.emit('removestart', finalItems);

      // Remove items instantly from Muuri instance.
      arrayEach(items, function (item) {
        item.isRemoving = true;
        var index = item.index();
        if (index > -1) {
          inst.items.splice(index, 1);
        }
      });

      // Hide and remove items from DOM.
      inst.hide(items, function () {
        arrayEach(items, function (item) {
          item.destroy(true);
        });
        finish();
      });

    }

    // If no items exist.
    else {

      finish();

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
    inst._emitter.emit('destroy');

    // Remove all event listeners.
    var events = inst._emitter._collection || {};
    for (var ev in events) {
      if (events.hasOwnProperty(ev) && typeOf(ev) === 'array') {
        events[ev].length = 0;
      }
    }

  };

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
    inst.muuri._emitter.emit('item-init', inst);

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

    // Add press recognizer to hammer.
    hammer.add(new Hammer.Press({
      event: 'press',
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
    drag.predicate = typeOf(stn.dragPredicate) === 'function' ? stn.dragPredicate : dragPredicate;
    drag.predicateData = {};
    drag.predicateResolved = false;

    // Press.
    hammer.on('press', function (e) {
      drag.predicateData = {};
      drag.predicateResolved = false;
      if (drag.predicate(e, inst, drag.predicateData)) {
        drag.predicateResolved = true;
      }
    });

    // Press up.
    hammer.on('pressup', function (e) {
      drag.predicate(e, inst, drag.predicateData);
    });

    // Drag start.
    hammer.on('dragstart', function (e) {
      if (drag.predicateResolved) {
        inst._onDragStart(e);
      }
      else {
        if (drag.predicate(e, inst, drag.predicateData)) {
          drag.predicateResolved = true;
        }
        if (drag.predicateResolved) {
          inst._onDragStart(e);
        }
      }
    });

    // Drag move.
    hammer.on('dragmove', function (e) {
      if (drag.predicateResolved) {
        inst._onDragMove(e);
      }
      else {
        if (drag.predicate(e, inst, drag.predicateData)) {
          drag.predicateResolved = true;
        }
        if (drag.predicateResolved) {
          inst._onDragStart(e);
        }
      }
    });

    // Drag end/cancel.
    hammer.on('dragend dragcancel', function (e) {
      drag.predicate(e, inst, drag.predicateData);
      if (drag.predicateResolved && drag.active) {
        inst._onDragEnd(e);
      }
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

    // The element that is currently dragged (instance element or it's clone).
    drag.element = null;

    // These values implicate the offset difference between the element's
    // temporary drag container and it's true container.
    drag.offsetDiffLeft = 0;
    drag.offsetDiffTop = 0;

    // The true left/top position data.
    drag.startLeft = 0;
    drag.startTop = 0;
    drag.currentLeft = 0;
    drag.currentTop = 0;

    // Relative left/top position meaning that in these values the container
    // offset difference is accounted for and allow user to compare the
    // element's current position directly to it's "virtual" grid position.
    drag.relativeStartLeft = 0;
    drag.relativeStartTop = 0;
    drag.relativeCurrentLeft = 0;
    drag.relativeCurrentTop = 0;

    // Hammer dragstart/dragend event data.
    drag.start = null;
    drag.move = null;

  };

  /**
   * Drag start functionality.
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

    // Get element's current position.
    var currentLeft = parseFloat(Velocity.hook(inst.element, 'translateX')) || 0;
    var currentTop = parseFloat(Velocity.hook(inst.element, 'translateY')) || 0;

    // Get container references.
    var defaultContainer = inst.muuri.element;
    var dragContainer = stn.dragContainer;

    // Set initial left/top drag value.
    drag.startLeft = drag.currentLeft = drag.relativeStartLeft = drag.relativeCurrentLeft = currentLeft;
    drag.startTop = drag.currentTop = drag.relativeStartTop = drag.relativeCurrentTop = currentTop;

    // If a specific drag container is set and it is different from the
    // default muuri container we need to cast some extra spells.
    if (dragContainer && dragContainer !== defaultContainer) {

      // If dragged element is already in drag container.
      if (inst.element.parentNode === dragContainer) {

        // Get offset diff.
        var offsetDiff = mezr.place([inst.element, 'margin'], {
          my: 'left top',
          at: 'left top',
          of: [defaultContainer, 'padding']
        });

        // Store the container offset diffs to drag data.
        drag.offsetDiffLeft = offsetDiff.left;
        drag.offsetDiffTop = offsetDiff.top;

        // Set up relative drag position data.
        drag.relativeStartLeft = drag.relativeCurrentLeft = currentLeft - drag.offsetDiffLeft;
        drag.relativeStartTop = drag.relativeCurrentTop = currentTop - drag.offsetDiffTop;

      }

      // If dragged element is not within the correct container.
      else {

        // Append element into correct container.
        dragContainer.appendChild(inst.element);

        // Get offset diff.
        var offsetDiff = mezr.place([inst.element, 'margin'], {
          my: 'left top',
          at: 'left top',
          of: [defaultContainer, 'padding']
        });

        // Store the container offset diffs to drag data.
        drag.offsetDiffLeft = offsetDiff.left;
        drag.offsetDiffTop = offsetDiff.top;

        // Set up drag position data.
        drag.startLeft = drag.currentLeft = currentLeft + drag.offsetDiffLeft;
        drag.startTop = drag.currentTop = currentTop + drag.offsetDiffTop;

        // Fix position to account for the append procedure.
        hookStyles(inst.element, {
          translateX: drag.startLeft + 'px',
          translateY: drag.startTop + 'px'
        });

      }

    }

    // Set drag class.
    addClass(inst.element, stn.draggingClass);

    // Emit "item-dragstart" event.
    emitter.emit('item-dragstart', inst);

  };

  /**
   * Drag move functionality.
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
      inst._resetDragData();
      removeClass(inst.element, stn.draggingClass);
      drag.checkOverlap('cancel');
      return;
    }

    // Store event.
    drag.move = e;

    // Update position data.
    var xDiff = drag.move.deltaX - drag.start.deltaX;
    var yDiff = drag.move.deltaY - drag.start.deltaY;
    drag.currentLeft = drag.startLeft + xDiff;
    drag.currentTop = drag.startTop + yDiff;
    drag.relativeCurrentLeft = drag.relativeStartLeft + xDiff;
    drag.relativeCurrentTop = drag.relativeStartTop + yDiff;

    // Update element's translateX/Y values.
    hookStyles(inst.element, {
      translateX: drag.currentLeft + 'px',
      translateY: drag.currentTop + 'px'
    });

    // Overlap handling.
    if (stn.dragSort) {
      drag.checkOverlap();
    }

    // Emit "item-dragmove" event.
    emitter.emit('item-dragmove', inst);

  };

  /**
   * Drag end functionality.
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
      inst._resetDragData();
      removeClass(inst.element, stn.draggingClass);
      drag.checkOverlap('cancel');
      return;
    }

    // Finish currently queued overlap check.
    if (stn.dragSort) {
      drag.checkOverlap('finish');
    }

    // Remove drag classname from element.
    removeClass(inst.element, stn.draggingClass);

    // Flag drag as inactive.
    drag.active = false;

    // Emit "item-dragend" event.
    emitter.emit('item-dragend', inst);

    // Setup release data.
    release.offsetDiffLeft = drag.offsetDiffLeft;
    release.offsetDiffTop = drag.offsetDiffTop;
    release.element = drag.element;

    // Reset drag data,
    inst._resetDragData();

    // Start the release process.
    inst._startRelease();

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
    release.offsetDiffLeft = 0;
    release.offsetDiffTop = 0;
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

    // Flag release as active.
    inst._release.active = true;

    // Add release classname to released element.
    addClass(inst.element, stn.releasingClass);

    // Emit "item-releasestart" event.
    emitter.emit('item-releasestart', inst);

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
    removeClass(inst.element, stn.releasingClass);

    // If the released element is outside the muuri container put it back there
    // and adjust position accordingly.
    if (inst.element.parentNode !== inst.muuri.element) {
      inst.muuri.element.appendChild(inst.element);
      hookStyles(inst.element, {
        translateX: inst.left + 'px',
        translateY: inst.top + 'px'
      });
    }

    // Reset release data.
    inst._resetReleaseData();

    // Emit "item-releaseend" event.
    emitter.emit('item-releaseend', inst);

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
      width: inst.width,
      height: inst.height,
      left: inst._drag.relativeCurrentLeft,
      top: inst._drag.relativeCurrentTop
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
        emitter.emit('item-swap', inst, itemIndex, matchIndex);
      }
      else {
        arrayMove(items, itemIndex, matchIndex);
        emitter.emit('item-move', inst, itemIndex, matchIndex);
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
      inst.muuri._emitter.emit('item-refresh', inst);
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
    var targetIndex = typeOf(target) === 'number' ? target : target.index();

    if (itemIndex !== targetIndex) {
      arrayMove(inst.muuri.items, itemIndex, targetIndex);
      emitter.emit('item-move', inst, itemIndex, targetIndex);
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
    var targetIndex = typeOf(target) === 'number' ? target : target.index();

    if (itemIndex !== targetIndex) {
      arraySwap(inst.muuri.items, itemIndex, targetIndex);
      emitter.emit('item-swap', inst, itemIndex, targetIndex);
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
    var callback = typeOf(animate) === 'boolean' ? callback : animate;
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
      if (typeOf(callback) === 'function') {
        callback(inst);
      }

      // Emit "item-positionend" event.
      emitter.emit('item-positionend', inst);

    };

    // Emit "item-positionstart" event.
    emitter.emit('item-positionstart', inst);

    // Stop currently running animation, if any.
    inst._stopPositioning();

    // Mark release positiong as started.
    if (isJustReleased) {
      release.positioningStarted = true;
    }

    // Get item container offset. This applies only for release handling in the
    // scenario where the released element is not currently within the muuri
    // container.
    var offsetLeft = inst._release.active ? inst._release.offsetDiffLeft : 0;
    var offsetTop = inst._release.active ? inst._release.offsetDiffTop : 0;

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
    callback = typeOf(animate) === 'function' ? animate : callback;

    // If item is currently being removed return immediately.
    if (inst.isRemoving) {

      return;

    }

    // If item is visible.
    else if (!inst.isHidden && !inst.isShowing) {

      // Call the callback and be done with it.
      if (typeOf(callback) === 'function') {
        callback();
      }

    }

    // If item is animating to visible.
    else if (!inst.isHidden) {

      // Push the callback to callback queue.
      if (typeOf(callback) === 'function') {
        inst._peekabooQueue.push(callback);
      }

    }

    // If item is hidden or animating to hidden.
    else {

      var isHiding = inst.isHiding;

      // Stop animation.
      Velocity(inst.child, 'stop', inst.muuri._animQueue);

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

      // Refresh the item's dimensions.
      inst.refresh();

      // Process current callback queue.
      inst._processQueue(inst._peekabooQueue, true);

      // Emit "item-hideend" event with interrupted flag.
      if (isHiding) {
        emitter.emit('item-hideend', inst, true);
      }

      // Emit "item-showstart" event.
      emitter.emit('item-showstart', inst);

      // If animations enabled.
      if (animate !== false && stn.showDuration > 0) {

        // Update state.
        inst.isShowing = true;

        // Push the callback to callback queue.
        if (typeOf(callback) === 'function') {
          inst._peekabooQueue.push(callback);
        }

        // Set up animation.
        Velocity(inst.child, {opacity: 1, scale: 1}, {
          duration: stn.showDuration,
          easing: stn.showEasing,
          queue: inst.muuri._animQueue,
          complete: function () {

            // Process callback queue.
            inst._processQueue(inst._peekabooQueue);

            // Emit "item-showend" event.
            emitter.emit('item-showend', inst);

          }
        });

        // Initialize the animation.
        Velocity.Utilities.dequeue(inst.child, inst.muuri._animQueue);

      }

      // If animations are disabled.
      else {

        // Set the styles manually and finish up.
        hookStyles(inst.child, {
          scale: 1,
          opacity: 1
        });

        // Call the callback and be done with it.
        if (typeOf(callback) === 'function') {
          callback();
        }

        // Emit "item-showend" event.
        emitter.emit('item-showend', inst);

      }

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
    callback = typeOf(animate) === 'function' ? animate : callback;

    // If item is hidden.
    if (inst.isHidden && !inst.isHiding) {

      // Call the callback and be done with it.
      if (typeOf(callback) === 'function') {
        callback();
      }

    }

    // If item is animating to hidden.
    else if (inst.isHidden) {

      // Push the callback to callback queue.
      if (typeOf(callback) === 'function') {
        inst._peekabooQueue.push(callback);
      }

    }

    // If item is visible or animating to visible.
    else {

      var isShowing = inst.isShowing;

      // Stop animation.
      Velocity(inst.child, 'stop', inst.muuri._animQueue);

      // Update states.
      inst.isActive = false;
      inst.isHidden = true;
      inst.isShowing = inst.isHiding = false;

      // Update classes.
      addClass(inst.element, stn.hiddenClass);
      removeClass(inst.element, stn.shownClass);

      // Process current callback queue.
      inst._processQueue(inst._peekabooQueue, true);

      // Emit "item-showend" event with interrupted flag.
      if (isShowing) {
        emitter.emit('item-showend', inst, true);
      }

      // Emit "item-hidestart" event.
      emitter.emit('item-hidestart', inst);

      // If animations enabled.
      if (animate !== false && stn.hideDuration > 0) {

        // Update state.
        inst.isHiding = true;

        // Push the callback to callback queue.
        if (typeOf(callback) === 'function') {
          inst._peekabooQueue.push(callback);
        }

        // Set up animation.
        Velocity(inst.child, {opacity: 0, scale: 0}, {
          duration: stn.hideDuration,
          easing: stn.hideEasing,
          queue: inst.muuri._animQueue,
          complete: function () {

            // Hide element.
            setStyles(inst.element, {
              display: 'none'
            });

            // Process callback queue.
            inst._processQueue(inst._peekabooQueue);

            // Emit "item-hideend" event.
            emitter.emit('item-hideend', inst);

          }
        });

        // Initialize the animation.
        Velocity.Utilities.dequeue(inst.child, inst.muuri._animQueue);

      }

      // If animations are disabled.
      else {

        // Set the styles manually and finish up.
        hookStyles(inst.child, {
          scale: 0,
          opacity: 0
        });

        // Hide element.
        setStyles(inst.element, {
          display: 'none'
        });

        // Call the callback and be done with it.
        if (typeOf(callback) === 'function') {
          callback();
        }

        // Emit "item-hideend" event.
        emitter.emit('item-hideend', inst);

      }

    }

  };

  /**
   * Destroy item instance.
   *
   * @public
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype.destroy = function (removeElement) {

    var inst = this;
    var stn = inst.muuri._settings;
    var emitter = inst.muuri._emitter;
    var index = inst.index();

    // Stop animations.
    inst._stopPositioning();
    Velocity(inst.child, 'stop', inst.muuri._animQueue);

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
      inst._resetDragData();
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

    // Emit "item-destroy" event.
    emitter.emit('item-destroy', inst);

  };

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
   * @property {Number} showDuration
   * @property {Array|String} showEasing
   * @property {Number} hideDuration
   * @property {Array|String} hideEasing
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
    showDuration: 300,
    showEasing: 'ease-out',
    hideDuration: 300,
    hideEasing: 'ease-out',

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
   * Helper functions
   * ****************
   */

  /**
   * Returns type of any object in lowercase letters.
   *
   * @public
   * @param {Object} value
   * @returns {String}
   */
  function typeOf(value) {

    var type = typeof value;
    return type !== 'object' ? type : ({}).toString.call(value).split(' ')[1].replace(']', '').toLowerCase();

  }

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
   * Merge properties of provided objects. The first object in the array is
   * considered as the destination object which inherits the properties of the
   * following objects. Merges object properties recursively if the property's
   * type is object in destination object and the source object.
   *
   * @param {Array} array
   * @returns {!Object}
   */
  function mergeObjects(array) {

    var dest = array.splice(0, 1)[0];

    arrayEach(array, function (src) {
      for (var prop in src) {
        if (src.hasOwnProperty(prop)) {
          if (typeOf(dest[prop]) === 'object' && typeOf(src[prop]) === 'object') {
            mergeObjects([dest[prop], src[prop]]);
          }
          else {
            dest[prop] = src[prop];
          }
        }
      }
    });

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
  function setStyles(element, styles, velocityHook) {

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
   * @param {Object} predicate
   */
  function dragPredicate(e, item, predicate) {

    if (predicate.isRejected) {
      return;
    }

    if (predicate.isResolved) {
      return true;
    }

    // For touch input we need to add a bit of delay before the drag can
    // begin in order not to break native scrolling.
    if (e.pointerType === 'touch') {

      if (e.type === 'press') {
        predicate.timeout = global.setTimeout(function() {
          predicate.isResolved = true;
        }, 150);
      }
      else if (Math.abs(e.deltaY) > 5 || Math.abs(e.deltaX) > 5) {
        predicate.isRejected = true;
        global.clearTimeout(predicate.timeout);
      }

    }

    // For other input types we can just specify a little threshold.
    else {

      if (Math.abs(e.deltaY) > 5 || Math.abs(e.deltaX) > 5) {
        return predicate.isResolved = true;
      }

    }

  }

  return Muuri;

}));