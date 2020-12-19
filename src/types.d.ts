import Grid from './Grid/Grid';
import Item from './Item/Item';
import {
  DraggerCssPropsOptions,
  DraggerListenerOptions,
  DraggerStartEvent,
  DraggerMoveEvent,
  DraggerEndEvent,
  DraggerCancelEvent,
} from './Dragger/Dragger';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RectExtended extends Rect {
  right: number;
  bottom: number;
}

export interface StyleDeclaration {
  [prop: string]: string;
}

export interface ScrollEvent extends Event {
  type: 'scroll';
}

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
  move(data: { item: Item; fromIndex: number; toIndex: number; action: 'move' | 'swap' }): any;
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

export interface LayoutOptions {
  fillGaps?: boolean;
  horizontal?: boolean;
  alignRight?: boolean;
  alignBottom?: boolean;
  rounding?: boolean;
}

export type LayoutOnFinish = (items: Item[], isAborted: boolean) => any;

export type LayoutFunctionCallback = (layout: LayoutData) => any;

export type LayoutFunctionCancel = (...args: any[]) => any;

export type LayoutFunction = (
  grid: Grid,
  id: number,
  items: Item[],
  gridWidth: number,
  gridHeight: number,
  callback: LayoutFunctionCallback
) => void | undefined | LayoutFunctionCancel;

export type SortDataGetter = (item: Item, element: HTMLElement) => any;

export type DragStartPredicate = (
  item: Item,
  event: DraggerStartEvent | DraggerMoveEvent | DraggerEndEvent | DraggerCancelEvent
) => boolean | undefined;

export interface DragStartPredicateOptions {
  distance?: number;
  delay?: number;
}

export type DragSortGetter = (this: Grid, item: Item) => Grid[] | null | void | undefined;

export interface DragSortHeuristicsOptions {
  sortInterval?: number;
  minDragDistance?: number;
  minBounceBackAngle?: number;
}

export type DragSortPredicateResult = {
  grid: Grid;
  index: number;
  action: 'move' | 'swap';
} | null;

export type DragSortPredicate = (
  item: Item,
  event: DraggerMoveEvent | DraggerEndEvent | DraggerCancelEvent
) => DragSortPredicateResult;

export interface DragSortPredicateOptions {
  threshold?: number;
  action?: 'move' | 'swap';
  migrateAction?: 'move' | 'swap';
}

export interface DragReleaseOptions {
  duration?: number;
  easing?: string;
  useDragContainer?: boolean;
}

export type DragPlaceholderCreateElement = (item: Item) => HTMLElement;

export type DragPlaceholderOnCreate = (item: Item, placeholderElement: HTMLElement) => any;

export type DragPlaceholderOnRemove = (item: Item, placeholderElement: HTMLElement) => any;

export interface DragPlaceholderOptions {
  enabled?: boolean;
  createElement?: DragPlaceholderCreateElement | null;
  onCreate?: DragPlaceholderOnCreate | null;
  onRemove?: DragPlaceholderOnRemove | null;
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
  sortData: { [key: string]: SortDataGetter } | null;
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

//
// CLASSES
//

export class AutoScroller {
  constructor();
  static AXIS_X: 1;
  static AXIS_Y: 2;
  static FORWARD: 4;
  static BACKWARD: 8;
  static LEFT: 9;
  static RIGHT: 5;
  static UP: 10;
  static DOWN: 6;
  static smoothSpeed(
    maxSpeed: number,
    acceleration: number,
    deceleration: number
  ): DragAutoScrollSpeed;
  static pointerHandle(pointerSize: number): DragAutoScrollHandle;
  addItem(item: Item): void;
  updateItem(item: Item): void;
  removeItem(item: Item): void;
  isItemScrollingX(item: Item): boolean;
  isItemScrollingY(item: Item): boolean;
  isItemScrolling(item: Item): boolean;
  destroy(): void;
}

export class Packer {
  constructor(numWorkers?: number, options?: LayoutOptions);
  updateSettings(options?: LayoutOptions): void;
  createLayout(
    grid: Grid,
    id: number,
    items: Item[],
    width: number,
    height: number,
    callback: LayoutFunctionCallback
  ): LayoutFunctionCancel | void;
  cancelLayout(id: number): void;
  destroy(): void;
}
