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

export type EventListener = (...args: any[]) => any;

export interface DraggerCssPropsOptions {
  touchAction?: string;
  userSelect?: string;
  userDrag?: string;
  tapHighlightColor?: string;
  touchCallout?: string;
  contentZooming?: string;
}

export interface DraggerListenerOptions {
  capture?: boolean;
  passive?: boolean;
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

export type DraggerAnyEvent =
  | DraggerStartEvent
  | DraggerMoveEvent
  | DraggerCancelEvent
  | DraggerEndEvent;

export interface DraggerEvents {
  start(event: DraggerStartEvent): any;
  move(event: DraggerMoveEvent): any;
  cancel(event: DraggerCancelEvent): any;
  end(event: DraggerEndEvent): any;
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

export interface GridInitOptions extends Partial<Pick<GridSettings, 'items' | 'layoutOnInit'>> {}

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

export class ItemPublic {
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

export class Item extends ItemPublic {
  _id: number;
  _gridId: number;
  _element: HTMLElement;
  _isActive: boolean;
  _isDestroyed: boolean;
  _left: number;
  _top: number;
  _width: number;
  _height: number;
  _marginLeft: number;
  _marginRight: number;
  _marginTop: number;
  _marginBottom: number;
  _translateX?: number;
  _translateY?: number;
  _containerDiffX: number;
  _containerDiffY: number;
  _sortData: { [key: string]: any } | null;
  _emitter: Emitter;
  _visibility: ItemVisibility;
  _layout: ItemLayout;
  _migrate: ItemMigrate;
  _drag: ItemDrag | null;
  _dragRelease: ItemDragRelease;
  _dragPlaceholder: ItemDragPlaceholder;
  _refreshDimensions(force?: boolean): void;
  _refreshSortData(): void;
  _addToLayout(left?: number, top?: number): void;
  _removeFromLayout(): void;
  _canSkipLayout(left: number, top: number): boolean;
  _setTranslate(x: number, y: number): void;
  _getTranslate(): { x: number; y: number };
  _getClientRootPosition(): { left: number; top: number };
  _isInViewport(x: number, y: number, viewportThreshold?: number): boolean;
  _destroy(removeElement?: boolean): void;
}

export class ItemVisibilityPublic {
  constructor(item: Item);
  show(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any): void;
  hide(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any): void;
  stop(processCallbackQueue: boolean): void;
  setStyles(styles: StyleDeclaration): void;
  destroy(): void;
}

export class ItemVisibility extends ItemVisibilityPublic {
  _item: Item;
  _isDestroyed: boolean;
  _isHidden: boolean;
  _isHiding: boolean;
  _isShowing: boolean;
  _childElement: HTMLElement;
  _currentStyleProps: string[];
  _animation: Animator;
  _queue: string;
  _startAnimation(toVisible: boolean, instant: boolean, onFinish?: () => void): void;
  _finishShow(): void;
  _finishHide(): void;
  _removeCurrentStyles(): void;
}

export class ItemLayoutPublic {
  constructor(item: Item);
  start(instant: boolean, onFinish?: () => void): void;
  stop(processCallbackQueue: boolean, left?: number, top?: number): void;
  destroy(): void;
}

export class ItemLayout extends ItemLayoutPublic {
  _item: Item;
  _isActive: boolean;
  _isDestroyed: boolean;
  _isInterrupted: boolean;
  _skipNextAnimation: boolean;
  _easing: string;
  _duration: number;
  _tX: number;
  _tY: number;
  _animation: Animator;
  _queue: string;
  _finish(): void;
  _setupAnimation(): void;
  _startAnimation(): void;
}

export class ItemMigratePublic {
  constructor(item: Item);
  start(targetGrid: Grid, position: HTMLElement | number | Item, container?: HTMLElement): void;
  stop(abort?: boolean, left?: number, top?: number): void;
  destroy(): void;
}

export class ItemMigrate extends ItemMigratePublic {
  _item: Item;
  _isActive: boolean;
  _isDestroyed: boolean;
  _container: HTMLElement | null;
}

export class ItemDragPublic {
  constructor(item: Item);
  static autoScroller: AutoScroller;
  static defaultStartPredicate(
    item: Item,
    event: DraggerAnyEvent,
    options?: DragStartPredicateOptions
  ): boolean | undefined;
  static defaultSortPredicate(
    item: Item,
    options?: DragSortPredicateOptions
  ): DragSortPredicateResult;
  getRootGrid(): Grid | null;
  stop(): void;
  sort(force?: boolean): void;
  destroy(): void;
}

export class ItemDrag extends ItemDragPublic {
  _item: Item;
  _rootGridId: number;
  _isDestroyed: boolean;
  _isMigrated: boolean;
  _startPredicateState: number;
  _isSortNeeded: boolean;
  _sortTimer?: number;
  _blockedSortIndex: number | null;
  _sortX1: number;
  _sortX2: number;
  _sortY1: number;
  _sortY2: number;
  _isActive: boolean;
  _isStarted: boolean;
  _container: HTMLElement | null;
  _containingBlock: HTMLElement | Document | null;
  _dragStartEvent: DraggerStartEvent | DraggerMoveEvent | null;
  _dragEndEvent: DraggerEndEvent | DraggerCancelEvent | null;
  _dragMoveEvent: DraggerStartEvent | DraggerMoveEvent | null;
  _dragPrevMoveEvent: DraggerStartEvent | DraggerMoveEvent | null;
  _scrollEvent: ScrollEvent | null;
  _translateX: number;
  _translateY: number;
  _clientX: number;
  _clientY: number;
  _scrollDiffX: number;
  _scrollDiffY: number;
  _moveDiffX: number;
  _moveDiffY: number;
  _containerDiffX: number;
  _containerDiffY: number;
  _dragger: Dragger;
  _startPredicate(item: Item, event: DraggerAnyEvent): boolean | undefined | void;
  _reset(): void;
  _bindScrollHandler(): void;
  _unbindScrollHandler(): void;
  _resetHeuristics(x: number, y: number): void;
  _checkHeuristics(x: number, y: number): boolean;
  _resetDefaultStartPredicate(): void;
  _handleSort(): void;
  _handleSortDelayed(): void;
  _cancelSort(): void;
  _finishSort(): void;
  _checkOverlap(isDrop?: boolean): void;
  _finishMigration(): void;
  _preStartCheck(event: DraggerStartEvent | DraggerMoveEvent): void;
  _preEndCheck(event: DraggerEndEvent | DraggerCancelEvent): void;
  _onStart(event: DraggerStartEvent | DraggerMoveEvent): void;
  _prepareStart(): void;
  _applyStart(): void;
  _onMove(event: DraggerMoveEvent): void;
  _prepareMove(): void;
  _applyMove(): void;
  _onScroll(event: ScrollEvent): void;
  _prepareScroll(): void;
  _applyScroll(): void;
  _onEnd(event: DraggerEndEvent | DraggerCancelEvent): void;
}

export class ItemDragReleasePublic {
  constructor(item: Item);
  start(): void;
  stop(abort?: boolean, left?: number, top?: number): void;
  isJustReleased(): boolean;
  destroy(): void;
}

export class ItemDragRelease extends ItemDragReleasePublic {
  _item: Item;
  _isActive: boolean;
  _isDestroyed: boolean;
  _isPositioningStarted: boolean;
  _placeToGrid(left?: number, top?: number): boolean;
  _reset(needsReflow?: boolean): void;
  _onScroll(): void;
}

export class ItemDragPlaceholderPublic {
  constructor(item: Item);
  create(): void;
  reset(): void;
  isActive(): boolean;
  getElement(): HTMLElement | null;
  updateDimensions(): void;
  updateClassName(className: string): void;
  destroy(): void;
}

export class ItemDragPlaceholder extends ItemDragPlaceholderPublic {
  _item: Item;
  _animation: Animator;
  _element: HTMLElement | null;
  _className: string;
  _didMigrate: boolean;
  _resetAfterLayout: boolean;
  _left: number;
  _top: number;
  _transX: number;
  _transY: number;
  _nextTransX: number;
  _nextTransY: number;
  _updateDimensions(): void;
  _onLayoutStart(items: Item[], isInstant: boolean): void;
  _setupAnimation(): void;
  _startAnimation(): void;
  _onLayoutEnd(): void;
  _onReleaseEnd(item: Item): void;
  _onMigrate(data: {
    item: Item;
    fromGrid: Grid;
    fromIndex: number;
    toGrid: Grid;
    toIndex: number;
  }): void;
  _onHide(items: Item[]): void;
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
  constructor(element?: HTMLElement);
  element: HTMLElement | null;
  animation: Animation | null;
  start(
    propsFrom: StyleDeclaration,
    propsTo: StyleDeclaration,
    options?: {
      duration?: number;
      easing?: string;
      onFinish?: Function;
    }
  ): void;
  stop(): void;
  isAnimating(): boolean;
  destroy(): void;
}

export class Dragger {
  constructor(
    element: HTMLElement,
    cssProps?: DraggerCssPropsOptions,
    listenerOptions?: DraggerListenerOptions
  );
  isActive(): boolean;
  setTouchAction(touchAction: string): void;
  setCssProps(props: DraggerCssPropsOptions): void;
  setListenerOptions(options: DraggerListenerOptions): void;
  getDeltaX(): number;
  getDeltaY(): number;
  getDistance(): number;
  getDeltaTime(): number;
  on<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void;
  off<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void;
  reset(): void;
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

export class GridPublic {
  constructor(element: string | HTMLElement, options?: GridInitOptions);

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

  static defaultOptions: GridInitOptions;

  on<T extends keyof GridEvents>(event: T, listener: GridEvents[T]): this;

  off<T extends keyof GridEvents>(event: T, listener: GridEvents[T]): this;

  getElement(): HTMLElement;

  getItem(target: HTMLElement | number | Item): Item | null;

  getItems(targets?: HTMLElement | number | Item | Array<HTMLElement | number | Item>): Item[];

  updateSettings(settings: GridOptions): this;

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

export class Grid extends GridPublic {
  _id: number;
  _element: HTMLElement | null;
  _settings: GridSettings;
  _isDestroyed: boolean;
  _items: Item[];
  _width: number;
  _height: number;
  _left: number;
  _top: number;
  _right: number;
  _bottom: number;
  _borderLeft: number;
  _borderRight: number;
  _borderTop: number;
  _borderBottom: number;
  _itemLayoutNeedsDimensionRefresh: boolean;
  _itemVisibilityNeedsDimensionRefresh: boolean;
  _layout: {
    id: number;
    items: Item[];
    slots: number[] | Float32Array;
  };
  _isLayoutFinished: boolean;
  _nextLayoutData: null | {
    id: number;
    instant: boolean;
    onFinish: (items: Item[], hasLayoutChanged: boolean) => void;
    cancel: null | undefined | Function;
  };
  _emitter: Emitter;
  _emit: (event: string, ...args: any) => void;
  _hasListeners: (event: string) => boolean;
  _updateBoundingRect(): void;
  _updateBorders(left: boolean, right: boolean, top: boolean, bottom: boolean): void;
  _refreshDimensions(): void;
  _onLayoutDataReceived(layout: LayoutData): void;
  _setItemsVisibility(
    items: Item[],
    toVisible: boolean,
    options?: {
      instant?: boolean;
      syncWithLayout: boolean;
      onFinished: (items: Item[]) => void;
      layout: boolean | 'instant' | ((items: Item[], hasLayoutChanged: boolean) => void);
    }
  ): void;
}

export default Grid;
