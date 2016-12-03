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
      - [x] Optimize all functions where arguments is used.
      - [x] Attach all Helper constructors to Muuri as static properties.
* [x] When dragging items, don't count margins as part of the item.
* [x] Allow defining custom drag predicate.
* [x] Fix broken hide/show methods (if no hide/show animationduration is defined
      muuri will break).
* [x] Allow defining hide/show styles.
* [x] Replace Velocity dependency by providing animation engine adapter,
      which defaults to built-in CSS Transforms animation engine.
* [x] Try to build tiny custom functions to replace mezr.
* [ ] Bug in IE Edge: sometimes the items are laid out wrong after dragging.
      Seems to be related to the animation engine since it occurs also when
      resizing the screen.
* [ ] Use element.animate if available.
* [ ] Handle drag initiation similar to Packery. The drag events can be
      bound/unbound on specific items. All in all, the drag handling stuff
      shold be separated into it's own section since it's optional.
* [ ] Layout engine refactoring -> Make it easier to use. Simplify.
* [ ] Perf optimizations.
     - https://medium.com/@xilefmai/efficient-javascript-14a11651d563#.49gifamju
     - https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
* [ ] More unit tests.
* [ ] Create an ESLint config for the project.
* [ ] UMD module definition.

TODO v0.4.0
===========
* [ ] Allow dropping on empty slots (gaps).
* [ ] Optional drag placeholder.
* [ ] Stagger option(s) to achieve similar delayed animations as shuffle.js.

TODO v0.5.0
===========
* [ ] How to connect two or more Muuri instances o that items can be dragged
      from an instance to another. Check out draggable.js and dragula.js, they
      have implmented it.

TODO v0.6.0
===========
* [ ] How to use this with popular frameworks: React, Vue, Angular2, Ember,
      Meteor, etc...?

*/

(function (global, factory) {

  var libName = 'Muuri';
  var Hammer = global.Hammer;

  global[libName] = factory(global, Hammer);

}(this, function (global, Hammer, undefined) {

  'use strict';

  var libName = 'Muuri';

  // Id which is used for Muuri instances and Item instances. Incremented every
  // time it is used.
  var uuid = 0;

  // Get the supported transform and transition style properties.
  var transform = getSupportedStyle('transform');
  var transition = getSupportedStyle('transition');

  // Get the correct requestAnimatinoFrame method.
  var raf = global.requestAnimationFrame ||
            global.webkitRequestAnimationFrame ||
            global.mozRequestAnimationFrame ||
            global.msRequestAnimationFrame ||
            global.oRequestAnimationFrame ||
            null;

  // Do transformed elements leak fixed elements? According W3C specification
  // (about transform rendering) a transformed element should contain fixed
  // elements, but not every browser follows the spec. So we need to test it.
  var transformLeaksFixed = doesTransformLeakFixed();

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
   *   container: document.getElementyId('grid'),
   *   items: document.getElementsByClassName('item')
   * });
   */
  function Muuri(settings) {

    var inst = this;
    var debounced;

    // Merge user settings with default settings.
    var stn = inst._settings = mergeOptions({}, Muuri.defaultSettings, settings || {});

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
    inst._itemShow = typeof stn.show === 'function' ? stn.show() : getItemVisbilityHandler('show', stn.show);
    inst._itemHide = typeof stn.hide === 'function' ? stn.hide() : getItemVisbilityHandler('hide', stn.hide);

    // Setup drag sort handler.
    inst._dragSort = typeof stn.dragSortPredicate === 'function' ? stn.dragSortPredicate : dragSortHandler;

    // Setup initial items.
    inst._items = Array.prototype.slice.call(stn.items).map(function (element) {
      return new Item(inst, element);
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

  // Add all core constructors as static properties to Muuri constructor.
  Muuri.Item = Item;
  Muuri.Layout = Layout;
  Muuri.Animate = Animate;
  Muuri.Emitter = Emitter;

  /**
   * Default settings for Muuri instance.
   *
   * @public
   * @memberof Muuri
   * @property {HTMLElement} container
   * @property {Array} items
   * @property {!Function|Object} show
   * @property {!Function|Object} hide
   * @property {Array|String} layout
   * @property {!Number} layoutOnResize
   * @property {Boolean} layoutOnInit
   * @property {Number} layoutDuration
   * @property {Array|String} layoutEasing
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
      easing: 'ease',
      styles: {
        opacity: 1,
        transform: 'scale(1)'
      }
    },
    hide: {
      duration: 300,
      easing: 'ease',
      styles: {
        opacity: 0,
        transform: 'scale(0.5)'
      }
    },

    // Layout
    layout: 'firstFit',
    layoutOnResize: 100,
    layoutOnInit: true,
    layoutDuration: 300,
    layoutEasing: 'ease',

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
    dragReleaseEasing: 'ease',

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
   * Get instance's item by element or by index. Target can also be a
   * Muuri item instance in which case the function returns the item if it
   * exists within related Muuri instance. If nothing is found with the
   * provided target null is returned.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {HTMLElement|Item|Number} [target=0]
   * @returns {!Item}
   */
  Muuri.prototype._getItem = function (target) {

    var inst = this;
    var index;
    var ret;
    var item;
    var i;

    // If no target is specified, return the first item or null.
    if (!target) {

      return inst._items[0] || null;

    }
    // If the target is instance of Item return it if it is attached to this
    // Muuri instance, otherwise return null.
    else if (target instanceof Item) {

      return target._muuri === inst ? target : null;

    }
    // If target is number return the item in that index. If the number is lower
    // than zero look for the item starting from the end of the items array. For
    // example -1 for the last item, -2 for the second last item, etc.
    else if (typeof target === 'number') {

      index = target > -1 ? target : inst._items.length + target;

      return inst._items[index] || null;

    }
    // In other cases let's assume that the target is an element, so let's try
    // to find an item that matches the element and return it. If item is not
    // found return null.
    else {

      ret = null;

      for (i = 0; i < inst._items.length; i++) {
        item = inst._items[i];
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
   * @param {Array|HTMLElement|Item|Number} [items]
   */
  Muuri.prototype.refresh = function (items) {

    var targetItems = this.get(items || 'active');
    var i;

    for (i = 0; i < targetItems.length; i++) {
      targetItems[i]._refresh();
    }

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
   * @param {Array|HTMLElement|Item|Number} [targets]
   * @param {String} [state]
   * @returns {Array} Array of Muuri item instances.
   */
  Muuri.prototype.get = function (targets, state) {

    // TODO: Allow targets being a live nodeList. Gotta get rid of concat.

    var inst = this;
    var hasTargets = targets && typeof targets !== 'string';
    var targetItems = hasTargets ? [].concat(targets) : null;
    var targetState = !hasTargets ? targets : state;
    var ret = [];
    var isActive;
    var isInactive;
    var item;
    var i;

    // Sanitize target state.
    targetState = typeof targetState === 'string' ? targetState : null;

    // If target state or target items are defined return filtered results.
    if (targetState || targetItems) {

      targetItems = targetItems || inst._items;
      isActive = targetState === 'active';
      isInactive = targetState === 'inactive';

      for (i = 0; i < targetItems.length; i++) {
        item = hasTargets ? inst._getItem(targetItems[i]) : targetItems[i];
        if (item && (!targetState || (isActive && item._isActive) || (isInactive && !item._isActive))) {
          ret[ret.length] = item;
        }
      }

      return ret;

    }

    // Otherwise return all items.
    else {

      return ret.concat(inst._items);

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

    var inst = this;
    var targetElements = [].concat(elements);
    var newItems = [];
    var items = inst._items;
    var needsRelayout = false;
    var targetIndex;
    var elementIndex;
    var item;
    var i;

    // Filter out all elements that exist already in current instance.
    for (i = 0; i < items.length; i++) {
      elementIndex = targetElements.indexOf(items[i]._element);
      if (elementIndex > -1) {
        targetElements.splice(elementIndex, 1);
      }
    }

    // Return early if there are no valid items.
    if (!targetElements.length) {
      return newItems;
    }

    // Create new items.
    for (i = 0; i < targetElements.length; i++) {
      item = new Item(inst, targetElements[i]);
      newItems[newItems.length] = item;
      if (item._isActive) {
        needsRelayout = true;
        item._noLayoutAnimation = true;
      }
    }

    // Normalize the index for the splice apply hackery so that value of -1
    // appends the new items to the current items.
    targetIndex = typeof index === 'number' ? index : -1;
    targetIndex = targetIndex < 0 ? items.length - targetIndex + 1 : targetIndex;

    // Add the new items to the items collection to correct index.
    items.splice.apply(items, [targetIndex, 0].concat(newItems));

    // If relayout is needed.
    if (needsRelayout) {
      inst.layout();
    }

    // Emit add event.
    inst._emitter.emit(evAdd, newItems);

    // Return new items.
    return newItems;

  };

  /**
   * Remove items from muuri instances.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Item|Number} items
   * @param {Boolean} [removeElement=false]
   * @returns {Array} The indices of removed items.
   */
  Muuri.prototype.remove = function (items, removeElement) {

    var inst = this;
    var targetItems = inst.get(items);
    var indices = [];
    var needsRelayout = false;
    var item;
    var i;

    for (i = 0; i < targetItems.length; i++) {
      item = targetItems[i];
      if (item._isActive) {
        needsRelayout = true;
      }
      indices[indices.length] = item._destroy(removeElement);
    }

    if (needsRelayout) {
      inst.layout();
    }

    inst._emitter.emit(evRemove, indices);

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

    var inst = this;
    var container = inst._element;
    var items = inst._items;
    var element;
    var i;

    for (i = 0; i < items.length; i++) {
      element = items[i]._element;
      if (element.parentNode === container) {
        container.appendChild(element);
      }
    }

    inst._emitter.emit(evSynchronize);

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
    var layout = new Layout(inst);
    var counter = -1;
    var itemsLength = layout.items.length;
    var completed = [];
    var tryFinish = function (interrupted, item) {

      // Push all items to the completed items array which were not interrupted.
      if (!interrupted) {
        completed[completed.length] = item;
      }

      // If container and all items have finished their animations (if any),
      // call callback and emit layoutend event.
      if (++counter === itemsLength) {
        if (typeof cb === 'function') {
          cb(completed, layout);
        }
        emitter.emit(evLayoutEnd, completed, layout);
      }

    };
    var item;
    var position;
    var i;

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

      for (i = 0; i < layout.items.length; i++) {

        item = layout.items[i];
        position = layout.slots[item._id];

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

      }

    }

  };

  /**
   * Show instance items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Item|Number} items
   * @param {Boolean} [instant=false]
   * @param {Function} [callback]
   */
  Muuri.prototype.show = function (items, instant, callback) {

    setVisibility(this, 'show', items, instant, callback);

  };

  /**
   * Hide instance items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {Array|HTMLElement|Item|Number} items
   * @param {Boolean} [instant=false]
   * @param {Function} [callback]
   */
  Muuri.prototype.hide = function (items, instant, callback) {

    setVisibility(this, 'hide', items, instant, callback);

  };

  /**
   * Get item's index. Returns -1 if the item is not found.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {HTMLElement|Item|Number} item
   * @returns {Number}
   */
  Muuri.prototype.indexOf = function (item) {

    var items = this._items;
    var i;

    // If item is a number assume it is an index and verify that an item exits
    // in that index. If it exists, return the index. Otherwise return -1.
    if (typeof item === 'number') {

      return item <= (items.length - 1) ? item : -1;

    }

    // If the item is a Muuri item get it's index or return -1 if the item
    // does not exist in the Muuri instance.
    else if (item instanceof Item) {

      return items.indexOf(item);

    }
    else {

      for (i = 0; i < items.length; i++) {
        if (items[i]._element === item) {
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
   * @param {HTMLElement|Item|Number} targetFrom
   * @param {HTMLElement|Item|Number} targetTo
   */
  Muuri.prototype.move = function (targetFrom, targetTo) {

    var inst = this;
    targetFrom = inst._getItem(targetFrom);
    targetTo = inst._getItem(targetTo);

    if (targetFrom && targetTo && (targetFrom !== targetTo)) {
      arrayMove(inst._items, inst._items.indexOf(targetFrom), inst._items.indexOf(targetTo));
      inst._emitter.emit(evMove, targetFrom, targetTo);
    }

  };

  /**
   * Swap positions of two items.
   *
   * @public
   * @memberof Muuri.prototype
   * @param {HTMLElement|Item|Number} targetA
   * @param {HTMLElement|Item|Number} targetB
   */
  Muuri.prototype.swap = function (targetA, targetB) {

    var inst = this;
    targetA = inst._getItem(targetA);
    targetB = inst._getItem(targetB);

    if (targetA && targetB && (targetA !== targetB)) {
      arraySwap(inst._items, inst._items.indexOf(targetA), inst._items.indexOf(targetB));
      inst._emitter.emit(evSwap, targetA, targetB);
    }

  };

  /**
   * Destroy the instance.
   *
   * @public
   * @memberof Muuri.prototype
   */
  Muuri.prototype.destroy = function () {

    var inst = this;
    var container = inst._element;
    var items = inst._items.concat();
    var emitter = inst._emitter;
    var props = Object.keys(inst).concat(Object.keys(Muuri.prototype));
    var emitterEvents;
    var i;

    // Unbind window resize event listener.
    if (inst._resizeHandler) {
      global.removeEventListener('resize', inst._resizeHandler);
    }

    // Destroy items.
    for (i = 0; i < items.length; i++) {
      items[i]._destroy();
    }

    // Restore container.
    removeClass(container, inst._settings.containerClass);
    setStyles(container, {
      height: ''
    });

    // Emit destroy event.
    emitter.emit(evDestroy);

    // Remove all event listeners.
    emitterEvents = Object.keys(emitter._events || {});
    for (i = 0; i < emitterEvents.length; i++) {
      emitter._events[emitterEvents[i]].length = 0;
    }

    // Render the instance unusable -> nullify all Muuri related properties.
    for (i = 0; i < props.length; i++) {
      inst[props[i]] = null;
    }

  };

  /**
   * Item
   * ****
   */

  /**
   * Creates a new Item instance for Muuri instance.
   *
   * @public
   * @class
   * @param {Muuri} muuri
   * @param {HTMLElement} element
   */
  function Item(muuri, element) {

    var inst = this;
    var stn = muuri._settings;
    var isHidden;
    var visibilityStyles;

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
    inst._id = ++uuid;
    inst._muuri = muuri;
    inst._element = element;
    inst._child = element.children[0];

    // Initiate item's animation controllers.
    inst._animate = new Animate(element);
    inst._animateChild = new Animate(inst._child);

    // Set item class.
    addClass(element, stn.itemClass);

    // Set up active state (defines if the item is considered part of the layout
    // or not).
    inst._isActive = isHidden ? false : true;

    // Set up positioning state (defines if the item is currently animating
    // it's position).
    inst._isPositioning = false;

    // Set up visibility states.
    inst._isHidden = isHidden;
    inst._isHiding = false;
    inst._isShowing = false;

    // Visibility animation callback queue. Whenever a callback is provided for
    // show/hide methods and animation is enabled the callback is stored
    // temporarily to this array. The callbacks are called with the first
    // argument as false if the animation succeeded without interruptions and
    // with the first argument as true if the animation was interrupted.
    inst._visibilityQueue = [];

    // Layout animation callback queue. Whenever a callback is provided for
    // layout method and animation is enabled the callback is stored temporarily
    // to this array. The callbacks are called with the first argument as false
    // if the animation succeeded without interruptions and with the first
    // argument as true if the animation was interrupted.
    inst._layoutQueue = [];

    // Set element's initial position.
    setStyles(inst._element, {
      left: '0',
      top: '0',
      transform: 'translateX(0px) translateY(0px)'
    });

    // Set hidden/shown class.
    addClass(element, isHidden ? stn.hiddenClass : stn.shownClass);

    // Set hidden/shown styles for the child element.
    visibilityStyles = muuri[isHidden ? '_itemHide' : '_itemShow'].styles;
    if (visibilityStyles) {
      setStyles(inst._child, visibilityStyles);
    }

    // Enforce display "block" if element is visible.
    if (!isHidden) {
      setStyles(inst._element, {
        display: 'block'
      });
    }

    // Set up initial dimensions and positions.
    inst._refresh();
    inst._left = 0;
    inst._top = 0;

    // Set up drag & drop.
    inst._drag = {active: false};
    inst._release = {active: false};
    if (muuri._settings.dragEnabled) {
      inst._initDrag();
    }

  }

  /**
   * Get instance's data.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype.getData = function () {

    var inst = this;

    return {
      element: inst._element,
      width: inst._width,
      height: inst._height,
      margin: {
        left: inst._margin.left,
        top: inst._margin.top,
        right: inst._margin.right,
        bottom: inst._margin.bottom
      },
      left: inst._left,
      top: inst._top,
      active: inst._isActive,
      positioning: inst._isPositioning,
      dragging: inst._drag.active,
      releasing: inst._release.active,
      visibility: inst._isHiding ? 'hiding' :
                  inst._isShowing ? 'showing' :
                  inst._isHidden ? 'hidden' : 'shown'
    };

  };

  /**
   * Make the item draggable with Hammer.js.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._initDrag = function () {

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
   * @memberof Item.prototype
   */
  Item.prototype._resetDragData = function () {

    var drag = this._drag;

    // Is the drag active or not?
    drag.active = false;

    // Hammer event data.
    drag.start = null;
    drag.lastMove = null;
    drag.move = null;

    // The dragged Item reference.
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
    drag.elementClientX = 0;
    drag.elementClientY = 0;

    // Offset difference between the dragged element's temporary drag container
    // and it's original container.
    drag.containerDiffX = 0;
    drag.containerDiffY = 0;

  };

  /**
   * Drag start handler.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._onDragStart = function (e) {

    var inst = this;
    var drag = inst._drag;
    var stn = inst._muuri._settings;
    var isReleased = inst._release.active;
    var currentLeft;
    var currentTop;
    var muuriContainer;
    var dragContainer;
    var offsetDiff;
    var elementGBCR;
    var i;

    // If item is not active, don't start the drag.
    if (!inst._isActive) {
      return;
    }

    // Stop current positioning animation.
    if (inst._isPositioning) {
      inst._stopLayout();
    }

    // If item is being released reset release data, remove release class and
    // import the current elementStyles to drag object.
    if (isReleased) {
      drag.elementStyles = inst._release.elementStyles;
      removeClass(inst._element, stn.releasingClass);
      inst._resetReleaseData();
    }

    // Setup drag data.
    drag.active = true;
    drag.start = e;
    drag.lastMove = e;
    drag.move = e;
    drag.item = inst;
    drag.element = inst._element;

    // Get element's current position.
    currentLeft = getTranslateAsFloat(drag.element, 'x');
    currentTop = getTranslateAsFloat(drag.element, 'y');

    // Get container references.
    muuriContainer = inst._muuri._element;
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
    elementGBCR = drag.element.getBoundingClientRect();
    drag.elementClientX = elementGBCR.left;
    drag.elementClientY = elementGBCR.top;

    // Get drag scroll parents.
    drag.scrollParents = getScrollParents(drag.element);
    if (dragContainer && dragContainer !== muuriContainer) {
      drag.scrollParents = arrayUnique(drag.scrollParents.concat(getScrollParents(muuriContainer)));
    }

    // Bind scroll listeners.
    for (i = 0; i < drag.scrollParents.length; i++) {
      drag.scrollParents[i].addEventListener('scroll', drag.onScroll);
    }

    // Set drag class.
    addClass(drag.element, stn.draggingClass);

    // Emit dragstart event.
    inst._muuri._emitter.emit(evDragStart, inst, generateDragEvent('dragstart', e, drag));

  };

  /**
   * Drag move handler.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._onDragMove = function (e) {

    var inst = this;
    var drag = inst._drag;
    var stn = inst._muuri._settings;
    var xDiff;
    var yDiff;

    // If item is not active, reset drag.
    if (!inst._isActive) {
      inst._resetDrag();
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
    drag.elementClientX += xDiff;
    drag.elementClientY += yDiff;

    // Update element's translateX/Y values.
    setStyles(drag.element, {
      transform: 'translateX(' + drag.left + 'px) translateY(' + drag.top + 'px)'
    });

    // Overlap handling.
    if (stn.dragSort) {
      drag.checkOverlap();
    }

    // Emit item-dragmove event.
    inst._muuri._emitter.emit(evDragMove, inst, generateDragEvent('dragmove', e, drag));

  };

  /**
   * Drag scroll handler.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._onDragScroll = function (e) {

    var inst = this;
    var drag = inst._drag;
    var stn = inst._muuri._settings;
    var muuriContainer = inst._muuri._element;
    var dragContainer = stn.dragContainer;
    var elementGBCR = drag.element.getBoundingClientRect();
    var xDiff = drag.elementClientX - elementGBCR.left;
    var yDiff = drag.elementClientY - elementGBCR.top;
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
    inst._muuri._emitter.emit(evDragScroll, inst, generateDragEvent('dragscroll', e, drag));

  };

  /**
   * Drag end handler.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._onDragEnd = function (e) {

    var inst = this;
    var drag = inst._drag;
    var stn = inst._muuri._settings;
    var release = inst._release;
    var i;

    // If item is not active, reset drag.
    if (!inst._isActive) {
      inst._resetDrag();
      return;
    }

    // Finish currently queued overlap check.
    if (stn.dragSort) {
      drag.checkOverlap('finish');
    }

    // Remove scroll listeners.
    for (i = 0; i < drag.scrollParents.length; i++) {
      drag.scrollParents[i].removeEventListener('scroll', drag.onScroll);
    }

    // Remove drag classname from element.
    removeClass(drag.element, stn.draggingClass);

    // Flag drag as inactive.
    drag.active = false;

    // Emit item-dragend event.
    inst._muuri._emitter.emit(evDragEnd, inst, generateDragEvent('dragend', e, drag));

    // Setup release data.
    release.item = drag.item;
    release.containerDiffX = drag.containerDiffX;
    release.containerDiffY = drag.containerDiffY;
    release.element = drag.element;
    release.elementStyles = drag.elementStyles;

    // Reset drag data.
    inst._resetDragData();

    // Start the release process.
    inst._startRelease();

  };

  /**
   * Reset drag data and cancel any ongoing drag activity.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._resetDrag = function () {

    var inst = this;
    var drag = inst._drag;
    var stn = inst._muuri._settings;

    // Remove scroll listeners.
    for (i = 0; i < drag.scrollParents.length; i++) {
      drag.scrollParents[i].removeEventListener('scroll', drag.onScroll);
    }

    // Cancel overlap check.
    drag.checkOverlap('cancel');

    // Remove draggin class.
    removeClass(drag.element, stn.draggingClass);

    // Remove dragged element's inline styles.
    unlockElementSize(drag);

    inst._resetDragData();

  };

  /**
   * Reset release data.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._resetReleaseData = function () {

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
   * @memberof Item.prototype
   */
  Item.prototype._startRelease = function () {

    var inst = this;
    var stn = inst._muuri._settings;
    var release = inst._release;

    // Flag release as active.
    release.active = true;

    // Add release classname to released element.
    addClass(release.element, stn.releasingClass);

    // Emit releasestart event.
    inst._muuri._emitter.emit(evReleaseStart, inst);

    // Position the released item.
    inst._layout(false);

  };

  /**
   * End the release process of an item.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._endRelease = function () {

    var inst = this;
    var stn = inst._muuri._settings;
    var release = inst._release;

    // Remove release classname from the released element.
    removeClass(release.element, stn.releasingClass);

    // If the released element is outside the muuri container put it back there
    // and adjust position accordingly.
    if (release.element.parentNode !== inst._muuri._element) {
      inst._muuri._element.appendChild(release.element);
      setStyles(release.element, {
        transform: 'translateX(' + inst._left + 'px) translateY(' + inst._top + 'px)'
      });
    }

    // Unlock temporary inlined styles.
    unlockElementSize(release);

    // Reset release data.
    inst._resetReleaseData();

    // Emit releaseend event.
    inst._muuri._emitter.emit(evReleaseEnd, inst);

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
   * @memberof Item.prototype
   */
  Item.prototype._checkOverlap = function () {

    var muuri = this._muuri;
    var sortResult = muuri._dragSort(this);
    var items;
    var action;
    var from;
    var to;
    var elementFrom;
    var elementTo;

    if (sortResult) {

      items = muuri._items;
      action = sortResult.action || 'move';
      from = sortResult.from;
      to = sortResult.to;
      elementFrom = items[from]._element;
      elementTo = items[to]._element;

      if (action === 'swap') {
        arraySwap(items, from, to);
        muuri._emitter.emit(evSwap, elementFrom, elementTo);
      }
      else {
        arrayMove(items, from, to);
        muuri._emitter.emit(evMove, elementFrom, elementTo);
      }

      muuri.layout();

    }

  };

  /**
   * Stop item's position animation if it is currently animating.
   *
   * @protected
   * @memberof Item.prototype
   */
  Item.prototype._stopLayout = function () {

    var inst = this;
    var stn = inst._muuri._settings;

    if (inst._isPositioning) {

      // Stop animation.
      inst._animate.stop();

      // Remove visibility classes.
      removeClass(inst._element, stn.positioningClass);

      // Reset state.
      inst._isPositioning = false;

      // Process callback queue.
      processQueue(inst._layoutQueue, true, inst);

    }

  };

  /**
   * Recalculate item's dimensions.
   *
   * @public
   * @memberof Item.prototype
   */
  Item.prototype._refresh = function () {

    var inst = this;
    var element = inst._element;
    var elementGBCR;
    var marginEdges;
    var margins;
    var margin;
    var i;

    if (!inst._isHidden) {

      // Calculate margins (ignore negative margins).
      marginEdges = ['left', 'right', 'top', 'bottom'];
      inst._margin = margins = {};
      for (i = 0; i < 4; i++) {
        margin = getStyleAsFloat(element, 'margin-' + marginEdges[i]);
        margins[marginEdges[i]] = margin > 0 ? margin : 0;
      }

      // Calculate width and height (including margins).
      elementGBCR = element.getBoundingClientRect();
      inst._width = elementGBCR.width + margins.left + margins.right;
      inst._height = elementGBCR.height + margins.top + margins.bottom;

    }

  };

  /**
   * Position item based on it's current data.
   *
   * @public
   * @memberof Item.prototype
   * @param {Boolean} instant
   * @param {Function} [callback]
   */
  Item.prototype._layout = function (instant, callback) {

    var inst = this;
    var stn = inst._muuri._settings;
    var release = inst._release;
    var isJustReleased = release.active && release.positioningStarted === false;
    var animDuration = isJustReleased ? stn.dragReleaseDuration : stn.layoutDuration;
    var animEasing = isJustReleased ? stn.dragReleaseEasing : stn.layoutEasing;
    var animEnabled = instant === true || inst._noLayoutAnimation ? false : animDuration > 0;
    var isPositioning = inst._isPositioning;
    var offsetLeft;
    var offsetTop;
    var currentLeft;
    var currentTop;
    var finish = function () {

      // Remove positioning classes.
      removeClass(inst._element, stn.positioningClass);

      // Mark the item as not positioning.
      inst._isPositioning = false;

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
      currentLeft = getTranslateAsFloat(inst._element, 'x') - offsetLeft;
      currentTop = getTranslateAsFloat(inst._element, 'y') - offsetTop;

      // If the item is already in correct position there's no need to animate
      // it.
      if (inst._left === currentLeft && inst._top === currentTop) {
        finish();
        return;
      }

      // Mark as positioning.
      inst._isPositioning = true;

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
   * @memberof Item.prototype
   * @param {Boolean} instant
   * @param {Function} [callback]
   */
  Item.prototype._show = function (instant, callback) {

    var inst = this;
    var stn = inst._muuri._settings;

    // If item is visible.
    if (!inst._isHidden && !inst._isShowing) {

      // Call the callback and be done with it.
      if (typeof callback === 'function') {
        callback(false, inst);
      }

    }

    // If item is animating to visible.
    else if (!inst._isHidden) {

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibilityQueue[inst._visibilityQueue.length] = callback;
      }

    }

    // If item is hidden or animating to hidden.
    else {

      // Stop animation.
      inst._muuri._itemHide.stop(inst);

      // Update states.
      inst._isActive = true;
      inst._isHidden = false;
      inst._isShowing = inst._isHiding = false;

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
      inst._isShowing = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibilityQueue[inst._visibilityQueue.length] = callback;
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
   * @memberof Item.prototype
   * @param {Boolean} instant
   * @param {Function} [callback]
   */
  Item.prototype._hide = function (instant, callback) {

    var inst = this;
    var stn = inst._muuri._settings;

    // If item is hidden.
    if (inst._isHidden && !inst._isHiding) {

      // Call the callback and be done with it.
      if (typeof callback === 'function') {
        callback(false, inst);
      }

    }

    // If item is animating to hidden.
    else if (inst._isHidden) {

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibilityQueue[inst._visibilityQueue.length] = callback;
      }

    }

    // If item is visible or animating to visible.
    else {

      // Stop animation.
      inst._muuri._itemShow.stop(inst);

      // Update states.
      inst._isActive = false;
      inst._isHidden = true;
      inst._isShowing = inst._isHiding = false;

      // Update classes.
      addClass(inst._element, stn.hiddenClass);
      removeClass(inst._element, stn.shownClass);

      // Process current callback queue.
      processQueue(inst._visibilityQueue, true, inst);

      // Update state.
      inst._isHiding = true;

      // Push the callback to callback queue.
      if (typeof callback === 'function') {
        inst._visibilityQueue[inst._visibilityQueue.length] = callback;
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
   * @memberof Item.prototype
   * @param {Boolean} [removeElement=false]
   */
  Item.prototype._destroy = function (removeElement) {

    var inst = this;
    var muuri = inst._muuri;
    var stn = muuri._settings;
    var element = inst._element;
    var index = muuri._items.indexOf(inst);
    var props = Object.keys(inst).concat(Object.keys(Item.prototype));
    var i;

    // Stop animations.
    inst._stopLayout();
    muuri._itemShow.stop(inst);
    muuri._itemHide.stop(inst);

    // If item is being released, stop it gracefully.
    if (inst._release.active) {
      if (element.parentNode !== muuri._element) {
        muuri._element.appendChild(element);
      }
      inst._resetReleaseData();
    }

    // If item is being dragged, stop it gracefully.
    if (inst._drag.active) {
      if (element.parentNode !== muuri._element) {
        muuri._element.appendChild(element);
      }
      inst._resetDrag();
    }

    // Destroy Hammer instance and custom touch listeners.
    if (inst._hammer) {
      inst._hammer.destroy();
    }

    // Destroy animation handlers.
    inst._animate.destroy();
    inst._animateChild.destroy();

    // Remove all inline styles.
    element.removeAttribute('style');
    inst._child.removeAttribute('style');

    // Handle visibility callback queue, fire all uncompleted callbacks with
    // interrupted flag.
    processQueue(inst._visibilityQueue, true, inst);

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

    // Nullify all properties.
    for (i = 0; i < props.length; i++) {
      inst[props[i]] = null;
    }

  };

  /**
   * Layout
   * ******
   */

  /**
   * Creates a new Muuri Layout instance.
   *
   * @public
   * @class
   * @param {Muuri} muuri
   * @param {Item[]} [items]
   */
  function Layout(muuri, items) {

    var inst = this;
    var stn = muuri._settings.layout;
    var element = muuri._element;
    var elementGBCR = element.getBoundingClientRect();
    var noSettingsProvided;
    var methodName;

    inst.muuri = muuri;
    inst.items = items ? items.concat() : muuri.get('active');
    inst.slots = {};
    inst.setWidth = false;
    inst.setHeight = false;

    // Calculate the current width and height of the container.
    inst.width = elementGBCR.width - getStyleAsFloat(element, 'border-left-width') - getStyleAsFloat(element, 'border-right-width');
    inst.height = elementGBCR.height - getStyleAsFloat(element, 'border-top-width') - getStyleAsFloat(element, 'border-bottom-width');

    // If the user has provided custom function as a layout method invoke it.
    if (typeof stn === 'function') {
      stn.call(inst);
    }

    // Otherwise parse the layout mode and settings from provided options and
    // do the calculations.
    else {

      // Parse the layout method name and settings from muuri settings.
      noSettingsProvided = typeof stn === 'string';
      methodName = noSettingsProvided ? stn : stn[0];

      // Make sure the provided layout method exists.
      if (typeof Layout.methods[methodName] !== 'function') {
        throw new Error('Layout method "' + methodName + '" does not exist.');
      }

      // Invoke the layout method.
      Layout.methods[methodName].call(inst, noSettingsProvided ? {} : stn[1]);

    }

  }

  /**
   * Available layout methods.
   *
   * @public
   * @memberof Layout
   */
  Layout.methods = {
    firstFit: LayoutFirstFit
  };

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

  /**
   * Muuri's internal animation engine. Uses CSS Transitions.
   *
   * @private
   * @param {HTMLElement} element
   */
  function Animate(element) {

    var inst = this;
    inst._element = element;
    inst._isAnimating = false;
    inst._props = [];
    inst._callback = null;

  }

  /**
   * Start instance's animation. Automatically stops current animation if it is
   * running.
   *
   * @private
   * @memberof Animate.prototype
   * @param {Object} props
   * @param {Object} [options]
   * @param {Number} [options.duration=400]
   * @param {Number} [options.delay=400]
   * @param {String} [options.easing='ease']
   */
  Animate.prototype.start = function (props, opts) {

    var inst = this;
    var element = inst._element;
    var styles = props || {};
    var options = opts || {};
    var done = options.done;
    var transPropName = transition.propName;

    // If transitions are not supported, keep it simple.
    if (!transition) {

      setStyles(element, styles);

      if (typeof done === 'function') {
        done();
      }

      return;

    }

    // Stop current animation.
    inst.stop();

    // Set as animating.
    inst._isAnimating = true;

    // Store animated styles.
    inst._props = Object.keys(styles);

    // Add transition styles to target styles.
    if (transition) {
      styles[transPropName + 'Property'] = inst._props.join(',');
      styles[transPropName + 'Duration'] = (options.duration || 400) + 'ms';
      styles[transPropName + 'Delay'] = (options.delay || 0) + 'ms';
      styles[transPropName + 'Easing'] = options.easing || 'ease';
    }

    // Create callback.
    inst._callback = function (e) {
      if (e.target === element) {
        inst.stop();
        if (typeof done === 'function') {
          done();
        }
      }
    };

    // Bind callback.
    element.addEventListener('transitionend', inst._callback, true);

    // Make sure the current styles are applied before applying new styles.
    element.offsetWidth;

    // Set target styles.
    setStyles(element, styles);

  };

  /**
   * Stop instance's current animation if running.
   *
   * @private
   * @memberof Animate.prototype
   */
  Animate.prototype.stop = function () {

    // If transitions are not supported, keep it simple.
    if (!transition) {
      return;
    }

    var inst = this;
    var element = inst._element;
    var callback = inst._callback;
    var props = inst._props;
    var transPropName = transition.propName;
    var styles = {};
    var i;

    // If is animating.
    if (inst._isAnimating) {

      // Unbind transitionend listener.
      if (typeof callback === 'function') {
        element.removeEventListener('transitionend', callback, true);
        inst._callback = null;
      }

      // Get current values of all animated styles.
      for (i = 0; i < props.length; i++) {
        styles[props[i]] = getStyle(element, props[i]);
      }

      // Reset transition props (add to styles object).
      styles[transPropName + 'Property'] = '';
      styles[transPropName + 'Duration'] = '';
      styles[transPropName + 'Delay'] = '';
      styles[transPropName + 'Easing'] = '';

      // Set styles.
      setStyles(element, styles);

      // Set animating state as false.
      inst._isAnimating = false;

    }

  };

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @private
   * @memberof Animate.prototype
   * @returns {Boolean}
   */
  Animate.prototype.destroy = function () {

    var inst = this;
    inst.stop();
    inst._element = null;
    inst._isAnimating = null;
    inst._props = null;
    inst._callback = null;

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
    var slotIds;
    var slot;
    var item;
    var i;

    // Empty slots data.
    var emptySlots = [];

    // Normalize settings.
    var fillGaps = settings.fillGaps ? true : false;
    var isHorizontal = settings.horizontal ? true : false;
    var alignRight = settings.alignRight ? true : false;
    var alignBottom = settings.alignBottom ? true : false;

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
    for (i = 0; i < layout.items.length; i++) {

      item = layout.items[i];
      slot = LayoutFirstFit.getSlot(layout, emptySlots, item._width, item._height, !isHorizontal, fillGaps);

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

      slotIds = Object.keys(layout.slots);

      for (i = 0; i < slotIds.length; i++) {

        slot = layout.slots[slotIds[i]];

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
   * @param {Layout} layout
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
    var slot;
    var potentialSlots;
    var ignoreCurrentSlots;
    var i;
    var ii;

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
    var len = array.length;
    var i;

    if (len) {
      ret[0] = array[0];
      for (i = 1; i < len; i++) {
        if (ret.indexOf(array[i]) < 0) {
          ret[ret.length] = array[i];
        }
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
  function mergeOptions(dest) {

    var len = arguments.length;
    var i;

    for (i = 1; i < len; i++) {
      Object.keys(arguments[i]).forEach(function (prop) {
        if (prop !== 'styles' && isPlainObject(dest[prop]) && isPlainObject(this[prop])) {
          mergeOptions(dest[prop], this[prop]);
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

    style = style === 'transform' ? transform.styleName || style :
            style === 'transition' ? transition.styleName || style :
            style;

    return global.getComputedStyle(element, null).getPropertyValue(style);

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
   * Returns the element's computed translateX/Y value as a float. Assumes that
   * the translate value is defined as pixels.
   *
   * @param {HTMLElement} element
   * @param {String} axis
   *   - "x" or "y".
   * @returns {Number}
   */
  function getTranslateAsFloat(element, axis) {

    return parseFloat((getStyle(element, 'transform') || '').replace('matrix(', '').split(',')[axis === 'x' ? 4 : 5]) || 0;

  }

  /**
   * Set inline styles to an element.
   *
   * @param {HTMLElement} element
   * @param {Object} styles
   */
  function setStyles(element, styles) {

    var props = Object.keys(styles);
    var prop;
    var val;
    var i;

    for (i = 0; i < props.length; i++) {

      prop = props[i];
      val = styles[prop];

      if (prop === 'transform' && transform) {
        prop = transform.propName;
      }

      if (prop === 'transition' && transition) {
        prop = transition.propName;
      }

      element.style[prop] = val;

    }

  }

  /**
   * Check if an element has a specific class name.
   *
   * @param {HTMLElement} element
   * @param {String} className
   * @returns {Boolean}
   */
  function hasClass(element, className) {

    return (' ' + element.className).indexOf(' ' + className) > -1;

  }

  /**
   * Add class to an element.
   *
   * @param {HTMLElement} element
   * @param {String} className
   */
  function addClass(element, className) {

    if (element.classList) {
      element.classList.add(className);
    }
    else if (hasClass(element, className)) {
      element.className += ' ' + className;
    }

  }

  /**
   * Remove class name from an element.
   *
   * @param {HTMLElement} element
   */
  function removeClass(element, className) {

    if (element.classList) {
      element.classList.remove(className);
    }
    else if (hasClass(element, className)) {
      element.className = (' ' + element.className + ' ').replace(' ' + className + ' ', ' ').trim();
    }

  }

  /**
   * Returns the supported style property's prefix, property name and style name
   * or null if the style property is not supported. This is used for getting
   * the supported transform and transition.
   *
   * @private
   * @param {String} style
   * @returns {?Object}
   */
  function getSupportedStyle(style) {

    var docElem = document.documentElement;
    var styleCap = style.charAt(0).toUpperCase() + style.slice(1);
    var prefixes = ['', 'Webkit', 'Moz', 'O', 'ms'];
    var prefix;
    var propName;
    var i;

    for (i = 0; i < prefixes.length; i++) {

      prefix = prefixes[i];
      propName = prefix ? prefix + styleCap : style;

      if (docElem.style[propName] !== undefined) {

        prefix = prefix.toLowerCase();

        return {
          prefix: prefix,
          propName: propName,
          styleName: prefix ? '-' + prefix + '-' + style : style
        };

      }

    }

    return null;

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

    var anchorOffset = getOffsetFromDocument(anchor, 'margin');
    var targetOffset = getOffsetFromDocument(getContainingBlock(target) || document, 'padding');

    return {
      left: anchorOffset.left - targetOffset.left,
      top: anchorOffset.top - targetOffset.top
    };

  }

  /**
   * Helpers borrowed/forked from other libraries
   * ********************************************
   */

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
    if (transformLeaksFixed) {

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
   * Detects if transformed elements leak fixed elements. According W3C
   * transform rendering spec a transformed element should contain even fixed
   * elements. Meaning that fixed elements are positioned relative to the
   * closest transformed ancestor element instead of window. However, not every
   * browser follows the spec (IE and older Firefox). So we need to test it.
   * https://www.w3.org/TR/css3-2d-transforms/#transform-rendering
   *
   * Borrowed from Mezr (v0.6.1):
   * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L607
   *
   * @private
   * @returns {Boolean}
   *   - Returns true if transformed elements leak fixed elements, false otherwise.
   */
  function doesTransformLeakFixed() {

    if (!transform) {
      return true;
    }

    var outer = document.createElement('div');
    var inner = document.createElement('div');
    var leftNotTransformed;
    var leftTransformed;

    setStyles(outer, {
      display: 'block',
      visibility: 'hidden',
      position: 'absolute',
      width: '1px',
      height: '1px',
      left: '1px',
      top: '0',
      margin: '0',
      transform: 'none'
    });

    setStyles(inner, {
      display: 'block',
      position: 'fixed',
      width: '1px',
      height: '1px',
      left: '0',
      top: '0',
      margin: '0',
      transform: 'none'
    });

    outer.appendChild(inner);
    document.body.appendChild(outer);
    leftNotTransformed = inner.getBoundingClientRect().left;
    outer.style[transform.propName] = 'translateX(0)';
    leftTransformed = inner.getBoundingClientRect().left;
    document.body.removeChild(outer);

    return leftTransformed === leftNotTransformed;

  }

  /**
   * Returns true if element is transformed, false if not. In practice the element's display value
   * must be anything else than "none" or "inline" as well as have a valid transform value applied
   * in order to be counted as a transformed element.
   *
   * Borrowed from Mezr (v0.6.1):
   * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L661
   *
   * @private
   * @param {HTMLElement} element
   * @returns {Boolean}
   */
  function isTransformed(element) {

    var transform = getStyle(element, 'transform');
    var display = getStyle(element, 'display');

    return transform !== 'none' && display !== 'inline' && display !== 'none';

  }

  /**
   * Returns the element's containing block.
   *
   * Borrowed from Mezr (v0.6.1):
   * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L274
   *
   * @public
   * @param {Document|HTMLElement|Window} element
   * @returns {?Document|HTMLElement|Window}
   */
  function getContainingBlock(element) {

    // If we have document return null right away.
    if (element === document) {
      return null;
    }

    // If we have window return document right away.
    if (element === global) {
      return document;
    }

    // Now that we know we have an element in our hands, let's get it's position. Get element's
    // current position value if a specific position is not provided.
    var position = getStyle(element, 'position');

    // Relative element's container is always the element itself.
    if (position === 'relative') {
      return element;
    }

    // If element is not positioned (static or an invalid position value), always return null.
    if (position !== 'fixed' && position !== 'absolute') {
      return null;
    }

    // If the element is fixed and transforms leak fixed elements, always return window.
    if (position === 'fixed' && transformLeaksFixed) {
      return global;
    }

    // Alrighty, so now fetch the element's parent (which is document for the root) and set it as
    // the initial containing block. Fallback to null if everything else fails.
    var ret = element === document.documentElement ? document : element.parentElement || null;

    // If element is fixed positioned.
    if (position === 'fixed') {

      // As long as the containing block is an element and is not transformed, try to get the
      // element's parent element and fallback to document.
      while (ret && ret !== document && !isTransformed(ret)) {
        ret = ret.parentElement || document;
      }

      return ret === document ? global : ret;

    }

    // If the element is absolute positioned.
    else {

      // As long as the containing block is an element, is static and is not transformed, try to
      // get the element's parent element and fallback to document.
      while (ret && ret !== document && getStyle(ret, 'position') === 'static' && !isTransformed(ret)) {
        ret = ret.parentElement || document;
      }

      return ret;

    }

  }

  /**
   * Returns the element's (or window's) document offset, which in practice
   * means the vertical and horizontal distance between the element's northwest
   * corner and the document's northwest corner.
   *
   * Borrowed from Mezr (v0.6.1):
   * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L1006
   *
   * @public
   * @param {Document|HTMLElement|Window} element
   * @param {Edge} [edge='border']
   * @returns {Object}
   */
  function getOffsetFromDocument(element, edge) {

    var ret = {
      left: 0,
      top: 0
    };

    // Document's offsets are always 0.
    if (element === document) {
      return ret;
    }

    // Add viewport's scroll left/top to the respective offsets.
    ret.left = global.pageXOffset || 0;
    ret.top = global.pageYOffset || 0;

    // Window's offsets are the viewport's scroll left/top values.
    if (element.self === global.self) {
      return ret;
    }

    // Now we know we are calculating an element's offsets so let's first get the element's
    // bounding client rect. If it is not cached, then just fetch it.
    var gbcr = element.getBoundingClientRect();

    // Add bounding client rect's left/top values to the offsets.
    ret.left += gbcr.left;
    ret.top += gbcr.top;

    // Sanitize edge.
    edge = edge || 'border';

    // Exclude element's positive margin size from the offset if needed.
    if (edge === 'margin') {
      var marginLeft = getStyleAsFloat(element, 'margin-left');
      var marginTop = getStyleAsFloat(element, 'margin-top');
      ret.left -= marginLeft > 0 ? marginLeft : 0;
      ret.top -= marginTop > 0 ? marginTop : 0;
    }

    // Include element's border size to the offset if needed.
    else if (edge !== 'border') {
      ret.left += getStyleAsFloat(element, 'border-left-width');
      ret.top += getStyleAsFloat(element, 'border-top-width');
    }

    // Include element's padding size to the offset if needed.
    if (edge === 'content') {
      ret.left += getStyleAsFloat(element, 'padding-left');
      ret.top += getStyleAsFloat(element, 'padding-top');
    }

    return ret;

  }

  /**
   * Helpers - Muuri
   * ***************
   */

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
   * @param {Item} item
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

    var styleNames;
    var styleName;
    var i;

    // Don't override existing element styles.
    if (!data.elementStyles) {

      styleNames = ['width', 'height', 'padding', 'margin'];

      // Reset element styles.
      data.elementStyles = {};

      for (i = 0; i < 4; i++) {

        styleName = styleNames[i];

        // Store current inline style values.
        data.elementStyles[styleName] = data.element.style[styleName] || '';

        // Set effective values as inline styles.
        data.element.style[styleName] = getStyle(data.element, styleName);

      }

    }

  }

  /**
   * Unlock dragged element's dimensions.
   *
   * @param {Object} data
   */
  function unlockElementSize(data) {

    var styleNames;
    var styleName;
    var i;

    if (data.elementStyles) {
      styleNames = Object.keys(data.elementStyles);
      for (i = 0; i < styleNames.length; i++) {
        styleName = styleNames[i];
        data.element.style[styleName] = data.elementStyles[styleName];
      }
      data.elementStyles = null;
    }

  }

  /**
   * Show or hide Muuri instance's items.
   *
   * @private
   * @param {Muuri} inst
   * @param {String} method - "show" or "hide".
   * @param {Array|HTMLElement|Item|Number} items
   * @param {Boolean} [instant=false]
   * @param {Function} [callback]
   */
  function setVisibility(inst, method, items, instant, callback) {

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
    var item;
    var i;

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
      for (i = 0; i < targetItems.length; i++) {

        item = targetItems[i];

        // Check if relayout or refresh is needed.
        if ((isShow && !item._isActive) || (!isShow && item._isActive)) {
          needsRelayout = true;
          if (isShow) {
            item._noLayoutAnimation = true;
            hiddenItems[hiddenItems.length] = item;
          }
        }

        // Show/hide the item.
        item['_' + method](isInstant, function (interrupted, item) {

          // If the current item's animation was not interrupted add it to the
          // completed set.
          if (!interrupted) {
            completed[completed.length] = item;
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
   * Returns an object which contains start and stop methods for item's
   * show/hide process.
   *
   * @param {String} type
   * @param {!Object} [opts]
   * @param {Number} [opts.duration]
   * @param {String} [opts.easing]
   * @returns {Object}
   */
  function getItemVisbilityHandler(type, opts) {

    var duration = parseInt(opts && opts.duration) || 0;
    var isEnabled = duration > 0;
    var easing = (opts && opts.easing) || 'ease';
    var styles = opts && isPlainObject(opts.styles) ? opts.styles : null;

    return {
      styles: styles,
      start: function (item, instant, animDone) {
        if (!isEnabled || !styles) {
          animDone();
        }
        else if (instant) {
          setStyles(item._child, styles);
          animDone();
        }
        else {
          item._animateChild.start(styles, {
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

  /**
   * Process item's callback queue.
   *
   * @private
   * @param {Array} queue
   * @param {Boolean} interrupted
   * @param {Item} instance
   */
  function processQueue(queue, interrupted, instance) {

    var callbacks = queue.splice(0, queue.length);
    var i;

    for (i = 0; i < callbacks.length; i++) {
      callbacks[i](interrupted, instance);
    }

  }

  /**
   * Default handler for drag sort event.
   *
   * @private
   * @param {Item} targetItem
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
    var overlapScore;
    var itemData;
    var item;
    var i;

    // Find best match (the element with most overlap).
    for (i = 0; i < items.length; i++) {

      item = items[i];

      // If the item is the dragged item, save it's index.
      if (item === targetItem) {

        targetIndex = i;

      }
      // Otherwise, if the item is active.
      else if (item._isActive) {

        // Get marginless item data.
        itemData = {
          width: item._width - item._margin.left - item._margin.right,
          height: item._height - item._margin.top - item._margin.bottom,
          left: item._left + item._margin.left,
          top: item._top + item._margin.top
        };

        // Get marginless overlap data.
        overlapScore = getOverlapScore(instData, itemData);

        // Update best match if the overlap score is higher than the current
        // best match.
        if (bestMatchScore === null || overlapScore > bestMatchScore) {
          bestMatchScore = overlapScore;
          bestMatchIndex = i;
        }

      }

    }

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
   * Calculate how many percent the intersection area of two items is from the
   * maximum potential intersection area between the items.
   *
   * @param {Object} a
   * @param {Object} b
   * @returns {Number}
   *   - A number between 0-100.
   */
  function getOverlapScore(a, b) {

    // Return 0 immediately if the rectangles do not overlap.
    if ((a.left + a.width) <= b.left || (b.left + b.width) <= a.left || (a.top + a.height) <= b.top || (b.top + b.height) <= a.top) {
      return 0;
    }

    // Calculate inersection area width and height.
    var width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
    var height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);

    // Calculate maximum intersection area width and height.
    var maxWidth = Math.min(a.width, b.width);
    var maxHeight = Math.min(a.height, b.height);

    return (width * height) / (maxWidth * maxHeight) * 100;

  }

  /**
   * Init
   */

  return Muuri;

}));
