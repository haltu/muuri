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
* [x] BUG: When container has box-sizing border box the dimensions are not
      visually correct.
* [x] grid.send()
* [x] grid.sort()
* [x] grid.filter()
* [x] Improve grid.getItems() to support filtering items by all available
      states.
* [x] Improve the the visibility handler method logic. If an item is already
      visible and grid.show() is called for it, there should be no event
      triggered. The same applies to hidden items and grid.hide() method.
* [x] When setting the width/height of container account for min-width/height
      and max-width/height.
* [x] Drag item between instances.
      * [x] Drop item on empty container.
      * [x] Don't support defining "from" index in sortPredicate.
      * [x] Get the related events and their arguments sorted out.
      * [x] Deprecate the builtin freeze/unfreeze methods -> let it for user
            to solve since it's a fix for a specific scenario.
* [x] Always consider the dragged element to be the item element. Get rid of
      the dragData.element and releaseData.element stuff.
* [x] Review the event names and data.
* [x] Support providing a selector to items option.
* [x] API overhaul. Try make as little breaking changes as possible.
      * [x] Container -> Grid (reflect the change throughout the API)
      * [x] new Grid(opts) -> new Grid(element, opts)
      * [x] Review the refresh logic and the need for two refresh methods. It's
            not ideal at the moment and has some issues.
* [x] Items should always be children of the container element, so instead of
      of using querySelectorAll in items options let's just get the children
      and use elementMatches to filter the elements.
* [x] Use "border-dimensions" for the container check in drag
      overlap check. Justification? Well the items are also measured with
      border, so there's that.
* [x] Review the dragSend/dragReceive logic, doesn't feel quite right yet.
* [x] Add auto-layout to grid.sort() method, was missing it while others had it.
* [x] Rename "callbacks" to something more meaningful -> onFinish
* [x] Smarter sort method (and make it stable).
* [x] Filter method overhaul.
* [x] BUG: When dragging items from a grid to another and the page is scrolled
      things the items dont's go where they are supposed to go. The problem is
      that the grid container's offset is not automatically updated on scroll
      during drag, so let's fix it -> always update the connected grids' offset
      when checking overlap.
* [ ] Make the fix above more performant: When a grid has one or more items
      being dragged set it in a mode where it listens it's scroll containers for
      scroll events and marks the offset as "dirty". When checking overlap
      update the offset only for the "dirty" containers. This way we reduce
      the calling of gbcr to the minimum. Also whenever dragging is started all
      connected grids should get their offset updated. The offset is only
      required for the dragging operation.
* [ ] Allow dropping on gaps. It is crucial to allow dropping on empty gaps and
      not having it is a major annoyance when draggin from a grid to another.
      Imagine a big grid with one item, and you're forced to drag over the
      item... :(
* [ ] Add container offset diff mechanism to the item itself so it can be
      utilized by drag and migrate operations. Just to keep the code DRY and
      clearer.
* [ ] Layout system optimizations:
      * [ ] Optimize the current system to work faster if all items are the same
            size.
      * [ ] Don't call layout if nothing has changed. Create a system for
            checking this. Try to keep it fast, just a simple dirty check.
      * [ ] Allow defining "stamps" (holes) in the layout.
* [ ] Streamline codebase by trying to combine similar functions and methods
      into smaller reusable functions. Goal is less than 10kb when minified and
      gzipped.
* [ ] Review the codebase and comments with thought x 3.

*/

(function (global, factory) {

  var libName = 'Muuri';
  var Velocity;
  var Hammer;

  if (typeof define === 'function' && define.amd) {

    define(function (require) {
      Velocity = require.defined && require.defined('velocity') ? require('velocity') : undefined;
      Hammer = require.defined && require.defined('hammer') ? require('hammer') : undefined;
      return factory(global, libName, Velocity, Hammer);
    });

  }
  else if (typeof module === 'object' && module.exports) {

    try {
      Velocity = require('velocity-animate');
    }
    catch (e) {}

    try {
      Hammer = require('hammerjs');
    }
    catch (e) {}

    module.exports = factory(global, libName, Velocity, Hammer);

  }
  else {

    Velocity = typeof global.jQuery === 'function' ? global.jQuery.Velocity : global.Velocity;
    Hammer = global.Hammer;
    global[libName] = factory(global, libName, Velocity, Hammer);

  }

}(this, function (global, libName, Velocity, Hammer, undefined) {

  'use strict';

  // Get references to all the stuff we are using from the global scope.
  var document = global.document;
  var Object = global.Object;
  var Array = global.Array;
  var Math = global.Math;
  var Error = global.Error;
  var Element = global.Element;

  // Keep track of Grid instances.
  var gridInstances = {};

  // Keep track of Item instances.
  var itemInstances = {};

  // Keep track of the drag sort groups.
  var sortGroups = {};

  // No operation function.
  var noop = function () {};

  // Unique id which is used for Muuri instances and Item instances.
  // Should be incremented every time when used.
  var uuid = 0;

  // Get the supported element.matches().
  var elementMatches = getSupportedElementMatches();

  // Get the supported transform style property.
  var transform = getSupportedStyle('transform');

  // Test if transformed elements leak fixed elements.
  var transformLeaksFixed = doesTransformLeakFixed();

  // Event names.
  var evSynchronize = 'synchronize';
  var evLayoutStart = 'layoutStart';
  var evLayoutEnd = 'layoutEnd';
  var evAdd = 'add';
  var evRemove = 'remove';
  var evShowStart = 'showStart';
  var evShowEnd = 'showEnd';
  var evHideStart = 'hideStart';
  var evHideEnd = 'hideEnd';
  var evFilter = 'filter';
  var evSort = 'sort';
  var evMove = 'move';
  var evSend = 'send';
  var evReceiveStart = 'receiveStart';
  var evReceiveEnd = 'receiveEnd';
  var evDragStart = 'dragStart';
  var evDragMove = 'dragMove';
  var evDragScroll = 'dragScroll';
  var evDragSort = 'dragSort';
  var evDragSend = 'dragSend';
  var evDragReceive = 'dragReceive';
  var evDragReceiveDrop = 'dragReceiveDrop';
  var evDragEnd = 'dragEnd';
  var evDragReleaseStart = 'dragReleaseStart';
  var evDragReleaseEnd = 'dragReleaseEnd';
  var evDestroy = 'destroy';

  /**
   * Grid
   * ****
   */

  /**
   * Creates a new Grid instance.
   *
   * @public
   * @class
   * @param {(HTMLElement|String)} element
   * @param {Object} [options]
   * @param {(?HTMLElement[]|NodeList|String)} [options.items]
   * @param {(?Function|Object)} [options.show]
   * @param {Number} [options.show.duration=300]
   * @param {(Array|String)} [options.show.easing="ease"]
   * @param {Object} [options.show.styles]
   * @param {(?Function|Object)} [options.hide]
   * @param {Number} [options.hide.duration=300]
   * @param {(Array|String)} [options.hide.easing="ease"]
   * @param {Object} [options.hide.styles]
   * @param {(Function|Object)} [options.layout]
   * @param {Boolean} [options.layout.fillGaps=false]
   * @param {Boolean} [options.layout.horizontal=false]
   * @param {Boolean} [options.layout.alignRight=false]
   * @param {Boolean} [options.layout.alignBottom=false]
   * @param {(Boolean|Number)} [options.layoutOnResize=100]
   * @param {Boolean} [options.layoutOnInit=true]
   * @param {Number} [options.layoutDuration=300]
   * @param {(Array|String)} [options.layoutEasing="ease"]
   * @param {?Object} [options.sortData=null]
   * @param {Boolean} [options.dragEnabled=false]
   * @param {?HtmlElement} [options.dragContainer=null]
   * @param {?Function} [options.dragStartPredicate=null]
   * @param {Boolean} [options.dragSort=true]
   * @param {Number} [options.dragSortInterval=50]
   * @param {(?Function|Object)} [options.dragSortPredicate]
   * @param {Number} [options.dragSortPredicate.threshold=50]
   * @param {String} [options.dragSortPredicate.action="move"]
   * @param {?String} [options.dragSortGroup=null]
   * @param {?Array} [options.dragSortConnections=null]
   * @param {Number} [options.dragReleaseDuration=300]
   * @param {(Array|String)} [options.dragReleaseEasing="ease"]
   * @param {String} [options.containerClass="muuri"]
   * @param {String} [options.itemClass="muuri-item"]
   * @param {String} [options.itemVisibleClass="muuri-item-visible"]
   * @param {String} [options.itemHiddenClass="muuri-item-hidden"]
   * @param {String} [options.itemPositioningClass="muuri-item-positioning"]
   * @param {String} [options.itemDraggingClass="muuri-item-dragging"]
   * @param {String} [options.itemReleasingClass="muuri-item-releasing"]
   */
  function Grid(element, options) {

    var inst = this;
    var settings;
    var items;
    var debouncedLayout;

    // Throw an error if the container element does not exist in the DOM.
    if (!document.body.contains(element)) {
      throw new Error('Container element must be an existing DOM element');
    }

    // Create instance settings by merging the options with default options.
    settings = inst._settings = mergeSettings(Grid.defaultOptions, options);

    // Get container element and store it.
    inst._element = typeof element === 'string' ? document.querySelectorAll(element)[0] : element;

    // Create instance id and store it to the grid instances collection.
    inst._id = ++uuid;
    gridInstances[inst._id] = inst;

    // Reference to the currently used Layout instance.
    inst._layout = null;

    // Create private Emitter instance.
    inst._emitter = new Grid.Emitter();

    // Setup instance's sort group.
    inst._setSortGroup(settings.dragSortGroup);

    // Setup instance's sort connections.
    inst._sortConnections = Array.isArray(settings.dragSortConnections) && settings.dragSortConnections.length ? settings.dragSortConnections : null;

    // Setup show and hide animations for items.
    inst._itemShowHandler = typeof settings.show === 'function' ? settings.show() : getItemVisbilityHandler('show', settings.show);
    inst._itemHideHandler = typeof settings.hide === 'function' ? settings.hide() : getItemVisbilityHandler('hide', settings.hide);

    // Add container element's class name.
    addClass(element, settings.containerClass);

    // Calculate container element's initial dimensions and offset.
    inst.updateDimensions('grid');

    // Create initial items.
    inst._items = [];
    items = settings.items;
    if (typeof items === 'string') {
      nodeListToArray(inst._element.children).forEach(function (itemElement) {
        if (items === '*' || elementMatches(itemElement, items)) {
          inst._items.push(new Grid.Item(inst, itemElement));
        }
      });
    }
    else if (Array.isArray(items) || isNodeList(items)) {
      inst._items = nodeListToArray(items).map(function (itemElement) {
        return new Grid.Item(inst, itemElement);
      });
    }

    // Layout on window resize if the layoutOnResize option is enabled.
    if (typeof settings.layoutOnResize === 'number' || settings.layoutOnResize === true) {

      debouncedLayout = debounce(function () {
        inst.updateDimensions().layout();
      }, Math.max(0, parseInt(settings.layoutOnResize) || 0));

      inst._resizeHandler = function () {
        debouncedLayout();
      };

      global.addEventListener('resize', inst._resizeHandler);

    }

    // Layout on init if necessary.
    if (settings.layoutOnInit) {
      inst.layout(true);
    }

  }

  /**
   * Grid - Public properties
   * ************************
   */

  /**
   * @see Item
   */
  Grid.Item = Item;

  /**
   * @see Drag
   */
  Grid.Drag = Drag;

  /**
   * @see Layout
   */
  Grid.Layout = Layout;

  /**
   * @see Animate
   */
  Grid.AnimateLayout = Animate;

  /**
   * @see Animate
   */
  Grid.AnimateVisibility = Animate;

  /**
   * @see Emitter
   */
  Grid.Emitter = Emitter;

  /**
   * Default options for Grid instance.
   *
   * @public
   * @memberof Grid
   */
  Grid.defaultOptions = {

    // Item elements
    items: '*',

    // Show/hide animations
    show: {
      duration: 300,
      easing: 'ease',
      styles: {
        opacity: 1,
        scale: 1
      }
    },
    hide: {
      duration: 300,
      easing: 'ease',
      styles: {
        opacity: 0,
        scale: 0.5
      }
    },

    // Layout
    layout: {
      fillGaps: false,
      horizontal: false,
      alignRight: false,
      alignBottom: false
    },
    layoutOnResize: 100,
    layoutOnInit: true,
    layoutDuration: 300,
    layoutEasing: 'ease',

    // Sorting
    sortData: null,

    // Drag & Drop
    dragEnabled: false,
    dragContainer: null,
    dragStartPredicate: null,
    dragSort: true,
    dragSortInterval: 100,
    dragSortPredicate: {
      threshold: 50,
      action: 'move'
    },
    dragSortGroup: null,
    dragSortConnections: null,
    dragReleaseDuration: 300,
    dragReleaseEasing: 'ease',

    // Classnames
    containerClass: 'muuri',
    itemClass: 'muuri-item',
    itemVisibleClass: 'muuri-item-shown',
    itemHiddenClass: 'muuri-item-hidden',
    itemPositioningClass: 'muuri-item-positioning',
    itemDraggingClass: 'muuri-item-dragging',
    itemReleasingClass: 'muuri-item-releasing'

  };

  /**
   * Grid - Public prototype methods
   * *******************************
   */

  /**
   * Bind an event listener.
   *
   * @public
   * @memberof Grid.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Grid}
   */
  Grid.prototype.on = function (event, listener) {

    this._emitter.on(event, listener);
    return this;

  };

  /**
   * Unbind an event listener.
   *
   * @public
   * @memberof Grid.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Grid}
   */
  Grid.prototype.off = function (event, listener) {

    this._emitter.off(event, listener);
    return this;

  };

  /**
   * Get the container element.
   *
   * @public
   * @memberof Grid.prototype
   * @returns {HTMLElement}
   */
  Grid.prototype.getElement = function () {

    return this._element;

  };

  /**
   * Get cached dimensions. The cached dimensions are subject to change whenever
   * layout or updateDimensions method is called. Note that all returned values
   * are rounded.
   *
   * @public
   * @memberof Grid.prototype
   * @returns {GridDimensions}
   */
  Grid.prototype.getDimensions = function () {

    var inst = this;

    return {
      width: inst._width,
      height: inst._height,
      padding: {
        left: inst._padding.left,
        right: inst._padding.right,
        top: inst._padding.top,
        bottom: inst._padding.bottom
      },
      border: {
        left: inst._border.left,
        right: inst._border.right,
        top: inst._border.top,
        bottom: inst._border.bottom
      }
    };

  };

  /**
   * Get all items. Optionally you can provide specific targets (elements and
   * indices) and filter the results based on the state of the items. Note that
   * the returned array is not the same object used by the instance so modifying
   * it will not affect instance's items. All items that are not found are
   * omitted from the returned array.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridMultiItemQuery} [targets]
   * @param {GridItemState} [state]
   * @returns {Item[]}
   */
  Grid.prototype.getItems = function (targets, state) {

    var inst = this;
    var hasTargets = targets && typeof targets !== 'string';
    var targetItems = !hasTargets ? null : isNodeList(targets) ? nodeListToArray(targets) : [].concat(targets);
    var targetState = !hasTargets ? targets : state;
    var ret = [];
    var item;
    var i;

    // Sanitize target state.
    targetState = typeof targetState === 'string' ? targetState : null;

    // If target state or target items are defined return filtered results.
    if (targetState || targetItems) {
      targetItems = targetItems || inst._items;
      for (i = 0; i < targetItems.length; i++) {
        item = hasTargets ? inst._getItem(targetItems[i]) : targetItems[i];
        if (item && (!targetState || isItemInState(item, targetState))) {
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
   * Update the cached dimensions and offsets of the container element and/or
   * the items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {String} [target]
   *   - Define if you want to update the dimensions of the grid container
   *     element or the items. Leave empty to update the dimensions of both the
   *     grid and the items.
   *   - Accepted values: "grid" or "items".
   * @param {(GridMultiItemQuery|GridItemState|GridDimensionQuery)} [items]
   *   - If target is "grid" this allows you to define which specific dimensions
   *     you want to update.
   *   - If target is "items" this allows you to  define which specific items
   *     you want to update.
   * @returns {Grid}
   */
  Grid.prototype.updateDimensions = function (target, items) {

    var inst = this;
    var targetGrid = target === 'grid';
    var targetItems = target === 'items';

    if (targetGrid || !target) {
      updateGridDimensions(inst, targetGrid && items);
    }

    if (targetItems || !target) {
      updateItemDimensions(inst, targetItems && items);
    }

    return inst;

  };

  /**
   * Update the sort data of the instance's items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(GridMultiItemQuery|GridItemState)} [items]
   * @returns {Grid}
   */
  Grid.prototype.updateSortData = function (items) {

    var inst = this;
    var targetItems = inst.getItems(items);
    var i;

    for (i = 0; i < targetItems.length; i++) {
      targetItems[i]._updateSortData();
    }

    return inst;

  };

  /**
   * Synchronize the item elements to match the order of the items in the DOM.
   * This comes handy if you need to keep the DOM structure matched with the
   * order of the items. Note that if an item's element is not currently a child
   * of the container element (if it is dragged for example) it is ignored and
   * left untouched.
   *
   * @public
   * @memberof Grid.prototype
   * @returns {Grid}
   */
  Grid.prototype.synchronize = function () {

    var inst = this;
    var container = inst._element;
    var items = inst._items;
    var fragment;
    var element;
    var i;

    // Append all elements in order to the container element.
    if (items.length) {
      for (i = 0; i < items.length; i++) {
        element = items[i]._element;
        if (element.parentNode === container) {
          fragment = fragment || document.createDocumentFragment();
          fragment.appendChild(element);
        }
      }
      if (fragment) {
        container.appendChild(fragment);
      }
    }

    // Emit synchronize event.
    inst._emitter.emit(evSynchronize);

    return inst;

  };

  /**
   * Calculate and apply item positions.
   *
   * @public
   * @memberof Grid.prototype
   * @param {Boolean} [instant=false]
   * @param {Function} [onFinish]
   * @returns {Grid}
   */
  Grid.prototype.layout = function (instant, onFinish) {

    var inst = this;
    var emitter = inst._emitter;
    var callback = typeof instant === 'function' ? instant : onFinish;
    var isInstant = instant === true;
    var layout = new Grid.Layout(inst);
    var counter = 0;
    var itemsLength = layout.items.length;
    var completed = [];
    var padding;
    var border;
    var isBorderBox;
    var item;
    var position;
    var i;

    function tryFinish(interrupted, item) {

      // Push all items, which were not interrupted, to the completed items.
      if (!interrupted) {
        completed[completed.length] = item;
      }

      // After all items have finished their animations call callback and emit
      // layoutend event.
      if (++counter === itemsLength) {
        if (typeof callback === 'function') {
          callback(completed.concat());
        }
        emitter.emit(evLayoutEnd, completed.concat());
      }

    }

    // Update the current layout data reference.
    inst._layout = layout;

    // Emit layoutStart event.
    emitter.emit(evLayoutStart, layout.items.concat());

    // If grid's width or height was modified, we need to update it's cached
    // dimensions. Also keep in mind that grid's cached width/height should
    // always equal to what elem.getBoundingClientRect() would return, so
    // therefore we need to add the grid element's paddings and margins to the
    // dimensions if it's box-sizing is border-box.
    if (layout.setWidth || layout.setHeight) {

      padding = inst._padding;
      border = inst._border;
      isBorderBox = inst._boxSizing === 'border-box';

      // Set container element's height if needed.
      if (layout.setHeight) {
        setStyles(inst._element, {
          height: (isBorderBox ? layout.height + padding.top + padding.bottom + border.top + border.bottom : layout.height) + 'px'
        });
      }

      // Set container element's width if needed.
      if (layout.setWidth) {
        setStyles(inst._element, {
          width: (isBorderBox ? layout.width + padding.left + padding.right + border.left + border.right : layout.width) + 'px'
        });
      }

      // Update item's width and height to account for the possible
      // min/max-width/height.
      inst.updateDimensions('grid', ['width', 'height']);

    }

    // If there are no items let's finish quickly.
    if (!itemsLength) {
      tryFinish(true);
    }

    // If there are items let's position them.
    else {

      for (i = 0; i < layout.items.length; i++) {

        item = layout.items[i];
        position = layout.slots[item._id];

        // Update item's position. We add the padding to the value here because
        // we want the position to be relative to the container elment's
        // content edge, not padding edge (which would be default behaviour for
        // absolute positioned elements). This way we provide more control over
        // the gutter spacing via CSS styles. Otherwise the padding would be
        // kind of wasted.
        item._left = position.left + inst._padding.left;
        item._top = position.top + inst._padding.top;

        // Layout non-dragged items.
        if (item._drag && item._drag._dragData.isActive) {
          tryFinish(false, item);
        }
        else {
          item._layout(isInstant, tryFinish);
        }

      }

    }

    return inst;

  };

  /**
   * Add new items by providing the elements you wish to add to the instance and
   * optionally provide the index where you want the items to be inserted into.
   * All elements that are not already children of the container element will be
   * automatically appended to the container element. If an element has it's CSS
   * display property set to "none" it will be marked as inactive during the
   * initiation process. As long as the item is inactive it will not be part of
   * the layout, but it will retain it's index. You can activate items at any
   * point with grid.show() method. This method will automatically call
   * grid.layout() if one or more of the added elements are visible. If only
   * hidden items are added no layout will be called. All the new visible items
   * are positioned without animation during their first layout.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(HTMLElement|HTMLElement[])} elements
   * @param {Object} [options]
   * @param {Number} [options.index=-1]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Item[]}
   */
  Grid.prototype.add = function (elements, options) {

    var inst = this;
    var targetElements = [].concat(elements);
    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var newItems = [];
    var items = inst._items;
    var needsLayout = false;
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

      item = new Grid.Item(inst, targetElements[i]);
      newItems[newItems.length] = item;

      // If the item to be added is active, we need to do a layout. Also, we
      // need to mark the item with the skipNextLayoutAnimation flag to make it
      // position instantly (without animation) during the next layout. Without
      // the hack the item would animate to it's new position from the northwest
      // corner of the grid, which feels a bit buggy (imho).
      if (item._isActive) {
        needsLayout = true;
        item._skipNextLayoutAnimation = true;
      }

    }

    // Add the new items to the items collection to correct index.
    insertItemsToArray(items, newItems, opts.index);

    // Emit add event.
    inst._emitter.emit(evAdd, newItems.concat());

    // If layout is needed.
    if (needsLayout && layout) {
      inst.layout(layout === 'instant', typeof layout === 'function' ? layout : undefined);
    }

    // Return new items.
    return newItems;

  };

  /**
   * Remove items from the instance.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(GridMultiItemQuery|GridItemState)} items
   * @param {Object} [options]
   * @param {Boolean} [options.removeElements=false]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Number[]}
   *   - The indices of removed items.
   */
  Grid.prototype.remove = function (items, options) {

    var inst = this;
    var targetItems = inst.getItems(items);
    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var indices = [];
    var needsLayout = false;
    var item;
    var i;

    // Remove the individual items.
    for (i = 0; i < targetItems.length; i++) {
      item = targetItems[i];
      if (item._isActive) {
        needsLayout = true;
      }
      indices[indices.length] = item._destroy(opts.removeElements);
    }

    // Emit remove event.
    inst._emitter.emit(evRemove, indices.concat());

    // If layout is needed.
    if (needsLayout && layout) {
      inst.layout(layout === 'instant', typeof layout === 'function' ? layout : undefined);
    }

    return indices;

  };

  /**
   * Show instance items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(GridMultiItemQuery|GridItemState)} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {Function} [options.onFinish]
   * @param {(Boolean|Function|String)} [options.layout=tue]
   * @returns {Grid}
   */
  Grid.prototype.show = function (items, options) {

    return setVisibility(this, 'show', items, options);

  };

  /**
   * Hide instance items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(GridMultiItemQuery|GridItemState)} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {Function} [options.onFinish]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.hide = function (items, options) {

    return setVisibility(this, 'hide', items, options);

  };

  /**
   * Filter items. Expects at least one argument, a predicate, which should be
   * either a function or a string. The predicate callback is executed for every
   * item in the instance. If the return value of the predicate is truthy the
   * item in question will be shown and otherwise hidden. The predicate callback
   * receives two arguments: the item instance and the instance's element. If
   * the predicate is a string it is considered to be a selector and it is
   * checked against every item element in the instance with the native
   * element.matches() method. All the matching items will be shown and others
   * hidden.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(Function|String)} predicate
   * @oaram {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {Function} [options.onFinish]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.filter = function (predicate, options) {

    var inst = this;
    var items = inst._items;
    var predicateType = typeof predicate;
    var isPredicateString = predicateType === 'string';
    var isPredicateFn = predicateType === 'function';
    var opts = options || {};
    var isInstant = opts.instant === true;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var onFinish = typeof opts.onFinish === 'function' ? opts.onFinish : null;
    var itemsToShow = [];
    var itemsToHide = [];
    var tryFinishCounter = -1;
    var tryFinish;
    var item;
    var i;

    // Return immediately if there are no items.
    if (!items.length) {
      return inst;
    }

    // Create finisher function.
    tryFinish = !onFinish ? noop : function () {
      if (++tryFinishCounter) {
        onFinish(itemsToShow.concat(), itemsToHide.concat());
      }
    };

    // Check which items need to be shown and which hidden.
    if (isPredicateFn || isPredicateString) {
      for (i = 0; i < items.length; i++) {
        item = items[i];
        if (isPredicateFn ? predicate(item, item._element) : elementMatches(item._element, predicate)) {
          itemsToShow.push(item);
        }
        else {
          itemsToHide.push(item);
        }
      }
    }

    // Show items that need to be shown.
    if (itemsToShow.length) {
      inst.show(itemsToShow, {
        instant: isInstant,
        onFinish: tryFinish,
        layout: false
      });
    }
    else {
      tryFinish();
    }

    // Hide items that need to be hidden.
    if (itemsToHide.length) {
      inst.hide(itemsToHide, {
        instant: isInstant,
        onFinish: tryFinish,
        layout: false
      });
    }
    else {
      tryFinish();
    }

    // If there are any items to filter.
    if (itemsToShow.length || itemsToHide.length) {

      // Emit filter event.
      inst._emitter.emit(evFilter, itemsToShow.concat(), itemsToHide.concat());

      // If layout is needed.
      if (layout) {
        inst.layout(layout === 'instant', typeof layout === 'function' ? layout : undefined);
      }

    }

    return inst;

  };

  /**
   * Sort items. There are three ways to sort the items. The first is simply by
   * providing a function as the comparer which works identically to native
   * array sort. Alternatively you can sort by the sort data you have provided
   * in the instance's options. Just provide the sort data key(s) as a string
   * (separated by space) and the items will be sorted based on the provided
   * sort data keys. Lastly you have the opportunity to provide a presorted
   * array of items which will be used to sync the internal items array in the
   * same order.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(Function|String|String[])} comparer
   * @param {Object} [options]
   * @param {Boolean} [options.descending=false]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.sort = function (comparer, options) {

    var inst = this;
    var items = inst._items;
    var opts = options || {};
    var isDescending = !!opts.descending;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var origItems;
    var indexMap;

    // Let's not sort if it has no effect.
    if (items.length < 2) {
      return inst;
    }

    // Clone current set of items for the event.
    origItems = items.concat();

    // If function is provided do a native array sort.
    if (typeof comparer === 'function') {
      items.sort(function (a, b) {
        return comparer(a, b) || compareItemIndices(a, b, isDescending, indexMap || (indexMap = getItemIndexMap(origItems)));
      });
    }

    // Otherwise if we got a string, let's sort by the sort data as provided in
    // the instance's options.
    else if (typeof comparer === 'string') {
      comparer = comparer.trim().split(' ').map(function (val) {
        return val.split(':');
      });
      items.sort(function (a, b) {
        return compareItems(a, b, isDescending, comparer) || compareItemIndices(a, b, isDescending, indexMap || (indexMap = getItemIndexMap(origItems)));
      });
    }

    // Otherwise if we got an array, let's assume it's a presorted array of the
    // items and order the items based on it.
    else if (Array.isArray(comparer)) {
      items.splice(0, items.length).concat(comparer);
    }

    // Otherwise, let's go home.
    else {
      return inst;
    }

    // Emit sort event.
    inst._emitter.emit(evSort, items.concat(), origItems);

    // If layout is needed.
    if (layout) {
      inst.layout(layout === 'instant', typeof layout === 'function' ? layout : undefined);
    }

    return inst;

  };

  /**
   * Move item to another index or in place of another item.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridSingleItemQuery} item
   * @param {GridSingleItemQuery} position
   * @param {Object} [options]
   * @param {String} [options.action="move"]
   *   - Accepts either "move" or "swap".
   *   - "move" moves the item in place of the other item.
   *   - "swap" swaps the position of the items.
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.move = function (item, position, options) {

    var inst = this;
    var items = inst._items;
    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var fromItem;
    var toItem;
    var fromIndex;
    var toIndex;
    var isSwap;

    // Return immediately, if moving an item is not possible.
    if (items.length < 2) {
      return inst;
    }

    fromItem = inst._getItem(item);
    toItem = inst._getItem(position);
    isSwap = action === 'swap';
    action = isSwap ? 'swap' : 'move';

    // Make sure the items exist and are not the same.
    if (fromItem && toItem && (fromItem !== toItem)) {

      // Get the indices of the items.
      fromIndex = items.indexOf(fromItem);
      toIndex = items.indexOf(toItem);

      // Do the move/swap.
      (isSwap ? arraySwap : arrayMove)(items, fromIndex, toIndex);

      // Emit move event.
      inst._emitter.emit(evMove, {
        item: fromItem,
        fromIndex: fromIndex,
        toIndex: toIndex,
        action: action
      });

      // If layout is needed.
      if (layout) {
        inst.layout(layout === 'instant', typeof layout === 'function' ? layout : undefined);
      }

    }

    return inst;

  };

  /**
   * Send item to another Grid instance.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridSingleItemQuery} item
   * @param {Grid} grid
   * @param {GridSingleItemQuery} position
   * @param {Object} [options]
   * @param {HTMLElement} [options.appendTo=document.body]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.send = function (item, grid, position, options) {

    var currentGrid = this;
    var targetGrid = grid;
    var targetItem = currentGrid._getItem(item);
    var currentGridStn;
    var targetGridStn;
    var opts;
    var appendTo;
    var layout;
    var migrate;
    var element;
    var isActive;
    var isVisible;
    var currentIndex;
    var newIndex;
    var offsetDiff;
    var translateX;
    var translateY;

    // Make sure we have a valid target item and target grid.
    if (!targetItem || !(targetGrid instanceof Grid) || currentGrid === targetGrid) {
      return currentGrid;
    }

    // Get new index
    newIndex = typeof position === 'number' ? position : targetGrid._items.indexOf(targetGrid._getItem(position));

    // If we have invalid new index, let's return immediately.
    if (newIndex === null) {
      return currentGrid;
    }

    // Get item's current index.
    currentIndex = currentGrid._items.indexOf(targetItem);

    // Get settings of both grids.
    currentGridStn = currentGrid._settings;
    targetGridStn = targetGrid._settings;

    // Parse options.
    opts = options || {};
    appendTo = opts.appendTo || document.body;
    layout = opts.layout ? opts.layout : opts.layout === undefined;

    // Get item's migrate data and element.
    migrate = targetItem._migrate;
    element = targetItem._element;

    // Check if element is active/visible.
    isActive = targetItem.isActive();
    isVisible = (targetItem.isVisible() || targetItem.isShowing()) && !targetItem.isHiding();

    // Stop current layout animation and migration.
    targetItem._stopLayout(true);
    targetItem._stopMigrate(true);

    // Stop current visibility animations.
    currentGrid._itemShowHandler.stop(targetItem);
    currentGrid._itemHideHandler.stop(targetItem);

    // Destroy current drag.
    if (targetItem._drag) {
      targetItem._drag.destroy();
    }

    // Destroy current animation handlers.
    targetItem._animate.destroy();
    targetItem._animateChild.destroy();

    // Process current visibility animation queue.
    processQueue(targetItem._visibilityQueue, true, targetItem);

    // Remove current classnames.
    removeClass(element, currentGridStn.itemClass);
    removeClass(element, currentGridStn.itemVisibleClass);
    removeClass(element, currentGridStn.itemHiddenClass);

    // Add new classnames.
    addClass(element, targetGridStn.itemClass);
    addClass(element, isVisible ? targetGridStn.itemVisibleClass : targetGridStn.itemHiddenClass);

    // Move item instance from current grid to target grid.
    currentGrid._items.splice(currentIndex, 1);
    insertItemsToArray(targetGrid._items, targetItem, newIndex);

    // Update item's grid id reference.
    targetItem._gridId = targetGrid._id;

    // Instantiate new animation controllers.
    targetItem._animate = new Grid.AnimateLayout(targetItem, element);
    targetItem._animateChild = new Grid.AnimateVisibility(targetItem, targetItem._child);
    targetItem._isDefaultAnimate = targetItem._animate instanceof Animate;
    targetItem._isDefaultChildAnimate = targetItem._animateChild instanceof Animate;

    // If the item is currently not inside the correct layout container, we need
    // to move the element inside the layout container and calculate how much
    // the translate value needs to be modified in order for the item remain
    // visually in the same position. Note that we assume here that the item
    // is currently within the current grid instance's container element.
    if (currentGrid._element !== appendTo) {

      // Get current translate values.
      translateX = getTranslateAsFloat(element, 'x');
      translateY = getTranslateAsFloat(element, 'y');

      // Move the item inside the new container element.
      appendTo.appendChild(element);

      // Calculate how much offset difference the new container element has with
      // the old container element and adjust the translate values accordingly.
      offsetDiff = getContainerOffsetDiff(element, currentGrid._element);
      translateX += offsetDiff.left;
      translateY += offsetDiff.top;

      // Calculate how much offset difference there is between the new container
      // element and the target container element and store the results to
      // migration data.
      offsetDiff = getContainerOffsetDiff(element, targetGrid._element);
      migrate.containerDiffX = offsetDiff.left;
      migrate.containerDiffY = offsetDiff.top;

      // Update translate styles.
      setStyles(element, {
        transform: 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)'
      });

    }

    // Update display styles.
    setStyles(element, {
      display: isVisible ? 'block' : 'hidden'
    });

    // Update child element's styles to reflect the current visibility state.
    targetItem._child.removeAttribute('style');
    if (isVisible) {
      targetGrid._itemShowHandler.start(targetItem, true);
    }
    else {
      targetGrid._itemHideHandler.start(targetItem, true);
    }

    // Update item's cached dimensions and sort data.
    targetItem._updateDimensions()._updateSortData();

    // Recreate item's drag handler.
    targetItem._drag = targetGridStn.dragEnabled ? new Grid.Drag(targetItem) : null;

    // Setup migration data.
    migrate.isActive = true;
    migrate.appendTo = appendTo;
    migrate.fromGrid = currentGrid;
    migrate.fromIndex = currentIndex;
    migrate.toIndex = newIndex;

    // Emit send event.
    currentGrid._emitter.emit(evSend, {
      item: targetItem,
      fromIndex: currentIndex,
      toGrid: targetGrid,
      toIndex: newIndex
    });

    // Emit receiveStart event.
    targetGrid._emitter.emit(evReceiveStart, {
      item: targetItem,
      fromGrid: currentGrid,
      fromIndex: currentIndex,
      toIndex: newIndex
    });

    // If layout is defined and if the item is active and layout both grids.
    if (isActive && layout) {
      if (layout === 'instant') {
        currentGrid.layout(true);
        targetGrid.layout(true);
      }
      else if (typeof layout === 'function') {
        currentGrid.layout(function (completed) {
          layout(completed, currentGrid);
        });
        targetGrid.layout(function (completed) {
          layout(completed, targetGrid);
        });
      }
      else {
        currentGrid.layout();
        targetGrid.layout();
      }
    }

    return currentGrid;

  };

  /**
   * Destroy the instance.
   *
   * @public
   * @memberof Grid.prototype
   * @param {Boolean} [removeElements=false]
   */
  Grid.prototype.destroy = function (removeElements) {

    var inst = this;
    var container = inst._element;
    var items = inst._items.concat();
    var i;

    // Unbind window resize event listener.
    if (inst._resizeHandler) {
      global.removeEventListener('resize', inst._resizeHandler);
    }

    // Destroy items.
    for (i = 0; i < items.length; i++) {
      items[i]._destroy(removeElements);
    }

    // Unset sort group.
    inst._unsetSortGroup();

    // Restore container.
    removeClass(container, inst._settings.containerClass);
    setStyles(container, {
      height: ''
    });

    // Emit destroy event and unbind all events.
    inst._emitter.emit(evDestroy).destroy();

    // Remove reference from the grid instances collection.
    gridInstances[inst._id] = undefined;

    // Nullify instance properties.
    nullifyInstance(inst, Grid);

  };

  /**
   * Grid - Protected prototype methods
   * **********************************
   */

  /**
   * Get instance's item by element or by index. Target can also be an Item
   * instance in which case the function returns the item if it exists within
   * related Grid instance. If nothing is found with the provided target, null
   * is returned.
   *
   * @protected
   * @memberof Grid.prototype
   * @param {GridSingleItemQuery} [target=0]
   * @returns {?Item}
   */
  Grid.prototype._getItem = function (target) {

    var inst = this;
    var index;
    var ret;
    var item;
    var i;

    // If no target is specified, return the first item or null.
    if (!target) {
      return inst._items[0] || null;
    }

    // If the target is an instance of Item return it if it is attached to this
    // Grid instance, otherwise return null.
    else if (target instanceof Item) {
      return target._gridId === inst._id ? target : null;
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
   * Set instance's drag sort group.
   *
   * @protected
   * @memberof Grid.prototype
   * @param {?String} sortGroup
   * @returns {Grid}
   */
  Grid.prototype._setSortGroup = function (sortGroup) {

    var inst = this;

    inst._sortGroup = null;
    if (sortGroup && typeof sortGroup === 'string') {
      inst._sortGroup = sortGroup;
      if (!sortGroups[sortGroup]) {
        sortGroups[sortGroup] = [];
      }
      sortGroups[sortGroup].push(inst._id);
    }

    return inst;

  };

  /**
   * Unset instance's drag sort group.
   *
   * @protected
   * @memberof Grid.prototype
   * @returns {Grid}
   */
  Grid.prototype._unsetSortGroup = function () {

    var inst = this;
    var sortGroup = inst._sortGroup;
    var sortGroupItems;
    var i;

    if (sortGroup) {
      sortGroupItems = sortGroups[sortGroup];
      for (i = 0; i < sortGroupItems.length; i++) {
        if (sortGroupItems[i] === inst._id) {
          sortGroupItems.splice(i, 1);
          break;
        }
      }
      inst._sortGroup = null;
    }

    return inst;

  };

  /**
   * Get connected Grid instances.
   *
   * @protected
   * @memberof Grid.prototype
   * @param {Boolean} [includeSelf=false]
   * @returns {Grid[]}
   */
  Grid.prototype._getSortConnections = function (includeSelf) {

    var inst = this;
    var ret = includeSelf ? [inst] : [];
    var connections = inst._sortConnections;
    var sortGroup;
    var gridId;
    var ii;
    var i;

    if (connections && connections.length) {
      for (i = 0; i < connections.length; i++) {
        sortGroup = sortGroups[connections[i]];
        if (sortGroup && sortGroup.length) {
          for (ii = 0; ii < sortGroup.length; ii++) {
            gridId = sortGroup[ii];
            if (gridId !== inst._id) {
              ret.push(gridInstances[gridId]);
            }
          }
        }
      }
    }

    return ret;

  };

  /**
   * Item
   * ****
   */

  /**
   * Creates a new Item instance for a Grid instance.
   *
   * @public
   * @class
   * @param {Grid} grid
   * @param {HTMLElement} element
   */
  function Item(grid, element) {

    var inst = this;
    var settings = grid._settings;
    var isHidden;

    // Create instance id and add item to the itemInstances collection.
    inst._id = ++uuid;
    itemInstances[inst._id] = inst;

    // If the provided item element is not a direct child of the grid container
    // element, append it to the grid container.
    if (element.parentNode !== grid._element) {
      grid._element.appendChild(element);
    }

    // Set item class.
    addClass(element, settings.itemClass);

    // Check if the element is hidden.
    isHidden = getStyle(element, 'display') === 'none';

    // Set visible/hidden class.
    addClass(element, isHidden ? settings.itemHiddenClass : settings.itemVisibleClass);

    // Refrence to connected Grid instance's id.
    inst._gridId = grid._id;

    // The elements.
    inst._element = element;
    inst._child = element.children[0];

    // Initiate item's animation controllers.
    inst._animate = new Grid.AnimateLayout(inst, element);
    inst._animateChild = new Grid.AnimateVisibility(inst, inst._child);

    // Check if default animation engine is used.
    inst._isDefaultAnimate = inst._animate instanceof Animate;
    inst._isDefaultChildAnimate = inst._animateChild instanceof Animate;

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

    // Set up initial positions.
    inst._left = 0;
    inst._top = 0;

    // Set element's initial styles.
    setStyles(inst._element, {
      left: '0',
      top: '0',
      transform: 'translateX(0px) translateY(0px)',
      display: isHidden ? 'none' : 'block'
    });

    // Set up the initial dimensions and sort data.
    inst._updateDimensions()._updateSortData();

    // Set initial styles for the child element.
    if (isHidden) {
      grid._itemHideHandler.start(inst, true);
    }
    else {
      grid._itemShowHandler.start(inst, true);
    }

    // Set up drag handler.
    inst._drag = settings.dragEnabled ? new Grid.Drag(inst) : null;

    // Set up migration handler data.
    inst._migrate = {
      isActive: false,
      appendTo: null,
      containerDiffX: 0,
      containerDiffY: 0,
      fromGrid: null,
      fromIndex: 0,
      toIndex: 0
    };

  }

  /**
   * Item - Public prototype methods
   * *******************************
   */

  /**
   * Get the instance grid reference.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Grid}
   */
  Item.prototype.getGrid = function () {

    return gridInstances[this._gridId];

  };

  /**
   * Get the instance element.
   *
   * @public
   * @memberof Item.prototype
   * @returns {HTMLElement}
   */
  Item.prototype.getElement = function () {

    return this._element;

  };

  /**
   * Get instance element's cached width.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Number}
   */
  Item.prototype.getWidth = function () {

    return this._width;

  };

  /**
   * Get instance element's cached height.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Number}
   */
  Item.prototype.getHeight = function () {

    return this._height;

  };

  /**
   * Get instance element's cached margins.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Object}
   *   - The returned object contains left, right, top and bottom properties
   *     which indicate the item element's cached margins.
   */
  Item.prototype.getMargin = function () {

    return {
      left: this._margin.left,
      right: this._margin.right,
      top: this._margin.top,
      bottom: this._margin.bottom
    };

  };

  /**
   * Get instance element's cached position.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Object}
   *   - The returned object contains left and top properties which indicate the
   *     item element's cached position in the grid.
   */
  Item.prototype.getPosition = function () {

    return {
      left: this._left,
      top: this._top
    };

  };

  /**
   * Is the item active?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isActive = function () {

    return this._isActive;

  };

  /**
   * Is the item visible?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isVisible = function () {

    return !this._isHidden;

  };

  /**
   * Is the item being animated to visible?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isShowing = function () {

    return this._isShowing;

  };

  /**
   * Is the item being animated to hidden?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isHiding = function () {

    return this._isHiding;

  };

  /**
   * Is the item positioning?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isPositioning = function () {

    return this._isPositioning;

  };

  /**
   * Is the item being dragged?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isDragging = function () {

    return this._drag && this._drag._dragData.isActive;

  };

  /**
   * Is the item being released?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isReleasing = function () {

    return this._drag && this._drag._releaseData.isActive;

  };

  /**
   * Is the item being migrated?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isMigrating = function () {

    return this._migrate.isActive;

  };

  /**
   * Item - Protected prototype methods
   * **********************************
   */

  /**
   * Stop item's position animation if it is currently animating.
   *
   * @protected
   * @memberof Item.prototype
   * @param {Boolean} [processLayoutQueue=false]
   * @returns {Item}
   */
  Item.prototype._stopLayout = function (processLayoutQueue) {

    var inst = this;

    if (!inst._isPositioning) {
      return inst;
    }

    // Stop animation.
    inst._animate.stop();

    // Remove positioning class.
    removeClass(inst._element, inst.getGrid()._settings.itemPositioningClass);

    // Reset state.
    inst._isPositioning = false;

    // Process callback queue.
    if (processLayoutQueue) {
      processQueue(inst._layoutQueue, true, inst);
    }

    return inst;

  };

  /**
   * Recalculate item's dimensions.
   *
   * @protected
   * @memberof Item.prototype
   * @returns {Item}
   */
  Item.prototype._updateDimensions = function () {

    var inst = this;
    var element;
    var rect;
    var sides;
    var side;
    var margin;
    var i;

    if (inst._isHidden) {
      return inst;
    }

    element = inst._element;

    // Calculate margins (ignore negative margins).
    sides = ['left', 'right', 'top', 'bottom'];
    margin = inst._margin = inst._margin || {};
    for (i = 0; i < 4; i++) {
      side = Math.round(getStyleAsFloat(element, 'margin-' + sides[i]));
      margin[sides[i]] = side > 0 ? side : 0;
    }

    // Calculate width and height (with and without margins).
    rect = element.getBoundingClientRect();
    inst._width = Math.round(rect.width);
    inst._height = Math.round(rect.height);
    inst._outerWidth = inst._width + margin.left + margin.right;
    inst._outerHeight = inst._height + margin.top + margin.bottom;

    return inst;

  };

  /**
   * Fetch and store item's sort data.
   *
   * @protected
   * @memberof Item.prototype
   * @returns {Item}
   */
  Item.prototype._updateSortData = function () {

    var inst = this;
    var sortData = {};
    var getters = inst.getGrid()._settings.sortData;

    // Fetch sort data.
    if (getters) {
      Object.keys(getters).forEach(function (key) {
        sortData[key] = getters[key](inst, inst._element);
      });
    }

    // Store sort data to the instance.
    inst._sortData = sortData;

    return inst;

  };

  /**
   * Position item based on it's current data.
   *
   * @protected
   * @memberof Item.prototype
   * @param {Boolean} instant
   * @param {Function} [onFinish]
   * @returns {Item}
   */
  Item.prototype._layout = function (instant, onFinish) {

    var inst = this;
    var element = inst._element;
    var grid = inst.getGrid();
    var settings = grid._settings;
    var release = inst._drag ? inst._drag._releaseData : {};
    var isJustReleased = release.isActive && release.isPositioningStarted === false;
    var animDuration = isJustReleased ? settings.dragReleaseDuration : settings.layoutDuration;
    var animEasing = isJustReleased ? settings.dragReleaseEasing : settings.layoutEasing;
    var animEnabled = !instant && !inst._skipNextLayoutAnimation && animDuration > 0;
    var isPositioning = inst._isPositioning;
    var migrate = inst._migrate;
    var offsetLeft;
    var offsetTop;
    var currentLeft;
    var currentTop;
    var finishLayout = function () {

      // Mark the item as not positioning and remove positioning classes.
      if (inst._isPositioning) {
        inst._isPositioning = false;
        removeClass(element, settings.itemPositioningClass);
      }

      // Finish up release.
      if (release.isActive) {
        inst._drag._stopRelease();
      }

      // Finish up migration.
      if (migrate.isActive) {
        inst._stopMigrate();
      }

      // Process the callback queue.
      processQueue(inst._layoutQueue, false, inst);

    };

    // Process current layout callback queue with interrupted flag on if the
    // item is currently positioning.
    if (isPositioning) {
      processQueue(inst._layoutQueue, true, inst);
    }

    // Mark release positioning as started.
    if (isJustReleased) {
      release.isPositioningStarted = true;
    }

    // Push the callback to the callback queue.
    if (typeof onFinish === 'function') {
      inst._layoutQueue[inst._layoutQueue.length] = onFinish;
    }

    // Get item container offset. This applies only for release handling in the
    // scenario where the released element is not currently within the
    // grid container element.
    offsetLeft = release.isActive ? release.containerDiffX : migrate.isActive ? migrate.containerDiffX : 0;
    offsetTop = release.isActive ? release.containerDiffY : migrate.isActive ? migrate.containerDiffY : 0;

    // If no animations are needed, easy peasy!
    if (!animEnabled) {

      inst._stopLayout();
      inst._skipNextLayoutAnimation = false;

      // Set the styles only if they are not set later on. If an item is being
      // released after drag and the drag container is something else than the
      // Grid's container element these styles will be set after the item has
      // been moved back to the Grid's element, which also means that setting
      // the styles here in that scenario is a waste of resources.
      if (!(release.isActive && element.parentNode !== grid._element) || !(migrate.isActive && migrate.appendTo !== grid._element)) {
        setStyles(element, {
          transform: 'translateX(' + (inst._left + offsetLeft) + 'px) translateY(' + (inst._top + offsetTop) + 'px)'
        });
      }

      finishLayout();

    }

    // If animations are needed, let's dive in.
    else {

      // Get current (relative) left and top position. Meaning that the
      // container's offset (if applicable) is subtracted from the current
      // translate values.
      if (isPositioning && inst._isDefaultAnimate) {
        currentLeft = parseFloat(Velocity.hook(element, 'translateX')) - offsetLeft;
        currentTop = parseFloat(Velocity.hook(element, 'translateY')) - offsetTop;
      }
      else {
        currentLeft = getTranslateAsFloat(element, 'x') - offsetLeft;
        currentTop = getTranslateAsFloat(element, 'y') - offsetTop;
      }

      // If the item is already in correct position there's no need to animate
      // it.
      if (inst._left === currentLeft && inst._top === currentTop) {
        inst._stopLayout();
        finishLayout();
        return;
      }

      // Mark as positioning and add positioning class if necessary.
      if (!isPositioning) {
        inst._isPositioning = true;
        addClass(element, settings.itemPositioningClass);
      }

      // Animate.
      inst._animate.start({
        translateX: (currentLeft + offsetLeft) + 'px',
        translateY: (currentTop + offsetTop) + 'px'
      }, {
        translateX: inst._left + offsetLeft,
        translateY: inst._top + offsetTop
      }, {
        duration: animDuration,
        easing: animEasing,
        onFinish: finishLayout
      });

    }

    return inst;

  };

  /**
   * Show item.
   *
   * @protected
   * @memberof Item.prototype
   * @param {Boolean} instant
   * @param {Function} [onFinish]
   * @returns {Item}
   */
  Item.prototype._show = function (instant, onFinish) {

    var inst = this;
    var element = inst._element;
    var queue = inst._visibilityQueue;
    var grid = inst.getGrid();
    var settings = grid._settings;
    var callback = typeof onFinish === 'function' ? onFinish : null;

    // If item is showing.
    if (inst._isShowing) {

      // If instant flag is on, interrupt the current animation and set the
      // visible styles.
      if (instant) {
        grid._itemShowHandler.stop();
        processQueue(queue, true, inst);
        if (callback) {
          queue[queue.length] = callback;
        }
        grid._itemShowHandler.start(inst, instant, function () {
          processQueue(queue, false, inst);
        });
      }

      // Otherwise just push the callback to the queue.
      else if (callback) {
        queue[queue.length] = callback;
      }

    }

    // Otherwise if item is visible call the callback and be done with it.
    else if (!inst._isHidden) {
      callback && callback(false, inst);
    }

    // Finally if item is hidden or hiding, show it.
    else {

      // Stop ongoing hide animation.
      if (inst._isHiding) {
        grid._itemHideHandler.stop(inst);
      }

      // Update item's internal state.
      inst._isActive = inst._isShowing = true;
      inst._isHidden = inst._isHiding = false;

      // Update item classes.
      addClass(element, settings.itemVisibleClass);
      removeClass(element, settings.itemHiddenClass);

      // Set item element's display style to block.
      setStyles(element, {
        display: 'block'
      });

      // Process the visibility callback queue with the interrupted flag active.
      processQueue(queue, true, inst);

      // Push the callback to the visibility callback queue.
      if (callback) {
        queue[queue.length] = callback;
      }

      // Animate child element and process the visibility callback queue after
      // succesful animation.
      grid._itemShowHandler.start(inst, instant, function () {
        processQueue(queue, false, inst);
      });

    }

    return inst;

  };

  /**
   * Hide item.
   *
   * @protected
   * @memberof Item.prototype
   * @param {Boolean} instant
   * @param {Function} [onFinish]
   * @returns {Item}
   */
  Item.prototype._hide = function (instant, onFinish) {

    var inst = this;
    var element = inst._element;
    var queue = inst._visibilityQueue;
    var grid = inst.getGrid();
    var settings = grid._settings;
    var callback = typeof onFinish === 'function' ? onFinish : null;

    // If item is hiding.
    if (inst._isHiding) {

      // If instant flag is on, interrupt the current animation and set the
      // hidden styles.
      if (instant) {
        grid._itemHideHandler.stop();
        processQueue(queue, true, inst);
        if (callback) {
          queue[queue.length] = callback;
        }
        grid._itemHideHandler.start(inst, instant, function () {
          setStyles(element, {
            display: 'none'
          });
          processQueue(queue, false, inst);
        });
      }

      // Otherwise just push the callback to the queue.
      else if (callback) {
        queue[queue.length] = callback;
      }

    }

    // Otherwise if item is hidden call the callback and be done with it.
    else if (inst._isHidden) {
      callback && callback(false, inst);
    }

    // Finally if item is visible or showing, hide it.
    else {

      // Stop ongoing show animation.
      if (inst._isShowing) {
        grid._itemShowHandler.stop(inst);
      }

      // Update item's internal state.
      inst._isHidden = inst._isHiding = true;
      inst._isActive = inst._isShowing = false;

      // Update item classes.
      addClass(element, settings.itemHiddenClass);
      removeClass(element, settings.itemVisibleClass);

      // Process the visibility callback queue with the interrupted flag active.
      processQueue(queue, true, inst);

      // Push the callback to the visibility callback queue.
      if (typeof callback === 'function') {
        queue[queue.length] = callback;
      }

      // Animate child element and process the visibility callback queue after
      // succesful animation.
      grid._itemHideHandler.start(inst, instant, function () {
        setStyles(element, {
          display: 'none'
        });
        processQueue(queue, false, inst);
      });

    }

    return inst;

  };

  /**
   * End the migration process of an item. This method can be used to abort an
   * ongoing migration process animation or finish the migration process.
   *
   * @protected
   * @memberof Item.prototype
   * @param {Boolean} [abort=false]
   * @returns {Item}
   */
  Item.prototype._stopMigrate = function (abort) {

    var inst = this;
    var migrate = inst._migrate;
    var element;
    var grid;
    var translateX;
    var translateY;
    var fromGrid;
    var fromIndex;
    var toIndex;

    if (!migrate.isActive) {
      return inst;
    }

    element = inst._element;
    grid = inst.getGrid();

    // If the element is outside the grid's container element put it back there
    // and adjust position accordingly.
    if (migrate.appendTo !== grid._element) {
      translateX = abort ? getTranslateAsFloat(element, 'x') - migrate.containerDiffX : inst._left;
      translateY = abort ? getTranslateAsFloat(element, 'y') - migrate.containerDiffY : inst._top;
      grid._element.appendChild(element);
      setStyles(element, {
        transform: 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)'
      });
    }

    // Cache some migration data temporarily so it can be provided to the end
    // event after the migration data is reset.
    if (!abort) {
      fromGrid = migrate.fromGrid;
      fromIndex = migrate.fromIndex;
      toIndex = migrate.toIndex;
    }

    // Reset migration data.
    migrate.isActive = false;
    migrate.appendTo = null;
    migrate.containerDiffX = 0;
    migrate.containerDiffY = 0;
    migrate.fromGrid = null;
    migrate.fromIndex = 0;
    migrate.toIndex = 0;

    // Emit receiveEnd event.
    if (!abort) {
      grid._emitter.emit(evReceiveEnd, {
        item: inst,
        fromGrid: fromGrid,
        fromIndex: fromIndex,
        toIndex: toIndex
      });
    }

    return inst;

  };

  /**
   * Destroy item instance.
   *
   * @protected
   * @memberof Item.prototype
   * @param {Boolean} [removeElement=false]
   */
  Item.prototype._destroy = function (removeElement) {

    var inst = this;
    var grid = inst.getGrid();
    var settings = grid._settings;
    var element = inst._element;
    var index = grid._items.indexOf(inst);

    // Stop animations.
    inst._stopLayout(true);
    grid._itemShowHandler.stop(inst);
    grid._itemHideHandler.stop(inst);

    // Stop migration.
    inst._stopMigrate(true);

    // If item is being dragged or released, stop it gracefully.
    if (inst._drag) {
      inst._drag.destroy();
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

    // Remove classes.
    removeClass(element, settings.itemPositioningClass);
    removeClass(element, settings.itemDraggingClass);
    removeClass(element, settings.itemReleasingClass);
    removeClass(element, settings.itemClass);
    removeClass(element, settings.itemVisibleClass);
    removeClass(element, settings.itemHiddenClass);

    // Remove item from Grid instance if it still exists there.
    if (index > -1) {
      grid._items.splice(index, 1);
    }

    // Remove element from DOM.
    if (removeElement) {
      element.parentNode.removeChild(element);
    }

    // Remove item instance from the item instances collection.
    itemInstances[inst._id] = undefined;

    // Nullify instance properties.
    nullifyInstance(inst, Item);

  };

  /**
   * Layout
   * ******
   */

  /**
   * Creates a new Layout instance.
   *
   * @public
   * @class
   * @param {Grid} grid
   * @param {Item[]} [items]
   */
  function Layout(grid, items) {

    var inst = this;
    var settings = grid._settings.layout;
    var padding = grid._padding;
    var border = grid._border;

    inst.items = items ? items.concat() : grid.getItems('active');
    inst.slots = {};
    inst.setWidth = false;
    inst.setHeight = false;

    // Calculate the current width and height of the container element.
    inst.width = grid._width - border.left - border.right - padding.left - padding.right;
    inst.height = grid._height - border.top - border.bottom - padding.top - padding.bottom;

    // If the user has provided custom function as a layout method invoke it.
    // Otherwise invoke the default layout method.
    typeof settings === 'function' ? settings(inst) : layoutFirstFit(inst, isPlainObject(settings) ? settings : {});

  }

  /**
   * Layout - Default layout method
   * ******************************
   */

  /**
   * LayoutFirstFit v0.3.0-dev
   * Copyright (c) 2016 Niklas Rämö <inramo@gmail.com>
   * Released under the MIT license
   *
   * The default layout method.
   *
   * @private
   * @param {Layout} layout
   * @param {Object} settings
   * @param {Boolean} [settings.fillGaps=false]
   * @param {Boolean} [settings.horizontal=false]
   * @param {Boolean} [settings.alignRight=false]
   * @param {Boolean} [settings.alignBottom=false]
   */
  function layoutFirstFit(layout, settings) {

    var emptySlots = [];
    var fillGaps = settings.fillGaps ? true : false;
    var isHorizontal = settings.horizontal ? true : false;
    var alignRight = settings.alignRight ? true : false;
    var alignBottom = settings.alignBottom ? true : false;
    var slotIds;
    var slot;
    var item;
    var i;

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
      slot = layoutFirstFit.getSlot(layout, emptySlots, item._outerWidth, item._outerHeight, !isHorizontal, fillGaps);
      if (isHorizontal) {
        layout.width = Math.max(layout.width, slot.left + slot.width);
      }
      else {
        layout.height = Math.max(layout.height, slot.top + slot.height);
      }
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
   * @memberof layoutFirstFit
   * @param {Layout} layout
   * @param {Array} slots
   * @param {Number} itemWidth
   * @param {Number} itemHeight
   * @param {Boolean} vertical
   * @param {Boolean} fillGaps
   * @returns {Object}
   */
  layoutFirstFit.getSlot = function (layout, slots, itemWidth, itemHeight, vertical, fillGaps) {

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
      potentialSlots = splitRectWithRect(currentSlots[i], item);
      for (ii = 0; ii < potentialSlots.length; ii++) {
        slot = potentialSlots[ii];
        if (slot.width > 0 && slot.height > 0 && ((vertical && slot.top < layout.height) || (!vertical && slot.left < layout.width))) {
          newSlots[newSlots.length] = slot;
        }
      }
    }

    // Remove redundant slots, sort the slots and update the slots data.
    slots[0] = purgeRects(newSlots).sort(vertical ? sortRectsTopLeft : sortRectsLeftTop);

    // Return the item.
    return item;

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
   * @public
   * @class
   */
  function Emitter() {}

  /**
   * Emitter - Public prototype methods
   * **********************************
   */

  /**
   * Bind an event listener.
   *
   * @public
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
   * @public
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
   * @public
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
   * Destroy emitter instance. Basically just removes all bound listeners.
   *
   * @public
   * @memberof Emitter.prototype
   * @returns {Emitter} returns the Emitter instance.
   */
  Emitter.prototype.destroy = function () {

    var events = this._events || {};
    var eventNames = Object.keys(events);
    var i;

    for (i = 0; i < eventNames.length; i++) {
      events[eventNames[i]].length = 0;
      events[eventNames[i]] = null;
    }

    return this;

  };

  /**
   * Animate
   * *******
   */

  /**
   * Muuri's internal animation engine. Uses Velocity.
   *
   * @public
   * @class
   * @param {Item} item
   * @param {HTMLElement} element
   */
  function Animate(item, element) {

    this._element = element;
    this._queue = libName + '-' + (++uuid);
    this._isAnimating = false;

  }

  /**
   * Animate - Public prototype methods
   * **********************************
   */

  /**
   * Start instance's animation. Automatically stops current animation if it is
   * running.
   *
   * @public
   * @memberof Animate.prototype
   * @param {?Object} propsCurrent
   * @param {Object} propsTarget
   * @param {Object} [options]
   * @param {Number} [options.duration=300]
   * @param {Number} [options.delay=0]
   * @param {String} [options.easing='ease']
   * @param {Function} [options.onFinish]
   */
  Animate.prototype.start = function (propsCurrent, propsTarget, options) {

    var inst = this;
    var element = inst._element;
    var opts = options || {};
    var callback = typeof opts.onFinish === 'function' ? opts.onFinish : null;
    var velocityOpts = {
      duration: opts.duration || 300,
      delay: opts.delay || 0,
      easing: opts.easing || 'ease',
      queue: inst._queue
    };

    // Stop current animation, if running.
    if (inst._isAnimating) {
      inst.stop();
    }

    // Otherwise if current props exist force feed current values to Velocity.
    if (propsCurrent) {
      hookStyles(element, propsCurrent);
    }

    // Set as animating.
    inst._isAnimating = true;

    // Add callback if it exists.
    if (callback) {
      velocityOpts.complete = function () {
        callback();
      };
    }

    // Set up and start the animation.
    Velocity(element, propsTarget, velocityOpts);
    Velocity.Utilities.dequeue(element, inst._queue);

  };

  /**
   * Stop instance's current animation if running.
   *
   * @public
   * @memberof Animate.prototype
   */
  Animate.prototype.stop = function () {

    if (this._isAnimating) {
      this._isAnimating = false;
      Velocity(this._element, 'stop', this._queue);
    }

  };

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   * @memberof Animate.prototype
   * @returns {Boolean}
   */
  Animate.prototype.destroy = function () {

    this.stop();
    nullifyInstance(this, Animate);

  };

  /**
   * Drag
   * ****
   */

  /**
   * Bind Hammer touch interaction to an item.
   *
   * @class
   * @private
   * @param {Item} item
   */
  function Drag(item) {

    if (!Hammer) {
      throw Error('[' + libName + '] required dependency Hammer is not defined.');
    }

    var drag = this;
    var element = item._element;
    var grid = item.getGrid();
    var settings = grid._settings;
    var checkPredicate = typeof settings.dragStartPredicate === 'function' ? settings.dragStartPredicate : Drag.defaultStartPredicate;
    var predicate = null;
    var predicateEvent = null;
    var hammer;

    drag._itemId = item._id;
    drag._gridId = grid._id;
    drag._hammer = hammer = new Hammer.Manager(element);
    drag._isMigrating = false;
    drag._dragData = {};
    drag._releaseData = {};

    // Setup item's initial drag and release data.
    drag._setupDragData();
    drag._setupReleaseData();

    // Setup overlap checker function.
    drag._checkSortOverlap = debounce(function () {
      if (drag._dragData.isActive) {
        drag._checkOverlap();
      }
    }, settings.dragSortInterval);

    // Setup sort predicate.
    drag._sortPredicate = typeof settings.dragSortPredicate === 'function' ? settings.dragSortPredicate : Drag.defaultSortPredicate;

    // Setup drag scroll handler.
    drag._scrollHandler = function (e) {
      drag._onDragScroll(e);
    };

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
      threshold: 1000,
      time: 0
    }));

    // This is not ideal, but saves us from a LOT of hacks. Let's try to keep
    // the default drag setup consistent across devices.
    hammer.set({touchAction: 'none'});

    // Bind drag events.
    hammer
    .on('draginit dragstart dragmove', function (e) {

      // Always update the predicate event.
      predicateEvent = e;

      // Create predicate if it does not exist yet.
      if (!predicate) {
        predicate = new Predicate(function () {
          if (predicate === this) {
            drag._onDragStart(predicateEvent);
          }
        });
      }

      // If predicate is resolved and dragging is active, do the move.
      if (predicate._isResolved && drag._dragData.isActive) {
        drag._onDragMove(e);
      }

      // Otherwise, check the predicate.
      else if (!predicate._isRejected && !predicate._isResolved) {
        checkPredicate.call(drag._getGrid(), drag._getItem(), e, predicate);
      }

    })
    .on('dragend dragcancel draginitup', function (e) {

      // Do final predicate check to allow unbinding stuff for the current drag
      // procedure within the predicate callback.
      predicate.reject();
      checkPredicate.call(drag._getGrid(), drag._getItem(), e, predicate);

      // If predicate is resolved and dragging is active, do the end.
      if (predicate._isResolved && drag._dragData.isActive) {
        drag._onDragEnd(e);
      }

      // Nullify predicate reference.
      predicate = null;
      predicateEvent = null;

    });

    // Prevent native link/image dragging for the item and it's ancestors.
    element.addEventListener('dragstart', preventDefault, false);

  }

  /**
   * Drag - Public methods
   * *********************
   */

  /**
   * Default drag start predicate handler.
   *
   * @public
   * @memberof Drag
   * @param {Item} item
   * @param {Object} event
   * @param {Predicate} predicate
   */
  Drag.defaultStartPredicate = function (item, event, predicate) {

    predicate.resolve();

  };

  /**
   * Default drag sort predicate.
   *
   * @public
   * @memberof Drag
   * @param {Item} item
   * @returns {(Boolean|DragSortCommand)}
   *   - Returns false if no valid index was found. Otherwise returns drag sort
   *     command.
   */
  Drag.defaultSortPredicate = function (item) {

    var drag = item._drag;
    var dragData = drag._dragData;
    var rootGrid = drag._getGrid();
    // TODO:
    // Should this config be fetched from the current grid instead of the root
    // grid? Note that there is a chance that the drag is disabled in the
    // current grid, but this still has to work. Also note that the target
    // drag sort predicate can be a function... damn. This is a hard call. Maybe
    // this is ok as is.
    var config = rootGrid._settings.dragSortPredicate || {};
    var sortThreshold = config.threshold || 50;
    var sortAction = config.action || 'move';
    var grids = rootGrid._getSortConnections(true);
    var itemRect = {
      width: item._width,
      height: item._height,
      left: Math.round(dragData.elementClientX),
      top: Math.round(dragData.elementClientY)
    };
    var overlappingRects = [];
    var containerOffsetLeft = 0;
    var containerOffsetTop = 0;
    var matchScore = null;
    var matchIndex;
    var currentScore = null;
    var isMatch = function () {
      return matchScore !== null && matchScore >= sortThreshold;
    };
    var grid;
    var gridScore;
    var targetGrid;
    var targetItems;
    var targetItem;
    var targetRect;
    var targetScore;
    var hasActiveItems;
    var theGap;
    var padding;
    var border;
    var margin;
    var offset;
    var i;

    // First step is checking out which grid's container element the dragged
    // item overlaps the most currently.
    for (i = 0; i < grids.length; i++) {

      grid = grids[i];

      // We need to update the grid's offset since it may have changed during
      // scrolling. This could be left as problem for the userland, but it's
      // much nicer this way. One less hack for the user to worry about =)
      grid.updateDimensions('grid', 'offset');

      // Check how much dragged element overlaps the container element.
      offset = grid._offset;
      gridScore = getRectOverlapScore(itemRect, {
        width: grid._width,
        height: grid._height,
        left: offset.left,
        top: offset.top
      });

      // Update best match if the overlap score is higher than the current
      // match.
      if (matchScore === null || gridScore > matchScore) {
        matchIndex = i;
        matchScore = gridScore;
      }

    }

    // Return early if we found no grid container element that overlaps the
    // dragged item enough.
    if (!isMatch()) {
      return false;
    }

    // Get the target grid, it's rect data and its's active items.
    targetGrid = grids[matchIndex];
    targetItems = targetGrid._items;

    // If item is moved within it's originating grid adjust item's left and top
    // props. Otherwise if item is moved to/within another grid get the
    // container element's offset (from the element's content edge).
    if (targetGrid === rootGrid) {
      margin = item._margin;
      itemRect.left = Math.round(dragData.gridX) + margin.left;
      itemRect.top = Math.round(dragData.gridY) + margin.top;
    }
    else {
      offset = targetGrid._offset;
      border = targetGrid._border;
      padding = targetGrid._padding;
      containerOffsetLeft = offset.left + border.left + padding.left;
      containerOffsetTop = offset.top + border.top + padding.top;
    }

    // Reset the best match variables.
    matchIndex = matchScore = null;

    // Loop through the items and try to find a match.
    for (i = 0; i < targetItems.length; i++) {

      targetItem = targetItems[i];

      // Mark grid as having active items.
      if (!hasActiveItems && targetItem._isActive) {
        hasActiveItems = true;
      }

      // If the item is not active let's skip to the next one.
      if (!targetItem._isActive) {
        continue;
      }

      // Calculate target rect, angle and overlap score.
      margin = targetItem._margin;
      targetRect = {
        width: targetItem._width,
        height: targetItem._height,
        left: Math.round(targetItem._left) + margin.left + containerOffsetLeft,
        top: Math.round(targetItem._top) + margin.top + containerOffsetTop
      };
      targetScore = getRectOverlapScore(itemRect, targetRect);

      // Add target item to overlapping items if it overlaps the dragged item.
      if (targetScore > 0) {
        overlappingRects.push(targetRect);
      }

      // If the item is the target item, let's store the data and skip to the
      // next item.
      if (targetItem === item) {
        currentScore = targetScore;
        continue;
      }

      // Update best match if the overlap score is higher than the current
      // best match.
      if (matchScore === null || targetScore > matchScore) {
        matchIndex = i;
        matchScore = targetScore;
      }

    }

    // If the target grid does not have any active items let's set the dragged
    // item as the grid's first item.
    if (!hasActiveItems) {
      matchIndex = 0;
      matchScore = Infinity;
    }

    // If the grid has active items, but there are no matches, let's see if the
    // item could be dropped on a gap.
    // TODO: Somehow measure here if the overlapping empty space exceeds the
    // sort threshold and find an intuitive index for the gap.
    else if (!isMatch() && (!currentScore || currentScore < sortThreshold)) {
      theGap = getLargestRectSlice(itemRect, overlappingRects);
      if (theGap) {
        border = targetGrid._border;
        padding = targetGrid._padding;
        theGap = cropRect(theGap, {
          width: targetGrid._width - padding.left - padding.right - border.left - border.right,
          height: targetGrid._height - padding.top - padding.bottom - border.top - border.bottom,
          left: containerOffsetLeft,
          top: containerOffsetTop
        });
        // TODO: Check if the gap is big enough (user provided threshold).
        if ((theGap.width * theGap.height) > ((itemRect.width * itemRect.height) * 0.5)) {
          // TODO: Get the index of the item that's visually before the gap.
          console.log(theGap);
        }
      }
    }

    // Check if the best match overlaps enough to justify a placement switch.
    if (isMatch()) {
      return {
        grid: targetGrid,
        index: matchIndex,
        action: sortAction
      };
    }

    return false;

  };

  /**
   * Drag - Public prototype methods
   * *******************************
   */

  /**
   * Destroy instance.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.destroy = function () {

    var drag = this;
    var item = drag._getItem();

    if (drag._dragData.isActive) {
      drag._stopDrag();
    }
    else if (drag._releaseData.isActive) {
      drag._stopRelease(true);
    }

    drag._hammer.destroy();
    item._element.removeEventListener('dragstart', preventDefault, false);
    nullifyInstance(drag, Drag);

    return drag;

  };

  /**
   * Drag - Protected prototype methods
   * **********************************
   */

  /**
   * Get Item instance.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {?Item}
   */
  Drag.prototype._getItem = function () {

    return itemInstances[this._itemId] || null;

  };

  /**
   * Get Grid instance.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {?Grid}
   */
  Drag.prototype._getGrid = function () {

    return gridInstances[this._gridId] || null;

  };

  /**
   * Setup/reset drag data.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._setupDragData = function () {

    var drag = this;
    var dragData = drag._dragData;

    // Is item being dragged?
    dragData.isActive = false;

    // Hammer event data.
    dragData.startEvent = null;
    dragData.currentEvent = null;

    // Scroll parents of the dragged element and container.
    dragData.scrollParents = [];

    // The current translateX/translateY position.
    dragData.left = 0;
    dragData.top = 0;

    // Dragged element's current position within the grid.
    dragData.gridX = 0;
    dragData.gridY = 0;

    // Dragged element's current offset from window's northwest corner. Does
    // not account for element's margins.
    dragData.elementClientX = 0;
    dragData.elementClientY = 0;

    // Offset difference between the dragged element's temporary drag
    // container and it's original container.
    dragData.containerDiffX = 0;
    dragData.containerDiffY = 0;

    return drag;

  };

  /**
   * Setup/reset release data.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._setupReleaseData = function () {

    var drag = this;
    var release = drag._releaseData;

    release.isActive = false;
    release.isPositioningStarted = false;
    release.containerDiffX = 0;
    release.containerDiffY = 0;

    return drag;

  };

  /**
   * Check (during drag) if an item is overlapping other items and based on
   * the configuration layout the items.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._checkOverlap = function () {

    var drag = this;
    var item = drag._getItem();
    var result = drag._sortPredicate(item);
    var dragEvent;
    var currentGrid;
    var currentIndex;
    var targetGrid;
    var targetIndex;
    var sortAction;

    if (!result) {
      return drag;
    }

    dragEvent = drag._dragData.currentEvent;
    currentGrid = item.getGrid();
    currentIndex = currentGrid._items.indexOf(item);
    targetGrid = result.grid || currentGrid;
    targetIndex = result.index;
    sortAction = result.action || 'move';

    // If the item was moved within it's current grid.
    if (currentGrid === targetGrid) {

      // Do the sort.
      (sortAction === 'swap' ? arraySwap : arrayMove)(currentGrid._items, currentIndex, targetIndex);

      // Emit dragSort event.
      currentGrid._emitter.emit(evDragSort, dragEvent, {
        item: item,
        fromIndex: currentIndex,
        toIndex: targetIndex,
        action: sortAction
      });

      // Layout the grid.
      currentGrid.layout();

    }

    // If the item was moved to another grid.
    else {

      // Update item's grid id reference.
      item._gridId = targetGrid._id;

      // Update drag instances's migrating indicator.
      drag._isMigrating = item._gridId !== drag._gridId;

      // Move item instance from current grid to target grid.
      currentGrid._items.splice(currentIndex, 1);
      insertItemsToArray(targetGrid._items, item, targetIndex);

      // Set sort data as null, which is an indicator for the item comparison
      // function that the sort data of this specific item should be fetched
      // lazily.
      item._sortData = null;

      // Emit dragSend event.
      currentGrid._emitter.emit(evDragSend, dragEvent, {
        item: item,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });

      // Emit dragReceive event.
      targetGrid._emitter.emit(evDragReceive, dragEvent, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toIndex: targetIndex
      });

      // Layout both grids.
      currentGrid.layout();
      targetGrid.layout();

    }

    return drag;

  };

  /**
   * If item is dragged into another grid, finish the migration process
   * gracefully.
   *
   * @protected
   * @memberof Drag.prototype
   * @param {Object} currentEvent
   * @returns {Drag}
   */
  Drag.prototype._finishMigration = function (currentEvent) {

    var drag = this;
    var item = drag._getItem();
    var element = item._element;
    var origGrid = drag._getGrid();
    var origGridStn = origGrid._settings;
    var targetGrid = item.getGrid();
    var targetGridStn = targetGrid._settings;
    var appendTo = targetGridStn.dragEnabled && targetGridStn._dragGrid ? targetGridStn._dragGrid : targetGrid._element;
    var releaseDiffX = 0;
    var releaseDiffY = 0;
    var release;
    var offsetDiff;
    var translateX;
    var translateY;

    // Reset migrating indicator to avoid infinite loops.
    drag._isMigrating = false;

    // If drag is not currently active set the release as active (to fool the
    // drag.destroy() method) so that drag.stopRelease() gets called.
    if (!drag._dragData.isActive) {
      drag._releaseData.isActive = true;
    }

    // Destroy current drag.
    drag.destroy();

    // Destroy current animation handlers.
    item._animate.destroy();
    item._animateChild.destroy();

    // Remove current classnames.
    removeClass(element, origGridStn.itemClass);
    removeClass(element, origGridStn.itemVisibleClass);
    removeClass(element, origGridStn.itemHiddenClass);

    // Add new classnames.
    addClass(element, targetGridStn.itemClass);
    addClass(element, targetGridStn.itemVisibleClass);

    // Instantiate new animation controllers.
    item._animate = new Grid.AnimateLayout(item, element);
    item._animateChild = new Grid.AnimateVisibility(item, item._child);
    item._isDefaultAnimate = item._animate instanceof Animate;
    item._isDefaultChildAnimate = item._animateChild instanceof Animate;

    // Get current translate values.
    translateX = getTranslateAsFloat(element, 'x');
    translateY = getTranslateAsFloat(element, 'y');

    // Move the item inside the new container.
    appendTo.appendChild(element);

    // Calculate how much offset difference the new container has with the
    // old container and adjust the translate value accordingly.
    offsetDiff = getContainerOffsetDiff(element, origGrid._element);
    translateX += offsetDiff.left;
    translateY += offsetDiff.top;

    // In the likely case that the layout container is not the target container
    // we need to calculate how much offset difference there is between the
    // containers and store it as offset difference to the release data.
    if (appendTo !== targetGrid._element) {
      offsetDiff = getContainerOffsetDiff(element, targetGrid._element);
      releaseDiffX = offsetDiff.left;
      releaseDiffY = offsetDiff.top;
    }

    // Update translate styles.
    setStyles(element, {
      transform: 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)'
    });

    // Update child element's styles to reflect the current visibility state.
    item._child.removeAttribute('style');
    targetGrid._itemShowHandler.start(item, true);

    // Update item's cached dimensions and sort data.
    item._updateDimensions()._updateSortData();

    // Recreate item's drag handler.
    item._drag = targetGridStn.dragEnabled ? new Grid.Drag(item) : null;

    // Emit dragReceiveDrop event.
    targetGrid._emitter.emit(evDragReceiveDrop, currentEvent, item);

    // If the item has drag handling, start the release.
    if (item._drag) {
      release = item._drag._releaseData;
      release.containerDiffX = releaseDiffX;
      release.containerDiffY = releaseDiffY;
      item._drag._startRelease();
    }

    // Otherwise just layout the item.
    else {
      item._layout();
    }

    return drag;

  };

  /**
   * Abort dragging and reset drag data.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._stopDrag = function () {

    var drag = this;
    var dragData = drag._dragData;
    var element;
    var grid;
    var i;

    if (!dragData.isActive) {
      return drag;
    }

    // If the item is being dropped into another grid, finish it up and return
    // immediately.
    if (drag._isMigrating) {
      drag._finishMigration(dragData.currentEvent);
      return;
    }

    element = drag._getItem()._element;
    grid = drag._getGrid();

    // Remove scroll listeners.
    for (i = 0; i < dragData.scrollParents.length; i++) {
      dragData.scrollParents[i].removeEventListener('scroll', drag._scrollHandler);
    }

    // Cancel overlap check.
    drag._checkSortOverlap('cancel');

    // Append item element to the container if it's not it's child. Also make
    // sure the translate values are adjusted to account for the DOM shift.
    if (element.parentNode !== grid._element) {
      grid._element.appendChild(element);
      setStyles(element, {
        transform: 'translateX(' + dragData.gridX + 'px) translateY(' + dragData.gridY + 'px)'
      });
    }

    // Remove dragging class.
    removeClass(element, grid._settings.itemDraggingClass);

    // Reset drag data.
    drag._setupDragData();

    return drag;

  };

  /**
   * Start the release process of an item.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._startRelease = function () {

    var drag = this;
    var releaseData = drag._releaseData;
    var item;
    var element;
    var grid;

    if (releaseData.isActive) {
      return drag;
    }

    item = drag._getItem();
    element = item._element;
    grid = drag._getGrid();

    // Flag release as active.
    releaseData.isActive = true;

    // Add release classname to released element.
    addClass(element, grid._settings.itemReleasingClass);

    // Emit dragReleaseStart event.
    grid._emitter.emit(evDragReleaseStart, item);

    // Position the released item.
    item._layout(false);

    return drag;

  };

  /**
   * End the release process of an item. This method can be used to abort an
   * ongoing release process (animation) or finish the release process.
   *
   * @protected
   * @memberof Drag.prototype
   * @param {Boolean} [abort=false]
   *  - Should the release be aborted? When true, the release end event won't be
   *    emitted. Set to true only when you need to abort the release process
   *    while the item is animating to it's position.
   * @returns {Drag}
   */
  Drag.prototype._stopRelease = function (abort) {

    var drag = this;
    var releaseData = drag._releaseData;
    var item;
    var element;
    var grid;
    var translateX;
    var translateY;

    if (!releaseData.isActive) {
      return drag;
    }

    item = drag._getItem();
    element = item._element;
    grid = drag._getGrid();

    // Remove release classname from the released element.
    removeClass(element, grid._settings.itemReleasingClass);

    // If the released element is outside the grid's container element put it
    // back there and adjust position accordingly.
    if (element.parentNode !== grid._element) {
      translateX = abort ? getTranslateAsFloat(element, 'x') - releaseData.containerDiffX : item._left;
      translateY = abort ? getTranslateAsFloat(element, 'y') - releaseData.containerDiffY : item._top;
      grid._element.appendChild(element);
      setStyles(element, {
        transform: 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)'
      });
    }

    // Reset release data.
    drag._setupReleaseData();

    // Emit dragReleaseEnd event.
    if (!abort) {
      grid._emitter.emit(evDragReleaseEnd, item);
    }

    return drag;

  };

  /**
   * Drag start handler.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._onDragStart = function (e) {

    var drag = this;
    var item = drag._getItem();
    var element;
    var grid;
    var settings;
    var dragData;
    var releaseData;
    var currentLeft;
    var currentTop;
    var gridContainer;
    var dragContainer;
    var offsetDiff;
    var elementGBCR;
    var isWithinDragContainer;
    var i;

    // If item is not active, don't start the drag.
    if (!item._isActive) {
      return;
    }

    element = item._element;
    grid = drag._getGrid();
    settings = grid._settings;
    dragData = drag._dragData;
    releaseData = drag._releaseData;

    // Stop current positioning animation.
    if (item._isPositioning) {
      item._stopLayout(true);
    }

    // Stop current migration animation.
    if (item._migrate.isActive) {
      item._stopMigrate(true);
    }

    // If item is being released reset release data, remove release class and
    // import the element styles from release data to drag data.
    if (releaseData.isActive) {
      removeClass(element, settings.itemReleasingClass);
      drag._setupReleaseData();
    }

    // Setup drag data.
    dragData.isActive = true;
    dragData.startEvent = dragData.currentEvent = e;

    // Get element's current position.
    currentLeft = getTranslateAsFloat(element, 'x');
    currentTop = getTranslateAsFloat(element, 'y');

    // Get container element references.
    gridContainer = grid._element;
    dragContainer = settings.dragContainer;

    // Set initial left/top drag value.
    dragData.left = dragData.gridX = currentLeft;
    dragData.top = dragData.gridY = currentTop;

    // If a specific drag container is set and it is different from the
    // grid's container element we need to cast some extra spells.
    if (dragContainer && dragContainer !== gridContainer) {

      // Check if dragged element is already a child of the drag container.
      isWithinDragContainer = element.parentNode === dragContainer;

      // If dragged elment is not yet a child of the drag container our first
      // job is to move it there.
      if (!isWithinDragContainer) {
        dragContainer.appendChild(element);
      }

      // Store the container offset diffs to drag data.
      offsetDiff = getContainerOffsetDiff(element, gridContainer);
      dragData.containerDiffX = offsetDiff.left;
      dragData.containerDiffY = offsetDiff.top;

      // If the dragged element is a child of the drag container all we need to
      // do is setup the relative drag position data.
      if (isWithinDragContainer) {
        dragData.gridX = currentLeft - dragData.containerDiffX;
        dragData.gridY = currentTop - dragData.containerDiffY;
      }

      // Otherwise, we need to setup the actual drag position data and adjust
      // the element's translate values to account for the DOM position shift.
      else {
        dragData.left = currentLeft + dragData.containerDiffX;
        dragData.top = currentTop + dragData.containerDiffY;
        setStyles(element, {
          transform: 'translateX(' + dragData.left + 'px) translateY(' + dragData.top + 'px)'
        });
      }

    }

    // Get and store element's current offset from window's northwest corner.
    elementGBCR = element.getBoundingClientRect();
    dragData.elementClientX = elementGBCR.left;
    dragData.elementClientY = elementGBCR.top;

    // Get drag scroll parents.
    dragData.scrollParents = getScrollParents(element);
    if (dragContainer && dragContainer !== gridContainer) {
      dragData.scrollParents = arrayUnique(dragData.scrollParents.concat(getScrollParents(gridContainer)));
    }

    // Bind scroll listeners.
    for (i = 0; i < dragData.scrollParents.length; i++) {
      dragData.scrollParents[i].addEventListener('scroll', drag._scrollHandler);
    }

    // Set drag class.
    addClass(element, settings.itemDraggingClass);

    // Emit dragStart event.
    grid._emitter.emit(evDragStart, e, item);

    return drag;

  };

  /**
   * Drag move handler.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._onDragMove = function (e) {

    var drag = this;
    var item = drag._getItem();
    var element;
    var grid;
    var settings;
    var dragData;
    var xDiff;
    var yDiff;

    // If item is not active, reset drag.
    if (!item._isActive) {
      drag._stopDrag();
      return;
    }

    element = item._element;
    grid = drag._getGrid();
    settings = grid._settings;
    dragData = drag._dragData;

    // Get delta difference from last dragmove event.
    xDiff = e.deltaX - dragData.currentEvent.deltaX;
    yDiff = e.deltaY - dragData.currentEvent.deltaY;

    // Update current event.
    dragData.currentEvent = e;

    // Update position data.
    dragData.left += xDiff;
    dragData.top += yDiff;
    dragData.gridX += xDiff;
    dragData.gridY += yDiff;
    dragData.elementClientX += xDiff;
    dragData.elementClientY += yDiff;

    // Update element's translateX/Y values.
    setStyles(element, {
      transform: 'translateX(' + dragData.left + 'px) translateY(' + dragData.top + 'px)'
    });

    // Overlap handling.
    if (settings.dragSort) {
      drag._checkSortOverlap();
    }

    // Emit dragMove event.
    grid._emitter.emit(evDragMove, e, item);

    return drag;

  };

  /**
   * Drag scroll handler.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._onDragScroll = function (e) {

    var drag = this;
    var item = drag._getItem();
    var element = item._element;
    var grid = drag._getGrid();
    var settings = grid._settings;
    var dragData = drag._dragData;
    var gridContainer = grid._element;
    var dragContainer = settings.dragContainer;
    var elementGBCR = element.getBoundingClientRect();
    var xDiff = dragData.elementClientX - elementGBCR.left;
    var yDiff = dragData.elementClientY - elementGBCR.top;
    var offsetDiff;

    // Update container diff.
    if (dragContainer && dragContainer !== gridContainer) {
      offsetDiff = getContainerOffsetDiff(element, gridContainer);
      dragData.containerDiffX = offsetDiff.left;
      dragData.containerDiffY = offsetDiff.top;
    }

    // Update position data.
    dragData.left += xDiff;
    dragData.top += yDiff;
    dragData.gridX = dragData.left - dragData.containerDiffX;
    dragData.gridY = dragData.top - dragData.containerDiffY;

    // Update element's translateX/Y values.
    setStyles(element, {
      transform: 'translateX(' + dragData.left + 'px) translateY(' + dragData.top + 'px)'
    });

    // Overlap handling.
    if (settings.dragSort) {
      drag._checkSortOverlap();
    }

    // Emit dragScroll event.
    grid._emitter.emit(evDragScroll, e, item);

    return drag;

  };

  /**
   * Drag end handler.
   *
   * @protected
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype._onDragEnd = function (e) {

    var drag = this;
    var item = drag._getItem();
    var element = item._element;
    var grid = drag._getGrid();
    var settings = grid._settings;
    var dragData = drag._dragData;
    var releaseData = drag._releaseData;
    var i;

    // If item is not active, reset drag.
    if (!item._isActive) {
      drag._stopDrag();
      return;
    }

    // Finish currently queued overlap check.
    if (settings.dragSort) {
      drag._checkSortOverlap('finish');
    }

    // Remove scroll listeners.
    for (i = 0; i < dragData.scrollParents.length; i++) {
      dragData.scrollParents[i].removeEventListener('scroll', drag._scrollHandler);
    }

    // Remove drag classname from element.
    removeClass(element, settings.itemDraggingClass);

    // Setup release data.
    releaseData.containerDiffX = dragData.containerDiffX;
    releaseData.containerDiffY = dragData.containerDiffY;

    // Reset drag data.
    drag._setupDragData();

    // Emit dragEnd event.
    grid._emitter.emit(evDragEnd, e, item);

    // Finish up the migration process if needed.
    if (drag._isMigrating) {
      drag._finishMigration(e);
    }

    // Otherwise start the release process.
    else {
      drag._startRelease();
    }

    return drag;

  };

  /**
   * Predicate
   * *********
   */

  /**
   * Generic predicate constructor.
   *
   * @private
   * @class
   * @param {Function} [onResolved]
   * @param {Function} [onRejected]
   */
  function Predicate(onResolved, onRejected) {

    this._isResolved = false;
    this._isRejected = false;
    this._onResolved = onResolved;
    this._onRejected = onRejected;

  }

  /**
   * Predicate - Public prototype methods
   * ************************************
   */

  /**
   * Check if predicate is resolved.
   *
   * @public
   * @memberof Predicate.prototype
   * returns {Boolean}
   */
  Predicate.prototype.isResolved = function () {

    return this._isResolved;

  };

  /**
   * Check if predicate is rejected.
   *
   * @public
   * @memberof Predicate.prototype
   * returns {Boolean}
   */
  Predicate.prototype.isRejected = function () {

    return this._isRejected;

  };

  /**
   * Resolve predicate.
   *
   * @public
   * @memberof Predicate.prototype
   */
  Predicate.prototype.resolve = function () {

    var inst = this;
    if (!inst._isRejected && !inst._isResolved) {
      inst._isResolved = true;
      if (typeof inst._onResolved === 'function') {
        inst._onResolved();
      }
      inst._onResolved = inst._onRejected = null;
    }

  };

  /**
   * Reject predicate.
   *
   * @public
   * @memberof Predicate.prototype
   */
  Predicate.prototype.reject = function () {

    var inst = this;
    if (!inst._isRejected && !inst._isResolved) {
      inst._isRejected = true;
      if (typeof inst._onRejected === 'function') {
        inst._onRejected();
      }
      inst._onResolved = inst._onRejected = null;
    }

  };

  /**
   * Helpers - Generic
   * *****************
   */

  /**
   * Normalize array index. Basically this function makes sure that the provided
   * array index is within the bounds of the provided array and also transforms
   * negative index to the matching positive index.
   *
   * @private
   * @param {Array} array
   * @param {Number} index
   */
  function normalizeArrayIndex(array, index) {

    var length = array.length;
    var maxIndex = length - 1;

    if (index > maxIndex) {
      return maxIndex;
    }
    else if (index < 0) {
      return Math.max(length + index, 0);
    }

    return index;

  }

  /**
   * Swap array items.
   *
   * @private
   * @param {Array} array
   * @param {Number} index
   *   - Index (positive or negative) of the item that will be swapped.
   * @param {Number} withIndex
   *   - Index (positive or negative) of the other item that will be swapped.
   */
  function arraySwap(array, index, withIndex) {

    // Make sure the array has two or more items.
    if (array.length < 2) {
      return;
    }

    // Normalize the indices.
    var indexA = normalizeArrayIndex(array, index);
    var indexB = normalizeArrayIndex(array, withIndex);
    var temp;

    // Swap the items.
    if (indexA !== indexB) {
      temp = array[indexA];
      array[indexA] = array[indexB];
      array[indexB] = temp;
    }

  }

  /**
   * Move array item to another index.
   *
   * @private
   * @param {Array} array
   * @param {Number} fromIndex
   *   - Index (positive or negative) of the item that will be moved.
   * @param {Number} toIndex
   *   - Index (positive or negative) where the item should be moved to.
   */
  function arrayMove(array, fromIndex, toIndex) {

    // Make sure the array has two or more items.
    if (array.length < 2) {
      return;
    }

    // Normalize the indices.
    var from = normalizeArrayIndex(array, fromIndex);
    var to = normalizeArrayIndex(array, toIndex);

    // Add target item to the new position.
    if (from !== to) {
      array.splice(to, 0, array.splice(from, 1)[0]);
    }

  }

  /**
   * Returns a new duplicate free version of the provided array.
   *
   * @private
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
   * @private
   * @param {*} val
   * @returns {Boolean}
   */
  function isPlainObject(val) {

    return typeof val === 'object' && Object.prototype.toString.call(val) === '[object Object]';

  }

  /**
   * Check if a value is a node list
   *
   * @private
   * @param {*} val
   * @returns {Boolean}
   */
  function isNodeList(val) {

    var type = Object.prototype.toString.call(val);
    return type === '[object HTMLCollection]' || type === '[object NodeList]';

  }

  /**
   * Merge two objects recursively (deep merge). The source object's properties
   * are merged to the target object.
   *
   * @private
   * @param {Object} target
   *   - The target object.
   * @param {Object} source
   *   - The source object.
   * @returns {Object} Returns the target object.
   */
  function mergeObjects(target, source) {

    // Loop through the surce object's props.
    Object.keys(source).forEach(function (propName) {

      var isObject = isPlainObject(source[propName]);

      // If target and source values are both objects, merge the objects and
      // assign the merged value to the target property.
      if (isPlainObject(target[propName]) && isObject) {
        target[propName] = mergeObjects({}, target[propName]);
        target[propName] = mergeObjects(target[propName], source[propName]);
      }

      // Otherwise set the source object's value to target object and make sure
      // that object and array values are cloned and directly assigned.
      else {
        target[propName] = isObject ? mergeObjects({}, source[propName]) :
          Array.isArray(source[propName]) ? source[propName].concat() :
          source[propName];
      }

    });

    return target;

  }

  /**
   * Insert an item or an array of items to array to a specified index. Mutates
   * the array. The index can be negative in which case the items will be added
   * to the end of the array.
   *
   * @private
   * @param {Array} array
   * @param {*} items
   * @param {Number} [index=-1]
   */
  function insertItemsToArray(array, items, index) {

    var targetIndex = typeof index === 'number' ? index : -1;
    array.splice.apply(array, [targetIndex < 0 ? array.length - targetIndex + 1 : targetIndex, 0].concat(items));

  }

  /**
   * Returns a function, that, as long as it continues to be invoked, will not
   * be triggered. The function will be called after it stops being called for
   * N milliseconds. The returned function accepts one argument which, when
   * being "finish", calls the debounced function immediately if it is currently
   * waiting to be called, and when being "cancel" cancels the currently queued
   * function call.
   *
   * @private
   * @param {Function} fn
   * @param {Number} wait
   * @returns {Function}
   */
  function debounce(fn, wait) {

    var timeout;
    var actionCancel = 'cancel';
    var actionFinish = 'finish';

    return wait > 0 ? function (action) {

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

    } : function (action) {

      if (action !== actionCancel) {
        fn();
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
   * @private
   * @param {HTMLElement} element
   * @param {String} style
   * @returns {String}
   */
  function getStyle(element, style) {

    return global.getComputedStyle(element, null).getPropertyValue(style === 'transform' ? transform.styleName || style : style);

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
   * @private
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
   * @private
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
      element.style[prop === 'transform' && transform ? transform.propName : prop] = val;
    }

  }

  /**
   * Set inline styles to an element using Velocity's hook method.
   *
   * @private
   * @param {HTMLElement} element
   * @param {Object} styles
   */
  function hookStyles(element, styles) {

    var props = Object.keys(styles);
    var i;

    for (i = 0; i < props.length; i++) {
      Velocity.hook(element, props[i], styles[props[i]]);
    }

  }

  /**
   * Add class to an element.
   *
   * @private
   * @param {HTMLElement} element
   * @param {String} className
   */
  function addClass(element, className) {

    if (element.classList) {
      element.classList.add(className);
    }
    else if (!elementMatches(element, '.' + className)) {
      element.className += ' ' + className;
    }

  }

  /**
   * Remove class name from an element.
   *
   * @private
   * @param {HTMLElement} element
   * @param {String} className
   */
  function removeClass(element, className) {

    if (element.classList) {
      element.classList.remove(className);
    }
    else if (elementMatches(element, '.' + className)) {
      element.className = (' ' + element.className + ' ').replace(' ' + className + ' ', ' ').trim();
    }

  }

  /**
   * Convert nodeList to array.
   *
   * @private
   * @param {NodeList} nodeList
   * @returns {HTMLElement[]}
   */
  function nodeListToArray(nodeList) {

    return [].slice.call(nodeList);

  }

  /**
   * Checks the supported element.matches() method and returns a function that
   * can be used to call the supported method.
   *
   * @private
   * @returns {Function}
   */
  function getSupportedElementMatches() {

    var p = Element.prototype;
    var fn = p.matches || p.matchesSelector || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector;
    return function (el, selector) {
      return fn.call(el, selector);
    };

  }

  /**
   * Returns the supported style property's prefix, property name and style name
   * or null if the style property is not supported. This is used for getting
   * the supported transform.
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
   * Calculate the offset difference between an element's containing block
   * element and another element.
   *
   * @private
   * @param {HTMLElement} element
   * @param {HTMLElement} anchor
   * @returns {Object}
   */
  function getContainerOffsetDiff(element, anchor) {

    var container = getContainingBlock(element) || document;
    var ret = {
      left: 0,
      top: 0
    };
    var containerOffset;
    var anchorOffset;

    if (container === anchor) {
      return ret;
    }

    containerOffset = getOffsetFromDocument(container, 'padding');
    anchorOffset = getOffsetFromDocument(anchor, 'padding');

    return {
      left: anchorOffset.left - containerOffset.left,
      top: anchorOffset.top - containerOffset.top
    };

  }

  /**
   * Get element's scroll parents.
   *
   * Borrowed from jQuery UI library (and heavily modified):
   * https://github.com/jquery/jquery-ui/blob/63448148a217da7e64c04b21a04982f0d64aabaa/ui/scroll-parent.js
   *
   * @private
   * @param {HTMLElement} element
   * @returns {HTMLElement[]}
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

      // If the last item is the root element, replace it with the global
      // object (window). The root element scroll is propagated to the window.
      if (ret[ret.length - 1] === document.documentElement) {
        ret[ret.length - 1] = global;
      }

      // Otherwise add global object (window) as the last scroll parent.
      else {
        ret[ret.length] = global;
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
   *   - Returns true if transformed elements leak fixed elements, false
   *     otherwise.
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
    outer.style[transform.propName] = 'scaleX(1)';
    leftTransformed = inner.getBoundingClientRect().left;
    document.body.removeChild(outer);

    return leftTransformed === leftNotTransformed;

  }

  /**
   * Returns true if element is transformed, false if not. In practice the
   * element's display value must be anything else than "none" or "inline" as
   * well as have a valid transform value applied in order to be counted as a
   * transformed element.
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
   * @private
   * @param {(Document|HTMLElement|Window)} element
   * @returns {(?Document|HTMLElement|Window)}
   */
  function getContainingBlock(element) {

    var position;
    var ret;

    // If we have document return null right away.
    if (element === document) {
      return null;
    }

    // If we have window return document right away.
    if (element === global) {
      return document;
    }

    // Now that we know we have an element in our hands, let's get it's
    // position. Get element's current position value if a specific position is
    // not provided.
    position = getStyle(element, 'position');

    // Relative element's container is always the element itself.
    if (position === 'relative') {
      return element;
    }

    // If element is not positioned (static or an invalid position value),
    // always return null.
    if (position !== 'fixed' && position !== 'absolute') {
      return null;
    }

    // If the element is fixed and transforms leak fixed elements, always return
    // window.
    if (position === 'fixed' && transformLeaksFixed) {
      return global;
    }

    // Alrighty, so now fetch the element's parent (which is document for the
    // root) and set it as the initial containing block. Fallback to null if
    // everything else fails.
    ret = element === document.documentElement ? document : element.parentElement || null;

    // If element is fixed positioned.
    if (position === 'fixed') {

      // As long as the containing block is an element and is not transformed,
      // try to get the element's parent element and fallback to document.
      while (ret && ret !== document && !isTransformed(ret)) {
        ret = ret.parentElement || document;
      }

      return ret === document ? global : ret;

    }

    // If the element is absolute positioned. As long as the containing block is
    // an element, is static and is not transformed, try to get the element's
    // parent element and fallback to document.
    while (ret && ret !== document && getStyle(ret, 'position') === 'static' && !isTransformed(ret)) {
      ret = ret.parentElement || document;
    }

    return ret;

  }

  /**
   * Returns the element's (or window's) document offset, which in practice
   * means the vertical and horizontal distance between the element's northwest
   * corner and the document's northwest corner.
   *
   * Borrowed from Mezr (v0.6.1):
   * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L1006
   *
   * @private
   * @param {(Document|HTMLElement|Window)} element
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

    // Now we know we are calculating an element's offsets so let's first get
    // the element's bounding client rect. If it is not cached, then just fetch
    // it.
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
   * Helpers - Rectangle utilities
   * *****************************
   */

  /**
   * Check if two rectangles overlap.
   *
   * @private
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Boolean}
   */
  function doRectsOverlap(a, b) {

    return !((a.left + a.width) <= b.left || (b.left + b.width) <= a.left || (a.top + a.height) <= b.top || (b.top + b.height) <= a.top);

  }

  /**
   * Sort rectangles with top-left gravity.
   *
   * @private
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Number}
   */
  function sortRectsTopLeft(a, b) {

    return a.top - b.top || a.left - b.left;

  }

  /**
   * Sort rectangles with left-top gravity.
   *
   * @private
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Number}
   */
  function sortRectsLeftTop(a, b) {

    return a.left - b.left || a.top - b.top;

  }

  /**
   * Check if a rectangle is fully within another rectangle.
   *
   * @private
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Boolean}
   */
  function isRectWithinRect(a, b) {

    return a.left >= b.left && a.top >= b.top && (a.left + a.width) <= (b.left + b.width) && (a.top + a.height) <= (b.top + b.height);

  }

  /**
   * Punch a hole into a rectangle and split the remaining area into smaller
   * rectangles (4 at max).
   *
   * @private
   * @param {Rectangle} rect
   * @param {Rectangle} hole
   * returns {Rectangle[]}
   */
  function splitRectWithRect(rect, hole) {

    var ret;

    // If the rect does not overlap with the hole add rect to the return data as
    // is.
    if (!doRectsOverlap(rect, hole)) {
      return [{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }];
    }

    ret = [];

    // Left split.
    if (rect.left < hole.left) {
      ret[ret.length] = {
        left: rect.left,
        top: rect.top,
        width: hole.left - rect.left,
        height: rect.height
      };
    }

    // Right split.
    if ((rect.left + rect.width) > (hole.left + hole.width)) {
      ret[ret.length] = {
        left: hole.left + hole.width,
        top: rect.top,
        width: (rect.left + rect.width) - (hole.left + hole.width),
        height: rect.height
      };
    }

    // Top split.
    if (rect.top < hole.top) {
      ret[ret.length] = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: hole.top - rect.top
      };
    }

    // Bottom split.
    if ((rect.top + rect.height) > (hole.top + hole.height)) {
      ret[ret.length] = {
        left: rect.left,
        top: hole.top + hole.height,
        width: rect.width,
        height: (rect.top + rect.height) - (hole.top + hole.height)
      };
    }

    return ret;

  }

  /**
   * Compare a rectangle to multiple other rectangles and split the first
   * rectangle into smaller pieces.
   *
   * @private
   * @param {Rectangle} rect
   * @param {Rectangle[]} holes
   * returns {Rectangle[]}
   */
  function splitRectWithRects(rect, holes) {

    // If there are no holes, let's return the rect back as is.
    if (!holes.length) {
      return [rect];
    }

    var slices = splitRectWithRect(rect, holes[0]);
    var tempSlices;
    var i;
    var ii;

    // Slice and dice.
    for (i = 1; i < holes.length; i++) {
      tempSlices = [];
      for (ii = 0; ii < slices.length; ii++) {
        tempSlices = tempSlices.concat(splitRectWithRect(slices[ii], holes[i]));
      }
      slices = tempSlices;
    }

    return slices;

  }

  /**
   * Compare a rectangle to multiple other rectangles and split the first
   * rectangle into smaller pieces. Then filter out the largest piece and return
   * it. Returns null if the holes cover the rect fully.
   *
   * @private
   * @param {Rectangle} rect
   * @param {Rectangle[]} holes
   * returns {?Rectangle}
   */
  function getLargestRectSlice(rect, holes) {

    var slices = splitRectWithRects(rect, holes);
    var ret = slices[0] || null;
    var i;

    if (slices.length < 2) {
      return ret;
    }

    for (i = 1; i < slices.length; i++) {
      if ((slices[i].width * slices[i].height) > (ret.width * ret.height)) {
        ret = slices[i];
      }
    }

    return ret;

  }

  /**
   * Compare a rectangle to another and make the first rectangle fit inside the
   * other rectangle. Assumes that the rectangles are overlapping.
   *
   * @private
   * @param {Rectangle} rect
   * @param {Rectangle} crop
   * returns {Rectangle}
   */
  function cropRect(rect, crop) {

    var ret = {};

    ret.left = Math.max(rect.left, crop.left);
    ret.top = Math.max(rect.top, crop.top);
    ret.width = Math.min(rect.left + rect.width, crop.left + crop.width) - ret.left;
    ret.height = Math.min(rect.top + rect.height, crop.top + crop.height) - ret.top;

    return ret;

  }

  /**
   * Loops through an array of rectangles and removes all that are fully within
   * another rectangle in the array.
   *
   * @private
   * @param {Rectangle[]} rects
   * @returns {Rectangle[]}
   */
  function purgeRects(rects) {

    var i = rects.length;
    var ii;
    var rectA;
    var rectB;

    while (i--) {
      rectA = rects[i];
      ii = rects.length;
      while (ii--) {
        rectB = rects[ii];
        if (i !== ii && isRectWithinRect(rectA, rectB)) {
          rects.splice(i, 1);
          break;
        }
      }
    }

    return rects;

  }

  /**
   * Calculate how many percent the intersection area of two rectangles is from
   * the maximum potential intersection area between the rectangles.
   *
   * @private
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Number}
   *   - A number between 0-100.
   */
  function getRectOverlapScore(a, b) {

    // Return 0 immediately if the rectangles do not overlap.
    if (!doRectsOverlap(a, b)) {
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
   * Helpers - Item sort utilities
   * *****************************
   */

  /**
   * Helper for the sort method to generate mapped version of the items array
   * than contains reference to the item indices.
   *
   * @private
   * @param {Item[]} items
   * @returns {Object}
   */
  function getItemIndexMap(items) {

    var ret = {};
    var i;

    for (i = 0; i < items.length; i++) {
      ret[items[i]._id] = i;
    }

    return ret;

  }

  /**
   * Helper for the sort method to compare the indices of the items to enforce
   * stable sort.
   *
   * @private
   * @param {Item} itemA
   * @param {Item} itemB
   * @param {Boolean} isDescending
   * @param {Object} indexMap
   * @returns {Number}
   */
  function compareItemIndices(itemA, itemB, isDescending, indexMap) {

    var indexA = indexMap[itemA._id];
    var indexB = indexMap[itemB._id];
    return isDescending ? indexB - indexA : indexA - indexB;

  }

  /**
   * Helper for the sort method to compare the items based on the provided
   * attributes.
   *
   * @private
   * @param {Item} itemA
   * @param {Item} itemB
   * @param {Boolean} isDescending
   * @param {Object} criterias
   * @returns {Number}
   */
  function compareItems(itemA, itemB, isDescending, criterias) {

    var ret = 0;
    var criteriaName;
    var criteriaOrder;
    var valA;
    var valB;
    var i;

    // Loop through the list of sort criterias.
    for (i = 0; i < criterias.length; i++) {

      // Get the criteria name, which should match an item's sort data key.
      criteriaName = criterias[i][0];
      criteriaOrder = criterias[i][1];

      // Get items' cached sort values for the criteria. If the item has no sort
      // data let's update the items sort data (this is a lazy load mechanism).
      valA = (itemA._sortData ? itemA : itemA._updateSortData())._sortData[criteriaName];
      valB = (itemB._sortData ? itemB : itemB._updateSortData())._sortData[criteriaName];

      // Sort the items in descending order if defined so explicitly.
      if (criteriaOrder === 'desc' || (!criteriaOrder && isDescending)) {
        ret = valB < valA ? -1 : valB > valA ? 1 : 0;
      }

      // Otherwise sort items in ascending order.
      else {
        ret = valA < valB ? -1 : valA > valB ? 1 : 0;
      }

      // If we have -1 or 1 as the return value, let's return it immediately.
      if (ret !== 0) {
        return ret;
      }

    }

    return ret;

  }

  /**
   * Helpers - Muuri
   * ***************
   */

  /**
   * Update the cached dimensions and offsets of the Grid instance's container
   * element.
   *
   * @private
   * @memberof Grid.prototype
   * @param {Grid} inst
   * @param {GridDimensionQuery} [dimensions]
   */
  function updateGridDimensions(inst, dimensions) {

    var element = inst._element;
    var sides = ['left', 'right', 'top', 'bottom'];
    var update = {
      'width': !dimensions,
      'height': !dimensions,
      'offset': !dimensions,
      'padding': !dimensions,
      'border': !dimensions,
      'box-sizing': !dimensions
    };
    var rect;
    var i;

    // If we have dimensions, let's set the needed updates to true.
    if (dimensions) {
      dimensions = [].concat(dimensions);
      for (i = 0; i < dimensions.length; i++) {
        update[dimensions[i]] = true;
      }
    }

    // Get bounding client rect if needed.
    if (update.width || update.height || update.offset) {
      rect = element.getBoundingClientRect();
    }

    // Update width.
    if (update.width) {
      inst._width = Math.round(rect.width);
    }

    // Update height.
    if (update.height) {
      inst._height = Math.round(rect.height);
    }

    // Update offset.
    if (update.offset) {
      inst._offset = inst._offset || {};
      inst._offset.left = Math.round(rect.left);
      inst._offset.top = Math.round(rect.top);
    }

    // Update paddings.
    if (update.padding) {
      inst._padding = inst._padding || {};
      for (i = 0; i < sides.length; i++) {
        inst._padding[sides[i]] = Math.round(getStyleAsFloat(element, 'padding-' + sides[i]));
      }
    }

    // Update borders.
    if (update.border) {
      inst._border = inst._border || {};
      for (i = 0; i < sides.length; i++) {
        inst._border[sides[i]] = Math.round(getStyleAsFloat(element, 'border-' + sides[i] + '-width'));
      }
    }

    // Update box-sizing.
    if (update['box-sizing']) {
      inst._boxSizing = getStyle(element, 'box-sizing');
    }

  }

  /**
   * Update the dimensions of the Grid instance's items.
   *
   * @private
   * @param {Grid} inst
   * @param {(GridMultiItemQuery|GridItemState)} [items]
   */
  function updateItemDimensions(inst, items) {

    var targetItems = inst.getItems(items || 'active');
    var i;

    for (i = 0; i < targetItems.length; i++) {
      targetItems[i]._updateDimensions();
    }

  }

  /**
   * Show or hide Grid instance's items.
   *
   * @private
   * @param {Grid} inst
   * @param {String} method - "show" or "hide".
   * @param {(GridMultiItemQuery|GridItemState)} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {Function} [options.onFinish]
   * @param {(Boolean|Function|String)} [options.layout=true]
   * @returns {Grid}
   */
  function setVisibility(inst, method, items, options) {

    var targetItems = inst.getItems(items);
    var opts = options || {};
    var isInstant = opts.instant === true;
    var callback = opts.onFinish;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var counter = targetItems.length;
    var isShow = method === 'show';
    var startEvent = isShow ? evShowStart : evHideStart;
    var endEvent = isShow ? evShowEnd : evHideEnd;
    var needsLayout = false;
    var validItems = [];
    var completedItems = [];
    var hiddenItems = [];
    var item;
    var i;

    // Get valid items -> filter out items which will not be affected by this
    // method at their current state.
    for (i = 0; i < targetItems.length; i++) {
      item = targetItems[i];
      // Omg... this is a monster. No liner like one-liner.
      if (isShow ? (item._isHidden || item._isHiding || (item._isShowing && isInstant)) : (!item.isHidden || item._isShowing || (item._isHiding && isInstant))) {
        validItems[validItems.length] = item;
      }
    }

    // Set up counter based on valid items.
    counter = validItems.length;

    // If there are no items call the callback, but don't emit any events.
    if (!counter) {
      if (typeof callback === 'function') {
        callback(validItems);
      }
    }

    // Otherwise if we have some items let's dig in.
    else {

      // Emit showStart/hideStart event.
      inst._emitter.emit(startEvent, validItems.concat());

      // Show/hide items.
      for (i = 0; i < validItems.length; i++) {

        item = validItems[i];

        // If inactive item is shown or active item is hidden we need to do
        // layout.
        if ((isShow && !item._isActive) || (!isShow && item._isActive)) {
          needsLayout = true;
        }

        // If inactive item is shown we also need to do some special hackery to
        // make the item not animate it's next positioning (layout). Without the
        // skipNextLayoutAnimation flag the item would animate to it's place
        // from the northwest corner of the grid, which (imho) has a buggy vibe
        // to it. Also we are adding the item to the hidden items list here,
        // which means that it's dimensions will be updated just before the
        // layout.
        if (isShow && !item._isActive) {
          item._skipNextLayoutAnimation = true;
          hiddenItems[hiddenItems.length] = item;
        }

        // Show/hide the item.
        item['_' + method](isInstant, function (interrupted, item) {

          // If the current item's animation was not interrupted add it to the
          // completedItems array.
          if (!interrupted) {
            completedItems[completedItems.length] = item;
          }

          // If all items have finished their animations call the callback
          // and emit showEnd/hideEnd event.
          if (--counter < 1) {
            if (typeof callback === 'function') {
              callback(completedItems.concat());
            }
            inst._emitter.emit(endEvent, completedItems.concat());
          }

        });

      }

      // Layout if needed.
      if (needsLayout) {
        if (hiddenItems.length) {
          inst.updateDimensions('items', hiddenItems);
        }
        if (layout) {
          inst.layout(layout === 'instant', typeof layout === 'function' ? layout : undefined);
        }
      }

    }

    return inst;

  }

  /**
   * Returns an object which contains start and stop methods for item's
   * show/hide process.
   *
   * @param {String} type
   * @param {?Object} [opts]
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
      start: function (item, instant, animDone) {

        var animateOpts;

        if (!isEnabled || !styles) {
          if (animDone) {
            animDone();
          }
        }
        else if (instant) {

          if (item._isDefaultChildAnimate) {
            hookStyles(item._child, styles);
          }
          else {
            setStyles(item._child, styles);
          }

          if (animDone) {
            animDone();
          }

        }
        else {

          animateOpts = {
            duration: duration,
            easing: easing,
            done: animDone
          };

          if (item._isDefaultChildAnimate) {
            item._animateChild.start(null, styles, animateOpts);
          }
          else {
            item._animateChild.start(styles, animateOpts);
          }

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
   * @param {Function[]} queue
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
   * Check if item is in specific state.
   *
   * @private
   * @param {Item} item
   * @param {GridItemState} state
   * Returns {Boolean}
   */
  function isItemInState(item, state) {

    return state === 'active' ? item._isActive :
      state === 'inactive' ? !item._isActive :
      state === 'visible' ? !item._isHiding :
      state === 'hidden' ? item._isHiding :
      state === 'showing' ? item._isShowing :
      state === 'hiding' ? item._isHiding :
      state === 'positioning' ? item._isPositioning :
      state === 'dragging' ? item._drag && item._drag._dragData.isActive :
      state === 'releasing' ? item._drag && item._drag._releaseData.isActive :
      state === 'migrating' ? item._migrate.isActive :
      false;

  }

  /**
   * Prevent default.
   *
   * @private
   * @param {Object} e
   */
  function preventDefault(e) {

    if (e.preventDefault) {
      e.preventDefault();
    }

  }

  /**
   * Sanitizes styles definition object within settings. Basically just removes
   * all properties that have a value of null or undefined.
   *
   * @private
   * @param {Object} styles
   * @returns {Object} Returns a new object.
   */
  function sanitizeStyleSettings(styles) {

    var ret = {};

    Object.keys(styles).forEach(function (prop) {
      var val = styles[prop];
      if (val !== undefined && val !== null) {
        ret[prop] = val;
      }
    });

    return ret;

  }

  /**
   * Merge default settings with user settings. The returned object is a new
   * object with merged values. The merging is a deep merge meaning that all
   * objects and arrays within the provided settings objects will be also merged
   * so that modifying the values of the settings object will have no effect on
   * the returned object.
   *
   * @private
   * @param {Object} defaultSettings
   * @param {Object} [userSettings]
   * @returns {Object} Returns a new object.
   */
  function mergeSettings(defaultSettings, userSettings) {

    // Create a fresh copy of default settings.
    var ret = mergeObjects({}, defaultSettings);

    // Merge user settings to default settings.
    ret = userSettings ? mergeObjects(ret, userSettings) : ret;

    // Sanitize show styles (if they exist).
    if (ret.show && ret.show.styles) {
      ret.show.styles = sanitizeStyleSettings(ret.show.styles);
    }

    // Sanitize hide styles (if they exist).
    if (ret.hide && ret.hide.styles) {
      ret.hide.styles = sanitizeStyleSettings(ret.hide.styles);
    }

    return ret;

  }

  /**
   * Nullify an instance's own and prototype properties.
   *
   * @private
   * @param {Object} instance
   * @param {Object} Constructor
   */
  function nullifyInstance(instance, Constructor) {

    var props = Object.keys(instance).concat(Object.keys(Constructor.prototype));
    var i;

    for (i = 0; i < props.length; i++) {
      instance[props[i]] = null;
    }

  }

  /**
   * Type defintions
   * ***************
   */

  /**
   * The grid's width, height, padding and border dimensions.
   *
   * @typedef {Object} GridDimensions
   * @property {Number} width
   * @property {Number} height
   * @property {Object} padding
   * @property {Number} padding.left
   * @property {Number} padding.right
   * @property {Number} padding.top
   * @property {Number} padding.bottom
   * @property {Object} border
   * @property {Number} border.left
   * @property {Number} border.right
   * @property {Number} border.top
   * @property {Number} border.bottom
   */

  /**
   * The values by which multiple grid items can be queried. An html element or
   * an array of HTML elements. Item or an array of items. Node list, live or
   * static. Number (index) or a list of numbers (indices).
   *
   * @typedef {(HTMLElement|HTMLElement[]|Item|Item[]|NodeList|Number|Number[])} GridMultiItemQuery
   */

  /**
   * The values by which a single grid item can be queried. An html element, an
   * item instance or a number (index).
   *
   * @typedef {(HTMLElement|Item|Number)} GridSingleItemQuery
   */

  /**
   * The grid item's state, a string. Accepted values are: "active", "inactive",
   * "visible", "hidden", "showing", "hiding", "positioning", "dragging",
   * "releasing" and "migrating".
   *
   * @typedef {String} GridItemState
   */

  /**
   * Grid element's cached dimensions. Accepted values are: "width", "height",
   * "offset", "padding", "border", "box-sizing".
   *
   * @typedef {(String|String[])} GridDimensionQuery
   */

  /**
   * The data that is required to orchestrate a sort action during drag.
   *
   * @typedef {Object} DragSortCommand
   * @param {String} action
   *   - "move" or "swap".
   * @param {Number} index
   *   - target index.
   * @param {?Grid} [grid=null]
   *   - target grid.
   */

  /**
   * A rectangle is an object with width, height and offset (left and top) data.
   *
   * @typedef {Object} Rectangle
   * @property {Number} width
   * @property {Number} height
   * @property {Number} left
   * @property {Number} top
   */

  /**
   * Init
   */

  return Grid;

}));
