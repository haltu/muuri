import {
  eventBeforeSend,
  eventDragInit,
  eventDragReleaseEnd,
  eventLayoutStart
} from '../shared.js';
import ItemAnimate from '../Item/ItemAnimate.js';
import addClass from '../utils/addClass.js';
import setStyles from '../utils/setStyles';
import getTranslateString from '../utils/getTranslateString.js';
import getTranslate from '../utils/getTranslate.js';

/**
 * ItemDragPlaceholder
 * *******************
 */

function ItemDragPlaceholder(item) {
  var inst = this;
  var grid = item.getGrid();

  inst._grid = inst._nextGrid = grid;
  inst._item = item;

  inst._onLayout = function() {
    inst.layout();
  };

  inst._onDrag = function(item) {
    // Create placeholder if necessary.
    if (!inst._element && item._id === inst._item._id) {
      inst.create();
    }
  };

  inst._onDragEnd = function(item) {
    if (item._id === inst._item._id) {
      // Remove DOM node.
      inst._element.parentNode.removeChild(inst._element);
      // Destroy animation.
      inst._animate.destroy();

      inst._element = inst._animate = null;
    }
  };

  inst._onMigrate = function(data) {
    if (data.item === item) {
      // Unbind previous listeners.
      grid.off(eventDragInit, inst._onDrag);
      grid.off(eventDragReleaseEnd, inst._onDragEnd);
      grid.off(eventLayoutStart, inst._onLayout);
      grid.off(eventBeforeSend, inst._onMigrate);
      // Update grid reference.
      inst._nextGrid = grid = data.toGrid;
      // Bind new listeners.
      grid.on(eventDragInit, inst._onDrag);
      grid.on(eventDragReleaseEnd, inst._onDragEnd);
      grid.on(eventLayoutStart, inst._onLayout);
      grid.on(eventBeforeSend, inst._onMigrate);
    }
  };

  // Bind initial event listeners.
  grid.on(eventDragInit, inst._onDrag);
  grid.on(eventDragReleaseEnd, inst._onDragEnd);
  grid.on(eventLayoutStart, inst._onLayout);
  grid.on(eventBeforeSend, inst._onMigrate);
}

/**
 * Create placeholder.
 *
 * @public
 * @memberof ItemDragPlaceholder.prototype
 * @returns {ItemDragPlaceholder}
 */
ItemDragPlaceholder.prototype.create = function() {
  var inst = this;
  var itemElement = inst._item.getElement();
  var nextLeft = inst._item._left + inst._item._marginLeft;
  var nextTop = inst._item._top + inst._item._marginTop;
  var element = document.createElement('div');

  inst._element = element;
  inst._animate = new ItemAnimate(inst._element);

  // Add placeholder class to the placeholder element.
  addClass(element, inst._nextGrid._settings.itemDragPlaceholderClass);

  // Position the placeholder item correctly.
  setStyles(element, {
    display: 'block',
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${inst._item._width}px`,
    height: `${inst._item._height}px`,
    transform: getTranslateString(nextLeft, nextTop)
  });

  // Insert the placeholder element to the grid container before item.
  inst._nextGrid.getElement().insertBefore(element, itemElement);

  return inst;
};

/**
 * Move placeholder to the new position.
 *
 * @public
 * @memberof ItemDragPlaceholder.prototype
 * @returns {ItemDragPlaceholder}
 */
ItemDragPlaceholder.prototype.layout = function() {
  var inst = this;
  var grid = inst._grid;
  var itemId = inst._item._id;
  var element = inst._element;
  var nextGrid = inst._nextGrid;
  var animDuration = grid._settings.layoutDuration;
  var animEasing = grid._settings.layoutEasing;
  var animEnabled = animDuration > 0;

  var nextPosition;
  var i = 0;
  for (; i < nextGrid._items.length; i += 1) {
    if (nextGrid._items[i]._id === itemId) {
      nextPosition = nextGrid._items[i];
      break;
    }
  }
  if (!nextPosition) {
    throw new Error("Can't find the associated item");
  }
  var nextLeft = nextGrid._layout.slots[i * 2] + nextPosition._marginLeft;
  var nextTop = nextGrid._layout.slots[i * 2 + 1] + nextPosition._marginTop;
  var doLayout = inst._item._left !== nextLeft || inst._item._top !== nextTop;
  var isDragging = inst._item.isDragging();

  // Update data
  inst._grid = nextGrid;

  // Layout if necessary.
  if (doLayout && isDragging && inst._element) {
    // Update width / height
    setStyles(element, {
      width: `${inst._item._width}px`,
      height: `${inst._item._height}px`
    });
    // Just set new position if no animation is required.
    if (!animEnabled) {
      setStyles(element, {
        transform: getTranslateString(nextLeft, nextTop)
      });
    }
    // Animate if necessary.
    else {
      var current = getTranslate(element);
      if (current.x !== nextLeft || current.y !== nextTop) {
        inst._animate.start(
          {
            transform: getTranslateString(current.x, current.y)
          },
          {
            transform: getTranslateString(nextLeft, nextTop)
          },
          {
            duration: animDuration,
            easing: animEasing
          }
        );
      }
    }
  }

  return inst;
};

/**
 * Destroy placeholder instance.
 *
 * @public
 * @memberof ItemDragPlaceholder.prototype
 * @returns {ItemDragPlaceholder}
 */
ItemDragPlaceholder.prototype.destroy = function() {
  var inst = this;

  // Unbind events.
  inst._grid.off(eventLayoutStart, inst._onLayout);
  inst._grid.off(eventBeforeSend, inst._onMigrate);
  inst._nextGrid.off(eventLayoutStart, inst._onLayout);
  inst._nextGrid.off(eventBeforeSend, inst._onMigrate);

  // Destroy animation.
  inst._animate.destroy();

  // Remove DOM node.
  inst._element.parentNode.removeChild(inst._element);

  // Reset data.
  inst._grid = inst._item = inst._element = inst._onLayout = inst._onMigrate = inst._animate = null;

  return inst;
};

export default ItemDragPlaceholder;
