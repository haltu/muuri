/**
 * Copyright (c) 2015-present, Haltu Oy
 * Released under the MIT license
 * https://github.com/haltu/muuri/blob/master/LICENSE.md
 */

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
  IS_IOS,
  HAS_PASSIVE_EVENTS,
} from '../constants';
import Grid, {
  DragStartPredicateOptions,
  DragSortPredicateOptions,
  DragSortPredicateResult,
} from '../Grid/Grid';
import Item from './Item';
import AutoScroller from '../AutoScroller/AutoScroller';
import Dragger, {
  DraggerStartEvent,
  DraggerMoveEvent,
  DraggerEndEvent,
  DraggerCancelEvent,
  DraggerAnyEvent,
} from '../Dragger/Dragger';
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
import isFunction from '../utils/isFunction';
import normalizeArrayIndex from '../utils/normalizeArrayIndex';
import removeClass from '../utils/removeClass';
import { ScrollEvent, Rect, RectExtended, Writeable } from '../types';

const START_PREDICATE_INACTIVE = 0;
const START_PREDICATE_PENDING = 1;
const START_PREDICATE_RESOLVED = 2;
const SCROLL_LISTENER_OPTIONS = HAS_PASSIVE_EVENTS ? { capture: true, passive: true } : true;
const RECT_A: Rect = { left: 0, top: 0, width: 0, height: 0 };
const RECT_B: Rect = { left: 0, top: 0, width: 0, height: 0 };

/**
 * Default drag start predicate handler that handles anchor elements
 * gracefully. The return value of this function defines if the drag is
 * started, rejected or pending. When true is returned the dragging is started
 * and when false is returned the dragging is rejected. If nothing is returned
 * the predicate will be called again on the next drag movement.
 *
 * @param {Item} item
 * @param {Object} event
 * @param {Object} [options]
 *   - An optional options object which can be used to pass the predicate
 *     it's options manually. By default the predicate retrieves the options
 *     from the grid's settings.
 * @returns {(boolean|undefined)}
 */
const defaultStartPredicate = function (
  item: Item,
  event: DraggerAnyEvent,
  options?: DragStartPredicateOptions
) {
  if (event.isFinal) return;

  const drag = item._drag as ItemDrag;

  // Reject the predicate if left button is not pressed on mouse during first
  // event.
  if (event.isFirst && (event.srcEvent as PointerEvent).button) {
    drag._resetDefaultStartPredicate();
    return false;
  }

  // If the start event is trusted, non-cancelable and it's default action has
  // not been prevented it is in most cases a sign that the gesture would be
  // cancelled anyways right after it has started (e.g. starting drag while
  // the page is scrolling). So let's reject the predicate in this case.
  if (
    !IS_IOS &&
    event.isFirst &&
    event.srcEvent.isTrusted === true &&
    event.srcEvent.defaultPrevented === false &&
    event.srcEvent.cancelable === false
  ) {
    drag._resetDefaultStartPredicate();
    return false;
  }

  // Setup predicate data from options if not already set.
  let predicate = drag._startPredicateData;
  if (!predicate) {
    predicate = drag._startPredicateData = { distance: 0, delay: 0 };
    const { dragStartPredicate } = (item.getGrid() as Grid).settings;
    const config = options || dragStartPredicate;
    if (typeof config == 'object') {
      predicate.distance = Math.max(config.distance || 0, 0);
      predicate.delay = Math.max(config.delay || 0, 0);
    }
  }

  // If delay is defined let's keep track of the latest event and initiate
  // delay if it has not been done yet.
  if (predicate.delay) {
    predicate.event = event;
    if (!predicate.delayTimer) {
      predicate.delayTimer = window.setTimeout(function () {
        // If predicate has changed there's nothing to do here.
        if (drag._startPredicateData !== predicate) return;

        // If drag has been destroyed, let's clean things up and exit.
        if (!drag.item) {
          drag._resetDefaultStartPredicate();
          return;
        }

        if (predicate) {
          // Reset the delay.
          predicate.delay = 0;

          // Let's try to resolve the predicate.
          if (
            drag._startPredicateState === START_PREDICATE_PENDING &&
            predicate.event &&
            predicate.event.distance >= predicate.distance
          ) {
            drag._resetDefaultStartPredicate();
            drag._startPredicateState = START_PREDICATE_RESOLVED;
            drag._onStart(predicate.event as DraggerStartEvent | DraggerMoveEvent);
          }
        }
      }, predicate.delay);
    }
    return;
  }

  // Keep the predicate in pending state if the distance threshold is not
  // exceeded.
  if (event.distance < predicate.distance) return;

  // Resolve the predicate.
  return true;
};

const getTargetGrid = function (item: Item, threshold: number) {
  const itemGrid = item.getGrid() as Grid;
  const { dragSort } = itemGrid.settings;
  const grids = dragSort === true ? [itemGrid] : isFunction(dragSort) ? dragSort(item) : undefined;

  let target: Grid | null = null;

  // Return immediately if there are no grids.
  if (!grids || !Array.isArray(grids) || !grids.length) {
    return target;
  }

  const itemRect = RECT_A;
  const targetRect = RECT_B;

  let bestScore = -1;
  let gridScore = 0;
  let grid: Grid;
  let container: HTMLElement | Document | null = null;
  let containerRect: RectExtended;
  let left = 0;
  let top = 0;
  let right = 0;
  let bottom = 0;
  let i = 0;

  // Set up item rect data for comparing against grids.
  const drag = item._drag as ItemDrag;
  itemRect.width = item.width;
  itemRect.height = item.height;
  itemRect.left = drag._clientX;
  itemRect.top = drag._clientY;

  // Loop through the grids and get the best match.
  for (; i < grids.length; i++) {
    grid = grids[i];

    // Filter out all destroyed grids.
    if (grid.isDestroyed()) continue;

    // Compute the grid's client rect an clamp the initial boundaries to
    // viewport dimensions.
    grid._updateBoundingRect();
    left = Math.max(0, grid._rect.left);
    top = Math.max(0, grid._rect.top);
    right = Math.min(window.innerWidth, grid._rect.right);
    bottom = Math.min(window.innerHeight, grid._rect.bottom);

    // The grid might be inside one or more elements that clip it's visibility
    // (e.g overflow scroll/hidden) so we want to find out the visible portion
    // of the grid in the viewport and use that in our calculations.
    container = grid.element.parentNode as HTMLElement | Document | null;
    while (
      container &&
      container !== document &&
      container !== document.documentElement &&
      container !== document.body
    ) {
      if (container.getRootNode && container instanceof DocumentFragment) {
        container = (container.getRootNode() as ShadowRoot).host as HTMLElement;
        continue;
      }

      if (getStyle(container as HTMLElement, 'overflow') !== 'visible') {
        containerRect = (container as HTMLElement).getBoundingClientRect();
        left = Math.max(left, containerRect.left);
        top = Math.max(top, containerRect.top);
        right = Math.min(right, containerRect.right);
        bottom = Math.min(bottom, containerRect.bottom);
      }

      if (getStyle(container as HTMLElement, 'position') === 'fixed') {
        break;
      }

      container = (container as HTMLElement).parentNode as HTMLElement | Document | null;
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
      target = grid as any as Grid;
    }
  }

  return target;
};

/**
 * Default drag sort predicate.
 *
 * @param {Item} item
 * @param {Object} [options]
 * @param {number} [options.threshold=50]
 * @param {string} [options.action='move']
 * @returns {?Object}
 */
const defaultSortPredicate = function (
  item: Item,
  options?: DragSortPredicateOptions
): DragSortPredicateResult {
  const drag = item._drag as ItemDrag;

  const sortAction = (options && options.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE) as
    | typeof ACTION_MOVE
    | typeof ACTION_SWAP;

  const migrateAction = (
    options && options.migrateAction === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE
  ) as typeof ACTION_MOVE | typeof ACTION_SWAP;

  // Sort threshold must be a positive number capped to a max value of 100. If
  // that's not the case this function will not work correctly. So let's clamp
  // the threshold just in case.
  const sortThreshold = Math.min(
    Math.max(options && typeof options.threshold === 'number' ? options.threshold : 50, 1),
    100
  );

  // Get the target grid.
  const grid = getTargetGrid(item, sortThreshold);
  if (!grid) return null;

  const isMigration = item.getGrid() !== grid;
  const itemRect = RECT_A;
  const targetRect = RECT_B;

  // Set item rect for comparing against grid items.
  itemRect.width = item.width;
  itemRect.height = item.height;
  if (isMigration) {
    grid._updateBorders(true, false, true, false);
    itemRect.left = drag._clientX - (grid._rect.left + grid._borderLeft);
    itemRect.top = drag._clientY - (grid._rect.top + grid._borderTop);
  } else {
    itemRect.left = drag._translateX - item._containerDiffX + item.marginLeft;
    itemRect.top = drag._translateY - item._containerDiffY + item.marginTop;
  }

  let matchScore = 0;
  let matchIndex = -1;
  let hasValidTargets = false;

  // Loop through the target grid items and try to find the best match.
  for (let i = 0; i < grid.items.length; i++) {
    const target = grid.items[i];

    // If the target item is not active or the target item is the dragged
    // item let's skip to the next item.
    if (!target.isActive() || target === item) {
      continue;
    }

    // Mark the grid as having valid target items.
    hasValidTargets = true;

    // Calculate the target's overlap score with the dragged item.
    targetRect.width = target.width;
    targetRect.height = target.height;
    targetRect.left = target.left + target.marginLeft;
    targetRect.top = target.top + target.marginTop;
    const score = getIntersectionScore(itemRect, targetRect);

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
    return {
      grid: grid as any as Grid,
      index: matchIndex,
      action: isMigration ? migrateAction : sortAction,
    };
  }

  return null;
};

/**
 * Bind touch interaction to an item.
 *
 * @class
 * @param {Item} item
 */
export default class ItemDrag {
  readonly item: Item | null;
  readonly dragger: Dragger;
  _originGridId: number;
  _isMigrated: boolean;
  _isActive: boolean;
  _isStarted: boolean;
  _startPredicateState: number;
  _startPredicateData: {
    distance: number;
    delay: number;
    event?: DraggerAnyEvent;
    delayTimer?: number;
  } | null;
  _isSortNeeded: boolean;
  _sortTimer?: number;
  _blockedSortIndex: number | null;
  _sortX1: number;
  _sortX2: number;
  _sortY1: number;
  _sortY2: number;
  _container: HTMLElement | null;
  _containingBlock: HTMLElement | Document | null;
  _dragStartEvent: DraggerStartEvent | DraggerMoveEvent | null;
  _dragEndEvent: DraggerEndEvent | DraggerCancelEvent | null;
  _dragMoveEvent: DraggerMoveEvent | null;
  _dragPrevMoveEvent: DraggerMoveEvent | null;
  _scrollEvent: ScrollEvent | null;
  _translateX: number;
  _translateY: number;
  _clientX: number;
  _clientY: number;
  _scrollDiffX: number;
  _scrollDiffY: number;
  _moveDiffX: number;
  _moveDiffY: number;
  _containerDiffX: number;
  _containerDiffY: number;

  constructor(item: Item) {
    const element = item.element;
    const grid = item.getGrid() as Grid;
    const { settings } = grid;

    this.item = item;
    this._originGridId = grid.id;
    this._isMigrated = false;
    this._isActive = false;
    this._isStarted = false;
    this._startPredicateState = START_PREDICATE_INACTIVE;
    this._startPredicateData = null;

    // Data for drag sort predicate heuristics.
    this._isSortNeeded = false;
    this._sortTimer = undefined;
    this._blockedSortIndex = null;
    this._sortX1 = 0;
    this._sortX2 = 0;
    this._sortY1 = 0;
    this._sortY2 = 0;

    // The dragged item's container element and containing block.
    this._container = null;
    this._containingBlock = null;

    // Drag/scroll event data.
    this._dragStartEvent = null;
    this._dragEndEvent = null;
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
    // Note that these are only used for the start phase to store the initial
    // container diff between the item's grid element and drag container
    // element. To get always get the latest applied container diff you should
    // read it from item._containerDiffX/Y.
    this._containerDiffX = 0;
    this._containerDiffY = 0;

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

    // Init dragger.
    this.dragger = new Dragger(
      (typeof settings.dragHandle === 'string' && element.querySelector(settings.dragHandle)) ||
        element,
      settings.dragCssProps,
      settings.dragEventListenerOptions
    );
    this.dragger.on('start', this._preStartCheck);
    this.dragger.on('move', this._preStartCheck);
    this.dragger.on('cancel', this._preEndCheck);
    this.dragger.on('end', this._preEndCheck);
  }

  static autoScroll = new AutoScroller();
  static defaultStartPredicate = defaultStartPredicate;
  static defaultSortPredicate = defaultSortPredicate;

  /**
   * Is item being dragged currently?
   *
   * @public
   * @returns {boolean}
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Get Grid instance.
   *
   * @public
   * @returns {?Grid}
   */
  getOriginGrid() {
    return GRID_INSTANCES.get(this._originGridId) || null;
  }

  /**
   * Abort dragging and reset drag data.
   *
   * @public
   */
  stop() {
    if (!this.item || !this.isActive()) return;

    // If the item has been dropped into another grid, finish up the process and
    // and don't go any further here. The _finishMigration() method will destroy
    // this instance which in turn will
    if (this._isMigrated) {
      this._finishMigration();
      return;
    }

    const { item } = this;

    // Stop auto-scroll.
    ItemDrag.autoScroll.removeItem(item as any as Item);

    // Cancel queued ticks.
    cancelDragStartTick(item.id);
    cancelDragMoveTick(item.id);
    cancelDragScrollTick(item.id);

    // Cancel sort procedure.
    this._cancelSort();

    if (this._isStarted) {
      const element = item.element;
      const grid = item.getGrid() as Grid;
      const { itemDraggingClass } = grid.settings;

      // Remove scroll listeners.
      this._unbindScrollHandler();

      // Append item element to it's current grid's container element if it's
      // not there already. Also make sure the translate values are adjusted to
      // account for the DOM shift.
      if (element.parentNode !== grid.element) {
        grid.element.appendChild(element);
        item._setTranslate(
          this._translateX - item._containerDiffX,
          this._translateY - item._containerDiffY
        );
        item._containerDiffX = this._containerDiffX = 0;
        item._containerDiffY = this._containerDiffY = 0;

        // We need to do forced reflow to make sure the dragging class is
        // removed gracefully.
        // eslint-disable-next-line
        if (itemDraggingClass) element.clientWidth;
      }

      // Remove dragging class.
      removeClass(element, itemDraggingClass);
    }

    // Reset drag data.
    this._reset();
  }

  /**
   * Manually trigger drag sort. This is only needed for special edge cases where
   * e.g. you have disabled sort and want to trigger a sort right after enabling
   * it (and don't want to wait for the next move/scroll event).
   *
   * @public
   * @param {boolean} [force=false]
   */
  sort(force = false) {
    if (this.item && this.isActive() && this.item.isActive() && this._dragMoveEvent) {
      if (force) {
        this._handleSort();
      } else {
        addDragSortTick(this.item.id, this._handleSort);
      }
    }
  }

  /**
   * Destroy instance.
   *
   * @public
   */
  destroy() {
    if (!this.item) return;
    // It's important to always do the destroying as if migration did not happen
    // because otherwise the item's drag handler might be recreated when there's
    // no need.
    this._isMigrated = false;
    this.stop();
    this.dragger.destroy();
    (this as Writeable<this>).item = null;
  }

  /**
   * Start predicate.
   *
   * @param {Item} item
   * @param {Object} event
   * @returns {(boolean|undefined)}
   */
  _startPredicate(item: Item, event: DraggerAnyEvent) {
    const { dragStartPredicate } = (item.getGrid() as Grid).settings;
    return isFunction(dragStartPredicate)
      ? dragStartPredicate(item, event)
      : ItemDrag.defaultStartPredicate(item, event);
  }

  /**
   * Setup/reset drag data.
   */
  _reset() {
    this._isActive = false;
    this._isStarted = false;
    this._container = null;
    this._containingBlock = null;
    this._dragStartEvent = null;
    this._dragEndEvent = null;
    this._dragMoveEvent = null;
    this._dragPrevMoveEvent = null;
    this._scrollEvent = null;
    this._translateX = 0;
    this._translateY = 0;
    this._clientX = 0;
    this._clientY = 0;
    this._scrollDiffX = 0;
    this._scrollDiffY = 0;
    this._moveDiffX = 0;
    this._moveDiffY = 0;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
  }

  /**
   * Bind drag scroll handlers.
   */
  _bindScrollHandler() {
    window.addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
  }

  /**
   * Unbind currently bound drag scroll handlers.
   */
  _unbindScrollHandler() {
    window.removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
  }

  /**
   * Reset drag sort heuristics.
   *
   * @param {number} x
   * @param {number} y
   */
  _resetHeuristics(x: number, y: number) {
    this._blockedSortIndex = null;
    this._sortX1 = this._sortX2 = x;
    this._sortY1 = this._sortY2 = y;
  }

  /**
   * Run heuristics and return true if overlap check can be performed, and false
   * if it can not.
   *
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  _checkHeuristics(x: number, y: number) {
    if (!this.item) return false;

    const { settings } = this.item.getGrid() as Grid;
    const { minDragDistance, minBounceBackAngle } = settings.dragSortHeuristics;

    // Skip heuristics if not needed.
    if (minDragDistance <= 0) {
      this._blockedSortIndex = null;
      return true;
    }

    const diffX = x - this._sortX2;
    const diffY = y - this._sortY2;

    // If we can't do proper bounce back check make sure that the blocked index
    // is not set.
    const canCheckBounceBack = minDragDistance > 3 && minBounceBackAngle > 0;
    if (!canCheckBounceBack) {
      this._blockedSortIndex = null;
    }

    if (Math.abs(diffX) > minDragDistance || Math.abs(diffY) > minDragDistance) {
      // Reset blocked index if angle changed enough. This check requires a
      // minimum value of 3 for minDragDistance to function properly.
      if (canCheckBounceBack) {
        const angle = Math.atan2(diffX, diffY);
        const prevAngle = Math.atan2(this._sortX2 - this._sortX1, this._sortY2 - this._sortY1);
        const deltaAngle = Math.atan2(Math.sin(angle - prevAngle), Math.cos(angle - prevAngle));
        if (Math.abs(deltaAngle) > minBounceBackAngle) {
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
  }

  /**
   * Reset default drag start predicate data.
   */
  _resetDefaultStartPredicate() {
    const { _startPredicateData: predicate } = this;
    if (predicate) {
      if (predicate.delayTimer) {
        predicate.delayTimer = void window.clearTimeout(predicate.delayTimer);
      }
      this._startPredicateData = null;
    }
  }

  /**
   * Handle the sorting procedure. Manage drag sort heuristics/interval and
   * check overlap when necessary.
   */
  _handleSort() {
    if (!this.item || !this.isActive()) return;

    const { item } = this;
    const { dragSort, dragSortHeuristics, dragAutoScroll } = (item.getGrid() as Grid).settings;

    // No sorting when drag sort is disabled. Also, account for the scenario
    // where dragSort is temporarily disabled during drag procedure so we need
    // to reset sort timer heuristics state too.
    if (
      !dragSort ||
      (!dragAutoScroll.sortDuringScroll && ItemDrag.autoScroll.isItemScrolling(item as any as Item))
    ) {
      this._sortX1 = this._sortX2 = this._translateX - item._containerDiffX;
      this._sortY1 = this._sortY2 = this._translateY - item._containerDiffY;
      // We set this to true intentionally so that overlap check would be
      // triggered as soon as possible after sort becomes enabled again.
      this._isSortNeeded = true;
      if (this._sortTimer !== undefined) {
        this._sortTimer = void window.clearTimeout(this._sortTimer);
      }
      return;
    }

    // If sorting is enabled we always need to run the heuristics check to keep
    // the tracked coordinates updated. We also allow an exception when the sort
    // timer is finished because the heuristics are intended to prevent overlap
    // checks based on the dragged element's immediate movement and a delayed
    // overlap check is valid if it comes through, because it was valid when it
    // was invoked.
    const shouldSort = this._checkHeuristics(
      this._translateX - item._containerDiffX,
      this._translateY - item._containerDiffY
    );
    if (!this._isSortNeeded && !shouldSort) return;

    const sortInterval = dragSortHeuristics.sortInterval;
    if (sortInterval <= 0 || this._isSortNeeded) {
      this._isSortNeeded = false;
      if (this._sortTimer !== undefined) {
        this._sortTimer = void window.clearTimeout(this._sortTimer);
      }
      this._checkOverlap();
    } else if (this._sortTimer === undefined) {
      this._sortTimer = window.setTimeout(this._handleSortDelayed, sortInterval);
    }
  }

  /**
   * Delayed sort handler.
   */
  _handleSortDelayed() {
    if (!this.item) return;
    this._isSortNeeded = true;
    this._sortTimer = undefined;
    addDragSortTick(this.item.id, this._handleSort);
  }

  /**
   * Cancel and reset sort procedure.
   */
  _cancelSort() {
    if (!this.item) return;
    this._isSortNeeded = false;
    if (this._sortTimer !== undefined) {
      this._sortTimer = void window.clearTimeout(this._sortTimer);
    }
    cancelDragSortTick(this.item.id);
  }

  /**
   * Handle the ending of the drag procedure for sorting.
   */
  _finishSort() {
    if (!this.item) return;
    const { dragSort } = (this.item.getGrid() as Grid).settings;
    const needsFinalCheck = dragSort && (this._isSortNeeded || this._sortTimer !== undefined);
    this._cancelSort();
    if (needsFinalCheck) this._checkOverlap();
    if (dragSort) this._checkOverlap(true);
  }

  /**
   * Check (during drag) if an item is overlapping other items based on
   * the configuration layout the items.
   *
   * @param {boolean} [isDrop=false]
   */
  _checkOverlap(isDrop = false) {
    if (!this.item || !this.isActive()) return;

    const { item } = this;
    const element = item.element;
    const currentGrid = item.getGrid() as Grid;
    const { settings } = currentGrid;

    // Get overlap check result.
    let result: DragSortPredicateResult = null;
    if (isFunction(settings.dragSortPredicate)) {
      result = settings.dragSortPredicate(
        item as any as Item,
        (isDrop ? this._dragEndEvent : this._dragMoveEvent) as
          | DraggerMoveEvent
          | DraggerCancelEvent
          | DraggerEndEvent
      );
    } else if (!isDrop) {
      result = ItemDrag.defaultSortPredicate(item as any as Item, settings.dragSortPredicate);
    }

    // Let's make sure the result object has a valid index before going further.
    if (!result || typeof result.index !== 'number') return;

    const sortAction = result.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
    const targetGrid = result.grid || currentGrid;
    const isMigration = currentGrid !== targetGrid;
    const currentIndex = currentGrid.items.indexOf(item as any as Item);
    const targetIndex = normalizeArrayIndex(
      targetGrid.items,
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
          currentGrid.items,
          currentIndex,
          targetIndex
        );

        // Emit move event.
        if (currentGrid._hasListeners(EVENT_MOVE)) {
          currentGrid._emit(EVENT_MOVE, {
            item: item as any as Item,
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
      const targetItem = targetGrid.items[targetIndex];
      const targetSettings = targetGrid.settings;

      // Emit beforeSend event.
      if (currentGrid._hasListeners(EVENT_BEFORE_SEND)) {
        currentGrid._emit(EVENT_BEFORE_SEND, {
          item: item as any as Item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex,
        });
      }

      // Emit beforeReceive event.
      if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
        targetGrid._emit(EVENT_BEFORE_RECEIVE, {
          item: item as any as Item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex,
        });
      }

      // If the drag is not active anymore after the events or either of the
      // grids got destroyed during the emitted events, let's abort the process.
      if (!this.isActive() || currentGrid.isDestroyed() || targetGrid.isDestroyed()) {
        return;
      }

      // Update item's grid id reference.
      item._gridId = targetGrid.id;

      // Update migrating indicator.
      this._isMigrated = item._gridId !== this._originGridId;

      // Move item instance from current grid to target grid.
      currentGrid.items.splice(currentIndex, 1);
      arrayInsert(targetGrid.items, item, targetIndex);

      // Reset sort data.
      item._sortData = null;

      // Get the next drag container.
      const currentDragContainer = this._container as HTMLElement;
      const currentContainingBlock = this._containingBlock as HTMLElement | Document;
      const targetDragContainer = targetSettings.dragContainer || targetGrid.element;
      const targetContainingBlock = getContainingBlock(targetDragContainer);

      // Update item's container offset so we can keep computing the item's
      // current translate position relative to it's current grid element. It's
      // important to keep this synced so that we can feed correct data to the
      // drag sort heuristics and can easily compute the item's position within
      // it's current grid element.
      let offsetDiff = getOffsetDiff(targetContainingBlock, getContainingBlock(targetGrid.element));
      item._containerDiffX = this._containerDiffX = offsetDiff.left;
      item._containerDiffY = this._containerDiffY = offsetDiff.top;

      // If drag container changed let's update containing block and move the
      // element to it's new container.
      if (targetDragContainer !== currentDragContainer) {
        offsetDiff = getOffsetDiff(currentContainingBlock, targetContainingBlock);

        this._container = targetDragContainer;
        this._containingBlock = targetContainingBlock;
        this._translateX -= offsetDiff.left;
        this._translateY -= offsetDiff.top;

        targetDragContainer.appendChild(element);
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
      if (item.isActive()) {
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

      // Update placeholder class.
      item._dragPlaceholder.updateClassName(targetSettings.itemPlaceholderClass);

      // Update item's cached dimensions.
      // NOTE: This should be only done if there's a chance that the DOM writes
      // have caused this to change. Maybe this is not needed always?
      item._updateDimensions();

      // Emit send event.
      if (currentGrid._hasListeners(EVENT_SEND)) {
        currentGrid._emit(EVENT_SEND, {
          item: item as any as Item,
          fromGrid: currentGrid as any as Grid,
          fromIndex: currentIndex,
          toGrid: targetGrid as any as Grid,
          toIndex: targetIndex,
        });
      }

      // Emit receive event.
      if (targetGrid._hasListeners(EVENT_RECEIVE)) {
        targetGrid._emit(EVENT_RECEIVE, {
          item: item as any as Item,
          fromGrid: currentGrid as any as Grid,
          fromIndex: currentIndex,
          toGrid: targetGrid as any as Grid,
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
        if (targetGrid.items.indexOf(targetItem) > -1) {
          targetGrid.send(targetItem, currentGrid as any as Grid, currentIndex, {
            appendTo: currentDragContainer || document.body,
            layoutSender: false,
            layoutReceiver: false,
          });
        }
      }

      // Layout both grids.
      currentGrid.layout();
      targetGrid.layout();
    }
  }

  /**
   * If item is dragged into another grid, finish the migration process.
   */
  _finishMigration() {
    if (!this.item) return;
    const { item } = this;
    const { dragEnabled } = (item.getGrid() as Grid).settings;

    this.destroy();

    item._drag = dragEnabled ? new ItemDrag(item as any as Item) : null;
    item._dragRelease.start();
  }

  /**
   * Drag pre-start handler.
   *
   * @param {Object} event
   */
  _preStartCheck(event: DraggerStartEvent | DraggerMoveEvent) {
    // Let's activate drag start predicate state.
    if (this._startPredicateState === START_PREDICATE_INACTIVE) {
      this._startPredicateState = START_PREDICATE_PENDING;
    }

    // If predicate is pending try to resolve it.
    if (this._startPredicateState === START_PREDICATE_PENDING) {
      const shouldStart = this._startPredicate(this.item as any as Item, event);
      if (shouldStart === true) {
        this._startPredicateState = START_PREDICATE_RESOLVED;
        this._onStart(event);
      } else if (shouldStart === false) {
        this._startPredicateState = START_PREDICATE_INACTIVE;
        this.dragger.reset();
      }
    }

    // Otherwise if predicate is resolved and drag is active, move the item.
    else if (this._startPredicateState === START_PREDICATE_RESOLVED && this.isActive()) {
      this._onMove(event as DraggerMoveEvent);
    }
  }

  /**
   * Drag pre-end handler.
   *
   * @param {Object} event
   */
  _preEndCheck(event: DraggerEndEvent | DraggerCancelEvent) {
    const isResolved = this._startPredicateState === START_PREDICATE_RESOLVED;

    // Do final predicate check to allow user to unbind stuff for the current
    // drag procedure within the predicate callback. The return value of this
    // check will have no effect to the state of the predicate.
    this._startPredicate(this.item as any as Item, event);

    // Let's automatically reset the default start predicate (even if it is not
    // used) to make sure it is ready for next round.
    this._resetDefaultStartPredicate();

    this._startPredicateState = START_PREDICATE_INACTIVE;

    if (!isResolved || !this.isActive()) return;

    if (this._isStarted) {
      this._onEnd(event);
    } else {
      this.stop();
    }
  }

  /**
   * Drag start handler.
   *
   * @param {Object} event
   */
  _onStart(event: DraggerStartEvent | DraggerMoveEvent) {
    if (!this.item || !this.item.isActive()) return;

    this._isActive = true;
    this._dragStartEvent = event;
    ItemDrag.autoScroll.addItem(this.item as any as Item, this._translateX, this._translateY);
    addDragStartTick(this.item.id, this._prepareStart, this._applyStart);
  }

  /**
   * Prepare the start of a drag procedure.
   */
  _prepareStart() {
    if (!this.item || !this.isActive() || !this.item.isActive()) return;

    const { item } = this;
    const element = item.element;
    const grid = item.getGrid() as Grid;
    const dragContainer = grid.settings.dragContainer || grid.element;
    const containingBlock = getContainingBlock(dragContainer);
    const translate = item._getTranslate();
    const elementRect = element.getBoundingClientRect();

    this._container = dragContainer;
    this._containingBlock = containingBlock;
    this._clientX = elementRect.left;
    this._clientY = elementRect.top;
    this._translateX = translate.x;
    this._translateY = translate.y;
    this._scrollDiffX = this._scrollDiffY = 0;
    this._moveDiffX = this._moveDiffY = 0;
    this._containerDiffX = this._containerDiffY = 0;

    if (dragContainer !== grid.element) {
      const { left, top } = getOffsetDiff(containingBlock, grid.element);
      this._containerDiffX = left;
      this._containerDiffY = top;
    }

    this._resetHeuristics(
      this._translateX - item._containerDiffX,
      this._translateY - item._containerDiffY
    );
  }

  /**
   * Apply the start of a drag procedure.
   */
  _applyStart() {
    if (!this.item || !this.isActive()) return;

    const { item } = this;
    if (!item.isActive()) return;

    if (item.isPositioning()) {
      item._layout.stop(true, this._translateX, this._translateY);
    }

    const migrate = item._migrate;
    if (migrate.isActive()) {
      this._translateX -= item._containerDiffX;
      this._translateY -= item._containerDiffY;
      migrate.stop(true, this._translateX, this._translateY);
    }

    const release = item._dragRelease;
    if (item.isReleasing()) release.reset();

    const grid = item.getGrid() as Grid;
    const element = item.element;

    if (grid.settings.dragPlaceholder.enabled) {
      item._dragPlaceholder.create();
    }

    this._isStarted = true;

    if (this._dragStartEvent) {
      grid._emit(EVENT_DRAG_INIT, item as any as Item, this._dragStartEvent);
    }

    // If the dragged element is not a child of the drag container we need to
    // append the element inside the correct container, setup the actual drag
    // position data and adjust the element's translate values to account for
    // the DOM position shift.
    if (element.parentNode !== this._container) {
      this._translateX += this._containerDiffX;
      this._translateY += this._containerDiffY;
      (this._container as HTMLElement).appendChild(element);
      item._setTranslate(this._translateX, this._translateY);
    }

    // Make sure item's container diff is synced at this point.
    item._containerDiffX = this._containerDiffX;
    item._containerDiffY = this._containerDiffY;

    addClass(element, grid.settings.itemDraggingClass);
    this._bindScrollHandler();

    if (this._dragStartEvent) {
      grid._emit(EVENT_DRAG_START, item as any as Item, this._dragStartEvent);
    }
  }

  /**
   * Drag move handler.
   *
   * @param {Object} event
   */
  _onMove(event: DraggerMoveEvent) {
    if (!this.item) return;

    if (!this.item.isActive()) {
      this.stop();
      return;
    }

    const itemId = this.item.id;
    this._dragMoveEvent = event;
    addDragMoveTick(itemId, this._prepareMove, this._applyMove);
    addDragSortTick(itemId, this._handleSort);
  }

  /**
   * Prepare dragged item for moving.
   */
  _prepareMove() {
    if (!this.item || !this.isActive() || !this.item.isActive()) return;

    const { dragAxis } = (this.item.getGrid() as Grid).settings;
    const nextEvent = this._dragMoveEvent as DraggerStartEvent | DraggerMoveEvent;
    const prevEvent = (this._dragPrevMoveEvent || this._dragStartEvent || nextEvent) as
      | DraggerStartEvent
      | DraggerMoveEvent;

    // Update horizontal position data.
    if (dragAxis !== 'y') {
      const moveDiffX = nextEvent.clientX - prevEvent.clientX;
      this._translateX = this._translateX - this._moveDiffX + moveDiffX;
      this._clientX = this._clientX - this._moveDiffX + moveDiffX;
      this._moveDiffX = moveDiffX;
    }

    // Update vertical position data.
    if (dragAxis !== 'x') {
      const moveDiffY = nextEvent.clientY - prevEvent.clientY;
      this._translateY = this._translateY - this._moveDiffY + moveDiffY;
      this._clientY = this._clientY - this._moveDiffY + moveDiffY;
      this._moveDiffY = moveDiffY;
    }

    this._dragPrevMoveEvent = nextEvent as DraggerMoveEvent;
  }

  /**
   * Apply movement to dragged item.
   */
  _applyMove() {
    if (!this.item || !this.isActive() || !this.item.isActive()) return;

    const { item } = this;
    const grid = item.getGrid() as Grid;

    this._moveDiffX = this._moveDiffY = 0;
    item._setTranslate(this._translateX, this._translateY);
    if (this._dragMoveEvent) {
      grid._emit(EVENT_DRAG_MOVE, item as any as Item, this._dragMoveEvent);
    }
    ItemDrag.autoScroll.updateItem(item as any as Item, this._translateX, this._translateY);
  }

  /**
   * Drag scroll handler.
   *
   * @param {Object} event
   */
  _onScroll(event: Event) {
    if (!this.item) return;

    if (!this.item.isActive()) {
      this.stop();
      return;
    }

    const itemId = this.item.id;
    this._scrollEvent = event as ScrollEvent;
    addDragScrollTick(itemId, this._prepareScroll, this._applyScroll);
    addDragSortTick(itemId, this._handleSort);
  }

  /**
   * Prepare dragged item for scrolling.
   */
  _prepareScroll() {
    if (!this.item || !this.isActive() || !this.item.isActive()) return;

    const { item } = this;
    const grid = item.getGrid() as Grid;

    // Update container diff.
    if (this._container !== grid.element) {
      const { left, top } = getOffsetDiff(
        this._containingBlock as HTMLElement | Document,
        grid.element
      );
      item._containerDiffX = this._containerDiffX = left;
      item._containerDiffY = this._containerDiffY = top;
    }

    const { dragAxis } = grid.settings;
    const { left, top } = item.element.getBoundingClientRect();

    // Update horizontal position data.
    if (dragAxis !== 'y') {
      const scrollDiffX = this._clientX - this._moveDiffX - this._scrollDiffX - left;
      this._translateX = this._translateX - this._scrollDiffX + scrollDiffX;
      this._scrollDiffX = scrollDiffX;
    }

    // Update vertical position data.
    if (dragAxis !== 'x') {
      const scrollDiffY = this._clientY - this._moveDiffY - this._scrollDiffY - top;
      this._translateY = this._translateY - this._scrollDiffY + scrollDiffY;
      this._scrollDiffY = scrollDiffY;
    }
  }

  /**
   * Apply scroll to dragged item.
   */
  _applyScroll() {
    if (!this.item || !this.isActive() || !this.item.isActive()) return;

    const { item } = this;
    const grid = item.getGrid() as Grid;

    this._scrollDiffX = this._scrollDiffY = 0;
    item._setTranslate(this._translateX, this._translateY);
    if (this._scrollEvent) {
      grid._emit(EVENT_DRAG_SCROLL, item as any as Item, this._scrollEvent);
    }
  }

  /**
   * Drag end handler.
   *
   * @param {Object} event
   */
  _onEnd(event: DraggerEndEvent | DraggerCancelEvent) {
    if (!this.item) return;

    // If item is not active, reset drag.
    const { item } = this;
    if (!item.isActive()) {
      this.stop();
      return;
    }

    const grid = item.getGrid() as Grid;

    this._dragEndEvent = event;

    // Cancel queued ticks.
    cancelDragStartTick(item.id);
    cancelDragMoveTick(item.id);
    cancelDragScrollTick(item.id);

    // Finish sort procedure (does final overlap check if needed).
    this._finishSort();

    // Remove scroll listeners.
    this._unbindScrollHandler();

    // Reset drag data.
    this._reset();

    // Remove dragging class from element.
    removeClass(item.element, grid.settings.itemDraggingClass);

    // Stop auto-scroll.
    ItemDrag.autoScroll.removeItem(item as any as Item);

    // Emit dragEnd event.
    grid._emit(EVENT_DRAG_END, item as any as Item, event);

    // Finish up the migration process or start the release process.
    this._isMigrated ? this._finishMigration() : item._dragRelease.start();
  }
}
