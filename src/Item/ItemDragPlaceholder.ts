/**
 * Copyright (c) 2018-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import {
  addPlaceholderLayoutTick,
  cancelPlaceholderLayoutTick,
  addPlaceholderResizeTick,
  cancelPlaceholderResizeTick,
} from '../ticker';
import {
  EVENT_BEFORE_SEND,
  EVENT_DRAG_RELEASE_END,
  EVENT_LAYOUT_START,
  EVENT_HIDE_START,
} from '../constants';
import Grid from '../Grid/Grid';
import Item from './Item';
import Animator from '../Animator/Animator';
import addClass from '../utils/addClass';
import createTranslate from '../utils/createTranslate';
import getTranslate from '../utils/getTranslate';
import isFunction from '../utils/isFunction';
import setStyles from '../utils/setStyles';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';
import { StyleDeclaration, Writeable } from '../types';

const CURRENT_STYLES: StyleDeclaration = {};
const TARGET_STYLES: StyleDeclaration = {};

/**
 * Drag placeholder.
 *
 * @class
 * @param {Item} item
 */
export default class ItemDragPlaceholder {
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

  constructor(item: Item) {
    this.item = item;
    this.element = null;
    this.animator = new Animator();
    this.left = 0;
    this.top = 0;

    this._className = '';
    this._didMigrate = false;
    this._resetAfterLayout = false;
    this._transX = 0;
    this._transY = 0;
    this._nextTransX = 0;
    this._nextTransY = 0;

    // Bind animation handlers.
    this._setupAnimation = this._setupAnimation.bind(this);
    this._startAnimation = this._startAnimation.bind(this);
    this._updateDimensions = this._updateDimensions.bind(this);

    // Bind event handlers.
    this._onLayoutStart = this._onLayoutStart.bind(this);
    this._onLayoutEnd = this._onLayoutEnd.bind(this);
    this._onReleaseEnd = this._onReleaseEnd.bind(this);
    this._onMigrate = this._onMigrate.bind(this);
    this._onHide = this._onHide.bind(this);
  }

  /**
   * Create placeholder. Note that this method only writes to DOM and does not
   * read anything from DOM so it should not cause any additional layout
   * thrashing when it's called at the end of the drag start procedure.
   *
   * @public
   */
  create() {
    if (!this.item) return;

    // If we already have placeholder set up we can skip the initiation logic.
    if (this.element) {
      this._resetAfterLayout = false;
      return;
    }

    const { item } = this;
    const grid = item.getGrid() as Grid;
    const { settings } = grid;

    // Keep track of layout position.
    (this as Writeable<this>).left = item.left;
    (this as Writeable<this>).top = item.top;

    // Create placeholder element.
    let element: HTMLElement;
    if (isFunction(settings.dragPlaceholder.createElement)) {
      element = settings.dragPlaceholder.createElement(item);
    } else {
      element = document.createElement('div');
    }

    // Update element to instance and animation instance.
    (this as Writeable<this>).element = element;
    (this.animator as Writeable<Animator>).element = element;

    // Add placeholder class to the placeholder element.
    this._className = settings.itemPlaceholderClass || '';
    if (this._className) {
      addClass(element as HTMLElement, this._className);
    }

    // Set initial styles.
    setStyles(element, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: item.width + 'px',
      height: item.height + 'px',
    });

    // Set initial position.
    element.style[transformProp as 'transform'] = createTranslate(
      item.left + item.marginLeft,
      item.top + item.marginTop,
      settings.translate3d
    );

    // Bind event listeners.
    grid.on(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.on(EVENT_BEFORE_SEND, this._onMigrate);
    grid.on(EVENT_HIDE_START, this._onHide);

    // onCreate hook.
    if (isFunction(settings.dragPlaceholder.onCreate)) {
      settings.dragPlaceholder.onCreate(item, element);
    }

    // Insert the placeholder element to the grid.
    grid.element.appendChild(element);
  }

  /**
   * Reset placeholder data.
   *
   * @public
   */
  reset() {
    if (!this.item || !this.element) return;

    const { item, element, animator } = this;
    const grid = item.getGrid() as Grid;

    // Reset flag.
    this._resetAfterLayout = false;

    // Cancel potential (queued) layout tick.
    cancelPlaceholderLayoutTick(item.id);
    cancelPlaceholderResizeTick(item.id);

    // Reset animation instance.
    animator.stop();
    (animator as Writeable<Animator>).element = null;

    // Unbind event listeners.
    grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.off(EVENT_BEFORE_SEND, this._onMigrate);
    grid.off(EVENT_HIDE_START, this._onHide);

    // Remove placeholder class from the placeholder element.
    if (this._className) {
      removeClass(element, this._className);
      this._className = '';
    }

    // Remove element.
    element.parentNode?.removeChild(element);
    (this as Writeable<this>).element = null;

    // onRemove hook. Note that here we use the current grid's onRemove callback
    // so if the item has migrated during drag the onRemove method will not be
    // the originating grid's method.
    const { onRemove } = grid.settings.dragPlaceholder;
    if (isFunction(onRemove)) onRemove(item, element);
  }

  /**
   * Check if placeholder is currently active (visible).
   *
   * @public
   * @returns {boolean}
   */
  isActive() {
    return !!this.element;
  }

  /**
   * Update placeholder's dimensions to match the item's dimensions. Note that
   * the updating is done asynchronously in the next tick to avoid layout
   * thrashing.
   *
   * @public
   */
  updateDimensions() {
    if (!this.item || !this.isActive()) return;
    addPlaceholderResizeTick(this.item.id, this._updateDimensions);
  }

  /**
   * Update placeholder's class name.
   *
   * @public
   * @param {string} className
   */
  updateClassName(className: string) {
    if (!this.element) return;
    removeClass(this.element, this._className);
    this._className = className;
    addClass(this.element, className);
  }

  /**
   * Destroy placeholder instance.
   *
   * @public
   */
  destroy() {
    this.reset();
    this.animator && this.animator.destroy();
    (this as Writeable<this>).item = null;
  }

  /**
   * Update placeholder's dimensions to match the item's dimensions.
   *
   * @protected
   */
  protected _updateDimensions() {
    if (!this.item || !this.element) return;

    setStyles(this.element, {
      width: this.item.width + 'px',
      height: this.item.height + 'px',
    });
  }

  /**
   * Move placeholder to a new position.
   *
   * @protected
   * @param {Item[]} items
   * @param {boolean} isInstant
   */
  protected _onLayoutStart(items: Item[], isInstant: boolean) {
    if (!this.item || !this.element) return;

    const { item } = this;

    // If the item is not part of the layout anymore reset placeholder.
    if (items.indexOf(item) === -1) {
      this.reset();
      return;
    }

    const nextLeft = item.left;
    const nextTop = item.top;
    const currentLeft = this.left;
    const currentTop = this.top;

    // Keep track of item layout position.
    (this as Writeable<this>).left = nextLeft;
    (this as Writeable<this>).top = nextTop;

    // If item's position did not change, and the item did not migrate and the
    // layout is not instant and we can safely skip layout.
    if (!isInstant && !this._didMigrate && currentLeft === nextLeft && currentTop === nextTop) {
      return;
    }

    // Slots data is calculated with item margins added to them so we need to
    // add item's left and top margin to the slot data to get the placeholder's
    // next position.
    const nextX = nextLeft + item.marginLeft;
    const nextY = nextTop + item.marginTop;

    // Just snap to new position without any animations if no animation is
    // required or if placeholder moves between grids.
    const grid = item.getGrid() as Grid;
    const animEnabled = !isInstant && grid.settings.layoutDuration > 0;
    if (!animEnabled || this._didMigrate) {
      // Cancel potential (queued) layout tick.
      cancelPlaceholderLayoutTick(item.id);

      // Snap placeholder to correct position.
      this.element.style[transformProp as 'transform'] = createTranslate(
        nextX,
        nextY,
        grid.settings.translate3d
      );
      this.animator.stop();

      // Move placeholder inside correct container after migration.
      if (this._didMigrate) {
        grid.element.appendChild(this.element);
        this._didMigrate = false;
      }

      return;
    }

    // Let's make sure an ongoing animation's callback is cancelled before going
    // further. Without this there's a chance that the animation will finish
    // before the next tick and mess up our logic.
    if (this.animator.animation) {
      this.animator.animation.onfinish = null;
    }

    // Start the placeholder's layout animation in the next tick. We do this to
    // avoid layout thrashing.
    this._nextTransX = nextX;
    this._nextTransY = nextY;
    addPlaceholderLayoutTick(item.id, this._setupAnimation, this._startAnimation);
  }

  /**
   * Prepare placeholder for layout animation.
   *
   * @protected
   */
  protected _setupAnimation() {
    if (!this.element) return;

    const { x, y } = getTranslate(this.element);
    this._transX = x;
    this._transY = y;
  }

  /**
   * Start layout animation.
   *
   * @protected
   */
  protected _startAnimation() {
    if (!this.item || !this.element) return;

    const { animator } = this;
    const currentX = this._transX;
    const currentY = this._transY;
    const nextX = this._nextTransX;
    const nextY = this._nextTransY;
    const { layoutDuration, layoutEasing, translate3d } = (this.item.getGrid() as Grid).settings;

    // If placeholder is already in correct position let's just stop animation
    // and be done with it.
    if (currentX === nextX && currentY === nextY) {
      if (animator.isAnimating()) {
        this.element.style[transformProp as 'transform'] = createTranslate(
          nextX,
          nextY,
          translate3d
        );
        animator.stop();
      }
      return;
    }

    // Otherwise let's start the animation.
    CURRENT_STYLES[transformProp] = createTranslate(currentX, currentY, translate3d);
    TARGET_STYLES[transformProp] = createTranslate(nextX, nextY, translate3d);
    animator.start(CURRENT_STYLES, TARGET_STYLES, {
      duration: layoutDuration,
      easing: layoutEasing,
      onFinish: this._onLayoutEnd,
    });
  }

  /**
   * Layout end handler.
   *
   * @protected
   */
  protected _onLayoutEnd() {
    if (this._resetAfterLayout) {
      this.reset();
    }
  }

  /**
   * Drag end handler. This handler is called when dragReleaseEnd event is
   * emitted and receives the event data as it's argument.
   *
   * @protected
   * @param {Item} item
   */
  protected _onReleaseEnd(item: Item) {
    if (this.item && this.item.id === item.id) {
      // If the placeholder is not animating anymore we can safely reset it.
      if (!this.animator.isAnimating()) {
        this.reset();
        return;
      }

      // If the placeholder item is still animating here, let's wait for it to
      // finish it's animation.
      this._resetAfterLayout = true;
    }
  }

  /**
   * Migration start handler. This handler is called when beforeSend event is
   * emitted and receives the event data as it's argument.
   *
   * @protected
   * @param {Object} data
   * @param {Item} data.item
   * @param {Grid} data.fromGrid
   * @param {number} data.fromIndex
   * @param {Grid} data.toGrid
   * @param {number} data.toIndex
   */
  protected _onMigrate(data: {
    item: Item;
    fromGrid: Grid;
    fromIndex: number;
    toGrid: Grid;
    toIndex: number;
  }) {
    // Make sure we have a matching item.
    if (!this.item || this.item !== data.item) return;

    // Unbind listeners from current grid.
    const grid = this.item.getGrid() as Grid;
    grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.off(EVENT_BEFORE_SEND, this._onMigrate);
    grid.off(EVENT_HIDE_START, this._onHide);

    // Bind listeners to the next grid.
    const nextGrid = data.toGrid;
    nextGrid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    nextGrid.on(EVENT_LAYOUT_START, this._onLayoutStart);
    nextGrid.on(EVENT_BEFORE_SEND, this._onMigrate);
    nextGrid.on(EVENT_HIDE_START, this._onHide);

    // Mark the item as migrated.
    this._didMigrate = true;
  }

  /**
   * Reset placeholder if the associated item is hidden.
   *
   * @protected
   * @param {Item[]} items
   */
  protected _onHide(items: Item[]) {
    if (this.item && items.indexOf(this.item) > -1) this.reset();
  }
}
