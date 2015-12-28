/*!
Muuri v0.0.1
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

  var transformName = getSupportedTransform();
  var animQueue = 'muuri';

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

    // Create private eventize instance.
    inst._e = new EventEmitter();

    // Setup container element.
    inst._element = stn.container;
    addClass(stn.container, stn.containerClass);

    // Setup initial items.
    inst._items = [];
    arrayEach(stn.items, function (element) {
      inst._items.push(new Muuri.Item(inst, element));
    });

    // Automatic row-height calculation.
    inst._rowHeight = inst._getRowHeight();

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
   * Return an ordered array of visible items.
   *
   * @protected
   * @memberof Muuri.prototype
   * @returns {Array}
   */
  Muuri.prototype._getVisibleItems = function () {

    return this._items.filter(function (item) {
      return item.isActive;
    });

  };

  /**
   * Calculate and return minimum row height for the grid.
   *
   * @protected
   * @memberof Muuri.prototype
   * @returns {Number}
   */
  Muuri.prototype._getRowHeight = function () {

    var inst = this;
    var stnRowHeight = inst._settings.rowHeight;

    if (stnRowHeight === 'auto') {

      var heightsHash = {};
      var heights = [];
      var possibilities = [];

      // Generate heights hashtable.
      arrayEach(inst._getVisibleItems(), function (item) {
        heightsHash[item.height] = item.height;
      });

      // Transform hashtable to simple array.
      for (var prop in heightsHash) {
        if (heightsHash.hasOwnProperty(prop)) {
          heights.push(heightsHash[prop]);
        }
      }

      // Add the smallest height to the possibilities.
      possibilities.push(Math.min.apply(Math, heights));

      // Add all the differences between heights to possibilites.
      arrayEach(heights, function (height) {
        arrayEach(heights, function (heightCompare) {
          var diff = Math.abs(height - heightCompare);
          if (diff > 0) {
            possibilities.push(diff);
          }
        });
      });

      // And voila! We have a winner.
      return Math.min.apply(Math, possibilities);

    }
    else {

      return stnRowHeight;

    }

  };

  /**
   * Create and return layout map, which is used by the layout method to
   * position the items.
   *
   * @protected
   * @memberof Muuri.prototype
   * @returns {Object}
   */
  Muuri.prototype._createLayoutMap = function () {

    var inst = this;
    var map = {
      rowHeight: inst._rowHeight,
      width: mezr.width(inst._element, 'core'),
      items: [],
      content: {
        width: 0,
        height: 0
      }
    };

    arrayEach(inst._getVisibleItems(), function (item, i) {

      // Reset item position.
      item.left = 0;
      item.top = 0;

      // Find an optimal position for the item in the current state of the map.
      // This function finds the position for the item and manipulates the
      // item's "left" and "top" coordinates accordingly.
      if (i > 0) {
        inst._positionLayoutMapItem(map, item);
      }

      // Update the map area width/height.
      map.content.width = Math.max(map.content.width, item.left + item.width);
      map.content.height = Math.max(map.content.height, item.top + item.height);

      // Add the item to map.
      map.items.push(item);

    });

    return map;

  };

  /**
   * Find an optimal position for an item in a layout map.
   *
   * @protected
   * @memberof Muuri.prototype
   * @param {Object} map
   * @param {Object} item
   */
  Muuri.prototype._positionLayoutMapItem = function (map, item) {

    var inst = this;
    var positionFound = false;
    var mapLength = map.items.length;

    // Before anything else let's make sure that the layout map item does not
    // breach the map's right edge.
    if ((item.left + item.width) > map.width) {
      item.left = 0;
      item.top += map.rowHeight;
    }

    arrayEach(map.items, function (compareItem, i) {

      // If the compare item overlaps with the current layout map item, let's
      // update the layout item's left position to position where it can not
      // conflict with the compare item. And break the loop for performance
      // reasons.
      if (Mezr.intersection(compareItem, item)) {
        item.left = compareItem.left + compareItem.width;
        return true;
      }
      // If is last item and no overlaps were found, we have found a valid
      // position for the item.
      else if (++i === mapLength) {
        positionFound = true;
      }

    });

    // If we have not found the position yet, let's try again.
    if (!positionFound) {
      inst._positionLayoutMapItem(map, item);
    }

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
    inst._e.on(eventName, listener);
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
    inst._e.once(eventName, listener);
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
    inst._e.off(name, listener);
    return inst;

  };

  /**
   * Destroy Muuri instance.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.destroy = function () {

    var inst = this;

    inst._e.emit('destroy');

    // Unbind window resize event listener.
    if (inst._resizeFn) {
      global.removeEventListener('resize', inst._resizeFn);
    }

    // Restore items.
    arrayEach(inst._items, function (item) {
      item.destroy();
    });

    // Restore container.
    removeClass(inst._element, inst._settings.containerClass);
    setStyles(inst._element, {
      height: ''
    });

    // Remove event listeners.
    inst._e.removeAllListeners('destroy');
    inst._e.removeAllListeners('refresh');
    inst._e.removeAllListeners('layoutStart');
    inst._e.removeAllListeners('layoutEnd');

  };

  /**
   * Refresh Muuri instance's items' dimensions and recalculate minimum row
   * height.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.refresh = function () {

    var inst = this;

    // Refresh items' dimensions.
    arrayEach(inst._getVisibleItems(), function (item) {
      item.refresh();
    });

    // Recalculate row height.
    inst._rowHeight = inst._getRowHeight();

    // Emit event.
    inst._e.emit('refresh');

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
    var callback = typeOf(animate) === 'boolean' ? callback : animate;
    var animEnabled = animate === false ? false : true;
    var layoutMap = inst._createLayoutMap();

    // Emit event.
    inst._e.emit('layoutStart');

    if (animEnabled) {

      // TODO: If nothing changes -> pass through. For this we probably need
      // to cache the current layout map.

      var containerAnimDuration = inst._settings.containerAnimDuration;
      var containerAnimEasing = inst._settings.containerAnimEasing;
      var animCounter = -1;
      var layoutMapLength = layoutMap.items.length;
      var tryFinish = function () {
        if (++animCounter === layoutMapLength && typeOf(callback) === 'function') {
          inst._e.emit('layoutEnd');
          callback(inst);
        }
      };

      // Stop currently running container animation.
      Velocity(inst._element, 'stop', animQueue);

      // If container's current inline height matches the target height, let's
      // we can skip manipulating the DOM.
      if (parseFloat(inst._element.style.height) === layoutMap.content.height) {
        tryFinish();
      }

      // Otherwise if container animations are enabled let's make it happen.
      else if (containerAnimDuration > 0) {
        Velocity(inst._element, {height: layoutMap.content.height}, {
          duration: containerAnimDuration,
          easing: containerAnimEasing,
          complete: tryFinish,
          queue: animQueue
        });
        Velocity.Utilities.dequeue(inst._element, animQueue);
      }

      // In all other cases just set the height and be done with it.
      else {
        setStyles(inst._element, {
          height: layoutMap.content.height + 'px'
        });
        tryFinish();
      }

      // Animate items to correct positions.
      arrayEach(layoutMap.items, function (item) {
        if (item._drag.active) {
          tryFinish();
        }
        else {
          item.position(tryFinish);
        }
      });

    }
    else {

      // Set container height.
      Velocity(inst._element, 'stop', animQueue);
      setStyles(inst._element, {
        height: layoutMap.content.height + 'px'
      });

      // Loop the layout items and apply positions.
      arrayEach(layoutMap.items, function (item) {
        if (item._drag.active) {
          return;
        }
        else {
          item.position(false);
        }
      });

      // Finish it up.
      inst._e.emit('layoutEnd');
      if (typeOf(callback) === 'function') {
        callback(inst);
      }

    }

  };

  /**
   * Get Muuri instance item by element or by index.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Number|HTMLElement} [target=0]
   * @returns {Muuri.Item|Null}
   */
  Muuri.prototype.getItem = function (target) {

    var inst = this;

    if (!target) {
      return inst._items[0] || null;
    }
    else if (typeOf(target) === 'number') {
      return inst._items[target] || null;
    }
    else {
      var ret = null;
      arrayEach(inst._items, function (item) {
        if (item.element === target) {
          ret = item;
          return true;
        }
      });
      return ret;
    }

  };

  /**
   * Get Muuri instances items that match the provided elements. if no elements
   * are provided returns all Muuri's items. Note that the returned array
   * is not the same object used by the Muuri instance so modifying it will
   * not affect Muuri's items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {HTMLElement} [elems]
   * @returns {Array} array of Muuri.Item instances
   */
  Muuri.prototype.getItems = function (elems) {

    var inst = this;

    // Return clone of all items instantly if no elements are provided.
    if (!elems) {
      return inst._items.slice(0);
    }

    var ret = [];
    arrayEach(typeOf(elems) === 'array' ? elems : [elems], function (elem) {
      ret.push(inst.getItem(elem));
    });

    return ret;

  };

  /**
   * Show Muuri items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Muuri.Item} items
   * @param {Function} callback
   */
  Muuri.prototype.show = function (items, callback) {

    var inst = this;
    var finalItems = [];

    // Sanitize items.
    items = typeOf(items) === 'array' ? items : [items];
    var counter = items.length;

    // Function for attempting to finish the method process.
    var tryFinish = function () {
      if (--counter < 1) {
        inst.layout();
        if (typeOf(callback) === 'function') {
          callback(finalItems);
        }
        inst._e.emit('show', finalItems);
      }
    };

    // Hide items.
    if (items.length) {
      arrayEach(items, function (item) {
        item = item instanceof Muuri.Item ? item : inst.getItem(item);
        finalItems.push(item);
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
   * @param {Function} callback
   */
  Muuri.prototype.hide = function (items, callback) {

    var inst = this;
    var finalItems = [];

    // Sanitize items.
    items = typeOf(items) === 'array' ? items : [items];
    var counter = items.length;

    // Function for attempting to finish the method process.
    var tryFinish = function () {
      if (--counter < 1) {
        inst.layout();
        if (typeOf(callback) === 'function') {
          callback(finalItems);
        }
        inst._e.emit('hide', finalItems);
      }
    };

    // Hide items.
    if (items.length) {
      arrayEach(items, function (item) {
        item = item instanceof Muuri.Item ? item : inst.getItem(item);
        finalItems.push(item);
        item.hide(tryFinish);
      });
    }
    else {
      tryFinish();
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

    var stn = muuri._settings;

    this.muuri = muuri;

    // Set up element.
    this.element = element;
    this.child = element.children[0];
    addClass(element, stn.itemClass);

    // Set up active state (defines if the item is considered part of the layout
    // or not).
    this.isActive = true;

    // Set up positioning and active state.
    this.isPositioning = false;

    // Set up visibility state.
    this.state = 'shown';
    addClass(element, stn.itemShownClass);

    // Set up initial dimensions and positions.
    this.refresh();
    this.left = 0;
    this.top = 0;

    // Set up drag & drop.
    if (muuri._settings.dragEnabled) {
      this._initDrag();
    }

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
    var hammerDragConfig = {
      event: 'pan',
      pointers: stn.dragPointers,
      threshold: stn.dragThreshold,
      direction: Hammer['DIRECTION_' + stn.dragDirection.toUpperCase()]
    };

    // Create a debounced checkOverlap function.
    var checkOverlap = debounce(function () {
      if (inst._drag.active) {
        inst._checkOverlap();
      }
    }, stn.dragOverlapInterval);

    // Setup drag data.
    inst._drag = {
      active: false,
      release: false,
      startLeft: 0,
      startTop: 0,
      currentLeft: 0,
      currentTop: 0,
      start: null,
      move: null
    };

    // Initiate Hammer.
    inst._hammer = new Hammer.Manager(inst.element, {
      recognizers: [
        [Hammer.Pan, hammerDragConfig]
      ]
    });

    // Hammer drag start.
    inst._hammer.on('panstart', function (e) {

      // Check if item is positioning currently.
      var isPositioning = inst.isPositioning;

      // Set dragging class.
      addClass(inst.element, stn.draggingClass);

      // Stop current animation.
      inst._stopPositioning();

      // Setup drag data.
      inst._drag.active = true;
      inst._drag.release = false;
      inst._drag.start = e;
      inst._drag.move = e;

      // Setup item position.
      if (!isPositioning) {

        // Get current left/top.
        inst._drag.startLeft = inst._drag.currentLeft = parseFloat(inst.element.style.left) || 0;
        inst._drag.startTop = inst._drag.currentTop = parseFloat(inst.element.style.top) || 0;

        // Transform the left/top values to translateX/translateY values.
        setStyles(inst.element, {
          transform: 'translateX(' + inst._drag.startLeft + 'px) translateY(' + inst._drag.startTop + 'px)',
          left: '0px',
          top: '0px'
        });

      }
      else {

        // Get current left/top.
        inst._drag.startLeft = inst._drag.currentLeft = parseFloat(Velocity.hook(inst.element, 'translateX')) || 0;
        inst._drag.startTop = inst._drag.currentTop = parseFloat(Velocity.hook(inst.element, 'translateY')) || 0;

      }

      // Overlap handling
      checkOverlap();

    });

    // Hammer drag move.
    inst._hammer.on('panmove', function (e) {

      // Store event.
      inst._drag.move = e;

      // Calculate current position.
      var offsetX = inst._drag.move.deltaX - inst._drag.start.deltaX;
      var offsetY = inst._drag.move.deltaY - inst._drag.start.deltaY;
      inst._drag.currentLeft = inst._drag.startLeft + offsetX;
      inst._drag.currentTop = inst._drag.startTop + offsetY;

      // Set position.
      setStyles(inst.element, {
        transform: 'translateX(' + inst._drag.currentLeft + 'px) translateY(' + inst._drag.currentTop + 'px)'
      });

      // Overlap handling
      checkOverlap();

    });

    // Hammer drag end/cancel.
    inst._hammer.on('panend pancancel', function (e) {

      // Finish currently queued overlap check.
      checkOverlap(true);

      // Remove dragging class.
      removeClass(inst.element, stn.draggingClass);

      // Mark drag as inactive and flag as released.
      inst._drag.active = false;
      inst._drag.release = true;

      // Position item.
      inst.position(function () {

        // Reset drag data.
        inst._drag.release = false;
        inst._drag.startLeft = 0;
        inst._drag.startTop = 0;
        inst._drag.currentLeft = 0;
        inst._drag.currentTop = 0;
        inst._drag.start = null;
        inst._drag.move = null;

      });

    });

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
    var stn = inst.muuri._settings;
    var overlapTolerance = stn.dragOverlapTolerance;
    var overlapAction = stn.dragOverlapAction;
    var items = inst.muuri._items;
    var bestMatch = null;
    var instData = {
      width: inst.width,
      height: inst.height,
      left: inst._drag.currentLeft,
      top: inst._drag.currentTop
    };
    var instIndex, bestMatchIndex;

    // Find best match (the element with most overlap).
    arrayEach(items, function (item, i) {
      if (item.isActive) {
        if (item === inst) {
          instIndex = i;
        }
        else {
          var overlapScore = getOverlapScore(instData, item);
          if (!bestMatch || overlapScore > bestMatch.score) {
            bestMatch = {item: item, score: overlapScore};
            bestMatchIndex = i;
          }
        }
      }
    });

    // Check if the best match overlaps enough to justify a placement switch.
    if (bestMatch && bestMatch.score >= overlapTolerance) {
      if (overlapAction === 'swap') {
        arraySwap(items, instIndex, bestMatchIndex);
      }
      else {
        arrayMove(items, instIndex, bestMatchIndex);
      }
      inst.muuri.layout();
    }

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
      Velocity(inst.element, 'stop', animQueue);
      removeClass(inst.element, stn.positioningClass);
      removeClass(inst.element, stn.releasingClass);
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

    return this.muuri._items.indexOf(this);

  };

  /**
   * Move item to an index. Accepts another Muuri.Item or an index of a
   * Muuri.Item as the target.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Number|Muuri.Item} target
   */
  Muuri.Item.prototype.moveTo = function (target) {

    arrayMove(this.muuri._items, this.index(), typeOf(target) === 'number' ? target : target.index());

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

    arraySwap(this.muuri._items, this.index(), typeOf(target) === 'number' ? target : target.index());

  };

  /**
   * Position item based on it's current data.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Boolean} [animate=true] Should we animate the positioning?
   * @param {Function} callback
   */
  Muuri.Item.prototype.position = function (animate, callback) {

    var inst = this;
    var stn = inst.muuri._settings;
    var callback = typeOf(animate) === 'boolean' ? callback : animate;
    var animDuration = inst._drag.release ? stn.dragReleaseAnimDuration : stn.itemAnimDuration;
    var animEasing = inst._drag.release ? stn.dragReleaseAnimEasing : stn.itemAnimEasing;
    var animEnabled = animate === false ? false : animDuration > 0;
    var isPositioning = inst.isPositioning;
    var finish = function () {

      // Set position as left/top properties and reset transform styles.
      setStyles(inst.element, {
        transform: '',
        left: inst.left + 'px',
        top: inst.top + 'px'
      });

      // Remove positioning classes.
      removeClass(inst.element, stn.positioningClass);
      removeClass(inst.element, stn.releasingClass);

      // Mark the item as not positioing.
      inst.isPositioning = false;

      // Call the callback.
      if (typeOf(callback) === 'function') {
        callback(inst);
      }

    };

    // Stop currently running animation, if any.
    inst._stopPositioning();

    // If animations are enabled.
    if (animEnabled) {

      // TODO: If target left/top are the same as current left/top
      // skip velocity.

      // Mark the item as positioning.
      inst.isPositioning = true;

      // Drag release handling.
      if (inst._drag.release) {

        inst._drag.release = false;
        Velocity.hook(inst.element, 'translateX', inst._drag.currentLeft + 'px');
        Velocity.hook(inst.element, 'translateY', inst._drag.currentTop + 'px');

        // Add classes.
        addClass(inst.element, stn.positioningClass);
        addClass(inst.element, stn.releasingClass);

      }
      // If item is not currently positioning we need to give it som special
      // love.
      else if (!isPositioning) {

        // Get current left/top.
        var currentLeft = parseFloat(inst.element.style.left) || 0;
        var currentTop = parseFloat(inst.element.style.top) || 0;

        // Transform the left/top values to translateX/translateY values.
        setStyles(inst.element, {
          transform: 'translateX(' + currentLeft + 'px) translateY(' + currentTop + 'px)',
          left: '0px',
          top: '0px'
        });

        // Forcefeed translate values values to velocity. Without this the
        // animations might start from wrong positions.
        Velocity.hook(inst.element, 'translateX', currentLeft + 'px');
        Velocity.hook(inst.element, 'translateY', currentTop + 'px');

        // Add classes.
        addClass(inst.element, stn.positioningClass);

      }

      // Do the animation.
      Velocity(inst.element, {
        translateX: inst.left,
        translateY: inst.top
      }, {
        duration: animDuration,
        easing: animEasing,
        complete: finish,
        queue: animQueue
      });
      Velocity.Utilities.dequeue(inst.element, animQueue);

    }
    // No animations, sync it up.
    else {
      finish();
    }

  };

  /**
   * Recalculate item's dimensions.
   *
   * @public
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype.refresh = function () {

    var inst = this;
    inst.width = Math.round(Mezr.width(inst.element, 'margin'));
    inst.height = Math.round(Mezr.height(inst.element, 'margin'));

  };

  /**
   * Show item.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Function} [callback]
   */
  Muuri.Item.prototype.show = function (callback) {

    var inst = this;
    var stn = inst.muuri._settings;

    if (inst.state === 'hidden') {

      var finish = function () {

        if (typeOf(callback) === 'function') {
          callback();
        }

      };

      // Update states.
      inst.isActive = true;
      inst.state = 'shown';

      // Stop currently running animation.
      Velocity(inst.child, 'stop', animQueue);

      // Update classes.
      addClass(inst.element, stn.itemShownClass);
      removeClass(inst.element, stn.itemHiddenClass);

      // Remove element's inline display style.
      setStyles(inst.element, {
        display: ''
      });

      // If animations enabled.
      if (stn.showDuration > 0) {

        // Set up animation.
        Velocity(inst.child, stn.showProps, {
          duration: stn.showDuration,
          easing: stn.showEasing,
          queue: animQueue,
          complete: finish
        });

        // Initialize the animation.
        Velocity.Utilities.dequeue(inst.child, animQueue);

      }

      // If animations are disabled.
      else {

        finish();

      }

    }

  };

  /**
   * Hide item.
   *
   * @public
   * @memberof Muuri.Item.prototype
   * @param {Function} [callback]
   */
  Muuri.Item.prototype.hide = function (callback) {

    var inst = this;
    var stn = inst.muuri._settings;

    if (inst.state === 'shown') {

      var finish = function () {

        setStyles(inst.element, {
          display: 'none'
        });

        if (typeOf(callback) === 'function') {
          callback();
        }

      };

      // Update states.
      inst.isActive = false;
      inst.state = 'hidden';

      // Stop currently running animation.
      Velocity(inst.child, 'stop', animQueue);

      // Update classes.
      addClass(inst.element, stn.itemHiddenClass);
      removeClass(inst.element, stn.itemShownClass);

      // If animations enabled.
      if (stn.hideDuration > 0) {

        // Set up animation.
        Velocity(inst.child, stn.hideProps, {
          duration: stn.hideDuration,
          easing: stn.hideEasing,
          queue: animQueue,
          complete: finish
        });

        // Initialize the animation.
        Velocity.Utilities.dequeue(inst.child, animQueue);

      }

      // If animations are disabled.
      else {

        finish();

      }

    }

  };

  /**
   * Destroy item instance.
   *
   * @public
   * @memberof Muuri.Item.prototype
   */
  Muuri.Item.prototype.destroy = function () {

    var inst = this;
    var stn = inst.muuri._settings;

    // Stop animations.
    inst._stopPositioning();

    // Remove all inline styles.
    // TODO: This could be enhanced a bit by removing only the styles that
    // Muuri adds and restoring the styles that Muuri has overwritten/removed.
    inst.element.removeAttribute('style');

    // Remove Muuri specific classes.
    removeClass(inst.element, stn.positioningClass);
    removeClass(inst.element, stn.draggingClass);
    removeClass(inst.element, stn.releasingClass);
    removeClass(inst.element, stn.itemClass);
    removeClass(inst.element, stn.itemShownClass);
    removeClass(inst.element, stn.itemHiddenClass);

    // Destroy Hammer instance if it exists.
    if (inst._hammer) {
      inst._hammer.destroy();
    }

  };

  /** Default settings. */
  Muuri.defaultSettings = {

    // Container
    container: null,
    containerAnimDuration: 300,
    containerAnimEasing: 'ease-out',

    // Items
    items: [],
    itemAnimDuration: 300,
    itemAnimEasing: 'ease-out',

    // Show
    showProps: {
      scale: 1,
      opacity: 1
    },
    showDuration: 200,
    showEasing: 'ease-out',

    // Hide
    hideProps: {
      scale: 0,
      opacity: 0
    },
    hideDuration: 200,
    hideEasing: 'ease-out',

    // Layout
    rowHeight: 'auto',
    layoutOnResize: 100,
    layoutOnInit: true,

    // Linked instances (drag from a muuri to another)
    linkedTo: [], // TODO

    // Drag & Drop
    dragEnabled: true,
    dragPointers: 1,
    dragThreshold: 10,
    dragDirection: 'all',
    dragReleaseAnimDuration: 300,
    dragReleaseAnimEasing: 'ease-out',
    dragOverlapInterval: 50,
    dragOverlapTolerance: 50, // 1 - 100
    dragOverlapAction: 'move', // move|swap
    dragHandle: '', // TODO
    dragClone: false, // TODO
    dragScroll: true, // TODO
    dragScrollSensitivity: 50, // TODO
    dragScrollSpeed: 50, // TODO

    // Classnames
    containerClass: 'muuri-container',
    itemClass: 'muuri-item',
    itemShownClass: 'muuri-item-shown',
    itemHiddenClass: 'muuri-item-hidden',
    positioningClass: 'muuri-positioning',
    draggingClass: 'muuri-dragging',
    releasingClass: 'muuri-releasing'

  };

  // Muuri public methods
  // ********************
  // .getItem()
  // .getItems()
  // .on()
  // .once()
  // .off()
  // .layout()
  // .destroy()
  // .refresh()
  // .show()
  // .hide()
  // .remove() // TODO
  // .add() // TODO
  // .link() // TODO
  // .unlink() // TODO

  // Muuri.Item public methods
  // *************************
  // .getIndex()
  // .show()
  // .hide()
  // .refresh()
  // .position()
  // .moveTo()
  // .swapWith()
  // .destroy()

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
   * @returns {Object|Null}
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
   * being true, calls the debounced function immediately if it is currently
   * waiting to be called.
   *
   * @param {Function} fn
   * @param {Number} wait
   * @returns {Function}
   */
  function debounce(fn, wait) {

    var timeout;

    return function (finish) {

      if (timeout !== undefined) {
        timeout = global.clearTimeout(timeout);
        if (finish) {
          fn();
        }
      }

      if (!finish) {
        timeout = global.setTimeout(function() {
          timeout = undefined;
          fn();
        }, wait);
      }

    };

  }

  /**
   * Get supported transform property name.
   *
   * @returns {String}
   */
  function getSupportedTransform() {

    var prefixes = ['transform','WebkitTransform','MozTransform','OTransform','msTransform'];
    for (var i = 0; i < 5; i++) {
      if (document.documentElement.style[prefixes[i]] !== undefined) {
        return prefixes[i];
      }
    }

  }

  /**
   * Set inline styles to an element.
   *
   * @param {HTMLElement} element
   * @param {Object} styles
   */
  function setStyles(element, styles) {

    for (var prop in styles) {
      element.style[prop === 'transform' ? transformName : prop] = styles[prop];
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
   * Calculate how many the percentages the intersection area of two items is
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
   * Remove class from an element.
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

  return Muuri;

}));