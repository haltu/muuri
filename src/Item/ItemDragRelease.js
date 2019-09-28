/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import { eventDragReleaseStart, eventDragReleaseEnd } from '../constants';

import addClass from '../utils/addClass';
import getTranslate from '../utils/getTranslate';
import getTranslateString from '../utils/getTranslateString';
import removeClass from '../utils/removeClass';
import transformProp from '../utils/transformProp';

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
 * @memberof ItemDragRelease.prototype
 * @returns {ItemDragRelease}
 */
ItemDragRelease.prototype.start = function() {
  if (this._isDestroyed || this._isActive) return this;

  var item = this._item;
  var grid = item.getGrid();

  // Flag release as active.
  this._isActive = true;

  // Add release class name to the released element.
  addClass(item._element, grid._settings.itemReleasingClass);

  // Emit dragReleaseStart event.
  grid._emit(eventDragReleaseStart, item);

  // Position the released item.
  item._layout.start(false);

  return this;
};

/**
 * End the release process of an item. This method can be used to abort an
 * ongoing release process (animation) or finish the release process.
 *
 * @public
 * @memberof ItemDragRelease.prototype
 * @param {Boolean} [abort=false]
 *  - Should the release be aborted? When true, the release end event won't be
 *    emitted. Set to true only when you need to abort the release process
 *    while the item is animating to it's position.
 * @param {Number} [left]
 *  - The element's current translateX value (optional).
 * @param {Number} [top]
 *  - The element's current translateY value (optional).
 * @returns {ItemDragRelease}
 */
ItemDragRelease.prototype.stop = function(abort, left, top) {
  if (this._isDestroyed || !this._isActive) return this;

  var item = this._item;
  var element = item._element;
  var grid = item.getGrid();
  var container = grid._element;
  var translate;

  // Reset data and remove releasing class name from the element.
  this._reset();

  // If the released element is outside the grid's container element put it
  // back there and adjust position accordingly.
  if (element.parentNode !== container) {
    if (left === undefined || top === undefined) {
      if (abort) {
        translate = getTranslate(element);
        left = translate.x - this._containerDiffX;
        top = translate.y - this._containerDiffY;
      } else {
        left = item._left;
        top = item._top;
      }
    }

    container.appendChild(element);
    element.style[transformProp] = getTranslateString(left, top);
  }

  // Emit dragReleaseEnd event.
  if (!abort) grid._emit(eventDragReleaseEnd, item);

  return this;
};

/**
 * Destroy instance.
 *
 * @public
 * @memberof ItemDragRelease.prototype
 * @returns {ItemDragRelease}
 */
ItemDragRelease.prototype.destroy = function() {
  if (this._isDestroyed) return this;
  this.stop(true);
  this._item = null;
  this._isDestroyed = true;
  return this;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Reset public data and remove releasing class.
 *
 * @private
 * @memberof ItemDragRelease.prototype
 */
ItemDragRelease.prototype._reset = function() {
  if (this._isDestroyed) return;
  var item = this._item;
  this._isActive = false;
  this._isPositioningStarted = false;
  this._containerDiffX = 0;
  this._containerDiffY = 0;
  removeClass(item._element, item.getGrid()._settings.itemReleasingClass);
};

export default ItemDragRelease;
