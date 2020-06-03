/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { EVENT_DRAG_RELEASE_START, EVENT_DRAG_RELEASE_END } from '../constants';

import addClass from '../utils/addClass';
import getTranslate from '../utils/getTranslate';
import removeClass from '../utils/removeClass';

/**
 * The release process handler constructor. Although this might seem as proper
 * fit for the drag process this needs to be separated into it's own logic
 * because there might be a scenario where drag is disabled, but the release
 * process still needs to be implemented (dragging from a grid to another).
 *
 * @class
 * @param {Item} item
 */
function ItemDragRelease(item) {
  this._item = item;
  this._isActive = false;
  this._isDestroyed = false;
  this._isPositioningStarted = false;
  this._containerDiffX = 0;
  this._containerDiffY = 0;
}

/**
 * Public prototype methods
 * ************************
 */

/**
 * Start the release process of an item.
 *
 * @public
 */
ItemDragRelease.prototype.start = function () {
  if (this._isDestroyed || this._isActive) return;

  var item = this._item;
  var grid = item.getGrid();
  var settings = grid._settings;

  this._isActive = true;
  addClass(item._element, settings.itemReleasingClass);
  if (!settings.dragRelease.useDragContainer) {
    this._placeToGrid();
  }
  grid._emit(EVENT_DRAG_RELEASE_START, item);

  // Let's start layout manually _only_ if there is no unfinished layout in
  // about to finish.
  if (!grid._nextLayoutData) item._layout.start(false);
};

/**
 * End the release process of an item. This method can be used to abort an
 * ongoing release process (animation) or finish the release process.
 *
 * @public
 * @param {Boolean} [abort=false]
 *  - Should the release be aborted? When true, the release end event won't be
 *    emitted. Set to true only when you need to abort the release process
 *    while the item is animating to it's position.
 * @param {Number} [left]
 *  - The element's current translateX value (optional).
 * @param {Number} [top]
 *  - The element's current translateY value (optional).
 */
ItemDragRelease.prototype.stop = function (abort, left, top) {
  if (this._isDestroyed || !this._isActive) return;

  var item = this._item;
  var grid = item.getGrid();

  if (!abort && (left === undefined || top === undefined)) {
    left = item._left;
    top = item._top;
  }

  var didReparent = this._placeToGrid(left, top);
  this._reset(didReparent);

  if (!abort) grid._emit(EVENT_DRAG_RELEASE_END, item);
};

ItemDragRelease.prototype.isJustReleased = function () {
  return this._isActive && this._isPositioningStarted === false;
};

/**
 * Destroy instance.
 *
 * @public
 */
ItemDragRelease.prototype.destroy = function () {
  if (this._isDestroyed) return;
  this.stop(true);
  this._item = null;
  this._isDestroyed = true;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Move the element back to the grid container element if it does not exist
 * there already.
 *
 * @private
 * @param {Number} [left]
 *  - The element's current translateX value (optional).
 * @param {Number} [top]
 *  - The element's current translateY value (optional).
 * @returns {Boolean}
 *   - Returns `true` if the element was reparented.
 */
ItemDragRelease.prototype._placeToGrid = function (left, top) {
  if (this._isDestroyed) return;

  var item = this._item;
  var element = item._element;
  var container = item.getGrid()._element;
  var didReparent = false;

  if (element.parentNode !== container) {
    if (left === undefined || top === undefined) {
      var translate = getTranslate(element);
      left = translate.x - this._containerDiffX;
      top = translate.y - this._containerDiffY;
    }

    container.appendChild(element);
    item._setTranslate(left, top);
    didReparent = true;
  }

  this._containerDiffX = 0;
  this._containerDiffY = 0;

  return didReparent;
};

/**
 * Reset data and remove releasing class.
 *
 * @private
 * @param {Boolean} [needsReflow]
 */
ItemDragRelease.prototype._reset = function (needsReflow) {
  if (this._isDestroyed) return;

  var item = this._item;
  var releasingClass = item.getGrid()._settings.itemReleasingClass;

  this._isActive = false;
  this._isPositioningStarted = false;
  this._containerDiffX = 0;
  this._containerDiffY = 0;

  // If the element was just reparented we need to do a forced reflow to remove
  // the class gracefully.
  if (releasingClass) {
    // eslint-disable-next-line
    if (needsReflow) item._element.clientWidth;
    removeClass(item._element, releasingClass);
  }
};

export default ItemDragRelease;
