/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

// TODO: Make this easier on the memory. Create a temporary data object when
// drag starts that holds all the necessary data for the drag's duration. It's
// much better that way than reserving a lot of data beforehand for potentially
// thousands of items.

import {
  ACTION_MOVE,
  ACTION_SWAP,
  EVENT_MOVE,
  EVENT_SEND,
  EVENT_BEFORE_SEND,
  EVENT_RECEIVE,
  EVENT_BEFORE_RECEIVE,
  EVENT_DRAG_INIT,
  EVENT_DRAG_START,
  EVENT_DRAG_MOVE,
  EVENT_DRAG_SCROLL,
  EVENT_DRAG_END,
  GRID_INSTANCES,
} from '../constants';

import Dragger from '../Dragger/Dragger';
import AutoScroller from '../AutoScroller/AutoScroller';

import {
  addDragStartTick,
  cancelDragStartTick,
  addDragMoveTick,
  cancelDragMoveTick,
  addDragScrollTick,
  cancelDragScrollTick,
  addDragSortTick,
  cancelDragSortTick,
} from '../ticker';

import addClass from '../utils/addClass';
import arrayInsert from '../utils/arrayInsert';
import arrayMove from '../utils/arrayMove';
import arraySwap from '../utils/arraySwap';
import getContainingBlock from '../utils/getContainingBlock';
import getIntersectionScore from '../utils/getIntersectionScore';
import getOffsetDiff from '../utils/getOffsetDiff';
import getStyle from '../utils/getStyle';
import hasPassiveEvents from '../utils/hasPassiveEvents';
import isFunction from '../utils/isFunction';
import normalizeArrayIndex from '../utils/normalizeArrayIndex';
import removeClass from '../utils/removeClass';

var START_PREDICATE_INACTIVE = 0;
var START_PREDICATE_PENDING = 1;
var START_PREDICATE_RESOLVED = 2;
var SCROLL_LISTENER_OPTIONS = hasPassiveEvents() ? { capture: true, passive: true } : true;

/**
 * Bind touch interaction to an item.
 *
 * @class
 * @param {Item} item
 */
function ItemDrag(item) {
  var element = item._element;
  var grid = item.getGrid();
  var settings = grid._settings;

  this._item = item;
  this._rootGridId = grid._id;
  this._isDestroyed = false;
  this._isMigrated = false;

  // Start predicate data.
  this._startPredicate = isFunction(settings.dragStartPredicate)
    ? settings.dragStartPredicate
    : ItemDrag.defaultStartPredicate;
  this._startPredicateState = START_PREDICATE_INACTIVE;
  this._startPredicateResult = undefined;

  // Data for drag sort predicate heuristics.
  this._isSortNeeded = false;
  this._sortTimer = undefined;
  this._blockedSortIndex = null;
  this._sortX1 = 0;
  this._sortX2 = 0;
  this._sortY1 = 0;
  this._sortY2 = 0;

  // Setup item's initial drag data.
  this._reset();

  // Bind the methods that needs binding.
  this._preStartCheck = this._preStartCheck.bind(this);
  this._preEndCheck = this._preEndCheck.bind(this);
  this._onScroll = this._onScroll.bind(this);
  this._prepareStart = this._prepareStart.bind(this);
  this._applyStart = this._applyStart.bind(this);
  this._prepareMove = this._prepareMove.bind(this);
  this._applyMove = this._applyMove.bind(this);
  this._prepareScroll = this._prepareScroll.bind(this);
  this._applyScroll = this._applyScroll.bind(this);
  this._handleSort = this._handleSort.bind(this);
  this._handleSortDelayed = this._handleSortDelayed.bind(this);

  // Get drag handle element.
  this._handle = (settings.dragHandle && element.querySelector(settings.dragHandle)) || element;

  // Init dragger.
  this._dragger = new Dragger(this._handle, settings.dragCssProps);
  this._dragger.on('start', this._preStartCheck);
  this._dragger.on('move', this._preStartCheck);
  this._dragger.on('cancel', this._preEndCheck);
  this._dragger.on('end', this._preEndCheck);
}

/**
 * Public properties
 * *****************
 */

/**
 * @public
 * @static
 * @type {AutoScroller}
 */
ItemDrag.autoScroller = new AutoScroller();

/**
 * Public static methods
 * *********************
 */

/**
 * Default drag start predicate handler that handles anchor elements
 * gracefully. The return value of this function defines if the drag is
 * started, rejected or pending. When true is returned the dragging is started
 * and when false is returned the dragging is rejected. If nothing is returned
 * the predicate will be called again on the next drag movement.
 *
 * @public
 * @static
 * @param {Item} item
 * @param {Object} event
 * @param {Object} [options]
 *   - An optional options object which can be used to pass the predicate
 *     it's options manually. By default the predicate retrieves the options
 *     from the grid's settings.
 * @returns {(Boolean|undefined)}
 */
ItemDrag.defaultStartPredicate = function (item, event, options) {
  var drag = item._drag;

  // Make sure left button is pressed on mouse.
  if (event.isFirst && event.srcEvent.button) {
    return false;
  }

  // If the start event is trusted, non-cancelable and it's default action has
  // not been prevented it is in most cases a sign that the gesture would be
  // cancelled anyways right after it has started (e.g. starting drag while
  // the page is scrolling).
  if (
    event.isFirst &&
    event.srcEvent.isTrusted === true &&
    event.srcEvent.defaultPrevented === false &&
    event.srcEvent.cancelable === false
  ) {
    return false;
  }

  // Final event logic. At this stage return value does not matter anymore,
  // the predicate is either resolved or it's not and there's nothing to do
  // about it. Here we just reset data and if the item element is a link
  // we follow it (if there has only been slight movement).
  if (event.isFinal) {
    drag._finishStartPredicate(event);
    return;
  }

  // Setup predicate data from options if not already set.
  var predicate = drag._startPredicateData;
  if (!predicate) {
    var config = options || item.getGrid()._settings.dragStartPredicate || {};
    drag._startPredicateData = predicate = {
      distance: Math.max(config.distance, 0) || 0,
      delay: Math.max(config.delay, 0) || 0,
    };
  }

  // If delay is defined let's keep track of the latest event and initiate
  // delay if it has not been done yet.
  if (predicate.delay) {
    predicate.event = event;
    if (!predicate.delayTimer) {
      predicate.delayTimer = window.setTimeout(function () {
        predicate.delay = 0;
        if (drag._resolveStartPredicate(predicate.event)) {
          drag._forceResolveStartPredicate(predicate.event);
          drag._resetStartPredicate();
        }
      }, predicate.delay);
    }
  }

  return drag._resolveStartPredicate(event);
};

/**
 * Default drag sort predicate.
 *
 * @public
 * @static
 * @param {Item} item
 * @param {Object} [options]
 * @param {Number} [options.threshold=50]
 * @param {String} [options.action='move']
 * @returns {?Object}
 *   - Returns `null` if no valid index was found. Otherwise returns drag sort
 *     command.
 */
ItemDrag.defaultSortPredicate = (function () {
  var itemRect = {};
  var targetRect = {};
  var returnData = {};
  var gridsArray = [];
  var minThreshold = 1;
  var maxThreshold = 100;

  function getTargetGrid(item, threshold) {
    var target = null;
    var itemGrid = item.getGrid();
    var dragSort = itemGrid._settings.dragSort;
    var bestScore = -1;
    var gridScore;
    var grids;
    var grid;
    var container;
    var containerRect;
    var left;
    var top;
    var right;
    var bottom;
    var i;

    // Get potential target grids.
    if (dragSort === true) {
      gridsArray[0] = itemGrid;
      grids = gridsArray;
    } else if (isFunction(dragSort)) {
      grids = dragSort.call(itemGrid, item);
    }

    // Return immediately if there are no grids.
    if (!grids || !Array.isArray(grids) || !grids.length) {
      return target;
    }

    // Loop through the grids and get the best match.
    for (i = 0; i < grids.length; i++) {
      grid = grids[i];

      // Filter out all destroyed grids.
      if (grid._isDestroyed) continue;

      // Compute the grid's client rect an clamp the initial boundaries to
      // viewport dimensions.
      grid._updateBoundingRect();
      left = Math.max(0, grid._left);
      top = Math.max(0, grid._top);
      right = Math.min(window.innerWidth, grid._right);
      bottom = Math.min(window.innerHeight, grid._bottom);

      // The grid might be inside one or more elements that clip it's visibility
      // (e.g overflow scroll/hidden) so we want to find out the visible portion
      // of the grid in the viewport and use that in our calculations.
      container = grid._element.parentNode;
      while (
        container &&
        container !== document &&
        container !== document.documentElement &&
        container !== document.body
      ) {
        if (container.getRootNode && container instanceof DocumentFragment) {
          container = container.getRootNode().host;
          continue;
        }

        if (getStyle(container, 'overflow') !== 'visible') {
          containerRect = container.getBoundingClientRect();
          left = Math.max(left, containerRect.left);
          top = Math.max(top, containerRect.top);
          right = Math.min(right, containerRect.right);
          bottom = Math.min(bottom, containerRect.bottom);
        }

        if (getStyle(container, 'position') === 'fixed') {
          break;
        }

        container = container.parentNode;
      }

      // No need to go further if target rect does not have visible area.
      if (left >= right || top >= bottom) continue;

      // Check how much dragged element overlaps the container element.
      targetRect.left = left;
      targetRect.top = top;
      targetRect.width = right - left;
      targetRect.height = bottom - top;
      gridScore = getIntersectionScore(itemRect, targetRect);

      // Check if this grid is the best match so far.
      if (gridScore > threshold && gridScore > bestScore) {
        bestScore = gridScore;
        target = grid;
      }
    }

    // Always reset grids array.
    gridsArray.length = 0;

    return target;
  }

  return function (item, options) {
    var drag = item._drag;

    // Get drag sort predicate settings.
    var sortThreshold = options && typeof options.threshold === 'number' ? options.threshold : 50;
    var sortAction = options && options.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
    var migrateAction =
      options && options.migrateAction === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;

    // Sort threshold must be a positive number capped to a max value of 100. If
    // that's not the case this function will not work correctly. So let's clamp
    // the threshold just in case.
    sortThreshold = Math.min(Math.max(sortThreshold, minThreshold), maxThreshold);

    // Set up item rect data for comparing against grids.
    itemRect.width = item._width;
    itemRect.height = item._height;
    itemRect.left = drag._clientX;
    itemRect.top = drag._clientY;

    // Calculate the target grid.
    var grid = getTargetGrid(item, sortThreshold);

    // Return early if we found no grid container element that overlaps the
    // dragged item enough.
    if (!grid) return null;

    var isMigration = item.getGrid() !== grid;
    var matchScore = 0;
    var matchIndex = -1;
    var hasValidTargets = false;
    var target;
    var score;
    var i;

    // Adjust item rect position for comparing against grid items.
    itemRect.left = drag._translateX - drag._containerDiffX + item._marginLeft;
    itemRect.top = drag._translateY - drag._containerDiffY + item._marginTop;

    // Loop through the target grid items and try to find the best match.
    for (i = 0; i < grid._items.length; i++) {
      target = grid._items[i];

      // If the target item is not active or the target item is the dragged
      // item let's skip to the next item.
      if (!target._isActive || target === item) {
        continue;
      }

      // Mark the grid as having valid target items.
      hasValidTargets = true;

      // Calculate the target's overlap score with the dragged item.
      targetRect.width = target._width;
      targetRect.height = target._height;
      targetRect.left = target._left + target._marginLeft;
      targetRect.top = target._top + target._marginTop;
      score = getIntersectionScore(itemRect, targetRect);

      // Update best match index and score if the target's overlap score with
      // the dragged item is higher than the current best match score.
      if (score > matchScore) {
        matchIndex = i;
        matchScore = score;
      }
    }

    // If there is no valid match and the dragged item is being moved into
    // another grid we need to do some guess work here. If there simply are no
    // valid targets (which means that the dragged item will be the only active
    // item in the new grid) we can just add it as the first item. If we have
    // valid items in the new grid and the dragged item is overlapping one or
    // more of the items in the new grid let's make an exception with the
    // threshold and just pick the item which the dragged item is overlapping
    // most. However, if the dragged item is not overlapping any of the valid
    // items in the new grid let's position it as the last item in the grid.
    if (isMigration && matchScore < sortThreshold) {
      matchIndex = hasValidTargets ? matchIndex : 0;
      matchScore = sortThreshold;
    }

    // Check if the best match overlaps enough to justify a placement switch.
    if (matchScore >= sortThreshold) {
      returnData.grid = grid;
      returnData.index = matchIndex;
      returnData.action = isMigration ? migrateAction : sortAction;
      return returnData;
    }

    return null;
  };
})();

/**
 * Public prototype methods
 * ************************
 */

/**
 * Get Grid instance.
 *
 * @public
 * @returns {?Grid}
 */
ItemDrag.prototype.getRootGrid = function () {
  return GRID_INSTANCES[this._rootGridId] || null;
};

/**
 * Abort dragging and reset drag data.
 *
 * @public
 */
ItemDrag.prototype.stop = function () {
  if (!this._isActive) return;

  // If the item has been dropped into another grid, finish up the process and
  // and don't go any further here. The _finishMigration() method will destroy
  // this instance which in turn will
  if (this._isMigrated) {
    this._finishMigration();
    return;
  }

  // Cancel queued ticks.
  var itemId = this._item._id;
  cancelDragStartTick(itemId);
  cancelDragMoveTick(itemId);
  cancelDragScrollTick(itemId);

  // Cancel sort procedure.
  this._cancelSort();

  if (this._isStarted) {
    var itemElement = item._element;
    var grid = item.getGrid();
    var draggingClass = grid._settings.itemDraggingClass;

    // Remove scroll listeners.
    this._unbindScrollHandler();

    // Append item element to it's current grid's container element if it's not
    // there already. Also make sure the translate values are adjusted to
    // account for the DOM shift.
    if (itemElement.parentNode !== grid._element) {
      grid._element.appendChild(itemElement);
      item._setTranslate(
        this._translateX - this._containerDiffX,
        this._translateY - this._containerDiffY
      );
      item._containerDiffX = this._containerDiffX = 0;
      item._containerDiffY = this._containerDiffY = 0;

      // We need to do forced reflow to make sure the dragging class is removed
      // gracefully.
      // eslint-disable-next-line
      if (draggingClass) element.clientWidth;
    }

    // Remove dragging class.
    removeClass(element, draggingClass);
  }

  // Reset drag data.
  this._reset();
};

/**
 * Manually trigger drag sort. This is only needed for special edge cases where
 * e.g. you have disabled sort and want to trigger a sort right after enabling
 * it (and don't want to wait for the next move/scroll event).
 *
 * @private
 * @param {Boolean} [force=false]
 */
ItemDrag.prototype.sort = function (force) {
  var item = this._item;
  if (item._isActive && this._dragMoveEvent) {
    if (force === true) {
      this._handleSort();
    } else {
      addDragSortTick(item._id, this._handleSort);
    }
  }
};

/**
 * Destroy instance.
 *
 * @public
 */
ItemDrag.prototype.destroy = function () {
  if (this._isDestroyed) return;
  // It's important to always do the destroying as if migration did not happen
  // because otherwise the item's drag handler might be recreated when there's
  // no need.
  this._isMigrated = false;
  this.stop();
  this._dragger.destroy();
  ItemDrag.autoScroller.removeItem(this._item);
  this._isDestroyed = true;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Setup/reset drag data.
 *
 * @private
 */
ItemDrag.prototype._reset = function () {
  this._isActive = false;
  this._isStarted = false;

  // The dragged item's container element and containing block.
  this._container = null;
  this._containingBlock = null;

  // Drag/scroll event data.
  this._dragStartEvent = null;
  this._dragMoveEvent = null;
  this._dragPrevMoveEvent = null;
  this._scrollEvent = null;

  // The current translateX/translateY.
  this._translateX = 0;
  this._translateY = 0;

  // Dragged element's current offset from window's northwest corner. Does
  // not account for element's margins.
  this._clientX = 0;
  this._clientY = 0;

  // Keep track of the clientX/Y diff for scrolling.
  this._scrollDiffX = 0;
  this._scrollDiffY = 0;

  // Keep track of the clientX/Y diff for moving.
  this._moveDiffX = 0;
  this._moveDiffY = 0;

  // Keep track of the container diff between grid element and drag container.
  this._containerDiffX = 0;
  this._containerDiffY = 0;
};

/**
 * Bind drag scroll handlers.
 *
 * @private
 */
ItemDrag.prototype._bindScrollHandler = function () {
  window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
};

/**
 * Unbind currently bound drag scroll handlers.
 *
 * @private
 */
ItemDrag.prototype._unbindScrollHandler = function () {
  window.removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
};

/**
 * Unbind currently bound drag scroll handlers from all scrollable ancestor
 * elements of the dragged element and the drag container element.
 *
 * @private
 * @param {Object} event
 * @returns {Boolean}
 */
ItemDrag.prototype._resolveStartPredicate = function (event) {
  var predicate = this._startPredicateData;
  if (event.distance < predicate.distance || predicate.delay) return;
  this._resetStartPredicate();
  return true;
};

/**
 * Forcefully resolve drag start predicate.
 *
 * @private
 * @param {Object} event
 */
ItemDrag.prototype._forceResolveStartPredicate = function (event) {
  if (!this._isDestroyed && this._startPredicateState === START_PREDICATE_PENDING) {
    this._startPredicateState = START_PREDICATE_RESOLVED;
    this._onStart(event);
  }
};

/**
 * Finalize start predicate.
 *
 * @private
 * @param {Object} event
 */
ItemDrag.prototype._finishStartPredicate = function (event) {
  var element = this._item._element;

  // Check if this is a click (very subjective heuristics).
  var isClick = Math.abs(event.deltaX) < 2 && Math.abs(event.deltaY) < 2 && event.deltaTime < 200;

  // Reset predicate.
  this._resetStartPredicate();

  // If the gesture can be interpreted as click let's try to open the element's
  // href url (if it is an anchor element).
  if (isClick) openAnchorHref(element);
};

/**
 * Reset drag sort heuristics.
 *
 * @private
 * @param {Number} x
 * @param {Number} y
 */
ItemDrag.prototype._resetHeuristics = function (x, y) {
  this._blockedSortIndex = null;
  this._sortX1 = this._sortX2 = x;
  this._sortY1 = this._sortY2 = y;
};

/**
 * Run heuristics and return true if overlap check can be performed, and false
 * if it can not.
 *
 * @private
 * @param {Number} x
 * @param {Number} y
 * @returns {Boolean}
 */
ItemDrag.prototype._checkHeuristics = function (x, y) {
  var settings = this._item.getGrid()._settings.dragSortHeuristics;
  var minDist = settings.minDragDistance;

  // Skip heuristics if not needed.
  if (minDist <= 0) {
    this._blockedSortIndex = null;
    return true;
  }

  var diffX = x - this._sortX2;
  var diffY = y - this._sortY2;

  // If we can't do proper bounce back check make sure that the blocked index
  // is not set.
  var canCheckBounceBack = minDist > 3 && settings.minBounceBackAngle > 0;
  if (!canCheckBounceBack) {
    this._blockedSortIndex = null;
  }

  if (Math.abs(diffX) > minDist || Math.abs(diffY) > minDist) {
    // Reset blocked index if angle changed enough. This check requires a
    // minimum value of 3 for minDragDistance to function properly.
    if (canCheckBounceBack) {
      var angle = Math.atan2(diffX, diffY);
      var prevAngle = Math.atan2(this._sortX2 - this._sortX1, this._sortY2 - this._sortY1);
      var deltaAngle = Math.atan2(Math.sin(angle - prevAngle), Math.cos(angle - prevAngle));
      if (Math.abs(deltaAngle) > settings.minBounceBackAngle) {
        this._blockedSortIndex = null;
      }
    }

    // Update points.
    this._sortX1 = this._sortX2;
    this._sortY1 = this._sortY2;
    this._sortX2 = x;
    this._sortY2 = y;

    return true;
  }

  return false;
};

/**
 * Reset for default drag start predicate function.
 *
 * @private
 */
ItemDrag.prototype._resetStartPredicate = function () {
  var predicate = this._startPredicateData;
  if (predicate) {
    if (predicate.delayTimer) {
      predicate.delayTimer = window.clearTimeout(predicate.delayTimer);
    }
    this._startPredicateData = null;
  }
};

/**
 * Handle the sorting procedure. Manage drag sort heuristics/interval and
 * check overlap when necessary.
 *
 * @private
 */
ItemDrag.prototype._handleSort = function () {
  var item = this._item;
  var settings = item.getGrid()._settings;

  // No sorting when drag sort is disabled. Also, account for the scenario where
  // dragSort is temporarily disabled during drag procedure so we need to reset
  // sort timer heuristics state too.
  if (
    !settings.dragSort ||
    (!settings.dragAutoScroll.sortDuringScroll && ItemDrag.autoScroller.isItemScrolling(item))
  ) {
    this._sortX1 = this._sortX2 = this._translateX - this._containerDiffX;
    this._sortY1 = this._sortY2 = this._translateY - this._containerDiffY;
    // We set this to true intentionally so that overlap check would be
    // triggered as soon as possible after sort becomes enabled again.
    this._isSortNeeded = true;
    if (this._sortTimer !== undefined) {
      this._sortTimer = window.clearTimeout(this._sortTimer);
    }
    return;
  }

  // If sorting is enabled we always need to run the heuristics check to keep
  // the tracked coordinates updated. We also allow an exception when the sort
  // timer is finished because the heuristics are intended to prevent overlap
  // checks based on the dragged element's immediate movement and a delayed
  // overlap check is valid if it comes through, because it was valid when it
  // was invoked.
  var shouldSort = this._checkHeuristics(
    this._translateX - this._containerDiffX,
    this._translateY - this._containerDiffY
  );
  if (!this._isSortNeeded && !shouldSort) return;

  var sortInterval = settings.dragSortHeuristics.sortInterval;
  if (sortInterval <= 0 || this._isSortNeeded) {
    this._isSortNeeded = false;
    if (this._sortTimer !== undefined) {
      this._sortTimer = window.clearTimeout(this._sortTimer);
    }
    this._checkOverlap();
  } else if (this._sortTimer === undefined) {
    this._sortTimer = window.setTimeout(this._handleSortDelayed, sortInterval);
  }
};

/**
 * Delayed sort handler.
 *
 * @private
 */
ItemDrag.prototype._handleSortDelayed = function () {
  this._isSortNeeded = true;
  this._sortTimer = undefined;
  addDragSortTick(this._item._id, this._handleSort);
};

/**
 * Cancel and reset sort procedure.
 *
 * @private
 */
ItemDrag.prototype._cancelSort = function () {
  this._isSortNeeded = false;
  if (this._sortTimer !== undefined) {
    this._sortTimer = window.clearTimeout(this._sortTimer);
  }
  cancelDragSortTick(this._item._id);
};

/**
 * Handle the ending of the drag procedure for sorting.
 *
 * @private
 */
ItemDrag.prototype._finishSort = function () {
  var isSortEnabled = this._item.getGrid()._settings.dragSort;
  var needsFinalCheck = isSortEnabled && (this._isSortNeeded || this._sortTimer !== undefined);
  this._cancelSort();
  if (needsFinalCheck) this._checkOverlap();
};

/**
 * Check (during drag) if an item is overlapping other items and based on
 * the configuration layout the items.
 *
 * @private
 */
ItemDrag.prototype._checkOverlap = function () {
  if (!this._isActive) return;

  var item = this._item;
  var element = item.element;
  var settings = item.getGrid()._settings;
  var result;
  var currentGrid;
  var currentIndex;
  var targetGrid;
  var targetIndex;
  var targetItem;
  var targetSettings;
  var sortAction;
  var dragContainer;
  var offsetDiff;
  var isMigration;

  // Get overlap check result.
  if (isFunction(settings.dragSortPredicate)) {
    result = settings.dragSortPredicate(item, this._dragMoveEvent);
  } else {
    result = ItemDrag.defaultSortPredicate(item, settings.dragSortPredicate);
  }

  // Let's make sure the result object has a valid index before going further.
  if (!result || typeof result.index !== 'number') return;

  sortAction = result.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
  currentGrid = item.getGrid();
  targetGrid = result.grid || currentGrid;
  isMigration = currentGrid !== targetGrid;
  currentIndex = currentGrid._items.indexOf(item);
  targetIndex = normalizeArrayIndex(
    targetGrid._items,
    result.index,
    isMigration && sortAction === ACTION_MOVE ? 1 : 0
  );

  // Prevent position bounce.
  if (!isMigration && targetIndex === this._blockedSortIndex) {
    return;
  }

  // If the item was moved within it's current grid.
  if (!isMigration) {
    // Make sure the target index is not the current index.
    if (currentIndex !== targetIndex) {
      this._blockedSortIndex = currentIndex;

      // Do the sort.
      (sortAction === ACTION_SWAP ? arraySwap : arrayMove)(
        currentGrid._items,
        currentIndex,
        targetIndex
      );

      // Emit move event.
      if (currentGrid._hasListeners(EVENT_MOVE)) {
        currentGrid._emit(EVENT_MOVE, {
          item: item,
          fromIndex: currentIndex,
          toIndex: targetIndex,
          action: sortAction,
        });
      }

      // Layout the grid.
      currentGrid.layout();
    }
  }

  // If the item was moved to another grid.
  else {
    this._blockedSortIndex = null;

    // Let's fetch the target item when it's still in it's original index.
    targetItem = targetGrid._items[targetIndex];
    targetSettings = targetGrid._settings;

    // Emit beforeSend event.
    if (currentGrid._hasListeners(EVENT_BEFORE_SEND)) {
      currentGrid._emit(EVENT_BEFORE_SEND, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Emit beforeReceive event.
    if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
      targetGrid._emit(EVENT_BEFORE_RECEIVE, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Update item's grid id reference.
    item._gridId = targetGrid._id;

    // Update migrating indicator.
    this._isMigrated = item._gridId !== this._rootGridId;

    // Move item instance from current grid to target grid.
    currentGrid._items.splice(currentIndex, 1);
    arrayInsert(targetGrid._items, item, targetIndex);

    // Reset sort data.
    item._sortData = null;

    // Get the next drag container.
    dragContainer = targetSettings.dragContainer || targetGrid._element;

    // Update item's container offset so we can keep computing the item's
    // current translate position relative to it's current grid element. It's
    // important to keep this synced so that we can feed correct data to the
    // drag sort heuristics and easily compute the item's position within it's
    // current grid element.
    offsetDiff = getOffsetDiff(dragContainer, targetGrid._element, true);
    item._containerDiffX = this._containerDiffX = offsetDiff.left;
    item._containerDiffY = this._containerDiffY = offsetDiff.top;

    // If drag container changed let's update containing block and move the
    // element to it's new container.
    if (dragContainer !== this._container) {
      offsetDiff = getOffsetDiff(this._container, dragContainer, true);
      this._containingBlock = getContainingBlock(dragContainer);
      this._container = dragContainer;
      this._translateX -= offsetDiff.left;
      this._translateY -= offsetDiff.top;

      dragContainer.appendChild(element);
      item._setTranslate(this._translateX, this._translateY);
    }

    // Update item class.
    if (settings.itemClass !== targetSettings.itemClass) {
      removeClass(element, settings.itemClass);
      addClass(element, targetSettings.itemClass);
    }

    // Update dragging class.
    if (settings.itemDraggingClass !== targetSettings.itemDraggingClass) {
      removeClass(element, settings.itemDraggingClass);
      addClass(element, targetSettings.itemDraggingClass);
    }

    // Update visibility styles/class.
    if (item._isActive) {
      if (settings.itemVisibleClass !== targetSettings.itemVisibleClass) {
        removeClass(element, settings.itemVisibleClass);
        addClass(element, targetSettings.itemVisibleClass);
      }
      item._visibility.setStyles(targetSettings.visibleStyles);
    } else {
      if (settings.itemHiddenClass !== targetSettings.itemHiddenClass) {
        removeClass(element, settings.itemHiddenClass);
        addClass(element, targetSettings.itemHiddenClass);
      }
      item._visibility.setStyles(targetSettings.hiddenStyles);
    }

    // Update item's cached dimensions.
    // TODO: This should be only done if there's a chance that the DOM writes
    // have cause this to change. Maybe this is not needed?
    item._refreshDimensions();

    // Emit send event.
    if (currentGrid._hasListeners(EVENT_SEND)) {
      currentGrid._emit(EVENT_SEND, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // Emit receive event.
    if (targetGrid._hasListeners(EVENT_RECEIVE)) {
      targetGrid._emit(EVENT_RECEIVE, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex,
      });
    }

    // If the sort action is "swap" let's respect it and send the target item
    // (if it exists) from the target grid to the originating grid. This process
    // is done on purpose after the dragged item placed within the target grid
    // so that we can keep this implementation as simple as possible utilizing
    // the existing API.
    if (sortAction === ACTION_SWAP && targetItem && targetItem.isActive()) {
      // Sanity check to make sure that the target item is still part of the
      // target grid. It could have been manipulated in the event handlers.
      // TODO: this._container points to wrong element here as it's updated.
      if (targetGrid._items.indexOf(targetItem) > -1) {
        targetGrid.send(targetItem, currentGrid, currentIndex, {
          appendTo: this._container || document.body,
          layoutSender: false,
          layoutReceiver: false,
        });
      }
    }

    // Layout both grids.
    currentGrid.layout();
    targetGrid.layout();
  }
};

/**
 * If item is dragged into another grid, finish the migration process.
 *
 * @private
 */
ItemDrag.prototype._finishMigration = function () {
  var item = this._item;

  this.destroy();

  // TODO: This causes a potential memory leak in the event where you destroy
  // item while drag is ongoing.
  item._drag = item.getGrid()._settings.dragEnabled ? new ItemDrag(item) : null;
  item._dragRelease.start();
};

/**
 * Drag pre-start handler.
 *
 * @private
 * @param {Object} event
 */
ItemDrag.prototype._preStartCheck = function (event) {
  // Let's activate drag start predicate state.
  if (this._startPredicateState === START_PREDICATE_INACTIVE) {
    this._startPredicateState = START_PREDICATE_PENDING;
  }

  // If predicate is pending try to resolve it.
  if (this._startPredicateState === START_PREDICATE_PENDING) {
    this._startPredicateResult = this._startPredicate(this._item, event);
    if (this._startPredicateResult === true) {
      this._startPredicateState = START_PREDICATE_RESOLVED;
      this._onStart(event);
    } else if (this._startPredicateResult === false) {
      this._resetStartPredicate(event);
      this._dragger._reset();
      this._startPredicateState = START_PREDICATE_INACTIVE;
    }
  }

  // Otherwise if predicate is resolved and drag is active, move the item.
  else if (this._startPredicateState === START_PREDICATE_RESOLVED && this._isActive) {
    this._onMove(event);
  }
};

/**
 * Drag pre-end handler.
 *
 * @private
 * @param {Object} event
 */
ItemDrag.prototype._preEndCheck = function (event) {
  var isResolved = this._startPredicateState === START_PREDICATE_RESOLVED;

  // Do final predicate check to allow user to unbind stuff for the current
  // drag procedure within the predicate callback. The return value of this
  // check will have no effect to the state of the predicate.
  this._startPredicate(this._item, event);

  this._startPredicateState = START_PREDICATE_INACTIVE;

  if (!isResolved || !this._isActive) return;

  if (this._isStarted) {
    this._onEnd(event);
  } else {
    this.stop();
  }
};

/**
 * Drag start handler.
 *
 * @private
 * @param {Object} event
 */
ItemDrag.prototype._onStart = function (event) {
  var item = this._item;
  if (!item._isActive) return;

  this._isActive = true;
  this._dragStartEvent = event;
  ItemDrag.autoScroller.addItem(item);

  addDragStartTick(item._id, this._prepareStart, this._applyStart);
};

/**
 * @private
 */
ItemDrag.prototype._prepareStart = function () {
  var item = this._item;
  if (!item._isActive) return;

  var element = item._element;
  var grid = item.getGrid();
  var settings = grid._settings;
  var dragContainer = settings.dragContainer || grid._element;
  var containingBlock = getContainingBlock(dragContainer);
  var translate = item._getTranslate();
  var elementRect = element.getBoundingClientRect();

  this._container = dragContainer;
  this._containingBlock = containingBlock;
  this._clientX = elementRect.left;
  this._clientY = elementRect.top;
  this._translateX = translate.x;
  this._translateY = translate.y;
  this._scrollDiffX = this._scrollDiffY = 0;
  this._moveDiffX = this._moveDiffY = 0;
  this._containerDiffX = this._containerDiffY = 0;

  if (dragContainer !== grid._element) {
    var offsetDiff = getOffsetDiff(containingBlock, grid._element);
    this._containerDiffX = offsetDiff.left;
    this._containerDiffY = offsetDiff.top;
  }

  this._resetHeuristics(
    this._translateX - item._containerDiffX,
    this._translateY - item._containerDiffY
  );
};

/**
 * @private
 */
ItemDrag.prototype._applyStart = function () {
  var item = this._item;
  if (!item._isActive) return;

  var grid = item.getGrid();
  var element = item._element;
  var release = item._dragRelease;
  var migrate = item._migrate;

  if (item.isPositioning()) {
    item._layout.stop(true, this._translateX, this._translateY);
  }

  if (migrate._isActive) {
    this._translateX -= item._containerDiffX;
    this._translateY -= item._containerDiffY;
    migrate.stop(true, this._translateX, this._translateY);
  }

  if (item.isReleasing()) {
    release._reset();
  }

  if (grid._settings.dragPlaceholder.enabled) {
    item._dragPlaceholder.create();
  }

  this._isStarted = true;

  grid._emit(EVENT_DRAG_INIT, item, this._dragStartEvent);

  // If the dragged element is not a child of the drag container we need to
  // append the element inside the correct container, setup the actual drag
  // position data and adjust the element's translate values to account for
  // the DOM position shift.
  if (element.parentNode !== this._container) {
    this._translateX += this._containerDiffX;
    this._translateY += this._containerDiffY;
    this._container.appendChild(element);
    item._setTranslate(this._translateX, this._translateY);
  }

  // Make sure item's container diff is synced at this point.
  item._containerDiffX = this._containerDiffX;
  item._containerDiffY = this._containerDiffY;

  addClass(element, grid._settings.itemDraggingClass);
  this._bindScrollHandler();
  grid._emit(EVENT_DRAG_START, item, this._dragStartEvent);
};

/**
 * Drag move handler.
 *
 * @private
 * @param {Object} event
 */
ItemDrag.prototype._onMove = function (event) {
  var item = this._item;

  if (!item._isActive) {
    this.stop();
    return;
  }

  this._dragMoveEvent = event;
  addDragMoveTick(item._id, this._prepareMove, this._applyMove);
  addDragSortTick(item._id, this._handleSort);
};

/**
 * Prepare dragged item for moving.
 *
 * @private
 */
ItemDrag.prototype._prepareMove = function () {
  var item = this._item;

  if (!item._isActive) return;

  var axis = item.getGrid()._settings.dragAxis;
  var nextEvent = this._dragMoveEvent;
  var prevEvent = this._dragPrevMoveEvent || this._dragStartEvent || nextEvent;

  // Update horizontal position data.
  if (axis !== 'y') {
    var moveDiffX = nextEvent.clientX - prevEvent.clientX;
    this._translateX = this._translateX - this._moveDiffX + moveDiffX;
    this._clientX = this._clientX - this._moveDiffX + moveDiffX;
    this._moveDiffX = moveDiffX;
  }

  // Update vertical position data.
  if (axis !== 'x') {
    var moveDiffY = nextEvent.clientY - prevEvent.clientY;
    this._translateY = this._translateY - this._moveDiffY + moveDiffY;
    this._clientY = this._clientY - this._moveDiffY + moveDiffY;
    this._moveDiffY = moveDiffY;
  }

  this._dragPrevMoveEvent = nextEvent;
};

/**
 * Apply movement to dragged item.
 *
 * @private
 */
ItemDrag.prototype._applyMove = function () {
  var item = this._item;
  if (!item._isActive) return;

  this._moveDiffX = this._moveDiffY = 0;
  item._setTranslate(this._translateX, this._translateY);
  this.getRootGrid()._emit(EVENT_DRAG_MOVE, item, this._dragMoveEvent);
  ItemDrag.autoScroller.updateItem(item);
};

/**
 * Drag scroll handler.
 *
 * @private
 * @param {Object} event
 */
ItemDrag.prototype._onScroll = function (event) {
  var item = this._item;

  if (!item._isActive) {
    this.stop();
    return;
  }

  this._scrollEvent = event;
  addDragScrollTick(item._id, this._prepareScroll, this._applyScroll);
  addDragSortTick(item._id, this._handleSort);
};

/**
 * Prepare dragged item for scrolling.
 *
 * @private
 */
ItemDrag.prototype._prepareScroll = function () {
  var item = this._item;

  // If item is not active do nothing.
  if (!item._isActive) return;

  var element = item._element;
  var grid = item.getGrid();
  var axis = grid._settings.dragAxis;
  var rect = element.getBoundingClientRect();

  // Update container diff.
  if (this._container !== grid._element) {
    var offsetDiff = getOffsetDiff(this._containingBlock, grid._element);
    item._containerDiffX = this._containerDiffX = offsetDiff.left;
    item._containerDiffY = this._containerDiffY = offsetDiff.top;
  }

  // Update horizontal position data.
  if (axis !== 'y') {
    var scrollDiffX = this._clientX - this._moveDiffX - this._scrollDiffX - rect.left;
    this._translateX = this._translateX - this._scrollDiffX + scrollDiffX;
    this._scrollDiffX = scrollDiffX;
  }

  // Update vertical position data.
  if (axis !== 'x') {
    var scrollDiffY = this._clientY - this._moveDiffY - this._scrollDiffY - rect.top;
    this._translateY = this._translateY - this._scrollDiffY + scrollDiffY;
    this._scrollDiffY = scrollDiffY;
  }
};

/**
 * Apply scroll to dragged item.
 *
 * @private
 */
ItemDrag.prototype._applyScroll = function () {
  var item = this._item;
  if (!item._isActive) return;

  this._scrollDiffX = this._scrollDiffY = 0;
  item._setTranslate(this._translateX, this._translateY);
  this.getRootGrid()._emit(EVENT_DRAG_SCROLL, item, this._scrollEvent);
};

/**
 * Drag end handler.
 *
 * @private
 * @param {Object} event
 */
ItemDrag.prototype._onEnd = function (event) {
  var item = this._item;

  // If item is not active, reset drag.
  if (!item._isActive) {
    this.stop();
    return;
  }

  // Cancel queued ticks.
  cancelDragStartTick(item._id);
  cancelDragMoveTick(item._id);
  cancelDragScrollTick(item._id);

  // Finish sort procedure (does final overlap check if needed).
  this._finishSort();

  // Remove scroll listeners.
  this._unbindScrollHandler();

  // Reset drag data.
  this._reset();

  // Remove dragging class from element.
  removeClass(item._element, item.getGrid()._settings.itemDraggingClass);

  // Stop auto-scroll.
  ItemDrag.autoScroller.removeItem(item);

  // Emit dragEnd event.
  this.getRootGrid()._emit(EVENT_DRAG_END, item, event);

  // Finish up the migration process or start the release process.
  this._isMigrated ? this._finishMigration() : item._dragRelease.start();
};

/**
 * Private helpers
 * ***************
 */

/**
 * Check if an element is an anchor element and open the href url if possible.
 *
 * @param {HTMLElement} element
 */
function openAnchorHref(element) {
  // Make sure the element is anchor element.
  if (element.tagName.toLowerCase() !== 'a') return;

  // Get href and make sure it exists.
  var href = element.getAttribute('href');
  if (!href) return;

  // Finally let's navigate to the link href.
  var target = element.getAttribute('target');
  if (target && target !== '_self') {
    window.open(href, target);
  } else {
    window.location.href = href;
  }
}

export default ItemDrag;
