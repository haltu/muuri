/**
 * Muuri Dragger
 * Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/src/Dragger/LICENSE.md
 */

import {
  HAS_TOUCH_EVENTS,
  HAS_POINTER_EVENTS,
  HAS_PASSIVE_EVENTS,
  IS_FIREFOX,
  IS_ANDROID,
} from '../constants';
import Emitter from '../Emitter/Emitter';
import getPrefixedPropName from '../utils/getPrefixedPropName';
import { Writeable } from '../types';

type DraggerListenerType = 0 | 1 | 2 | 3;

export type DraggerTouchAction = string;

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

export type DraggerEventType = 'start' | 'move' | 'end' | 'cancel';

export type DraggerPointerType = 'mouse' | 'pen' | 'touch';

export interface DraggerEvent {
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
  end(event: DraggerEndEvent): any;
  cancel(event: DraggerCancelEvent): any;
}

export const POINTER_EVENTS = {
  start: 'pointerdown',
  move: 'pointermove',
  cancel: 'pointercancel',
  end: 'pointerup',
} as const;

export const TOUCH_EVENTS = {
  start: 'touchstart',
  move: 'touchmove',
  cancel: 'touchcancel',
  end: 'touchend',
} as const;

export const MOUSE_EVENTS = {
  start: 'mousedown',
  move: 'mousemove',
  cancel: '',
  end: 'mouseup',
} as const;

export const SOURCE_EVENTS = {
  ...(HAS_TOUCH_EVENTS ? TOUCH_EVENTS : HAS_POINTER_EVENTS ? POINTER_EVENTS : MOUSE_EVENTS),
} as const;

export const DRAGGER_EVENTS = {
  start: 'start',
  move: 'move',
  cancel: 'cancel',
  end: 'end',
} as const;

const CAPTURE = 1;
const PASSIVE = 2;
const TA_AUTO = 'auto';
const TA_PROP = 'touchAction';
const TA_PROP_PREFIXED = getPrefixedPropName(document.documentElement.style, TA_PROP);

function preventDefault(e: PointerEvent | TouchEvent | MouseEvent) {
  if (e.preventDefault && e.cancelable !== false) e.preventDefault();
}

function getListenerType(capture: boolean, passive: boolean) {
  return ((capture ? CAPTURE : 0) |
    (HAS_PASSIVE_EVENTS && passive ? PASSIVE : 0)) as DraggerListenerType;
}

function getListenerOptions(listenerType: DraggerListenerType) {
  return HAS_PASSIVE_EVENTS
    ? {
        capture: !!(CAPTURE & listenerType),
        passive: !!(PASSIVE & listenerType),
      }
    : !!(CAPTURE & listenerType);
}

function getPointerType(e: PointerEvent | TouchEvent | MouseEvent): DraggerPointerType {
  return 'pointerType' in e
    ? (e.pointerType as DraggerPointerType)
    : 'touches' in e
    ? 'touch'
    : 'mouse';
}

function getEventPointerId(e: PointerEvent | TouchEvent | MouseEvent) {
  // If we have pointer id available let's use it.
  if ('pointerId' in e) return e.pointerId;
  // For touch events let's get the first changed touch's identifier.
  if ('changedTouches' in e) return e.changedTouches[0] ? e.changedTouches[0].identifier : null;
  // For mouse/other events let's provide a static id.
  return 1;
}

function getTouchById(
  e: PointerEvent | TouchEvent | MouseEvent,
  id: number
): PointerEvent | MouseEvent | Touch | null {
  // If we have a pointer event return the whole event if there's a match, and
  // null otherwise.
  if ('pointerId' in e) {
    return e.pointerId === id ? e : null;
  }

  // For touch events let's check if there's a changed touch object that matches
  // the pointerId in which case return the touch object.
  if ('changedTouches' in e) {
    let i = 0;
    for (; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === id) {
        return e.changedTouches[i];
      }
    }
    return null;
  }

  // For mouse/other events let's assume there's only one pointer and just
  // return the event.
  return e;
}

/**
 * Creates a new DragProxy instance that propagates events from window to
 * dragger instances.
 */
class DragProxy {
  protected _emitter: Emitter;
  protected _listenerOptions: ReturnType<typeof getListenerOptions>;
  protected _draggers: Set<Dragger>;

  constructor(listenerType: DraggerListenerType) {
    this._emitter = new Emitter();
    this._listenerOptions = getListenerOptions(listenerType);
    this._draggers = new Set();
    this._onMove = this._onMove.bind(this);
    this._onCancel = this._onCancel.bind(this);
    this._onEnd = this._onEnd.bind(this);
  }

  hasDragger(dragger: Dragger) {
    return this._draggers.has(dragger);
  }

  addDragger(dragger: Dragger) {
    if (this._draggers.has(dragger)) return;

    this._draggers.add(dragger);
    this._emitter.on(DRAGGER_EVENTS.move, dragger.onMove);
    this._emitter.on(DRAGGER_EVENTS.cancel, dragger.onCancel);
    this._emitter.on(DRAGGER_EVENTS.end, dragger.onEnd);

    if (this._draggers.size === 1) {
      this._activate();
    }
  }

  removeDragger(dragger: Dragger) {
    if (!this._draggers.has(dragger)) return;

    this._draggers.delete(dragger);
    this._emitter.off(DRAGGER_EVENTS.move, dragger.onMove);
    this._emitter.off(DRAGGER_EVENTS.cancel, dragger.onCancel);
    this._emitter.off(DRAGGER_EVENTS.end, dragger.onEnd);

    if (this._draggers.size === 0) {
      this._deactivate();
    }
  }

  destroy() {
    if (this._draggers.size) this._deactivate();
    this._draggers.clear();
    this._emitter.destroy();
  }

  protected _activate() {
    window.addEventListener(SOURCE_EVENTS.move, this._onMove, this._listenerOptions);
    window.addEventListener(SOURCE_EVENTS.end, this._onEnd, this._listenerOptions);
    if (SOURCE_EVENTS.cancel) {
      window.addEventListener(SOURCE_EVENTS.cancel, this._onCancel, this._listenerOptions);
    }
  }

  protected _deactivate() {
    window.removeEventListener(SOURCE_EVENTS.move, this._onMove, this._listenerOptions);
    window.removeEventListener(SOURCE_EVENTS.end, this._onEnd, this._listenerOptions);
    if (SOURCE_EVENTS.cancel) {
      window.removeEventListener(SOURCE_EVENTS.cancel, this._onCancel, this._listenerOptions);
    }
  }

  protected _onMove(e: PointerEvent | TouchEvent | MouseEvent) {
    this._emitter.emit(DRAGGER_EVENTS.move, e);
  }

  protected _onCancel(e: PointerEvent | TouchEvent | MouseEvent) {
    this._emitter.emit(DRAGGER_EVENTS.cancel, e);
  }

  protected _onEnd(e: PointerEvent | TouchEvent | MouseEvent) {
    this._emitter.emit(DRAGGER_EVENTS.end, e);
  }
}

const dragProxies: DragProxy[] = [new DragProxy(0), new DragProxy(1)];
if (HAS_PASSIVE_EVENTS) dragProxies.push(new DragProxy(2), new DragProxy(3));

/**
 * Creates a new Dragger instance for an element.
 */
export default class Dragger {
  readonly element: HTMLElement | null;
  protected _emitter: Emitter;
  protected _cssProps: { [key: string]: string };
  protected _touchAction: DraggerTouchAction;
  protected _listenerType: DraggerListenerType;
  protected _isActive: boolean;
  protected _pointerId: number | null;
  protected _startTime: number;
  protected _startX: number;
  protected _startY: number;
  protected _currentX: number;
  protected _currentY: number;

  constructor(
    element: HTMLElement,
    cssProps?: DraggerCssPropsOptions,
    listenerOptions: DraggerListenerOptions = {}
  ) {
    const { capture = true, passive = true } = listenerOptions;

    this.element = element;
    this._emitter = new Emitter();
    this._cssProps = {};
    this._touchAction = '';
    this._listenerType = getListenerType(capture, passive);
    this._isActive = false;
    this._pointerId = null;
    this._startTime = 0;
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;

    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onEnd = this.onEnd.bind(this);

    // Apply initial CSS props.
    if (cssProps) this.setCssProps(cssProps);

    // Make sure we have some touch action set.
    if (!this._touchAction) this.setTouchAction(TA_AUTO);

    // Prevent native DnD API from kicking in for the item and it's children.
    element.addEventListener('dragstart', preventDefault, false);

    // Listen to start event.
    element.addEventListener(
      SOURCE_EVENTS.start,
      this.onStart,
      getListenerOptions(this._listenerType)
    );
  }

  /**
   * If the provided event is a PointerEvent this method will return it if it has
   * the same pointerId as the instance. If the provided event is a TouchEvent
   * this method will try to look for a Touch instance in the changedTouches that
   * has an identifier matching this instance's pointerId. If the provided event
   * is a MouseEvent (or just any other event than PointerEvent or TouchEvent)
   * it will be returned immediately.
   */
  getTrackedTouch(
    e: PointerEvent | TouchEvent | MouseEvent
  ): PointerEvent | MouseEvent | Touch | null {
    if (this._pointerId === null) return null;
    return getTouchById(e, this._pointerId);
  }

  /**
   * Handler for start event.
   */
  onStart(e: PointerEvent | TouchEvent | MouseEvent) {
    if (!this.element) return;

    // If pointer id is already assigned let's return early.
    if (this._pointerId !== null) return;

    // Get (and set) pointer id.
    this._pointerId = getEventPointerId(e);
    if (this._pointerId === null) return;

    // Get the event/touch.
    const touch = this.getTrackedTouch(e);
    if (!touch) return;

    // Setup initial data and emit start event.
    this._startX = this._currentX = touch.clientX;
    this._startY = this._currentY = touch.clientY;
    this._startTime = Date.now();
    this._isActive = true;
    this._emit(DRAGGER_EVENTS.start, e);

    // If the drag procedure was not reset within the start procedure let's
    // activate the instance (start listening to move/cancel/end events).
    if (this._isActive) {
      const proxy = dragProxies[this._listenerType];
      if (proxy) proxy.addDragger(this);
    }
  }

  /**
   * Handler for move event.
   */
  onMove(e: PointerEvent | TouchEvent | MouseEvent) {
    const touch = this.getTrackedTouch(e);
    if (!touch) return;
    this._currentX = touch.clientX;
    this._currentY = touch.clientY;
    this._emit(DRAGGER_EVENTS.move, e);
  }

  /**
   * Handler for cancel event.
   */
  onCancel(e: PointerEvent | TouchEvent | MouseEvent) {
    if (!this.getTrackedTouch(e)) return;
    this._emit(DRAGGER_EVENTS.cancel, e);
    this.reset();
  }

  /**
   * Handler for end event.
   */
  onEnd(e: PointerEvent | TouchEvent | MouseEvent) {
    if (!this.getTrackedTouch(e)) return;
    this._emit(DRAGGER_EVENTS.end, e);
    this.reset();
  }

  /**
   * Check if the element is being dragged at the moment.
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Set element's touch-action CSS property.
   */
  setTouchAction(value: DraggerTouchAction) {
    if (!this.element || !value) return;

    // Store unmodified touch action value (we trust user input here).
    this._touchAction = value;

    // Set touch-action style.
    if (TA_PROP_PREFIXED) {
      this._cssProps[TA_PROP_PREFIXED] = '';
      this.element.style[TA_PROP_PREFIXED as any] = value;
    }

    // If we have an unsupported touch-action value let's add a special listener
    // that prevents default action on touch start event. A dirty hack, but best
    // we can do for now. The other options would be to somehow polyfill the
    // unsupported touch action behavior with custom heuristics which sounds like
    // a can of worms. We do a special exception here for Firefox Android which's
    // touch-action does not work properly if the dragged element is moved in the
    // the DOM tree on touchstart.
    if (HAS_TOUCH_EVENTS) {
      this.element.removeEventListener(TOUCH_EVENTS.start, preventDefault, true);
      if (
        value !== TA_AUTO &&
        (this.element.style[TA_PROP_PREFIXED as any] !== value || (IS_FIREFOX && IS_ANDROID))
      ) {
        this.element.addEventListener(TOUCH_EVENTS.start, preventDefault, true);
      }
    }
  }

  /**
   * Update element's CSS properties. Accepts an object with camel cased style
   * props with value pairs as it's first argument.
   */
  setCssProps(newProps: DraggerCssPropsOptions) {
    if (!this.element) return;

    const currentProps = this._cssProps;
    const { element } = this;

    // Reset current props.
    let currentProp = '';
    for (currentProp in currentProps) {
      element.style[currentProp as any] = currentProps[currentProp];
      delete currentProps[currentProp];
    }

    // Set new props.
    let prop: keyof DraggerCssPropsOptions;
    for (prop in newProps) {
      // Make sure we have a value for the prop.
      const propValue = newProps[prop] || '';
      if (!propValue) continue;

      // Special handling for touch-action.
      if (prop === TA_PROP) {
        this.setTouchAction(propValue);
        continue;
      }

      // Get prefixed prop and skip if it does not exist.
      const prefixedProp = getPrefixedPropName(element.style, prop);
      if (!prefixedProp) continue;

      // Store the prop and add the style.
      currentProps[prefixedProp] = '';
      element.style[prefixedProp as any] = propValue;
    }
  }

  /**
   * Update the instance's event listener options.
   */
  setListenerOptions(options: DraggerListenerOptions) {
    if (!this.element) return;

    const { capture = true, passive = true } = options;
    const current = this._listenerType;
    const next = getListenerType(capture, passive);

    // If we need to update event listeners.
    if (current !== next) {
      // Unbind start listener.
      this.element.removeEventListener(
        SOURCE_EVENTS.start,
        this.onStart,
        getListenerOptions(this._listenerType)
      );

      // Deactivate instance if it's active.
      const currentProxy = dragProxies[this._listenerType];
      const isActive = currentProxy ? currentProxy.hasDragger(this) : false;
      if (isActive) currentProxy.removeDragger(this);

      // Update listener type.
      this._listenerType = next;

      // Rebind start listener with new listener options.
      this.element.addEventListener(
        SOURCE_EVENTS.start,
        this.onStart,
        getListenerOptions(this._listenerType)
      );

      // Reactivate item with new listener options.
      if (isActive) {
        const nextProxy = dragProxies[this._listenerType];
        if (nextProxy) nextProxy.addDragger(this);
      }
    }
  }

  /**
   * How much the pointer has moved on x-axis from start position, in pixels.
   * Positive value indicates movement from left to right.
   */
  getDeltaX() {
    return this._currentX - this._startX;
  }

  /**
   * How much the pointer has moved on y-axis from start position, in pixels.
   * Positive value indicates movement from top to bottom.
   */
  getDeltaY() {
    return this._currentY - this._startY;
  }

  /**
   * How far (in pixels) has pointer moved from start position.
   */
  getDistance() {
    const x = this.getDeltaX();
    const y = this.getDeltaY();
    return Math.sqrt(x * x + y * y);
  }

  /**
   * How long has pointer been dragged.
   */
  getDeltaTime() {
    return this._startTime ? Date.now() - this._startTime : 0;
  }

  /**
   * Bind drag event listeners.
   */
  on<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void {
    this._emitter.on(event, listener);
  }

  /**
   * Unbind drag event listeners.
   */
  off<T extends keyof DraggerEvents>(event: T, listener: DraggerEvents[T]): void {
    this._emitter.off(event, listener);
  }

  /**
   * Reset current drag operation (if any).
   */
  reset() {
    this._pointerId = null;
    this._startTime = 0;
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;
    this._isActive = false;

    const proxy = dragProxies[this._listenerType];
    if (proxy) proxy.removeDragger(this);
  }

  /**
   * Destroy the instance and unbind all drag event listeners.
   */
  destroy() {
    const { element } = this;
    if (!element) return;

    // Reset data and deactivate the instance.
    this.reset();

    // Destroy emitter.
    this._emitter.destroy();

    // Unbind event handlers.
    element.removeEventListener(
      SOURCE_EVENTS.start,
      this.onStart,
      getListenerOptions(this._listenerType)
    );
    element.removeEventListener('dragstart', preventDefault, false);
    element.removeEventListener(TOUCH_EVENTS.start, preventDefault, true);

    // Reset applied inline styles.
    let prop: string;
    for (prop in this._cssProps) {
      element.style[prop as any] = '';
    }

    // Reset data.
    this._cssProps = {};
    (this as Writeable<this>).element = null;
  }

  protected _createEvent(
    type: DraggerEventType,
    e: PointerEvent | TouchEvent | MouseEvent
  ): DraggerEvent | null {
    const touch = this.getTrackedTouch(e);
    if (!touch || this._pointerId === null) return null;
    return {
      // Hammer.js compatibility interface.
      type: type,
      srcEvent: e,
      distance: this.getDistance(),
      deltaX: this.getDeltaX(),
      deltaY: this.getDeltaY(),
      deltaTime: type === DRAGGER_EVENTS.start ? 0 : this.getDeltaTime(),
      isFirst: type === DRAGGER_EVENTS.start,
      isFinal: type === DRAGGER_EVENTS.end || type === DRAGGER_EVENTS.cancel,
      pointerType: getPointerType(e),
      // Partial Touch API interface.
      identifier: this._pointerId,
      screenX: touch.screenX,
      screenY: touch.screenY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      target: touch.target,
    };
  }

  protected _emit(type: DraggerEventType, e: PointerEvent | TouchEvent | MouseEvent) {
    this._emitter.emit(type, this._createEvent(type, e));
  }
}
