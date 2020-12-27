/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { GRID_INSTANCES, ITEM_ELEMENT_MAP } from '../constants';

import Grid, { GridInternal } from '../Grid/Grid';
import ItemDrag from './ItemDrag';
import ItemDragPlaceholder from './ItemDragPlaceholder';
import ItemDragRelease from './ItemDragRelease';
import ItemLayout, { ItemLayoutInternal } from './ItemLayout';
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

import { Writeable } from '../types';

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
export default class Item {
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
  protected _sortData: { [key: string]: any } | null;
  protected _emitter: Emitter;
  protected _visibility: ItemVisibility;
  protected _layout: ItemLayout;
  protected _migrate: ItemMigrate;
  protected _drag: ItemDrag | null;
  protected _dragRelease: ItemDragRelease;
  protected _dragPlaceholder: ItemDragPlaceholder;

  constructor(grid: Grid, element: HTMLElement, isActive?: boolean) {
    const { settings, element: gridElement, id: gridId } = grid;

    // Store item/element pair to a map (for faster item querying by element).
    if (ITEM_ELEMENT_MAP) {
      if (ITEM_ELEMENT_MAP.has(element)) {
        throw new Error('You can only create one Muuri Item per element!');
      } else {
        ITEM_ELEMENT_MAP.set(element, this);
      }
    }

    this.id = createUid();
    this.element = element;
    this.left = 0;
    this.top = 0;
    this.width = 0;
    this.height = 0;
    this.marginLeft = 0;
    this.marginRight = 0;
    this.marginTop = 0;
    this.marginBottom = 0;

    this._gridId = gridId;
    this._isDestroyed = false;
    this._translateX = undefined;
    this._translateY = undefined;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
    this._sortData = null;
    this._emitter = new Emitter();

    // If the provided item element is not a direct child of the grid container
    // element, append it to the grid container. Note, we are indeed reading the
    // DOM here but it's a property that does not cause reflowing.
    if (gridElement && element.parentNode !== gridElement) {
      gridElement.appendChild(element);
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

    // Set up release handler. Note that although this is fully linked to
    // dragging this still needs to be always instantiated to handle migration
    // scenarios correctly.
    this._dragRelease = new ItemDragRelease(this);

    // Set up drag placeholder handler. Note that although this is fully linked
    // to dragging this still needs to be always instantiated to handle
    // migration scenarios correctly.
    this._dragPlaceholder = new ItemDragPlaceholder(this);

    // Note! You must call the following methods before you start using the
    // instance. They are deliberately not called in the end as it would cause
    // potentially a massive amount of reflows if multiple items were
    // instantiated in a loop.
    // this._updateDimensions();
    // this._updateSortData();
  }

  /**
   * Get the instance grid reference.
   *
   * @public
   * @returns {?Grid}
   */
  getGrid() {
    return GRID_INSTANCES.get(this._gridId) || null;
  }

  /**
   * Is the item active?
   *
   * @public
   * @returns {boolean}
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Is the item visible?
   *
   * @public
   * @returns {boolean}
   */
  isVisible() {
    return !this._visibility.isHidden();
  }

  /**
   * Is the item being animated to visible?
   *
   * @public
   * @returns {boolean}
   */
  isShowing() {
    return !!this._visibility.isShowing();
  }

  /**
   * Is the item being animated to hidden?
   *
   * @public
   * @returns {boolean}
   */
  isHiding() {
    return !!this._visibility.isHiding();
  }

  /**
   * Is the item positioning?
   *
   * @public
   * @returns {boolean}
   */
  isPositioning() {
    return !!this._layout.isActive();
  }

  /**
   * Is the item being dragged (or queued for dragging)?
   *
   * @public
   * @returns {boolean}
   */
  isDragging() {
    return !!this._drag?.isActive();
  }

  /**
   * Is the item being released?
   *
   * @public
   * @returns {boolean}
   */
  isReleasing() {
    return !!this._dragRelease.isActive();
  }

  /**
   * Is the item destroyed?
   *
   * @public
   * @returns {boolean}
   */
  isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * Recalculate item's dimensions.
   *
   * @protected
   * @param {boolean} [force=false]
   */
  protected _updateDimensions(force?: boolean) {
    if (this._isDestroyed) return;
    if (force !== true && !this.isVisible() && !this.isHiding()) return;

    const element = this.element;

    // Calculate width and height.
    const { width, height } = element.getBoundingClientRect();
    (this as Writeable<Item>).width = width;
    (this as Writeable<Item>).height = height;

    // Calculate margins (ignore negative margins).
    (this as Writeable<Item>).marginLeft = Math.max(0, getStyleAsFloat(element, 'margin-left'));
    (this as Writeable<Item>).marginRight = Math.max(0, getStyleAsFloat(element, 'margin-right'));
    (this as Writeable<Item>).marginTop = Math.max(0, getStyleAsFloat(element, 'margin-top'));
    (this as Writeable<Item>).marginBottom = Math.max(0, getStyleAsFloat(element, 'margin-bottom'));

    // Keep drag placeholder's dimensions synced with the item's.
    const dragPlaceholder = this._dragPlaceholder;
    if (dragPlaceholder) dragPlaceholder.updateDimensions();
  }

  /**
   * Fetch and store item's sort data.
   *
   * @protected
   */
  protected _updateSortData() {
    if (this._isDestroyed) return;

    const { settings } = this.getGrid() as Grid;
    const { sortData } = settings;

    this._sortData = {};
    if (sortData) {
      let prop: string;
      for (prop in sortData) {
        this._sortData[prop] = sortData[prop](this, this.element);
      }
    }
  }

  /**
   * Add item to layout.
   *
   * @protected
   * @param {number} [left=0]
   * @param {number} [top=0]
   */
  protected _addToLayout(left = 0, top = 0) {
    if (this._isActive) return;
    this._isActive = true;
    (this as Writeable<Item>).left = left;
    (this as Writeable<Item>).top = top;
  }

  /**
   * Remove item from layout.
   *
   * @protected
   */
  protected _removeFromLayout() {
    if (!this._isActive) return;
    this._isActive = false;
    (this as Writeable<Item>).left = 0;
    (this as Writeable<Item>).top = 0;
  }

  /**
   * Check if the layout procedure can be skipped for the item.
   *
   * @protected
   * @param {number} left
   * @param {number} top
   * @returns {boolean}
   */
  protected _canSkipLayout(left: number, top: number) {
    return (
      this.left === left &&
      this.top === top &&
      !this._migrate.isActive() &&
      !this._dragRelease.isActive() &&
      !((this._layout as any) as ItemLayoutInternal)._skipNextAnimation
    );
  }

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
  protected _setTranslate(x: number, y: number) {
    if (this._translateX === x && this._translateY === y) return;
    this._translateX = x;
    this._translateY = y;
    this.element.style[transformProp as 'transform'] = getTranslateString(x, y);
  }

  /**
   * Get the item's current translate values. If they can't be detected from
   * cache we will read them from the DOM (so try to use this only when it is
   * safe to query the DOM without causing a forced reflow).
   *
   * @protected
   * @returns {Object}
   */
  protected _getTranslate() {
    if (this._translateX === undefined || this._translateY === undefined) {
      const translate = getTranslate(this.element);
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
   * with borders excluded from the container. This equals to the client
   * position where the item will be if it is not transformed and it's left/top
   * position at zero. Note that this method uses the cached dimensions of grid,
   * so it is up to the user to update those when necessary before using this
   * method.
   *
   * @protected
   * @returns {Object}
   */
  protected _getClientRootPosition() {
    const grid = (this.getGrid() as any) as GridInternal;
    _getClientRootPositionResult.left = grid._rect.left + grid._borderLeft - this._containerDiffX;
    _getClientRootPositionResult.top = grid._rect.top + grid._borderTop - this._containerDiffY;
    return _getClientRootPositionResult;
  }

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
  protected _isInViewport(x: number, y: number, viewportThreshold = 0) {
    const rootPosition = this._getClientRootPosition();
    return isInViewport(
      this.width,
      this.height,
      rootPosition.left + this.marginLeft + x,
      rootPosition.top + this.marginTop + y,
      viewportThreshold || 0
    );
  }

  /**
   * Destroy item instance.
   *
   * @protected
   * @param {boolean} [removeElement=false]
   */
  protected _destroy(removeElement = false) {
    if (this._isDestroyed) return;

    const element = this.element;
    const { settings } = this.getGrid() as Grid;

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

export interface ItemInternal extends Writeable<Item> {
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
