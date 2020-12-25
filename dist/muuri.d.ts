/**
 * Muuri Emitter
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Emitter/LICENSE.md
 */
declare type EventName = string;
declare type EventListener = Function;
/**
 * Event emitter.
 */
declare class Emitter {
    protected _events: {
        [event: string]: EventListener[];
    } | null;
    protected _queue: EventListener[];
    protected _counter: number;
    protected _clearOnEmit: boolean;
    constructor();
    /**
     * Bind an event listener.
     */
    on(event: EventName, listener: EventListener): this;
    /**
     * Unbind all event listeners that match the provided listener function.
     */
    off(event: EventName, listener: EventListener): this;
    /**
     * Unbind all listeners of the provided event.
     */
    clear(event: EventName): this;
    /**
     * Emit all listeners in a specified event with the provided arguments.
     */
    emit(event: EventName, ...args: any[]): this;
    /**
     * Emit all listeners in a specified event with the provided arguments and
     * remove the event's listeners just before calling the them. This method
     * allows the emitter to serve as a queue where all listeners are called only
     * once.
     */
    burst(event: EventName, ...args: any[]): this;
    /**
     * Check how many listeners there are for a specific event.
     */
    countListeners(event: EventName): number;
    /**
     * Destroy emitter instance. Basically just removes all bound listeners.
     */
    destroy(): this;
}

/**
 * Muuri Dragger
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Dragger/LICENSE.md
 */

/**
 * If you happen to use Legacy Edge or IE on a touch capable device there is a
 * a specific case where pointercancel and pointerend events are never emitted,
 * even though one of them should always be emitted when you release your finger
 * from the screen. The bug appears specifically when Muuri shifts the dragged
 * element's position in the DOM after pointerdown event, IE and Edge don't like
 * that behaviour and quite often forget to emit the pointerend/pointercancel
 * event. But, they do emit pointerout event so we utilize that here.
 * Specifically, if there has been no pointermove event within 100 milliseconds
 * since the last pointerout event we force cancel the drag operation. This hack
 * works surprisingly well 99% of the time. There is that 1% chance there still
 * that dragged items get stuck but it is what it is.
 *
 * @class
 * @param {Dragger} dragger
 */
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

/**
 * Muuri Dragger
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Dragger/LICENSE.md
 */

declare type ListenerType = 0 | 1 | 2 | 3;
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
/**
 * Creates a new Dragger instance for an element.
 */
declare class Dragger {
    readonly element: HTMLElement | null;
    protected _emitter: Emitter;
    protected _cssProps: {
        [key: string]: string;
    };
    protected _touchAction: DraggerTouchAction;
    protected _listenerType: ListenerType;
    protected _isActive: boolean;
    protected _pointerId: number | null;
    protected _startTime: number;
    protected _startX: number;
    protected _startY: number;
    protected _currentX: number;
    protected _currentY: number;
    protected _edgeHack: EdgeHack | null;
    constructor(element: HTMLElement, cssProps?: DraggerCssPropsOptions, listenerOptions?: DraggerListenerOptions);
    /**
     * If the provided event is a PointerEvent this method will return it if it has
     * the same pointerId as the instance. If the provided event is a TouchEvent
     * this method will try to look for a Touch instance in the changedTouches that
     * has an identifier matching this instance's pointerId. If the provided event
     * is a MouseEvent (or just any other event than PointerEvent or TouchEvent)
     * it will be returned immediately.
     */
    getTrackedTouch(e: PointerEvent | TouchEvent | MouseEvent): PointerEvent | MouseEvent | Touch | null;
    /**
     * Handler for start event.
     */
    onStart(e: PointerEvent | TouchEvent | MouseEvent): void;
    /**
     * Handler for move event.
     */
    onMove(e: PointerEvent | TouchEvent | MouseEvent): void;
    /**
     * Handler for cancel event.
     */
    onCancel(e: PointerEvent | TouchEvent | MouseEvent): void;
    /**
     * Handler for end event.
     */
    onEnd(e: PointerEvent | TouchEvent | MouseEvent): void;
    /**
     * Check if the element is being dragged at the moment.
     */
    isActive(): boolean;
    /**
     * Set element's touch-action CSS property.
     */
    setTouchAction(value: DraggerTouchAction): void;
    /**
     * Update element's CSS properties. Accepts an object with camel cased style
     * props with value pairs as it's first argument.
     */
    setCssProps(newProps: DraggerCssPropsOptions): void;
    /**
     * Update the instance's event listener options.
     */
    setListenerOptions(options: DraggerListenerOptions): void;
    /**
     * How much the pointer has moved on x-axis from start position, in pixels.
     * Positive value indicates movement from left to right.
     */
    getDeltaX(): number;
    /**
     * How much the pointer has moved on y-axis from start position, in pixels.
     * Positive value indicates movement from top to bottom.
     */
    getDeltaY(): number;
    /**
     * How far (in pixels) has pointer moved from start position.
     */
    getDistance(): number;
    /**
     * How long has pointer been dragged.
     */
    getDeltaTime(): number;
    /**
     * Bind drag event listeners.
     */
    on<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void;
    /**
     * Unbind drag event listeners.
     */
    off<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void;
    /**
     * Reset current drag operation (if any).
     */
    reset(): void;
    /**
     * Destroy the instance and unbind all drag event listeners.
     */
    destroy(): void;
    /**
     * Create a custom dragger event from a raw event.
     */
    protected _createEvent(type: DraggerEventType, e: PointerEvent | TouchEvent | MouseEvent): DraggerEvent | null;
    /**
     * Emit a raw event as dragger event internally.
     */
    protected _emit(type: DraggerEventType, e: PointerEvent | TouchEvent | MouseEvent): void;
}

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

//
// CLASSES
//

declare class AutoScroller {
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

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Bind touch interaction to an item.
 *
 * @class
 * @param {Item} item
 */
declare class ItemDrag {
    readonly item: ItemInternal;
    readonly dragger: Dragger;
    protected _rootGridId: number;
    protected _isDestroyed: boolean;
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
    /**
     * @public
     * @static
     * @type {AutoScroller}
     */
    static autoScroller: AutoScroller;
    /**
     * @public
     * @static
     * @type {defaultStartPredicate}
     */
    static defaultStartPredicate: (item: Item, event: DraggerAnyEvent, options?: DragStartPredicateOptions | undefined) => boolean | undefined;
    /**
     * Default drag sort predicate.
     *
     * @public
     * @static
     * @type {defaultSortPredicate}
     */
    static defaultSortPredicate: (item: Item, options?: DragSortPredicateOptions | undefined) => DragSortPredicateResult;
    /**
     * Is item being dragged currently?
     *
     * @public
     * @returns {boolean}
     */
    isActive(): boolean;
    /**
     * Is drag instance destroyed?
     *
     * @public
     * @returns {boolean}
     */
    isDestroyed(): boolean;
    /**
     * Get Grid instance.
     *
     * @public
     * @returns {?Grid}
     */
    getRootGrid(): Grid | null;
    /**
     * Abort dragging and reset drag data.
     *
     * @public
     */
    stop(): void;
    /**
     * Manually trigger drag sort. This is only needed for special edge cases where
     * e.g. you have disabled sort and want to trigger a sort right after enabling
     * it (and don't want to wait for the next move/scroll event).
     *
     * @public
     * @param {boolean} [force=false]
     */
    sort(force?: boolean): void;
    /**
     * Destroy instance.
     *
     * @public
     */
    destroy(): void;
    /**
     * Start predicate.
     *
     * @protected
     * @param {Item} item
     * @param {Object} event
     * @returns {(boolean|undefined)}
     */
    protected _startPredicate(item: Item, event: DraggerAnyEvent): boolean | undefined;
    /**
     * Setup/reset drag data.
     *
     * @protected
     */
    protected _reset(): void;
    /**
     * Bind drag scroll handlers.
     *
     * @protected
     */
    protected _bindScrollHandler(): void;
    /**
     * Unbind currently bound drag scroll handlers.
     *
     * @protected
     */
    protected _unbindScrollHandler(): void;
    /**
     * Reset drag sort heuristics.
     *
     * @protected
     * @param {number} x
     * @param {number} y
     */
    protected _resetHeuristics(x: number, y: number): void;
    /**
     * Run heuristics and return true if overlap check can be performed, and false
     * if it can not.
     *
     * @protected
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    protected _checkHeuristics(x: number, y: number): boolean;
    /**
     * Reset default drag start predicate data.
     *
     * @protected
     */
    protected _resetDefaultStartPredicate(): void;
    /**
     * Handle the sorting procedure. Manage drag sort heuristics/interval and
     * check overlap when necessary.
     *
     * @protected
     */
    protected _handleSort(): void;
    /**
     * Delayed sort handler.
     *
     * @protected
     */
    protected _handleSortDelayed(): void;
    /**
     * Cancel and reset sort procedure.
     *
     * @protected
     */
    protected _cancelSort(): void;
    /**
     * Handle the ending of the drag procedure for sorting.
     *
     * @protected
     */
    protected _finishSort(): void;
    /**
     * Check (during drag) if an item is overlapping other items based on
     * the configuration layout the items.
     *
     * @protected
     * @param {Boolean} [isDrop=false]
     */
    protected _checkOverlap(isDrop?: boolean): void;
    /**
     * If item is dragged into another grid, finish the migration process.
     *
     * @protected
     */
    protected _finishMigration(): void;
    /**
     * Drag pre-start handler.
     *
     * @protected
     * @param {Object} event
     */
    protected _preStartCheck(event: DraggerStartEvent | DraggerMoveEvent): void;
    /**
     * Drag pre-end handler.
     *
     * @protected
     * @param {Object} event
     */
    protected _preEndCheck(event: DraggerEndEvent | DraggerCancelEvent): void;
    /**
     * Drag start handler.
     *
     * @protected
     * @param {Object} event
     */
    protected _onStart(event: DraggerStartEvent | DraggerMoveEvent): void;
    /**
     * @protected
     */
    protected _prepareStart(): void;
    /**
     * @protected
     */
    protected _applyStart(): void;
    /**
     * Drag move handler.
     *
     * @protected
     * @param {Object} event
     */
    protected _onMove(event: DraggerMoveEvent): void;
    /**
     * Prepare dragged item for moving.
     *
     * @protected
     */
    protected _prepareMove(): void;
    /**
     * Apply movement to dragged item.
     *
     * @protected
     */
    protected _applyMove(): void;
    /**
     * Drag scroll handler.
     *
     * @protected
     * @param {Object} event
     */
    protected _onScroll(event: Event): void;
    /**
     * Prepare dragged item for scrolling.
     *
     * @protected
     */
    protected _prepareScroll(): void;
    /**
     * Apply scroll to dragged item.
     *
     * @protected
     */
    protected _applyScroll(): void;
    /**
     * Drag end handler.
     *
     * @protected
     * @param {Object} event
     */
    protected _onEnd(event: DraggerEndEvent | DraggerCancelEvent): void;
}

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */
interface AnimationProperties {
    [key: string]: string;
}
interface AnimationOptions {
    duration?: number;
    easing?: string;
    onFinish?: Function;
}
/**
 * Item animation handler powered by Web Animations API.
 */
declare class Animator {
    readonly element: HTMLElement | null;
    readonly animation: Animation | null;
    protected _finishCallback: Function | null;
    constructor(element?: HTMLElement);
    /**
     * Start instance's animation. Automatically stops current animation if it is
     * running.
     */
    start(propsFrom: AnimationProperties, propsTo: AnimationProperties, options?: AnimationOptions): void;
    /**
     * Stop instance's current animation if running.
     */
    stop(): void;
    /**
     * Check if the instance is animating.
     */
    isAnimating(): boolean;
    /**
     * Destroy the instance and stop current animation if it is running.
     */
    destroy(): void;
    /**
     * Animation end handler.
     */
    protected _onFinish(): void;
}

/**
 * Copyright (c) 2018-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Drag placeholder.
 *
 * @class
 * @param {Item} item
 */
declare class ItemDragPlaceholder {
    _item: Item;
    _animator: Animator;
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
    constructor(item: Item);
    /**
     * Create placeholder. Note that this method only writes to DOM and does not
     * read anything from DOM so it should not cause any additional layout
     * thrashing when it's called at the end of the drag start procedure.
     *
     * @public
     */
    create(): void;
    /**
     * Reset placeholder data.
     *
     * @public
     */
    reset(): void;
    /**
     * Check if placeholder is currently active (visible).
     *
     * @public
     * @returns {Boolean}
     */
    isActive(): boolean;
    /**
     * Get placeholder element.
     *
     * @public
     * @returns {?HTMLElement}
     */
    getElement(): HTMLElement | null;
    /**
     * Update placeholder's dimensions to match the item's dimensions. Note that
     * the updating is done asynchronously in the next tick to avoid layout
     * thrashing.
     *
     * @public
     */
    updateDimensions(): void;
    /**
     * Update placeholder's class name.
     *
     * @public
     * @param {string} className
     */
    updateClassName(className: string): void;
    /**
     * Destroy placeholder instance.
     *
     * @public
     */
    destroy(): void;
    /**
     * Update placeholder's dimensions to match the item's dimensions.
     *
     * @private
     */
    _updateDimensions(): void;
    /**
     * Move placeholder to a new position.
     *
     * @private
     * @param {Item[]} items
     * @param {boolean} isInstant
     */
    _onLayoutStart(items: Item[], isInstant: boolean): void;
    /**
     * Prepare placeholder for layout animation.
     *
     * @private
     */
    _setupAnimation(): void;
    /**
     * Start layout animation.
     *
     * @private
     */
    _startAnimation(): void;
    /**
     * Layout end handler.
     *
     * @private
     */
    _onLayoutEnd(): void;
    /**
     * Drag end handler. This handler is called when dragReleaseEnd event is
     * emitted and receives the event data as it's argument.
     *
     * @private
     * @param {Item} item
     */
    _onReleaseEnd(item: Item): void;
    /**
     * Migration start handler. This handler is called when beforeSend event is
     * emitted and receives the event data as it's argument.
     *
     * @private
     * @param {Object} data
     * @param {Item} data.item
     * @param {Grid} data.fromGrid
     * @param {number} data.fromIndex
     * @param {Grid} data.toGrid
     * @param {number} data.toIndex
     */
    _onMigrate(data: {
        item: Item;
        fromGrid: Grid;
        fromIndex: number;
        toGrid: Grid;
        toIndex: number;
    }): void;
    /**
     * Reset placeholder if the associated item is hidden.
     *
     * @private
     * @param {Item[]} items
     */
    _onHide(items: Item[]): void;
}

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * The release process handler constructor. Although this might seem as proper
 * fit for the drag process this needs to be separated into it's own logic
 * because there might be a scenario where drag is disabled, but the release
 * process still needs to be implemented (dragging from a grid to another).
 *
 * @class
 * @param {Item} item
 */
declare class ItemDragRelease {
    readonly item: ItemInternal;
    protected _isActive: boolean;
    protected _isPositioning: boolean;
    protected _isDestroyed: boolean;
    constructor(item: Item);
    /**
     * Is item's drag release process active?
     *
     * @public
     * @returns {boolean}
     */
    isActive(): boolean;
    /**
     * Is item's drag release positioning started?
     *
     * @public
     * @returns {boolean}
     */
    isPositioning(): boolean;
    /**
     * Is instance destroyed?
     *
     * @public
     * @returns {boolean}
     */
    isDestroyed(): boolean;
    /**
     * Start the release process of an item.
     *
     * @public
     */
    start(): void;
    /**
     * End the release process of an item. This method can be used to abort an
     * ongoing release process (animation) or finish the release process.
     *
     * @public
     * @param {Boolean} [abort=false]
     *  - Should the release be aborted? When true, the release end event won't be
     *    emitted. Set to true only when you need to abort the release process
     *    while the item is animating to it's position.
     * @param {number} [left]
     *  - The element's current translateX value (optional).
     * @param {number} [top]
     *  - The element's current translateY value (optional).
     */
    stop(abort?: boolean, left?: number, top?: number): void;
    /**
     * Reset data and remove releasing class.
     *
     * @public
     * @param {Boolean} [needsReflow=false]
     */
    reset(needsReflow?: boolean): void;
    /**
     * Destroy instance.
     *
     * @public
     */
    destroy(): void;
    /**
     * Move the element back to the grid container element if it does not exist
     * there already.
     *
     * @protected
     * @param {number} [left]
     *  - The element's current translateX value (optional).
     * @param {number} [top]
     *  - The element's current translateY value (optional).
     * @returns {boolean}
     *   - Returns `true` if the element was reparented, `false` otherwise.
     */
    protected _placeToGrid(left?: number, top?: number): boolean;
    /**
     * @protected
     */
    protected _onScroll(): void;
}

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Layout manager for Item instance, handles the positioning of an item.
 *
 * @class
 * @param {Item} item
 */
declare class ItemLayout {
    readonly item: ItemInternal;
    protected _skipNextAnimation: boolean;
    protected _isActive: boolean;
    protected _isInterrupted: boolean;
    protected _isDestroyed: boolean;
    protected _easing: string;
    protected _duration: number;
    protected _tX: number;
    protected _tY: number;
    protected _animation: Animator;
    protected _queue: string;
    constructor(item: Item);
    /**
     * @public
     * @returns {boolean}
     */
    isActive(): boolean;
    /**
     * @public
     * @returns {boolean}
     */
    isDestroyed(): boolean;
    /**
     * Start item layout based on it's current data.
     *
     * @public
     * @param {boolean} instant
     * @param {Function} [onFinish]
     */
    start(instant: boolean, onFinish?: () => void): void;
    /**
     * Stop item's position animation if it is currently animating.
     *
     * @public
     * @param {boolean} processCallbackQueue
     * @param {number} [left]
     * @param {number} [top]
     */
    stop(processCallbackQueue: boolean, left?: number, top?: number): void;
    /**
     * Destroy the instance and stop current animation if it is running.
     *
     * @public
     */
    destroy(): void;
    /**
     * Finish item layout procedure.
     *
     * @protected
     */
    protected _finish(): void;
    /**
     * Prepare item for layout animation.
     *
     * @protected
     */
    protected _setupAnimation(): void;
    /**
     * Start layout animation.
     *
     * @protected
     */
    protected _startAnimation(): void;
}

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * The migrate process handler constructor.
 *
 * @class
 * @param {Item} item
 */
declare class ItemMigrate {
    readonly item: ItemInternal;
    readonly container: HTMLElement | null;
    protected _isActive: boolean;
    protected _isDestroyed: boolean;
    constructor(item: Item);
    /**
     * Is migration in process?
     *
     * @public
     * @returns {boolean}
     */
    isActive(): boolean;
    /**
     * Is instance destroyed?
     *
     * @public
     * @returns {boolean}
     */
    isDestroyed(): boolean;
    /**
     * Start the migrate process of an item.
     *
     * @public
     * @param {Grid} nextGrid
     * @param {(HTMLElement|Number|Item)} position
     * @param {HTMLElement} [container]
     */
    start(targetGrid: Grid, position: HTMLElement | number | Item, container?: HTMLElement): void;
    /**
     * End the migrate process of an item. This method can be used to abort an
     * ongoing migrate process (animation) or finish the migrate process.
     *
     * @public
     * @param {boolean} [abort=false]
     *  - Should the migration be aborted?
     * @param {number} [left]
     *  - The element's current translateX value (optional).
     * @param {number} [top]
     *  - The element's current translateY value (optional).
     */
    stop(abort?: boolean, left?: number, top?: number): void;
    /**
     * Destroy instance.
     *
     * @public
     */
    destroy(): void;
}

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Visibility manager for Item instance, handles visibility of an item.
 *
 * @class
 * @param {Item} item
 */
declare class ItemVisibility {
    readonly item: ItemInternal;
    readonly childElement: HTMLElement;
    protected _isHidden: boolean;
    protected _isHiding: boolean;
    protected _isShowing: boolean;
    protected _isDestroyed: boolean;
    protected _currentStyleProps: string[];
    protected _animator: Animator;
    protected _queue: string;
    constructor(item: Item);
    /**
     * Is item hidden currently?
     *
     * @public
     * @returns {boolean}
     */
    isHidden(): boolean;
    /**
     * Is item hiding currently?
     *
     * @public
     * @returns {boolean}
     */
    isHiding(): boolean;
    /**
     * Is item showing currently?
     *
     * @public
     * @returns {boolean}
     */
    isShowing(): boolean;
    /**
     * Is visibility handler destroyed?
     *
     * @public
     * @returns {boolean}
     */
    isDestroyed(): boolean;
    /**
     * Show item.
     *
     * @public
     * @param {boolean} instant
     * @param {Function} [onFinish]
     */
    show(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any): void;
    /**
     * Hide item.
     *
     * @public
     * @param {boolean} instant
     * @param {Function} [onFinish]
     */
    hide(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any): void;
    /**
     * Stop current hiding/showing process.
     *
     * @public
     * @param {boolean} processCallbackQueue
     */
    stop(processCallbackQueue: boolean): void;
    /**
     * Reset all existing visibility styles and apply new visibility styles to the
     * visibility element. This method should be used to set styles when there is a
     * chance that the current style properties differ from the new ones (basically
     * on init and on migrations).
     *
     * @public
     * @param {Object} styles
     */
    setStyles(styles: StyleDeclaration): void;
    /**
     * Destroy the instance and stop current animation if it is running.
     *
     * @public
     */
    destroy(): void;
    /**
     * Start visibility animation.
     *
     * @protected
     * @param {boolean} toVisible
     * @param {boolean} instant
     * @param {Function} [onFinish]
     */
    protected _startAnimation(toVisible: boolean, instant: boolean, onFinish?: () => void): void;
    /**
     * Finish show procedure.
     *
     * @protected
     */
    protected _finishShow(): void;
    /**
     * Finish hide procedure.
     *
     * @protected
     */
    protected _finishHide(): void;
    /**
     * Remove currently applied visibility related inline style properties.
     *
     * @protected
     */
    protected _removeCurrentStyles(): void;
}

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

/**
 * Creates a new Item instance for a Grid instance.
 *
 * @class
 * @param {Grid} grid
 * @param {HTMLElement} element
 * @param {boolean} [isActive]
 */
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
    /**
     * Get the instance grid reference.
     *
     * @public
     * @returns {?Grid}
     */
    getGrid(): Grid | null;
    /**
     * Is the item active?
     *
     * @public
     * @returns {boolean}
     */
    isActive(): boolean;
    /**
     * Is the item visible?
     *
     * @public
     * @returns {boolean}
     */
    isVisible(): boolean;
    /**
     * Is the item being animated to visible?
     *
     * @public
     * @returns {boolean}
     */
    isShowing(): boolean;
    /**
     * Is the item being animated to hidden?
     *
     * @public
     * @returns {boolean}
     */
    isHiding(): boolean;
    /**
     * Is the item positioning?
     *
     * @public
     * @returns {boolean}
     */
    isPositioning(): boolean;
    /**
     * Is the item being dragged (or queued for dragging)?
     *
     * @public
     * @returns {boolean}
     */
    isDragging(): boolean;
    /**
     * Is the item being released?
     *
     * @public
     * @returns {boolean}
     */
    isReleasing(): boolean;
    /**
     * Is the item destroyed?
     *
     * @public
     * @returns {boolean}
     */
    isDestroyed(): boolean;
    /**
     * Recalculate item's dimensions.
     *
     * @protected
     * @param {boolean} [force=false]
     */
    protected _updateDimensions(force?: boolean): void;
    /**
     * Fetch and store item's sort data.
     *
     * @protected
     */
    protected _updateSortData(): void;
    /**
     * Add item to layout.
     *
     * @protected
     * @param {number} [left=0]
     * @param {number} [top=0]
     */
    protected _addToLayout(left?: number, top?: number): void;
    /**
     * Remove item from layout.
     *
     * @protected
     */
    protected _removeFromLayout(): void;
    /**
     * Check if the layout procedure can be skipped for the item.
     *
     * @protected
     * @param {number} left
     * @param {number} top
     * @returns {boolean}
     */
    protected _canSkipLayout(left: number, top: number): boolean;
    /**
     * Set the provided left and top arguments as the item element's translate
     * values in the DOM. This method keeps track of the currently applied
     * translate values and skips the update operation if the provided values are
     * identical to the currently applied values.
     *
     * @protected
     * @param {number} x
     * @param {number} y
     */
    protected _setTranslate(x: number, y: number): void;
    /**
     * Get the item's current translate values. If they can't be detected from cache
     * we will read them from the DOM (so try to use this only when it is safe
     * to query the DOM without causing a forced reflow).
     *
     * @protected
     * @returns {Object}
     */
    protected _getTranslate(): {
        x: number;
        y: number;
    };
    /**
     * Returns the current container's position relative to the client (viewport)
     * with borders excluded from the container. This equals to the client position
     * where the item will be if it is not transformed and it's left/top position at
     * zero. Note that this method uses the cached dimensions of grid, so it is up
     * to the user to update those when necessary before using this method.
     *
     * @protected
     * @returns {Object}
     */
    protected _getClientRootPosition(): {
        left: number;
        top: number;
    };
    /**
     * Check if item will be in viewport with the provided coordinates. The third
     * argument allows defining extra padding for the viewport.
     *
     * @protected
     * @param {number} x
     * @param {number} y
     * @param {number} [viewportThreshold=0]
     * @returns {boolean}
     */
    protected _isInViewport(x: number, y: number, viewportThreshold?: number): boolean;
    /**
     * Destroy item instance.
     *
     * @protected
     * @param {boolean} [removeElement=false]
     */
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

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

declare const ACTION_SWAP = "swap";
declare const ACTION_MOVE = "move";
declare const INSTANT_LAYOUT = "instant";

/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */
interface LayoutItem {
    width: number;
    height: number;
    marginLeft?: number;
    marginRight?: number;
    marginTop?: number;
    marginBottom?: number;
    [key: string]: any;
}
interface LayoutData {
    width: number;
    height: number;
    items: Float32Array | LayoutItem[];
    slots: Float32Array;
}

/**
 * Muuri Packer
 * Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Packer/LICENSE.md
 */

interface LayoutOptions {
    fillGaps?: boolean;
    horizontal?: boolean;
    alignRight?: boolean;
    alignBottom?: boolean;
    rounding?: boolean;
}
interface ContainerData {
    width: number;
    height: number;
    borderLeft?: number;
    borderRight?: number;
    borderTop?: number;
    borderBottom?: number;
    boxSizing?: 'content-box' | 'border-box' | '';
}
declare type LayoutId = number;
declare type LayoutCallback = (layout: LayoutData$1) => any;
interface LayoutData$1 extends LayoutData {
    id: LayoutId;
    styles: StyleDeclaration;
    items: LayoutItem[];
}
interface LayoutWorkerData extends LayoutData$1 {
    container: ContainerData;
    settings: number;
    callback: LayoutCallback;
    packet: Float32Array;
    aborted: boolean;
    worker?: Worker;
}
declare class Packer {
    protected _settings: number;
    protected _asyncMode: boolean;
    protected _layoutWorkerQueue: LayoutId[];
    protected _layoutsProcessing: Set<LayoutId>;
    protected _layoutWorkerData: Map<LayoutId, LayoutWorkerData>;
    protected _workers: Worker[];
    constructor(numWorkers?: number, options?: LayoutOptions);
    updateSettings(options: LayoutOptions): void;
    createLayout(layoutId: LayoutId, items: LayoutItem[], containerData: ContainerData, callback: LayoutCallback): (() => void) | undefined;
    cancelLayout(layoutId: LayoutId): void;
    destroy(): void;
    protected _sendToWorker(): void;
    protected _onWorkerMessage(msg: {
        data: ArrayBufferLike;
    }): void;
    protected _setContainerStyles(layout: LayoutData$1, containerData: ContainerData, settings: number): void;
}

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */
/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. The returned function accepts one argument which, when
 * being `true`, cancels the debounce function immediately. When the debounce
 * function is canceled it cannot be invoked again.
 *
 * @param {Function} fn
 * @param {number} durationMs
 * @returns {Function}
 */
declare function debounce(fn: () => any, durationMs: number): (cancel?: boolean) => void;

/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

declare type InstantLayout = typeof INSTANT_LAYOUT;
declare type MoveAction = typeof ACTION_MOVE | typeof ACTION_SWAP;
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
interface LayoutData$2 {
    id: number;
    items: Item[];
    slots: number[] | Float32Array;
    styles?: StyleDeclaration | null;
    [key: string]: any;
}
declare type LayoutOnFinish = (items: Item[], isAborted: boolean) => any;
declare type LayoutCallback$1 = (layout: LayoutData$2) => any;
declare type LayoutCancel = (...args: any[]) => any;
declare type LayoutFunction = (layoutId: number, grid: Grid, items: Item[], containerData: {
    width: number;
    height: number;
    borderLeft: number;
    borderRight: number;
    borderTop: number;
    borderBottom: number;
    boxSizing: 'border-box' | 'content-box' | '';
}, callback: LayoutCallback$1) => void | undefined | LayoutCancel;
declare type DragStartPredicate = (item: Item, event: DraggerStartEvent | DraggerMoveEvent | DraggerEndEvent | DraggerCancelEvent) => boolean | undefined;
interface DragStartPredicateOptions {
    distance?: number;
    delay?: number;
}
declare type DragSortGetter = (item: Item) => Grid[] | null | void | undefined;
interface DragSortHeuristicsOptions {
    sortInterval?: number;
    minDragDistance?: number;
    minBounceBackAngle?: number;
}
declare type DragSortPredicateResult = {
    grid: Grid;
    index: number;
    action: MoveAction;
} | null;
declare type DragSortPredicate = (item: Item, event: DraggerMoveEvent | DraggerEndEvent | DraggerCancelEvent) => DragSortPredicateResult;
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
    onCreate?: ((item: Item, placeholderElement: HTMLElement) => any) | null;
    onRemove?: ((item: Item, placeholderElement: HTMLElement) => any) | null;
}
interface DragAutoScrollTarget {
    element: Window | HTMLElement;
    axis?: number;
    priority?: number;
    threshold?: number;
}
declare type DragAutoScrollTargets = Array<Window | HTMLElement | DragAutoScrollTarget>;
declare type DragAutoScrollTargetsGetter = (item: Item) => DragAutoScrollTargets;
declare type DragAutoScrollOnStart = (item: Item, scrollElement: Window | HTMLElement, scrollDirection: number) => any;
declare type DragAutoScrollOnStop = (item: Item, scrollElement: Window | HTMLElement, scrollDirection: number) => any;
declare type DragAutoScrollHandle = (item: Item, itemClientX: number, itemClientY: number, itemWidth: number, itemHeight: number, pointerClientX: number, pointerClientY: number) => {
    left: number;
    top: number;
    width: number;
    height: number;
};
declare type DragAutoScrollSpeed = (item: Item, scrollElement: Window | HTMLElement, scrollData: {
    direction: number;
    threshold: number;
    distance: number;
    value: number;
    maxValue: number;
    duration: number;
    speed: number;
    deltaTime: number;
    isEnding: boolean;
}) => number;
interface DragAutoScrollOptions {
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
interface GridSettings {
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
    sortData: {
        [key: string]: (item: Item, element: HTMLElement) => any;
    } | null;
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
    protected _layout: LayoutData$2;
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
    static Emitter: typeof Emitter;
    static Animator: typeof Animator;
    static Dragger: typeof Dragger;
    static Packer: typeof Packer;
    static AutoScroller: typeof AutoScroller;
    static defaultPacker: Packer;
    static defaultOptions: GridSettings;
    /**
     * Bind an event listener.
     *
     * @public
     * @param {string} event
     * @param {Function} listener
     * @returns {Grid}
     */
    on<T extends keyof GridEvents>(event: T, listener: GridEvents[T]): this;
    /**
     * Unbind an event listener.
     *
     * @public
     * @param {string} event
     * @param {Function} listener
     * @returns {Grid}
     */
    off<T extends keyof GridEvents>(event: T, listener: GridEvents[T]): this;
    /**
     * Check if the grid is destroyed.
     *
     * @public
     * @returns {Boolean}
     */
    isDestroyed(): boolean;
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
    getItem(target?: HTMLElement | Item | number): Item | null;
    /**
     * Get all items. Optionally you can provide specific targets (elements,
     * indices and item instances). All items that are not found are omitted from
     * the returned array.
     *
     * @public
     * @param {(HTMLElement|Item|number|Array)} [targets]
     * @returns {Item[]}
     */
    getItems(targets?: HTMLElement | Item | number | (HTMLElement | Item | number)[] | NodeList | HTMLCollection): Item[];
    /**
     * Update the grid's settings.
     *
     * @public
     * @param {Object} options
     * @returns {Grid}
     */
    updateSettings(options: GridOptions): this;
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
    refreshItems(items?: Item[], force?: boolean): this;
    /**
     * Update the sort data of the instance's items. By default all the items are
     * refreshed, but you can also provide an array of target items if you want to
     * refresh specific items.
     *
     * @public
     * @param {Item[]} [items]
     * @returns {Grid}
     */
    refreshSortData(items?: Item[]): this;
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
    synchronize(): this;
    /**
     * Calculate and apply item positions.
     *
     * @public
     * @param {boolean} [instant=false]
     * @param {Function} [onFinish]
     * @returns {Grid}
     */
    layout(instant?: boolean, onFinish?: LayoutOnFinish): this;
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
    add(elements: HTMLElement | HTMLElement[] | NodeList | HTMLCollection, options?: {
        index?: number;
        active?: boolean;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): Item[];
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
    remove(items: Item[], options?: {
        removeElements?: boolean;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): Item[];
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
    show(items: Item[], options?: {
        instant?: boolean;
        syncWithLayout?: boolean;
        onFinish?: (items: Item[]) => any;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
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
    hide(items: Item[], options?: {
        instant?: boolean;
        syncWithLayout?: boolean;
        onFinish?: (items: Item[]) => any;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
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
    filter(predicate: string | ((item: Item) => boolean), options?: {
        instant?: boolean;
        syncWithLayout?: boolean;
        onFinish?: (shownItems: Item[], hiddenItems: Item[]) => any;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
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
    sort(comparer: ((a: Item, b: Item) => number) | string | Item[], options?: {
        descending?: boolean;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
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
    move(item: Item | HTMLElement | number, position: Item | HTMLElement | number, options?: {
        action?: MoveAction;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
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
    send(item: Item | HTMLElement | number, targetGrid: Grid, position: Item | HTMLElement | number, options?: {
        appendTo?: HTMLElement;
        layoutSender?: boolean | InstantLayout | LayoutOnFinish;
        layoutReceiver?: boolean | InstantLayout | LayoutOnFinish;
    }): this;
    /**
     * Destroy the instance.
     *
     * @public
     * @param {boolean} [removeElements=false]
     * @returns {Grid}
     */
    destroy(removeElements?: boolean): this;
    /**
     * Emit a grid event.
     *
     * @protected
     * @param {string} event
     * @param {...*} [args]
     */
    protected _emit<T extends keyof GridEvents>(event: T, ...args: Parameters<GridEvents[T]>): void;
    /**
     * Check if there are any events listeners for an event.
     *
     * @protected
     * @param {string} event
     * @returns {boolean}
     */
    protected _hasListeners<T extends keyof GridEvents>(event: T): boolean;
    /**
     * Update container's width, height and offsets.
     *
     * @protected
     */
    protected _updateBoundingRect(): void;
    /**
     * Update container's border sizes.
     *
     * @protected
     * @param {boolean} left
     * @param {boolean} right
     * @param {boolean} top
     * @param {boolean} bottom
     */
    protected _updateBorders(left: boolean, right: boolean, top: boolean, bottom: boolean): void;
    /**
     * Refresh all of container's internal dimensions and offsets.
     *
     * @protected
     */
    protected _updateDimensions(): void;
    /**
     * Bind grid's resize handler to window.
     *
     * @protected
     * @param {(number|boolean)} delay
     */
    protected _bindLayoutOnResize(delay: number | boolean): void;
    /**
     * Unbind grid's resize handler from window.
     *
     * @protected
     * @param {Grid} grid
     */
    protected _unbindLayoutOnResize(): void;
    /**
     * Calculate and apply item positions.
     *
     * @protected
     * @param {Object} layout
     */
    protected _onLayoutDataReceived(layout: LayoutData$2): void;
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
    protected _setItemsVisibility(items: Item[], toVisible: boolean, options?: {
        instant?: boolean;
        syncWithLayout?: boolean;
        onFinish?: (items: Item[]) => void;
        layout?: boolean | InstantLayout | LayoutOnFinish;
    }): void;
}

export default Grid;
