/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { GRID_INSTANCES, ITEM_ELEMENT_MAP } from '../constants';

import Grid from '../Grid/Grid';
import ItemDrag from './ItemDrag';
import ItemDragPlaceholder from './ItemDragPlaceholder';
import ItemDragRelease from './ItemDragRelease';
import ItemLayout from './ItemLayout';
import ItemMigrate from './ItemMigrate';
import ItemVisibility from './ItemVisibility';
import Emitter from '../Emitter/Emitter';

import addClass from '../utils/addClass';
import createUid from '../utils/createUid';
import getStyle from '../utils/getStyle';
import getStyleAsFloat from '../utils/getStyleAsFloat';
import getTranslate from '../utils/getTranslate';
import getTranslateString from '../utils/getTranslateString';
import isInViewport from '../utils/isInViewport';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

const _getTranslateResult = { x: 0, y: 0 };
const _getClientRootPositionResult = { left: 0, top: 0 };

/**
 * Creates a new Item instance for a Grid instance.
 *
 * @class
 * @param {Grid} grid
 * @param {HTMLElement} element
 * @param {boolean} [isActive]
 */
class Item {
  public _id: number;
  public _gridId: number;
  public _element: HTMLElement;
  public _isActive: boolean;
  public _isDestroyed: boolean;
  public _left: number;
  public _top: number;
  public _width: number;
  public _height: number;
  public _marginLeft: number;
  public _marginRight: number;
  public _marginTop: number;
  public _marginBottom: number;
  public _translateX?: number;
  public _translateY?: number;
  public _containerDiffX: number;
  public _containerDiffY: number;
  public _sortData: { [key: string]: any } | null;
  public _emitter: Emitter;
  public _visibility: ItemVisibility;
  public _layout: ItemLayout;
  public _migrate: ItemMigrate;
  public _drag: ItemDrag | null;
  public _dragRelease: ItemDragRelease;
  public _dragPlaceholder: ItemDragPlaceholder;

  constructor(grid: Grid, element: HTMLElement, isActive?: boolean) {
    const settings = grid._settings;

    // Store item/element pair to a map (for faster item querying by element).
    if (ITEM_ELEMENT_MAP) {
      if (ITEM_ELEMENT_MAP.has(element)) {
        throw new Error('You can only create one Muuri Item per element!');
      } else {
        ITEM_ELEMENT_MAP.set(element, this);
      }
    }

    this._id = createUid();
    this._gridId = grid._id;
    this._element = element;
    this._isDestroyed = false;
    this._left = 0;
    this._top = 0;
    this._width = 0;
    this._height = 0;
    this._marginLeft = 0;
    this._marginRight = 0;
    this._marginTop = 0;
    this._marginBottom = 0;
    this._translateX = undefined;
    this._translateY = undefined;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
    this._sortData = null;
    this._emitter = new Emitter();

    // If the provided item element is not a direct child of the grid container
    // element, append it to the grid container. Note, we are indeed reading the
    // DOM here but it's a property that does not cause reflowing.
    if (grid._element && element.parentNode !== grid._element) {
      grid._element.appendChild(element);
    }

    // Set item class.
    addClass(element, settings.itemClass);

    // If isActive is not defined, let's try to auto-detect it. Note, we are
    // indeed reading the DOM here but it's a property that does not cause
    // reflowing.
    if (typeof isActive !== 'boolean') {
      isActive = getStyle(element, 'display') !== 'none';
    }

    // Set up active state (defines if the item is considered part of the layout
    // or not).
    this._isActive = isActive;

    // Setup visibility handler.
    this._visibility = new ItemVisibility(this);

    // Set up layout handler.
    this._layout = new ItemLayout(this);

    // Set up migration handler data.
    this._migrate = new ItemMigrate(this);

    // Set up drag handler.
    this._drag = settings.dragEnabled ? new ItemDrag(this) : null;

    // Set up release handler. Note that although this is fully linked to dragging
    // this still needs to be always instantiated to handle migration scenarios
    // correctly.
    this._dragRelease = new ItemDragRelease(this);

    // Set up drag placeholder handler. Note that although this is fully linked to
    // dragging this still needs to be always instantiated to handle migration
    // scenarios correctly.
    this._dragPlaceholder = new ItemDragPlaceholder(this);

    // Note! You must call the following methods before you start using the
    // instance. They are deliberately not called in the end as it would cause
    // potentially a massive amount of reflows if multiple items were instantiated
    // in a loop.
    // this._refreshDimensions();
    // this._refreshSortData();
  }

  /**
   * Get the instance grid reference.
   *
   * @public
   * @returns {Grid}
   */
  public getGrid() {
    return GRID_INSTANCES[this._gridId];
  }

  /**
   * Get the instance element.
   *
   * @public
   * @returns {HTMLElement}
   */
  public getElement() {
    return this._element;
  }

  /**
   * Get instance element's cached width.
   *
   * @public
   * @returns {number}
   */
  public getWidth() {
    return this._width;
  }

  /**
   * Get instance element's cached height.
   *
   * @public
   * @returns {number}
   */
  public getHeight() {
    return this._height;
  }

  /**
   * Get instance element's cached margins.
   *
   * @public
   * @returns {Object}
   */
  public getMargin() {
    return {
      left: this._marginLeft,
      right: this._marginRight,
      top: this._marginTop,
      bottom: this._marginBottom,
    };
  }

  /**
   * Get instance element's cached position.
   *
   * @public
   * @returns {Object}
   */
  public getPosition() {
    return {
      left: this._left,
      top: this._top,
    };
  }

  /**
   * Is the item active?
   *
   * @public
   * @returns {boolean}
   */
  public isActive() {
    return this._isActive;
  }

  /**
   * Is the item visible?
   *
   * @public
   * @returns {boolean}
   */
  public isVisible() {
    return !!this._visibility && !this._visibility._isHidden;
  }

  /**
   * Is the item being animated to visible?
   *
   * @public
   * @returns {boolean}
   */
  public isShowing() {
    return !!(this._visibility && this._visibility._isShowing);
  }

  /**
   * Is the item being animated to hidden?
   *
   * @public
   * @returns {boolean}
   */
  public isHiding() {
    return !!(this._visibility && this._visibility._isHiding);
  }

  /**
   * Is the item positioning?
   *
   * @public
   * @returns {boolean}
   */
  public isPositioning() {
    return !!(this._layout && this._layout._isActive);
  }

  /**
   * Is the item being dragged (or queued for dragging)?
   *
   * @public
   * @returns {boolean}
   */
  public isDragging() {
    return !!(this._drag && this._drag._isActive);
  }

  /**
   * Is the item being released?
   *
   * @public
   * @returns {boolean}
   */
  public isReleasing() {
    return !!(this._dragRelease && this._dragRelease._isActive);
  }

  /**
   * Is the item destroyed?
   *
   * @public
   * @returns {boolean}
   */
  public isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * Recalculate item's dimensions.
   *
   * @private
   * @param {boolean} [force=false]
   */
  public _refreshDimensions(force?: boolean) {
    if (this._isDestroyed) return;
    if (force !== true && !this.isVisible() && !this.isHiding()) return;

    const element = this._element;

    // Calculate width and height.
    const rect = element.getBoundingClientRect();
    this._width = rect.width;
    this._height = rect.height;

    // Calculate margins (ignore negative margins).
    this._marginLeft = Math.max(0, getStyleAsFloat(element, 'margin-left'));
    this._marginRight = Math.max(0, getStyleAsFloat(element, 'margin-right'));
    this._marginTop = Math.max(0, getStyleAsFloat(element, 'margin-top'));
    this._marginBottom = Math.max(0, getStyleAsFloat(element, 'margin-bottom'));

    // Keep drag placeholder's dimensions synced with the item's.
    const dragPlaceholder = this._dragPlaceholder;
    if (dragPlaceholder) dragPlaceholder.updateDimensions();
  }

  /**
   * Fetch and store item's sort data.
   *
   * @private
   */
  public _refreshSortData() {
    if (this._isDestroyed) return;

    this._sortData = {};
    const getters = this.getGrid()._settings.sortData;
    if (getters) {
      let prop: string;
      for (prop in getters) {
        this._sortData[prop] = getters[prop](this, this._element);
      }
    }
  }

  /**
   * Add item to layout.
   *
   * @private
   * @param {number} [left=0]
   * @param {number} [top=0]
   */
  public _addToLayout(left = 0, top = 0) {
    if (this._isActive) return;
    this._isActive = true;
    this._left = left;
    this._top = top;
  }

  /**
   * Remove item from layout.
   *
   * @private
   */
  public _removeFromLayout() {
    if (!this._isActive) return;
    this._isActive = false;
    this._left = 0;
    this._top = 0;
  }

  /**
   * Check if the layout procedure can be skipped for the item.
   *
   * @private
   * @param {number} left
   * @param {number} top
   * @returns {boolean}
   */
  public _canSkipLayout(left: number, top: number) {
    return (
      this._left === left &&
      this._top === top &&
      !this._migrate._isActive &&
      !this._dragRelease._isActive &&
      !this._layout._skipNextAnimation
    );
  }

  /**
   * Set the provided left and top arguments as the item element's translate
   * values in the DOM. This method keeps track of the currently applied
   * translate values and skips the update operation if the provided values are
   * identical to the currently applied values.
   *
   * @private
   * @param {number} x
   * @param {number} y
   */
  public _setTranslate(x: number, y: number) {
    if (this._translateX === x && this._translateY === y) return;
    this._translateX = x;
    this._translateY = y;
    this._element.style[transformProp as 'transform'] = getTranslateString(x, y);
  }

  /**
   * Get the item's current translate values. If they can't be detected from cache
   * we will read them from the DOM (so try to use this only when it is safe
   * to query the DOM without causing a forced reflow).
   *
   * @private
   * @returns {Object}
   */
  public _getTranslate() {
    if (this._translateX === undefined || this._translateY === undefined) {
      const translate = getTranslate(this._element);
      _getTranslateResult.x = translate.x;
      _getTranslateResult.y = translate.y;
    } else {
      _getTranslateResult.x = this._translateX;
      _getTranslateResult.y = this._translateY;
    }
    return _getTranslateResult;
  }

  /**
   * Returns the current container's position relative to the client (viewport)
   * with borders excluded from the container. This equals to the client position
   * where the item will be if it is not transformed and it's left/top position at
   * zero. Note that this method uses the cached dimensions of grid, so it is up
   * to the user to update those when necessary before using this method.
   *
   * @private
   * @returns {Object}
   */
  public _getClientRootPosition() {
    const grid = this.getGrid();
    _getClientRootPositionResult.left = grid._left + grid._borderLeft - this._containerDiffX;
    _getClientRootPositionResult.top = grid._top + grid._borderTop - this._containerDiffY;
    return _getClientRootPositionResult;
  }

  /**
   * Check if item will be in viewport with the provided coordinates. The third
   * argument allows defining extra padding for the viewport.
   *
   * @private
   * @param {number} x
   * @param {number} y
   * @param {number} [viewportThreshold=0]
   * @returns {boolean}
   */
  public _isInViewport(x: number, y: number, viewportThreshold = 0) {
    const rootPosition = this._getClientRootPosition();
    return isInViewport(
      this._width,
      this._height,
      rootPosition.left + this._marginLeft + x,
      rootPosition.top + this._marginTop + y,
      viewportThreshold || 0
    );
  }

  /**
   * Destroy item instance.
   *
   * @private
   * @param {boolean} [removeElement=false]
   */
  public _destroy(removeElement = false) {
    if (this._isDestroyed) return;

    const element = this._element;
    const grid = this.getGrid();
    const settings = grid._settings;

    // Destroy handlers.
    this._dragPlaceholder.destroy();
    this._dragRelease.destroy();
    this._migrate.destroy();
    this._layout.destroy();
    this._visibility.destroy();
    if (this._drag) this._drag.destroy();

    // Destroy emitter.
    this._emitter.destroy();

    // Remove item class.
    removeClass(element, settings.itemClass);

    // Remove element from DOM.
    if (removeElement) element.parentNode?.removeChild(element);

    // Remove item/element pair from map.
    if (ITEM_ELEMENT_MAP) ITEM_ELEMENT_MAP.delete(element);

    // Reset state.
    this._isActive = false;
    this._isDestroyed = true;
  }
}

export default Item;
