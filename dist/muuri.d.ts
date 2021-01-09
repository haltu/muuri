type Writeable<T> = { -readonly [P in keyof T]: T[P] };

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface RectExtended extends Rect {
  right: number;
  bottom: number;
}

interface StyleDeclaration {
  [prop: string]: string;
}

interface ScrollEvent extends Event {
  type: 'scroll';
}

declare const AXIS_X = 1;
declare const AXIS_Y = 2;
declare const LEFT: 9;
declare const RIGHT: 5;
declare const UP: 10;
declare const DOWN: 6;
declare type AutoScrollItemId = number | string;
declare type AutoScrollAxis = typeof AXIS_X | typeof AXIS_Y;
declare type AutoScrollDirectionX = typeof LEFT | typeof RIGHT;
declare type AutoScrollDirectionY = typeof UP | typeof DOWN;
declare type AutoScrollDirection = AutoScrollDirectionX | AutoScrollDirectionY;
declare type AutoScrollHandleCallback = (item: Item, itemClientX: number, itemClientY: number, itemWidth: number, itemHeight: number, pointerClientX: number, pointerClientY: number) => Rect;
interface AutoScrollSpeedData {
    direction: AutoScrollDirection | 0;
    threshold: number;
    distance: number;
    value: number;
    maxValue: number;
    duration: number;
    speed: number;
    deltaTime: number;
    isEnding: boolean;
}
declare type AutoScrollSpeedCallback = (item: Item, scrollElement: Window | HTMLElement, scrollData: AutoScrollSpeedData) => number;
interface AutoScrollTarget {
    element: Window | HTMLElement;
    axis?: number;
    priority?: number;
    threshold?: number;
}
declare type AutoScrollEventCallback = (item: Item, scrollElement: Window | HTMLElement, scrollDirection: AutoScrollDirection | 0) => void;
declare function pointerHandle(pointerSize: number): AutoScrollHandleCallback;
declare function smoothSpeed(maxSpeed: number, acceleration: number, deceleration: number): AutoScrollSpeedCallback;
declare class ObjectPool<T> {
    protected _pool: T[];
    protected _createObject: () => T;
    protected _onRelease: ((object: T) => void) | undefined;
    constructor(createObject: () => T, onRelease?: (object: T) => void);
    pick(): T;
    release(object: T): void;
    reset(): void;
}
declare class ScrollAction {
    element: HTMLElement | Window | null;
    requestX: ScrollRequest | null;
    requestY: ScrollRequest | null;
    scrollLeft: number;
    scrollTop: number;
    constructor();
    reset(): void;
    addRequest(request: ScrollRequest): void;
    removeRequest(request: ScrollRequest): void;
    computeScrollValues(): void;
    scroll(): void;
}
declare class ScrollRequest {
    item: Item | null;
    element: HTMLElement | Window | null;
    isActive: boolean;
    isEnding: boolean;
    direction: AutoScrollDirection | 0;
    value: number;
    maxValue: number;
    threshold: number;
    distance: number;
    deltaTime: number;
    speed: number;
    duration: number;
    action: ScrollAction | null;
    constructor();
    reset(): void;
    hasReachedEnd(): boolean;
    computeCurrentScrollValue(): number;
    computeNextScrollValue(): number;
    computeSpeed(): number;
    tick(deltaTime: number): number;
    onStart(): void;
    onStop(): void;
}
declare class AutoScroller {
    protected _isDestroyed: boolean;
    protected _isTicking: boolean;
    protected _tickTime: number;
    protected _tickDeltaTime: number;
    protected _items: Item[];
    protected _actions: ScrollAction[];
    protected _requests: {
        [AXIS_X]: Map<AutoScrollItemId, ScrollRequest>;
        [AXIS_Y]: Map<AutoScrollItemId, ScrollRequest>;
    };
    protected _requestOverlapCheck: Map<AutoScrollItemId, number>;
    protected _dragPositions: Map<AutoScrollItemId, [number, number]>;
    protected _dragDirections: Map<AutoScrollItemId, [
        AutoScrollDirectionX | 0,
        AutoScrollDirectionY | 0
    ]>;
    protected _overlapCheckInterval: number;
    protected _requestPool: ObjectPool<ScrollRequest>;
    protected _actionPool: ObjectPool<ScrollAction>;
    constructor();
    static AXIS_X: number;
    static AXIS_Y: number;
    static LEFT: 9;
    static RIGHT: 5;
    static UP: 10;
    static DOWN: 6;
    static smoothSpeed: typeof smoothSpeed;
    static pointerHandle: typeof pointerHandle;
    isDestroyed(): boolean;
    addItem(item: Item, posX: number, posY: number): void;
    updateItem(item: Item, posX: number, posY: number): void;
    removeItem(item: Item): void;
    isItemScrollingX(item: Item): boolean;
    isItemScrollingY(item: Item): boolean;
    isItemScrolling(item: Item): boolean;
    destroy(): void;
    protected _readTick(time: number): void;
    protected _writeTick(): void;
    protected _startTicking(): void;
    protected _stopTicking(): void;
    protected _getItemHandleRect(item: Item, handle: AutoScrollHandleCallback | null, rect?: RectExtended): RectExtended;
    protected _requestItemScroll(item: Item, axis: AutoScrollAxis, element: Window | HTMLElement, direction: AutoScrollDirection, threshold: number, distance: number, maxValue: number): void;
    protected _cancelItemScroll(item: Item, axis: AutoScrollAxis): void;
    protected _checkItemOverlap(item: Item, checkX: boolean, checkY: boolean): void;
    protected _updateScrollRequest(scrollRequest: ScrollRequest): boolean;
    protected _updateRequests(): void;
    protected _requestAction(request: ScrollRequest, axis: AutoScrollAxis): void;
    protected _updateActions(): void;
    protected _applyActions(): void;
}

declare type EmitterEvent = string;
declare type EmitterListener = Function;
declare class Emitter {
    protected _events: {
        [event: string]: EmitterListener[];
    } | null;
    protected _queue: EmitterListener[];
    protected _counter: number;
    protected _clearOnEmit: boolean;
    constructor();
    on(event: EmitterEvent, listener: EmitterListener): this;
    off(event: EmitterEvent, listener: EmitterListener): this;
    clear(event: EmitterEvent): this;
    emit(event: EmitterEvent, ...args: any[]): this;
    burst(event: EmitterEvent, ...args: any[]): this;
    countListeners(event: EmitterEvent): number;
    destroy(): this;
}

declare class EdgeHack {
    protected _dragger: Dragger;
    protected _timeout: number | null;
    protected _outEvent: PointerEvent | TouchEvent | MouseEvent | null;
    protected _isActive: boolean;
    constructor(dragger: Dragger);
    destroy(): void;
    protected _addBehaviour(): void;
    protected _removeBehaviour(): void;
    protected _resetData(): void;
    protected _onStart(e: DraggerStartEvent): void;
    protected _onOut(e: PointerEvent | TouchEvent | MouseEvent): void;
    protected _onTimeout(): void;
}

declare type DraggerListenerType = 0 | 1 | 2 | 3;
declare type DraggerTouchAction = string;
interface DraggerCssPropsOptions {
    touchAction?: string;
    userSelect?: string;
    userDrag?: string;
    tapHighlightColor?: string;
    touchCallout?: string;
    contentZooming?: string;
}
interface DraggerListenerOptions {
    capture?: boolean;
    passive?: boolean;
}
declare type DraggerEventType = 'start' | 'move' | 'end' | 'cancel';
declare type DraggerPointerType = 'mouse' | 'pen' | 'touch';
interface DraggerEvent {
    type: DraggerEventType;
    srcEvent: PointerEvent | TouchEvent | MouseEvent;
    distance: number;
    deltaX: number;
    deltaY: number;
    deltaTime: number;
    isFirst: boolean;
    isFinal: boolean;
    pointerType: DraggerPointerType;
    identifier: number;
    screenX: number;
    screenY: number;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    target: EventTarget | null;
}
interface DraggerStartEvent extends DraggerEvent {
    type: 'start';
    distance: 0;
    deltaX: 0;
    deltaY: 0;
    deltaTime: 0;
    isFirst: true;
    isFinal: false;
}
interface DraggerMoveEvent extends DraggerEvent {
    type: 'move';
    isFirst: false;
    isFinal: false;
}
interface DraggerEndEvent extends DraggerEvent {
    type: 'end';
    isFirst: false;
    isFinal: true;
}
interface DraggerCancelEvent extends DraggerEvent {
    type: 'cancel';
    isFirst: false;
    isFinal: true;
}
declare type DraggerAnyEvent = DraggerStartEvent | DraggerMoveEvent | DraggerCancelEvent | DraggerEndEvent;
interface DraggerEvents {
    start(event: DraggerStartEvent): any;
    move(event: DraggerMoveEvent): any;
    end(event: DraggerEndEvent): any;
    cancel(event: DraggerCancelEvent): any;
}
declare class Dragger {
    readonly element: HTMLElement | null;
    protected _emitter: Emitter;
    protected _cssProps: {
        [key: string]: string;
    };
    protected _touchAction: DraggerTouchAction;
    protected _listenerType: DraggerListenerType;
    protected _isActive: boolean;
    protected _pointerId: number | null;
    protected _startTime: number;
    protected _startX: number;
    protected _startY: number;
    protected _currentX: number;
    protected _currentY: number;
    protected _edgeHack: EdgeHack | null;
    constructor(element: HTMLElement, cssProps?: DraggerCssPropsOptions, listenerOptions?: DraggerListenerOptions);
    getTrackedTouch(e: PointerEvent | TouchEvent | MouseEvent): PointerEvent | MouseEvent | Touch | null;
    onStart(e: PointerEvent | TouchEvent | MouseEvent): void;
    onMove(e: PointerEvent | TouchEvent | MouseEvent): void;
    onCancel(e: PointerEvent | TouchEvent | MouseEvent): void;
    onEnd(e: PointerEvent | TouchEvent | MouseEvent): void;
    isActive(): boolean;
    setTouchAction(value: DraggerTouchAction): void;
    setCssProps(newProps: DraggerCssPropsOptions): void;
    setListenerOptions(options: DraggerListenerOptions): void;
    getDeltaX(): number;
    getDeltaY(): number;
    getDistance(): number;
    getDeltaTime(): number;
    on<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void;
    off<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void;
    reset(): void;
    destroy(): void;
    protected _createEvent(type: DraggerEventType, e: PointerEvent | TouchEvent | MouseEvent): DraggerEvent | null;
    protected _emit(type: DraggerEventType, e: PointerEvent | TouchEvent | MouseEvent): void;
}

declare class ItemDrag {
    readonly item: ItemInternal | null;
    readonly dragger: Dragger;
    protected _originGridId: number;
    protected _isMigrated: boolean;
    protected _isActive: boolean;
    protected _isStarted: boolean;
    protected _startPredicateState: number;
    protected _startPredicateData: {
        distance: number;
        delay: number;
        event?: DraggerAnyEvent;
        delayTimer?: number;
    } | null;
    protected _isSortNeeded: boolean;
    protected _sortTimer?: number;
    protected _blockedSortIndex: number | null;
    protected _sortX1: number;
    protected _sortX2: number;
    protected _sortY1: number;
    protected _sortY2: number;
    protected _container: HTMLElement | null;
    protected _containingBlock: HTMLElement | Document | null;
    protected _dragStartEvent: DraggerStartEvent | DraggerMoveEvent | null;
    protected _dragEndEvent: DraggerEndEvent | DraggerCancelEvent | null;
    protected _dragMoveEvent: DraggerMoveEvent | null;
    protected _dragPrevMoveEvent: DraggerMoveEvent | null;
    protected _scrollEvent: ScrollEvent | null;
    protected _translateX: number;
    protected _translateY: number;
    protected _clientX: number;
    protected _clientY: number;
    protected _scrollDiffX: number;
    protected _scrollDiffY: number;
    protected _moveDiffX: number;
    protected _moveDiffY: number;
    protected _containerDiffX: number;
    protected _containerDiffY: number;
    constructor(item: Item);
    static autoScroll: AutoScroller;
    static defaultStartPredicate: (item: Item, event: DraggerAnyEvent, options?: DragStartPredicateOptions | undefined) => boolean | undefined;
    static defaultSortPredicate: (item: Item, options?: DragSortPredicateOptions | undefined) => DragSortPredicateResult;
    isActive(): boolean;
    getOriginGrid(): Grid | null;
    stop(): void;
    sort(force?: boolean): void;
    destroy(): void;
    protected _startPredicate(item: Item, event: DraggerAnyEvent): boolean | undefined;
    protected _reset(): void;
    protected _bindScrollHandler(): void;
    protected _unbindScrollHandler(): void;
    protected _resetHeuristics(x: number, y: number): void;
    protected _checkHeuristics(x: number, y: number): boolean;
    protected _resetDefaultStartPredicate(): void;
    protected _handleSort(): void;
    protected _handleSortDelayed(): void;
    protected _cancelSort(): void;
    protected _finishSort(): void;
    protected _checkOverlap(isDrop?: boolean): void;
    protected _finishMigration(): void;
    protected _preStartCheck(event: DraggerStartEvent | DraggerMoveEvent): void;
    protected _preEndCheck(event: DraggerEndEvent | DraggerCancelEvent): void;
    protected _onStart(event: DraggerStartEvent | DraggerMoveEvent): void;
    protected _prepareStart(): void;
    protected _applyStart(): void;
    protected _onMove(event: DraggerMoveEvent): void;
    protected _prepareMove(): void;
    protected _applyMove(): void;
    protected _onScroll(event: Event): void;
    protected _prepareScroll(): void;
    protected _applyScroll(): void;
    protected _onEnd(event: DraggerEndEvent | DraggerCancelEvent): void;
}

interface AnimationProperties {
    [key: string]: string;
}
interface AnimationOptions {
    duration?: number;
    easing?: string;
    onFinish?: Function;
}
declare class Animator {
    readonly element: HTMLElement | null;
    readonly animation: Animation | null;
    protected _finishCallback: Function | null;
    constructor(element?: HTMLElement);
    start(propsFrom: AnimationProperties, propsTo: AnimationProperties, options?: AnimationOptions): void;
    stop(): void;
    isAnimating(): boolean;
    destroy(): void;
    protected _onFinish(): void;
}

declare class ItemDragPlaceholder {
    readonly item: Item | null;
    readonly element: HTMLElement | null;
    readonly animator: Animator;
    readonly left: number;
    readonly top: number;
    protected _className: string;
    protected _didMigrate: boolean;
    protected _resetAfterLayout: boolean;
    protected _transX: number;
    protected _transY: number;
    protected _nextTransX: number;
    protected _nextTransY: number;
    constructor(item: Item);
    create(): void;
    reset(): void;
    isActive(): boolean;
    updateDimensions(): void;
    updateClassName(className: string): void;
    destroy(): void;
    protected _updateDimensions(): void;
    protected _onLayoutStart(items: Item[], isInstant: boolean): void;
    protected _setupAnimation(): void;
    protected _startAnimation(): void;
    protected _onLayoutEnd(): void;
    protected _onReleaseEnd(item: Item): void;
    protected _onMigrate(data: {
        item: Item;
        fromGrid: Grid;
        fromIndex: number;
        toGrid: Grid;
        toIndex: number;
    }): void;
    protected _onHide(items: Item[]): void;
}

declare class ItemDragRelease {
    readonly item: ItemInternal | null;
    protected _isActive: boolean;
    protected _isPositioning: boolean;
    constructor(item: Item);
    isActive(): boolean;
    isPositioning(): boolean;
    start(): void;
    stop(abort?: boolean, left?: number, top?: number): void;
    reset(needsReflow?: boolean): void;
    destroy(): void;
    protected _placeToGrid(left?: number, top?: number): boolean;
    protected _onScroll(): void;
}

declare class ItemLayout {
    readonly item: ItemInternal | null;
    readonly animator: Animator;
    protected _skipNextAnimation: boolean;
    protected _isActive: boolean;
    protected _isInterrupted: boolean;
    protected _easing: string;
    protected _duration: number;
    protected _tX: number;
    protected _tY: number;
    protected _queue: string;
    constructor(item: Item);
    isActive(): boolean;
    start(instant: boolean, onFinish?: () => void): void;
    stop(processCallbackQueue: boolean, left?: number, top?: number): void;
    destroy(): void;
    protected _finish(): void;
    protected _setupAnimation(): void;
    protected _startAnimation(): void;
}

declare class ItemMigrate {
    readonly item: ItemInternal | null;
    readonly container: HTMLElement | null;
    protected _isActive: boolean;
    constructor(item: Item);
    isActive(): boolean;
    start(targetGrid: Grid, position: HTMLElement | number | Item, container?: HTMLElement): void;
    stop(abort?: boolean, left?: number, top?: number): void;
    destroy(): void;
}

declare class ItemVisibility {
    readonly item: ItemInternal | null;
    readonly element: HTMLElement | null;
    readonly animator: Animator;
    protected _isHidden: boolean;
    protected _isHiding: boolean;
    protected _isShowing: boolean;
    protected _currentStyleProps: string[];
    protected _queue: string;
    constructor(item: Item);
    isHidden(): boolean;
    isHiding(): boolean;
    isShowing(): boolean;
    show(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => void): void;
    hide(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => void): void;
    stop(processCallbackQueue: boolean): void;
    setStyles(styles: StyleDeclaration): void;
    destroy(): void;
    protected _startAnimation(toVisible: boolean, instant: boolean, onFinish?: () => void): void;
    protected _finishShow(): void;
    protected _finishHide(): void;
    protected _removeCurrentStyles(): void;
}

declare class Item {
    readonly id: number;
    readonly element: HTMLElement;
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly marginLeft: number;
    readonly marginRight: number;
    readonly marginTop: number;
    readonly marginBottom: number;
    protected _gridId: number;
    protected _isActive: boolean;
    protected _isDestroyed: boolean;
    protected _translateX?: number;
    protected _translateY?: number;
    protected _containerDiffX: number;
    protected _containerDiffY: number;
    protected _sortData: {
        [key: string]: any;
    } | null;
    protected _emitter: Emitter;
    protected _visibility: ItemVisibility;
    protected _layout: ItemLayout;
    protected _migrate: ItemMigrate;
    protected _drag: ItemDrag | null;
    protected _dragRelease: ItemDragRelease;
    protected _dragPlaceholder: ItemDragPlaceholder;
    constructor(grid: Grid, element: HTMLElement, isActive?: boolean);
    getGrid(): Grid | null;
    isActive(): boolean;
    isVisible(): boolean;
    isShowing(): boolean;
    isHiding(): boolean;
    isPositioning(): boolean;
    isDragging(): boolean;
    isReleasing(): boolean;
    isDestroyed(): boolean;
    protected _updateDimensions(force?: boolean): void;
    protected _updateSortData(): void;
    protected _addToLayout(left?: number, top?: number): void;
    protected _removeFromLayout(): void;
    protected _canSkipLayout(left: number, top: number): boolean;
    protected _setTranslate(x: number, y: number): void;
    protected _getTranslate(): {
        x: number;
        y: number;
    };
    protected _getClientRootPosition(): {
        left: number;
        top: number;
    };
    protected _isInViewport(x: number, y: number, viewportThreshold?: number): boolean;
    protected _destroy(removeElement?: boolean): void;
}
interface ItemInternal extends Writeable<Item> {
    _gridId: Item['_gridId'];
    _isActive: Item['_isActive'];
    _isDestroyed: Item['_isDestroyed'];
    _translateX: Item['_translateX'];
    _translateY: Item['_translateY'];
    _containerDiffX: Item['_containerDiffX'];
    _containerDiffY: Item['_containerDiffY'];
    _sortData: Item['_sortData'];
    _emitter: Item['_emitter'];
    _visibility: Item['_visibility'];
    _layout: Item['_layout'];
    _migrate: Item['_migrate'];
    _drag: Item['_drag'];
    _dragRelease: Item['_dragRelease'];
    _dragPlaceholder: Item['_dragPlaceholder'];
    _updateDimensions: Item['_updateDimensions'];
    _updateSortData: Item['_updateSortData'];
    _addToLayout: Item['_addToLayout'];
    _removeFromLayout: Item['_removeFromLayout'];
    _canSkipLayout: Item['_canSkipLayout'];
    _setTranslate: Item['_setTranslate'];
    _getTranslate: Item['_getTranslate'];
    _getClientRootPosition: Item['_getClientRootPosition'];
    _isInViewport: Item['_isInViewport'];
    _destroy: Item['_destroy'];
}

declare const ACTION_SWAP = "swap";
declare const ACTION_MOVE = "move";
declare const INSTANT_LAYOUT = "instant";

interface PackerLayoutOptions {
    fillGaps?: boolean;
    horizontal?: boolean;
    alignRight?: boolean;
    alignBottom?: boolean;
    rounding?: boolean;
}
interface PackerContainerData {
    width: number;
    height: number;
    borderLeft?: number;
    borderRight?: number;
    borderTop?: number;
    borderBottom?: number;
    boxSizing?: 'content-box' | 'border-box' | '';
}
declare type PackerLayoutId = number;
declare type PackerLayoutCallback = (layout: PackerLayoutData) => void;
interface PackerLayoutItem {
    width: number;
    height: number;
    marginLeft?: number;
    marginRight?: number;
    marginTop?: number;
    marginBottom?: number;
    [key: string]: any;
}
interface PackerLayoutData {
    id: PackerLayoutId;
    items: PackerLayoutItem[];
    width: number;
    height: number;
    slots: Float32Array;
    styles: StyleDeclaration;
}
interface PackerLayoutWorkerData extends PackerLayoutData {
    container: PackerContainerData;
    settings: number;
    callback: PackerLayoutCallback;
    packet: Float32Array;
    aborted: boolean;
    worker?: Worker;
}
declare class Packer {
    protected _settings: number;
    protected _asyncMode: boolean;
    protected _layoutWorkerQueue: PackerLayoutId[];
    protected _layoutsProcessing: Set<PackerLayoutId>;
    protected _layoutWorkerData: Map<PackerLayoutId, PackerLayoutWorkerData>;
    protected _workers: Worker[];
    constructor(numWorkers?: number, options?: PackerLayoutOptions);
    updateSettings(options: PackerLayoutOptions): void;
    createLayout(layoutId: PackerLayoutId, items: PackerLayoutItem[], containerData: PackerContainerData, callback: PackerLayoutCallback): (() => void) | undefined;
    cancelLayout(layoutId: PackerLayoutId): void;
    destroy(): void;
    protected _sendToWorker(): void;
    protected _onWorkerMessage(msg: {
        data: ArrayBufferLike;
    }): void;
    protected _setContainerStyles(layout: PackerLayoutData, containerData: PackerContainerData, settings: number): void;
}

declare function debounce(fn: () => void, durationMs: number): (cancel?: boolean) => void;

declare type InstantLayout = typeof INSTANT_LAYOUT;
declare type MoveAction = typeof ACTION_MOVE | typeof ACTION_SWAP;
declare type LayoutOnFinish = (items: Item[], isAborted: boolean) => void;
declare type LayoutCancel = (...args: any[]) => void;
interface LayoutData {
    id: number;
    items: Item[];
    slots: number[] | Float32Array;
    styles?: StyleDeclaration | null;
    [key: string]: any;
}
declare type LayoutFunction = (layoutId: number, grid: Grid, items: Item[], containerData: {
    width: number;
    height: number;
    borderLeft: number;
    borderRight: number;
    borderTop: number;
    borderBottom: number;
    boxSizing: 'border-box' | 'content-box' | '';
}, callback: (layout: LayoutData) => void) => LayoutCancel | undefined;
declare type DragStartPredicate = (item: Item, event: DraggerStartEvent | DraggerMoveEvent | DraggerEndEvent | DraggerCancelEvent) => boolean | undefined;
interface DragStartPredicateOptions {
    distance?: number;
    delay?: number;
}
declare type DragSortGetter = (item: Item) => Grid[] | null;
interface DragSortHeuristicsOptions {
    sortInterval?: number;
    minDragDistance?: number;
    minBounceBackAngle?: number;
}
declare type DragSortPredicate = (item: Item, event: DraggerMoveEvent | DraggerEndEvent | DraggerCancelEvent) => DragSortPredicateResult;
declare type DragSortPredicateResult = {
    grid: Grid;
    index: number;
    action: MoveAction;
} | null;
interface DragSortPredicateOptions {
    threshold?: number;
    action?: MoveAction;
    migrateAction?: MoveAction;
}
interface DragReleaseOptions {
    duration?: number;
    easing?: string;
    useDragContainer?: boolean;
}
interface DragPlaceholderOptions {
    enabled?: boolean;
    createElement?: ((item: Item) => HTMLElement) | null;
    onCreate?: ((item: Item, placeholderElement: HTMLElement) => void) | null;
    onRemove?: ((item: Item, placeholderElement: HTMLElement) => void) | null;
}
interface DragAutoScrollOptions {
    targets?: AutoScrollTarget[] | ((item: Item) => AutoScrollTarget[]);
    handle?: AutoScrollHandleCallback | null;
    threshold?: number;
    safeZone?: number;
    speed?: number | AutoScrollSpeedCallback;
    sortDuringScroll?: boolean;
    smoothStop?: boolean;
    onStart?: AutoScrollEventCallback | null;
    onStop?: AutoScrollEventCallback | null;
}
interface GridEvents {
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
    move(data: {
        item: Item;
        fromIndex: number;
        toIndex: number;
        action: MoveAction;
    }): any;
    send(data: {
        item: Item;
        fromGrid: Grid;
        fromIndex: number;
        toGrid: Grid;
        toIndex: number;
    }): any;
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
interface GridSettings {
    items: HTMLElement[] | NodeList | HTMLCollection | string;
    layoutOnInit: boolean;
    showDuration: number;
    showEasing: string;
    visibleStyles: StyleDeclaration;
    hideDuration: number;
    hideEasing: string;
    hiddenStyles: StyleDeclaration;
    layout: Required<PackerLayoutOptions> | LayoutFunction;
    layoutOnResize: boolean | number;
    layoutDuration: number;
    layoutEasing: string;
    sortData: {
        [key: string]: (item: Item, element: HTMLElement) => any;
    } | null;
    translate3d: boolean;
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
interface GridInitOptions extends Partial<GridSettings> {
}
interface GridOptions extends Partial<Omit<GridSettings, 'items' | 'layoutOnInit' | 'layout' | 'dragStartPredicate' | 'dragSortHeuristics' | 'dragSortPredicate' | 'dragRelease' | 'dragCssProps' | 'dragEventListenerOptions' | 'dragPlaceholder' | 'dragAutoScroll'>> {
    layout?: PackerLayoutOptions | LayoutFunction;
    dragStartPredicate?: DragStartPredicateOptions | DragStartPredicate;
    dragSortHeuristics?: DragSortHeuristicsOptions;
    dragSortPredicate?: DragSortPredicateOptions | DragSortPredicate;
    dragRelease?: DragReleaseOptions;
    dragCssProps?: DraggerCssPropsOptions;
    dragEventListenerOptions?: DraggerListenerOptions;
    dragPlaceholder?: DragPlaceholderOptions;
    dragAutoScroll?: DragAutoScrollOptions;
}
declare class Grid {
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
    constructor(element: string | HTMLElement, options?: GridInitOptions);
    static Item: typeof Item;
    static ItemLayout: typeof ItemLayout;
    static ItemVisibility: typeof ItemVisibility;
    static ItemMigrate: typeof ItemMigrate;
    static ItemDrag: typeof ItemDrag;
    static ItemDragRelease: typeof ItemDragRelease;
    static ItemDragPlaceholder: typeof ItemDragPlaceholder;
    static AutoScroller: typeof AutoScroller;
    static Emitter: typeof Emitter;
    static Animator: typeof Animator;
    static Dragger: typeof Dragger;
    static Packer: typeof Packer;
    static defaultPacker: Packer;
    static defaultOptions: GridSettings;
    on<T extends keyof GridEvents>(event: T, listener: GridEvents[T]): this;
    off<T extends keyof GridEvents>(event: T, listener: GridEvents[T]): this;
    isDestroyed(): boolean;
    getItem(target?: HTMLElement | Item | number): Item | null;
    getItems(targets?: HTMLElement | Item | number | (HTMLElement | Item | number)[] | NodeList | HTMLCollection): Item[];
    updateSettings(options: GridOptions): this;
    refreshItems(items?: Item[], force?: boolean): this;
    refreshSortData(items?: Item[]): this;
    synchronize(): this;
    layout(instant?: boolean, onFinish?: LayoutOnFinish): this;
    add(elements: HTMLElement | HTMLElement[] | NodeList | HTMLCollection, options?: {
        index?: number;
        active?: boolean;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): Item[];
    remove(items: Item[], options?: {
        removeElements?: boolean;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): Item[];
    show(items: Item[], options?: {
        instant?: boolean;
        syncWithLayout?: boolean;
        onFinish?: (items: Item[]) => void;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
    hide(items: Item[], options?: {
        instant?: boolean;
        syncWithLayout?: boolean;
        onFinish?: (items: Item[]) => void;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
    filter(predicate: string | ((item: Item) => boolean), options?: {
        instant?: boolean;
        syncWithLayout?: boolean;
        onFinish?: (shownItems: Item[], hiddenItems: Item[]) => void;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
    sort(comparer: ((a: Item, b: Item) => number) | string | Item[], options?: {
        descending?: boolean;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
    move(item: Item | HTMLElement | number, position: Item | HTMLElement | number, options?: {
        action?: MoveAction;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
    send(item: Item | HTMLElement | number, targetGrid: Grid, position: Item | HTMLElement | number, options?: {
        appendTo?: HTMLElement;
        layoutSender?: boolean | InstantLayout | LayoutOnFinish;
        layoutReceiver?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
    destroy(removeElements?: boolean): this;
    protected _emit<T extends keyof GridEvents>(event: T, ...args: Parameters<GridEvents[T]>): void;
    protected _hasListeners<T extends keyof GridEvents>(event: T): boolean;
    protected _updateBoundingRect(): void;
    protected _updateBorders(left: boolean, right: boolean, top: boolean, bottom: boolean): void;
    protected _updateDimensions(): void;
    protected _bindLayoutOnResize(delay: number | boolean): void;
    protected _unbindLayoutOnResize(): void;
    protected _onLayoutDataReceived(layout: LayoutData): void;
    protected _setItemsVisibility(items: Item[], toVisible: boolean, options?: {
        instant?: boolean;
        syncWithLayout?: boolean;
        onFinish?: (items: Item[]) => void;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): void;
}

export default Grid;
