/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { VIEWPORT_THRESHOLD } from '../constants';

import { addVisibilityTick, cancelVisibilityTick } from '../ticker';

import Grid, { GridInternal } from '../Grid/Grid';
import Item, { ItemInternal } from './Item';
import Animator from '../Animator/Animator';

import addClass from '../utils/addClass';
import getCurrentStyles from '../utils/getCurrentStyles';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import setStyles from '../utils/setStyles';

import { StyleDeclaration } from '../types';

interface GridPrivate extends GridInternal {
  _itemVisibilityNeedsDimensionRefresh?: boolean;
}

/**
 * Visibility manager for Item instance, handles visibility of an item.
 *
 * @class
 * @param {Item} item
 */
class ItemVisibility {
  _item: ItemInternal;
  _isDestroyed: boolean;
  _isHidden: boolean;
  _isHiding: boolean;
  _isShowing: boolean;
  _childElement: HTMLElement;
  _currentStyleProps: string[];
  _animation: Animator;
  _queue: string;

  constructor(item: Item) {
    const isActive = item.isActive();
    const element = item.element;
    const childElement = element.children[0] as HTMLElement | null;

    if (!childElement) {
      throw new Error('No valid child element found within item element.');
    }

    this._item = (item as any) as ItemInternal;
    this._isDestroyed = false;
    this._isHidden = !isActive;
    this._isHiding = false;
    this._isShowing = false;
    this._childElement = childElement;
    this._currentStyleProps = [];
    this._animation = new Animator(childElement);
    this._queue = 'visibility-' + item.id;

    this._finishShow = this._finishShow.bind(this);
    this._finishHide = this._finishHide.bind(this);

    element.style.display = isActive ? '' : 'none';

    const { settings } = item.getGrid() as Grid;
    addClass(element, isActive ? settings.itemVisibleClass : settings.itemHiddenClass);
    this.setStyles(isActive ? settings.visibleStyles : settings.hiddenStyles);
  }

  /**
   * Show item.
   *
   * @public
   * @param {boolean} instant
   * @param {Function} [onFinish]
   */
  show(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any) {
    if (this._isDestroyed) return;

    const item = this._item;
    const callback = isFunction(onFinish) ? onFinish : null;

    // If item is visible call the callback and be done with it.
    if (!this._isShowing && !this._isHidden) {
      callback && callback(false, (item as any) as Item);
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
      const element = item.element;
      const { settings } = item.getGrid() as Grid;
      if (settings) {
        removeClass(element, settings.itemHiddenClass);
        addClass(element, settings.itemVisibleClass);
      }
      if (!this._isHiding) element.style.display = '';
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
  hide(instant: boolean, onFinish?: (isInterrupted: boolean, item: Item) => any) {
    if (this._isDestroyed) return;

    const item = this._item;
    const callback = isFunction(onFinish) ? onFinish : null;

    // If item is already hidden call the callback and be done with it.
    if (!this._isHiding && this._isHidden) {
      callback && callback(false, (item as any) as Item);
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
      const element = item.element;
      const { settings } = item.getGrid() as Grid;
      addClass(element, settings.itemHiddenClass);
      removeClass(element, settings.itemVisibleClass);
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
    if (this._isDestroyed) return;
    if (!this._isHiding && !this._isShowing) return;

    const item = this._item;

    cancelVisibilityTick(item.id);
    this._animation.stop();
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
    const childElement = this._childElement;
    const currentStyleProps = this._currentStyleProps;
    this._removeCurrentStyles();
    let prop: string;
    for (prop in styles) {
      currentStyleProps.push(prop);
      childElement.style[prop as any] = styles[prop];
    }
  }

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   */
  destroy() {
    if (this._isDestroyed) return;

    const item = this._item;
    const element = item.element;
    const { settings } = item.getGrid() as Grid;

    this.stop(true);
    item._emitter.clear(this._queue);
    this._animation.destroy();
    this._removeCurrentStyles();
    if (settings) {
      removeClass(element, settings.itemVisibleClass);
      removeClass(element, settings.itemHiddenClass);
    }
    element.style.display = '';

    // Reset state.
    this._isHiding = this._isShowing = false;
    this._isDestroyed = this._isHidden = true;
  }

  /**
   * Start visibility animation.
   *
   * @private
   * @param {boolean} toVisible
   * @param {boolean} instant
   * @param {Function} [onFinish]
   */
  _startAnimation(toVisible: boolean, instant: boolean, onFinish?: () => void) {
    if (this._isDestroyed) return;

    const item = this._item;
    const grid = (item.getGrid() as any) as GridPrivate;
    const animation = this._animation;
    const childElement = this._childElement;
    const { settings } = grid;
    const targetStyles = toVisible ? settings.visibleStyles : settings.hiddenStyles;
    const duration = toVisible ? settings.showDuration : settings.hideDuration;
    const easing = toVisible ? settings.showEasing : settings.hideEasing;
    const isInstant = instant || duration <= 0;

    // No target styles? Let's quit early.
    if (!targetStyles) {
      animation.stop();
      onFinish && onFinish();
      return;
    }

    // Cancel queued visibility tick.
    cancelVisibilityTick(item.id);

    // If we need to apply the styles instantly without animation.
    if (isInstant) {
      setStyles(childElement, targetStyles);
      animation.stop();
      onFinish && onFinish();
      return;
    }

    // Let's make sure an ongoing animation's callback is cancelled before going
    // further. Without this there's a chance that the animation will finish
    // before the next tick and mess up our logic.
    if (animation.animation) {
      animation.animation.onfinish = null;
    }

    let currentStyles: StyleDeclaration | undefined;
    let tX = 0;
    let tY = 0;

    // Start the animation in the next tick (to avoid layout thrashing).
    grid._itemVisibilityNeedsDimensionRefresh = true;
    addVisibilityTick(
      item.id,
      () => {
        // Make sure the item is still in hiding/showing.
        if (this._isDestroyed || (toVisible ? !this._isShowing : !this._isHiding)) return;

        currentStyles = getCurrentStyles(childElement, targetStyles);

        const { x, y } = item._getTranslate();
        tX = x;
        tY = y;

        if (settings._animationWindowing && grid._itemVisibilityNeedsDimensionRefresh) {
          grid._itemVisibilityNeedsDimensionRefresh = false;
          grid._updateBoundingRect();
          grid._updateBorders(true, false, true, false);
        }
      },
      () => {
        // Make sure the item is still in hiding/showing.
        if (this._isDestroyed || (toVisible ? !this._isShowing : !this._isHiding)) return;

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
            setStyles(childElement, targetStyles);
            animation.stop();
            onFinish && onFinish();
            return;
          }
        }

        if (currentStyles) {
          animation.start(currentStyles, targetStyles, {
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
   *
   * @private
   */
  _finishShow() {
    if (this._isHidden) return;
    this._isShowing = false;
    this._item._emitter.burst(this._queue, false, this._item);
  }

  /**
   * Finish hide procedure.
   *
   * @private
   */
  _finishHide() {
    if (!this._isHidden) return;
    const item = this._item;
    this._isHiding = false;
    item._layout.stop(true, 0, 0);
    item.element.style.display = 'none';
    item._emitter.burst(this._queue, false, item);
  }

  /**
   * Remove currently applied visibility related inline style properties.
   *
   * @private
   */
  _removeCurrentStyles() {
    const childElement = this._childElement;
    const currentStyleProps = this._currentStyleProps;

    let i = 0;
    for (; i < currentStyleProps.length; i++) {
      childElement.style[currentStyleProps[i] as any] = '';
    }

    currentStyleProps.length = 0;
  }
}

export default ItemVisibility;
