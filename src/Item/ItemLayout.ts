/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { VIEWPORT_THRESHOLD } from '../constants';
import { addLayoutTick, cancelLayoutTick } from '../ticker';
import Grid from '../Grid/Grid';
import Item from './Item';
import Animator, { AnimationOptions } from '../Animator/Animator';
import addClass from '../utils/addClass';
import createTranslate from '../utils/createTranslate';
import getTranslate from '../utils/getTranslate';
import isFunction from '../utils/isFunction';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';
import { StyleDeclaration, Writeable } from '../types';

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
export default class ItemLayout {
  readonly item: Item | null;
  readonly animator: Animator;
  _skipNextAnimation: boolean;
  _isActive: boolean;
  _isInterrupted: boolean;
  _easing: string;
  _duration: number;
  _tX: number;
  _tY: number;
  _queue: string;

  constructor(item: Item) {
    this.item = item;
    this.animator = new Animator(item.element);

    this._skipNextAnimation = false;
    this._isActive = false;
    this._isInterrupted = false;
    this._easing = '';
    this._duration = 0;
    this._tX = 0;
    this._tY = 0;
    this._queue = 'layout-' + item.id;

    // Bind animation handlers.
    this._setupAnimation = this._setupAnimation.bind(this);
    this._startAnimation = this._startAnimation.bind(this);
    this._finish = this._finish.bind(this);

    // Set element's initial position styles.
    const { style } = item.element;
    style.left = '0px';
    style.top = '0px';
    this.item._setTranslate(0, 0);
  }

  /**
   * @public
   * @returns {boolean}
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Start item layout based on it's current data.
   *
   * @public
   * @param {boolean} instant
   * @param {Function} [onFinish]
   */
  start(instant: boolean, onFinish?: () => void) {
    if (!this.item) return;

    const { item, animator } = this;
    const grid = item.getGrid() as Grid;
    const release = item._dragRelease;
    const { settings } = grid;
    const isPositioning = this.isActive();
    const isJustReleased = release.isActive() && !release.isPositioning();
    const animDuration = isJustReleased ? settings.dragRelease.duration : settings.layoutDuration;
    const animEasing = isJustReleased ? settings.dragRelease.easing : settings.layoutEasing;
    const animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;

    // If the item is currently positioning cancel potential queued layout tick
    // and process current layout callback queue with interrupted flag on.
    if (isPositioning) {
      cancelLayoutTick(item.id);
      item._emitter.burst(this._queue, true, item);
    }

    // Mark release positioning as started.
    if (isJustReleased) release._isPositioning = true;

    // Push the callback to the callback queue.
    if (onFinish && isFunction(onFinish)) {
      item._emitter.on(this._queue, onFinish);
    }

    // Reset animation skipping flag.
    this._skipNextAnimation = false;

    // If no animations are needed, easy peasy!
    if (!animEnabled) {
      item._setTranslate(item.left + item._containerDiffX, item.top + item._containerDiffY);
      animator.stop();
      this._finish();
      return;
    }

    // Let's make sure an ongoing animation's callback is cancelled before going
    // further. Without this there's a chance that the animation will finish
    // before the next tick and mess up our logic.
    if (animator.animation) {
      animator.animation.onfinish = null;
    }

    // Kick off animation to be started in the next tick.
    grid._layoutNeedsDimensionsRefresh = true;
    this._isActive = true;
    this._easing = animEasing;
    this._duration = animDuration;
    this._isInterrupted = isPositioning;
    addLayoutTick(item.id, this._setupAnimation, this._startAnimation);
  }

  /**
   * Stop item's position animation if it is currently animating.
   *
   * @public
   * @param {boolean} processCallbackQueue
   * @param {number} [left]
   * @param {number} [top]
   */
  stop(processCallbackQueue: boolean, left?: number, top?: number) {
    if (!this.item || !this.isActive()) return;

    const { item } = this;

    // Cancel animation init.
    cancelLayoutTick(item.id);

    // Stop animation.
    if (this.animator.isAnimating()) {
      if (left === undefined || top === undefined) {
        const { x, y } = getTranslate(item.element);
        item._setTranslate(x, y);
      } else {
        item._setTranslate(left, top);
      }
      this.animator.stop();
    }

    // Remove positioning class.
    const { itemPositioningClass } = (item.getGrid() as Grid).settings;
    removeClass(item.element, itemPositioningClass);

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
  destroy() {
    if (!this.item) return;

    this.stop(true, 0, 0);
    this.item._emitter.clear(this._queue);
    this.animator.destroy();

    const { style } = this.item.element;
    style[transformProp as 'transform'] = '';
    style.left = '';
    style.top = '';

    (this as Writeable<this>).item = null;
  }

  /**
   * Finish item layout procedure.
   */
  _finish() {
    if (!this.item) return;

    const { item } = this;

    // Update internal translate values.
    item._translateX = item.left + item._containerDiffX;
    item._translateY = item.top + item._containerDiffY;

    // Mark the item as inactive and remove positioning classes.
    if (this.isActive()) {
      this._isActive = false;
      const { itemPositioningClass } = (item.getGrid() as Grid).settings;
      removeClass(item.element, itemPositioningClass);
    }

    // Finish up release and migration.
    if (item._dragRelease.isActive()) item._dragRelease.stop();
    if (item._migrate.isActive()) item._migrate.stop();

    // Process the callback queue.
    item._emitter.burst(this._queue, false, item);
  }

  /**
   * Prepare item for layout animation.
   */
  _setupAnimation() {
    if (!this.item || !this.isActive()) return;

    const { item } = this;
    const { x, y } = item._getTranslate();

    this._tX = x;
    this._tY = y;

    const grid = item.getGrid() as Grid;
    if (grid.settings._animationWindowing && grid._layoutNeedsDimensionsRefresh) {
      grid._layoutNeedsDimensionsRefresh = false;
      grid._updateBoundingRect();
      grid._updateBorders(true, false, true, false);
    }
  }

  /**
   * Start layout animation.
   */
  _startAnimation() {
    if (!this.item || !this.isActive()) return;

    const { item } = this;
    const { settings } = item.getGrid() as Grid;
    const isInstant = this._duration <= 0;

    // Calculate next translate values.
    const nextLeft = item.left + item._containerDiffX;
    const nextTop = item.top + item._containerDiffY;

    // Check if we can skip the animation and just snap the element to it's
    // place.
    const xDiff = Math.abs(item.left - (this._tX - item._containerDiffX));
    const yDiff = Math.abs(item.top - (this._tY - item._containerDiffY));
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
      this.animator.stop();
      this._finish();
      return;
    }

    // Set item's positioning class if needed.
    if (!this._isInterrupted) {
      addClass(item.element, settings.itemPositioningClass);
    }

    // Get current/next styles for animation and provide animation options.
    CURRENT_STYLES[transformProp] = createTranslate(this._tX, this._tY, settings.translate3d);
    TARGET_STYLES[transformProp] = createTranslate(nextLeft, nextTop, settings.translate3d);
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
    // want to check if the item is still positioning towards the same position
    // as the layout skipping omits released and migrated items. If the item is
    // indeed positioning towards the same position we should probably just
    // change the finish callback and that's it, or not. Food for thought...
    this.animator.start(CURRENT_STYLES, TARGET_STYLES, ANIM_OPTIONS);

    // Unreference callback to avoid mem leaks.
    ANIM_OPTIONS.onFinish = undefined;
  }
}
