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
* [x] Simpler dragStartPredicate system.
* [x] Smarter default dragStartPredicate that's aware of links.
* [x] Allow document.body being a container.
* [x] Destroying the instance causes weird scenarios sometimes. Think through
      the usage flow and find a way to handle it. How is destroy managed in
      other libs?
* [x] Update layout callback/end event logic.
* [x] Document all public callbacks within the type definitions section.
* [x] Refactor release process:
      * [x] Separate release process drag process.
      * [x] Merge dragReceiveDrop into releaseStart.
* [x] Is item.isMigrating() really needed? Nope.
* [x] Consider merging dragSort event to move event. Done.
* [x] Consider merging dragSend event to send event. Done.
* [x] Consider merging dragReceive event to receive event. Done.
* [x] Consider renaming dragSortConnections -> dragSortWith
* [x] add .once() method for triggering a listener only once.
* [x] Consider refactoring the show/hide options into their separate options:
      showDuration/hideDuration, showEasing/hideEasing and showStyles/
      hideStyles. Having a totally custom show/hideanimation should probably be
      a hidden feature behind an undocumented option.
* [x] Allow dragSortWith to be a string for single value.
* [ ] Consider adding some configurable properties to the default drag start
      predicate. If we would have handle(s) option it would make building
      nested grids much easier.
* [ ] Allow nested Muuri instances or add a warning to documentation that nested
      instances are not supported. Is there actually anything preventing this?
      The practical use case for this would be a kanban board where the columns
      themselves and their items would be draggable. Let's try to make this work
      if there are any issues with it.

Optional optimization for v0.3.x
================================
* [ ] Streamline codebase by trying to combine similar functions and methods
      into smaller reusable functions. Goal is less than 10kb when minified and
      gzipped.
* [ ] Add container offset diff mechanism to the item itself so it can be
      utilized by drag and migrate operations. Just to keep the code DRY and
      clearer.
* [ ] When a grid has one or more items being dragged set it in a mode where it
      listens it's scroll containers for scroll events and marks the offset as
      "dirty". When checking overlap update the offset only for the "dirty"
      containers. This way we reduce the calling of gbcr to the minimum. Also
      whenever dragging is started all connected grids should get their offset
      updated. The offset is only required for the dragging operation.
* [ ] Optimize the current layout system to work faster if all items are
      the same size.
* [ ] Don't call layout if nothing has changed. Create a system for checking
      this. Try to keep it fast, just a simple dirty check.
* [ ] Refactor the layout algorithm so that we don't need to do the extra
      looping of the items in the end if the algorithm mode is alignRight or
      alignBottom.
* [ ] Memory leak tests.

New features for v0.4.x
=======================
* [ ] Allow defining "stamps" (holes) in the layout.
* [ ] Allow moving and sending batches of items with move and send methods.
* [ ] Drag placeholder.
* [ ] Scroll while dragging.
* [ ] dragAxis: If defined, the items can be dragged only horizontally or
      vertically. Possible values: "x", "y". (Idea nicked from jQuery UI
      Sortable).
* [ ] dragContainement: Defines a bounding box that the sortable items are
      constrained to while dragging. (Idea nicked from jQuery UI Sortable).

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

    Velocity = global.Velocity || global.jQuery.Velocity;
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

  // Types.
  var typeFunction = 'function';
  var typeString = 'string';
  var typeNumber = 'number';

  // Keep track of Grid instances.
  var gridInstances = {};

  // Keep track of Item instances.
  var itemInstances = {};

  // Keep track of the drag sort groups.
  var sortGroups = {};

  // No operation function.
  var noop = function () {};

  // Unique id which is used for Grid instances and Item instances.
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
  var evReceive = 'receive';
  var evDragStart = 'dragStart';
  var evDragMove = 'dragMove';
  var evDragScroll = 'dragScroll';
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
   * @param {?Function} [options.showAnimation=null]
   * @param {Number} [options.showDuration=300]
   * @param {(Number[]|String)} [options.showEasing="ease"]
   * @param {Object} [options.visibleStyles]
   * @param {?Function} [options.hideAnimation=null]
   * @param {Number} [options.hideDuration=300]
   * @param {(Number[]|String)} [options.hideEasing="ease"]
   * @param {Object} [options.hiddenStyles]
   * @param {(Function|Object)} [options.layout]
   * @param {Boolean} [options.layout.fillGaps=false]
   * @param {Boolean} [options.layout.horizontal=false]
   * @param {Boolean} [options.layout.alignRight=false]
   * @param {Boolean} [options.layout.alignBottom=false]
   * @param {(Boolean|Number)} [options.layoutOnResize=100]
   * @param {Boolean} [options.layoutOnInit=true]
   * @param {Number} [options.layoutDuration=300]
   * @param {(Number[]|String)} [options.layoutEasing="ease"]
   * @param {?Object} [options.sortData=null]
   * @param {Boolean} [options.dragEnabled=false]
   * @param {?HtmlElement} [options.dragContainer=null]
   * @param {?Function} [options.dragStartPredicate=null]
   * @param {Boolean} [options.dragSort=true]
   * @param {Number} [options.dragSortInterval=50]
   * @param {(?Function|Object)} [options.dragSortPredicate]
   * @param {Number} [options.dragSortPredicate.threshold=50]
   * @param {String} [options.dragSortPredicate.action="move"]
   * @param {String} [options.dragSortPredicate.gaps=true]
   * @param {?String} [options.dragSortGroup=null]
   * @param {?(Array|String)} [options.dragSortWith=null]
   * @param {Number} [options.dragReleaseDuration=300]
   * @param {(Number[]|String)} [options.dragReleaseEasing="ease"]
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
    var layoutOnResize;

    // Allow passing element as selector string. Store element for instance.
    element = inst._element = typeof element === typeString ? document.querySelectorAll(element)[0] : element;

    // Throw an error if the container element is not body element or does not
    // exist within the body element.
    if (!document.body.contains(element)) {
      throw new Error('Container element must be an existing DOM element');
    }

    // Create instance settings by merging the options with default options.
    settings = inst._settings = mergeSettings(Grid.defaultOptions, options);

    // Create instance id and store it to the grid instances collection.
    inst._id = ++uuid;
    gridInstances[inst._id] = inst;

    // Destroyed flag.
    inst._isDestroyed = false;

    // Reference to the currently used Layout instance.
    inst._layout = null;

    // Create private Emitter instance.
    inst._emitter = new Grid.Emitter();

    // Setup instance's sort group.
    inst._setSortGroup(settings.dragSortGroup);

    // Setup instance's sort connections.
    inst._sortConnections = settings.dragSortWith && settings.dragSortWith.length ? [].concat(settings.dragSortWith) : null;

    // Setup show and hide animations for items.
    inst._itemShowHandler = typeof settings.showAnimation === typeFunction ? settings.showAnimation(settings.showDuration, settings.showEasing, settings.visibleStyles) :
                            getItemVisibilityHandler('show', settings.showDuration, settings.showEasing, settings.visibleStyles);
    inst._itemHideHandler = typeof settings.hideAnimation === typeFunction ? settings.hideAnimation(settings.hideDuration, settings.hideEasing, settings.hiddenStyles) :
                            getItemVisibilityHandler('hide', settings.hideDuration, settings.hideEasing, settings.hiddenStyles);

    // Add container element's class name.
    addClass(element, settings.containerClass);

    // Calculate container element's initial dimensions and offset.
    inst.refreshContainer();

    // Create initial items.
    inst._items = [];
    items = settings.items;
    if (typeof items === typeString) {
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

    // Sanitize layoutOnResize option and bind debounced resize handler if the
    // layoutOnResize option a valid number.
    layoutOnResize = settings.layoutOnResize;
    layoutOnResize = layoutOnResize === true ? 0 : typeof layoutOnResize === typeNumber ? layoutOnResize : -1;
    if (layoutOnResize >= 0) {
      debouncedLayout = debounce(function () {
        inst.refreshContainer().refreshItems().layout();
      }, layoutOnResize);
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
   * @see Release
   */
  Grid.Release = Release;

  /**
   * @see Release
   */
  Grid.Migrate = Migrate;

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

    // Default show animation
    showDuration: 300,
    showEasing: 'ease',

    // Default hide animation
    hideDuration: 300,
    hideEasing: 'ease',

    // Custom show/hide animations
    showAnimation: null,
    hideAnimation: null,

    // Item's visible/hidden state styles
    visibleStyles: {
      opacity: 1,
      scale: 1
    },
    hiddenStyles: {
      opacity: 0,
      scale: 0.5
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
    dragSortWith: null,
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

    if (!this._isDestroyed) {
      this._emitter.on(event, listener);
    }

    return this;

  };

  /**
   * Bind an event listener that is triggered only once.
   *
   * @public
   * @memberof Grid.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Grid}
   */
  Grid.prototype.once = function (event, listener) {

    if (!this._isDestroyed) {
      this._emitter.once(event, listener);
    }

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

    if (!this._isDestroyed) {
      this._emitter.off(event, listener);
    }

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
   * layout or refresh method is called. Note that all returned values are
   * rounded.
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
    var hasTargets = targets === 0 || (targets && typeof targets !== typeString);
    var targetItems = !hasTargets ? null : isNodeList(targets) ? nodeListToArray(targets) : [].concat(targets);
    var targetState = !hasTargets ? targets : state;
    var ret = [];
    var item;
    var i;

    // Return an empty array immediately if the instance is destroyed.
    if (inst._isDestroyed) {
      return ret;
    }

    // Sanitize target state.
    targetState = typeof targetState === typeString ? targetState : null;

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
   * Refresh the cached dimensions and styles of the container element.
   *
   * @public
   * @memberof Grid.prototype
   * @returns {Grid}
   */
  Grid.prototype.refreshContainer = function () {

    var inst = this;
    var element;
    var sides;
    var rect;
    var i;

    // Return immediately if the instance is destroyed.
    if (inst._isDestroyed) {
      return inst;
    }

    // Get some data.
    element = inst._element;
    sides = ['left', 'right', 'top', 'bottom'];
    rect = element.getBoundingClientRect();

    // Update width, height, offsets and box sizing.
    inst._width = Math.round(rect.width);
    inst._height = Math.round(rect.height);
    inst._offset = inst._offset || {};
    inst._offset.left = Math.round(rect.left);
    inst._offset.top = Math.round(rect.top);
    inst._boxSizing = getStyle(element, 'box-sizing');

    // Update paddings.
    inst._padding = inst._padding || {};
    for (i = 0; i < sides.length; i++) {
      inst._padding[sides[i]] = Math.round(getStyleAsFloat(element, 'padding-' + sides[i]));
    }

    // Update borders.
    inst._border = inst._border || {};
    for (i = 0; i < sides.length; i++) {
      inst._border[sides[i]] = Math.round(getStyleAsFloat(element, 'border-' + sides[i] + '-width'));
    }

    return inst;

  };

  /**
   * Update the cached dimensions of the instance's items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(GridMultiItemQuery|GridItemState)} [items]
   * @returns {Grid}
   */
  Grid.prototype.refreshItems = function (items) {

    var inst = this;
    var targetItems;
    var i;

    if (!inst._isDestroyed) {
      targetItems = inst.getItems(items || 'active');
      for (i = 0; i < targetItems.length; i++) {
        targetItems[i]._refreshDimensions();
      }
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
  Grid.prototype.refreshSortData = function (items) {

    var inst = this;
    var targetItems;
    var i;

    if (!inst._isDestroyed) {
      targetItems = inst.getItems(items);
      for (i = 0; i < targetItems.length; i++) {
        targetItems[i]._refreshSortData();
      }
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

    // Return immediately if instance is destroyed.
    if (inst._isDestroyed) {
      return inst;
    }

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
    inst._emit(evSynchronize);

    return inst;

  };

  /**
   * Calculate and apply item positions.
   *
   * @public
   * @memberof Grid.prototype
   * @param {Boolean} [instant=false]
   * @param {LayoutCallback} [onFinish]
   * @returns {Grid}
   */
  Grid.prototype.layout = function (instant, onFinish) {

    var inst = this;
    var callback = typeof instant === typeFunction ? instant : onFinish;
    var isInstant = instant === true;
    var counter = 0;
    var layout;
    var items;
    var padding;
    var border;
    var isBorderBox;
    var item;
    var position;
    var rect;
    var i;

    // Return immediately if instance is destroyed.
    if (inst._isDestroyed) {
      return inst;
    }

    // The finish function, which will be used for checking if all the items
    // have laid out yet. After all items have finished their animations call
    // callback and emit layoutEnd event. Only emit layoutEnd event if there
    // hasn't been a new layout call during this layout.
    function tryFinish() {
      if (--counter <= 0) {
        if (typeof callback === typeFunction) {
          callback(inst._layout !== layout, items.concat());
        }
        if (inst._layout === layout) {
          inst._emit(evLayoutEnd, items.concat());
        }
      }
    }

    // Create a new layout and store the new layout instance into the grid
    // instance.
    layout = inst._layout = new Grid.Layout(inst);
    items = layout.items.concat();
    counter = items.length;

    // Emit layoutStart event.
    inst._emit(evLayoutStart, items.concat());

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

      // Update grid's width and height to account for the possible
      // min/max-width/height.
      rect = inst._element.getBoundingClientRect();
      inst._width = Math.round(rect.width);
      inst._height = Math.round(rect.height);

    }

    // If there are no items let's finish quickly.
    if (!items.length) {
      tryFinish();
      return inst;
    }

    // If there are items let's position them.
    for (i = 0; i < items.length; i++) {

      item = items[i];
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
      if (item.isDragging()) {
        tryFinish(true, item);
      }
      else {
        item._layout(isInstant, tryFinish);
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
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
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

    // Return immediately if the instance is destroyed.
    if (inst._isDestroyed) {
      return [];
    }

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
    inst._emit(evAdd, newItems.concat());

    // If layout is needed.
    if (needsLayout && layout) {
      inst.layout(layout === 'instant', typeof layout === typeFunction ? layout : undefined);
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
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Item[]}
   */
  Grid.prototype.remove = function (items, options) {

    var inst = this;
    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var needsLayout = false;
    var targetItems;
    var item;
    var i;

    // Return immediately if the instance is destroyed.
    if (inst._isDestroyed) {
      return [];
    }

    // Remove the individual items.
    targetItems = inst.getItems(items);
    for (i = 0; i < targetItems.length; i++) {
      item = targetItems[i];
      if (item._isActive) {
        needsLayout = true;
      }
      item._destroy(opts.removeElements);
    }

    // Emit remove event.
    inst._emit(evRemove, targetItems.concat());

    // If layout is needed.
    if (needsLayout && layout) {
      inst.layout(layout === 'instant', typeof layout === typeFunction ? layout : undefined);
    }

    return targetItems;

  };

  /**
   * Show instance items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(GridMultiItemQuery|GridItemState)} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {ShowCallback} [options.onFinish]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.show = function (items, options) {

    return this._isDestroyed ? this : gridShowHideHandler(this, 'show', items, options);

  };

  /**
   * Hide instance items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(GridMultiItemQuery|GridItemState)} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {HideCallback} [options.onFinish]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.hide = function (items, options) {

    return this._isDestroyed ? this : gridShowHideHandler(this, 'hide', items, options);

  };

  /**
   * Filter items. Expects at least one argument, a predicate, which should be
   * either a function or a string. The predicate callback is executed for every
   * item in the instance. If the return value of the predicate is truthy the
   * item in question will be shown and otherwise hidden. The predicate callback
   * receives the item instance as it's argument. If the predicate is a string
   * it is considered to be a selector and it is checked against every item
   * element in the instance with the native element.matches() method. All the
   * matching items will be shown and others hidden.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(Function|String)} predicate
   * @oaram {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {FilterCallback} [options.onFinish]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.filter = function (predicate, options) {

    var inst = this;
    var items = inst._items;
    var predicateType = typeof predicate;
    var isPredicateString = predicateType === typeString;
    var isPredicateFn = predicateType === typeFunction;
    var opts = options || {};
    var isInstant = opts.instant === true;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var onFinish = typeof opts.onFinish === typeFunction ? opts.onFinish : null;
    var itemsToShow = [];
    var itemsToHide = [];
    var tryFinishCounter = -1;
    var tryFinish;
    var item;
    var i;

    // Return immediately if there are no items or if the instance id destroyed.
    if (inst._isDestroyed || !items.length) {
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
        if (isPredicateFn ? predicate(item) : elementMatches(item._element, predicate)) {
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
      inst._emit(evFilter, itemsToShow.concat(), itemsToHide.concat());

      // If layout is needed.
      if (layout) {
        inst.layout(layout === 'instant', typeof layout === typeFunction ? layout : undefined);
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
   * @param {(Function|Item[]|String|String[])} comparer
   * @param {Object} [options]
   * @param {Boolean} [options.descending=false]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
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
    if (inst._isDestroyed || items.length < 2) {
      return inst;
    }

    // Clone current set of items for the event.
    origItems = items.concat();

    // If function is provided do a native array sort.
    if (typeof comparer === typeFunction) {
      items.sort(function (a, b) {
        var result = comparer(a, b);
        return (isDescending && result !== 0 ? -result : result) || compareItemIndices(a, b, isDescending, indexMap || (indexMap = getItemIndexMap(origItems)));
      });
    }

    // Otherwise if we got a string, let's sort by the sort data as provided in
    // the instance's options.
    else if (typeof comparer === typeString) {
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
      sortItemsByReference(items, comparer);
      if (isDescending) {
        items.reverse();
      }
    }

    // Otherwise, let's go home.
    else {
      return inst;
    }

    // Emit sort event.
    inst._emit(evSort, items.concat(), origItems);

    // If layout is needed.
    if (layout) {
      inst.layout(layout === 'instant', typeof layout === typeFunction ? layout : undefined);
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
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.move = function (item, position, options) {

    var inst = this;
    var items = inst._items;
    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var isSwap = opts.action === 'swap';
    var action = isSwap ? 'swap' : 'move';
    var fromItem;
    var toItem;
    var fromIndex;
    var toIndex;

    // Return immediately, if moving an item is not possible.
    if (inst._isDestroyed || items.length < 2) {
      return inst;
    }

    fromItem = inst._getItem(item);
    toItem = inst._getItem(position);

    // Make sure the items exist and are not the same.
    if (fromItem && toItem && (fromItem !== toItem)) {

      // Get the indices of the items.
      fromIndex = items.indexOf(fromItem);
      toIndex = items.indexOf(toItem);

      // Do the move/swap.
      (isSwap ? arraySwap : arrayMove)(items, fromIndex, toIndex);

      // Emit move event.
      inst._emit(evMove, {
        item: fromItem,
        fromIndex: fromIndex,
        toIndex: toIndex,
        action: action
      });

      // If layout is needed.
      if (layout) {
        inst.layout(layout === 'instant', typeof layout === typeFunction ? layout : undefined);
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
   * @param {(Boolean|LayoutCallback|String)} [options.layoutSender=true]
   * @param {(Boolean|LayoutCallback|String)} [options.layoutReceiver=true]
   * @returns {Grid}
   */
  Grid.prototype.send = function (item, grid, position, options) {

    // Return immediately if either grid is destroyed or if the grids are the
    // same.
    if (this._isDestroyed || grid._isDestroyed || this === grid) {
      return this;
    }

    var currentGrid = this;
    var targetGrid = grid;
    var opts = options || {};
    var container = opts.appendTo || document.body;
    var layoutSender = opts.layoutSender ? opts.layoutSender : opts.layoutSender === undefined;
    var layoutReceiver = opts.layoutReceiver ? opts.layoutReceiver : opts.layoutReceiver === undefined;

    // Get the target item.
    item = currentGrid._getItem(item);

    // If no valid item was found, let's stop here.
    if (!item) {
      return currentGrid;
    }

    // Start the migration process.
    item._migrate.start(targetGrid, position, container);

    // If migration was started succesfully and the item is active, let's layout
    // the grids.
    if (item._migrate.isActive && item.isActive()) {
      if (layoutSender) {
        currentGrid.layout(layoutSender === 'instant', typeof layoutSender === typeFunction ? layoutSender : undefined);
      }
      if (layoutReceiver) {
        targetGrid.layout(layoutReceiver === 'instant', typeof layoutReceiver === typeFunction ? layoutReceiver : undefined);
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
   * @returns {Grid}
   */
  Grid.prototype.destroy = function (removeElements) {

    var inst = this;
    var container = inst._element;
    var items = inst._items.concat();
    var i;

    // Return immediately if the instance is destroyed.
    if (inst._isDestroyed) {
      return inst;
    }

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
    inst._emit(evDestroy);
    inst._emitter.destroy();

    // Remove reference from the grid instances collection.
    gridInstances[inst._id] = undefined;

    // Flag instance as destroyed.
    inst._isDestroyed = true;

    return inst;

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

    // If no target is specified or the instance is destroyed, return the first
    // item or null.
    if (inst._isDestroyed || !target) {
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
    else if (typeof target === typeNumber) {
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
   * @protected
   * @memberof Grid.prototype
   * @param {String} event
   * @param {*} [arg1]
   * @param {*} [arg2]
   * @param {*} [arg3]
   * @returns {Grid}
   */
  Grid.prototype._emit = function () {

    if (!this._isDestroyed) {
      this._emitter.emit.apply(this._emitter, arguments);
    }

    return this;

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
    if (sortGroup && typeof sortGroup === typeString) {
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

    if (inst._isDestroyed) {
      return ret;
    }

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

    // Destroyed flag.
    inst._isDestroyed = false;

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
    setStyles(element, {
      left: '0',
      top: '0',
      transform: 'translateX(0px) translateY(0px)',
      display: isHidden ? 'none' : 'block'
    });

    // Set up the initial dimensions and sort data.
    inst._refreshDimensions()._refreshSortData();

    // Set initial styles for the child element.
    if (isHidden) {
      grid._itemHideHandler.start(inst, true);
    }
    else {
      grid._itemShowHandler.start(inst, true);
    }

    // Set up migration handler data.
    inst._migrate = new Grid.Migrate(inst);

    // Set up release handler
    inst._release = new Grid.Release(inst);

    // Set up drag handler.
    inst._drag = settings.dragEnabled ? new Grid.Drag(inst) : null;

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

    return !!this._drag && this._drag._data.isActive;

  };

  /**
   * Is the item being released?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isReleasing = function () {

    return this._release.isActive;

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

    if (inst._isDestroyed || !inst._isPositioning) {
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
  Item.prototype._refreshDimensions = function () {

    var inst = this;
    var element;
    var rect;
    var sides;
    var side;
    var margin;
    var i;

    if (inst._isDestroyed || inst._isHidden) {
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
  Item.prototype._refreshSortData = function () {

    var inst = this;
    var sortData;
    var getters;

    if (!inst._isDestroyed) {

      sortData = {};
      getters = inst.getGrid()._settings.sortData;

      // Fetch sort data.
      if (getters) {
        Object.keys(getters).forEach(function (key) {
          sortData[key] = getters[key](inst, inst._element);
        });
      }

      // Store sort data to the instance.
      inst._sortData = sortData;

    }

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
    var isPositioning = inst._isPositioning;
    var migrate = inst._migrate;
    var release = inst._release;
    var isJustReleased = release.isActive && release.isPositioningStarted === false;
    var grid;
    var settings;
    var animDuration;
    var animEasing;
    var animEnabled;
    var offsetLeft;
    var offsetTop;
    var currentLeft;
    var currentTop;
    var finishLayout;

    // Return immediately if the instance is destroyed.
    if (inst._isDestroyed) {
      return inst;
    }

    // Get grid and settings.
    grid = inst.getGrid();
    settings = grid._settings;
    animDuration = isJustReleased ? settings.dragReleaseDuration : settings.layoutDuration;
    animEasing = isJustReleased ? settings.dragReleaseEasing : settings.layoutEasing;
    animEnabled = !instant && !inst._skipNextLayoutAnimation && animDuration > 0;

    // Create the layout callback.
    finishLayout = function () {

      // Mark the item as not positioning and remove positioning classes.
      if (inst._isPositioning) {
        inst._isPositioning = false;
        removeClass(element, settings.itemPositioningClass);
      }

      // Finish up release.
      if (release.isActive) {
        release.stop();
      }

      // Finish up migration.
      if (migrate.isActive) {
        migrate.stop();
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
    if (typeof onFinish === typeFunction) {
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
      if (!(release.isActive && element.parentNode !== grid._element) || !(migrate.isActive && migrate.container !== grid._element)) {
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
    var callback = typeof onFinish === typeFunction ? onFinish : null;
    var grid;
    var settings;

    // Return immediately if the instance is destroyed.
    if (inst._isDestroyed) {
      return inst;
    }

    // Get grid and settings.
    grid = inst.getGrid();
    settings = grid._settings;

    // If item is showing.
    if (inst._isShowing) {

      // If instant flag is on, interrupt the current animation and set the
      // visible styles.
      if (instant) {
        grid._itemShowHandler.stop(inst);
        processQueue(queue, true, inst);
        if (callback) {
          queue[queue.length] = callback;
        }
        grid._itemShowHandler.start(inst, instant, function () {
          inst._isShowing = false;
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
        inst._isShowing = false;
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
    var callback = typeof onFinish === typeFunction ? onFinish : null;
    var grid;
    var settings;

    // Return immediately if the instance is destroyed.
    if (inst._isDestroyed) {
      return inst;
    }

    // Get grid and settings.
    grid = inst.getGrid();
    settings = grid._settings;

    // If item is hiding.
    if (inst._isHiding) {

      // If instant flag is on, interrupt the current animation and set the
      // hidden styles.
      if (instant) {
        grid._itemHideHandler.stop(inst);
        processQueue(queue, true, inst);
        if (callback) {
          queue[queue.length] = callback;
        }
        grid._itemHideHandler.start(inst, instant, function () {
          inst._isHiding = false;
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
      if (typeof callback === typeFunction) {
        queue[queue.length] = callback;
      }

      // Animate child element and process the visibility callback queue after
      // succesful animation.
      grid._itemHideHandler.start(inst, instant, function () {
        inst._isHiding = false;
        setStyles(element, {
          display: 'none'
        });
        processQueue(queue, false, inst);
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
   * @returns {Item}
   */
  Item.prototype._destroy = function (removeElement) {

    var inst = this;
    var element = inst._element;
    var grid;
    var settings;
    var index;

    // Return immediately if the instance is already destroyed.
    if (inst._isDestroyed) {
      return inst;
    }

    // Get grid and settings.
    grid = inst.getGrid();
    settings = grid._settings;
    index = grid._items.indexOf(inst);

    // Destroy release and migration.
    inst._release.destroy();
    inst._migrate.destroy();

    // Stop animations.
    inst._stopLayout(true);
    grid._itemShowHandler.stop(inst);
    grid._itemHideHandler.stop(inst);

    // Destroy drag.
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
    // TODO: Or should we just clear the visibility queue and not call the
    // callbacks?
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

    // Update item states (mostly just for good measure).
    inst._isActive = inst._isPositioning = inst._isHiding = inst._isShowing = false;
    inst._isDestroyed = inst._isHidden = true;

    return inst;

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

    // Sanitize items.
    items = items ? items.concat() : grid.getItems('active');

    var inst = this;
    var settings = grid._settings.layout;
    var padding = grid._padding;
    var border = grid._border;
    var width = grid._width - border.left - border.right - padding.left - padding.right;
    var height = grid._height - border.top - border.bottom - padding.top - padding.bottom;

    // Calculate the layout data. If the user has provided custom function as a
    // layout method invoke it. Otherwise invoke the default layout method.
    var layout = typeof settings === typeFunction ? settings(items, width, height) :
                 layoutDefault(items, width, height, isPlainObject(settings) ? settings : {});

    // Set instance data based on layout data.
    inst.items = items;
    inst.slots = layout.slots;
    inst.setWidth = layout.setWidth || false;
    inst.setHeight = layout.setHeight || false;
    inst.width = layout.width;
    inst.height = layout.height;

  }

  /**
   * Copyright (c) 2016 Niklas Rämö <inramo@gmail.com>
   * Released under the MIT license
   *
   * The default layout method.
   *
   * @private
   * @param {Item[]} items
   * @param {Number} width
   * @param {Number} height
   * @param {Object} options
   * @param {Boolean} [options.fillGaps=false]
   * @param {Boolean} [options.horizontal=false]
   * @param {Boolean} [options.alignRight=false]
   * @param {Boolean} [options.alignBottom=false]
   * @returns {LayoutData}
   */
  function layoutDefault(items, width, height, options) {

    var fillGaps = options.fillGaps ? true : false;
    var isHorizontal = options.horizontal ? true : false;
    var alignRight = options.alignRight ? true : false;
    var alignBottom = options.alignBottom ? true : false;
    var layout = {
      slots: {},
      width: isHorizontal ? 0 : width,
      height: isHorizontal ? height : 0,
      setWidth: isHorizontal,
      setHeight: !isHorizontal
    };
    var emptySlots = [];
    var slotIds;
    var slot;
    var item;
    var i;

    // No need to go further if items do not exist.
    if (!items.length) {
      return layout;
    }

    // Find slots for items.
    for (i = 0; i < items.length; i++) {
      item = items[i];
      slot = layoutGetSlot(layout, emptySlots, item._outerWidth, item._outerHeight, !isHorizontal, fillGaps);
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

    return layout;

  }

  /**
   * Copyright (c) 2016 Niklas Rämö <inramo@gmail.com>
   * Released under the MIT license
   *
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
  function layoutGetSlot(layout, slots, itemWidth, itemHeight, vertical, fillGaps) {

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

  }

  /**
   * Emitter
   * *******
   */

  /**
   * Event emitter constructor.
   *
   * @public
   * @class
   */
  function Emitter() {

    this._events = {};
    this._isDestroyed = false;

  }

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
   * @returns {Emitter}
   */
  Emitter.prototype.on = function (event, listener) {

    if (this._isDestroyed) {
      return this;
    }

    var listeners = this._events[event] || [];
    listeners[listeners.length] = listener;
    this._events[event] = listeners;

    return this;

  };

  /**
   * Bind an event listener that is triggered only once.
   *
   * @public
   * @memberof Emitter.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Emitter}
   */
  Emitter.prototype.once = function (event, listener) {

    var inst = this;
    return this.on(event, function callback() {
      inst.off(event, callback);
      listener.apply(null, arguments);
    });

  };

  /**
   * Unbind all event listeners that match the provided listener function.
   *
   * @public
   * @memberof Emitter.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Emitter}
   */
  Emitter.prototype.off = function (event, listener) {

    if (this._isDestroyed) {
      return this;
    }

    var listeners = this._events[event] || [];
    var i = listeners.length;

    while (i--) {
      if (listener === listeners[i]) {
        listeners.splice(i, 1);
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
   * @returns {Emitter}
   */
  Emitter.prototype.emit = function (event, arg1, arg2, arg3) {

    if (this._isDestroyed) {
      return this;
    }

    var listeners = this._events[event] || [];
    var listenersLength = listeners.length;
    var argsLength = arguments.length - 1;
    var i;

    if (listenersLength) {
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
   * @returns {Emitter}
   */
  Emitter.prototype.destroy = function () {

    if (this._isDestroyed) {
      return this;
    }

    var eventNames = Object.keys(this._events);
    var i;

    for (i = 0; i < eventNames.length; i++) {
      this._events[eventNames[i]] = null;
    }

    this._isDestroyed = true;

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
    this._isDestroyed = false;

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
   * @param {String} [options.easing='ease']
   * @param {Function} [options.onFinish]
   */
  Animate.prototype.start = function (propsCurrent, propsTarget, options) {

    if (this._isDestroyed) {
      return;
    }

    var inst = this;
    var element = inst._element;
    var opts = options || {};
    var callback = typeof opts.onFinish === typeFunction ? opts.onFinish : null;
    var velocityOpts = {
      duration: opts.duration || 300,
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

    if (!this._isDestroyed && this._isAnimating) {
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

    if (!this._isDestroyed) {
      this.stop();
      this._element = null;
      this._isDestroyed = true;
    }

  };

  /**
   * Migrate
   * *******
   */

  /**
   * The migrate process handler constructor.
   *
   * @class
   * @private
   * @param {Item} item
   */
  function Migrate(item) {

    var migrate = this;

    // Private props.
    migrate._itemId = item._id;
    migrate._isDestroyed = false;

    // Public props.
    migrate.isActive = false;
    migrate.container = false;
    migrate.containerDiffX = 0;
    migrate.containerDiffY = 0;

  }

  /**
   * Migrate - Public prototype methods
   * **********************************
   */

  /**
   * Destroy instance.
   *
   * @public
   * @memberof Migrate.prototype
   * @returns {Migrate}
   */
  Migrate.prototype.destroy = function () {

    var migrate = this;

    if (!migrate._isDestroyed) {
      migrate.stop(true);
      migrate._isDestroyed = true;
    }

    return migrate;

  };

  /**
   * Get Item instance.
   *
   * @public
   * @memberof Migrate.prototype
   * @returns {?Item}
   */
  Migrate.prototype.getItem = function () {

    return itemInstances[this._itemId] || null;

  };

  /**
   * Start the migrate process of an item.
   *
   * @public
   * @memberof Migrate.prototype
   * @param {Grid} targetGrid
   * @param {GridSingleItemQuery} position
   * @param {HTMLElement} [container]
   * @returns {Migrate}
   */
  Migrate.prototype.start = function (targetGrid, position, container) {

    var migrate = this;
    var item;
    var itemElement;
    var isItemVisible;
    var currentGrid;
    var currentGridStn;
    var targetGridStn;
    var currentIndex;
    var targetIndex;
    var targetContainer;
    var currentContainer;
    var offsetDiff;
    var translateX;
    var translateY;

    // Return immediately if the instance is destroyed.
    if (migrate._isDestroyed) {
      return migrate;
    }

    item = migrate.getItem();
    itemElement = item.getElement();
    isItemVisible = item.isVisible();
    currentGrid = item.getGrid();
    currentGridStn = currentGrid._settings;
    targetGridStn = targetGrid._settings;
    targetContainer = container || document.body;

    // Get current index and target index
    currentIndex = currentGrid._items.indexOf(item);
    targetIndex = typeof position === typeNumber ? position : targetGrid._items.indexOf(targetGrid._getItem(position));

    // If we have invalid new index, let's return immediately.
    if (targetIndex === null) {
      return migrate;
    }

    // Abort current positioning.
    if (item.isPositioning()) {
      item._stopLayout(true);
    }

    // Abort current migration.
    if (migrate.isActive) {
      migrate.stop(true);
    }

    // Abort current release.
    if (item.isReleasing()) {
      item._release.stop(true);
    }

    // Stop current visibility animations.
    currentGrid._itemShowHandler.stop(item);
    currentGrid._itemHideHandler.stop(item);

    // Destroy current drag.
    if (item._drag) {
      item._drag.destroy();
    }

    // Destroy current animation handlers.
    item._animate.destroy();
    item._animateChild.destroy();

    // Process current visibility animation queue.
    processQueue(item._visibilityQueue, true, item);

    // Remove current classnames.
    removeClass(itemElement, currentGridStn.itemClass);
    removeClass(itemElement, currentGridStn.itemVisibleClass);
    removeClass(itemElement, currentGridStn.itemHiddenClass);

    // Add new classnames.
    addClass(itemElement, targetGridStn.itemClass);
    addClass(itemElement, isItemVisible ? targetGridStn.itemVisibleClass : targetGridStn.itemHiddenClass);

    // Move item instance from current grid to target grid.
    currentGrid._items.splice(currentIndex, 1);
    insertItemsToArray(targetGrid._items, item, targetIndex);

    // Update item's grid id reference.
    item._gridId = targetGrid._id;

    // Instantiate new animation controllers.
    item._animate = new Grid.AnimateLayout(item, itemElement);
    item._animateChild = new Grid.AnimateVisibility(item, item._child);
    item._isDefaultAnimate = item._animate instanceof Animate;
    item._isDefaultChildAnimate = item._animateChild instanceof Animate;

    // Get current container
    currentContainer = itemElement.parentNode;

    // Move the item inside the target container if it's different than the
    // current container.
    if (targetContainer !== currentContainer) {
      targetContainer.appendChild(itemElement);
      offsetDiff = getOffsetDiff(targetContainer, currentContainer);
      translateX = getTranslateAsFloat(itemElement, 'x') + offsetDiff.left;
      translateY = getTranslateAsFloat(itemElement, 'y') + offsetDiff.top;
      setStyles(itemElement, {
        transform: 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)'
      });
    }

    // Update display styles.
    setStyles(itemElement, {
      display: isItemVisible ? 'block' : 'hidden'
    });

    // Update item's cached dimensions and sort data.
    item._refreshDimensions()._refreshSortData();

    // Update child element's styles to reflect the current visibility state.
    item._child.removeAttribute('style');
    if (isItemVisible) {
      targetGrid._itemShowHandler.start(item, true);
    }
    else {
      targetGrid._itemHideHandler.start(item, true);
    }

    // Create new drag handler.
    item._drag = targetGridStn.dragEnabled ? new Grid.Drag(item) : null;

    // Setup migration data.
    offsetDiff = getOffsetDiff(targetContainer, targetGrid.getElement());
    migrate.isActive = true;
    migrate.container = targetContainer;
    migrate.containerDiffX = offsetDiff.left;
    migrate.containerDiffY = offsetDiff.top;

    // Emit send event.
    currentGrid._emit(evSend, {
      item: item,
      fromGrid: currentGrid,
      fromIndex: currentIndex,
      toGrid: targetGrid,
      toIndex: targetIndex
    });

    // Emit receiveStart event.
    targetGrid._emit(evReceive, {
      item: item,
      fromGrid: currentGrid,
      fromIndex: currentIndex,
      toGrid: targetGrid,
      toIndex: targetIndex
    });

    return migrate;

  };

  /**
   * End the migrate process of an item. This method can be used to abort an
   * ongoing migrate process (animation) or finish the migrate process.
   *
   * @public
   * @memberof Migrate.prototype
   * @param {Boolean} [abort=false]
   *  - Should the migration be aborted?
   * @returns {Migrate}
   */
  Migrate.prototype.stop = function (abort) {

    var migrate = this;
    var item;
    var element;
    var grid;
    var gridElement;
    var translateX;
    var translateY;

    if (migrate._isDestroyed || !migrate.isActive) {
      return migrate;
    }

    item = migrate.getItem();
    element = item.getElement();
    grid = item.getGrid();
    gridElement = grid.getElement();

    if (migrate.container !== gridElement) {
      translateX = abort ? getTranslateAsFloat(element, 'x') - migrate.containerDiffX : item._left;
      translateY = abort ? getTranslateAsFloat(element, 'y') - migrate.containerDiffY : item._top;
      gridElement.appendChild(element);
      setStyles(element, {
        transform: 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)'
      });
    }

    migrate.isActive = false;
    migrate.container = null;
    migrate.containerDiffX = 0;
    migrate.containerDiffY = 0;

    return migrate;

  };

  /**
   * Release
   * *******
   */

  /**
   * The release process handler constructor. Although this might seem as proper
   * fit for the drag process this needs to be separated into it's own logic
   * because there might be a scenario where drag is disabled, but the release
   * process still needs to be implemented (dragging from a grid to another).
   *
   * @class
   * @private
   * @param {Item} item
   */
  function Release(item) {

    var release = this;

    // Private props.
    release._itemId = item._id;
    release._isDestroyed = false;

    // Public props.
    release.isActive = false;
    release.isPositioningStarted = false;
    release.containerDiffX = 0;
    release.containerDiffY = 0;

  }

  /**
   * Release - Public prototype methods
   * **********************************
   */

  /**
   * Destroy instance.
   *
   * @public
   * @memberof Release.prototype
   * @returns {Release}
   */
  Release.prototype.destroy = function () {

    var release = this;

    if (!release._isDestroyed) {
      release.stop(true);
      release._isDestroyed = true;
    }

    return release;

  };

  /**
   * Get Item instance.
   *
   * @public
   * @memberof Release.prototype
   * @returns {?Item}
   */
  Release.prototype.getItem = function () {

    return itemInstances[this._itemId] || null;

  };

  /**
   * Reset public data and remove releasing class.
   *
   * @public
   * @memberof Release.prototype
   * @returns {Release}
   */
  Release.prototype.reset = function () {

    var release = this;
    var item;

    if (!release._isDestroyed) {
      item = release.getItem();
      removeClass(item.getElement(), item.getGrid()._settings.itemReleasingClass);
      release.isActive = false;
      release.isPositioningStarted = false;
      release.containerDiffX = 0;
      release.containerDiffY = 0;
    }

    return release;

  };

  /**
   * Start the release process of an item.
   *
   * @public
   * @memberof Release.prototype
   * @returns {Release}
   */
  Release.prototype.start = function () {

    var release = this;
    var item;
    var element;
    var grid;

    if (release._isDestroyed || release.isActive) {
      return release;
    }

    item = release.getItem();
    element = item.getElement();
    grid = item.getGrid();

    // Flag release as active.
    release.isActive = true;

    // Add release classname to the released element.
    addClass(element, grid._settings.itemReleasingClass);

    // Emit dragReleaseStart event.
    grid._emit(evDragReleaseStart, item);

    // Position the released item.
    item._layout(false);

    return release;

  };

  /**
   * End the release process of an item. This method can be used to abort an
   * ongoing release process (animation) or finish the release process.
   *
   * @public
   * @memberof Release.prototype
   * @param {Boolean} [abort=false]
   *  - Should the release be aborted? When true, the release end event won't be
   *    emitted. Set to true only when you need to abort the release process
   *    while the item is animating to it's position.
   * @returns {Release}
   */
  Release.prototype.stop = function (abort) {

    var release = this;
    var item;
    var element;
    var grid;
    var container;
    var containerDiffX;
    var containerDiffY;
    var translateX;
    var translateY;

    if (release._isDestroyed || !release.isActive) {
      return release;
    }

    item = release.getItem();
    element = item.getElement();
    grid = item.getGrid();
    container = grid.getElement();
    containerDiffX = release.containerDiffX;
    containerDiffY = release.containerDiffY;

    // Reset data and remove releasing classname from the element.
    release.reset();

    // If the released element is outside the grid's container element put it
    // back there and adjust position accordingly.
    if (element.parentNode !== container) {
      translateX = abort ? getTranslateAsFloat(element, 'x') - containerDiffX : item._left;
      translateY = abort ? getTranslateAsFloat(element, 'y') - containerDiffY : item._top;
      container.appendChild(element);
      setStyles(element, {
        transform: 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)'
      });
    }

    // Emit dragReleaseEnd event.
    if (!abort) {
      grid._emit(evDragReleaseEnd, item);
    }

    return release;

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
    var checkPredicate = typeof settings.dragStartPredicate === typeFunction ? settings.dragStartPredicate : Drag.defaultStartPredicate;
    var predicatePending = 0;
    var predicateResolved = 1;
    var predicateRejected = 2;
    var predicate = predicatePending;
    var hammer;

    drag._itemId = item._id;
    drag._gridId = grid._id;
    drag._hammer = hammer = new Hammer.Manager(element);
    drag._isDestroyed = false;
    drag._isMigrating = false;
    drag._data = {};

    // Setup item's initial drag data.
    drag.reset();

    // Setup overlap checker function.
    drag._checkSortOverlap = debounce(function () {
      if (drag._data.isActive) {
        drag.checkOverlap();
      }
    }, settings.dragSortInterval);

    // Setup sort predicate.
    drag._sortPredicate = typeof settings.dragSortPredicate === typeFunction ? settings.dragSortPredicate : Drag.defaultSortPredicate;

    // Setup drag scroll handler.
    drag._scrollHandler = function (e) {
      drag.onScroll(e);
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

      var predicateResult;

      // If predicate is pending try to resolve it.
      if (predicate === predicatePending) {
        predicateResult = checkPredicate(drag.getItem(), e);
        if (predicateResult === true) {
          predicate = predicateResolved;
          drag.onStart(e);
        }
        else if (predicateResult === false) {
          predicate = predicateRejected;
        }
      }

      // Otherwise if predicate is resolved and drag is active, move the item.
      else if (predicate === predicateResolved && drag._data.isActive) {
        drag.onMove(e);
      }

    })
    .on('dragend dragcancel draginitup', function (e) {

      var isResolved = predicate === predicateResolved;

      // Do final predicate check to allow user to unbind stuff for the current
      // drag procedure within the predicate callback. The return value of this
      // check will have no effect to the state of the predicate.
      checkPredicate(drag.getItem(), e);

      // Reset predicate state.
      predicate = predicatePending;

      // If predicate is resolved and dragging is active, call the end handler.
      if (isResolved && drag._data.isActive) {
        drag.onEnd(e);
      }

    });

    // Prevent native link/image dragging for the item and it's ancestors.
    element.addEventListener('dragstart', preventDefault, false);

  }

  /**
   * Drag - Public methods
   * *********************
   */

  /**
   * Default drag start predicate handler that handles anchor elements
   * gracefully.
   *
   * @public
   * @memberof Drag
   * @param {Item} item
   * @param {Object} event
   * @returns {Boolean}
   */
  Drag.defaultStartPredicate = function (item, event) {

    if (event.isFinal) {
      var elem = item.getElement();
      var isAnchor = elem.tagName.toLowerCase() === 'a';
      var href = elem.getAttribute('href');
      var target = elem.getAttribute('target');
      if (isAnchor && href && Math.abs(event.deltaX) < 2 && Math.abs(event.deltaY) < 2 && event.deltaTime < 200) {
        if (target && target !== '_self') {
          global.open(href, target);
        }
        else {
          global.location.href = href;
        }
      }
    }
    else {
      return true;
    }

  };

  /**
   * Default drag sort predicate.
   *
   * @public
   * @memberof Drag
   * @param {Item} item
   * @param {Object} event
   * @returns {(Boolean|DragSortCommand)}
   *   - Returns false if no valid index was found. Otherwise returns drag sort
   *     command.
   */
  Drag.defaultSortPredicate = function (item) {

    var drag = item._drag;
    var dragData = drag._data;
    var rootGrid = drag.getGrid();
    var config = rootGrid._settings.dragSortPredicate || {};
    var sortThreshold = config.threshold || 50;
    var sortAction = config.action || 'move';
    var itemRect = {
      width: item._width,
      height: item._height,
      left: Math.round(dragData.elementClientX),
      top: Math.round(dragData.elementClientY)
    };
    var grid = getTargetGrid(itemRect, rootGrid, sortThreshold);
    var gridOffsetLeft = 0;
    var gridOffsetTop = 0;
    var matchScore = -1;
    var matchIndex;
    var gridItems;
    var gridOffset;
    var gridBorder;
    var gridPadding;
    var hasValidTargets;
    var target;
    var score;
    var i;

    // Return early if we found no grid container element that overlaps the
    // dragged item enough.
    if (!grid) {
      return false;
    }

    // Get the needed target grid data.
    gridItems = grid._items;
    gridOffset = grid._offset;
    gridBorder = grid._border;
    gridPadding = grid._padding;

    // If item is moved within it's originating grid adjust item's left and top
    // props. Otherwise if item is moved to/within another grid get the
    // container element's offset (from the element's content edge).
    if (grid === rootGrid) {
      itemRect.left = Math.round(dragData.gridX) + item._margin.left;
      itemRect.top = Math.round(dragData.gridY) + item._margin.top;
    }
    else {
      gridOffsetLeft = gridOffset.left + gridBorder.left + gridPadding.left;
      gridOffsetTop = gridOffset.top + gridBorder.top + gridPadding.top;
    }

    // Loop through the target grid items and try to find the best match.
    for (i = 0; i < gridItems.length; i++) {

      target = gridItems[i];

      // If the target item is not active or the target item is the dragged item
      // let's skip to the next item.
      if (!target._isActive || target === item) {
        continue;
      }

      // Mark the grid as having valid target items.
      hasValidTargets = true;

      // Calculate the target's overlap score with the dragged item.
      score = getRectOverlapScore(itemRect, {
        width: target._width,
        height: target._height,
        left: Math.round(target._left) + target._margin.left + gridOffsetLeft,
        top: Math.round(target._top) + target._margin.top + gridOffsetTop
      });

      // Update best match index and score if the target's overlap score with
      // the dragged item is higher than the current best match score.
      if (score > matchScore) {
        matchIndex = i;
        matchScore = score;
      }

    }

    // If there is no valid match and the item is being moved into another grid.
    if (matchScore < sortThreshold && item.getGrid() !== grid) {
      matchIndex = hasValidTargets ? -1 : 0;
      matchScore = Infinity;
    }

    // Check if the best match overlaps enough to justify a placement switch.
    if (matchScore >= sortThreshold) {
      return {
        grid: grid,
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

    if (!drag._isDestroyed) {
      drag.stop();
      drag._hammer.destroy();
      drag.getItem()._element.removeEventListener('dragstart', preventDefault, false);
      drag._isDestroyed = true;
    }

    return drag;

  };

  /**
   * Get Item instance.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {?Item}
   */
  Drag.prototype.getItem = function () {

    return itemInstances[this._itemId] || null;

  };

  /**
   * Get Grid instance.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {?Grid}
   */
  Drag.prototype.getGrid = function () {

    return gridInstances[this._gridId] || null;

  };

  /**
   * Setup/reset drag data.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.reset = function () {

    var drag = this;
    var dragData = drag._data;

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
   * Check (during drag) if an item is overlapping other items and based on
   * the configuration layout the items.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.checkOverlap = function () {

    var drag = this;
    var item = drag.getItem();
    var result = drag._sortPredicate(item, drag._data.currentEvent);
    var currentGrid;
    var currentIndex;
    var targetGrid;
    var targetIndex;
    var sortAction;

    // Let's make sure the result object has a valid index before going further.
    if (!isPlainObject(result) || typeof result.index !== typeNumber) {
      return drag;
    }

    currentGrid = item.getGrid();
    currentIndex = currentGrid._items.indexOf(item);
    targetGrid = result.grid || currentGrid;
    targetIndex = result.index;
    sortAction = result.action === 'swap' ? 'swap' : 'move';

    // If the item was moved within it's current grid.
    if (currentGrid === targetGrid) {

      // Normalize target index.
      targetIndex = normalizeArrayIndex(currentGrid._items, targetIndex);

      // Make sure the target index is not the current index.
      if (currentIndex !== targetIndex) {

        // Do the sort.
        (sortAction === 'swap' ? arraySwap : arrayMove)(currentGrid._items, currentIndex, targetIndex);

        // Emit move event.
        currentGrid._emit(evMove, {
          item: item,
          fromIndex: currentIndex,
          toIndex: targetIndex,
          action: sortAction
        });

        // Layout the grid.
        currentGrid.layout();

      }

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

      // Get the final target index for event data.
      targetIndex = targetGrid._items.indexOf(item);

      // Set sort data as null, which is an indicator for the item comparison
      // function that the sort data of this specific item should be fetched
      // lazily.
      item._sortData = null;

      // Emit send event.
      currentGrid._emit(evSend, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });

      // Emit receive event.
      targetGrid._emit(evReceive, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
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
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.finishMigration = function () {

    var drag = this;
    var item = drag.getItem();
    var release = item._release;
    var element = item.getElement();
    var targetGrid = item.getGrid();
    var targetGridElement = targetGrid.getElement();
    var targetStn = targetGrid._settings;
    var targetContainer = targetStn.dragContainer || targetGridElement;
    var currentStn = drag.getGrid()._settings;
    var currentContainer = element.parentNode;
    var translateX;
    var translateY;
    var offsetDiff;

    // Destroy current drag. Note that we need to set the migrating flag to
    // false first, because otherwise we create an infinite loop between this
    // and the drag.stop() method.
    drag._isMigrating = false;
    drag.destroy();

    // Destroy current animation handlers.
    item._animate.destroy();
    item._animateChild.destroy();

    // Remove current classnames.
    removeClass(element, currentStn.itemClass);
    removeClass(element, currentStn.itemVisibleClass);
    removeClass(element, currentStn.itemHiddenClass);

    // Add new classnames.
    addClass(element, targetStn.itemClass);
    addClass(element, targetStn.itemVisibleClass);

    // Instantiate new animation controllers.
    item._animate = new Grid.AnimateLayout(item, element);
    item._animateChild = new Grid.AnimateVisibility(item, item._child);
    item._isDefaultAnimate = item._animate instanceof Animate;
    item._isDefaultChildAnimate = item._animateChild instanceof Animate;

    // Move the item inside the target container if it's different than the
    // current container.
    if (targetContainer !== currentContainer) {
      targetContainer.appendChild(element);
      offsetDiff = getOffsetDiff(currentContainer, targetContainer);
      translateX = getTranslateAsFloat(element, 'x') + offsetDiff.left;
      translateY = getTranslateAsFloat(element, 'y') + offsetDiff.top;
      setStyles(element, {
        transform: 'translateX(' + translateX + 'px) translateY(' + translateY + 'px)'
      });
    }

    // Update item's cached dimensions and sort data.
    item._refreshDimensions()._refreshSortData();

    // Update child element's styles to reflect the current visibility state.
    item._child.removeAttribute('style');
    targetGrid._itemShowHandler.start(item, true);

    // Recreate item's drag handler.
    item._drag = targetStn.dragEnabled ? new Grid.Drag(item) : null;

    // Let's calculate and store the new diff between the new drag container and
    // new grid element and start the release.
    offsetDiff = getOffsetDiff(targetContainer, targetGridElement);
    release.containerDiffX = offsetDiff.left;
    release.containerDiffY = offsetDiff.top;
    release.start();

    return drag;

  };

  /**
   * Abort dragging and reset drag data.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.stop = function () {

    var drag = this;
    var dragData = drag._data;
    var element;
    var grid;
    var i;

    if (!dragData.isActive) {
      return drag;
    }

    // If the item is being dropped into another grid, finish it up and return
    // immediately.
    if (drag._isMigrating) {
      drag.finishMigration(dragData.currentEvent);
      return;
    }

    element = drag.getItem()._element;
    grid = drag.getGrid();

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
    drag.reset();

    return drag;

  };

  /**
   * Drag start handler.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.onStart = function (e) {

    var drag = this;
    var item = drag.getItem();
    var element;
    var grid;
    var settings;
    var dragData;
    var release;
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
    grid = drag.getGrid();
    settings = grid._settings;
    dragData = drag._data;
    release = item._release;

    // Stop current positioning animation.
    if (item.isPositioning()) {
      item._stopLayout(true);
    }

    // Stop current migration animation.
    if (item._migrate.isActive) {
      item._migrate.stop(true);
    }

    // If item is being released reset release data.
    if (item.isReleasing()) {
      release.reset();
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
      offsetDiff = getOffsetDiff(dragContainer, gridContainer);
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
    grid._emit(evDragStart, item, e);

    return drag;

  };

  /**
   * Drag move handler.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.onMove = function (e) {

    var drag = this;
    var item = drag.getItem();
    var element;
    var grid;
    var settings;
    var dragData;
    var xDiff;
    var yDiff;

    // If item is not active, reset drag.
    if (!item._isActive) {
      drag.stop();
      return;
    }

    element = item._element;
    grid = drag.getGrid();
    settings = grid._settings;
    dragData = drag._data;

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
    grid._emit(evDragMove, item, e);

    return drag;

  };

  /**
   * Drag scroll handler.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.onScroll = function (e) {

    var drag = this;
    var item = drag.getItem();
    var element = item._element;
    var grid = drag.getGrid();
    var settings = grid._settings;
    var dragData = drag._data;
    var gridContainer = grid._element;
    var dragContainer = settings.dragContainer;
    var elementGBCR = element.getBoundingClientRect();
    var xDiff = dragData.elementClientX - elementGBCR.left;
    var yDiff = dragData.elementClientY - elementGBCR.top;
    var offsetDiff;

    // Update container diff.
    if (dragContainer && dragContainer !== gridContainer) {
      offsetDiff = getOffsetDiff(dragContainer, gridContainer);
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
    grid._emit(evDragScroll, item, e);

    return drag;

  };

  /**
   * Drag end handler.
   *
   * @public
   * @memberof Drag.prototype
   * @returns {Drag}
   */
  Drag.prototype.onEnd = function (e) {

    var drag = this;
    var item = drag.getItem();
    var element = item._element;
    var grid = drag.getGrid();
    var settings = grid._settings;
    var dragData = drag._data;
    var release = item._release;
    var i;

    // If item is not active, reset drag.
    if (!item._isActive) {
      drag.stop();
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
    release.containerDiffX = dragData.containerDiffX;
    release.containerDiffY = dragData.containerDiffY;

    // Reset drag data.
    drag.reset();

    // Emit dragEnd event.
    grid._emit(evDragEnd, item, e);

    // Finish up the migration process or start the release process.
    if (drag._isMigrating) {
      drag.finishMigration();
    }
    else {
      release.start();
    }

    return drag;

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

    var targetIndex = typeof index === typeNumber ? index : -1;
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
   * Calculate the offset difference two elements.
   *
   * @private
   * @param {HTMLElement} elemA
   * @param {HTMLElement} elemB
   * @returns {Object}
   */
  function getOffsetDiff(elemA, elemB) {

    if (elemA === elemB) {
      return {
        left: 0,
        top: 0
      };
    }

    var elemAOffset = getOffsetFromDocument(elemA, 'padding');
    var elemBOffset = getOffsetFromDocument(elemB, 'padding');

    return {
      left: elemBOffset.left - elemAOffset.left,
      top: elemBOffset.top - elemAOffset.top
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
    var gbcr;
    var marginLeft;
    var marginTop;

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
    gbcr = element.getBoundingClientRect();

    // Add bounding client rect's left/top values to the offsets.
    ret.left += gbcr.left;
    ret.top += gbcr.top;

    // Sanitize edge.
    edge = edge || 'border';

    // Exclude element's positive margin size from the offset if needed.
    if (edge === 'margin') {
      marginLeft = getStyleAsFloat(element, 'margin-left');
      marginTop = getStyleAsFloat(element, 'margin-top');
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

    var ret = [];

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
      valA = (itemA._sortData ? itemA : itemA._refreshSortData())._sortData[criteriaName];
      valB = (itemB._sortData ? itemB : itemB._refreshSortData())._sortData[criteriaName];

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
   * Reorder an array of items based on another array of items.
   *
   * @private
   * @param {Item[]} items
   * @param {Item[]} refItems
   * @returns {Item[]}
   */
  function sortItemsByReference(items, refItems) {

    var newItems = [];
    var currentItems = items.concat();
    var item;
    var currentIndex;
    var i;

    for (i = 0; i < refItems.length; i++) {
      item = refItems[i];
      currentIndex = currentItems.indexOf(item);
      if (currentIndex > -1) {
        newItems.push(item);
        currentItems.splice(currentIndex, 1);
      }
    }

    Array.prototype.splice.apply(items, [0, items.length].concat(newItems).concat(currentItems));

    return items;

  }

  /**
   * Helpers - Muuri
   * ***************
   */

  /**
   * Show or hide Grid instance's items.
   *
   * @private
   * @param {Grid} inst
   * @param {String} method - "show" or "hide".
   * @param {(GridMultiItemQuery|GridItemState)} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {(ShowCallback|HideCallback)} [options.onFinish]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  function gridShowHideHandler(inst, method, items, options) {

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
    var affectedItems = [];
    var completedItems = [];
    var hiddenItems = [];
    var isAffected;
    var item;
    var i;

    // Get affected items: filter out items which will not be affected by this
    // method at their current state.
    for (i = 0; i < targetItems.length; i++) {

      item = targetItems[i];
      isAffected = isShow ? item._isHidden || item._isHiding || (item._isShowing && isInstant) :
                   !item._isHidden || item._isShowing || (item._isHiding && isInstant);

      if (isAffected) {
        affectedItems[affectedItems.length] = item;
      }

    }

    // Set up counter based on valid items.
    counter = affectedItems.length;

    // If there are no items call the callback, but don't emit any events.
    if (!counter) {
      if (typeof callback === typeFunction) {
        callback(affectedItems);
      }
    }

    // Otherwise if we have some items let's dig in.
    else {

      // Emit showStart/hideStart event.
      inst._emit(startEvent, affectedItems.concat());

      // Show/hide items.
      for (i = 0; i < affectedItems.length; i++) {

        item = affectedItems[i];

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
            if (typeof callback === typeFunction) {
              callback(completedItems.concat());
            }
            inst._emit(endEvent, completedItems.concat());
          }

        });

      }

      // Layout if needed.
      if (needsLayout) {
        if (hiddenItems.length) {
          inst.refreshItems(hiddenItems);
        }
        if (layout) {
          inst.layout(layout === 'instant', typeof layout === typeFunction ? layout : undefined);
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
   * @param {Number} duration
   * @param {(Number[]|String)} easing
   * @param {Object} styles
   * @returns {Object}
   */
  function getItemVisibilityHandler(type, duration, easing, styles) {

    duration = parseInt(duration) || 0;
    easing = easing || 'ease';
    styles = isPlainObject(styles) ? styles : null;

    var isEnabled = duration > 0;

    return {
      start: function (item, instant, onFinish) {

        var animateOpts;

        if (!isEnabled || !styles) {
          if (onFinish) {
            onFinish();
          }
        }
        else if (instant) {

          if (item._isDefaultChildAnimate) {
            hookStyles(item._child, styles);
          }
          else {
            setStyles(item._child, styles);
          }

          if (onFinish) {
            onFinish();
          }

        }
        else {

          animateOpts = {
            duration: duration,
            easing: easing,
            onFinish: onFinish
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
   * Get target grid for the default drag sort predicate.
   *
   * @private
   * @param {Rectangle} itemRect
   * @param {Grid} rootGrid
   * @param {Number} threshold
   * @returns {?Grid}
   */
  function getTargetGrid(itemRect, rootGrid, threshold) {

    var ret = null;
    var grids = rootGrid._getSortConnections(true);
    var bestScore = -1;
    var gridScore;
    var grid;
    var rect;
    var i;

    for (i = 0; i < grids.length; i++) {

      grid = grids[i];

      // We need to update the grid's offset since it may have changed during
      // scrolling. This could be left as problem for the userland, but it's
      // much nicer this way. One less hack for the user to worry about =)
      rect = grid._element.getBoundingClientRect();
      grid._offset.left = Math.round(rect.left);
      grid._offset.top = Math.round(rect.top);

      // Check how much dragged element overlaps the container element.
      gridScore = getRectOverlapScore(itemRect, {
        width: grid._width,
        height: grid._height,
        left: grid._offset.left,
        top: grid._offset.top
      });

      // Check if this grid is the best match so far.
      if (gridScore > threshold && gridScore > bestScore) {
        bestScore = gridScore;
        ret = grid;
      }

    }

    return ret;

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
   *  - Accepted values are: "active", "inactive", "visible", "hidden",
   *    "showing", "hiding", "positioning", "dragging", "releasing" and
   *    "migrating".
   * Returns {Boolean}
   */
  function isItemInState(item, state) {

    var methodName;

    if (state === 'inactive') {
      return !item.isActive();
    }

    if (state === 'hidden') {
      return !item.isVisible();
    }

    methodName = 'is' + state.charAt(0).toUpperCase() + state.slice(1);

    return typeof item[methodName] === typeFunction ? item[methodName]() : false;

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

    // Handle visible/hidden styles manually so that the whole object is
    // overriden instead of the props.
    ret.visibleStyles = (userSettings || {}).visibleStyles || (defaultSettings || {}).visibleStyles;
    ret.hiddenStyles = (userSettings || {}).hiddenStyles || (defaultSettings || {}).hiddenStyles;

    return ret;

  }

  /**
   * Type definitions
   * ****************
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
   * Layout data for the layout instance.
   *
   * @typedef {Object} LayoutData
   * @property {Object} slots
   * @property {Number} width
   * @property {Number} height
   * @property {Boolean} setWidth
   * @property {Boolean} setHeight
   */

  /**
   * @callback LayoutCallback
   * @param {Boolean} isAborted
   *   - Was the layout procedure aborted?
   * @param {Item[]} items
   *   - The items that were attempted to be positioned.
   */

  /**
   * @callback ShowCallback
   * @param {Item[]} items
   *   - The items that were successfully shown without interruptions.
   */

  /**
   * @callback HideCallback
   * @param {Item[]} items
   *   - The items that were successfully hidden without interruptions.
   */

  /**
   * @callback FilterCallback
   * @param {Item[]} shownItems
   *   - The items that were shown.
   * @param {Item[]} hiddenItems
   *   - The items that were hidden.
   */

  /**
   * Init
   */

  return Grid;

}));
