# Muuri

Muuri allows you to create responsive, sortable, filterable and draggable grid layouts. Yep, that's a lot of features in one library, but we have tried to make it as tiny as possible. Comparing to what's out there Muuri is a combination of [Packery](http://packery.metafizzy.co/), [Masonry](http://masonry.desandro.com/), [Isotope](http://isotope.metafizzy.co/) and [jQuery UI sortable](https://jqueryui.com/sortable/). Wanna see it in action? Check out the [demo](http://haltu.github.io/muuri/) on the website.

Muuri's layout system allows positioning the grid items within the container in pretty much any way imaginable. The default "First Fit" bin packing layout algorithm generates similar layouts as [Packery](https://github.com/metafizzy/packery) and [Masonry](http://masonry.desandro.com/). The implementation is heavily based on the "maxrects" approach as described by Jukka Jylänki in his research [A Thousand Ways to Pack the Bin](http://clb.demon.fi/files/RectangleBinPack.pdf). However, you can also provide your own layout algorithm to position the items in any way you want.

Muuri uses [Velocity.js](http://velocityjs.org/) for animating the grid items (positioining/showing/hiding) and [Hammer.js](http://hammerjs.github.io/) for handling the dragging.

And if you're wondering about the name of the library "muuri" is Finnish meaning a wall.

## Table of contents

* [Getting started](#getting-started)
* [Options](#options)
* [Methods](#methods)
  * [muuri.getElement()](#muurigetelement)
  * [muuri.getRect()](#muurigetrect)
  * [muuri.getItems( [targets], [state] )](#muurigetitems-targets-state-)
  * [muuri.layoutItems( [instant], [callback] )](#muurilayoutitems-instant-callback-)
  * [muuri.refreshItems( [targets] )](#muurirefresh-targets-)
  * [muuri.synchronizeItems()](#muurisynchronizeitems)
  * [muuri.addItems( elements, [index] )](#muuriadditems-elements-index-)
  * [muuri.removeItems( targets, [removeElement] )](#muuriremoveitems-targets-removeelement-)
  * [muuri.showItems( targets, [instant], [callback] )](#muurishowitems-targets-instant-callback-)
  * [muuri.hideItems( targets, [instant], [callback] )](#muurihideitems-targets-instant-callback-)
  * [muuri.moveItem( targetFrom, targetTo, method )](#muurimoveitem-targetfrom-targetto-[method]-)
  * [muuri.on( event, listener )](#muurion-event-listener-)
  * [muuri.off( event, listener )](#muurioff-event-listener-)
  * [muuri.refresh()](#muurirefresh)
  * [muuri.destroy()](#muuridestroy)
* [Item methods](#item-methods)
  * [item.getElement()](#itemgetelement)
  * [item.getWidth()](#itemgetwidth)
  * [item.getHeight()](#itemgetheight)
  * [item.getMargin()](#itemgetmargin)
  * [item.getPosition()](#itemgetposition)
  * [item.isActive()](#itemisactive)
  * [item.isVisible()](#itemisvisible)
  * [item.isShowing()](#itemisshowing)
  * [item.isHiding()](#itemishiding)
  * [item.isPositioning()](#itemispositioning)
  * [item.isDragging()](#itemisdragging)
  * [item.isReleasing()](#itemisreleasing)
* [Events](#events)
  * [refresh](#refresh)
  * [refreshitems](#refreshitems)
  * [layoutitemsstart](#layoutitemsstart)
  * [layoutitemsend](#layoutitemsend)
  * [synchronizeitems](#synchronizeitems)
  * [additems](#additems)
  * [removeitems](#removeitems)
  * [showitemsstart](#showitemsstart)
  * [showitemsend](#showitemsend)
  * [hideitemsstart](#hideitemsstart)
  * [hideitemsend](#hideitemsend)
  * [moveitem](#moveitem)
  * [dragitemstart](#dragsitemtart)
  * [dragitemmove](#dragitemmove)
  * [dragitemscroll](#dragitemscroll)
  * [dragitemend](#dragitemend)
  * [releaseitemstart](#releaseitemstart)
  * [releaseitemend](#releaseitemend)
  * [destroy](#destroy)
* [License](#license)

## Getting started

Muuri has an optional dependency on Hammer.js (required only if you are using the dragging feature):
* [Hammer.js](https://github.com/hammerjs/hammer.js) (v2.0.0+)

**First, include Muuri and it's dependencies inside the body element in your site.**

```html
<!-- Only needed if you are using the dragging feature -->
<script src="hammer.js"></script>
<!-- Needs to be within in body element or have access to body element -->
<script src="muuri.js"></script>
```

**Then, define your grid markup.**

* Every grid must have a container element and item element(s) within the container element.
* A grid item must always consist of at least two elements. The outer element is used for positioning the item and the inner element (first direct child) is used for animating the item's visibility (show/hide methods). You can insert any markup you wish inside the inner item element.

```html
<div class="grid">

  <div class="item">
    <div class="item-content">
      This can be anything.
    </div>
  </div>

  <div class="item">
    <div class="item-content">
      <div class="my-custom-content">
        Yippee!
      </div>
    </div>
  </div>

</div>
```

**Next, let's apply some styles.**

* The grid element must be "positioned" meaning that it's CSS position property must be set to *relative*, *absolute* or *fixed*. Also note that Muuri automatically resizes the container element depending on the area the items cover.
* The item elements must have their CSS position set to *absolute* and their display property set to *block*, unless of course the elements have their display set to *block* inherently.
* The item elements must not have any CSS transitions or animations applied to them since Muuri already applies CSS transitions to them internally.
* You can control the gaps between the tiles by giving some margin to the item elements.
* Normally an absolutely positioned element is positioned relative to the containing element's content with padding included, but Muuri's items are positioned relative to the grid element's content with padding excluded (intentionally) to allow more control over the items' gutter spacing.

```css
.grid {
  position: relative;
}
.item {
  display: block;
  position: absolute;
  width: 100px;
  height: 100px;
  margin: 5px;
  z-index: 1;
}
.item.muuri-dragging,
.item.muuri-releasing {
  z-index: 2;
}
.item.muuri-hidden {
  z-index: 0;
}
.item-content {
  position: relative;
  width: 100%;
  height: 100%;
}
```

**Finally, initiate a Muuri instance.**

* The bare minimum configuration is demonstrated below. You must always provide Muuri with the container element and the initial item elements.
* Be sure to check out the all the available [options](#options), [methods](#methods) and [events](#events).

```javascript
var grid = new Muuri({
  container: document.getElementsByClassName('grid')[0],
  items: document.getElementsByClassName('item')
});
```

## Options

* **`container`** &nbsp;&mdash;&nbsp; *element*
  * Default value: `null`.
  * The container element. Must be always defined.
* **`items`** &nbsp;&mdash;&nbsp; *array of elements* / [*node list*](https://developer.mozilla.org/en-US/docs/Web/API/NodeList)
  * Default value: `null`.
  * The initial item elements wrapped in an array. The elements must be children of the container element. Can also be a node list which Muuri will automatically convert to an array.
* **`show`** &nbsp;&mdash;&nbsp; *function* / *null* / *object*
  * Default value: `{duration: 300, easing: 'ease', styles: {opacity: 1, scale: 1}}`.
  * Set to `null` to disable the animation.
  * When an object is provided Muuri's built-in animation engine (that uses Velocity.js) is used and the object is used for configuring the animation. The object allows configuring the following properties:
    * **`show.duration`** &nbsp;&mdash;&nbsp; *number*
      * Default value: `300`.
      * Animation duration in milliseconds.
    * **`show.easing`** &nbsp;&mdash;&nbsp; *string*
      * Default value: `'ease'`.
      * Accepts any valid [Velocity.js easing](http://velocityjs.org/#easing) value.
    * **`show.styles`** &nbsp;&mdash;&nbsp; *object*
      * Default value: `{opacity: 1, scale: 1}`.
      * A hash of the animated [style properties](http://velocityjs.org/#propertiesMap) and their target values for the animation.
  * By providing a function you can define a fully customized animation. The function should return an object that contains the following methods:
    * **`start`** &nbsp;&mdash;&nbsp; *function*
      * A function that starts the animation. Receives three arguments:
      * **`item`** &nbsp;&mdash;&nbsp; *Muuri.Item*
          * The Muuri.Item instance that is being animated.
      * **`instant`** &nbsp;&mdash;&nbsp; *boolean*
        * A boolean that determines if the styles should be applied instantly or with animation. If this is `true` the styles should be applied instantly instead of being animated.
      * **`onFinished`** &nbsp;&mdash;&nbsp; *function*
        * A function that should be called after the animation is successfully finished.
    * **`stop`** &nbsp;&mdash;&nbsp; *function*
      * A function that stops the current animation (if running). Receives one argument:
      * **`item`** &nbsp;&mdash;&nbsp; *Muuri.Item*
        * The Muuri.Item instance that is being animated.
* **`hide`** &nbsp;&mdash;&nbsp; *function* / *null* / *object*
  * Default value: `{duration: 300, easing: 'ease', styles: {opacity: 0, scale: 0.5}}`.
  * Set to `null` to disable the animation.
  * When an object is provided Muuri's built-in animation engine (that uses CSS transitions) is used and the object is used for configuring the animation. The object allows configuring the following properties:
    * **`hide.duration`** &nbsp;&mdash;&nbsp; *number*
      * Default value: `300`.
      * Animation duration in milliseconds.
    * **`hide.easing`** &nbsp;&mdash;&nbsp; *string*
      * Default value: `'ease'`.
      * Accepts any valid [Velocity.js easing](http://velocityjs.org/#easing) value.
    * **`hide.styles`** &nbsp;&mdash;&nbsp; *object*
      * Default value: `{opacity: 0, scale: 0.5}`.
      * A hash of the animated [style properties](http://velocityjs.org/#propertiesMap) and their target values for the animation.
  * By providing a function you can define a fully customized animation. The function should return an object that contains the following methods:
    * **`start`** &nbsp;&mdash;&nbsp; *function*
      * A function that starts the animation. Receives three arguments:
      * **`item`** &nbsp;&mdash;&nbsp; *Muuri.Item*
          * The Muuri.Item instance that is being animated.
      * **`instant`** &nbsp;&mdash;&nbsp; *boolean*
        * A boolean that determines if the styles should be applied instantly or with animation. If this is `true` the styles should be applied instantly instead of being animated.
      * **`onFinished`** &nbsp;&mdash;&nbsp; *function*
        * A function that should be called after the animation is successfully finished.
    * **`stop`** &nbsp;&mdash;&nbsp; *function*
      * A function that stops the current animation (if running). Receives one argument:
      * **`item`** &nbsp;&mdash;&nbsp; *Muuri.Item*
        * The Muuri.Item instance that is being animated.
* **`layout`** &nbsp;&mdash;&nbsp; *function / object*
  * Default value: `{fillGaps: false, horizontal: false, alignRight: false, alignBottom: false}`.
  * Provide an object to configure the default layout algorithm with the following properties:
      * **`layout.fillGaps`** &nbsp;&mdash;&nbsp; *boolean*
        * Default value: `false`.
        * When `true` the algorithm goes through every item in order and places each item to the first available free slot, even if the slot happens to be visually *before* the previous element's slot. Practically this means that the items might not end up visually in order, but there will be less gaps in the grid. By default this option is `false` which basically means that the following condition will be always true when calculating the layout (assuming `alignRight` and `alignBottom` are `false`): `nextItem.top > prevItem.top || (nextItem.top === prevItem.top && nextItem.left > prevItem.left)`. This also means that the items will be visually in order.
      * **`layout.horizontal`** &nbsp;&mdash;&nbsp; *boolean*
        * Default value: `false`.
        *  When `true` the grid works in landscape mode (grid expands to the right). Use for horizontally scrolling sites. When `false` the grid works in "portrait" mode and expands downwards.
      * **`layout.alignRight`** &nbsp;&mdash;&nbsp; *boolean*
        * Default value: `false`.
        * When `true` the items are aligned from right to left.
      * **`layout.alignBottom`** &nbsp;&mdash;&nbsp; *boolean*
        * Default value: `false`.
        * When `true` the items are aligned from the bottom up.
  * Alternatively you can provide a function to define a custom layout algorithm. The function will receive the `Layout` instance as its context. A `Layout` instance has the following properties:
    * **`muuri`** &nbsp;&mdash;&nbsp; *Muuri*
      * The related `Muuri` instance.
    * **`items`** &nbsp;&mdash;&nbsp; *array*
      * An array of the `Muuri.Item` instances that needs to be laid out.
    * **`slots`** &nbsp;&mdash;&nbsp; *object*
      * A hash of new item positions. Define the new item positions using an object that contains the item's `left` and `top` values (in pixels, relative to the container element's content). Store the the positions to the object using the related item's id (`item._id`).
    * **`setWidth`** &nbsp;&mdash;&nbsp; *boolean*
      * Default value: `false`.
      * Should container element width be set?
    * **`setHeight`** &nbsp;&mdash;&nbsp; *boolean*
      * Default value: `false`.
      * Should container element height be set?
    * **`width`** &nbsp;&mdash;&nbsp; *number*
      * The current width of the container element (without margin, border and padding).
    * **`height`** &nbsp;&mdash;&nbsp; *number*
      * The current height of the container element (without margin, border and padding).
 * **`layoutOnResize`** &nbsp;&mdash;&nbsp; *boolean / number*
   * Default value: `100`.
   * Should Muuri automatically trigger `layoutItems` method on window resize? Set to `false` to disable. When a number or `true` is provided Muuri will automatically lay out the items every time window is resized. The provided number (`true` is transformed to `0`) equals to the amount of time (in milliseconds) that is waited before items are laid out after each window resize event.
* **`layoutOnInit`** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `true`.
  * Should Muuri trigger `layoutItems` method automatically on init?
* **`layoutDuration`** &nbsp;&mdash;&nbsp; *number*
  * Default value: `300`.
  * The duration for item's layout animation in milliseconds. Set to `0` to disable.
* **`layoutEasing`** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'ease'`.
  * The easing for item's layout animation. Accepts any valid [Velocity.js easing](http://velocityjs.org/#easing) value.
* **`dragEnabled`** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * Should items be draggable?
* **`dragContainer`** &nbsp;&mdash;&nbsp; *null / element*
  * Default value: `null`.
  * Which item should the dragged item be appended to for the duration of the drag? If `null` is provided the container element will be used.
* **`dragStartPredicate`** &nbsp;&mdash;&nbsp; *null / function*
  * Default value: `null`.
  * A function that determines when dragging should start.
  * Set to `null` to use the default predicate (dragging starts immediately).
  * Provide a function to define a custom drag start predicate. The predicate function receives three arguments:
    * **`item`** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The `Muuri.Item` instance that's being dragged.
    * **`event`**  &nbsp;&mdash;&nbsp; *object*
      * The drag event (Hammer.js event).
    * **`predicate`** &nbsp;&mdash;&nbsp; *Predicate*
      * **`predicate.resolve`** &nbsp;&mdash;&nbsp; *function*
        * Resolves the predicate and initiates the item's drag procedure.
      * **`predicate.reject`** &nbsp;&mdash;&nbsp; *function*
        * Rejects the predicate and prevents the item's drag procedure from initiating until the user releases the item and starts dragging it again.
      * **`predicate.isResolved`** &nbsp;&mdash;&nbsp; *function*
        * Returns boolean. Check if the predicate is resolved.
      * **`predicate.isRejected`** &nbsp;&mdash;&nbsp; *function*
        * Returns boolean. Check if the predicate is rejected.
* **`dragSort`** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `true`.
  * Should the items be sorted during drag?
* **`dragSortInterval`** &nbsp;&mdash;&nbsp; *number*
  * Default value: `50`.
  * Defines the amount of time the dragged item must be still before `dragSortPredicate` function is called. The default `dragSortPredicate` is pretty intense which means that you might see some janky animations and/or an unresponsive UI if you set this value too low (`0` is definitely not recommended).
* **`dragSortPredicate`** &nbsp;&mdash;&nbsp; *function / object*
  * Default value: `{action: 'move', tolerance: 50}`.
  * Defines the logic for the sort procedure during dragging an item.
  * If an object is provided the default sort predicate handler will be used. You can define the following properties:
    * **`dragSortPredicate.action`** &nbsp;&mdash;&nbsp; *string*
      * Default value: `'move'`.
      * Allowed values: `'move'`, `'swap'`.
      * Should the dragged item be *moved* to the new position or should it *swap* places with the item it overlaps?
    * **`dragSortPredicate.threshold`** &nbsp;&mdash;&nbsp; *number*
      * Default value: `50`.
      * Allowed values: `1` - `100`.
      * How many percent the intersection area between the dragged item and the compared item should be from the maximum potential intersection area between the items before sorting is triggered.
  * Alternatively you can provide your own callback function where you can define your own custom sort logic. The callback receives one argument, which is the currently dragged Muuri.Item instance. The callback should return a *falsy* value if it sorting should not occur. If, however, sorting should occur the callback should return an object containing the following properties: `action` ("move" or "swap"), `from` (the index of the Muuri.Item to be moved/swapped), `to` (the index the item should be moved to / swapped with). E.g returning `{action: 'move', from: 0, to: 1}` would move the first item as the second item.
* **`dragReleaseDuration`** &nbsp;&mdash;&nbsp; *number*
  * Default value: `300`.
  * The duration for item's drag release animation. Set to `0` to disable.
* **`dragReleaseEasing`** &nbsp;&mdash;&nbsp; *string / array*
  * Default value: `'ease'`.
  * The easing for item's drag release animation. Accepts any valid [Velocity.js easing](http://velocityjs.org/#easing) value.
* **`containerClass`** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'muuri'`.
  * Container element classname.
* **`itemClass`** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'muuri-item'`.
  * Item element classname.
* **`itemVisibleClass`** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'muuri-item-visible'`.
  * Visible item classname.
* **`itemHiddenClass`** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'muuri-item-hidden'`.
  * Hidden item classname.
* **`itemPositioningClass`** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'muuri-item-positioning'`.
  * This classname will be added to the item element for the duration of positioing.
* **`itemDraggingClass`** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'muuri-item-dragging'`.
  * This classname will be added to the item element for the duration of drag.
* **`itemReleasingClass`** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'muuri-item-releasing'`.
  * This classname will be added to the item element for the duration of release.

**Modify default settings**

The default settings are stored in `Muuri.defaultSettings` object.

```javascript
Muuri.defaultSettings.show.duration = 400;
Muuri.defaultSettings.hide.duration = 400;
```

**Quick reference**

```javascript
var defaults = {

  // Container
  container: null,

  // Items
  items: [],

  // Show/hide animations
  show: {
    duration: 300,
    easing: 'ease',
    styles: {
      opacity: 1,
      scale: 1
    }
  },
  hide: {
    duration: 300,
    easing: 'ease',
    styles: {
      opacity: 0,
      scale: 0.5
    }
  },

  // Layout
  layout: {
    fillGaps: false,
    horizontal: false,
    alignRight: false,
    alignBottom: false
  },
  layoutOnResize: 100,
  layoutOnInit: true,
  layoutDuration: 300,
  layoutEasing: 'ease',

  // Drag & Drop
  dragEnabled: false,
  dragContainer: null,
  dragStartPredicate: null,
  dragSort: true,
  dragSortInterval: 50,
  dragSortPredicate: {
    threshold: 50,
    action: 'move'
  },
  dragReleaseDuration: 300,
  dragReleaseEasing: 'ease',

  // Classnames
  containerClass: 'muuri',
  itemClass: 'muuri-item',
  itemVisibleClass: 'muuri-item-shown',
  itemHiddenClass: 'muuri-item-hidden',
  itemPositioningClass: 'muuri-item-positioning',
  itemDraggingClass: 'muuri-item-dragging',
  itemReleasingClass: 'muuri-item-releasing'

};
```

## Methods

### `muuri.getElement()`

Get the instance element.

**Returns** &nbsp;&mdash;&nbsp; *element*

**Examples**

```javascript
var elem = muuri.getElement();
```

### `muuri.getRect()`

Get instance's cached dimensions and offsets. Basically the same data as provided by [element.getBoundingClientRect()](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) method, just cached. The cached dimensions and offsets are subject to change whenever [layoutItems](#muurilayoutitems-instant-callback-) or [refresh](#muurirefresh) method is called. Note that Muuri uses rounded values (`Math.round(val)`) in all calculations.

**Returns** &nbsp;&mdash;&nbsp; *object*

* **obj.width** &nbsp;&mdash;&nbsp; *number*
  * The instance element's width in pixels (rounded).
* **obj.height** &nbsp;&mdash;&nbsp; *number*
  * The instance element's height in pixels (rounded).
* **obj.left** &nbsp;&mdash;&nbsp; *number*
  * The instance element's left offset in pixels (rounded).
* **obj.right** &nbsp;&mdash;&nbsp; *number*
  * The instance element's left offset + width in pixels (rounded).
* **obj.top** &nbsp;&mdash;&nbsp; *number*
  * The instance element's top offset in pixels (rounded).
* **obj.bottom** &nbsp;&mdash;&nbsp; *number*
  * The instance element's top offset + height in pixels (rounded).

**Examples**

```javascript
var rectData = muuri.getRect();
```

### `muuri.getItems( [targets], [state] )`

Get all items. Optionally you can provide specific targets (indices or elements) and filter the results by the items' state (active/inactive). Note that the returned array is not the same object used by the instance so modifying it will not affect instance's items. All items that are not found are omitted from the returned array.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * Optional.
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
* **state** &nbsp;&mdash;&nbsp; *string*
  * Optional.
  * Default value: `undefined`.
  * Allowed values: `'active'`, `'inactive'`.
  * Filter the returned array by the items' state. For example, if set to `'active'` all *inactive* items will be removed from the returned array.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns an array of `Muuri.Item` instances.

**Examples**

```javascript
// Get all items, both active and inactive.
var allItems = muuri.getItems();

// Get all active (visible) items.
var activeItems = muuri.getItems('active');

// Get all inactive (hidden) items.
var inactiveItems = muuri.getItems('inactive');

// Get the first item (active or inactive).
var firstItem = muuri.getItems(0)[0];

// Get specific items by their elements (inactive or active).
var items = muuri.getItems([elemA, elemB]);

// Get specific inactive items.
var items = muuri.getItems([elemA, elemB], 'inactive');
```

### `muuri.layoutItems( [instant], [callback] )`

Calculate item positions and move items to their calculated positions unless they are already positioned correctly. The container's height is also adjusted according to the position of the items.

**Parameters**

* **instant** &nbsp;&mdash;&nbsp; *boolean*
  * Optional.
  * Default value: `false`.
  * Should the items be positioned instantly without any possible animation?
* **callback** &nbsp;&mdash;&nbsp; *function*
  * Optional.
  * A callback function that is called after the items have positioned. Receives two arguments. The first one is an array of all the items that were successfully positioned without interruptions and the second is a layout data object.

**Examples**

```javascript
// Layout items.
muuri.layoutItems();

// Layout items instantly (without animations).
muuri.layoutItems(true);

// Layout all items and define a callback that will be called
// after all items have been animated to their positions.
muuri.layoutItems(function (items, layoutData) {
  console.log('layout done!');
});
```

### `muuri.refreshItems( [targets] )`

Recalculate the width and height of the provided targets. If no targets are provided all *active* items will be refreshed.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * Optional.
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).

**Examples**

```javascript
// Refresh all active items
muuri.refreshItems();

// Refresh the first item.
muuri.refreshItems(0);

// Refresh all items which match the provided DOM elements.
muuri.refreshItems([elemA, elemB]);

// Refresh specific items (instances of Muuri.Item).
muuri.refreshItems([itemA, itemB]);
```

### `muuri.synchronizeItems()`

Order the item elements to match the order of the items. If the item's element is not a child of the container it is ignored and left untouched. This comes handy if you need to keep the DOM structure matched with the order of the items.

**Examples**

```javascript
muuri.synchronizeItems();
```

### `muuri.addItems( elements, [index] )`

Add new items by providing the elements you wish to add to the instance and optionally provide the index where you want the items to be inserted into. All elements that are not already children of the container element will be automatically appended to the container.

If an element has it's CSS display property set to none it will be marked as *inactive* during the initiation process. As long as the item is *inactive* it will not be part of the layout, but it will retain it's index. You can activate items at any point with `muuri.showItems()` method.

This method will automatically call `muuri.layoutItems()` if one or more of the added elements are visible. If only hidden items are added no layout will be called. All the new visible items are positioned without animation during their first layout.

**Parameters**

* **elements** &nbsp;&mdash;&nbsp; *array / element*
  * An array of DOM elements.
* **index** &nbsp;&mdash;&nbsp; *number*
  * Optional.
  * Default value: `0`.
  * The index where you want the items to be inserted in. A value of `-1` will insert the items to the end of the list while `0` will insert the items to the beginning. Note that the DOM elements are always just appended to the instance container regardless of the index value. You can use the `muuri.synchronizeItems()` method to arrange the DOM elments to the same order as the items.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns an array of `Muuri.Item` instances.

**Examples**

```javascript
// Add two new items to the beginning.
muuri.addItems([elemA, elemB]);

// Add two new items to the end.
muuri.addItems([elemA, elemB], -1);
```

### `muuri.removeItems( targets, [removeElement] )`

Remove items from the instance.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
* **removeElement** &nbsp;&mdash;&nbsp; *boolean*
  * Optional.
  * Default value: `false`.
  * Should the associated DOM element be removed from the DOM?

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns the indices of the removed items.

**Examples**

```javascript
// Remove the first item, but keep the element in the DOM.
muuri.removeItems(0);

// Remove items and the associated elements.
muuri.removeItems([elemA, elemB], true);
```


### `muuri.showItems( targets, [instant], [callback] )`

Show the targeted items.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
* **instant** &nbsp;&mdash;&nbsp; *boolean*
  * Optional.
  * Default value: `false`.
  * Should the items be shown instantly without any possible animation?
* **callback** &nbsp;&mdash;&nbsp; *function*
  * Optional.
  * A callback function that is called after the items are shown.

**Examples**

```javascript
// Show items with animation (if any).
muuri.showItems([elemA, elemB]);

// Show items instantly without animations.
muuri.showItems([elemA, elemB], true);

// Show items with callback (and with animations if any).
muuri.showItems([elemA, elemB], function (items) {
  console.log('items shown!');
});
```

### `muuri.hideItems( targets, [instant], [callback] )`

Hide the targeted items.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
* **instant** &nbsp;&mdash;&nbsp; *boolean*
  * Optional.
  * Default value: `false`.
  * Should the items be hidden instantly without any possible animation?
* **callback** &nbsp;&mdash;&nbsp; *function*
  * Optional.
  * A callback function that is called after the items are hidden.

**Examples**

```javascript
// Hide items with animation.
muuri.hideItems([elemA, elemB]);

// Hide items instantly without animations.
muuri.hideItems([elemA, elemB], true);

// Hide items and call the callback function after
// all items are hidden.
muuri.hideItems([elemA, elemB], function (items) {
  console.log('items hidden!');
});
```

### `muuri.moveItem( targetFrom, targetTo, [method] )`

Move item to another index or in place of another item.

**Parameters**

* **targetFrom** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item as an integer.
* **targetTo** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item as an integer.
* **method** &nbsp;&mdash;&nbsp; *string*
  * Optional.
  * Default value: `'move'`.
  * Accepts the following values:
    * `'move'`: moves item in place of another item.
    * `'swap'`: swaps position of items.

**Examples**

```javascript

// Move elemA to the index of elemB.
muuri.moveItem(elemA, elemB);

// Move first item as last.
muuri.moveItem(0, -1);

// Swap positions of elemA and elemB.
muuri.moveItem(elemA, elemB, 'swap');

// Swap positions of the first and the last item.
muuri.moveItem(0, -1, 'swap');
```

### `muuri.on( event, listener )`

Bind an event on the Muuri instance.

**Parameters**

* **event** &nbsp;&mdash;&nbsp; *string*
* **listener** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the instance.

**Examples**

```javascript
muuri.on('layoutitemsend', function (items) {
  console.log(items);
});
```

&nbsp;

### `muuri.off( event, listener )`

Unbind an event from the Muuri instance.

**Parameters**

* **event** &nbsp;&mdash;&nbsp; *string*
* **listener** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the instance.

**Examples**

```javascript
var listener = function (items) {
  console.log(items);
};

muuri
.on('layoutitemsend', listener)
.off('layoutitemsend', listener);
```

### `muuri.refresh()`

Calculate and cache the dimensions and offsets of the container element.

**Examples**

```javascript
muuri.refresh();
```

### `muuri.destroy()`

Destroy the instance.

**Examples**

```javascript
muuri.destroy();
```

## Item methods

### `item.getElement()`

Get the instance element.

**Returns** &nbsp;&mdash;&nbsp; *element*

**Examples**

```javascript
// Get the element of the first item in the muuri instance.
var elem = muuri.getItems(0).getElement();
```

### `item.getWidth()`

Get instance element's cached width. The returned value includes the element's paddings and borders. Note that the values are rounded with `Math.round()`.

**Returns** &nbsp;&mdash;&nbsp; *number*

**Examples**

```javascript
// Get the width of the first item in the muuri instance.
var elem = muuri.getItems(0).getWidth();
```

### `item.getHeight()`

Get instance element's cached height. The returned value includes the element's paddings and borders. Note that the values are rounded with `Math.round()`.

**Returns** &nbsp;&mdash;&nbsp; *number*

**Examples**

```javascript
// Get the height of the first item in the muuri instance.
var elem = muuri.getItems(0).getHeight();
```

### `item.getMargin()`

Get instance element's cached margins. Note that the values are rounded with `Math.round()`.

**Returns** &nbsp;&mdash;&nbsp; *object*

* **obj.left** &nbsp;&mdash;&nbsp; *number*
* **obj.right** &nbsp;&mdash;&nbsp; *number*
* **obj.top** &nbsp;&mdash;&nbsp; *number*
* **obj.bottom** &nbsp;&mdash;&nbsp; *number*

**Examples**

```javascript
// Get the height of the first item in the muuri instance.
var elem = muuri.getItems(0).getHeight();
```

### `item.getPosition()`

Get instance element's cached position (relative to the container element).

**Returns** &nbsp;&mdash;&nbsp; *object*

* **obj.left** &nbsp;&mdash;&nbsp; *number*
* **obj.top** &nbsp;&mdash;&nbsp; *number*

**Examples**

```javascript
// Get the position of the first item in the muuri instance.
var elem = muuri.getItems(0).getPosition();
```

### `item.isActive()`

Check if the item is currently *active*. Only active items are considered to be part of the layout.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
// Check if the first item in the muuri instance is active.
var isActive = muuri.getItems(0)[0].isActive();
```

### `item.isVisible()`

Check if the item is currently *visible*.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
// Check if the first item in the muuri instance is visible.
var isVisible = muuri.getItems(0)[0].isVisible();
```

### `item.isShowing()`

Check if the item is currently animating to visible.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
// Check if the first item in the muuri instance is animating to visible.
var isShowing = muuri.getItems(0)[0].isShowing();
```

### `item.isHiding()`

Check if the item is currently animating to hidden.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
// Check if the first item in the muuri instance is animating to hidden.
var isHiding = muuri.getItems(0)[0].isHiding();
```

### `item.isPositioning()`

Check if the item is currently being positioned.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
// Check if the first item in the muuri instance is being positioned.
var isPositioning = muuri.getItems(0)[0].isPositioning();
```

### `item.isDragging()`

Check if the item is currently being dragged.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
// Check if the first item in the muuri instance is being dragged.
var isDragging = muuri.getItems(0)[0].isDragging();
```

### `item.isReleasing()`

Check if the item is currently being released.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
// Check if the first item in the muuri instance is being released.
var isReleasing = muuri.getItems(0)[0].isReleasing();
```

## Events

### `refresh`

Triggered after the `muuri.refresh()` method is called.

**Examples**

```javascript
muuri.on('refresh', function () {
  console.log('The container element was refreshed');
});
```

### `refreshitems`

Triggered after the `muuri.refreshItems()` method is called.

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances which were refreshed.

**Examples**

```javascript
muuri.on('refreshitems', function (items) {
  console.log(items);
});
```

### `synchronizeitems`

Triggered after the `muuri.synchronizeItems()` is called.

**Examples**

```javascript
muuri.on('synchronizeitems', function () {
  console.log('Synced!');
});
```

### `layoutitemsstart`

Triggered when `muuri.layoutItems()` method is called, just before the items are positioned.

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are about to be positioned.
* **layout** &nbsp;&mdash;&nbsp; *object*
  * A `Muuri.Layout` instance.
  * **layout.muuri** &nbsp;&mdash;&nbsp; *Muuri*
    * A `Muuri` instance for which the layout was generated.
  * **layout.items** &nbsp;&mdash;&nbsp; *array*
      * An array of `Muuri.Item` instances that were positioned.
  * **layout.slots** &nbsp;&mdash;&nbsp; *object*
    * An object containing the positions of the `layout.items`. Indexed with the ids of the items. For example, to get the first item's position you would do `layout.slots[layout.items[0]._id]`. Each slot contains the the item's *width*, *height*, *left* and *top* values (in pixels).
  * **layout.width** &nbsp;&mdash;&nbsp; *number*
    * The width of the grid.
  * **layout.height** &nbsp;&mdash;&nbsp; *number*
    * The height of the grid.

**Examples**

```javascript
muuri.on('layoutitemsstart', function (items, layout) {
  console.log(items);
  console.log(layout);
});
```

### `layoutitemsend`

Triggered when `muuri.layoutItems()` method is called, after the items have positioned.

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully positioned.
* **layout** &nbsp;&mdash;&nbsp; *object*
  * A `Muuri.Layout` instance.
  * **layout.muuri** &nbsp;&mdash;&nbsp; *Muuri*
    * A `Muuri` instance for which the layout was generated.
  * **layout.items** &nbsp;&mdash;&nbsp; *array*
      * An array of `Muuri.Item` instances that were positioned.
  * **layout.slots** &nbsp;&mdash;&nbsp; *object*
    * An object containing the positions of the `layout.items`. Indexed with the ids of the items. For example, to get the first item's position you would do `layout.slots[layout.items[0]._id]`. Each slot contains the the item's *width*, *height*, *left* and *top*.
  * **layout.width** &nbsp;&mdash;&nbsp; *number*
    * The width of the grid.
  * **layout.height** &nbsp;&mdash;&nbsp; *number*
    * The height of the grid.

**Examples**

```javascript
muuri.on('layoutitemsend', function (items, layout) {
  console.log(items);
  console.log(layout);
});
```

### `showitemsstart`

Triggered when `muuri.showItems()` method is called, just before the items are shown (with or without animation).

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are about to be shown.

**Examples**

```javascript
muuri.on('showitemsstart', function (items) {
  console.log(items);
});
```

### `showitemsend`

Triggered when `muuri.showItems()` method is called, after the items are shown (with or without animation).

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully shown without interruptions. If an item is already visible when the `muuri.showItems()` method is called it is cosidered as successfully shown.

**Examples**

```javascript
muuri.on('showitemsend', function (items) {
  console.log(items);
});
```

### `hideitemsstart`

Triggered when `muuri.hideItems()` method is called, just before the items are hidden (with or without animation).

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are about to be hidden.

**Examples**

```javascript
muuri.on('hideitemsstart', function (items) {
  console.log(items);
});
```

### `hideitemsend`

Triggered when `muuri.hideItems()` method is called, after the items are hidden (with or without animation).

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully hidden without interruptions. If an item is already hidden when the `muuri.hideItems()` method is called it is considered as successfully hidden.

**Examples**

```javascript
muuri.on('hideitemsend', function (items) {
  console.log(items);
});
```

### `moveitem`

Triggered after `muuri.moveItem()` method is called.

**Listener parameters**

* **targetFrom** &nbsp;&mdash;&nbsp; *array*
  * `Muuri.Item` instance that was moved.
* **targetTo** &nbsp;&mdash;&nbsp; *array*
  * `Muuri.Item` instance to which's index the *targetFrom* item was moved to.
* **method** &nbsp;&mdash;&nbsp; *string*
  * "move" or "swap".

**Examples**

```javascript
muuri.on('moveitem', function (targetFrom, targetTo, method) {
  console.log(targetFrom);
  console.log(targetTo);
  console.log(method);
});
```

### `additems`

Triggered after `muuri.addItems()` method is called.

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully added to the muuri instance.

**Examples**

```javascript
muuri.on('additems', function (items) {
  console.log(items);
});
```

### `removeitems`

Triggered after `muuri.removeItems()` method is called.

**Listener parameters**

* **itemIndices** &nbsp;&mdash;&nbsp; *array*
  * Indices of the `Muuri.Item` instances that were succesfully removed from the muuri instance.

**Examples**

```javascript
muuri.on('removeitems', function (itemIndices) {
  console.log(itemIndices);
});
```

### `dragitemstart`

Triggered when dragging of an item begins.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.
* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.

**Examples**

```javascript
muuri.on('dragitemstart', function (item, event) {
  console.log(item);
  console.log(event);
});
```

### `dragitemmove`

Triggered when an item is dragged.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.
* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.

**Examples**

```javascript
muuri.on('dragitemmove', function (item, event) {
  console.log(item);
  console.log(event);
});
```

### `dragitemscroll`

Triggered when any of the scroll parents of a dragged item is scrolled.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.

**Examples**

```javascript
muuri.on('dragitemscroll', function (item) {
  console.log(item);
});
```

### `dragitemend`

Triggered after item dragging ends.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.
* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.

**Examples**

```javascript
muuri.on('dragitemend', function (item, event) {
  console.log(item);
  console.log(event);
});
```

### `releaseitemstart`

Triggered when item is released (right after dragging ends).

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being released.

**Examples**

```javascript
muuri.on('releaseitemstart', function (item) {
  console.log(item);
});
```

### `releaseitemend`

Triggered after item has been released and animated back to it's position.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.

**Examples**

```javascript
muuri.on('releaseitemend', function (item) {
  console.log(item);
});
```

### `destroy`

Triggered after `muuri.destroy()` method is called.

**Examples**

```javascript
muuri.on('destroy', function () {
  console.log('Muuri is no more...');
});
```

## License

Copyright &copy; 2015 Haltu Oy. Licensed under **[the MIT license](LICENSE.md)**.

