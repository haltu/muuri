/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import {
  actionMove,
  actionSwap,
  eventSynchronize,
  eventLayoutStart,
  eventLayoutEnd,
  eventAdd,
  eventRemove,
  eventShowStart,
  eventShowEnd,
  eventHideStart,
  eventHideEnd,
  eventFilter,
  eventSort,
  eventMove,
  eventDestroy,
  gridInstances,
  namespace
} from '../shared';

import Emitter from '../Emitter/Emitter';
import Item from '../Item/Item';
import ItemAnimate from '../Item/ItemAnimate';
import ItemDrag from '../Item/ItemDrag';
import ItemDragPlaceholder from '../Item/ItemDragPlaceholder';
import ItemLayout from '../Item/ItemLayout';
import ItemMigrate from '../Item/ItemMigrate';
import ItemRelease from '../Item/ItemRelease';
import ItemVisibility from '../Item/ItemVisibility';
import Packer from '../Packer/Packer';
import Dragger from '../Dragger/Dragger';

import addClass from '../utils/addClass';
import arrayMove from '../utils/arrayMove';
import arraySwap from '../utils/arraySwap';
import createUid from '../utils/createUid';
import debounce from '../utils/debounce';
import elementMatches from '../utils/elementMatches';
import getStyle from '../utils/getStyle';
import getStyleAsFloat from '../utils/getStyleAsFloat';
import arrayInsert from '../utils/arrayInsert';
import isFunction from '../utils/isFunction';
import isNodeList from '../utils/isNodeList';
import isPlainObject from '../utils/isPlainObject';
import removeClass from '../utils/removeClass';
import toArray from '../utils/toArray';

var packer = new Packer();
var noop = function() {};

var numberType = 'number';
var stringType = 'string';
var instantLayout = 'instant';

/**
 * Creates a new Grid instance.
 *
 * @class
 * @param {(HTMLElement|String)} element
 * @param {Object} [options]
 * @param {?(HTMLElement[]|NodeList|String)} [options.items]
 * @param {Number} [options.showDuration=300]
 * @param {String} [options.showEasing="ease"]
 * @param {Object} [options.visibleStyles]
 * @param {Number} [options.hideDuration=300]
 * @param {String} [options.hideEasing="ease"]
 * @param {Object} [options.hiddenStyles]
 * @param {(Function|Object)} [options.layout]
 * @param {Boolean} [options.layout.fillGaps=false]
 * @param {Boolean} [options.layout.horizontal=false]
 * @param {Boolean} [options.layout.alignRight=false]
 * @param {Boolean} [options.layout.alignBottom=false]
 * @param {Boolean} [options.layout.rounding=true]
 * @param {(Boolean|Number)} [options.layoutOnResize=100]
 * @param {Boolean} [options.layoutOnInit=true]
 * @param {Number} [options.layoutDuration=300]
 * @param {String} [options.layoutEasing="ease"]
 * @param {?Object} [options.sortData=null]
 * @param {Boolean} [options.dragEnabled=false]
 * @param {?HtmlElement} [options.dragContainer=null]
 * @param {?Function} [options.dragStartPredicate]
 * @param {Number} [options.dragStartPredicate.distance=0]
 * @param {Number} [options.dragStartPredicate.delay=0]
 * @param {(Boolean|String)} [options.dragStartPredicate.handle=false]
 * @param {?String} [options.dragAxis]
 * @param {(Boolean|Function)} [options.dragSort=true]
 * @param {Object} [options.dragSortHeuristics]
 * @param {Number} [options.dragSortHeuristics.sortInterval=100]
 * @param {Number} [options.dragSortHeuristics.minDragDistance=10]
 * @param {Number} [options.dragSortHeuristics.minBounceBackAngle=1]
 * @param {(Function|Object)} [options.dragSortPredicate]
 * @param {Number} [options.dragSortPredicate.threshold=50]
 * @param {String} [options.dragSortPredicate.action="move"]
 * @param {Number} [options.dragReleaseDuration=300]
 * @param {String} [options.dragReleaseEasing="ease"]
 * @param {Object} [options.dragCssProps]
 * @param {Object} [options.dragPlaceholder]
 * @param {Boolean} [options.dragPlaceholder.enabled=false]
 * @param {Number} [options.dragPlaceholder.duration=300]
 * @param {String} [options.dragPlaceholder.easing="ease"]
 * @param {?Function} [options.dragPlaceholder.createElement=null]
 * @param {?Function} [options.dragPlaceholder.onCreate=null]
 * @param {?Function} [options.dragPlaceholder.onRemove=null]
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
  var inst = this;
  var settings;
  var items;
  var layoutOnResize;

  // Allow passing element as selector string. Store element for instance.
  element = this._element =
    typeof element === stringType ? window.document.querySelector(element) : element;

  // Throw an error if the container element is not body element or does not
  // exist within the body element.
  var isElementInDom = element.getRootNode
    ? element.getRootNode({ composed: true }) === document
    : window.document.body.contains(element);
  if (!isElementInDom || element === window.document.documentElement) {
    throw new Error('Container element must be an existing DOM element');
  }

  // Create instance settings by merging the options with default options.
  settings = this._settings = mergeSettings(Grid.defaultOptions, options);

  // Sanitize dragSort setting.
  if (!isFunction(settings.dragSort)) {
    settings.dragSort = !!settings.dragSort;
  }

  // Create instance id and store it to the grid instances collection.
  this._id = createUid();
  gridInstances[this._id] = inst;

  // Destroyed flag.
  this._isDestroyed = false;

  // The layout object (mutated on every layout).
  this._layout = {
    id: 0,
    items: [],
    slots: [],
    setWidth: false,
    setHeight: false,
    width: 0,
    height: 0
  };

  // Create private Emitter instance.
  this._emitter = new Emitter();

  // Add container element's class name.
  addClass(element, settings.containerClass);

  // Create initial items.
  this._items = [];
  items = settings.items;
  if (typeof items === stringType) {
    toArray(element.children).forEach(function(itemElement) {
      if (items === '*' || elementMatches(itemElement, items)) {
        inst._items.push(new Item(inst, itemElement));
      }
    });
  } else if (Array.isArray(items) || isNodeList(items)) {
    this._items = toArray(items).map(function(itemElement) {
      return new Item(inst, itemElement);
    });
  }

  // If layoutOnResize option is a valid number sanitize it and bind the resize
  // handler.
  layoutOnResize = settings.layoutOnResize;
  if (typeof layoutOnResize !== numberType) {
    layoutOnResize = layoutOnResize === true ? 0 : -1;
  }
  if (layoutOnResize >= 0) {
    window.addEventListener(
      'resize',
      (inst._resizeHandler = debounce(function() {
        inst.refreshItems().layout();
      }, layoutOnResize))
    );
  }

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
 * @see Item
 */
Grid.Item = Item;

/**
 * @see ItemLayout
 */
Grid.ItemLayout = ItemLayout;

/**
 * @see ItemVisibility
 */
Grid.ItemVisibility = ItemVisibility;

/**
 * @see ItemMigrate
 */
Grid.ItemMigrate = ItemMigrate;

/**
 * @see ItemAnimate
 */
Grid.ItemAnimate = ItemAnimate;

/**
 * @see ItemDrag
 */
Grid.ItemDrag = ItemDrag;

/**
 * @see ItemRelease
 */
Grid.ItemRelease = ItemRelease;

/**
 * @see ItemDragPlaceholder
 */
Grid.ItemDragPlaceholder = ItemDragPlaceholder;

/**
 * @see Emitter
 */
Grid.Emitter = Emitter;

/**
 * @see Dragger
 */
Grid.Dragger = Dragger;

/**
 * @see Packer
 */
Grid.Packer = Packer;

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

  // Item's visible/hidden state styles
  visibleStyles: {
    opacity: '1',
    transform: 'scale(1)'
  },
  hiddenStyles: {
    opacity: '0',
    transform: 'scale(0.5)'
  },

  // Layout
  layout: {
    fillGaps: false,
    horizontal: false,
    alignRight: false,
    alignBottom: false,
    rounding: true
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
  dragStartPredicate: {
    distance: 0,
    delay: 0,
    handle: false
  },
  dragAxis: null,
  dragSort: true,
  dragSortHeuristics: {
    sortInterval: 100,
    minDragDistance: 10,
    minBounceBackAngle: 1
  },
  dragSortPredicate: {
    threshold: 50,
    action: actionMove
  },
  dragReleaseDuration: 300,
  dragReleaseEasing: 'ease',
  dragCssProps: {
    touchAction: 'none',
    userSelect: 'none',
    userDrag: 'none',
    tapHighlightColor: 'rgba(0, 0, 0, 0)',
    touchCallout: 'none',
    contentZooming: 'none'
  },
  dragPlaceholder: {
    enabled: false,
    duration: 300,
    easing: 'ease',
    createElement: null,
    onCreate: null,
    onRemove: null
  },

  // Classnames
  containerClass: 'muuri',
  itemClass: 'muuri-item',
  itemVisibleClass: 'muuri-item-shown',
  itemHiddenClass: 'muuri-item-hidden',
  itemPositioningClass: 'muuri-item-positioning',
  itemDraggingClass: 'muuri-item-dragging',
  itemReleasingClass: 'muuri-item-releasing',
  itemPlaceholderClass: 'muuri-item-placeholder'
};

/**
 * Public prototype methods
 * ************************
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
Grid.prototype.on = function(event, listener) {
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
Grid.prototype.off = function(event, listener) {
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
Grid.prototype.getElement = function() {
  return this._element;
};

/**
 * Get all items. Optionally you can provide specific targets (elements and
 * indices). Note that the returned array is not the same object used by the
 * instance so modifying it will not affect instance's items. All items that
 * are not found are omitted from the returned array.
 *
 * @public
 * @memberof Grid.prototype
 * @param {GridMultiItemQuery} [targets]
 * @returns {Item[]}
 */
Grid.prototype.getItems = function(targets) {
  // Return all items immediately if no targets were provided or if the
  // instance is destroyed.
  if (this._isDestroyed || (!targets && targets !== 0)) {
    return this._items.slice(0);
  }

  var ret = [];
  var targetItems = toArray(targets);
  var item;
  var i;

  // If target items are defined return filtered results.
  for (i = 0; i < targetItems.length; i++) {
    item = this._getItem(targetItems[i]);
    item && ret.push(item);
  }

  return ret;
};

/**
 * Update the cached dimensions of the instance's items.
 *
 * @public
 * @memberof Grid.prototype
 * @param {GridMultiItemQuery} [items]
 * @returns {Grid}
 */
Grid.prototype.refreshItems = function(items) {
  if (this._isDestroyed) return this;

  var targets = this.getItems(items);
  var i;

  for (i = 0; i < targets.length; i++) {
    targets[i]._refreshDimensions();
  }

  return this;
};

/**
 * Update the sort data of the instance's items.
 *
 * @public
 * @memberof Grid.prototype
 * @param {GridMultiItemQuery} [items]
 * @returns {Grid}
 */
Grid.prototype.refreshSortData = function(items) {
  if (this._isDestroyed) return this;

  var targetItems = this.getItems(items);
  var i;

  for (i = 0; i < targetItems.length; i++) {
    targetItems[i]._refreshSortData();
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
 * @memberof Grid.prototype
 * @returns {Grid}
 */
Grid.prototype.synchronize = function() {
  if (this._isDestroyed) return this;

  var container = this._element;
  var items = this._items;
  var fragment;
  var element;
  var i;

  // Append all elements in order to the container element.
  if (items.length) {
    for (i = 0; i < items.length; i++) {
      element = items[i]._element;
      if (element.parentNode === container) {
        fragment = fragment || window.document.createDocumentFragment();
        fragment.appendChild(element);
      }
    }

    if (fragment) container.appendChild(fragment);
  }

  // Emit synchronize event.
  this._emit(eventSynchronize);

  return this;
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
Grid.prototype.layout = function(instant, onFinish) {
  if (this._isDestroyed) return this;

  var inst = this;
  var element = this._element;
  var layout = this._updateLayout();
  var layoutId = layout.id;
  var itemsLength = layout.items.length;
  var counter = itemsLength;
  var isBorderBox;
  var item;
  var i;

  // The finish function, which will be used for checking if all the items
  // have laid out yet. After all items have finished their animations call
  // callback and emit layoutEnd event. Only emit layoutEnd event if there
  // hasn't been a new layout call during this layout.
  function tryFinish() {
    if (--counter > 0) return;

    var hasLayoutChanged = inst._layout.id !== layoutId;
    var callback = isFunction(instant) ? instant : onFinish;

    if (isFunction(callback)) {
      callback(hasLayoutChanged, layout.items.slice(0));
    }

    if (!hasLayoutChanged && inst._hasListeners(eventLayoutEnd)) {
      inst._emit(eventLayoutEnd, layout.items.slice(0));
    }
  }

  // If grid's width or height was modified, we need to update it's cached
  // dimensions. Also keep in mind that grid's cached width/height should
  // always equal to what elem.getBoundingClientRect() would return, so
  // therefore we need to add the grid element's borders to the dimensions if
  // it's box-sizing is border-box. Note that we support providing the
  // dimensions as a string here too so that one can define the unit of the
  // dimensions, in which case we don't do the border-box check.
  if (
    (layout.setHeight && typeof layout.height === numberType) ||
    (layout.setWidth && typeof layout.width === numberType)
  ) {
    isBorderBox = getStyle(element, 'box-sizing') === 'border-box';
  }
  if (layout.setHeight) {
    if (typeof layout.height === numberType) {
      element.style.height =
        (isBorderBox ? layout.height + this._borderTop + this._borderBottom : layout.height) + 'px';
    } else {
      element.style.height = layout.height;
    }
  }
  if (layout.setWidth) {
    if (typeof layout.width === numberType) {
      element.style.width =
        (isBorderBox ? layout.width + this._borderLeft + this._borderRight : layout.width) + 'px';
    } else {
      element.style.width = layout.width;
    }
  }

  // Emit layoutStart event. Note that this is intentionally emitted after the
  // container element's dimensions are set, because otherwise there would be
  // no hook for reacting to container dimension changes.
  if (this._hasListeners(eventLayoutStart)) {
    this._emit(eventLayoutStart, layout.items.slice(0));
  }

  // If there are no items let's finish quickly.
  if (!itemsLength) {
    tryFinish();
    return this;
  }

  // If there are items let's position them.
  for (i = 0; i < itemsLength; i++) {
    item = layout.items[i];
    if (!item) continue;

    // Update item's position.
    item._left = layout.slots[i * 2];
    item._top = layout.slots[i * 2 + 1];

    // Layout item if it is not dragged.
    item.isDragging() ? tryFinish() : item._layout.start(instant === true, tryFinish);
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
 * @memberof Grid.prototype
 * @param {(HTMLElement|HTMLElement[])} elements
 * @param {Object} [options]
 * @param {Number} [options.index=-1]
 * @param {Boolean} [options.isActive]
 * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
 * @returns {Item[]}
 */
Grid.prototype.add = function(elements, options) {
  if (this._isDestroyed || !elements) return [];

  var newItems = toArray(elements);
  if (!newItems.length) return newItems;

  var opts = options || 0;
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var items = this._items;
  var needsLayout = false;
  var item;
  var i;

  // Map provided elements into new grid items.
  for (i = 0; i < newItems.length; i++) {
    item = new Item(this, newItems[i], opts.isActive);
    newItems[i] = item;

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

  // Add the new items to the items collection to correct index.
  arrayInsert(items, newItems, opts.index);

  // Emit add event.
  if (this._hasListeners(eventAdd)) {
    this._emit(eventAdd, newItems.slice(0));
  }

  // If layout is needed.
  if (needsLayout && layout) {
    this.layout(layout === instantLayout, isFunction(layout) ? layout : undefined);
  }

  return newItems;
};

/**
 * Remove items from the instance.
 *
 * @public
 * @memberof Grid.prototype
 * @param {GridMultiItemQuery} items
 * @param {Object} [options]
 * @param {Boolean} [options.removeElements=false]
 * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
 * @returns {Item[]}
 */
Grid.prototype.remove = function(items, options) {
  if (this._isDestroyed) return this;

  var opts = options || 0;
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var needsLayout = false;
  var allItems = this.getItems();
  var targetItems = this.getItems(items);
  var indices = [];
  var item;
  var i;

  // Remove the individual items.
  for (i = 0; i < targetItems.length; i++) {
    item = targetItems[i];
    indices.push(allItems.indexOf(item));
    if (item._isActive) needsLayout = true;
    item._destroy(opts.removeElements);
  }

  // Emit remove event.
  if (this._hasListeners(eventRemove)) {
    this._emit(eventRemove, targetItems.slice(0), indices);
  }

  // If layout is needed.
  if (needsLayout && layout) {
    this.layout(layout === instantLayout, isFunction(layout) ? layout : undefined);
  }

  return targetItems;
};

/**
 * Show instance items.
 *
 * @public
 * @memberof Grid.prototype
 * @param {GridMultiItemQuery} items
 * @param {Object} [options]
 * @param {Boolean} [options.instant=false]
 * @param {ShowCallback} [options.onFinish]
 * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.show = function(items, options) {
  if (this._isDestroyed) return this;
  this._setItemsVisibility(items, true, options);
  return this;
};

/**
 * Hide instance items.
 *
 * @public
 * @memberof Grid.prototype
 * @param {GridMultiItemQuery} items
 * @param {Object} [options]
 * @param {Boolean} [options.instant=false]
 * @param {HideCallback} [options.onFinish]
 * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.hide = function(items, options) {
  if (this._isDestroyed) return this;
  this._setItemsVisibility(items, false, options);
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
 * @memberof Grid.prototype
 * @param {(Function|String)} predicate
 * @param {Object} [options]
 * @param {Boolean} [options.instant=false]
 * @param {FilterCallback} [options.onFinish]
 * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.filter = function(predicate, options) {
  if (this._isDestroyed || !this._items.length) return this;

  var itemsToShow = [];
  var itemsToHide = [];
  var isPredicateString = typeof predicate === stringType;
  var isPredicateFn = isFunction(predicate);
  var opts = options || 0;
  var isInstant = opts.instant === true;
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var onFinish = isFunction(opts.onFinish) ? opts.onFinish : null;
  var tryFinishCounter = -1;
  var tryFinish = noop;
  var item;
  var i;

  // If we have onFinish callback, let's create proper tryFinish callback.
  if (onFinish) {
    tryFinish = function() {
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
      onFinish: tryFinish,
      layout: false
    });
  } else {
    tryFinish();
  }

  // Hide items that need to be hidden.
  if (itemsToHide.length) {
    this.hide(itemsToHide, {
      instant: isInstant,
      onFinish: tryFinish,
      layout: false
    });
  } else {
    tryFinish();
  }

  // If there are any items to filter.
  if (itemsToShow.length || itemsToHide.length) {
    // Emit filter event.
    if (this._hasListeners(eventFilter)) {
      this._emit(eventFilter, itemsToShow.slice(0), itemsToHide.slice(0));
    }

    // If layout is needed.
    if (layout) {
      this.layout(layout === instantLayout, isFunction(layout) ? layout : undefined);
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
 * @memberof Grid.prototype
 * @param {(Function|Item[]|String|String[])} comparer
 * @param {Object} [options]
 * @param {Boolean} [options.descending=false]
 * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
 * @returns {Grid}
 */
Grid.prototype.sort = (function() {
  var sortComparer;
  var isDescending;
  var origItems;
  var indexMap;

  function parseCriteria(data) {
    return data
      .trim()
      .split(' ')
      .map(function(val) {
        return val.split(':');
      });
  }

  function getIndexMap(items) {
    var ret = {};
    for (var i = 0; i < items.length; i++) {
      ret[items[i]._id] = i;
    }
    return ret;
  }

  function compareIndices(itemA, itemB) {
    var indexA = indexMap[itemA._id];
    var indexB = indexMap[itemB._id];
    return isDescending ? indexB - indexA : indexA - indexB;
  }

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
    // have a stable sort.
    if (!result) {
      if (!indexMap) indexMap = getIndexMap(origItems);
      result = compareIndices(a, b);
    }
    return result;
  }

  function customComparer(a, b) {
    var result = sortComparer(a, b);
    // If descending let's invert the result value.
    if (isDescending && result) result = -result;
    // If we have a valid result (not zero) let's return it right away.
    if (result) return result;
    // If result is zero let's compare the item indices to make sure we have a
    // stable sort.
    if (!indexMap) indexMap = getIndexMap(origItems);
    return compareIndices(a, b);
  }

  return function(comparer, options) {
    if (this._isDestroyed || this._items.length < 2) return this;

    var items = this._items;
    var opts = options || 0;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var i;

    // Setup parent scope data.
    sortComparer = comparer;
    isDescending = !!opts.descending;
    origItems = items.slice(0);
    indexMap = null;

    // If function is provided do a native array sort.
    if (isFunction(sortComparer)) {
      items.sort(customComparer);
    }
    // Otherwise if we got a string, let's sort by the sort data as provided in
    // the instance's options.
    else if (typeof sortComparer === stringType) {
      sortComparer = parseCriteria(comparer);
      items.sort(defaultComparer);
    }
    // Otherwise if we got an array, let's assume it's a presorted array of the
    // items and order the items based on it.
    else if (Array.isArray(sortComparer)) {
      if (sortComparer.length !== items.length) {
        throw new Error('[' + namespace + '] sort reference items do not match with grid items.');
      }
      for (i = 0; i < items.length; i++) {
        if (sortComparer.indexOf(items[i]) < 0) {
          throw new Error('[' + namespace + '] sort reference items do not match with grid items.');
        }
        items[i] = sortComparer[i];
      }
      if (isDescending) items.reverse();
    }
    // Otherwise let's just skip it, nothing we can do here.
    else {
      /** @todo Maybe throw an error here? */
      return this;
    }

    // Emit sort event.
    if (this._hasListeners(eventSort)) {
      this._emit(eventSort, items.slice(0), origItems);
    }

    // If layout is needed.
    if (layout) {
      this.layout(layout === instantLayout, isFunction(layout) ? layout : undefined);
    }

    return this;
  };
})();

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
Grid.prototype.move = function(item, position, options) {
  if (this._isDestroyed || this._items.length < 2) return this;

  var items = this._items;
  var opts = options || 0;
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var isSwap = opts.action === actionSwap;
  var action = isSwap ? actionSwap : actionMove;
  var fromItem = this._getItem(item);
  var toItem = this._getItem(position);
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
    if (this._hasListeners(eventMove)) {
      this._emit(eventMove, {
        item: fromItem,
        fromIndex: fromIndex,
        toIndex: toIndex,
        action: action
      });
    }

    // If layout is needed.
    if (layout) {
      this.layout(layout === instantLayout, isFunction(layout) ? layout : undefined);
    }
  }

  return this;
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
Grid.prototype.send = function(item, grid, position, options) {
  if (this._isDestroyed || grid._isDestroyed || this === grid) return this;

  // Make sure we have a valid target item.
  item = this._getItem(item);
  if (!item) return this;

  var opts = options || 0;
  var container = opts.appendTo || window.document.body;
  var layoutSender = opts.layoutSender ? opts.layoutSender : opts.layoutSender === undefined;
  var layoutReceiver = opts.layoutReceiver
    ? opts.layoutReceiver
    : opts.layoutReceiver === undefined;

  // Start the migration process.
  item._migrate.start(grid, position, container);

  // If migration was started successfully and the item is active, let's layout
  // the grids.
  if (item._migrate._isActive && item._isActive) {
    if (layoutSender) {
      this.layout(
        layoutSender === instantLayout,
        isFunction(layoutSender) ? layoutSender : undefined
      );
    }
    if (layoutReceiver) {
      grid.layout(
        layoutReceiver === instantLayout,
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
 * @memberof Grid.prototype
 * @param {Boolean} [removeElements=false]
 * @returns {Grid}
 */
Grid.prototype.destroy = function(removeElements) {
  if (this._isDestroyed) return this;

  var container = this._element;
  var items = this._items.slice(0);
  var i;

  // Unbind window resize event listener.
  if (this._resizeHandler) {
    window.removeEventListener('resize', this._resizeHandler);
  }

  // Destroy items.
  for (i = 0; i < items.length; i++) {
    items[i]._destroy(removeElements);
  }

  // Restore container.
  removeClass(container, this._settings.containerClass);
  container.style.height = '';
  container.style.width = '';

  // Emit destroy event and unbind all events.
  this._emit(eventDestroy);
  this._emitter.destroy();

  // Remove reference from the grid instances collection.
  gridInstances[this._id] = undefined;

  // Flag instance as destroyed.
  this._isDestroyed = true;

  return this;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Get instance's item by element or by index. Target can also be an Item
 * instance in which case the function returns the item if it exists within
 * related Grid instance. If nothing is found with the provided target, null
 * is returned.
 *
 * @private
 * @memberof Grid.prototype
 * @param {GridSingleItemQuery} [target]
 * @returns {?Item}
 */
Grid.prototype._getItem = function(target) {
  // If no target is specified or the instance is destroyed, return null.
  if (this._isDestroyed || (!target && target !== 0)) {
    return null;
  }

  // If target is number return the item in that index. If the number is lower
  // than zero look for the item starting from the end of the items array. For
  // example -1 for the last item, -2 for the second last item, etc.
  if (typeof target === numberType) {
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
  /** @todo This could be made a lot faster by using Map/WeakMap of elements. */
  for (var i = 0; i < this._items.length; i++) {
    if (this._items[i]._element === target) {
      return this._items[i];
    }
  }

  return null;
};

/**
 * Recalculates and updates instance's layout data.
 *
 * @private
 * @memberof Grid.prototype
 * @returns {LayoutData}
 */
Grid.prototype._updateLayout = function() {
  var layout = this._layout;
  var settings = this._settings.layout;
  var width;
  var height;
  var newLayout;
  var i;

  // Let's increment layout id.
  ++layout.id;

  // Let's update layout items
  layout.items.length = 0;
  for (i = 0; i < this._items.length; i++) {
    if (this._items[i]._isActive) layout.items.push(this._items[i]);
  }

  // Let's make sure we have the correct container dimensions.
  this._refreshDimensions();

  // Calculate container width and height (without borders).
  width = this._width - this._borderLeft - this._borderRight;
  height = this._height - this._borderTop - this._borderBottom;

  // Calculate new layout.
  if (isFunction(settings)) {
    newLayout = settings(layout.items, width, height);
  } else {
    newLayout = packer.getLayout(layout.items, width, height, layout.slots, settings);
  }

  // Let's update the grid's layout.
  layout.slots = newLayout.slots;
  layout.setWidth = Boolean(newLayout.setWidth);
  layout.setHeight = Boolean(newLayout.setHeight);
  layout.width = newLayout.width;
  layout.height = newLayout.height;

  return layout;
};

/**
 * Emit a grid event.
 *
 * @private
 * @memberof Grid.prototype
 * @param {String} event
 * @param {...*} [arg]
 */
Grid.prototype._emit = function() {
  if (this._isDestroyed) return;
  this._emitter.emit.apply(this._emitter, arguments);
};

/**
 * Check if there are any events listeners for an event.
 *
 * @private
 * @memberof Grid.prototype
 * @param {String} event
 * @returns {Boolean}
 */
Grid.prototype._hasListeners = function(event) {
  var listeners = this._emitter._events[event];
  return !!(listeners && listeners.length);
};

/**
 * Update container's width, height and offsets.
 *
 * @private
 * @memberof Grid.prototype
 */
Grid.prototype._updateBoundingRect = function() {
  var element = this._element;
  var rect = element.getBoundingClientRect();
  this._width = rect.width;
  this._height = rect.height;
  this._left = rect.left;
  this._top = rect.top;
};

/**
 * Update container's border sizes.
 *
 * @private
 * @memberof Grid.prototype
 * @param {Boolean} left
 * @param {Boolean} right
 * @param {Boolean} top
 * @param {Boolean} bottom
 */
Grid.prototype._updateBorders = function(left, right, top, bottom) {
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
 * @memberof Grid.prototype
 */
Grid.prototype._refreshDimensions = function() {
  this._updateBoundingRect();
  this._updateBorders(1, 1, 1, 1);
};

/**
 * Show or hide Grid instance's items.
 *
 * @private
 * @memberof Grid.prototype
 * @param {GridMultiItemQuery} items
 * @param {Boolean} toVisible
 * @param {Object} [options]
 * @param {Boolean} [options.instant=false]
 * @param {(ShowCallback|HideCallback)} [options.onFinish]
 * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
 */
Grid.prototype._setItemsVisibility = function(items, toVisible, options) {
  var grid = this;
  var targetItems = this.getItems(items);
  var opts = options || 0;
  var isInstant = opts.instant === true;
  var callback = opts.onFinish;
  var layout = opts.layout ? opts.layout : opts.layout === undefined;
  var counter = targetItems.length;
  var startEvent = toVisible ? eventShowStart : eventHideStart;
  var endEvent = toVisible ? eventShowEnd : eventHideEnd;
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

  // Emit showStart/hideStart event.
  if (this._hasListeners(startEvent)) {
    this._emit(startEvent, targetItems.slice(0));
  }

  // Show/hide items.
  for (i = 0; i < targetItems.length; i++) {
    item = targetItems[i];

    // If inactive item is shown or active item is hidden we need to do
    // layout.
    if ((toVisible && !item._isActive) || (!toVisible && item._isActive)) {
      needsLayout = true;
    }

    // If inactive item is shown we also need to do a little hack to make the
    // item not animate it's next positioning (layout).
    if (toVisible && !item._isActive) {
      item._layout._skipNextAnimation = true;
    }

    // If a hidden item is being shown we need to refresh the item's
    // dimensions.
    if (toVisible && item._visibility._isHidden) {
      hiddenItems.push(item);
    }

    // Show/hide the item.
    item._visibility[method](isInstant, function(interrupted, item) {
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

  // Refresh hidden items.
  if (hiddenItems.length) this.refreshItems(hiddenItems);

  // Layout if needed.
  if (needsLayout && layout) {
    this.layout(layout === instantLayout, isFunction(layout) ? layout : undefined);
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
  var ret = mergeObjects({}, defaultSettings);

  // Merge user settings to default settings.
  if (userSettings) {
    ret = mergeObjects(ret, userSettings);
  }

  // Handle visible/hidden styles manually so that the whole object is
  // overridden instead of the props.
  ret.visibleStyles = (userSettings || 0).visibleStyles || (defaultSettings || 0).visibleStyles;
  ret.hiddenStyles = (userSettings || 0).hiddenStyles || (defaultSettings || 0).hiddenStyles;

  return ret;
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

export default Grid;
