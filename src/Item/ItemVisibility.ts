/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { VIEWPORT_THRESHOLD } from '../constants';
import { addVisibilityTick, cancelVisibilityTick } from '../ticker';
import { Grid } from '../Grid/Grid';
import { Item } from './Item';
import { Animator } from '../Animator/Animator';
import { addClass } from '../utils/addClass';
import { getCurrentStyles } from '../utils/getCurrentStyles';
import { isFunction } from '../utils/isFunction';
import { removeClass } from '../utils/removeClass';
import { setStyles } from '../utils/setStyles';
import { StyleDeclaration, Writeable } from '../types';

/**
 * Visibility manager for Item instance, handles visibility of an item.
 *
 * @class
 * @param {Item} item
 */
export class ItemVisibility {
  readonly item: Item | null;
  readonly element: HTMLElement | null;
  readonly animator: Animator;
  _isHidden: boolean;
  _isHiding: boolean;
  _isShowing: boolean;
  _currentStyleProps: string[];
  _queue: string;

  constructor(item: Item) {
    const element = item.element.children[0] as HTMLElement | null;
    if (!element) {
      throw new Error('No valid child element found within item element.');
    }

    const isActive = item.isActive();

    this.item = item;
    this.element = element;
    this.animator = new Animator(element);

    this._isHidden = !isActive;
    this._isHiding = false;
    this._isShowing = false;
    this._currentStyleProps = [];
    this._queue = 'visibility-' + item.id;

    this._finishShow = this._finishShow.bind(this);
    this._finishHide = this._finishHide.bind(this);

    item.element.style.display = isActive ? '' : 'none';

    const { settings } = item.getGrid() as Grid;
    addClass(item.element, isActive ? settings.itemVisibleClass : settings.itemHiddenClass);
    this.setStyles(isActive ? settings.visibleStyles : settings.hiddenStyles);
  }

  /**
   * Is item hidden currently?
   *
   * @public
   * @returns {boolean}
   */
  isHidden() {
    return this._isHidden;
  }

  /**
   * Is item hiding currently?
   *
   * @public
   * @returns {boolean}
   */
  isHiding() {
    return this._isHiding;
  }

  /**
   * Is item showing currently?
   *
   * @public
   * @returns {boolean}
   */
  isShowing() {
    return this._isShowing;
  }

  /**
   * Show item.
   *
   * @public
   * @param {boolean} instant
   * @param {Function} [onFinish]
   */
  show(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => void) {
    if (!this.item) return;

    const { item } = this;
    const callback = isFunction(onFinish) ? onFinish : null;

    // If item is visible call the callback and be done with it.
    if (!this._isShowing && !this._isHidden) {
      callback && callback(false, item as any as Item);
      return;
    }

    // If item is showing and does not need to be shown instantly, let's just
    // push callback to the callback queue and be done with it.
    if (this._isShowing && !instant) {
      callback && item._emitter.on(this._queue, callback);
      return;
    }

    // If the item is hiding or hidden process the current visibility callback
    // queue with the interrupted flag active, update classes and set display
    // to block if necessary.
    if (!this._isShowing) {
      item._emitter.burst(this._queue, true, item);
      const { settings } = item.getGrid() as Grid;
      if (settings) {
        removeClass(item.element, settings.itemHiddenClass);
        addClass(item.element, settings.itemVisibleClass);
      }
      if (!this._isHiding) item.element.style.display = '';
    }

    // Push callback to the callback queue.
    callback && item._emitter.on(this._queue, callback);

    // Update visibility states.
    this._isShowing = true;
    this._isHiding = this._isHidden = false;

    // Finally let's start show animation.
    this._startAnimation(true, instant, this._finishShow);
  }

  /**
   * Hide item.
   *
   * @public
   * @param {boolean} instant
   * @param {Function} [onFinish]
   */
  hide(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => void) {
    if (!this.item) return;

    const { item } = this;
    const callback = isFunction(onFinish) ? onFinish : null;

    // If item is already hidden call the callback and be done with it.
    if (!this._isHiding && this._isHidden) {
      callback && callback(false, item as any as Item);
      return;
    }

    // If item is hiding and does not need to be hidden instantly, let's just
    // push callback to the callback queue and be done with it.
    if (this._isHiding && !instant) {
      callback && item._emitter.on(this._queue, callback);
      return;
    }

    // If the item is showing or visible process the current visibility callback
    // queue with the interrupted flag active, update classes and set display
    // to block if necessary.
    if (!this._isHiding) {
      item._emitter.burst(this._queue, true, item);
      const { settings } = item.getGrid() as Grid;
      addClass(item.element, settings.itemHiddenClass);
      removeClass(item.element, settings.itemVisibleClass);
    }

    // Push callback to the callback queue.
    callback && item._emitter.on(this._queue, callback);

    // Update visibility states.
    this._isHidden = this._isHiding = true;
    this._isShowing = false;

    // Finally let's start hide animation.
    this._startAnimation(false, instant, this._finishHide);
  }

  /**
   * Stop current hiding/showing process.
   *
   * @public
   * @param {boolean} processCallbackQueue
   */
  stop(processCallbackQueue: boolean) {
    if (!this.item || (!this._isHiding && !this._isShowing)) return;

    const { item } = this;

    cancelVisibilityTick(item.id);
    this.animator.stop();
    if (processCallbackQueue) {
      item._emitter.burst(this._queue, true, item);
    }
  }

  /**
   * Reset all existing visibility styles and apply new visibility styles to the
   * visibility element. This method should be used to set styles when there is a
   * chance that the current style properties differ from the new ones (basically
   * on init and on migrations).
   *
   * @public
   * @param {Object} styles
   */
  setStyles(styles: StyleDeclaration) {
    if (!this.element) return;

    const { element, _currentStyleProps } = this;

    this._removeCurrentStyles();

    let prop: string;
    for (prop in styles) {
      _currentStyleProps.push(prop);
      element.style[prop as any] = styles[prop];
    }
  }

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   */
  destroy() {
    if (!this.item) return;

    const { item } = this;
    const itemElement = item.element;
    const { settings } = item.getGrid() as Grid;

    this.stop(true);
    item._emitter.clear(this._queue);
    this.animator.destroy();
    this._removeCurrentStyles();
    if (settings) {
      removeClass(itemElement, settings.itemVisibleClass);
      removeClass(itemElement, settings.itemHiddenClass);
    }
    itemElement.style.display = '';

    this._isHiding = this._isShowing = false;
    this._isHidden = true;

    (this as Writeable<this>).item = null;
  }

  /**
   * Start visibility animation.
   *
   * @param {boolean} toVisible
   * @param {boolean} instant
   * @param {Function} [onFinish]
   */
  _startAnimation(toVisible: boolean, instant: boolean, onFinish?: () => void) {
    if (!this.item || !this.element) return;

    const { item, element, animator } = this;
    const grid = item.getGrid() as Grid;
    const { settings } = grid;
    const targetStyles = toVisible ? settings.visibleStyles : settings.hiddenStyles;
    const duration = toVisible ? settings.showDuration : settings.hideDuration;
    const easing = toVisible ? settings.showEasing : settings.hideEasing;
    const isInstant = instant || duration <= 0;

    // No target styles? Let's quit early.
    if (!targetStyles) {
      animator.stop();
      onFinish && onFinish();
      return;
    }

    // Cancel queued visibility tick.
    cancelVisibilityTick(item.id);

    // If we need to apply the styles instantly without animation.
    if (isInstant) {
      setStyles(element, targetStyles);
      animator.stop();
      onFinish && onFinish();
      return;
    }

    // Let's make sure an ongoing animation's callback is cancelled before going
    // further. Without this there's a chance that the animation will finish
    // before the next tick and mess up our logic.
    if (animator.animation) {
      animator.animation.onfinish = null;
    }

    let currentStyles: StyleDeclaration | undefined;
    let tX = 0;
    let tY = 0;

    // Start the animation in the next tick (to avoid layout thrashing).
    grid._visibilityNeedsDimensionsRefresh = true;
    addVisibilityTick(
      item.id,
      () => {
        // Make sure the item is still in hiding/showing.
        if (!this.item || (toVisible ? !this._isShowing : !this._isHiding)) return;

        currentStyles = getCurrentStyles(element, targetStyles);

        const { x, y } = item._getTranslate();
        tX = x;
        tY = y;

        if (settings._animationWindowing && grid._visibilityNeedsDimensionsRefresh) {
          grid._visibilityNeedsDimensionsRefresh = false;
          grid._updateBoundingRect();
          grid._updateBorders(true, false, true, false);
        }
      },
      () => {
        // Make sure the item is still in hiding/showing.
        if (!this.item || (toVisible ? !this._isShowing : !this._isHiding)) return;

        // If item is not in the viewport let's skip the animation.
        if (settings._animationWindowing && !item._isInViewport(tX, tY, VIEWPORT_THRESHOLD)) {
          if (
            !item.isActive() ||
            !item._isInViewport(
              item.left + item._containerDiffX,
              item.top + item._containerDiffY,
              VIEWPORT_THRESHOLD
            )
          ) {
            setStyles(element, targetStyles);
            animator.stop();
            onFinish && onFinish();
            return;
          }
        }

        if (currentStyles) {
          animator.start(currentStyles, targetStyles, {
            duration: duration,
            easing: easing,
            onFinish: onFinish,
          });
        }
      }
    );
  }

  /**
   * Finish show procedure.
   */
  _finishShow() {
    if (!this.item || this._isHidden) return;
    this._isShowing = false;
    this.item._emitter.burst(this._queue, false, this.item);
  }

  /**
   * Finish hide procedure.
   */
  _finishHide() {
    if (!this.item || !this._isHidden) return;
    const { item } = this;
    this._isHiding = false;
    item._layout.stop(true, 0, 0);
    item.element.style.display = 'none';
    item._emitter.burst(this._queue, false, item);
  }

  /**
   * Remove currently applied visibility related inline style properties.
   */
  _removeCurrentStyles() {
    if (!this.element) return;

    const { element, _currentStyleProps } = this;

    let i = 0;
    for (; i < _currentStyleProps.length; i++) {
      element.style[_currentStyleProps[i] as any] = '';
    }

    _currentStyleProps.length = 0;
  }
}
