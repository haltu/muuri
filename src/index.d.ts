export interface StyleDeclaration {
  [styleProperty: string]: string;
}

export type EventListener = (...args: any[]) => any;

export interface DraggerCssProps {
  touchAction?: string;
  userSelect?: string;
  userDrag?: string;
  tapHighlightColor?: string;
  touchCallout?: string;
  contentZooming?: string;
}

export interface DraggerEvent {
  type: 'start' | 'move' | 'end' | 'cancel';
  srcEvent: PointerEvent | TouchEvent | MouseEvent;
  distance: number;
  deltaX: number;
  deltaY: number;
  deltaTime: number;
  isFirst: boolean;
  isFinal: boolean;
  pointerType: 'mouse' | 'pen' | 'touch';
  identifier: number;
  screenX: number;
  screenY: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  target: HTMLElement;
}

export interface DraggerStartEvent extends DraggerEvent {
  type: 'start';
  distance: 0;
  deltaX: 0;
  deltaY: 0;
  deltaTime: 0;
  isFirst: true;
  isFinal: false;
}

export interface DraggerMoveEvent extends DraggerEvent {
  type: 'move';
  isFirst: false;
  isFinal: false;
}

export interface DraggerEndEvent extends DraggerEvent {
  type: 'end';
  isFirst: false;
  isFinal: true;
}

export interface DraggerCancelEvent extends DraggerEvent {
  type: 'cancel';
  isFirst: false;
  isFinal: true;
}

export interface DraggerEvents {
  start(event: DraggerStartEvent): any;
  move(event: DraggerMoveEvent): any;
  end(event: DraggerMoveEvent): any;
  cancel(event: DraggerCancelEvent): any;
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
  slots: number[];
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

export interface DragSortHeuristics {
  sortInterval?: number;
  minDragDistance?: number;
  minBounceBackAngle?: number;
}

export type DragSortPredicateResult = {
  grid: Grid;
  index: number;
  action: 'move' | 'swap';
} | null;

export type DragSortPredicate = (item: Item, event: DraggerMoveEvent) => DragSortPredicateResult;

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

export interface GridOptions {
  items?: HTMLElement[] | NodeList | HTMLCollection | string;
  showDuration?: number;
  showEasing?: string;
  visibleStyles?: StyleDeclaration;
  hideDuration?: number;
  hideEasing?: string;
  hiddenStyles?: StyleDeclaration;
  layout?: LayoutOptions | LayoutFunction;
  layoutOnResize?: boolean | number;
  layoutOnInit?: boolean;
  layoutDuration?: number;
  layoutEasing?: string;
  sortData?: { [key: string]: SortDataGetter } | null;
  dragEnabled?: boolean;
  dragHandle?: string | null;
  dragContainer?: HTMLElement | null;
  dragStartPredicate?: DragStartPredicateOptions | DragStartPredicate;
  dragAxis?: 'x' | 'y' | 'xy';
  dragSort?: boolean | DragSortGetter;
  dragSortHeuristics?: DragSortHeuristics;
  dragSortPredicate?: DragSortPredicateOptions | DragSortPredicate;
  dragRelease?: DragReleaseOptions;
  dragCssProps?: DraggerCssProps;
  dragPlaceholder?: DragPlaceholderOptions;
  dragAutoScroll?: DragAutoScrollOptions;
  containerClass?: string;
  itemClass?: string;
  itemVisibleClass?: string;
  itemHiddenClass?: string;
  itemPositioningClass?: string;
  itemDraggingClass?: string;
  itemReleasingClass?: string;
  itemPlaceholderClass?: string;
}

//
// CLASSES
//

export class Item {
  constructor(grid: Grid, element: HTMLElement, isActive?: boolean);
  getGrid(): Grid | undefined;
  getElement(): HTMLElement | undefined;
  getWidth(): number;
  getHeight(): number;
  getMargin(): { left: number; right: number; top: number; bottom: number };
  getPosition(): { left: number; top: number };
  isActive(): boolean;
  isVisible(): boolean;
  isShowing(): boolean;
  isHiding(): boolean;
  isPositioning(): boolean;
  isDragging(): boolean;
  isReleasing(): boolean;
  isDestroyed(): boolean;
}

export class ItemLayout {
  constructor(item: Item);
  start(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any): void;
  stop(processCallbackQueue: boolean, targetStyles?: StyleDeclaration): void;
  destroy(): void;
}

export class ItemVisibility {
  constructor(item: Item);
  show(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any): void;
  hide(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any): void;
  stop(processCallbackQueue: boolean, applyCurrentStyles?: boolean): void;
  setStyles(styles: StyleDeclaration): void;
  destroy(): void;
}

export class ItemMigrate {
  constructor(item: Item);
  start(targetGrid: Grid, position: HTMLElement | number | Item, container?: HTMLElement): void;
  stop(abort?: boolean, left?: number, top?: number): void;
  destroy(): void;
}

export class ItemDrag {
  constructor(item: Item);
  static autoScroller: AutoScroller;
  static defaultStartPredicate(
    item: Item,
    event: DraggerEvent,
    options?: DragStartPredicateOptions
  ): boolean | undefined;
  static defaultSortPredicate(
    item: Item,
    options?: DragSortPredicateOptions
  ): DragSortPredicateResult;
  stop(): void;
  sort(force?: boolean): void;
  destroy(): void;
}

export class ItemDragRelease {
  constructor(item: Item);
  start(): void;
  stop(abort?: boolean, left?: number, top?: number): void;
  isJustReleased(): boolean;
  destroy(): void;
}

export class ItemDragPlaceholder {
  constructor(item: Item);
  create(): void;
  reset(): void;
  isActive(): boolean;
  getElement(): HTMLElement | null;
  updateDimensions(): void;
  destroy(): void;
}

export class Emitter {
  constructor();
  on(event: string, listener: EventListener): this;
  off(event: string, listener: EventListener): this;
  clear(event: string): this;
  emit(event: string, ...args: any[]): this;
  burst(event: string, ...args: any[]): this;
  countListeners(event: string): number;
  destroy(): this;
}

export class Animator {
  constructor(element: HTMLElement);
  start(
    propsFrom: StyleDeclaration,
    propsTo: StyleDeclaration,
    options?: {
      duration?: number;
      easing?: string;
      onFinish?: (...args: any[]) => any;
    }
  ): void;
  stop(applyCurrentStyles?: boolean): void;
  isAnimating(): boolean;
  destroy(): void;
}

export class Dragger {
  constructor(element: HTMLElement, cssProps?: DraggerCssProps);
  isActive(): boolean;
  setTouchAction(touchAction: string): void;
  setCssProps(props?: DraggerCssProps): void;
  getDeltaX(): number;
  getDeltaY(): number;
  getDistance(): number;
  getDeltaTime(): number;
  on<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void;
  off<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void;
  destroy(): void;
}

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
  setOptions(options?: LayoutOptions): void;
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

export default class Grid {
  constructor(element: string | HTMLElement, options?: GridOptions);

  static Item: typeof Item;

  static ItemLayout: typeof ItemLayout;

  static ItemVisibility: typeof ItemVisibility;

  static ItemMigrate: typeof ItemMigrate;

  static ItemDrag: typeof ItemDrag;

  static ItemDragRelease: typeof ItemDragRelease;

  static ItemDragPlaceholder: typeof ItemDragPlaceholder;

  static Emitter: typeof Emitter;

  static Animator: typeof Animator;

  static Dragger: typeof Dragger;

  static Packer: typeof Packer;

  static AutoScroller: typeof AutoScroller;

  static defaultPacker: Packer;

  static defaultOptions: GridOptions;

  on<T extends keyof GridEvents>(event: T, listener: GridEvents[T]): this;

  off<T extends keyof GridEvents>(event: T, listener: GridEvents[T]): this;

  getElement(): HTMLElement;

  getItem(target: HTMLElement | number | Item): Item | null;

  getItems(targets?: HTMLElement | number | Item | Array<HTMLElement | number | Item>): Item[];

  refreshItems(items?: Item[], force?: boolean): this;

  refreshSortData(items?: Item[]): this;

  synchronize(): this;

  layout(instant?: boolean, onFinish?: LayoutOnFinish): this;

  add(
    elements: HTMLElement | HTMLElement[] | NodeList | HTMLCollection,
    options?: {
      index?: number;
      active?: boolean;
      layout?: boolean | 'instant' | LayoutOnFinish;
    }
  ): Item[];

  remove(
    items: Item[],
    options?: {
      removeElements?: boolean;
      layout?: boolean | 'instant' | LayoutOnFinish;
    }
  ): Item[];

  show(
    items: Item[],
    options?: {
      instant?: boolean;
      syncWithLayout?: boolean;
      onFinish?: (items: Item[]) => any;
      layout?: boolean | 'instant' | LayoutOnFinish;
    }
  ): this;

  hide(
    items: Item[],
    options?: {
      instant?: boolean;
      syncWithLayout?: boolean;
      onFinish?: (items: Item[]) => any;
      layout?: boolean | 'instant' | LayoutOnFinish;
    }
  ): this;

  filter(
    predicate: string | ((item: Item) => boolean),
    options?: {
      instant?: boolean;
      syncWithLayout?: boolean;
      onFinish?: (items: Item[]) => any;
      layout?: boolean | 'instant' | LayoutOnFinish;
    }
  ): this;

  sort(
    comparer: ((a: Item, b: Item) => number) | string | Item[],
    options?: {
      descending?: boolean;
      layout?: boolean | 'instant' | LayoutOnFinish;
    }
  ): this;

  move(
    item: HTMLElement | number | Item,
    position: HTMLElement | number | Item,
    options?: {
      action?: 'move' | 'swap';
      layout?: boolean | 'instant' | LayoutOnFinish;
    }
  ): this;

  send(
    item: HTMLElement | number | Item,
    targetGrid: Grid,
    position: HTMLElement | number | Item,
    options?: {
      appendTo?: HTMLElement;
      layoutSender?: boolean | 'instant' | LayoutOnFinish;
      layoutReceiver?: boolean | 'instant' | LayoutOnFinish;
    }
  ): this;

  destroy(removeElements?: boolean): this;
}

export as namespace Muuri;
