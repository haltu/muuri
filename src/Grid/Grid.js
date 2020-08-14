/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import {
  ACTION_MOVE,
  ACTION_SWAP,
  EVENT_SYNCHRONIZE,
  EVENT_LAYOUT_START,
  EVENT_LAYOUT_ABORT,
  EVENT_LAYOUT_END,
  EVENT_ADD,
  EVENT_REMOVE,
  EVENT_SHOW_START,
  EVENT_SHOW_END,
  EVENT_HIDE_START,
  EVENT_HIDE_END,
  EVENT_FILTER,
  EVENT_SORT,
  EVENT_MOVE,
  EVENT_DESTROY,
  GRID_INSTANCES,
  ITEM_ELEMENT_MAP,
  MAX_SAFE_FLOAT32_INTEGER,
} from '../constants';

import Item from '../Item/Item';
import ItemDrag from '../Item/ItemDrag';
import ItemDragPlaceholder from '../Item/ItemDragPlaceholder';
import ItemLayout from '../Item/ItemLayout';
import ItemMigrate from '../Item/ItemMigrate';
import ItemDragRelease from '../Item/ItemDragRelease';
import ItemVisibility from '../Item/ItemVisibility';
import Emitter from '../Emitter/Emitter';
import Animator from '../Animator/Animator';
import Packer from '../Packer/Packer';
import Dragger from '../Dragger/Dragger';
import AutoScroller from '../AutoScroller/AutoScroller';

import addClass from '../utils/addClass';
import arrayInsert from '../utils/arrayInsert';
import arrayMove from '../utils/arrayMove';
import arraySwap from '../utils/arraySwap';
import createUid from '../utils/createUid';
import debounce from '../utils/debounce';
import elementMatches from '../utils/elementMatches';
import getPrefixedPropName from '../utils/getPrefixedPropName';
import getStyle from '../utils/getStyle';
import getStyleAsFloat from '../utils/getStyleAsFloat';
import isFunction from '../utils/isFunction';
import isNodeList from '../utils/isNodeList';
import isPlainObject from '../utils/isPlainObject';
import noop from '../utils/noop';
import removeClass from '../utils/removeClass';
import setStyles from '../utils/setStyles';
import toArray from '../utils/toArray';

var NUMBER_TYPE = 'number';
var STRING_TYPE = 'string';
var INSTANT_LAYOUT = 'instant';
var layoutId = 0;

/**
 * Creates a new Grid instance.
 *
 * @class
 * @param {(HTMLElement|String)} element
 * @param {Object} [options]
 * @param {(String|HTMLElement[]|NodeList|HTMLCollection)} [options.items="*"]
 * @param {Number} [options.showDuration=300]
 * @param {String} [options.showEasing="ease"]
 * @param {Object} [options.visibleStyles={opacity: "1", transform: "scale(1)"}]
 * @param {Number} [options.hideDuration=300]
 * @param {String} [options.hideEasing="ease"]
 * @param {Object} [options.hiddenStyles={opacity: "0", transform: "scale(0.5)"}]
 * @param {(Function|Object)} [options.layout]
 * @param {Boolean} [options.layout.fillGaps=false]
 * @param {Boolean} [options.layout.horizontal=false]
 * @param {Boolean} [options.layout.alignRight=false]
 * @param {Boolean} [options.layout.alignBottom=false]
 * @param {Boolean} [options.layout.rounding=false]
 * @param {(Boolean|Number)} [options.layoutOnResize=150]
 * @param {Boolean} [options.layoutOnInit=true]
 * @param {Number} [options.layoutDuration=300]
 * @param {String} [options.layoutEasing="ease"]
 * @param {?Object} [options.sortData=null]
 * @param {Boolean} [options.dragEnabled=false]
 * @param {?String} [options.dragHandle=null]
 * @param {?HtmlElement} [options.dragContainer=null]
 * @param {?Function} [options.dragStartPredicate]
 * @param {Number} [options.dragStartPredicate.distance=0]
 * @param {Number} [options.dragStartPredicate.delay=0]
 * @param {String} [options.dragAxis="xy"]
 * @param {(Boolean|Function)} [options.dragSort=true]
 * @param {Object} [options.dragSortHeuristics]
 * @param {Number} [options.dragSortHeuristics.sortInterval=100]
 * @param {Number} [options.dragSortHeuristics.minDragDistance=10]
 * @param {Number} [options.dragSortHeuristics.minBounceBackAngle=1]
 * @param {(Function|Object)} [options.dragSortPredicate]
 * @param {Number} [options.dragSortPredicate.threshold=50]
 * @param {String} [options.dragSortPredicate.action="move"]
 * @param {String} [options.dragSortPredicate.migrateAction="move"]
 * @param {Object} [options.dragRelease]
 * @param {Number} [options.dragRelease.duration=300]
 * @param {String} [options.dragRelease.easing="ease"]
 * @param {Boolean} [options.dragRelease.useDragContainer=true]
 * @param {Object} [options.dragCssProps]
 * @param {Object} [options.dragPlaceholder]
 * @param {Boolean} [options.dragPlaceholder.enabled=false]
 * @param {?Function} [options.dragPlaceholder.createElement=null]
 * @param {?Function} [options.dragPlaceholder.onCreate=null]
 * @param {?Function} [options.dragPlaceholder.onRemove=null]
 * @param {Object} [options.dragAutoScroll]
 * @param {(Function|Array)} [options.dragAutoScroll.targets=[]]
 * @param {?Function} [options.dragAutoScroll.handle=null]
 * @param {Number} [options.dragAutoScroll.threshold=50]
 * @param {Number} [options.dragAutoScroll.safeZone=0.2]
 * @param {(Function|Number)} [options.dragAutoScroll.speed]
 * @param {Boolean} [options.dragAutoScroll.sortDuringScroll=true]
 * @param {Boolean} [options.dragAutoScroll.smoothStop=false]
 * @param {?Function} [options.dragAutoScroll.onStart=null]
 * @param {?Function} [options.dragAutoScroll.onStop=null]
 * @param {String} [options.containerClass="muuri"]
 * @param {String} [options.itemClass="muuri-item"]
 * @param {String} [options.itemVisibleClass="muuri-item-visible"]
 * @param {String} [options.itemHiddenClass="muuri-item-hidden"]
 * @param {String} [options.itemPositioningClass="muuri-item-positioning"]
 * @param {String} [options.itemDraggingClass="muuri-item-dragging"]
 * @param {String} [options.itemReleasingClass="muuri-item-releasing"]
 * @param {String} [options.itemPlaceholderClass="muuri-item-placeholder"]
 */
function Grid(element, options) {
  // Allow passing element as selector string
  if (typeof element === STRING_TYPE) {
    element = document.querySelector(element);
  }

  // Throw an error if the container element is not body element or does not
  // exist within the body element.
  var isElementInDom = element.getRootNode
    ? element.getRootNode({ composed: true }) === document
    : document.body.contains(element);
  if (!isElementInDom || element === document.documentElement) {
    throw new Error('Container element must be an existing DOM element.');
  }

  // Create instance settings by merging the options with default options.
  var settings = mergeSettings(Grid.defaultOptions, options);
  settings.visibleStyles = normalizeStyles(settings.visibleStyles);
  settings.hiddenStyles = normalizeStyles(settings.hiddenStyles);
  if (!isFunction(settings.dragSort)) {
    settings.dragSort = !!settings.dragSort;
  }

  this._id = createUid();
  this._element = element;
  this._settings = settings;
  this._isDestroyed = false;
  this._items = [];
  this._layout = {
    id: 0,
    items: [],
    slots: [],
  };
  this._isLayoutFinished = true;
  this._nextLayoutData = null;
  this._emitter = new Emitter();
  this._onLayoutDataReceived = this._onLayoutDataReceived.bind(this);

  // Store grid instance to the grid instances collection.
  GRID_INSTANCES[this._id] = this;

  // Add container element's class name.
  addClass(element, settings.containerClass);

  // If layoutOnResize option is a valid number sanitize it and bind the resize
  // handler.
  bindLayoutOnResize(this, settings.layoutOnResize);

  // Add initial items.
  this.add(getInitialGridElements(element, settings.items), { layout: false });

  // Layout on init if necessary.
  if (settings.layoutOnInit) {
    this.layout(true);
  }
}

/**
 * Public properties
 * *****************
 */

/**
 * @public
 * @static
 * @see Item
 */
Grid.Item = Item;

/**
 * @public
 * @static
 * @see ItemLayout
 */
Grid.ItemLayout = ItemLayout;

/**
 * @public
 * @static
 * @see ItemVisibility
 */
Grid.ItemVisibility = ItemVisibility;

/**
 * @public
 * @static
 * @see ItemMigrate
 */
Grid.ItemMigrate = ItemMigrate;

/**
 * @public
 * @static
 * @see ItemDrag
 */
Grid.ItemDrag = ItemDrag;

/**
 * @public
 * @static
 * @see ItemDragRelease
 */
Grid.ItemDragRelease = ItemDragRelease;

/**
 * @public
 * @static
 * @see ItemDragPlaceholder
 */
Grid.ItemDragPlaceholder = ItemDragPlaceholder;

/**
 * @public
 * @static
 * @see Emitter
 */
Grid.Emitter = Emitter;

/**
 * @public
 * @static
 * @see Animator
 */
Grid.Animator = Animator;

/**
 * @public
 * @static
 * @see Dragger
 */
Grid.Dragger = Dragger;

/**
 * @public
 * @static
 * @see Packer
 */
Grid.Packer = Packer;

/**
 * @public
 * @static
 * @see AutoScroller
 */
Grid.AutoScroller = AutoScroller;

/**
 * The default Packer instance used by default for all layouts.
 *
 * @public
 * @static
 * @type {Packer}
 */
Grid.defaultPacker = new Packer(2);

/**
 * Default options for Grid instance.
 *
 * @public
 * @static
 * @type {Object}
 */
Grid.defaultOptions = {
  // Initial item elements
  items: '*',

  // Default show animation
  showDuration: 300,
  showEasing: 'ease',

  // Default hide animation
  hideDuration: 300,
  hideEasing: 'ease',

  // Item's visible/hidden state styles
  visibleStyles: {
    opacity: '1',
    transform: 'scale(1)',
  },
  hiddenStyles: {
    opacity: '0',
    transform: 'scale(0.5)',
  },

  // Layout
  layout: {
    fillGaps: false,
    horizontal: false,
    alignRight: false,
    alignBottom: false,
    rounding: false,
  },
  layoutOnResize: 150,
  layoutOnInit: true,
  layoutDuration: 300,
  layoutEasing: 'ease',

  // Sorting
  sortData: null,

  // Drag & Drop
  dragEnabled: false,
  dragContainer: null,
  dragHandle: null,
  dragStartPredicate: {
    distance: 0,
    delay: 0,
  },
  dragAxis: 'xy',
  dragSort: true,
  dragSortHeuristics: {
    sortInterval: 100,
    minDragDistance: 10,
    minBounceBackAngle: 1,
  },
  dragSortPredicate: {
    threshold: 50,
    action: ACTION_MOVE,
    migrateAction: ACTION_MOVE,
  },
  dragRelease: {
    duration: 300,
    easing: 'ease',
    useDragContainer: true,
  },
  dragCssProps: {
    touchAction: 'none',
    userSelect: 'none',
    userDrag: 'none',
    tapHighlightColor: 'rgba(0, 0, 0, 0)',
    touchCallout: 'none',
    contentZooming: 'none',
  },
  dragPlaceholder: {
    enabled: false,
    createElement: null,
    onCreate: null,
    onRemove: null,
  },
  dragAutoScroll: {
    targets: [],
    handle: null,
    threshold: 50,
    safeZone: 0.2,
    speed: AutoScroller.smoothSpeed(1000, 2000, 2500),
    sortDuringScroll: true,
    smoothStop: false,
    onStart: null,
    onStop: null,
  },

  // Classnames
  containerClass: 'muuri',
  itemClass: 'muuri-item',
  itemVisibleClass: 'muuri-item-shown',
  itemHiddenClass: 'muuri-item-hidden',
  itemPositioningClass: 'muuri-item-positioning',
  itemDraggingClass: 'muuri-item-dragging',
  itemReleasingClass: 'muuri-item-releasing',
  itemPlaceholderClass: 'muuri-item-placeholder',
};

/**
 * Public prototype methods
 * ************************
 */

/**
 * Bind an event listener.
 *
 * @public
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
 * @returns {HTMLElement}
 */
Grid.prototype.getElement = function () {
  return this._element;
};

/**
 * Get instance's item by element or by index. Target can also be an Item
 * instance in which case the function returns the item if it exists within
 * related Grid instance. If nothing is found with the provided target, null
 * is returned.
 *
 * @private
 * @param {(HtmlElement|Number|Item)} [target]
 * @returns {?Item}
 */
Grid.prototype.getItem = function (target) {
  // If no target is specified or the instance is destroyed, return null.
  if (this._isDestroyed || (!target && target !== 0)) {
    return null;
  }

  // If target is number return the item in that index. If the number is lower
  // than zero look for the item starting from the end of the items array. For
  // example -1 for the last item, -2 for the second last item, etc.
  if (typeof target === NUMBER_TYPE) {
    return this._items[target > -1 ? target : this._items.length + target] || null;
  }

  // If the target is an instance of Item return it if it is attached to this
  // Grid instance, otherwise return null.
  if (target instanceof Item) {
    return target._gridId === this._id ? target : null;
  }

  // In other cases let's assume that the target is an element, so let's try
  // to find an item that matches the element and return it. If item is not
  // found return null.
  if (ITEM_ELEMENT_MAP) {
    var item = ITEM_ELEMENT_MAP.get(target);
    return item && item._gridId === this._id ? item : null;
  } else {
    for (var i = 0; i < this._items.length; i++) {
      if (this._items[i]._element === target) {
        return this._items[i];
      }
    }
  }

  return null;
};

/**
 * Get all items. Optionally you can provide specific targets (elements,
 * indices and item instances). All items that are not found are omitted from
 * the returned array.
 *
 * @public
 * @param {(HtmlElement|Number|Item|Array)} [targets]
 * @returns {Item[]}
 */
Grid.prototype.getItems = function (targets) {
  // Return all items immediately if no targets were provided or if the
  // instance is destroyed.
  if (this._isDestroyed || targets === undefined) {
    return this._items.slice(0);
  }

  var items = [];
  var i, item;

  if (Array.isArray(targets) || isNodeList(targets)) {
    for (i = 0; i < targets.length; i++) {
      item = this.getItem(targets[i]);
      if (item) items.push(item);
    }
  } else {
    item = this.getItem(targets);
    if (item) items.push(item);
  }

  return items;
};

/**
 * Update the cached dimensions of the instance's items. By default all the
 * items are refreshed, but you can also provide an array of target items as the
 * first argument if you want to refresh specific items. Note that all hidden
 * items are not refreshed by default since their "display" property is "none"
 * and their dimensions are therefore not readable from the DOM. However, if you
 * do want to force update hidden item dimensions too you can provide `true`
 * as the second argument, which makes the elements temporarily visible while
 * their dimensions are being read.
 *
 * @public
 * @param {Item[]} [items]
 * @param {Boolean} [force=false]
 * @returns {Grid}
 */
Grid.prototype.refreshItems = function (items, force) {
  if (this._isDestroyed) return this;

  var targets = items || this._items;
  var i, item, style, hiddenItemStyles;

  if (force === true) {
    hiddenItemStyles = [];
    for (i = 0; i < targets.length; i++) {
      item = targets[i];
      if (!item.isVisible() && !item.isHiding()) {
        style = item.getElement().style;
        style.visibility = 'hidden';
        style.display = '';
        hiddenItemStyles.push(style);
      }
    }
  }

  for (i = 0; i < targets.length; i++) {
    targets[i]._refreshDimensions(force);
  }

  if (force === true) {
    for (i = 0; i < hiddenItemStyles.length; i++) {
      style = hiddenItemStyles[i];
      style.visibility = '';
      style.display = 'none';
    }
    hiddenItemStyles.length = 0;
  }

  return this;
};

/**
 * Update the sort data of the instance's items. By default all the items are
 * refreshed, but you can also provide an array of target items if you want to
 * refresh specific items.
 *
 * @public
 * @param {Item[]} [items]
 * @returns {Grid}
 */
Grid.prototype.refreshSortData = function (items) {
  if (this._isDestroyed) return this;

  var targets = items || this._items;
  for (var i = 0; i < targets.length; i++) {
    targets[i]._refreshSortData();
  }

  return this;
};

/**
 * Synchronize the item elements to match the order of the items in the DOM.
 * This comes handy if you need to keep the DOM structure matched with the
 * order of the items. Note that if an item's element is not currently a child
 * of the container element (if it is dragged for example) it is ignored and
 * left untouched.
 *
 * @public
 * @returns {Grid}
 */
Grid.prototype.synchronize = function () {
  if (this._isDestroyed) return this;

  var items = this._items;
  if (!items.length) return this;

  var fragment;
  var element;

  for (var i = 0; i < items.length; i++) {
    element = items[i]._element;
    if (element.parentNode === this._element) {
      fragment = fragment || document.createDocumentFragment();
      fragment.appendChild(element);
    }
  }

  if (!fragment) return this;

  this._element.appendChild(fragment);
  this._emit(EVENT_SYNCHRONIZE);

  return this;
};

/**
 * Calculate and apply item positions.
 *
 * @public
 * @param {Boolean} [instant=false]
 * @param {Function} [onFinish]
 * @returns {Grid}
 */
Grid.prototype.layout = function (instant, onFinish) {
  if (this._isDestroyed) return this;

  // Cancel unfinished layout algorithm if possible.
  var unfinishedLayout = this._nextLayoutData;
  if (unfinishedLayout && isFunction(unfinishedLayout.cancel)) {
    unfinishedLayout.cancel();
  }

  // Compute layout id (let's stay in Float32 range).
  layoutId = (layoutId % MAX_SAFE_FLOAT32_INTEGER) + 1;
  var nextLayoutId = layoutId;

  // Store data for next layout.
  this._nextLayoutData = {
    id: nextLayoutId,
    instant: instant,
    onFinish: onFinish,
    cancel: null,
  };

  // Collect layout items (all active grid items).
  var items = this._items;
  var layoutItems = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i]._isActive) layoutItems.push(items[i]);
  }

  // Compute new layout.
  this._refreshDimensions();
  var gridWidth = this._width - this._borderLeft - this._borderRight;
  var gridHeight = this._height - this._borderTop - this._borderBottom;
  var layoutSettings = this._settings.layout;
  var cancelLayout;
  if (isFunction(layoutSettings)) {
    cancelLayout = layoutSettings(
      this,
      nextLayoutId,
      layoutItems,
      gridWidth,
      gridHeight,
      this._onLayoutDataReceived
    );
  } else {
    Grid.defaultPacker.setOptions(layoutSettings);
    cancelLayout = Grid.defaultPacker.createLayout(
      this,
      nextLayoutId,
      layoutItems,
      gridWidth,
      gridHeight,
      this._onLayoutDataReceived
    );
  }

  // Store layout cancel method if available.
  if (
    isFunction(cancelLayout) &&
    this._nextLayoutData &&
    this._nextLayoutData.id === nextLayoutId
  ) {
    this._nextLayoutData.cancel = cancelLayout;
  }

  return this;
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
 * @param {(HTMLElement|HTMLElement[])} elements
 * @param {Object} [options]
 * @param {Number} [options.index=-1]
 * @param {Boolean} [options.active]
 * @param {(Boolean|Function|String)} [options.layout=true]
 * @returns {Item[]}
 */
Grid.prototype.add = function (elements, options) {
  if (this._isDestroyed || !elements) return [];

  var newItems = toArray(elements);
  if (!newItems.length) return newItems;

  var opts = options || {};
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var items = this._items;
  var needsLayout = false;
  var fragment;
  var element;
  var item;
  var i;

  // Collect all the elements that are not child of the grid element into a
  // document fragment.
  for (i = 0; i < newItems.length; i++) {
    element = newItems[i];
    if (element.parentNode !== this._element) {
      fragment = fragment || document.createDocumentFragment();
      fragment.appendChild(element);
    }
  }

  // If we have a fragment, let's append it to the grid element. We could just
  // not do this and the `new Item()` instantiation would handle this for us,
  // but this way we can add the elements into the DOM a bit faster.
  if (fragment) {
    this._element.appendChild(fragment);
  }

  // Map provided elements into new grid items.
  for (i = 0; i < newItems.length; i++) {
    element = newItems[i];
    item = newItems[i] = new Item(this, element, opts.active);

    // If the item to be added is active, we need to do a layout. Also, we
    // need to mark the item with the skipNextAnimation flag to make it
    // position instantly (without animation) during the next layout. Without
    // the hack the item would animate to it's new position from the northwest
    // corner of the grid, which feels a bit buggy (imho).
    if (item._isActive) {
      needsLayout = true;
      item._layout._skipNextAnimation = true;
    }
  }

  // Set up the items' initial dimensions and sort data. This needs to be done
  // in a separate loop to avoid layout thrashing.
  for (i = 0; i < newItems.length; i++) {
    item = newItems[i];
    item._refreshDimensions();
    item._refreshSortData();
  }

  // Add the new items to the items collection to correct index.
  arrayInsert(items, newItems, opts.index);

  // Emit add event.
  if (this._hasListeners(EVENT_ADD)) {
    this._emit(EVENT_ADD, newItems.slice(0));
  }

  // If layout is needed.
  if (needsLayout && layout) {
    this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
  }

  return newItems;
};

/**
 * Remove items from the instance.
 *
 * @public
 * @param {Item[]} items
 * @param {Object} [options]
 * @param {Boolean} [options.removeElements=false]
 * @param {(Boolean|Function|String)} [options.layout=true]
 * @returns {Item[]}
 */
Grid.prototype.remove = function (items, options) {
  if (this._isDestroyed || !items.length) return [];

  var opts = options || {};
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var needsLayout = false;
  var allItems = this.getItems();
  var targetItems = [];
  var indices = [];
  var index;
  var item;
  var i;

  // Remove the individual items.
  for (i = 0; i < items.length; i++) {
    item = items[i];
    if (item._isDestroyed) continue;

    index = this._items.indexOf(item);
    if (index === -1) continue;

    if (item._isActive) needsLayout = true;

    targetItems.push(item);
    indices.push(allItems.indexOf(item));
    item._destroy(opts.removeElements);
    this._items.splice(index, 1);
  }

  // Emit remove event.
  if (this._hasListeners(EVENT_REMOVE)) {
    this._emit(EVENT_REMOVE, targetItems.slice(0), indices);
  }

  // If layout is needed.
  if (needsLayout && layout) {
    this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
  }

  return targetItems;
};

/**
 * Show specific instance items.
 *
 * @public
 * @param {Item[]} items
 * @param {Object} [options]
 * @param {Boolean} [options.instant=false]
 * @param {Boolean} [options.syncWithLayout=true]
 * @param {Function} [options.onFinish]
 * @param {(Boolean|Function|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.show = function (items, options) {
  if (!this._isDestroyed && items.length) {
    this._setItemsVisibility(items, true, options);
  }
  return this;
};

/**
 * Hide specific instance items.
 *
 * @public
 * @param {Item[]} items
 * @param {Object} [options]
 * @param {Boolean} [options.instant=false]
 * @param {Boolean} [options.syncWithLayout=true]
 * @param {Function} [options.onFinish]
 * @param {(Boolean|Function|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.hide = function (items, options) {
  if (!this._isDestroyed && items.length) {
    this._setItemsVisibility(items, false, options);
  }
  return this;
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
 * @param {(Function|String)} predicate
 * @param {Object} [options]
 * @param {Boolean} [options.instant=false]
 * @param {Boolean} [options.syncWithLayout=true]
 * @param {FilterCallback} [options.onFinish]
 * @param {(Boolean|Function|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.filter = function (predicate, options) {
  if (this._isDestroyed || !this._items.length) return this;

  var itemsToShow = [];
  var itemsToHide = [];
  var isPredicateString = typeof predicate === STRING_TYPE;
  var isPredicateFn = isFunction(predicate);
  var opts = options || {};
  var isInstant = opts.instant === true;
  var syncWithLayout = opts.syncWithLayout;
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var onFinish = isFunction(opts.onFinish) ? opts.onFinish : null;
  var tryFinishCounter = -1;
  var tryFinish = noop;
  var item;
  var i;

  // If we have onFinish callback, let's create proper tryFinish callback.
  if (onFinish) {
    tryFinish = function () {
      ++tryFinishCounter && onFinish(itemsToShow.slice(0), itemsToHide.slice(0));
    };
  }

  // Check which items need to be shown and which hidden.
  if (isPredicateFn || isPredicateString) {
    for (i = 0; i < this._items.length; i++) {
      item = this._items[i];
      if (isPredicateFn ? predicate(item) : elementMatches(item._element, predicate)) {
        itemsToShow.push(item);
      } else {
        itemsToHide.push(item);
      }
    }
  }

  // Show items that need to be shown.
  if (itemsToShow.length) {
    this.show(itemsToShow, {
      instant: isInstant,
      syncWithLayout: syncWithLayout,
      onFinish: tryFinish,
      layout: false,
    });
  } else {
    tryFinish();
  }

  // Hide items that need to be hidden.
  if (itemsToHide.length) {
    this.hide(itemsToHide, {
      instant: isInstant,
      syncWithLayout: syncWithLayout,
      onFinish: tryFinish,
      layout: false,
    });
  } else {
    tryFinish();
  }

  // If there are any items to filter.
  if (itemsToShow.length || itemsToHide.length) {
    // Emit filter event.
    if (this._hasListeners(EVENT_FILTER)) {
      this._emit(EVENT_FILTER, itemsToShow.slice(0), itemsToHide.slice(0));
    }

    // If layout is needed.
    if (layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }
  }

  return this;
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
 * @param {(Function|String|Item[])} comparer
 * @param {Object} [options]
 * @param {Boolean} [options.descending=false]
 * @param {(Boolean|Function|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.sort = (function () {
  var sortComparer;
  var isDescending;
  var origItems;
  var indexMap;

  function defaultComparer(a, b) {
    var result = 0;
    var criteriaName;
    var criteriaOrder;
    var valA;
    var valB;

    // Loop through the list of sort criteria.
    for (var i = 0; i < sortComparer.length; i++) {
      // Get the criteria name, which should match an item's sort data key.
      criteriaName = sortComparer[i][0];
      criteriaOrder = sortComparer[i][1];

      // Get items' cached sort values for the criteria. If the item has no sort
      // data let's update the items sort data (this is a lazy load mechanism).
      valA = (a._sortData ? a : a._refreshSortData())._sortData[criteriaName];
      valB = (b._sortData ? b : b._refreshSortData())._sortData[criteriaName];

      // Sort the items in descending order if defined so explicitly. Otherwise
      // sort items in ascending order.
      if (criteriaOrder === 'desc' || (!criteriaOrder && isDescending)) {
        result = valB < valA ? -1 : valB > valA ? 1 : 0;
      } else {
        result = valA < valB ? -1 : valA > valB ? 1 : 0;
      }

      // If we have -1 or 1 as the return value, let's return it immediately.
      if (result) return result;
    }

    // If values are equal let's compare the item indices to make sure we
    // have a stable sort. Note that this is not necessary in evergreen browsers
    // because Array.sort() is nowadays stable. However, in order to guarantee
    // same results in older browsers we need this.
    if (!result) {
      if (!indexMap) indexMap = createIndexMap(origItems);
      result = isDescending ? compareIndexMap(indexMap, b, a) : compareIndexMap(indexMap, a, b);
    }
    return result;
  }

  function customComparer(a, b) {
    var result = isDescending ? -sortComparer(a, b) : sortComparer(a, b);
    if (!result) {
      if (!indexMap) indexMap = createIndexMap(origItems);
      result = isDescending ? compareIndexMap(indexMap, b, a) : compareIndexMap(indexMap, a, b);
    }
    return result;
  }

  return function (comparer, options) {
    if (this._isDestroyed || this._items.length < 2) return this;

    var items = this._items;
    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;

    // Setup parent scope data.
    isDescending = !!opts.descending;
    origItems = items.slice(0);
    indexMap = null;

    // If function is provided do a native array sort.
    if (isFunction(comparer)) {
      sortComparer = comparer;
      items.sort(customComparer);
    }
    // Otherwise if we got a string, let's sort by the sort data as provided in
    // the instance's options.
    else if (typeof comparer === STRING_TYPE) {
      sortComparer = comparer
        .trim()
        .split(' ')
        .filter(function (val) {
          return val;
        })
        .map(function (val) {
          return val.split(':');
        });
      items.sort(defaultComparer);
    }
    // Otherwise if we got an array, let's assume it's a presorted array of the
    // items and order the items based on it. Here we blindly trust that the
    // presorted array consists of the same item instances as the current
    // `gird._items` array.
    else if (Array.isArray(comparer)) {
      items.length = 0;
      items.push.apply(items, comparer);
    }
    // Otherwise let's throw an error.
    else {
      sortComparer = isDescending = origItems = indexMap = null;
      throw new Error('Invalid comparer argument provided.');
    }

    // Emit sort event.
    if (this._hasListeners(EVENT_SORT)) {
      this._emit(EVENT_SORT, items.slice(0), origItems);
    }

    // If layout is needed.
    if (layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }

    // Reset data (to avoid mem leaks).
    sortComparer = isDescending = origItems = indexMap = null;

    return this;
  };
})();

/**
 * Move item to another index or in place of another item.
 *
 * @public
 * @param {(HtmlElement|Number|Item)} item
 * @param {(HtmlElement|Number|Item)} position
 * @param {Object} [options]
 * @param {String} [options.action="move"]
 *   - Accepts either "move" or "swap".
 *   - "move" moves the item in place of the other item.
 *   - "swap" swaps the position of the items.
 * @param {(Boolean|Function|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.move = function (item, position, options) {
  if (this._isDestroyed || this._items.length < 2) return this;

  var items = this._items;
  var opts = options || {};
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var isSwap = opts.action === ACTION_SWAP;
  var action = isSwap ? ACTION_SWAP : ACTION_MOVE;
  var fromItem = this.getItem(item);
  var toItem = this.getItem(position);
  var fromIndex;
  var toIndex;

  // Make sure the items exist and are not the same.
  if (fromItem && toItem && fromItem !== toItem) {
    // Get the indices of the items.
    fromIndex = items.indexOf(fromItem);
    toIndex = items.indexOf(toItem);

    // Do the move/swap.
    if (isSwap) {
      arraySwap(items, fromIndex, toIndex);
    } else {
      arrayMove(items, fromIndex, toIndex);
    }

    // Emit move event.
    if (this._hasListeners(EVENT_MOVE)) {
      this._emit(EVENT_MOVE, {
        item: fromItem,
        fromIndex: fromIndex,
        toIndex: toIndex,
        action: action,
      });
    }

    // If layout is needed.
    if (layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }
  }

  return this;
};

/**
 * Send item to another Grid instance.
 *
 * @public
 * @param {(HtmlElement|Number|Item)} item
 * @param {Grid} targetGrid
 * @param {(HtmlElement|Number|Item)} position
 * @param {Object} [options]
 * @param {HTMLElement} [options.appendTo=document.body]
 * @param {(Boolean|Function|String)} [options.layoutSender=true]
 * @param {(Boolean|Function|String)} [options.layoutReceiver=true]
 * @returns {Grid}
 */
Grid.prototype.send = function (item, targetGrid, position, options) {
  if (this._isDestroyed || targetGrid._isDestroyed || this === targetGrid) return this;

  // Make sure we have a valid target item.
  item = this.getItem(item);
  if (!item) return this;

  var opts = options || {};
  var container = opts.appendTo || document.body;
  var layoutSender = opts.layoutSender ? opts.layoutSender : opts.layoutSender === undefined;
  var layoutReceiver = opts.layoutReceiver
    ? opts.layoutReceiver
    : opts.layoutReceiver === undefined;

  // Start the migration process.
  item._migrate.start(targetGrid, position, container);

  // If migration was started successfully and the item is active, let's layout
  // the grids.
  if (item._migrate._isActive && item._isActive) {
    if (layoutSender) {
      this.layout(
        layoutSender === INSTANT_LAYOUT,
        isFunction(layoutSender) ? layoutSender : undefined
      );
    }
    if (layoutReceiver) {
      targetGrid.layout(
        layoutReceiver === INSTANT_LAYOUT,
        isFunction(layoutReceiver) ? layoutReceiver : undefined
      );
    }
  }

  return this;
};

/**
 * Destroy the instance.
 *
 * @public
 * @param {Boolean} [removeElements=false]
 * @returns {Grid}
 */
Grid.prototype.destroy = function (removeElements) {
  if (this._isDestroyed) return this;

  var container = this._element;
  var items = this._items.slice(0);
  var layoutStyles = (this._layout && this._layout.styles) || {};
  var i, prop;

  // Unbind window resize event listener.
  unbindLayoutOnResize(this);

  // Destroy items.
  for (i = 0; i < items.length; i++) items[i]._destroy(removeElements);
  this._items.length = 0;

  // Restore container.
  removeClass(container, this._settings.containerClass);
  for (prop in layoutStyles) container.style[prop] = '';

  // Emit destroy event and unbind all events.
  this._emit(EVENT_DESTROY);
  this._emitter.destroy();

  // Remove reference from the grid instances collection.
  delete GRID_INSTANCES[this._id];

  // Flag instance as destroyed.
  this._isDestroyed = true;

  return this;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Emit a grid event.
 *
 * @private
 * @param {String} event
 * @param {...*} [arg]
 */
Grid.prototype._emit = function () {
  if (this._isDestroyed) return;
  this._emitter.emit.apply(this._emitter, arguments);
};

/**
 * Check if there are any events listeners for an event.
 *
 * @private
 * @param {String} event
 * @returns {Boolean}
 */
Grid.prototype._hasListeners = function (event) {
  if (this._isDestroyed) return false;
  return this._emitter.countListeners(event) > 0;
};

/**
 * Update container's width, height and offsets.
 *
 * @private
 */
Grid.prototype._updateBoundingRect = function () {
  var element = this._element;
  var rect = element.getBoundingClientRect();
  this._width = rect.width;
  this._height = rect.height;
  this._left = rect.left;
  this._top = rect.top;
  this._right = rect.right;
  this._bottom = rect.bottom;
};

/**
 * Update container's border sizes.
 *
 * @private
 * @param {Boolean} left
 * @param {Boolean} right
 * @param {Boolean} top
 * @param {Boolean} bottom
 */
Grid.prototype._updateBorders = function (left, right, top, bottom) {
  var element = this._element;
  if (left) this._borderLeft = getStyleAsFloat(element, 'border-left-width');
  if (right) this._borderRight = getStyleAsFloat(element, 'border-right-width');
  if (top) this._borderTop = getStyleAsFloat(element, 'border-top-width');
  if (bottom) this._borderBottom = getStyleAsFloat(element, 'border-bottom-width');
};

/**
 * Refresh all of container's internal dimensions and offsets.
 *
 * @private
 */
Grid.prototype._refreshDimensions = function () {
  this._updateBoundingRect();
  this._updateBorders(1, 1, 1, 1);
  this._boxSizing = getStyle(this._element, 'box-sizing');
};

/**
 * Calculate and apply item positions.
 *
 * @private
 * @param {Object} layout
 */
Grid.prototype._onLayoutDataReceived = (function () {
  var itemsToLayout = [];
  return function (layout) {
    if (this._isDestroyed || !this._nextLayoutData || this._nextLayoutData.id !== layout.id) return;

    var grid = this;
    var instant = this._nextLayoutData.instant;
    var onFinish = this._nextLayoutData.onFinish;
    var numItems = layout.items.length;
    var counter = numItems;
    var item;
    var left;
    var top;
    var i;

    // Reset next layout data.
    this._nextLayoutData = null;

    if (!this._isLayoutFinished && this._hasListeners(EVENT_LAYOUT_ABORT)) {
      this._emit(EVENT_LAYOUT_ABORT, this._layout.items.slice(0));
    }

    // Update the layout reference.
    this._layout = layout;

    // Update the item positions and collect all items that need to be laid
    // out. It is critical that we update the item position _before_ the
    // layoutStart event as the new data might be needed in the callback.
    itemsToLayout.length = 0;
    for (i = 0; i < numItems; i++) {
      item = layout.items[i];

      // Make sure we have a matching item.
      if (!item) {
        --counter;
        continue;
      }

      // Get the item's new left and top values.
      left = layout.slots[i * 2];
      top = layout.slots[i * 2 + 1];

      // Let's skip the layout process if we can. Possibly avoids a lot of DOM
      // operations which saves us some CPU cycles.
      if (item._canSkipLayout(left, top)) {
        --counter;
        continue;
      }

      // Update the item's position.
      item._left = left;
      item._top = top;

      // Only active non-dragged items need to be moved.
      if (item.isActive() && !item.isDragging()) {
        itemsToLayout.push(item);
      } else {
        --counter;
      }
    }

    // Set layout styles to the grid element.
    if (layout.styles) {
      setStyles(this._element, layout.styles);
    }

    // layoutStart event is intentionally emitted after the container element's
    // dimensions are set, because otherwise there would be no hook for reacting
    // to container dimension changes.
    if (this._hasListeners(EVENT_LAYOUT_START)) {
      this._emit(EVENT_LAYOUT_START, layout.items.slice(0), instant === true);
      // Let's make sure that the current layout process has not been overridden
      // in the layoutStart event, and if so, let's stop processing the aborted
      // layout.
      if (this._layout.id !== layout.id) return;
    }

    var tryFinish = function () {
      if (--counter > 0) return;

      var hasLayoutChanged = grid._layout.id !== layout.id;
      var callback = isFunction(instant) ? instant : onFinish;

      if (!hasLayoutChanged) {
        grid._isLayoutFinished = true;
      }

      if (isFunction(callback)) {
        callback(layout.items.slice(0), hasLayoutChanged);
      }

      if (!hasLayoutChanged && grid._hasListeners(EVENT_LAYOUT_END)) {
        grid._emit(EVENT_LAYOUT_END, layout.items.slice(0));
      }
    };

    if (!itemsToLayout.length) {
      tryFinish();
      return this;
    }

    this._isLayoutFinished = false;

    for (i = 0; i < itemsToLayout.length; i++) {
      if (this._layout.id !== layout.id) break;
      itemsToLayout[i]._layout.start(instant === true, tryFinish);
    }

    if (this._layout.id === layout.id) {
      itemsToLayout.length = 0;
    }

    return this;
  };
})();

/**
 * Show or hide Grid instance's items.
 *
 * @private
 * @param {Item[]} items
 * @param {Boolean} toVisible
 * @param {Object} [options]
 * @param {Boolean} [options.instant=false]
 * @param {Boolean} [options.syncWithLayout=true]
 * @param {Function} [options.onFinish]
 * @param {(Boolean|Function|String)} [options.layout=true]
 */
Grid.prototype._setItemsVisibility = function (items, toVisible, options) {
  var grid = this;
  var targetItems = items.slice(0);
  var opts = options || {};
  var isInstant = opts.instant === true;
  var callback = opts.onFinish;
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var counter = targetItems.length;
  var startEvent = toVisible ? EVENT_SHOW_START : EVENT_HIDE_START;
  var endEvent = toVisible ? EVENT_SHOW_END : EVENT_HIDE_END;
  var method = toVisible ? 'show' : 'hide';
  var needsLayout = false;
  var completedItems = [];
  var hiddenItems = [];
  var item;
  var i;

  // If there are no items call the callback, but don't emit any events.
  if (!counter) {
    if (isFunction(callback)) callback(targetItems);
    return;
  }

  // Prepare the items.
  for (i = 0; i < targetItems.length; i++) {
    item = targetItems[i];

    // If inactive item is shown or active item is hidden we need to do
    // layout.
    if ((toVisible && !item._isActive) || (!toVisible && item._isActive)) {
      needsLayout = true;
    }

    // If inactive item is shown we also need to do a little hack to make the
    // item not animate it's next positioning (layout).
    item._layout._skipNextAnimation = !!(toVisible && !item._isActive);

    // If a hidden item is being shown we need to refresh the item's
    // dimensions.
    if (toVisible && item._visibility._isHidden) {
      hiddenItems.push(item);
    }

    // Add item to layout or remove it from layout.
    if (toVisible) {
      item._addToLayout();
    } else {
      item._removeFromLayout();
    }
  }

  // Force refresh the dimensions of all hidden items.
  if (hiddenItems.length) {
    this.refreshItems(hiddenItems, true);
    hiddenItems.length = 0;
  }

  // Show the items in sync with the next layout.
  function triggerVisibilityChange() {
    if (needsLayout && opts.syncWithLayout !== false) {
      grid.off(EVENT_LAYOUT_START, triggerVisibilityChange);
    }

    if (grid._hasListeners(startEvent)) {
      grid._emit(startEvent, targetItems.slice(0));
    }

    for (i = 0; i < targetItems.length; i++) {
      // Make sure the item is still in the original grid. There is a chance
      // that the item starts migrating before tiggerVisibilityChange is called.
      if (targetItems[i]._gridId !== grid._id) {
        if (--counter < 1) {
          if (isFunction(callback)) callback(completedItems.slice(0));
          if (grid._hasListeners(endEvent)) grid._emit(endEvent, completedItems.slice(0));
        }
        continue;
      }

      targetItems[i]._visibility[method](isInstant, function (interrupted, item) {
        // If the current item's animation was not interrupted add it to the
        // completedItems array.
        if (!interrupted) completedItems.push(item);

        // If all items have finished their animations call the callback
        // and emit showEnd/hideEnd event.
        if (--counter < 1) {
          if (isFunction(callback)) callback(completedItems.slice(0));
          if (grid._hasListeners(endEvent)) grid._emit(endEvent, completedItems.slice(0));
        }
      });
    }
  }

  // Trigger the visibility change, either async with layout or instantly.
  if (needsLayout && opts.syncWithLayout !== false) {
    this.on(EVENT_LAYOUT_START, triggerVisibilityChange);
  } else {
    triggerVisibilityChange();
  }

  // Trigger layout if needed.
  if (needsLayout && layout) {
    this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
  }
};

/**
 * Private helpers
 * ***************
 */

/**
 * Merge default settings with user settings. The returned object is a new
 * object with merged values. The merging is a deep merge meaning that all
 * objects and arrays within the provided settings objects will be also merged
 * so that modifying the values of the settings object will have no effect on
 * the returned object.
 *
 * @param {Object} defaultSettings
 * @param {Object} [userSettings]
 * @returns {Object} Returns a new object.
 */
function mergeSettings(defaultSettings, userSettings) {
  // Create a fresh copy of default settings.
  var settings = mergeObjects({}, defaultSettings);

  // Merge user settings to default settings.
  if (userSettings) {
    settings = mergeObjects(settings, userSettings);
  }

  // Handle visible/hidden styles manually so that the whole object is
  // overridden instead of the props.

  if (userSettings && userSettings.visibleStyles) {
    settings.visibleStyles = userSettings.visibleStyles;
  } else if (defaultSettings && defaultSettings.visibleStyles) {
    settings.visibleStyles = defaultSettings.visibleStyles;
  }

  if (userSettings && userSettings.hiddenStyles) {
    settings.hiddenStyles = userSettings.hiddenStyles;
  } else if (defaultSettings && defaultSettings.hiddenStyles) {
    settings.hiddenStyles = defaultSettings.hiddenStyles;
  }

  return settings;
}

/**
 * Merge two objects recursively (deep merge). The source object's properties
 * are merged to the target object.
 *
 * @param {Object} target
 *   - The target object.
 * @param {Object} source
 *   - The source object.
 * @returns {Object} Returns the target object.
 */
function mergeObjects(target, source) {
  var sourceKeys = Object.keys(source);
  var length = sourceKeys.length;
  var isSourceObject;
  var propName;
  var i;

  for (i = 0; i < length; i++) {
    propName = sourceKeys[i];
    isSourceObject = isPlainObject(source[propName]);

    // If target and source values are both objects, merge the objects and
    // assign the merged value to the target property.
    if (isPlainObject(target[propName]) && isSourceObject) {
      target[propName] = mergeObjects(mergeObjects({}, target[propName]), source[propName]);
      continue;
    }

    // If source's value is object and target's is not let's clone the object as
    // the target's value.
    if (isSourceObject) {
      target[propName] = mergeObjects({}, source[propName]);
      continue;
    }

    // If source's value is an array let's clone the array as the target's
    // value.
    if (Array.isArray(source[propName])) {
      target[propName] = source[propName].slice(0);
      continue;
    }

    // In all other cases let's just directly assign the source's value as the
    // target's value.
    target[propName] = source[propName];
  }

  return target;
}

/**
 * Collect and return initial items for grid.
 *
 * @param {HTMLElement} gridElement
 * @param {?(HTMLElement[]|NodeList|HtmlCollection|String)} elements
 * @returns {(HTMLElement[]|NodeList|HtmlCollection)}
 */
function getInitialGridElements(gridElement, elements) {
  // If we have a wildcard selector let's return all the children.
  if (elements === '*') {
    return gridElement.children;
  }

  // If we have some more specific selector, let's filter the elements.
  if (typeof elements === STRING_TYPE) {
    var result = [];
    var children = gridElement.children;
    for (var i = 0; i < children.length; i++) {
      if (elementMatches(children[i], elements)) {
        result.push(children[i]);
      }
    }
    return result;
  }

  // If we have an array of elements or a node list.
  if (Array.isArray(elements) || isNodeList(elements)) {
    return elements;
  }

  // Otherwise just return an empty array.
  return [];
}

/**
 * Bind grid's resize handler to window.
 *
 * @param {Grid} grid
 * @param {(Number|Boolean)} delay
 */
function bindLayoutOnResize(grid, delay) {
  if (typeof delay !== NUMBER_TYPE) {
    delay = delay === true ? 0 : -1;
  }

  if (delay >= 0) {
    grid._resizeHandler = debounce(function () {
      grid.refreshItems().layout();
    }, delay);

    window.addEventListener('resize', grid._resizeHandler);
  }
}

/**
 * Unbind grid's resize handler from window.
 *
 * @param {Grid} grid
 */
function unbindLayoutOnResize(grid) {
  if (grid._resizeHandler) {
    grid._resizeHandler(true);
    window.removeEventListener('resize', grid._resizeHandler);
    grid._resizeHandler = null;
  }
}

/**
 * Normalize style declaration object, returns a normalized (new) styles object
 * (prefixed properties and invalid properties removed).
 *
 * @param {Object} styles
 * @returns {Object}
 */
function normalizeStyles(styles) {
  var normalized = {};
  var docElemStyle = document.documentElement.style;
  var prop, prefixedProp;

  // Normalize visible styles (prefix and remove invalid).
  for (prop in styles) {
    if (!styles[prop]) continue;
    prefixedProp = getPrefixedPropName(docElemStyle, prop);
    if (!prefixedProp) continue;
    normalized[prefixedProp] = styles[prop];
  }

  return normalized;
}

/**
 * Create index map from items.
 *
 * @param {Item[]} items
 * @returns {Object}
 */
function createIndexMap(items) {
  var result = {};
  for (var i = 0; i < items.length; i++) {
    result[items[i]._id] = i;
  }
  return result;
}

/**
 * Sort comparer function for items' index map.
 *
 * @param {Object} indexMap
 * @param {Item} itemA
 * @param {Item} itemB
 * @returns {Number}
 */
function compareIndexMap(indexMap, itemA, itemB) {
  var indexA = indexMap[itemA._id];
  var indexB = indexMap[itemB._id];
  return indexA - indexB;
}

export default Grid;
