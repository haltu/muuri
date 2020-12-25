/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import {
  ACTION_MOVE,
  ACTION_SWAP,
  INSTANT_LAYOUT,
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

import Item, { ItemInternal } from '../Item/Item';
import ItemDrag from '../Item/ItemDrag';
import ItemDragPlaceholder from '../Item/ItemDragPlaceholder';
import ItemLayout, { ItemLayoutInternal } from '../Item/ItemLayout';
import ItemMigrate from '../Item/ItemMigrate';
import ItemDragRelease from '../Item/ItemDragRelease';
import ItemVisibility from '../Item/ItemVisibility';
import Emitter from '../Emitter/Emitter';
import Animator from '../Animator/Animator';
import Packer, { LayoutOptions } from '../Packer/Packer';
import Dragger, {
  DraggerCssPropsOptions,
  DraggerListenerOptions,
  DraggerStartEvent,
  DraggerMoveEvent,
  DraggerEndEvent,
  DraggerCancelEvent,
} from '../Dragger/Dragger';
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
import isNodeListOrHTMLCollection from '../utils/isNodeListOrHTMLCollection';
import isPlainObject from '../utils/isPlainObject';
import removeClass from '../utils/removeClass';
import setStyles from '../utils/setStyles';
import toArray from '../utils/toArray';

import { StyleDeclaration, ScrollEvent, Writeable, RectExtended } from '../types';

export type InstantLayout = typeof INSTANT_LAYOUT;

export type MoveAction = typeof ACTION_MOVE | typeof ACTION_SWAP;

export interface GridEvents {
  synchronize(): any;
  layoutStart(items: Item[], isInstant: boolean): any;
  layoutEnd(items: Item[]): any;
  layoutAbort(items: Item[]): any;
  add(items: Item[]): any;
  remove(items: Item[], indices: number[]): any;
  showStart(items: Item[]): any;
  showEnd(items: Item[]): any;
  hideStart(items: Item[]): any;
  hideEnd(items: Item[]): any;
  filter(shownItems: Item[], hiddenItems: Item[]): any;
  sort(currentOrder: Item[], previousOrder: Item[]): any;
  move(data: { item: Item; fromIndex: number; toIndex: number; action: MoveAction }): any;
  send(data: { item: Item; fromGrid: Grid; fromIndex: number; toGrid: Grid; toIndex: number }): any;
  beforeSend(data: {
    item: Item;
    fromGrid: Grid;
    fromIndex: number;
    toGrid: Grid;
    toIndex: number;
  }): any;
  receive(data: {
    item: Item;
    fromGrid: Grid;
    fromIndex: number;
    toGrid: Grid;
    toIndex: number;
  }): any;
  beforeReceive(data: {
    item: Item;
    fromGrid: Grid;
    fromIndex: number;
    toGrid: Grid;
    toIndex: number;
  }): any;
  dragInit(item: Item, event: DraggerStartEvent | DraggerMoveEvent): any;
  dragStart(item: Item, event: DraggerStartEvent | DraggerMoveEvent): any;
  dragMove(item: Item, event: DraggerMoveEvent): any;
  dragScroll(item: Item, event: ScrollEvent): any;
  dragEnd(item: Item, event: DraggerEndEvent | DraggerCancelEvent): any;
  dragReleaseStart(item: Item): any;
  dragReleaseEnd(item: Item): any;
  destroy(): any;
}

export interface LayoutData {
  id: number;
  items: Item[];
  slots: number[] | Float32Array;
  styles?: StyleDeclaration | null;
  [key: string]: any;
}

export type LayoutOnFinish = (items: Item[], isAborted: boolean) => any;

export type LayoutCallback = (layout: LayoutData) => any;

export type LayoutCancel = (...args: any[]) => any;

export type LayoutFunction = (
  layoutId: number,
  grid: Grid,
  items: Item[],
  containerData: {
    width: number;
    height: number;
    borderLeft: number;
    borderRight: number;
    borderTop: number;
    borderBottom: number;
    boxSizing: 'border-box' | 'content-box' | '';
  },
  callback: LayoutCallback
) => void | undefined | LayoutCancel;

export type DragStartPredicate = (
  item: Item,
  event: DraggerStartEvent | DraggerMoveEvent | DraggerEndEvent | DraggerCancelEvent
) => boolean | undefined;

export interface DragStartPredicateOptions {
  distance?: number;
  delay?: number;
}

export type DragSortGetter = (item: Item) => Grid[] | null | void | undefined;

export interface DragSortHeuristicsOptions {
  sortInterval?: number;
  minDragDistance?: number;
  minBounceBackAngle?: number;
}

export type DragSortPredicateResult = {
  grid: Grid;
  index: number;
  action: MoveAction;
} | null;

export type DragSortPredicate = (
  item: Item,
  event: DraggerMoveEvent | DraggerEndEvent | DraggerCancelEvent
) => DragSortPredicateResult;

export interface DragSortPredicateOptions {
  threshold?: number;
  action?: MoveAction;
  migrateAction?: MoveAction;
}

export interface DragReleaseOptions {
  duration?: number;
  easing?: string;
  useDragContainer?: boolean;
}

export interface DragPlaceholderOptions {
  enabled?: boolean;
  createElement?: ((item: Item) => HTMLElement) | null;
  onCreate?: ((item: Item, placeholderElement: HTMLElement) => any) | null;
  onRemove?: ((item: Item, placeholderElement: HTMLElement) => any) | null;
}

export interface DragAutoScrollTarget {
  element: Window | HTMLElement;
  axis?: number;
  priority?: number;
  threshold?: number;
}

export type DragAutoScrollTargets = Array<Window | HTMLElement | DragAutoScrollTarget>;

export type DragAutoScrollTargetsGetter = (item: Item) => DragAutoScrollTargets;

export type DragAutoScrollOnStart = (
  item: Item,
  scrollElement: Window | HTMLElement,
  scrollDirection: number
) => any;

export type DragAutoScrollOnStop = (
  item: Item,
  scrollElement: Window | HTMLElement,
  scrollDirection: number
) => any;

export type DragAutoScrollHandle = (
  item: Item,
  itemClientX: number,
  itemClientY: number,
  itemWidth: number,
  itemHeight: number,
  pointerClientX: number,
  pointerClientY: number
) => {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DragAutoScrollSpeed = (
  item: Item,
  scrollElement: Window | HTMLElement,
  scrollData: {
    direction: number;
    threshold: number;
    distance: number;
    value: number;
    maxValue: number;
    duration: number;
    speed: number;
    deltaTime: number;
    isEnding: boolean;
  }
) => number;

export interface DragAutoScrollOptions {
  targets?: DragAutoScrollTargets | DragAutoScrollTargetsGetter;
  handle?: DragAutoScrollHandle | null;
  threshold?: number;
  safeZone?: number;
  speed?: number | DragAutoScrollSpeed;
  sortDuringScroll?: boolean;
  smoothStop?: boolean;
  onStart?: DragAutoScrollOnStart | null;
  onStop?: DragAutoScrollOnStop | null;
}

export interface GridSettings {
  items: HTMLElement[] | NodeList | HTMLCollection | string;
  layoutOnInit: boolean;
  showDuration: number;
  showEasing: string;
  visibleStyles: StyleDeclaration;
  hideDuration: number;
  hideEasing: string;
  hiddenStyles: StyleDeclaration;
  layout: Required<LayoutOptions> | LayoutFunction;
  layoutOnResize: boolean | number;
  layoutDuration: number;
  layoutEasing: string;
  sortData: { [key: string]: (item: Item, element: HTMLElement) => any } | null;
  dragEnabled: boolean;
  dragHandle: string | null;
  dragContainer: HTMLElement | null;
  dragStartPredicate: Required<DragStartPredicateOptions> | DragStartPredicate;
  dragAxis: 'x' | 'y' | 'xy';
  dragSort: boolean | DragSortGetter;
  dragSortHeuristics: Required<DragSortHeuristicsOptions>;
  dragSortPredicate: Required<DragSortPredicateOptions> | DragSortPredicate;
  dragRelease: Required<DragReleaseOptions>;
  dragCssProps: Required<DraggerCssPropsOptions>;
  dragEventListenerOptions: Required<DraggerListenerOptions>;
  dragPlaceholder: Required<DragPlaceholderOptions>;
  dragAutoScroll: Required<DragAutoScrollOptions>;
  containerClass: string;
  itemClass: string;
  itemVisibleClass: string;
  itemHiddenClass: string;
  itemPositioningClass: string;
  itemDraggingClass: string;
  itemReleasingClass: string;
  itemPlaceholderClass: string;
  _animationWindowing: boolean;
}

export interface GridInitOptions extends Partial<GridSettings> {}

export interface GridOptions
  extends Partial<
    Omit<
      GridSettings,
      | 'items'
      | 'layoutOnInit'
      | 'layout'
      | 'dragStartPredicate'
      | 'dragSortHeuristics'
      | 'dragSortPredicate'
      | 'dragRelease'
      | 'dragCssProps'
      | 'dragEventListenerOptions'
      | 'dragPlaceholder'
      | 'dragAutoScroll'
    >
  > {
  layout?: LayoutOptions | LayoutFunction;
  dragStartPredicate?: DragStartPredicateOptions | DragStartPredicate;
  dragSortHeuristics?: DragSortHeuristicsOptions;
  dragSortPredicate?: DragSortPredicateOptions | DragSortPredicate;
  dragRelease?: DragReleaseOptions;
  dragCssProps?: DraggerCssPropsOptions;
  dragEventListenerOptions?: DraggerListenerOptions;
  dragPlaceholder?: DragPlaceholderOptions;
  dragAutoScroll?: DragAutoScrollOptions;
}

let layoutId = 0;

/**
 * Merge default settings with user settings. The returned object is a new
 * object with merged values. The merging is a deep merge meaning that all
 * objects and arrays within the provided settings objects will be also merged
 * so that modifying the values of the settings object will have no effect on
 * the returned object.
 *
 * @param {Object} baseSettings
 * @param {Object} [overrides={}]
 * @returns {Object}
 */
function createSettings(
  baseSettings: GridSettings,
  overrides: GridSettings | GridInitOptions | GridOptions = {}
) {
  // Create a fresh copy of default settings.
  let newSettings = mergeObjects({} as GridSettings, baseSettings) as GridSettings;

  // Merge user settings to default settings.
  newSettings = mergeObjects(newSettings, overrides) as GridSettings;

  // Handle visible/hidden styles manually so that the whole object is
  // overridden instead of the props.
  if (overrides.visibleStyles) {
    newSettings.visibleStyles = { ...overrides.visibleStyles };
  } else if (baseSettings.visibleStyles) {
    newSettings.visibleStyles = { ...baseSettings.visibleStyles };
  }
  if (overrides.hiddenStyles) {
    newSettings.hiddenStyles = { ...overrides.hiddenStyles };
  } else if (baseSettings.hiddenStyles) {
    newSettings.hiddenStyles = { ...baseSettings.hiddenStyles };
  }

  return newSettings;
}

/**
 * Merge two objects recursively (deep merge). The source object's properties
 * are merged to the target object.
 *
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
function mergeObjects(target: { [key: string]: any }, source: { [key: string]: any }) {
  const sourceKeys = Object.keys(source);
  const length = sourceKeys.length;
  let i = 0;

  for (; i < length; i++) {
    const propName = sourceKeys[i];
    const isSourceObject = isPlainObject(source[propName]);

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
 * @param {(HTMLElement[]|NodeList|HtmlCollection|string)} elements
 * @returns {(HTMLElement[]|NodeList|HtmlCollection)}
 */
function getInitialGridElements(
  gridElement: HTMLElement,
  elements: HTMLElement[] | NodeList | HTMLCollection | string
) {
  // If we have a wildcard selector let's return all the children.
  if (elements === '*') {
    return gridElement.children;
  }

  // If we have some more specific selector, let's filter the elements.
  if (typeof elements === 'string') {
    const result: HTMLElement[] = [];
    const children = gridElement.children;
    let i = 0;
    for (; i < children.length; i++) {
      if (elementMatches(children[i] as HTMLElement, elements)) {
        result.push(children[i] as HTMLElement);
      }
    }
    return result;
  }

  // If we have an array of elements or a node list.
  if (Array.isArray(elements) || isNodeListOrHTMLCollection(elements)) {
    return elements;
  }

  // Otherwise just return an empty array.
  return [];
}

/**
 * Normalize style declaration object, returns a normalized (new) styles object
 * (prefixed properties and invalid properties removed).
 *
 * @param {Object} styles
 * @returns {Object}
 */
function normalizeStyles(styles: StyleDeclaration) {
  const normalized: StyleDeclaration = {};
  const docElemStyle = document.documentElement.style;
  let prop: string;
  let prefixedProp: string;

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
function createIndexMap(items: Item[]) {
  const result: { [key: number]: number } = {};
  let i = 0;
  for (; i < items.length; i++) {
    result[items[i].id] = i;
  }
  return result;
}

/**
 * Sort comparer function for items' index map.
 *
 * @param {Object} indexMap
 * @param {Item} itemA
 * @param {Item} itemB
 * @returns {number}
 */
function compareIndexMap(indexMap: { [key: number]: number }, itemA: Item, itemB: Item) {
  const indexA = indexMap[itemA.id];
  const indexB = indexMap[itemB.id];
  return indexA - indexB;
}

/**
 * Check if the provided objects have same keys and and values.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
function isEqualObjects(a: { [key: string]: any }, b: { [key: string]: any }) {
  let key: string;
  for (key in a) {
    if (a[key] !== b[key]) return false;
  }
  return Object.keys(a).length === Object.keys(b).length;
}

/**
 * Creates a new Grid instance.
 *
 * @class
 * @param {(HTMLElement|string)} element
 * @param {Object} [options]
 * @param {(string|HTMLElement[]|NodeList|HTMLCollection)} [options.items="*"]
 * @param {number} [options.showDuration=300]
 * @param {string} [options.showEasing="ease"]
 * @param {Object} [options.visibleStyles={opacity: "1", transform: "scale(1)"}]
 * @param {number} [options.hideDuration=300]
 * @param {string} [options.hideEasing="ease"]
 * @param {Object} [options.hiddenStyles={opacity: "0", transform: "scale(0.5)"}]
 * @param {(Function|Object)} [options.layout]
 * @param {boolean} [options.layout.fillGaps=false]
 * @param {boolean} [options.layout.horizontal=false]
 * @param {boolean} [options.layout.alignRight=false]
 * @param {boolean} [options.layout.alignBottom=false]
 * @param {boolean} [options.layout.rounding=false]
 * @param {(boolean|number)} [options.layoutOnResize=150]
 * @param {boolean} [options.layoutOnInit=true]
 * @param {number} [options.layoutDuration=300]
 * @param {string} [options.layoutEasing="ease"]
 * @param {?Object} [options.sortData=null]
 * @param {boolean} [options.dragEnabled=false]
 * @param {?string} [options.dragHandle=null]
 * @param {?HTMLElement} [options.dragContainer=null]
 * @param {?Function} [options.dragStartPredicate]
 * @param {number} [options.dragStartPredicate.distance=0]
 * @param {number} [options.dragStartPredicate.delay=0]
 * @param {string} [options.dragAxis="xy"]
 * @param {(boolean|Function)} [options.dragSort=true]
 * @param {Object} [options.dragSortHeuristics]
 * @param {number} [options.dragSortHeuristics.sortInterval=100]
 * @param {number} [options.dragSortHeuristics.minDragDistance=10]
 * @param {number} [options.dragSortHeuristics.minBounceBackAngle=1]
 * @param {(Function|Object)} [options.dragSortPredicate]
 * @param {number} [options.dragSortPredicate.threshold=50]
 * @param {string} [options.dragSortPredicate.action="move"]
 * @param {string} [options.dragSortPredicate.migrateAction="move"]
 * @param {Object} [options.dragRelease]
 * @param {number} [options.dragRelease.duration=300]
 * @param {string} [options.dragRelease.easing="ease"]
 * @param {boolean} [options.dragRelease.useDragContainer=true]
 * @param {Object} [options.dragCssProps]
 * @param {string} [options.dragCssProps.touchAction="none"]
 * @param {string} [options.dragCssProps.userSelect="none"]
 * @param {string} [options.dragCssProps.userDrag="none"]
 * @param {string} [options.dragCssProps.tapHighlightColor="rgba(0, 0, 0, 0)"]
 * @param {string} [options.dragCssProps.touchCallout="none"]
 * @param {string} [options.dragCssProps.contentZooming="none"]
 * @param {Object} [options.dragEventListenerOptions]
 * @param {boolean} [options.dragEventListenerOptions.capture=false]
 * @param {boolean} [options.dragEventListenerOptions.passive=true]
 * @param {Object} [options.dragPlaceholder]
 * @param {boolean} [options.dragPlaceholder.enabled=false]
 * @param {?Function} [options.dragPlaceholder.createElement=null]
 * @param {?Function} [options.dragPlaceholder.onCreate=null]
 * @param {?Function} [options.dragPlaceholder.onRemove=null]
 * @param {Object} [options.dragAutoScroll]
 * @param {(Function|Array)} [options.dragAutoScroll.targets=[]]
 * @param {?Function} [options.dragAutoScroll.handle=null]
 * @param {number} [options.dragAutoScroll.threshold=50]
 * @param {number} [options.dragAutoScroll.safeZone=0.2]
 * @param {(Function|number)} [options.dragAutoScroll.speed]
 * @param {boolean} [options.dragAutoScroll.sortDuringScroll=true]
 * @param {boolean} [options.dragAutoScroll.smoothStop=false]
 * @param {?Function} [options.dragAutoScroll.onStart=null]
 * @param {?Function} [options.dragAutoScroll.onStop=null]
 * @param {string} [options.containerClass="muuri"]
 * @param {string} [options.itemClass="muuri-item"]
 * @param {string} [options.itemVisibleClass="muuri-item-visible"]
 * @param {string} [options.itemHiddenClass="muuri-item-hidden"]
 * @param {string} [options.itemPositioningClass="muuri-item-positioning"]
 * @param {string} [options.itemDraggingClass="muuri-item-dragging"]
 * @param {string} [options.itemReleasingClass="muuri-item-releasing"]
 * @param {string} [options.itemPlaceholderClass="muuri-item-placeholder"]
 * @param {boolean} [options._animationWindowing=false]
 */
export default class Grid {
  readonly id: number;
  readonly element: HTMLElement;
  readonly settings: GridSettings;
  readonly items: Item[];
  protected _isDestroyed: boolean;
  protected _rect: RectExtended;
  protected _borderLeft: number;
  protected _borderRight: number;
  protected _borderTop: number;
  protected _borderBottom: number;
  protected _boxSizing: 'content-box' | 'border-box' | '';
  protected _layout: LayoutData;
  protected _isLayoutFinished: boolean;
  protected _nextLayoutData: {
    id: number;
    instant: boolean;
    onFinish?: LayoutOnFinish;
    cancel?: LayoutCancel | null;
  } | null;
  protected _resizeHandler: ReturnType<typeof debounce> | null;
  protected _emitter: Emitter;

  constructor(element: string | HTMLElement, options: GridInitOptions = {}) {
    // Allow passing element as selector string
    if (typeof element === 'string') {
      const queriedElement = document.querySelector(element) as HTMLElement | null;
      if (!queriedElement) throw new Error('No container element found.');
      element = queriedElement;
    }

    // Throw an error if the container element is not body element or does not
    // exist within the body element.
    const isElementInDom = element.getRootNode
      ? element.getRootNode({ composed: true }) === document
      : document.body.contains(element);
    if (!isElementInDom || element === document.documentElement) {
      throw new Error('Container element must be an existing DOM element.');
    }

    // Create instance settings by merging the options with default options.
    const settings: GridSettings = createSettings(Grid.defaultOptions, options);
    settings.visibleStyles = normalizeStyles(settings.visibleStyles);
    settings.hiddenStyles = normalizeStyles(settings.hiddenStyles);

    this.id = createUid();
    this.element = element;
    this.settings = settings;
    this.items = [];

    this._isDestroyed = false;
    this._rect = { width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 };
    this._borderLeft = 0;
    this._borderRight = 0;
    this._borderTop = 0;
    this._borderBottom = 0;
    this._boxSizing = '';

    this._layout = {
      id: 0,
      items: [],
      slots: [],
    };
    this._isLayoutFinished = true;
    this._nextLayoutData = null;
    this._resizeHandler = null;
    this._emitter = new Emitter();

    // Store grid instance to the grid instances collection.
    GRID_INSTANCES.set(this.id, this);

    // Add container element's class name.
    addClass(element, settings.containerClass);

    // If layoutOnResize option is a valid number sanitize it and bind the resize
    // handler.
    this._bindLayoutOnResize(settings.layoutOnResize);

    // Add initial items.
    this.add(getInitialGridElements(element, settings.items), { layout: false });

    // Layout on init if necessary.
    if (settings.layoutOnInit) {
      this.layout(true);
    }
  }

  static Item = Item;
  static ItemLayout = ItemLayout;
  static ItemVisibility = ItemVisibility;
  static ItemMigrate = ItemMigrate;
  static ItemDrag = ItemDrag;
  static ItemDragRelease = ItemDragRelease;
  static ItemDragPlaceholder = ItemDragPlaceholder;
  static Emitter = Emitter;
  static Animator = Animator;
  static Dragger = Dragger;
  static Packer = Packer;
  static AutoScroller = AutoScroller;
  static defaultPacker: Packer = new Packer();
  static defaultOptions: GridSettings = {
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
    dragEventListenerOptions: {
      passive: true,
      capture: false,
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

    // Experimental animation optimization (animate only items that are in the
    // viewport).
    _animationWindowing: false,
  };

  /**
   * Bind an event listener.
   *
   * @public
   * @param {string} event
   * @param {Function} listener
   * @returns {Grid}
   */
  on<T extends keyof GridEvents>(event: T, listener: GridEvents[T]) {
    this._emitter.on(event, listener);
    return this;
  }

  /**
   * Unbind an event listener.
   *
   * @public
   * @param {string} event
   * @param {Function} listener
   * @returns {Grid}
   */
  off<T extends keyof GridEvents>(event: T, listener: GridEvents[T]) {
    this._emitter.off(event, listener);
    return this;
  }

  /**
   * Check if the grid is destroyed.
   *
   * @public
   * @returns {Boolean}
   */
  isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * Get instance's item by element or by index. Target can also be an Item
   * instance in which case the function returns the item if it exists within
   * related Grid instance. If nothing is found with the provided target, null
   * is returned.
   *
   * @public
   * @param {(HTMLElement|Item|number)} [target]
   * @returns {?Item}
   */
  getItem(target?: HTMLElement | Item | number) {
    // If no target is specified or the instance is destroyed, return null.
    if (this._isDestroyed || (!target && target !== 0)) {
      return null;
    }

    // If target is number return the item in that index. If the number is lower
    // than zero look for the item starting from the end of the items array. For
    // example -1 for the last item, -2 for the second last item, etc.
    if (typeof target === 'number') {
      return this.items[target > -1 ? target : this.items.length + target] || null;
    }

    // If the target is an instance of Item return it if it is attached to this
    // Grid instance, otherwise return null.
    if (target instanceof Item) {
      return ((target as any) as ItemInternal)._gridId === this.id ? target : null;
    }

    // In other cases let's assume that the target is an element, so let's try
    // to find an item that matches the element and return it. If item is not
    // found return null.
    const item = ITEM_ELEMENT_MAP.get(target);
    return item && ((item as any) as ItemInternal)._gridId === this.id ? item : null;
  }

  /**
   * Get all items. Optionally you can provide specific targets (elements,
   * indices and item instances). All items that are not found are omitted from
   * the returned array.
   *
   * @public
   * @param {(HTMLElement|Item|number|Array)} [targets]
   * @returns {Item[]}
   */
  getItems(
    targets?:
      | HTMLElement
      | Item
      | number
      | (HTMLElement | Item | number)[]
      | NodeList
      | HTMLCollection
  ) {
    // Return all items immediately if no targets were provided or if the
    // instance is destroyed.
    if (this._isDestroyed || targets === undefined) {
      return this.items.slice(0);
    }

    const items: Item[] = [];

    if (Array.isArray(targets) || isNodeListOrHTMLCollection(targets)) {
      let item: Item | null;
      let i = 0;
      for (; i < targets.length; i++) {
        item = this.getItem(targets[i] as HTMLElement | Item | number);
        if (item) items.push(item);
      }
    } else {
      const item = this.getItem(targets);
      if (item) items.push(item);
    }

    return items;
  }

  /**
   * Update the grid's settings.
   *
   * @public
   * @param {Object} options
   * @returns {Grid}
   */
  updateSettings(options: GridOptions) {
    if (this._isDestroyed || !options) return this;

    const { settings, items } = this;
    const itemClasses = [];

    let dragEnabledChanged = false;
    let dragHandleChanged = false;
    let dragCssPropsChanged = false;
    let dragEventListenerOptionsChanged = false;
    let visibleStylesChanged = false;
    let hiddenStylesChanged = false;

    // Create new settings object.
    const nextSettings = createSettings(settings, options);
    nextSettings.visibleStyles = normalizeStyles(nextSettings.visibleStyles);
    nextSettings.hiddenStyles = normalizeStyles(nextSettings.hiddenStyles);

    // Update internal settings object.
    (this as Writeable<Grid>).settings = nextSettings;

    // Handle all options that need special care.
    for (let option in options) {
      switch (option) {
        case 'visibleStyles': {
          visibleStylesChanged = !isEqualObjects(settings[option], nextSettings[option]);
          break;
        }

        case 'hiddenStyles': {
          hiddenStylesChanged = !isEqualObjects(settings[option], nextSettings[option]);
          break;
        }

        case 'dragEnabled': {
          dragEnabledChanged = settings[option] !== nextSettings[option];
          break;
        }

        case 'dragHandle': {
          dragHandleChanged = settings[option] !== nextSettings[option];
          break;
        }

        case 'dragCssProps': {
          dragCssPropsChanged = !isEqualObjects(settings[option], nextSettings[option]);
          break;
        }

        case 'dragEventListenerOptions': {
          dragEventListenerOptionsChanged = !isEqualObjects(settings[option], nextSettings[option]);
          break;
        }

        case 'layoutOnResize': {
          if (settings[option] !== nextSettings[option]) {
            this._unbindLayoutOnResize();
            this._bindLayoutOnResize(nextSettings[option]);
          }
          break;
        }

        case 'containerClass': {
          if (settings[option] !== nextSettings[option]) {
            removeClass(this.element, settings[option]);
            addClass(this.element, nextSettings[option]);
          }
          break;
        }

        case 'itemClass':
        case 'itemVisibleClass':
        case 'itemHiddenClass':
        case 'itemPositioningClass':
        case 'itemDraggingClass':
        case 'itemReleasingClass':
        case 'itemPlaceholderClass': {
          if (settings[option] !== nextSettings[option]) {
            itemClasses.push(option, settings[option], nextSettings[option]);
          }
          break;
        }
      }
    }

    // If any property changed that needs updating in the item level, let's loop
    // through the items and do the updates.
    if (
      itemClasses.length ||
      visibleStylesChanged ||
      hiddenStylesChanged ||
      dragEnabledChanged ||
      dragHandleChanged ||
      dragCssPropsChanged ||
      dragEventListenerOptionsChanged
    ) {
      let i: number;
      let j: number;
      for (i = 0; i < items.length; i++) {
        const item = (items[i] as any) as ItemInternal;

        // Handle item class name changes.
        for (j = 0; j < itemClasses.length; j += 3) {
          const option = itemClasses[j];
          const currentValue = itemClasses[j + 1];
          const nextValue = itemClasses[j + 2];
          let switchClass = false;

          switch (option) {
            case 'itemClass': {
              switchClass = true;
              break;
            }
            case 'itemVisibleClass': {
              switchClass = item.isVisible();
              break;
            }
            case 'itemHiddenClass': {
              switchClass = !item.isVisible();
              break;
            }
            case 'itemPositioningClass': {
              switchClass = item.isPositioning();
              break;
            }
            case 'itemDraggingClass': {
              switchClass = item.isDragging();
              break;
            }
            case 'itemReleasingClass': {
              switchClass = item.isReleasing();
              break;
            }
            case 'itemPlaceholderClass': {
              if (item._dragPlaceholder) item._dragPlaceholder.updateClassName(nextValue);
              break;
            }
          }

          if (switchClass) {
            removeClass(item.element, currentValue);
            addClass(item.element, nextValue);
          }
        }

        // Handle visibleStyles/hiddenStyles change.
        if (item.isActive()) {
          if (visibleStylesChanged) {
            item._visibility.setStyles(nextSettings.visibleStyles);
            item._visibility.stop(true);
          }
        } else {
          if (hiddenStylesChanged) {
            item._visibility.setStyles(nextSettings.hiddenStyles);
            item._visibility.stop(true);
          }
        }

        if (
          (dragHandleChanged || dragEnabledChanged) &&
          item._drag &&
          item._drag.getRootGrid() === this
        ) {
          item._drag.destroy();
          item._drag = null;
        }

        if (nextSettings.dragEnabled) {
          if (item._drag) {
            if (item._drag.getRootGrid() === this) {
              if (dragCssPropsChanged) {
                item._drag.dragger.setCssProps(nextSettings.dragCssProps);
              }
              if (dragEventListenerOptionsChanged) {
                item._drag.dragger.setListenerOptions(nextSettings.dragEventListenerOptions);
              }
            }
          } else {
            item._drag = new ItemDrag((item as any) as Item);
          }
        }
      }
    }

    // Lastly, update sort data if it potentially changed.
    if ('sortData' in options) {
      this.refreshSortData();
    }

    return this;
  }

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
   * @param {boolean} [force=false]
   * @returns {Grid}
   */
  refreshItems(items?: Item[], force = false) {
    if (this._isDestroyed) return this;

    const targets = ((items || this.items) as any) as ItemInternal[];

    let i: number;
    let item: ItemInternal;
    let style: CSSStyleDeclaration;
    let hiddenItemStyles: CSSStyleDeclaration[] | undefined;

    if (force === true) {
      hiddenItemStyles = [];
      for (i = 0; i < targets.length; i++) {
        item = targets[i];
        if (!item.isVisible() && !item.isHiding()) {
          style = item.element.style;
          style.visibility = 'hidden';
          style.display = '';
          hiddenItemStyles.push(style);
        }
      }
    }

    for (i = 0; i < targets.length; i++) {
      targets[i]._updateDimensions(force);
    }

    if (hiddenItemStyles) {
      for (i = 0; i < hiddenItemStyles.length; i++) {
        style = hiddenItemStyles[i];
        style.visibility = '';
        style.display = 'none';
      }
      hiddenItemStyles.length = 0;
    }

    return this;
  }

  /**
   * Update the sort data of the instance's items. By default all the items are
   * refreshed, but you can also provide an array of target items if you want to
   * refresh specific items.
   *
   * @public
   * @param {Item[]} [items]
   * @returns {Grid}
   */
  refreshSortData(items?: Item[]) {
    if (this._isDestroyed) return this;

    const targets = ((items || this.items) as any) as ItemInternal[];
    let i = 0;
    for (; i < targets.length; i++) {
      targets[i]._updateSortData();
    }

    return this;
  }

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
  synchronize() {
    if (this._isDestroyed) return this;

    const { items } = this;
    if (!items.length) return this;

    let fragment: DocumentFragment | undefined;
    let element: HTMLElement;
    let i = 0;

    for (; i < items.length; i++) {
      element = items[i].element;
      if (element.parentNode === this.element) {
        if (!fragment) fragment = document.createDocumentFragment();
        fragment.appendChild(element);
      }
    }

    if (!fragment) return this;

    this.element.appendChild(fragment);
    this._emit(EVENT_SYNCHRONIZE);

    return this;
  }

  /**
   * Calculate and apply item positions.
   *
   * @public
   * @param {boolean} [instant=false]
   * @param {Function} [onFinish]
   * @returns {Grid}
   */
  layout(instant = false, onFinish?: LayoutOnFinish) {
    if (this._isDestroyed) return this;

    // Cancel unfinished layout algorithm if possible.
    const unfinishedLayout = this._nextLayoutData;
    if (unfinishedLayout && isFunction(unfinishedLayout.cancel)) {
      unfinishedLayout.cancel();
    }

    // Compute layout id (let's stay in Float32 range).
    const nextLayoutId = (layoutId = (layoutId % MAX_SAFE_FLOAT32_INTEGER) + 1);

    // Store data for next layout.
    this._nextLayoutData = {
      id: nextLayoutId,
      instant: instant,
      onFinish: onFinish,
      cancel: null,
    };

    // Collect layout items (all active grid items).
    const { items } = this;
    const layoutItems: Item[] = [];
    let i = 0;
    for (; i < items.length; i++) {
      if (items[i].isActive()) layoutItems.push(items[i]);
    }

    // TODO: This causes forced reflows. As we already have async layout system
    // Maybe we could always postpone this to the next tick's read queue and
    // then start the layout process in the write tick?
    this._updateDimensions();

    const containerData = {
      width: this._rect.width - this._borderLeft - this._borderRight,
      height: this._rect.height - this._borderTop - this._borderBottom,
      borderLeft: this._borderLeft,
      borderRight: this._borderRight,
      borderTop: this._borderTop,
      borderBottom: this._borderBottom,
      boxSizing: this._boxSizing,
    };
    const { layout } = this.settings;
    let cancelLayout: LayoutCancel | null | undefined | void;

    // Compute new layout.
    if (isFunction(layout)) {
      cancelLayout = layout(nextLayoutId, this, layoutItems, containerData, (layoutData) => {
        this._onLayoutDataReceived(layoutData);
      });
    } else {
      Grid.defaultPacker.updateSettings(layout);
      cancelLayout = Grid.defaultPacker.createLayout(
        nextLayoutId,
        layoutItems,
        containerData,
        (layoutData) => {
          this._onLayoutDataReceived({ ...layoutData, items: layoutItems });
        }
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
  }

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
   * @param {number} [options.index=-1]
   * @param {boolean} [options.active]
   * @param {(boolean|Function|string)} [options.layout=true]
   * @returns {Item[]}
   */
  add(
    elements: HTMLElement | HTMLElement[] | NodeList | HTMLCollection,
    options: {
      index?: number;
      active?: boolean;
      layout?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    if (this._isDestroyed || !elements) return [];

    const newElements = toArray(elements) as HTMLElement[];
    if (!newElements.length) return [];

    const layout = options.layout ? options.layout : options.layout === undefined;
    const { items } = this;

    let needsLayout = false;
    let fragment: DocumentFragment | undefined;
    let element: HTMLElement;
    let item: Item;
    let i: number;

    // Collect all the elements that are not child of the grid element into a
    // document fragment.
    for (i = 0; i < newElements.length; i++) {
      element = newElements[i];
      if (element.parentNode !== this.element) {
        fragment = fragment || document.createDocumentFragment();
        fragment.appendChild(element);
      }
    }

    // If we have a fragment, let's append it to the grid element. We could just
    // not do this and the `new Item()` instantiation would handle this for us,
    // but this way we can add the elements into the DOM a bit faster.
    if (fragment) {
      this.element.appendChild(fragment);
    }

    // Map provided elements into new grid items.
    const newItems: Item[] = [];
    for (i = 0; i < newElements.length; i++) {
      element = newElements[i];
      item = newItems[i] = new Item(this, element, options.active);

      // If the item to be added is active, we need to do a layout. Also, we
      // need to mark the item with the skipNextAnimation flag to make it
      // position instantly (without animation) during the next layout. Without
      // the hack the item would animate to it's new position from the northwest
      // corner of the grid, which feels a bit buggy (imho).
      if (item.isActive()) {
        needsLayout = true;
        ((((item as any) as ItemInternal)
          ._layout as any) as ItemLayoutInternal)._skipNextAnimation = true;
      }
    }

    // Set up the items' initial dimensions and sort data. This needs to be done
    // in a separate loop to avoid layout thrashing.
    for (i = 0; i < newItems.length; i++) {
      item = newItems[i];
      ((item as any) as ItemInternal)._updateDimensions();
      ((item as any) as ItemInternal)._updateSortData();
    }

    // Add the new items to the items collection to correct index.
    arrayInsert(items, newItems, options.index);

    // Emit add event.
    if (this._hasListeners(EVENT_ADD)) {
      this._emit(EVENT_ADD, newItems.slice(0));
    }

    // If layout is needed.
    if (needsLayout && layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }

    return newItems;
  }

  /**
   * Remove items from the instance.
   *
   * @public
   * @param {Item[]} items
   * @param {Object} [options]
   * @param {boolean} [options.removeElements=false]
   * @param {(boolean|Function|string)} [options.layout=true]
   * @returns {Item[]}
   */
  remove(
    items: Item[],
    options: {
      removeElements?: boolean;
      layout?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    if (this._isDestroyed || !items.length) return [];

    const layout = options.layout ? options.layout : options.layout === undefined;
    const allItems = this.getItems();
    const targetItems: Item[] = [];
    const indices: number[] = [];

    let needsLayout = false;
    let index: number;
    let item: Item;
    let i: number;

    // Remove the individual items.
    for (i = 0; i < items.length; i++) {
      item = items[i];
      if (item.isDestroyed()) continue;

      index = this.items.indexOf(item);
      if (index === -1) continue;

      if (item.isActive()) needsLayout = true;

      targetItems.push(item);
      indices.push(allItems.indexOf(item));
      ((item as any) as ItemInternal)._destroy(options.removeElements);
      this.items.splice(index, 1);
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
  }

  /**
   * Show specific instance items.
   *
   * @public
   * @param {Item[]} items
   * @param {Object} [options]
   * @param {boolean} [options.instant=false]
   * @param {boolean} [options.syncWithLayout=true]
   * @param {Function} [options.onFinish]
   * @param {(boolean|Function|string)} [options.layout=true]
   * @returns {Grid}
   */
  show(
    items: Item[],
    options: {
      instant?: boolean;
      syncWithLayout?: boolean;
      onFinish?: (items: Item[]) => any;
      layout?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    if (!this._isDestroyed && items.length) {
      this._setItemsVisibility(items, true, options);
    }
    return this;
  }

  /**
   * Hide specific instance items.
   *
   * @public
   * @param {Item[]} items
   * @param {Object} [options]
   * @param {boolean} [options.instant=false]
   * @param {boolean} [options.syncWithLayout=true]
   * @param {Function} [options.onFinish]
   * @param {(boolean|Function|string)} [options.layout=true]
   * @returns {Grid}
   */
  hide(
    items: Item[],
    options: {
      instant?: boolean;
      syncWithLayout?: boolean;
      onFinish?: (items: Item[]) => any;
      layout?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    if (!this._isDestroyed && items.length) {
      this._setItemsVisibility(items, false, options);
    }
    return this;
  }

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
   * @param {(Function|string)} predicate
   * @param {Object} [options]
   * @param {boolean} [options.instant=false]
   * @param {boolean} [options.syncWithLayout=true]
   * @param {FilterCallback} [options.onFinish]
   * @param {(boolean|Function|string)} [options.layout=true]
   * @returns {Grid}
   */
  filter(
    predicate: string | ((item: Item) => boolean),
    options: {
      instant?: boolean;
      syncWithLayout?: boolean;
      onFinish?: (shownItems: Item[], hiddenItems: Item[]) => any;
      layout?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    if (this._isDestroyed || !this.items.length) return this;

    // Check which items need to be shown and which hidden.
    const itemsToShow: Item[] = [];
    const itemsToHide: Item[] = [];
    if (isFunction(predicate) || typeof predicate === 'string') {
      let item: Item;
      let i: number;
      for (i = 0; i < this.items.length; i++) {
        item = this.items[i];
        if (isFunction(predicate) ? predicate(item) : elementMatches(item.element, predicate)) {
          itemsToShow.push(item);
        } else {
          itemsToHide.push(item);
        }
      }
    }

    const onFinish = isFunction(options.onFinish) ? options.onFinish : undefined;
    let shownItems: Item[] = [];
    let hiddenItems: Item[] = [];
    let finishCounter = -1;

    // Show items that need to be shown.
    if (itemsToShow.length) {
      this.show(itemsToShow, {
        instant: !!options.instant,
        syncWithLayout: !!options.syncWithLayout,
        onFinish: onFinish
          ? (items) => {
              shownItems = items;
              ++finishCounter && onFinish(shownItems, hiddenItems);
            }
          : undefined,
        layout: false,
      });
    } else if (onFinish) {
      ++finishCounter && onFinish(shownItems, hiddenItems);
    }

    // Hide items that need to be hidden.
    if (itemsToHide.length) {
      this.hide(itemsToHide, {
        instant: !!options.instant,
        syncWithLayout: !!options.syncWithLayout,
        onFinish: onFinish
          ? (items) => {
              hiddenItems = items;
              ++finishCounter && onFinish(shownItems, hiddenItems);
            }
          : undefined,
        layout: false,
      });
    } else if (onFinish) {
      ++finishCounter && onFinish(shownItems, hiddenItems);
    }

    // If there are any items to filter.
    if (itemsToShow.length || itemsToHide.length) {
      // Emit filter event.
      if (this._hasListeners(EVENT_FILTER)) {
        this._emit(EVENT_FILTER, itemsToShow.slice(0), itemsToHide.slice(0));
      }

      // If layout is needed.
      const layout = options.layout ? options.layout : options.layout === undefined;
      if (layout) {
        this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
      }
    }

    return this;
  }

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
   * @param {(Function|string|Item[])} comparer
   * @param {Object} [options]
   * @param {boolean} [options.descending=false]
   * @param {(boolean|Function|string)} [options.layout=true]
   * @returns {Grid}
   */
  sort(
    comparer: ((a: Item, b: Item) => number) | string | Item[],
    options: {
      descending?: boolean;
      layout?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    if (this._isDestroyed || this.items.length < 2) return this;

    const { items } = this;
    const origItems = items.slice(0);
    const layout = options.layout ? options.layout : options.layout === undefined;
    const isDescending = !!options.descending;
    let indexMap: null | { [key: number]: number } = null;

    // If function is provided do a native array sort.
    if (isFunction(comparer)) {
      items.sort((a: Item, b: Item) => {
        let result = isDescending ? -comparer(a, b) : comparer(a, b);
        if (!result) {
          if (!indexMap) indexMap = createIndexMap(origItems);
          result = isDescending ? compareIndexMap(indexMap, b, a) : compareIndexMap(indexMap, a, b);
        }
        return result;
      });
    }
    // Otherwise if we got a string, let's sort by the sort data as provided in
    // the instance's options.
    else if (typeof comparer === 'string') {
      const sortCriteria = comparer
        .trim()
        .split(' ')
        .filter(function (val) {
          return val;
        })
        .map(function (val) {
          return val.split(':');
        });

      ((items as any) as ItemInternal[]).sort((a: ItemInternal, b: ItemInternal) => {
        let result = 0;
        let i = 0;

        // Loop through the list of sort criteria.
        for (; i < sortCriteria.length; i++) {
          // Get the criteria name, which should match an item's sort data key.
          const criteriaName = sortCriteria[i][0];
          const criteriaOrder = sortCriteria[i][1];

          // Get items' cached sort values for the criteria. If the item has no sort
          // data let's update the items sort data (this is a lazy load mechanism).
          if (a._sortData === null) a._updateSortData();
          if (b._sortData === null) b._updateSortData();
          const valA = (a._sortData as { [key: string]: any })[criteriaName];
          const valB = (b._sortData as { [key: string]: any })[criteriaName];

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
          result = isDescending
            ? compareIndexMap(indexMap, (b as any) as Item, (a as any) as Item)
            : compareIndexMap(indexMap, (a as any) as Item, (b as any) as Item);
        }
        return result;
      });
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

    return this;
  }

  /**
   * Move item to another index or in place of another item.
   *
   * @public
   * @param {(Item|HTMLElement|number)} item
   * @param {(Item|HTMLElement|number)} position
   * @param {Object} [options]
   * @param {string} [options.action="move"]
   * @param {(boolean|Function|string)} [options.layout=true]
   * @returns {Grid}
   */
  move(
    item: Item | HTMLElement | number,
    position: Item | HTMLElement | number,
    options: {
      action?: MoveAction;
      layout?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    if (this._isDestroyed || this.items.length < 2) return this;

    const { items } = this;
    const layout = options.layout ? options.layout : options.layout === undefined;
    const isSwap = options.action === ACTION_SWAP;
    const action = isSwap ? ACTION_SWAP : ACTION_MOVE;
    const fromItem = this.getItem(item);
    const toItem = this.getItem(position);

    // Make sure the items exist and are not the same.
    if (fromItem && toItem && fromItem !== toItem) {
      // Get the indices of the items.
      const fromIndex = items.indexOf(fromItem);
      const toIndex = items.indexOf(toItem);

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
  }

  /**
   * Send item to another Grid instance.
   *
   * @public
   * @param {(Item|HTMLElement|number)} item
   * @param {Grid} targetGrid
   * @param {(Item|HTMLElement|number)} position
   * @param {Object} [options]
   * @param {HTMLElement} [options.appendTo=document.body]
   * @param {(boolean|Function|string)} [options.layoutSender=true]
   * @param {(boolean|Function|string)} [options.layoutReceiver=true]
   * @returns {Grid}
   */
  send(
    item: Item | HTMLElement | number,
    targetGrid: Grid,
    position: Item | HTMLElement | number,
    options: {
      appendTo?: HTMLElement;
      layoutSender?: boolean | InstantLayout | LayoutOnFinish;
      layoutReceiver?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    if (this._isDestroyed || targetGrid._isDestroyed || this === targetGrid) return this;

    // Make sure we have a valid target item.
    const targetItem = this.getItem(item) as ItemInternal | null;
    if (!targetItem) return this;

    // Start the migration process.
    targetItem._migrate.start(targetGrid, position, options.appendTo || document.body);

    // If migration was started successfully and the item is active, let's layout
    // the grids.
    if (targetItem._migrate.isActive() && targetItem.isActive()) {
      const layoutSender = options.layoutSender
        ? options.layoutSender
        : options.layoutSender === undefined;

      const layoutReceiver = options.layoutReceiver
        ? options.layoutReceiver
        : options.layoutReceiver === undefined;

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
  }

  /**
   * Destroy the instance.
   *
   * @public
   * @param {boolean} [removeElements=false]
   * @returns {Grid}
   */
  destroy(removeElements = false) {
    if (this._isDestroyed) return this;

    const container = this.element;
    const items = (this.getItems() as any) as ItemInternal[];
    const layoutStyles = (this._layout && this._layout.styles) || {};

    // Unbind window resize event listener.
    this._unbindLayoutOnResize();

    // Destroy items.
    let i = 0;
    for (; i < items.length; i++) items[i]._destroy(removeElements);
    this.items.length = 0;

    // Restore container.
    removeClass(container, this.settings.containerClass);
    let prop: any;
    for (prop in layoutStyles) container.style[prop] = '';

    // Remove reference from the grid instances collection.
    GRID_INSTANCES.delete(this.id);

    // Flag instance as destroyed. It's important to set this to `true` before
    // emitting the destroy event to avoid potential infinite loop.
    this._isDestroyed = true;

    // Emit destroy event and unbind all events. Note that we can't use the
    // grid's _emit method for emitting this event because it shortcircuits if
    // _isDestroyed flag is true.
    this._emitter.emit(EVENT_DESTROY);
    this._emitter.destroy();

    return this;
  }

  /**
   * Emit a grid event.
   *
   * @protected
   * @param {string} event
   * @param {...*} [args]
   */
  protected _emit<T extends keyof GridEvents>(event: T, ...args: Parameters<GridEvents[T]>) {
    if (this._isDestroyed) return;
    this._emitter.emit(event, ...args);
  }

  /**
   * Check if there are any events listeners for an event.
   *
   * @protected
   * @param {string} event
   * @returns {boolean}
   */
  protected _hasListeners<T extends keyof GridEvents>(event: T) {
    if (this._isDestroyed) return false;
    return this._emitter.countListeners(event) > 0;
  }

  /**
   * Update container's width, height and offsets.
   *
   * @protected
   */
  protected _updateBoundingRect() {
    this._rect = { ...this.element.getBoundingClientRect() };
  }

  /**
   * Update container's border sizes.
   *
   * @protected
   * @param {boolean} left
   * @param {boolean} right
   * @param {boolean} top
   * @param {boolean} bottom
   */
  protected _updateBorders(left: boolean, right: boolean, top: boolean, bottom: boolean) {
    const { element } = this;
    if (left) this._borderLeft = getStyleAsFloat(element, 'border-left-width');
    if (right) this._borderRight = getStyleAsFloat(element, 'border-right-width');
    if (top) this._borderTop = getStyleAsFloat(element, 'border-top-width');
    if (bottom) this._borderBottom = getStyleAsFloat(element, 'border-bottom-width');
  }

  /**
   * Refresh all of container's internal dimensions and offsets.
   *
   * @protected
   */
  protected _updateDimensions() {
    this._updateBoundingRect();
    this._updateBorders(true, true, true, true);
    this._boxSizing = getStyle(this.element, 'box-sizing') as 'border-box' | 'content-box' | '';
  }

  /**
   * Bind grid's resize handler to window.
   *
   * @protected
   * @param {(number|boolean)} delay
   */
  protected _bindLayoutOnResize(delay: number | boolean) {
    if (typeof delay !== 'number') {
      delay = delay === true ? 0 : -1;
    }

    if (delay >= 0) {
      this._resizeHandler = debounce(() => {
        this.refreshItems().layout();
      }, delay);

      window.addEventListener('resize', this._resizeHandler as () => void);
    }
  }

  /**
   * Unbind grid's resize handler from window.
   *
   * @protected
   * @param {Grid} grid
   */
  protected _unbindLayoutOnResize() {
    const { _resizeHandler } = this;
    if (isFunction(_resizeHandler)) {
      _resizeHandler(true);
      window.removeEventListener('resize', this._resizeHandler as () => void);
      this._resizeHandler = null;
    }
  }

  /**
   * Calculate and apply item positions.
   *
   * @protected
   * @param {Object} layout
   */
  protected _onLayoutDataReceived(layout: LayoutData) {
    if (this._isDestroyed || !this._nextLayoutData || this._nextLayoutData.id !== layout.id) return;

    const instant = this._nextLayoutData.instant;
    const onFinish = this._nextLayoutData.onFinish;
    const numItems = layout.items.length;
    let counter = numItems;
    let item: Item;
    let left: number;
    let top: number;
    let i: number;

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
    const itemsToLayout = [];
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
      if (((item as any) as ItemInternal)._canSkipLayout(left, top)) {
        --counter;
        continue;
      }

      // Update the item's position.
      (item as Writeable<Item>).left = left;
      (item as Writeable<Item>).top = top;

      // Only active non-dragged items need to be moved.
      if (item.isActive() && !item.isDragging()) {
        itemsToLayout.push(item);
      } else {
        --counter;
      }
    }

    // Set layout styles to the grid element.
    if (layout.styles) {
      setStyles(this.element, layout.styles);
    }

    // layoutStart event is intentionally emitted after the container element's
    // dimensions are set, because otherwise there would be no hook for reacting
    // to container dimension changes.
    if (this._hasListeners(EVENT_LAYOUT_START)) {
      this._emit(EVENT_LAYOUT_START, layout.items.slice(0), instant);
      // Let's make sure that the current layout process has not been overridden
      // in the layoutStart event, and if so, let's stop processing the aborted
      // layout.
      if (this._layout.id !== layout.id) return;
    }

    const tryFinish = () => {
      if (--counter > 0) return;

      const isAborted = this._layout.id !== layout.id;

      if (!isAborted) {
        this._isLayoutFinished = true;
      }

      if (isFunction(onFinish)) {
        onFinish(layout.items.slice(0), isAborted);
      }

      if (!isAborted && this._hasListeners(EVENT_LAYOUT_END)) {
        this._emit(EVENT_LAYOUT_END, layout.items.slice(0));
      }
    };

    if (!itemsToLayout.length) {
      tryFinish();
      return;
    }

    this._isLayoutFinished = false;

    for (i = 0; i < itemsToLayout.length; i++) {
      if (this._layout.id !== layout.id) break;
      ((itemsToLayout[i] as any) as ItemInternal)._layout.start(instant, tryFinish);
    }

    return;
  }

  /**
   * Show or hide Grid instance's items.
   *
   * @protected
   * @param {Item[]} items
   * @param {boolean} toVisible
   * @param {Object} [options]
   * @param {boolean} [options.instant=false]
   * @param {boolean} [options.syncWithLayout=true]
   * @param {Function} [options.onFinish]
   * @param {(boolean|Function|string)} [options.layout=true]
   */
  protected _setItemsVisibility(
    items: Item[],
    toVisible: boolean,
    options: {
      instant?: boolean;
      syncWithLayout?: boolean;
      onFinish?: (items: Item[]) => void;
      layout?: boolean | InstantLayout | LayoutOnFinish;
    } = {}
  ) {
    const targetItems = items.slice(0);
    const isInstant = options.instant === true;
    const callback = options.onFinish;
    const layout = options.layout ? options.layout : options.layout === undefined;
    const startEvent = toVisible ? EVENT_SHOW_START : EVENT_HIDE_START;
    const endEvent = toVisible ? EVENT_SHOW_END : EVENT_HIDE_END;
    const method = toVisible ? 'show' : 'hide';
    const completedItems: Item[] = [];
    const hiddenItems: Item[] = [];

    let needsLayout = false;
    let counter = targetItems.length;
    let item: ItemInternal;
    let i: number;

    // If there are no items call the callback, but don't emit any events.
    if (!counter) {
      if (isFunction(callback)) callback(targetItems);
      return;
    }

    // Prepare the items.
    for (i = 0; i < targetItems.length; i++) {
      item = (targetItems[i] as any) as ItemInternal;

      // If inactive item is shown or active item is hidden we need to do
      // layout.
      if ((toVisible && !item.isActive()) || (!toVisible && item.isActive())) {
        needsLayout = true;
      }

      // If inactive item is shown we also need to do a little hack to make the
      // item not animate it's next positioning (layout).
      ((item._layout as any) as ItemLayoutInternal)._skipNextAnimation = !!(
        toVisible && !item.isActive()
      );

      // If a hidden item is being shown we need to refresh the item's
      // dimensions.
      if (toVisible && !item.isVisible() && !item.isHiding()) {
        hiddenItems.push((item as any) as Item);
      }

      // Add item to layout or remove it from layout.
      if (toVisible) {
        item._addToLayout();
      } else {
        item._removeFromLayout();
      }
    }

    // Force refresh the dimensions of all hidden items.
    // TODO: How can we avoid this?
    //       - 1. Set item visibility: 'hidden' and display: ''
    //       - 2. Read the dimensions in the next read tick.
    //       - 3. Set item visibility: '' and display: 'none' in the following write tick or maybe just continue the flow there already.
    //       - 4. Continue with the normal flow. To make this simpler we could always do this
    //            one tick delay.
    if (hiddenItems.length) {
      this.refreshItems(hiddenItems, true);
      hiddenItems.length = 0;
    }

    // Show the items in sync with the next layout.
    const triggerVisibilityChange = () => {
      if (needsLayout && options.syncWithLayout !== false) {
        this.off(EVENT_LAYOUT_START, triggerVisibilityChange);
      }

      if (this._hasListeners(startEvent)) {
        this._emit(startEvent, targetItems.slice(0));
      }

      for (i = 0; i < targetItems.length; i++) {
        item = (targetItems[i] as any) as ItemInternal;
        // Make sure the item is still in the original grid. There is a chance
        // that the item starts migrating before tiggerVisibilityChange is called.
        if (item._gridId !== this.id) {
          if (--counter < 1) {
            if (isFunction(callback)) callback(completedItems.slice(0));
            if (this._hasListeners(endEvent)) this._emit(endEvent, completedItems.slice(0));
          }
          continue;
        }

        item._visibility[method](isInstant, (interrupted, item) => {
          // If the current item's animation was not interrupted add it to the
          // completedItems array.
          if (!interrupted) completedItems.push(item);

          // If all items have finished their animations call the callback
          // and emit showEnd/hideEnd event.
          if (--counter < 1) {
            if (isFunction(callback)) callback(completedItems.slice(0));
            if (this._hasListeners(endEvent)) this._emit(endEvent, completedItems.slice(0));
          }
        });
      }
    };

    // Trigger the visibility change, either async with layout or instantly.
    if (needsLayout && options.syncWithLayout !== false) {
      this.on(EVENT_LAYOUT_START, triggerVisibilityChange);
    } else {
      triggerVisibilityChange();
    }

    // Trigger layout if needed.
    if (needsLayout && layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }
  }
}

export interface GridInternal extends Writeable<Grid> {
  _isDestroyed: Grid['_isDestroyed'];
  _rect: Grid['_rect'];
  _borderLeft: Grid['_borderLeft'];
  _borderRight: Grid['_borderRight'];
  _borderTop: Grid['_borderTop'];
  _borderBottom: Grid['_borderBottom'];
  _boxSizing: Grid['_boxSizing'];
  _layout: Grid['_layout'];
  _isLayoutFinished: Grid['_isLayoutFinished'];
  _nextLayoutData: Grid['_nextLayoutData'];
  _resizeHandler: Grid['_resizeHandler'];
  _emitter: Grid['_emitter'];
  _emit: Grid['_emit'];
  _hasListeners: Grid['_hasListeners'];
  _updateBoundingRect: Grid['_updateBoundingRect'];
  _updateBorders: Grid['_updateBorders'];
  _updateDimensions: Grid['_updateDimensions'];
  _onLayoutDataReceived: Grid['_onLayoutDataReceived'];
  _setItemsVisibility: Grid['_setItemsVisibility'];
}
