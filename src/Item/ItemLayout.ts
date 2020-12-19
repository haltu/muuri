/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { VIEWPORT_THRESHOLD } from '../constants';

import { addLayoutTick, cancelLayoutTick } from '../ticker';

import Item from './Item';
import Animator, { AnimationOptions } from '../Animator/Animator';

import addClass from '../utils/addClass';
import getTranslate from '../utils/getTranslate';
import getTranslateString from '../utils/getTranslateString';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

import { StyleDeclaration } from '../types';

const MIN_ANIMATION_DISTANCE = 2;
const CURRENT_STYLES: StyleDeclaration = {};
const TARGET_STYLES: StyleDeclaration = {};
const ANIM_OPTIONS: AnimationOptions = {
  duration: 0,
  easing: '',
  onFinish: undefined,
};

/**
 * Layout manager for Item instance, handles the positioning of an item.
 *
 * @class
 * @param {Item} item
 */
class ItemLayout {
  public _item: Item;
  public _isActive: boolean;
  public _isDestroyed: boolean;
  public _isInterrupted: boolean;
  public _skipNextAnimation: boolean;
  public _easing: string;
  public _duration: number;
  public _tX: number;
  public _tY: number;
  public _animation: Animator;
  public _queue: string;

  constructor(item: Item) {
    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._isInterrupted = false;
    this._skipNextAnimation = false;
    this._easing = '';
    this._duration = 0;
    this._tX = 0;
    this._tY = 0;
    this._animation = new Animator(item._element);
    this._queue = 'layout-' + item._id;

    // Bind animation handlers.
    this._setupAnimation = this._setupAnimation.bind(this);
    this._startAnimation = this._startAnimation.bind(this);
    this._finish = this._finish.bind(this);

    // Set element's initial position styles.
    const { style } = item._element;
    style.left = '0px';
    style.top = '0px';
    item._setTranslate(0, 0);
  }

  /**
   * Start item layout based on it's current data.
   *
   * @public
   * @param {boolean} instant
   * @param {Function} [onFinish]
   */
  public start(instant: boolean, onFinish?: () => void) {
    if (this._isDestroyed) return;

    const item = this._item;
    const grid = item.getGrid();

    if (!grid) return;

    const release = item._dragRelease;
    const gridSettings = grid._settings;
    const isPositioning = this._isActive;
    const isJustReleased = release.isJustReleased();
    const animation = this._animation;
    const animDuration = isJustReleased
      ? gridSettings.dragRelease.duration
      : gridSettings.layoutDuration;
    const animEasing = isJustReleased ? gridSettings.dragRelease.easing : gridSettings.layoutEasing;
    const animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;

    // If the item is currently positioning cancel potential queued layout tick
    // and process current layout callback queue with interrupted flag on.
    if (isPositioning) {
      cancelLayoutTick(item._id);
      item._emitter.burst(this._queue, true, item);
    }

    // Mark release positioning as started.
    if (isJustReleased) release._isPositioningStarted = true;

    // Push the callback to the callback queue.
    if (onFinish && isFunction(onFinish)) {
      item._emitter.on(this._queue, onFinish);
    }

    // Reset animation skipping flag.
    this._skipNextAnimation = false;

    // If no animations are needed, easy peasy!
    if (!animEnabled) {
      item._setTranslate(item._left + item._containerDiffX, item._top + item._containerDiffY);
      animation.stop();
      this._finish();
      return;
    }

    // Let's make sure an ongoing animation's callback is cancelled before going
    // further. Without this there's a chance that the animation will finish
    // before the next tick and mess up our logic.
    if (animation.animation) {
      animation.animation.onfinish = null;
    }

    // Kick off animation to be started in the next tick.
    grid._itemLayoutNeedsDimensionRefresh = true;
    this._isActive = true;
    this._easing = animEasing;
    this._duration = animDuration;
    this._isInterrupted = isPositioning;
    addLayoutTick(item._id, this._setupAnimation, this._startAnimation);
  }

  /**
   * Stop item's position animation if it is currently animating.
   *
   * @public
   * @param {boolean} processCallbackQueue
   * @param {number} [left]
   * @param {number} [top]
   */
  public stop(processCallbackQueue: boolean, left?: number, top?: number) {
    if (this._isDestroyed || !this._isActive) return;

    const item = this._item;

    // Cancel animation init.
    cancelLayoutTick(item._id);

    // Stop animation.
    if (this._animation.isAnimating()) {
      if (left === undefined || top === undefined) {
        const { x, y } = getTranslate(item._element);
        item._setTranslate(x, y);
      } else {
        item._setTranslate(left, top);
      }
      this._animation.stop();
    }

    // Remove positioning class.
    removeClass(item._element, item.getGrid()?._settings.itemPositioningClass || '');

    // Reset active state.
    this._isActive = false;

    // Process callback queue if needed.
    if (processCallbackQueue) {
      item._emitter.burst(this._queue, true, item);
    }
  }

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   */
  public destroy() {
    if (this._isDestroyed) return;

    this.stop(true, 0, 0);
    this._item._emitter.clear(this._queue);
    this._animation.destroy();

    const { style } = this._item._element;
    style[transformProp as 'transform'] = '';
    style.left = '';
    style.top = '';

    this._isDestroyed = true;
  }

  /**
   * Finish item layout procedure.
   *
   * @private
   */
  public _finish() {
    if (this._isDestroyed) return;

    const item = this._item;

    // Update internal translate values.
    item._translateX = item._left + item._containerDiffX;
    item._translateY = item._top + item._containerDiffY;

    // Mark the item as inactive and remove positioning classes.
    if (this._isActive) {
      this._isActive = false;
      removeClass(item._element, item.getGrid()?._settings.itemPositioningClass || '');
    }

    // Finish up release and migration.
    if (item._dragRelease._isActive) item._dragRelease.stop();
    if (item._migrate._isActive) item._migrate.stop();

    // Process the callback queue.
    item._emitter.burst(this._queue, false, item);
  }

  /**
   * Prepare item for layout animation.
   *
   * @private
   */
  public _setupAnimation() {
    if (this._isDestroyed || !this._isActive) return;

    const item = this._item;
    const { x, y } = item._getTranslate();

    this._tX = x;
    this._tY = y;

    const grid = item.getGrid();
    if (grid && grid._settings._animationWindowing && grid._itemLayoutNeedsDimensionRefresh) {
      grid._itemLayoutNeedsDimensionRefresh = false;
      grid._updateBoundingRect();
      grid._updateBorders(true, false, true, false);
    }
  }

  /**
   * Start layout animation.
   *
   * @private
   */
  public _startAnimation() {
    if (this._isDestroyed || !this._isActive) return;

    const item = this._item;
    const grid = item.getGrid();

    if (!grid) return;

    const settings = grid._settings;
    const isInstant = this._duration <= 0;

    // Calculate next translate values.
    const nextLeft = item._left + item._containerDiffX;
    const nextTop = item._top + item._containerDiffY;

    // Check if we can skip the animation and just snap the element to it's place.
    const xDiff = Math.abs(item._left - (this._tX - item._containerDiffX));
    const yDiff = Math.abs(item._top - (this._tY - item._containerDiffY));
    if (
      isInstant ||
      (xDiff < MIN_ANIMATION_DISTANCE && yDiff < MIN_ANIMATION_DISTANCE) ||
      (settings._animationWindowing &&
        !item._isInViewport(this._tX, this._tY, VIEWPORT_THRESHOLD) &&
        !item._isInViewport(nextLeft, nextTop, VIEWPORT_THRESHOLD))
    ) {
      if (this._isInterrupted || xDiff > 0.1 || yDiff > 0.1) {
        item._setTranslate(nextLeft, nextTop);
      }
      this._animation.stop();
      this._finish();
      return;
    }

    // Set item's positioning class if needed.
    if (!this._isInterrupted) {
      addClass(item._element, settings.itemPositioningClass);
    }

    // Get current/next styles for animation and provide animation options.
    CURRENT_STYLES[transformProp] = getTranslateString(this._tX, this._tY);
    TARGET_STYLES[transformProp] = getTranslateString(nextLeft, nextTop);
    ANIM_OPTIONS.duration = this._duration;
    ANIM_OPTIONS.easing = this._easing;
    ANIM_OPTIONS.onFinish = this._finish;

    // Set internal translation values to undefined for the duration of the
    // animation since they will be changing on each animation frame for the
    // duration of the animation and tracking them would mean reading the DOM on
    // each frame, which is pretty darn expensive.
    item._translateX = item._translateY = undefined;

    // Start animation.
    // NOTE: If item is being released or migrated when this is called we might
    // want to check if the item is still positioning towards the same position as
    // the layout skipping omits released and migrated items. If the item is
    // indeed positioning towards the same position we should probably just change
    // the finish callback and that's it, or not. Food for thought...
    this._animation.start(CURRENT_STYLES, TARGET_STYLES, ANIM_OPTIONS);

    // Unreference callback to avoid mem leaks.
    ANIM_OPTIONS.onFinish = undefined;
  }
}

export default ItemLayout;
