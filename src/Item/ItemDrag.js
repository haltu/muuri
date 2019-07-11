/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import {
  actionMove,
  actionSwap,
  eventMove,
  eventSend,
  eventBeforeSend,
  eventReceive,
  eventBeforeReceive,
  eventDragInit,
  eventDragStart,
  eventDragMove,
  eventDragScroll,
  eventDragEnd,
  gridInstances
} from '../shared';

import Dragger from '../Dragger/Dragger';

import { addMoveTick, cancelMoveTick, addScrollTick, cancelScrollTick } from '../ticker';

import addClass from '../utils/addClass';
import arrayInsert from '../utils/arrayInsert';
import arrayMove from '../utils/arrayMove';
import arraySwap from '../utils/arraySwap';
import debounce from '../utils/debounce';
import elementMatches from '../utils/elementMatches';
import getContainingBlock from '../utils/getContainingBlock';
import getOffsetDiff from '../utils/getOffsetDiff';
import getScrollableAncestors from '../utils/getScrollableAncestors';
import getTranslate from '../utils/getTranslate';
import getTranslateString from '../utils/getTranslateString';
import isFunction from '../utils/isFunction';
import normalizeArrayIndex from '../utils/normalizeArrayIndex';
import removeClass from '../utils/removeClass';
import setStyles from '../utils/setStyles';
import { transformProp } from '../utils/supportedTransform';

// Drag start predicate states.
var startPredicateInactive = 0;
var startPredicatePending = 1;
var startPredicateResolved = 2;
var startPredicateRejected = 3;

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
  this._gridId = grid._id;
  this._isDestroyed = false;
  this._isMigrating = false;

  // Start predicate data.
  this._startPredicate = isFunction(settings.dragStartPredicate)
    ? settings.dragStartPredicate
    : ItemDrag.defaultStartPredicate;
  this._startPredicateState = startPredicateInactive;
  this._startPredicateResult = undefined;

  // Data for drag sort predicate heuristics.
  this._hBlockedIndex = null;
  this._hX1 = 0;
  this._hX2 = 0;
  this._hY1 = 0;
  this._hY2 = 0;

  // Setup item's initial drag data.
  this._reset();

  // Bind the methods that needs binding.
  this._preStartCheck = this._preStartCheck.bind(this);
  this._preEndCheck = this._preEndCheck.bind(this);
  this._onScroll = this._onScroll.bind(this);
  this._prepareMove = this._prepareMove.bind(this);
  this._applyMove = this._applyMove.bind(this);
  this._prepareScroll = this._prepareScroll.bind(this);
  this._applyScroll = this._applyScroll.bind(this);
  this._checkOverlap = this._checkOverlap.bind(this);

  // Create debounce overlap checker function.
  var sortInterval = settings.dragSortHeuristics.sortInterval;
  this._checkOverlapDebounce = debounce(this._checkOverlap, sortInterval);

  // Init dragger.
  this._dragger = new Dragger(element, settings.dragCssProps);
  this._dragger.on('start', this._preStartCheck);
  this._dragger.on('move', this._preStartCheck);
  this._dragger.on('cancel', this._preEndCheck);
  this._dragger.on('end', this._preEndCheck);
}

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
 * @memberof ItemDrag
 * @param {Item} item
 * @param {DraggerEvent} event
 * @param {Object} [options]
 *   - An optional options object which can be used to pass the predicate
 *     it's options manually. By default the predicate retrieves the options
 *     from the grid's settings.
 * @returns {Boolean}
 */
ItemDrag.defaultStartPredicate = function(item, event, options) {
  var drag = item._drag;
  var predicate = drag._startPredicateData || drag._setupStartPredicate(options);

  // Final event logic. At this stage return value does not matter anymore,
  // the predicate is either resolved or it's not and there's nothing to do
  // about it. Here we just reset data and if the item element is a link
  // we follow it (if there has only been slight movement).
  if (event.isFinal) {
    drag._finishStartPredicate(event);
    return;
  }

  // Find and store the handle element so we can check later on if the
  // cursor is within the handle. If we have a handle selector let's find
  // the corresponding element. Otherwise let's use the item element as the
  // handle.
  if (!predicate.handleElement) {
    predicate.handleElement = drag._getStartPredicateHandle(event);
    if (!predicate.handleElement) return false;
  }

  // If delay is defined let's keep track of the latest event and initiate
  // delay if it has not been done yet.
  if (predicate.delay) {
    predicate.event = event;
    if (!predicate.delayTimer) {
      predicate.delayTimer = window.setTimeout(function() {
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
 * @memberof ItemDrag
 * @param {Item} item
 * @param {Object} [options]
 * @param {Number} [options.threshold=50]
 * @param {String} [options.action='move']
 * @returns {(Boolean|DragSortCommand)}
 *   - Returns false if no valid index was found. Otherwise returns drag sort
 *     command.
 */
ItemDrag.defaultSortPredicate = (function() {
  var itemRect = {};
  var targetRect = {};
  var returnData = {};
  var rootGridArray = [];

  function getTargetGrid(item, rootGrid, threshold) {
    var target = null;
    var dragSort = rootGrid._settings.dragSort;
    var bestScore = -1;
    var gridScore;
    var grids;
    var grid;
    var i;

    // Get potential target grids.
    if (dragSort === true) {
      rootGridArray[0] = rootGrid;
      grids = rootGridArray;
    } else {
      grids = dragSort.call(rootGrid, item);
    }

    // Return immediately if there are no grids.
    if (!Array.isArray(grids)) return target;

    // Loop through the grids and get the best match.
    for (i = 0; i < grids.length; i++) {
      grid = grids[i];

      // Filter out all destroyed grids.
      if (grid._isDestroyed) continue;

      // We need to update the grid's offsets and dimensions since they might
      // have changed (e.g during scrolling).
      grid._updateBoundingRect();

      // Check how much dragged element overlaps the container element.
      targetRect.width = grid._width;
      targetRect.height = grid._height;
      targetRect.left = grid._left;
      targetRect.top = grid._top;
      gridScore = getRectOverlapScore(itemRect, targetRect);

      // Check if this grid is the best match so far.
      if (gridScore > threshold && gridScore > bestScore) {
        bestScore = gridScore;
        target = grid;
      }
    }

    // Always reset root grid array.
    rootGridArray.length = 0;

    return target;
  }

  return function(item, options) {
    var drag = item._drag;
    var rootGrid = drag._getGrid();

    // Get drag sort predicate settings.
    var sortThreshold = options && typeof options.threshold === 'number' ? options.threshold : 50;
    var sortAction = options && options.action === actionSwap ? actionSwap : actionMove;

    // Populate item rect data.
    itemRect.width = item._width;
    itemRect.height = item._height;
    itemRect.left = drag._elementClientX;
    itemRect.top = drag._elementClientY;

    // Calculate the target grid.
    var grid = getTargetGrid(item, rootGrid, sortThreshold);

    // Return early if we found no grid container element that overlaps the
    // dragged item enough.
    if (!grid) return false;

    var gridOffsetLeft = 0;
    var gridOffsetTop = 0;
    var matchScore = -1;
    var matchIndex;
    var hasValidTargets;
    var target;
    var score;
    var i;

    // If item is moved within it's originating grid adjust item's left and
    // top props. Otherwise if item is moved to/within another grid get the
    // container element's offset (from the element's content edge).
    if (grid === rootGrid) {
      itemRect.left = drag._gridX + item._marginLeft;
      itemRect.top = drag._gridY + item._marginTop;
    } else {
      grid._updateBorders(1, 0, 1, 0);
      gridOffsetLeft = grid._left + grid._borderLeft;
      gridOffsetTop = grid._top + grid._borderTop;
    }

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
      targetRect.left = target._left + target._marginLeft + gridOffsetLeft;
      targetRect.top = target._top + target._marginTop + gridOffsetTop;
      score = getRectOverlapScore(itemRect, targetRect);

      // Update best match index and score if the target's overlap score with
      // the dragged item is higher than the current best match score.
      if (score > matchScore) {
        matchIndex = i;
        matchScore = score;
      }
    }

    // If there is no valid match and the item is being moved into another
    // grid.
    if (matchScore < sortThreshold && item.getGrid() !== grid) {
      matchIndex = hasValidTargets ? -1 : 0;
      matchScore = Infinity;
    }

    // Check if the best match overlaps enough to justify a placement switch.
    if (matchScore >= sortThreshold) {
      returnData.grid = grid;
      returnData.index = matchIndex;
      returnData.action = sortAction;
      return returnData;
    }

    return false;
  };
})();

/**
 * Public prototype methods
 * ************************
 */

/**
 * Abort dragging and reset drag data.
 *
 * @public
 * @memberof ItemDrag.prototype
 * @returns {ItemDrag}
 */
ItemDrag.prototype.stop = function() {
  var item = this._item;
  var element = item._element;
  var grid = this._getGrid();

  if (!this._isActive) return this;

  // If the item is being dropped into another grid, finish it up and return
  // immediately.
  if (this._isMigrating) {
    this._finishMigration();
    return this;
  }

  // Cancel queued move and scroll ticks.
  cancelMoveTick(item._id);
  cancelScrollTick(item._id);

  // Remove scroll listeners.
  this._unbindScrollListeners();

  // Cancel overlap check.
  this._checkOverlapDebounce('cancel');

  // Append item element to the container if it's not it's child. Also make
  // sure the translate values are adjusted to account for the DOM shift.
  if (element.parentNode !== grid._element) {
    grid._element.appendChild(element);
    element.style[transformProp] = getTranslateString(this._gridX, this._gridY);
  }

  // Remove dragging class.
  removeClass(element, grid._settings.itemDraggingClass);

  // Reset drag data.
  this._reset();

  return this;
};

/**
 * Destroy instance.
 *
 * @public
 * @memberof ItemDrag.prototype
 * @returns {ItemDrag}
 */
ItemDrag.prototype.destroy = function() {
  if (this._isDestroyed) return this;
  this.stop();
  this._dragger.destroy();
  this._isDestroyed = true;
  return this;
};

/**
 * Private prototype methods
 * *************************
 */

/**
 * Get Grid instance.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @returns {?Grid}
 */
ItemDrag.prototype._getGrid = function() {
  return gridInstances[this._gridId] || null;
};

/**
 * Setup/reset drag data.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._reset = function() {
  // Is item being dragged?
  this._isActive = false;

  // The dragged item's container element.
  this._container = null;

  // The dragged item's containing block.
  this._containingBlock = null;

  // Drag/scroll event data.
  this._dragEvent = null;
  this._scrollEvent = null;

  // All the elements which need to be listened for scroll events during
  // dragging.
  this._scrollers = [];

  // The current translateX/translateY position.
  this._left = 0;
  this._top = 0;

  // Dragged element's current position within the grid.
  this._gridX = 0;
  this._gridY = 0;

  // Dragged element's current offset from window's northwest corner. Does
  // not account for element's margins.
  this._elementClientX = 0;
  this._elementClientY = 0;

  // Offset difference between the dragged element's temporary drag
  // container and it's original container.
  this._containerDiffX = 0;
  this._containerDiffY = 0;
};

/**
 * Bind drag scroll handlers to all scrollable ancestor elements of the
 * dragged element and the drag container element.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._bindScrollListeners = function() {
  var gridContainer = this._getGrid()._element;
  var dragContainer = this._container;
  var scrollers = this._scrollers;
  var gridScrollers;
  var i;

  // Get dragged element's scrolling parents.
  scrollers.length = 0;
  getScrollableAncestors(this._item._element, false, scrollers);

  // If drag container is defined and it's not the same element as grid
  // container then we need to add the grid container and it's scroll parents
  // to the elements which are going to be listener for scroll events.
  if (dragContainer !== gridContainer) {
    gridScrollers = [];
    getScrollableAncestors(gridContainer, true, gridScrollers);
    for (i = 0; i < gridScrollers.length; i++) {
      if (scrollers.indexOf(gridScrollers[i]) < 0) {
        scrollers.push(gridScrollers[i]);
      }
    }
  }

  // Bind scroll listeners.
  for (i = 0; i < scrollers.length; i++) {
    scrollers[i].addEventListener('scroll', this._onScroll);
  }
};

/**
 * Unbind currently bound drag scroll handlers from all scrollable ancestor
 * elements of the dragged element and the drag container element.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._unbindScrollListeners = function() {
  var scrollers = this._scrollers;
  var i;

  for (i = 0; i < scrollers.length; i++) {
    scrollers[i].removeEventListener('scroll', this._onScroll);
  }

  scrollers.length = 0;
};

/**
 * Setup default start predicate.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {Object} [options]
 * @returns {Object}
 */
ItemDrag.prototype._setupStartPredicate = function(options) {
  var config = options || this._getGrid()._settings.dragStartPredicate || 0;
  return (this._startPredicateData = {
    distance: Math.abs(config.distance) || 0,
    delay: Math.max(config.delay, 0) || 0,
    handle: typeof config.handle === 'string' ? config.handle : false
  });
};

/**
 * Setup default start predicate handle.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 * @returns {?HTMLElement}
 */
ItemDrag.prototype._getStartPredicateHandle = function(event) {
  var predicate = this._startPredicateData;
  var element = this._item._element;
  var handleElement = element;

  // No handle, no hassle -> let's use the item element as the handle.
  if (!predicate.handle) return handleElement;

  // If there is a specific predicate handle defined, let's try to get it.
  handleElement = event.target;
  while (handleElement && !elementMatches(handleElement, predicate.handle)) {
    handleElement = handleElement !== element ? handleElement.parentElement : null;
  }
  return handleElement || null;
};

/**
 * Unbind currently bound drag scroll handlers from all scrollable ancestor
 * elements of the dragged element and the drag container element.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 * @returns {Boolean}
 */
ItemDrag.prototype._resolveStartPredicate = function(event) {
  var predicate = this._startPredicateData;

  // If the moved distance is smaller than the threshold distance or there is
  // some delay left, ignore this predicate cycle.
  if (event.distance < predicate.distance || predicate.delay) return;

  // Get handle rect data.
  var handleRect = predicate.handleElement.getBoundingClientRect();
  var handleLeft = handleRect.left + (window.pageXOffset || 0);
  var handleTop = handleRect.top + (window.pageYOffset || 0);
  var handleWidth = handleRect.width;
  var handleHeight = handleRect.height;

  // Reset predicate data.
  this._resetStartPredicate();

  // If the cursor is still within the handle let's start the drag.
  return (
    handleWidth &&
    handleHeight &&
    event.pageX >= handleLeft &&
    event.pageX < handleLeft + handleWidth &&
    event.pageY >= handleTop &&
    event.pageY < handleTop + handleHeight
  );
};

/**
 * Forcefully resolve drag start predicate.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 */
ItemDrag.prototype._forceResolveStartPredicate = function(event) {
  if (!this._isDestroyed && this._startPredicateState === startPredicatePending) {
    this._startPredicateState = startPredicateResolved;
    this._onStart(event);
  }
};

/**
 * Finalize start predicate.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 */
ItemDrag.prototype._finishStartPredicate = function(event) {
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
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 */
ItemDrag.prototype._resetHeuristics = function(event) {
  this._hBlockedIndex = null;
  this._hX1 = this._hX2 = event.clientX;
  this._hY1 = this._hY2 = event.clientY;
};

/**
 * Run heuristics and return true if overlap check can be performed, and false
 * if it can not.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 * @returns {Boolean}
 */
ItemDrag.prototype._checkHeuristics = function(event) {
  var settings = this._getGrid()._settings.dragSortHeuristics;
  var minDist = settings.minDragDistance;

  // Skip heuristics if not needed.
  if (minDist <= 0) {
    this._hBlockedIndex = null;
    return true;
  }

  var x = event.clientX;
  var y = event.clientY;
  var diffX = x - this._hX2;
  var diffY = y - this._hY2;

  // If we can't do proper bounce back check make sure that the blocked index
  // is not set.
  var canCheckBounceBack = minDist > 3 && settings.minBounceBackAngle > 0;
  if (!canCheckBounceBack) {
    this._hBlockedIndex = null;
  }

  if (Math.abs(diffX) > minDist || Math.abs(diffY) > minDist) {
    // Reset blocked index if angle changed enough. This check requires a
    // minimum value of 3 for minDragDistance to function properly.
    if (canCheckBounceBack) {
      var angle = Math.atan2(diffX, diffY);
      var prevAngle = Math.atan2(this._hX2 - this._hX1, this._hY2 - this._hY1);
      var deltaAngle = Math.atan2(Math.sin(angle - prevAngle), Math.cos(angle - prevAngle));
      if (Math.abs(deltaAngle) > settings.minBounceBackAngle) {
        this._hBlockedIndex = null;
      }
    }

    // Update points.
    this._hX1 = this._hX2;
    this._hY1 = this._hY2;
    this._hX2 = x;
    this._hY2 = y;

    return true;
  }

  return false;
};

/**
 * Reset for default drag start predicate function.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._resetStartPredicate = function() {
  var predicate = this._startPredicateData;
  if (predicate) {
    if (predicate.delayTimer) {
      predicate.delayTimer = window.clearTimeout(predicate.delayTimer);
    }
    this._startPredicateData = null;
  }
};

/**
 * Check (during drag) if an item is overlapping other items and based on
 * the configuration layout the items.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._checkOverlap = function() {
  if (!this._isActive) return;

  var item = this._item;
  var settings = this._getGrid()._settings;
  var result;
  var currentGrid;
  var currentIndex;
  var targetGrid;
  var targetIndex;
  var sortAction;
  var isMigration;

  // Get overlap check result.
  if (isFunction(settings.dragSortPredicate)) {
    result = settings.dragSortPredicate(item, this._dragEvent);
  } else {
    result = ItemDrag.defaultSortPredicate(item, settings.dragSortPredicate);
  }

  // Let's make sure the result object has a valid index before going further.
  if (!result || typeof result.index !== 'number') return;

  currentGrid = item.getGrid();
  targetGrid = result.grid || currentGrid;
  isMigration = currentGrid !== targetGrid;
  currentIndex = currentGrid._items.indexOf(item);
  targetIndex = normalizeArrayIndex(targetGrid._items, result.index, isMigration);
  sortAction = result.action === actionSwap ? actionSwap : actionMove;

  // Prevent position bounce.
  if (!isMigration && targetIndex === this._hBlockedIndex) {
    return;
  }

  // If the item was moved within it's current grid.
  if (!isMigration) {
    // Make sure the target index is not the current index.
    if (currentIndex !== targetIndex) {
      this._hBlockedIndex = currentIndex;

      // Do the sort.
      (sortAction === actionSwap ? arraySwap : arrayMove)(
        currentGrid._items,
        currentIndex,
        targetIndex
      );

      // Emit move event.
      if (currentGrid._hasListeners(eventMove)) {
        currentGrid._emit(eventMove, {
          item: item,
          fromIndex: currentIndex,
          toIndex: targetIndex,
          action: sortAction
        });
      }

      // Layout the grid.
      currentGrid.layout();
    }
  }

  // If the item was moved to another grid.
  else {
    this._hBlockedIndex = null;

    // Emit beforeSend event.
    if (currentGrid._hasListeners(eventBeforeSend)) {
      currentGrid._emit(eventBeforeSend, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });
    }

    // Emit beforeReceive event.
    if (targetGrid._hasListeners(eventBeforeReceive)) {
      targetGrid._emit(eventBeforeReceive, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });
    }

    // Update item's grid id reference.
    item._gridId = targetGrid._id;

    // Update drag instance's migrating indicator.
    this._isMigrating = item._gridId !== this._gridId;

    // Move item instance from current grid to target grid.
    currentGrid._items.splice(currentIndex, 1);
    arrayInsert(targetGrid._items, item, targetIndex);

    // Set sort data as null, which is an indicator for the item comparison
    // function that the sort data of this specific item should be fetched
    // lazily.
    item._sortData = null;

    // Emit send event.
    if (currentGrid._hasListeners(eventSend)) {
      currentGrid._emit(eventSend, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });
    }

    // Emit receive event.
    if (targetGrid._hasListeners(eventReceive)) {
      targetGrid._emit(eventReceive, {
        item: item,
        fromGrid: currentGrid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });
    }

    // Layout both grids.
    currentGrid.layout();
    targetGrid.layout();
  }
};

/**
 * If item is dragged into another grid, finish the migration process
 * gracefully.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._finishMigration = function() {
  var item = this._item;
  var release = item._release;
  var element = item._element;
  var isActive = item._isActive;
  var targetGrid = item.getGrid();
  var targetGridElement = targetGrid._element;
  var targetSettings = targetGrid._settings;
  var targetContainer = targetSettings.dragContainer || targetGridElement;
  var currentSettings = this._getGrid()._settings;
  var currentContainer = element.parentNode;
  var translate;
  var offsetDiff;

  // Destroy current drag. Note that we need to set the migrating flag to
  // false first, because otherwise we create an infinite loop between this
  // and the drag.stop() method.
  this._isMigrating = false;
  this.destroy();

  // Remove current classnames.
  removeClass(element, currentSettings.itemClass);
  removeClass(element, currentSettings.itemVisibleClass);
  removeClass(element, currentSettings.itemHiddenClass);

  // Add new classnames.
  addClass(element, targetSettings.itemClass);
  addClass(element, isActive ? targetSettings.itemVisibleClass : targetSettings.itemHiddenClass);

  // Move the item inside the target container if it's different than the
  // current container.
  if (targetContainer !== currentContainer) {
    targetContainer.appendChild(element);
    offsetDiff = getOffsetDiff(currentContainer, targetContainer, true);
    translate = getTranslate(element);
    translate.x -= offsetDiff.left;
    translate.y -= offsetDiff.top;
  }

  // Update item's cached dimensions and sort data.
  item._refreshDimensions();
  item._refreshSortData();

  // Calculate the offset difference between target's drag container (if any)
  // and actual grid container element. We save it later for the release
  // process.
  offsetDiff = getOffsetDiff(targetContainer, targetGridElement, true);
  release._containerDiffX = offsetDiff.left;
  release._containerDiffY = offsetDiff.top;

  // Recreate item's drag handler.
  item._drag = targetSettings.dragEnabled ? new ItemDrag(item) : null;

  // Adjust the position of the item element if it was moved from a container
  // to another.
  if (targetContainer !== currentContainer) {
    element.style[transformProp] = getTranslateString(translate.x, translate.y);
  }

  // Update child element's styles to reflect the current visibility state.
  item._child.removeAttribute('style');
  setStyles(item._child, isActive ? targetSettings.visibleStyles : targetSettings.hiddenStyles);

  // Start the release.
  release.start();
};

/**
 * Drag pre-start handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 */
ItemDrag.prototype._preStartCheck = function(event) {
  // Let's activate drag start predicate state.
  if (this._startPredicateState === startPredicateInactive) {
    this._startPredicateState = startPredicatePending;
  }

  // If predicate is pending try to resolve it.
  if (this._startPredicateState === startPredicatePending) {
    this._startPredicateResult = this._startPredicate(this._item, event);
    if (this._startPredicateResult === true) {
      this._startPredicateState = startPredicateResolved;
      this._onStart(event);
    } else if (this._startPredicateResult === false) {
      this._startPredicateState = startPredicateRejected;
    }
  }

  // Otherwise if predicate is resolved and drag is active, move the item.
  else if (this._startPredicateState === startPredicateResolved && this._isActive) {
    this._onMove(event);
  }
};

/**
 * Drag pre-end handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 */
ItemDrag.prototype._preEndCheck = function(event) {
  // Check if the start predicate was resolved during drag.
  var isResolved = this._startPredicateState === startPredicateResolved;

  // Do final predicate check to allow user to unbind stuff for the current
  // drag procedure within the predicate callback. The return value of this
  // check will have no effect to the state of the predicate.
  this._startPredicate(this._item, event);

  // Reset start predicate state.
  this._startPredicateState = startPredicateInactive;

  // If predicate is resolved and dragging is active, call the end handler.
  if (isResolved && this._isActive) this._onEnd(event);
};

/**
 * Drag start handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 */
ItemDrag.prototype._onStart = function(event) {
  var item = this._item;

  // If item is not active, don't start the drag.
  if (!item._isActive) return;

  var element = item._element;
  var grid = this._getGrid();
  var settings = grid._settings;
  var release = item._release;
  var migrate = item._migrate;
  var gridContainer = grid._element;
  var dragContainer = settings.dragContainer || gridContainer;
  var containingBlock = getContainingBlock(dragContainer, true);
  var translate = getTranslate(element);
  var currentLeft = translate.x;
  var currentTop = translate.y;
  var elementRect = element.getBoundingClientRect();
  var hasDragContainer = dragContainer !== gridContainer;
  var offsetDiff;

  // Reset heuristics data.
  this._resetHeuristics(event);

  // If grid container is not the drag container, we need to calculate the
  // offset difference between grid container and drag container's containing
  // element.
  if (hasDragContainer) {
    offsetDiff = getOffsetDiff(containingBlock, gridContainer);
  }

  // Stop current positioning animation.
  if (item.isPositioning()) {
    item._layout.stop(true, { transform: getTranslateString(currentLeft, currentTop) });
  }

  // Stop current migration animation.
  if (migrate._isActive) {
    currentLeft -= migrate._containerDiffX;
    currentTop -= migrate._containerDiffY;
    migrate.stop(true, { transform: getTranslateString(currentLeft, currentTop) });
  }

  // If item is being released reset release data.
  if (item.isReleasing()) release._reset();

  // Setup drag data.
  this._isActive = true;
  this._dragEvent = event;
  this._container = dragContainer;
  this._containingBlock = containingBlock;
  this._elementClientX = elementRect.left;
  this._elementClientY = elementRect.top;
  this._left = this._gridX = currentLeft;
  this._top = this._gridY = currentTop;

  // Create placeholder (if necessary).
  if (settings.dragPlaceholder.enabled) {
    item._dragPlaceholder.create();
  }

  // Emit dragInit event.
  grid._emit(eventDragInit, item, event);

  // If a specific drag container is set and it is different from the
  // grid's container element we need to cast some extra spells.
  if (hasDragContainer) {
    // Store the container offset diffs to drag data.
    this._containerDiffX = offsetDiff.left;
    this._containerDiffY = offsetDiff.top;

    // If the dragged element is a child of the drag container all we need to
    // do is setup the relative drag position data.
    if (element.parentNode === dragContainer) {
      this._gridX = currentLeft - this._containerDiffX;
      this._gridY = currentTop - this._containerDiffY;
    }

    // Otherwise we need to append the element inside the correct container,
    // setup the actual drag position data and adjust the element's translate
    // values to account for the DOM position shift.
    else {
      this._left = currentLeft + this._containerDiffX;
      this._top = currentTop + this._containerDiffY;
      dragContainer.appendChild(element);
      element.style[transformProp] = getTranslateString(this._left, this._top);
    }
  }

  // Set drag class and bind scrollers.
  addClass(element, settings.itemDraggingClass);
  this._bindScrollListeners();

  // Emit dragStart event.
  grid._emit(eventDragStart, item, event);
};

/**
 * Drag move handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 */
ItemDrag.prototype._onMove = function(event) {
  var item = this._item;

  // If item is not active, reset drag.
  if (!item._isActive) {
    this.stop();
    return;
  }

  var settings = this._getGrid()._settings;
  var axis = settings.dragAxis;

  // Update horizontal position data.
  if (axis !== 'y') {
    var xDiff = event.clientX - this._dragEvent.clientX;
    this._left += xDiff;
    this._gridX += xDiff;
    this._elementClientX += xDiff;
  }

  // Update vertical position data.
  if (axis !== 'x') {
    var yDiff = event.clientY - this._dragEvent.clientY;
    this._top += yDiff;
    this._gridY += yDiff;
    this._elementClientY += yDiff;
  }

  // Update event data.
  this._dragEvent = event;

  // Do move prepare/apply handling in the next tick.
  addMoveTick(item._id, this._prepareMove, this._applyMove);
};

/**
 * Prepare dragged item for moving.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._prepareMove = function() {
  // Do nothing if item is not active.
  if (!this._item._isActive) return;

  // If drag sort is enabled -> check overlap.
  if (this._getGrid()._settings.dragSort) {
    if (this._checkHeuristics(this._dragEvent)) {
      this._checkOverlapDebounce();
    }
  }
};

/**
 * Apply movement to dragged item.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._applyMove = function() {
  var item = this._item;

  // Do nothing if item is not active.
  if (!item._isActive) return;

  // Update element's translateX/Y values.
  item._element.style[transformProp] = getTranslateString(this._left, this._top);

  // Emit dragMove event.
  this._getGrid()._emit(eventDragMove, item, this._dragEvent);
};

/**
 * Drag scroll handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {Event} event
 */
ItemDrag.prototype._onScroll = function(event) {
  var item = this._item;

  // If item is not active, reset drag.
  if (!item._isActive) {
    this.stop();
    return;
  }

  // Update last scroll event.
  this._scrollEvent = event;

  // Do scroll prepare/apply handling in the next tick.
  addScrollTick(item._id, this._prepareScroll, this._applyScroll);
};

/**
 * Prepare dragged item for scrolling.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._prepareScroll = function() {
  var item = this._item;

  // If item is not active do nothing.
  if (!item._isActive) return;

  var element = item._element;
  var grid = this._getGrid();
  var settings = grid._settings;
  var axis = settings.dragAxis;
  var gridContainer = grid._element;
  var offsetDiff;

  // Calculate element's rect and x/y diff.
  var rect = element.getBoundingClientRect();
  var xDiff = this._elementClientX - rect.left;
  var yDiff = this._elementClientY - rect.top;

  // Update container diff.
  if (this._container !== gridContainer) {
    offsetDiff = getOffsetDiff(this._containingBlock, gridContainer);
    this._containerDiffX = offsetDiff.left;
    this._containerDiffY = offsetDiff.top;
  }

  // Update horizontal position data.
  if (axis !== 'y') {
    this._left += xDiff;
    this._gridX = this._left - this._containerDiffX;
  }

  // Update vertical position data.
  if (axis !== 'x') {
    this._top += yDiff;
    this._gridY = this._top - this._containerDiffY;
  }

  // Overlap handling.
  if (settings.dragSort) this._checkOverlapDebounce();
};

/**
 * Apply scroll to dragged item.
 *
 * @private
 * @memberof ItemDrag.prototype
 */
ItemDrag.prototype._applyScroll = function() {
  var item = this._item;

  // If item is not active do nothing.
  if (!item._isActive) return;

  // Update element's translateX/Y values.
  item._element.style[transformProp] = getTranslateString(this._left, this._top);

  // Emit dragScroll event.
  this._getGrid()._emit(eventDragScroll, item, this._scrollEvent);
};

/**
 * Drag end handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {DraggerEvent} event
 */
ItemDrag.prototype._onEnd = function(event) {
  var item = this._item;
  var element = item._element;
  var grid = this._getGrid();
  var settings = grid._settings;
  var release = item._release;

  // If item is not active, reset drag.
  if (!item._isActive) {
    this.stop();
    return;
  }

  // Cancel queued move and scroll ticks.
  cancelMoveTick(item._id);
  cancelScrollTick(item._id);

  // Finish currently queued overlap check.
  settings.dragSort && this._checkOverlapDebounce('finish');

  // Remove scroll listeners.
  this._unbindScrollListeners();

  // Setup release data.
  release._containerDiffX = this._containerDiffX;
  release._containerDiffY = this._containerDiffY;

  // Reset drag data.
  this._reset();

  // Remove drag class name from element.
  removeClass(element, settings.itemDraggingClass);

  // Emit dragEnd event.
  grid._emit(eventDragEnd, item, event);

  // Finish up the migration process or start the release process.
  this._isMigrating ? this._finishMigration() : release.start();
};

/**
 * Private helpers
 * ***************
 */

/**
 * Calculate how many percent the intersection area of two rectangles is from
 * the maximum potential intersection area between the rectangles.
 *
 * @param {Rectangle} a
 * @param {Rectangle} b
 * @returns {Number}
 *   - A number between 0-100.
 */
function getRectOverlapScore(a, b) {
  // Return 0 immediately if the rectangles do not overlap.
  if (
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  ) {
    return 0;
  }

  // Calculate intersection area's width, height, max height and max width.
  var width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  var height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  var maxWidth = Math.min(a.width, b.width);
  var maxHeight = Math.min(a.height, b.height);

  return ((width * height) / (maxWidth * maxHeight)) * 100;
}

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
