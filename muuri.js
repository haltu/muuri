/*!
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

  /**
   * Muuri constructor
   * *****************
   */

  function Muuri(settings) {

    var inst = this;

    // Create private eventize instance.
    inst._e = new EventEmitter();

    // Merge user settings with default settings.
    inst._settings = mergeObjects([{}, Muuri.defaultSettings, settings || {}]);

    // Setup container.
    inst.container = {
      element: inst._settings.container
    };

    // Setup initial items.
    inst.items = [];
    arrayEach(inst._settings.items, function (element) {
      inst.items.push(new Muuri.Item(inst, element));
    });

    // Automatic row-height calc.
    inst._rowHeight = inst._getRowHeight();

    // Relayout on window resize if enabled.
    if (inst._settings.layoutOnResize || inst._settings.layoutOnResize === 0) {
      var debounced = debounce(function () {
        inst.layout();
      }, inst._settings.layoutOnResize);
      inst._resizeFn = function () {
        debounced();
      };
      global.addEventListener('resize', inst._resizeFn);
    }

    // Layout on init if enabled.
    if (inst._settings.layoutOnInit) {
      inst.layout({animate: false});
    }

  }

  Muuri.prototype._getRowHeight = function () {

    var inst = this;
    var stnRowHeight = inst._settings.rowHeight;

    if (stnRowHeight === 'auto') {

      var heightsHash = {};
      var heights = [];
      var possibilities = [];

      // Generate heights hashtable.
      arrayEach(inst.items, function (item) {
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
   * Create a virtual layout map object, which is used by the layout method to
   * position the items.
   */
  Muuri.prototype._createLayoutMap = function (mapWidth) {

    var inst = this;
    var map = {
      rowHeight: inst._rowHeight,
      width: typeOf(mapWidth) === 'number' ? mapWidth : mezr.width(inst.container.element, 'core'),
      items: [],
      content: {
        width: 0,
        height: 0
      }
    };

    arrayEach(inst.items, function (item, i) {

      // Reset item position.
      item.left = 0;
      item.top = 0;

      // Apply bin-packing algorithm to find an optimal position for the item.
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
   */
  Muuri.prototype._positionLayoutMapItem = function(map, item) {

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

  Muuri.prototype.on = function (name, callback, context) {

    var inst = this;
    inst._e.on(name, listener, context);
    return inst;

  };

  Muuri.prototype.off = function (name, target) {

    var inst = this;
    inst._e.off(name, target);
    return inst;

  };

  Muuri.prototype.destroy = function () {

    var inst = this;

    inst._e.emit('beforeDestroy', []);

    // Unbind window resize event listener.
    if (inst._resizeFn) {
      global.removeEventListener('resize', inst._resizeFn);
    }

    // Restore items.
    arrayEach(inst.items, function (item) {
      item.destroy();
    });

    // Restore container.
    setStyles(inst.container.element, {
      height: ''
    });

    inst._e.emit('afterDestroy', []);

  };

  Muuri.prototype.refresh = function () {

    var inst = this;

    inst._e.emit('beforeRefresh', []);

    // Refresh items' dimensions.
    arrayEach(inst.items, function (item) {
      item.refresh();
    });

    // Recalculate row height.
    inst._rowHeight = inst._getRowHeight();

    inst._e.emit('afterRefresh', []);

  };

  Muuri.prototype.layout = function (opts, callback) {

    var inst = this;
    var hasOpts = typeOf(opts) === 'object';
    var callback = hasOpts ? callback : opts;
    var opts = hasOpts ? opts : {};
    var animDuration = inst._settings.animDuration;
    var animEasing = inst._settings.animEasing;
    var animEnabled = hasOpts && opts.animate === false ? false : animDuration > 0;
    var containerElem = inst.container.element;
    var layoutMap = inst._createLayoutMap(hasOpts && opts.width);

    inst._e.emit('beforeLayout', []);

    if (animEnabled) {

      // TODO: If nothing changes -> pass through. For this we probably need
      // to cache the current layout map.

      var layoutMapLength = layoutMap.items.length;
      var animCounter = -1;
      var tryFinish = function () {
        if (++animCounter === layoutMapLength && typeOf(callback) === 'function') {
          inst._e.emit('afterLayout', []);
          callback(inst);
        }
      };

      // Animate container.
      Velocity(containerElem, 'stop', true);
      Velocity(containerElem, {height: layoutMap.content.height}, {
        duration: animDuration,
        easing: animEasing,
        complete: tryFinish
      });

      // Animate items.
      arrayEach(layoutMap.items, function (item) {
        if (item.drag.active) {
          tryFinish();
        }
        else {
          item._position(tryFinish);
        }
      });

    }
    else {

      // Set container height.
      Velocity(containerElem, 'stop', true);
      setStyles(containerElem, {
        height: layoutMap.content.height + 'px'
      });

      // Loop the layout items and apply positions.
      arrayEach(layoutMap.items, function (item) {
        if (item.drag.active) {
          return;
        }
        else {
          item._position({animate: false});
        }
      });

      // Finish it up.
      inst._e.emit('afterLayout', []);
      if (typeOf(callback) === 'function') {
        callback(inst);
      }

    }

  };

  Muuri.Item = function (muuri, element) {

    this.muuri = muuri;
    this.element = element;
    this.isPositioning = false;
    this.left = 0;
    this.top = 0;

    // Set dimensions.
    this.refresh();

    // Setup hammer functionality.
    this._setupHammer();

  };

  Muuri.Item.prototype._setupHammer = function () {

    // TODO: This ought to be in the constructor itself.

    var inst = this;
    var dragStn = inst.muuri._settings.drag;
    var hammerDragConfig = {
      event: 'pan',
      pointers: dragStn.pointers,
      threshold: dragStn.threshold,
      direction: Hammer['DIRECTION_' + dragStn.direction.toUpperCase()]
    };

    // Create a debounced checkOverlap function.
    var checkOverlap = debounce(function () {
      if (inst.drag.active) {
        inst._handleOverlap();
      }
    }, dragStn.overlapInterval);

    // Setup drag data.
    inst.drag = {
      active: false,
      release: false,
      startLeft: 0,
      startTop: 0,
      currentLeft: 0,
      currentTop: 0,
      start: null,
      move: null
    };

    inst.hammer = new Hammer.Manager(inst.element, {
      recognizers: [
        [Hammer.Pan, hammerDragConfig]
      ]
    });

    inst.hammer.on('panstart', function (e) {

      // Check if item is positioning currently.
      var isPositioning = inst.isPositioning;

      // Stop current animation.
      inst._stop();

      // Setup drag data.
      inst.drag.active = true;
      inst.drag.release = false;
      inst.drag.start = e;
      inst.drag.move = e;

      // Setup item position.
      if (!isPositioning) {

        // Get current left/top.
        inst.drag.startLeft = inst.drag.currentLeft = parseFloat(inst.element.style.left) || 0;
        inst.drag.startTop = inst.drag.currentTop = parseFloat(inst.element.style.top) || 0;

        // Transform the left/top values to translateX/translateY values.
        setStyles(inst.element, {
          transform: 'translateX(' + inst.drag.startLeft + 'px) translateY(' + inst.drag.startTop + 'px)',
          left: '0px',
          top: '0px'
        });

      }
      else {

        // Get current left/top.
        inst.drag.startLeft = inst.drag.currentLeft = parseFloat(Velocity.hook(inst.element, 'translateX')) || 0;
        inst.drag.startTop = inst.drag.currentTop = parseFloat(Velocity.hook(inst.element, 'translateY')) || 0;

      }

      // Overlap handling
      checkOverlap();

    });

    inst.hammer.on('panmove', function (e) {

      // Store event.
      inst.drag.move = e;

      // Calculate current position.
      var offsetX = inst.drag.move.deltaX - inst.drag.start.deltaX;
      var offsetY = inst.drag.move.deltaY - inst.drag.start.deltaY;
      inst.drag.currentLeft = inst.drag.startLeft + offsetX;
      inst.drag.currentTop = inst.drag.startTop + offsetY;

      // Set position.
      setStyles(inst.element, {
        transform: 'translateX(' + inst.drag.currentLeft + 'px) translateY(' + inst.drag.currentTop + 'px)'
      });

      // Overlap handling
      checkOverlap();

    });

    inst.hammer.on('panend pancancel', function (e) {

      // Finish currently queued overlap check.
      checkOverlap(true);

      // Mark drag as inactive and flag as released.
      inst.drag.active = false;
      inst.drag.release = true;

      // Position item.
      inst._position(function () {

        // Reset drag data.
        inst.drag.release = false;
        inst.drag.startLeft = 0;
        inst.drag.startTop = 0;
        inst.drag.currentLeft = 0;
        inst.drag.currentTop = 0;
        inst.drag.start = null;
        inst.drag.move = null;

      });

    });

  };

  Muuri.Item.prototype._stop = function () {

    var inst = this;
    if (inst.isPositioning) {
      Velocity(inst.element, 'stop', true);
      inst.isPositioning = false;
    }

  };

  Muuri.Item.prototype._position = function (opts, callback) {

    var inst = this;
    var hasOpts = typeOf(opts) === 'object';
    var callback = hasOpts ? callback : opts;
    var opts = hasOpts ? opts : {};
    var settings = inst.muuri._settings;
    var animDuration = inst.drag.release ? settings.drag.releaseAnimDuration : settings.animDuration;
    var animEasing = inst.drag.release ? settings.drag.releaseAnimEasing : settings.animEasing;
    var animEnabled = hasOpts && opts.animate === false ? false : animDuration > 0;
    var isPositioning = inst.isPositioning;
    var finish = function () {
      setStyles(inst.element, {
        transform: '',
        left: inst.left + 'px',
        top: inst.top + 'px'
      });
      inst.isPositioning = false;
      if (typeOf(callback) === 'function') {
        callback(inst);
      }
    };

    // Stop currently running animation, if any.
    inst._stop();

    // If animations are enabled.
    if (animEnabled) {

      // Mark the item as positioning.
      inst.isPositioning = true;

      // Drag release handling.
      if (inst.drag.release) {

        inst.drag.release = false;
        Velocity.hook(inst.element, 'translateX', inst.drag.currentLeft + 'px');
        Velocity.hook(inst.element, 'translateY', inst.drag.currentTop + 'px');

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

      }

      // Do the animation.
      Velocity(inst.element, {
        translateX: inst.left,
        translateY: inst.top
      }, {
        duration: animDuration,
        easing: animEasing,
        complete: finish
      });

    }
    // No animations, sync it up.
    else {
      finish();
    }

  };

  Muuri.Item.prototype._handleOverlap = function () {

    var inst = this;
    var settings = inst.muuri._settings;
    var overlapTolerance = settings.drag.overlapTolerance;
    var overlapAction = settings.drag.overlapAction;
    var items = inst.muuri.items;
    var bestMatch = null;
    var instData = {
      width: inst.width,
      height: inst.height,
      left: inst.drag.currentLeft,
      top: inst.drag.currentTop
    };
    var instIndex, bestMatchIndex;

    // Find best match (the element with most overlap).
    arrayEach(items, function (item, i) {
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

  Muuri.Item.prototype.refresh = function () {

    var inst = this;
    inst.width = Math.round(Mezr.width(inst.element, 'margin'));
    inst.height = Math.round(Mezr.height(inst.element, 'margin'));

  };

  Muuri.Item.prototype.destroy = function () {

    var inst = this;
    Velocity(inst.element, 'stop', true);
    inst.element.removeAttribute('style');
    inst.hammer.destroy();

  };

  /** Default settings. */
  Muuri.defaultSettings = {
    container: global,
    items: [],
    rowHeight: 'auto',
    animDuration: 300,
    animEasing: 'ease-in-out',
    layoutOnResize: 100,
    layoutOnInit: true,
    drag: {
      pointers: 1,
      threshold: 10,
      direction: 'all',
      releaseAnimDuration: 300,
      releaseAnimEasing: 'ease-in-out',
      overlapInterval: 50,
      overlapTolerance: 50, // 1 - 100
      overlapAction: 'move' // move|swap
    }
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

  function cloneArray(array) {

    var
    arrayType = typeOf(array);

    return (
      arrayType === typeArray ? array.slice(0) :
      arrayType === typeArguments ? slice.call(array, 0) :
      []
    );

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
   * Move array item.
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

  return Muuri;

}));
