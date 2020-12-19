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
import getTranslateString from '../utils/getTranslateString';
import getTranslate from '../utils/getTranslate';
import setStyles from '../utils/setStyles';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

import { StyleDeclaration } from '../types';

const CURRENT_STYLES: StyleDeclaration = {};
const TARGET_STYLES: StyleDeclaration = {};

/**
 * Drag placeholder.
 *
 * @class
 * @param {Item} item
 */
class ItemDragPlaceholder {
  public _item: Item;
  public _animation: Animator;
  public _element: HTMLElement | null;
  public _className: string;
  public _didMigrate: boolean;
  public _resetAfterLayout: boolean;
  public _left: number;
  public _top: number;
  public _transX: number;
  public _transY: number;
  public _nextTransX: number;
  public _nextTransY: number;

  constructor(item: Item) {
    this._item = item;
    this._animation = new Animator();
    this._element = null;
    this._className = '';
    this._didMigrate = false;
    this._resetAfterLayout = false;
    this._left = 0;
    this._top = 0;
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
   * Update placeholder's dimensions to match the item's dimensions.
   *
   * @private
   */
  public _updateDimensions() {
    if (!this._element) return;

    setStyles(this._element, {
      width: this._item._width + 'px',
      height: this._item._height + 'px',
    });
  }

  /**
   * Move placeholder to a new position.
   *
   * @private
   * @param {Item[]} items
   * @param {boolean} isInstant
   */
  public _onLayoutStart(items: Item[], isInstant: boolean) {
    if (!this._element) return;

    const item = this._item;

    // If the item is not part of the layout anymore reset placeholder.
    if (items.indexOf(item) === -1) {
      this.reset();
      return;
    }

    const nextLeft = item._left;
    const nextTop = item._top;
    const currentLeft = this._left;
    const currentTop = this._top;

    // Keep track of item layout position.
    this._left = nextLeft;
    this._top = nextTop;

    // If item's position did not change, and the item did not migrate and the
    // layout is not instant and we can safely skip layout.
    if (!isInstant && !this._didMigrate && currentLeft === nextLeft && currentTop === nextTop) {
      return;
    }

    // Slots data is calculated with item margins added to them so we need to
    // add item's left and top margin to the slot data to get the placeholder's
    // next position.
    const nextX = nextLeft + item._marginLeft;
    const nextY = nextTop + item._marginTop;

    // Just snap to new position without any animations if no animation is
    // required or if placeholder moves between grids.
    const grid = item.getGrid() as Grid;
    const animEnabled = !isInstant && grid._settings.layoutDuration > 0;
    if (!animEnabled || this._didMigrate) {
      // Cancel potential (queued) layout tick.
      cancelPlaceholderLayoutTick(item._id);

      // Snap placeholder to correct position.
      this._element.style[transformProp as 'transform'] = getTranslateString(nextX, nextY);
      this._animation.stop();

      // Move placeholder inside correct container after migration.
      if (this._didMigrate) {
        grid.getElement().appendChild(this._element);
        this._didMigrate = false;
      }

      return;
    }

    // Let's make sure an ongoing animation's callback is cancelled before going
    // further. Without this there's a chance that the animation will finish
    // before the next tick and mess up our logic.
    if (this._animation.animation) {
      this._animation.animation.onfinish = null;
    }

    // Start the placeholder's layout animation in the next tick. We do this to
    // avoid layout thrashing.
    this._nextTransX = nextX;
    this._nextTransY = nextY;
    addPlaceholderLayoutTick(item._id, this._setupAnimation, this._startAnimation);
  }

  /**
   * Prepare placeholder for layout animation.
   *
   * @private
   */
  public _setupAnimation() {
    if (!this._element) return;

    const { x, y } = getTranslate(this._element);
    this._transX = x;
    this._transY = y;
  }

  /**
   * Start layout animation.
   *
   * @private
   */
  public _startAnimation() {
    if (!this._element) return;

    const animation = this._animation;
    const currentX = this._transX;
    const currentY = this._transY;
    const nextX = this._nextTransX;
    const nextY = this._nextTransY;

    // If placeholder is already in correct position let's just stop animation
    // and be done with it.
    if (currentX === nextX && currentY === nextY) {
      if (animation.isAnimating()) {
        this._element.style[transformProp as 'transform'] = getTranslateString(nextX, nextY);
        animation.stop();
      }
      return;
    }

    // Otherwise let's start the animation.
    const { layoutDuration, layoutEasing } = (this._item.getGrid() as Grid)._settings;
    CURRENT_STYLES[transformProp] = getTranslateString(currentX, currentY);
    TARGET_STYLES[transformProp] = getTranslateString(nextX, nextY);
    animation.start(CURRENT_STYLES, TARGET_STYLES, {
      duration: layoutDuration,
      easing: layoutEasing,
      onFinish: this._onLayoutEnd,
    });
  }

  /**
   * Layout end handler.
   *
   * @private
   */
  public _onLayoutEnd() {
    if (this._resetAfterLayout) {
      this.reset();
    }
  }

  /**
   * Drag end handler. This handler is called when dragReleaseEnd event is
   * emitted and receives the event data as it's argument.
   *
   * @private
   * @param {Item} item
   */
  public _onReleaseEnd(item: Item) {
    if (item._id === this._item._id) {
      // If the placeholder is not animating anymore we can safely reset it.
      if (!this._animation.isAnimating()) {
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
   * @private
   * @param {Object} data
   * @param {Item} data.item
   * @param {Grid} data.fromGrid
   * @param {number} data.fromIndex
   * @param {Grid} data.toGrid
   * @param {number} data.toIndex
   */
  public _onMigrate(data: {
    item: Item;
    fromGrid: Grid;
    fromIndex: number;
    toGrid: Grid;
    toIndex: number;
  }) {
    // Make sure we have a matching item.
    if (data.item !== this._item) return;

    // Unbind listeners from current grid.
    const grid = this._item.getGrid() as Grid;
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
   * @private
   * @param {Item[]} items
   */
  public _onHide(items: Item[]) {
    if (items.indexOf(this._item) > -1) this.reset();
  }

  /**
   * Create placeholder. Note that this method only writes to DOM and does not
   * read anything from DOM so it should not cause any additional layout
   * thrashing when it's called at the end of the drag start procedure.
   *
   * @public
   */
  public create() {
    // If we already have placeholder set up we can skip the initiation logic.
    if (this._element) {
      this._resetAfterLayout = false;
      return;
    }

    const item = this._item;
    const grid = item.getGrid() as Grid;
    const settings = grid._settings;

    // Keep track of layout position.
    this._left = item._left;
    this._top = item._top;

    // Create placeholder element.
    if (typeof settings.dragPlaceholder.createElement === 'function') {
      this._element = settings.dragPlaceholder.createElement(item);
    } else {
      this._element = document.createElement('div');
    }
    const element = this._element;

    // Update element to animation instance.
    this._animation.element = element;

    // Add placeholder class to the placeholder element.
    this._className = settings.itemPlaceholderClass || '';
    if (this._className) {
      addClass(element, this._className);
    }

    // Set initial styles.
    setStyles(element, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: item._width + 'px',
      height: item._height + 'px',
    });

    // Set initial position.
    element.style[transformProp as 'transform'] = getTranslateString(
      item._left + item._marginLeft,
      item._top + item._marginTop
    );

    // Bind event listeners.
    grid.on(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.on(EVENT_BEFORE_SEND, this._onMigrate);
    grid.on(EVENT_HIDE_START, this._onHide);

    // onCreate hook.
    if (typeof settings.dragPlaceholder.onCreate === 'function') {
      settings.dragPlaceholder.onCreate(item, element);
    }

    // Insert the placeholder element to the grid.
    grid.getElement().appendChild(element);
  }

  /**
   * Reset placeholder data.
   *
   * @public
   */
  public reset() {
    if (!this._element) return;

    const element = this._element;
    const item = this._item;
    const grid = item.getGrid() as Grid;

    // Reset flag.
    this._resetAfterLayout = false;

    // Cancel potential (queued) layout tick.
    cancelPlaceholderLayoutTick(item._id);
    cancelPlaceholderResizeTick(item._id);

    // Reset animation instance.
    const animation = this._animation;
    animation.stop();
    animation.element = null;

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
    this._element = null;

    // onRemove hook. Note that here we use the current grid's onRemove callback
    // so if the item has migrated during drag the onRemove method will not be
    // the originating grid's method.
    const { onRemove } = grid._settings.dragPlaceholder;
    if (typeof onRemove === 'function') {
      onRemove(item, element);
    }
  }

  /**
   * Check if placeholder is currently active (visible).
   *
   * @public
   * @returns {Boolean}
   */
  public isActive() {
    return !!this._element;
  }

  /**
   * Get placeholder element.
   *
   * @public
   * @returns {?HTMLElement}
   */
  public getElement() {
    return this._element;
  }

  /**
   * Update placeholder's dimensions to match the item's dimensions. Note that
   * the updating is done asynchronously in the next tick to avoid layout
   * thrashing.
   *
   * @public
   */
  public updateDimensions() {
    if (!this.isActive()) return;
    addPlaceholderResizeTick(this._item._id, this._updateDimensions);
  }

  /**
   * Update placeholder's class name.
   *
   * @public
   * @param {string} className
   */
  public updateClassName(className: string) {
    if (!this._element) return;
    removeClass(this._element, this._className);
    this._className = className;
    addClass(this._element, className);
  }

  /**
   * Destroy placeholder instance.
   *
   * @public
   */
  public destroy() {
    this.reset();
    this._animation && this._animation.destroy();
  }
}

export default ItemDragPlaceholder;
