/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

import Hammer from 'hammerjs';

import {
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
  gridInstances,
  namespace
} from '../shared.js';

import { addMoveTick, cancelMoveTick, addScrollTick, cancelScrollTick } from '../ticker.js';

import addClass from '../utils/addClass.js';
import arrayMove from '../utils/arrayMove.js';
import arraySwap from '../utils/arraySwap.js';
import debounce from '../utils/debounce.js';
import elementMatches from '../utils/elementMatches.js';
import getContainingBlock from '../utils/getContainingBlock.js';
import getOffsetDiff from '../utils/getOffsetDiff.js';
import getStyle from '../utils/getStyle.js';
import getTranslate from '../utils/getTranslate.js';
import getTranslateString from '../utils/getTranslateString.js';
import arrayInsert from '../utils/arrayInsert.js';
import isPlainObject from '../utils/isPlainObject.js';
import isTransformed from '../utils/isTransformed.js';
import normalizeArrayIndex from '../utils/normalizeArrayIndex.js';
import removeClass from '../utils/removeClass.js';
import setStyles from '../utils/setStyles';
import { isTransformSupported, transformProp } from '../utils/supportedTransform.js';

// To provide consistently correct dragging experience we need to know if
// transformed elements leak fixed elements or not.
var hasTransformLeak = checkTransformLeak();

// Drag start predicate states.
var startPredicateInactive = 0;
var startPredicatePending = 1;
var startPredicateResolved = 2;
var startPredicateRejected = 3;

/**
 * Bind Hammer touch interaction to an item.
 *
 * @class
 * @param {Item} item
 */
function ItemDrag(item) {
  if (!Hammer) {
    throw new Error('[' + namespace + '] required dependency Hammer is not defined.');
  }

  // If we don't have a valid transform leak test result yet, let's run the
  // test on first ItemDrag init. The test needs body element to be ready and
  // here we can be sure that it is ready.
  if (hasTransformLeak === null) {
    hasTransformLeak = checkTransformLeak();
  }

  var drag = this;
  var element = item._element;
  var grid = item.getGrid();
  var settings = grid._settings;
  var hammer;

  // Start predicate private data.
  var startPredicate =
    typeof settings.dragStartPredicate === 'function'
      ? settings.dragStartPredicate
      : ItemDrag.defaultStartPredicate;
  var startPredicateState = startPredicateInactive;
  var startPredicateResult;

  // Protected data.
  this._item = item;
  this._gridId = grid._id;
  this._hammer = hammer = new Hammer.Manager(element);
  this._isDestroyed = false;
  this._isMigrating = false;

  // Setup item's initial drag data.
  this._reset();

  // Bind some methods that needs binding.
  this._onScroll = this._onScroll.bind(this);
  this._prepareMove = this._prepareMove.bind(this);
  this._applyMove = this._applyMove.bind(this);
  this._prepareScroll = this._prepareScroll.bind(this);
  this._applyScroll = this._applyScroll.bind(this);
  this._checkOverlap = this._checkOverlap.bind(this);

  // Create a private drag start resolver that can be used to resolve the drag
  // start predicate asynchronously.
  this._forceResolveStartPredicate = function(event) {
    if (!this._isDestroyed && startPredicateState === startPredicatePending) {
      startPredicateState = startPredicateResolved;
      this._onStart(event);
    }
  };

  // Create debounce overlap checker function.
  this._checkOverlapDebounce = debounce(this._checkOverlap, settings.dragSortInterval);

  // Add drag recognizer to hammer.
  hammer.add(
    new Hammer.Pan({
      event: 'drag',
      pointers: 1,
      threshold: 0,
      direction: Hammer.DIRECTION_ALL
    })
  );

  // Add drag init recognizer to hammer.
  hammer.add(
    new Hammer.Press({
      event: 'draginit',
      pointers: 1,
      threshold: 1000,
      time: 0
    })
  );

  // Configure the hammer instance.
  if (isPlainObject(settings.dragHammerSettings)) {
    hammer.set(settings.dragHammerSettings);
  }

  // Bind drag events.
  hammer
    .on('draginit dragstart dragmove', function(e) {
      // Let's activate drag start predicate state.
      if (startPredicateState === startPredicateInactive) {
        startPredicateState = startPredicatePending;
      }

      // If predicate is pending try to resolve it.
      if (startPredicateState === startPredicatePending) {
        startPredicateResult = startPredicate(drag._item, e);
        if (startPredicateResult === true) {
          startPredicateState = startPredicateResolved;
          drag._onStart(e);
        } else if (startPredicateResult === false) {
          startPredicateState = startPredicateRejected;
        }
      }

      // Otherwise if predicate is resolved and drag is active, move the item.
      else if (startPredicateState === startPredicateResolved && drag._isActive) {
        drag._onMove(e);
      }
    })
    .on('dragend dragcancel draginitup', function(e) {
      // Check if the start predicate was resolved during drag.
      var isResolved = startPredicateState === startPredicateResolved;

      // Do final predicate check to allow user to unbind stuff for the current
      // drag procedure within the predicate callback. The return value of this
      // check will have no effect to the state of the predicate.
      startPredicate(drag._item, e);

      // Reset start predicate state.
      startPredicateState = startPredicateInactive;

      // If predicate is resolved and dragging is active, call the end handler.
      if (isResolved && drag._isActive) drag._onEnd(e);
    });

  // Prevent native link/image dragging for the item and it's ancestors.
  element.addEventListener('dragstart', preventDefault, false);
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
 * @param {Object} event
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
    var sortAction = options && options.action === 'swap' ? 'swap' : 'move';

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
  this._hammer.destroy();
  this._item._element.removeEventListener('dragstart', preventDefault, false);
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

  // Hammer event data.
  this._lastEvent = null;
  this._lastScrollEvent = null;

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
  var containerScrollers;
  var i;

  // Get dragged element's scrolling parents.
  scrollers.length = 0;
  getScrollParents(this._item._element, scrollers);

  // If drag container is defined and it's not the same element as grid
  // container then we need to add the grid container and it's scroll parents
  // to the elements which are going to be listener for scroll events.
  if (dragContainer !== gridContainer) {
    containerScrollers = [];
    getScrollParents(gridContainer, containerScrollers);
    containerScrollers.push(gridContainer);
    for (i = 0; i < containerScrollers.length; i++) {
      if (scrollers.indexOf(containerScrollers[i]) < 0) {
        scrollers.push(containerScrollers[i]);
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
 * @param {Object} event
 * @returns {?HTMLElement}
 */
ItemDrag.prototype._getStartPredicateHandle = function(event) {
  var predicate = this._startPredicateData;
  var element = this._item._element;
  var handleElement = element;

  // No handle, no hassle -> let's use the item element as the handle.
  if (!predicate.handle) return handleElement;

  // If there is a specific predicate handle defined, let's try to get it.
  handleElement = (event.changedPointers[0] || 0).target;
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
 * @param {Object} event
 * @returns {Boolean}
 */
ItemDrag.prototype._resolveStartPredicate = function(event) {
  var predicate = this._startPredicateData;
  var pointer = event.changedPointers[0];
  var pageX = (pointer && pointer.pageX) || 0;
  var pageY = (pointer && pointer.pageY) || 0;
  var handleRect;
  var handleLeft;
  var handleTop;
  var handleWidth;
  var handleHeight;

  // If the moved distance is smaller than the threshold distance or there is
  // some delay left, ignore this predicate cycle.
  if (event.distance < predicate.distance || predicate.delay) return;

  // Get handle rect data.
  handleRect = predicate.handleElement.getBoundingClientRect();
  handleLeft = handleRect.left + (window.pageXOffset || 0);
  handleTop = handleRect.top + (window.pageYOffset || 0);
  handleWidth = handleRect.width;
  handleHeight = handleRect.height;

  // Reset predicate data.
  this._resetStartPredicate();

  // If the cursor is still within the handle let's start the drag.
  return (
    handleWidth &&
    handleHeight &&
    pageX >= handleLeft &&
    pageX < handleLeft + handleWidth &&
    pageY >= handleTop &&
    pageY < handleTop + handleHeight
  );
};

/**
 * Finalize start predicate.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {Object} event
 */
ItemDrag.prototype._finishStartPredicate = function(event) {
  var element = this._item._element;

  // Reset predicate.
  this._resetStartPredicate();

  // If the gesture can be interpreted as click let's try to open the element's
  // href url (if it is an anchor element).
  if (isClick(event)) openAnchorHref(element);
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
  if (typeof settings.dragSortPredicate === 'function') {
    result = settings.dragSortPredicate(item, this._lastEvent);
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
  sortAction = result.action === 'swap' ? 'swap' : 'move';

  // If the item was moved within it's current grid.
  if (!isMigration) {
    // Make sure the target index is not the current index.
    if (currentIndex !== targetIndex) {
      // Do the sort.
      (sortAction === 'swap' ? arraySwap : arrayMove)(
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
 * Drag start handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {Object} event
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
  this._lastEvent = event;
  this._container = dragContainer;
  this._containingBlock = containingBlock;
  this._elementClientX = elementRect.left;
  this._elementClientY = elementRect.top;
  this._left = this._gridX = currentLeft;
  this._top = this._gridY = currentTop;

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
 * @param {Object} event
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
  var xDiff = event.deltaX - this._lastEvent.deltaX;
  var yDiff = event.deltaY - this._lastEvent.deltaY;

  // Update last event.
  this._lastEvent = event;

  // Update horizontal position data.
  if (axis !== 'y') {
    this._left += xDiff;
    this._gridX += xDiff;
    this._elementClientX += xDiff;
  }

  // Update vertical position data.
  if (axis !== 'x') {
    this._top += yDiff;
    this._gridY += yDiff;
    this._elementClientY += yDiff;
  }

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
  if (this._getGrid()._settings.dragSort) this._checkOverlapDebounce();
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
  this._getGrid()._emit(eventDragMove, item, this._lastEvent);
};

/**
 * Drag scroll handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {Object} event
 */
ItemDrag.prototype._onScroll = function(event) {
  var item = this._item;

  // If item is not active, reset drag.
  if (!item._isActive) {
    this.stop();
    return;
  }

  // Update last scroll event.
  this._lastScrollEvent = event;

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
  this._getGrid()._emit(eventDragScroll, item, this._lastScrollEvent);
};

/**
 * Drag end handler.
 *
 * @private
 * @memberof ItemDrag.prototype
 * @param {Object} event
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
 * Prevent default.
 *
 * @param {Object} e
 */
function preventDefault(e) {
  if (e.preventDefault) e.preventDefault();
}

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
 * Get element's scroll parents.
 *
 * @param {HTMLElement} element
 * @param {Array} [data]
 * @returns {HTMLElement[]}
 */
function getScrollParents(element, data) {
  var ret = data || [];
  var parent = element.parentNode;

  //
  // If transformed elements leak fixed elements.
  //

  if (hasTransformLeak) {
    // If the element is fixed it can not have any scroll parents.
    if (getStyle(element, 'position') === 'fixed') return ret;

    // Find scroll parents.
    while (parent && parent !== document && parent !== document.documentElement) {
      if (isScrollable(parent)) ret.push(parent);
      parent = getStyle(parent, 'position') === 'fixed' ? null : parent.parentNode;
    }

    // If parent is not fixed element, add window object as the last scroll
    // parent.
    parent !== null && ret.push(window);
    return ret;
  }

  //
  // If fixed elements behave as defined in the W3C specification.
  //

  // Find scroll parents.
  while (parent && parent !== document) {
    // If the currently looped element is fixed ignore all parents that are
    // not transformed.
    if (getStyle(element, 'position') === 'fixed' && !isTransformed(parent)) {
      parent = parent.parentNode;
      continue;
    }

    // Add the parent element to return items if it is scrollable.
    if (isScrollable(parent)) ret.push(parent);

    // Update element and parent references.
    element = parent;
    parent = parent.parentNode;
  }

  // If the last item is the root element, replace it with window. The root
  // element scroll is propagated to the window.
  if (ret[ret.length - 1] === document.documentElement) {
    ret[ret.length - 1] = window;
  }
  // Otherwise add window as the last scroll parent.
  else {
    ret.push(window);
  }

  return ret;
}

/**
 * Check if an element is scrollable.
 *
 * @param {HTMLElement} element
 * @returns {Boolean}
 */
function isScrollable(element) {
  var overflow = getStyle(element, 'overflow');
  if (overflow === 'auto' || overflow === 'scroll') return true;

  overflow = getStyle(element, 'overflow-x');
  if (overflow === 'auto' || overflow === 'scroll') return true;

  overflow = getStyle(element, 'overflow-y');
  if (overflow === 'auto' || overflow === 'scroll') return true;

  return false;
}

/**
 * Check if drag gesture can be interpreted as a click, based on final drag
 * event data.
 *
 * @param {Object} element
 * @returns {Boolean}
 */
function isClick(event) {
  return Math.abs(event.deltaX) < 2 && Math.abs(event.deltaY) < 2 && event.deltaTime < 200;
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

/**
 * Detects if transformed elements leak fixed elements. According W3C
 * transform rendering spec a transformed element should contain even fixed
 * elements. Meaning that fixed elements are positioned relative to the
 * closest transformed ancestor element instead of window. However, not every
 * browser follows the spec (IE and older Firefox). So we need to test it.
 * https://www.w3.org/TR/css3-2d-transforms/#transform-rendering
 *
 * Borrowed from Mezr (v0.6.1):
 * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L607
 */
function checkTransformLeak() {
  // No transforms -> definitely leaks.
  if (!isTransformSupported) return true;

  // No body available -> can't check it.
  if (!document.body) return null;

  // Do the test.
  var elems = [0, 1].map(function(elem, isInner) {
    elem = document.createElement('div');
    elem.style.position = isInner ? 'fixed' : 'absolute';
    elem.style.display = 'block';
    elem.style.visibility = 'hidden';
    elem.style.left = isInner ? '0px' : '1px';
    elem.style[transformProp] = 'none';
    return elem;
  });
  var outer = document.body.appendChild(elems[0]);
  var inner = outer.appendChild(elems[1]);
  var left = inner.getBoundingClientRect().left;
  outer.style[transformProp] = 'scale(1)';
  var ret = left === inner.getBoundingClientRect().left;
  document.body.removeChild(outer);
  return ret;
}

export default ItemDrag;
