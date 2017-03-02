# Muuri

Muuri allows you to create responsive, sortable, filterable and draggable grid layouts. Yep, that's a lot of features in one library, but we have tried to make it as tiny as possible. Comparing to what's out there Muuri is a combination of [Packery](http://packery.metafizzy.co/), [Masonry](http://masonry.desandro.com/), [Isotope](http://isotope.metafizzy.co/) and [jQuery UI sortable](https://jqueryui.com/sortable/). Wanna see it in action? Check out the [demo](http://haltu.github.io/muuri/) on the website.

Muuri's layout system allows positioning the grid items pretty much any way imaginable. The default "First Fit" bin packing layout algorithm generates similar layouts as [Packery](https://github.com/metafizzy/packery) and [Masonry](http://masonry.desandro.com/). The implementation is heavily based on the "maxrects" approach as described by Jukka Jylänki in his research [A Thousand Ways to Pack the Bin](http://clb.demon.fi/files/RectangleBinPack.pdf). However, you can also provide your own layout algorithm to position the items in any way you want.

Muuri uses [Velocity](http://velocityjs.org/) for animating the grid items (positioining/showing/hiding) and [Hammer.js](http://hammerjs.github.io/) for handling the dragging.

And if you're wondering about the name of the library "muuri" is Finnish meaning a wall.

## Table of contents

* [Getting started](#getting-started)
* [Constructor](#constructor)
* [Options](#options)
* [Methods](#methods)
  * [grid.getElement()](#gridgetelement)
  * [grid.getRect()](#gridgetrect)
  * [grid.getItems( [targets], [state] )](#gridgetitems-targets-state-)
  * [grid.refresh()](#gridrefresh)
  * [grid.refreshItems( [items] )](#gridrefreshitems-items-)
  * [grid.synchronize()](#gridsynchronize)
  * [grid.layout( [instant], [callback] )](#gridlayout-instant-callback-)
  * [grid.add( elements, [index] )](#gridadd-elements-index-)
  * [grid.remove( items, [removeElement] )](#gridremove-items-removeelement-)
  * [grid.show( items, [instant], [callback] )](#gridshow-items-instant-callback-)
  * [grid.hide( items, [instant], [callback] )](#gridhide-items-instant-callback-)
  * [grid.filter( predicate, [instant] )](#gridfilter-predicate-instant-)
  * [grid.sort( compareFunction )](#gridsort-comparefunction-)
  * [grid.move( item, position, [action] )](#gridmove-item-position-action-)
  * [grid.send( item, grid, [options] )](#gridsend-item-grid-options-)
  * [grid.on( event, listener )](#gridon-event-listener-)
  * [grid.off( event, listener )](#gridoff-event-listener-)
  * [grid.destroy()](#griddestroy)
* [Item methods](#item-methods)
  * [item.getGrid()](#itemgetgrid)
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
  * [item.isMigrating()](#itemismigrating)
* [Events](#events)
  * [synchronize](#synchronize)
  * [layoutStart](#layoutstart)
  * [layoutEnd](#layoutend)
  * [add](#add)
  * [remove](#remove)
  * [showStart](#showstart)
  * [showEnd](#showend)
  * [hideStart](#hidestart)
  * [hideEnd](#hideend)
  * [filter](#filter)
  * [sort](#sort)
  * [move](#move)
  * [send](#send)
  * [receiveStart](#receivestart)
  * [receiveEnd](#receiveend)
  * [dragStart](#dragstart)
  * [dragMove](#dragmove)
  * [dragScroll](#dragscroll)
  * [dragSort](#dragsort)
  * [dragSend](#dragsend)
  * [dragReceive](#dragreceive)
  * [dragReceiveDrop](#dragreceivedrop)
  * [dragEnd](#dragend)
  * [dragReleaseStart](#dragreleasestart)
  * [dragReleaseEnd](#dragreleaseend)
  * [destroy](#destroy)
* [License](#license)

## Getting started

### 1. Get Muuri

Download from GitHub:
* [muuri.js](https://raw.githubusercontent.com/haltu/muuri/0.3.0/muuri.js) - for development (not minified, with comments).
* [muuri.min.js](https://raw.githubusercontent.com/haltu/muuri/0.3.0/muuri.min.js) - for production (minified, no comments).

Or link directly via CDNJS:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/muuri/0.3.0/muuri.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/muuri/0.3.0/muuri.min.js"></script>
```

Or install with [npm](https://www.npmjs.com/):

```bash
npm install muuri
```

Or install with [bower](http://bower.io):

```bash
bower install muuri
```

### 2. Get the dependencies

Muuri depends on the following libraries:
* [Velocity](https://github.com/julianshapiro/velocity) (v1.0.0+)
  * By default Muuri users Velocity to power all the animations. However, it is possible to replace Velocity with any other animation engine by overwriting `Muuri.AnimateLayout` and `Muuri.AnimateVisibility` constructors. If you overwrite those constructors with your own implementation Muuri detects it and Velocity is no longer required as a dependency.
* [Hammer.js](https://github.com/hammerjs/hammer.js) (v2.0.0+)
  * Hammer.js is an optional dependency and only required if the dragging is enabled. Currently there is no easy way to use another library for handling the drag interaction. Almost all of the drag related logic exists within `Muuri.Drag` constructor, which is instantiated for each item, so if you really need to customize the drag behaviour beyond what is available via the options you can replace the `Muuri.Drag` constructor with your own implementation (fingers crossed).

### 3. Add the script tags

Include Muuri inside the *body* element in your site and make sure to include the dependencies before Muuri. Muuri has to be inside the body element because it does some feature checking during initiation and might not work correctly if it does not have access to `document.body`.

```html
<script src="velocity.js"></script>
<script src="hammer.js"></script>
<!-- Muuri needs to have access to document.body when initiated -->
<script src="muuri.js"></script>
```

### 4. Add the markup

* Every grid must have a container element.
* Grid items must always consist of at least two elements. The outer element is used for positioning the item and the inner element (first direct child) is used for animating the item's visibility (show/hide methods). You can insert any markup you wish inside the inner item element.

```html
<div class="grid">

  <div class="item">
    <div class="item-content">
      <!-- Safe zone, enter your custom markup -->
      This can be anything.
      <!-- Safe zone ends -->
    </div>
  </div>

  <div class="item">
    <div class="item-content">
      <!-- Safe zone, enter your custom markup -->
      <div class="my-custom-content">
        Yippee!
      </div>
      <!-- Safe zone ends -->
    </div>
  </div>

</div>
```

### 5. Add the styles

* The container element must be "positioned" meaning that it's CSS position property must be set to *relative*, *absolute* or *fixed*. Also note that Muuri automatically resizes the container element depending on the area the items cover.
* The item elements must have their CSS position set to *absolute* and their display property set to *block*. Muuri actually enforces the `display:block;` rule and adds it as an inline style to all item elements, just in case.
* The item elements must not have any CSS transitions or animations applied to them, because they might conflict with Velocity's animations. However, the container element can have transitions applied to it if you want it to animate when it's size changes after the layout operation.
* You can control the gaps between the tiles by giving some margin to the item elements. Note that Muuri's items are positioned relative to the container element's content with padding excluded (intentionally) to provide more control over the gutter spacing.  Normally an absolutely positioned element is positioned relative to the containing element's content with padding included.

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

### 6. Fire it up

The bare minimum configuration is demonstrated below. You must always provide the container element (or a selector so Muuri can fetch the element for you), everything else is optional.

```javascript
var grid = new Muuri('.grid');
```

## Constructor

`Muuri` is a constructor function and should be always instantiated with the `new` keyword. For the sake of clarity, we refer to a Muuri instance as *grid* throughout the documentation.

**Syntax**

`Muuri( element, [options]  )`

**Parameters**

* **element** &nbsp;&mdash;&nbsp; *element* / *string*
  * Default value: `null`.
  * You can provide the element directly or use a selector (string) which uses [querySelectorAll()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll) internally. The first element of the query's result will be used.
* **options** &nbsp;&mdash;&nbsp; *object*
  * Optional. Check out the [detailed options reference](#grid-options).

**Default options**

The default options are stored in `Muuri.defaultOptions` object, which in it's default state contains the following configuration:

```javascript
{

  // Items
  items: '*',

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
  dragSortGroup: null,
  dragSortConnections: null,
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

}
```

You can modify the default options easily:

```javascript
Muuri.defaultOptions.show.duration = 400;
Muuri.defaultOptions.dragSortPredicate.action = 'swap';
```

**Examples**

```javascript
// Minimum configuration.
var gridA = new Muuri('.grid-a');

// Providing some options.
var gridB = new Muuri('.grid-b', {
  items: '.item'
});
```

## Options

### items &nbsp;

The initial item elements, which should be children of the container element. You can provide an *array* of elements, a [*node list*](https://developer.mozilla.org/en-US/docs/Web/API/NodeList) or a selector (string). If you provide a selector Muuri uses it to filter the current child elements of the container element and sets them as initial items. By default all current child elements of the provided container element are used as initial items.

  * Default value: `'*'`.
  * Accepted types: array (of elements), [node list](https://developer.mozilla.org/en-US/docs/Web/API/NodeList), string, null.

### show &nbsp;

Defines the show animation. Set to `null` to disable show animation completely.

  * Default value: `{duration: 300, easing: 'ease', styles: {opacity: 1, scale: 1}}`.
  * Accepted types: function, object, null.

When an object is provided Muuri's built-in animation engine is used and allows configuring the animation with following properties:

* **duration** &nbsp;&mdash;&nbsp; *number*
  * Default value: `300`.
  * Animation duration in milliseconds.
* **easing** &nbsp;&mdash;&nbsp; *array* / *string*
  * Default value: `'ease'`.
  * Accepts any valid [Velocity.js easing](http://velocityjs.org/#easing) value.
* **show.styles** &nbsp;&mdash;&nbsp; *object*
  * Default value: `{opacity: 1, scale: 1}`.
  * A hash of the animated [style properties](http://velocityjs.org/#propertiesMap) and their target values for the animation.

By providing a function you can define a fully customized animation. The function should return an object that contains the following methods:

* **start** &nbsp;&mdash;&nbsp; *function*
  * A function that starts the animation. Receives three arguments:
    * **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The Muuri.Item instance that is being animated.
    * **instant** &nbsp;&mdash;&nbsp; *boolean*
      * A boolean that determines if the styles should be applied instantly or with animation. If this is `true` the styles should be applied instantly instead of being animated.
    * **onFinished** &nbsp;&mdash;&nbsp; *function*
      * A function that should be called after the animation is successfully finished.
* **stop** &nbsp;&mdash;&nbsp; *function*
  * A function that stops the current animation (if running). Receives one argument:
    * **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The Muuri.Item instance that is being animated.

### hide &nbsp;

Defines the hide animation. Set to `null` to disable hide animation completely.

  * Default value: `{duration: 300, easing: 'ease', styles: {opacity: 0, scale: 0.5}}`.
  * Accepted types: function, object, null.

When an object is provided Muuri's built-in animation engine is used and allows configuring the animation with following properties:

* **duration** &nbsp;&mdash;&nbsp; *number*
  * Default value: `300`.
  * Animation duration in milliseconds.
* **easing** &nbsp;&mdash;&nbsp; *array* / *string*
  * Default value: `'ease'`.
  * Accepts any valid [Velocity.js easing](http://velocityjs.org/#easing) value.
* **styles** &nbsp;&mdash;&nbsp; *object*
  * Default value: `{opacity: 0, scale: 0.5}`.
  * A hash of the animated [style properties](http://velocityjs.org/#propertiesMap) and their target values for the animation.

By providing a function you can define a fully customized animation. The function should return an object that contains the following methods:

* **start** &nbsp;&mdash;&nbsp; *function*
  * A function that starts the animation. Receives three arguments:
    * **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The Muuri.Item instance that is being animated.
    * **instant** &nbsp;&mdash;&nbsp; *boolean*
      * A boolean that determines if the styles should be applied instantly or with animation. If this is `true` the styles should be applied instantly instead of being animated.
    * **onFinished** &nbsp;&mdash;&nbsp; *function*
      * A function that should be called after the animation is successfully finished.
* **stop** &nbsp;&mdash;&nbsp; *function*
    * A function that stops the current animation (if running). Receives one argument:
      * **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
        * The Muuri.Item instance that is being animated.

### layout &nbsp;

Define how the items will be laid out.

  * Default value: `{fillGaps: false, horizontal: false, alignRight: false, alignBottom: false}`.
  * Accepted types: function, object.

Provide an object to configure the default layout algorithm with the following properties:

* **fillGaps** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * When `true` the algorithm goes through every item in order and places each item to the first available free slot, even if the slot happens to be visually *before* the previous element's slot. Practically this means that the items might not end up visually in order, but there will be less gaps in the grid. By default this option is `false` which basically means that the following condition will be always true when calculating the layout (assuming `alignRight` and `alignBottom` are `false`): `nextItem.top > prevItem.top || (nextItem.top === prevItem.top && nextItem.left > prevItem.left)`. This also means that the items will be visually in order.
* **horizontal** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  *  When `true` the grid works in landscape mode (grid expands to the right). Use for horizontally scrolling sites. When `false` the grid works in "portrait" mode and expands downwards.
* **alignRight** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * When `true` the items are aligned from right to left.
* **alignBottom** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * When `true` the items are aligned from the bottom up.

Alternatively you can provide a function to define a custom layout algorithm. The function will receive the `Muuri.Layout` instance as its context. A `Muuri.Layout` instance has the following properties:
* **grid** &nbsp;&mdash;&nbsp; *Muuri*
  * The related `Muuri` instance.
* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of the `Muuri.Item` instances that needs to be laid out.
* **slots** &nbsp;&mdash;&nbsp; *object*
  * A hash of new item positions. Define the new item positions using an object that contains the item's `left` and `top` values (in pixels, relative to the container element's content). Store the the positions to the object using the related item's id (`item._id`).
* **setWidth** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * Should container element width be set?
* **setHeight** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * Should container element height be set?
* **width** &nbsp;&mdash;&nbsp; *number*
  * The current width of the container element (without margin, border and padding).
* **height** &nbsp;&mdash;&nbsp; *number*
  * The current height of the container element (without margin, border and padding).

### layoutOnResize &nbsp;

Should Muuri automatically trigger `layoutItems` method on window resize? Set to `false` to disable. When a number or `true` is provided Muuri will automatically lay out the items every time window is resized. The provided number (`true` is transformed to `0`) equals to the amount of time (in milliseconds) that is waited before items are laid out after each window resize event.

* Default value: `100`.
* Accepted types: boolean, number.

### layoutOnInit &nbsp;

Should Muuri trigger `layout` method automatically on init?

* Default value: `true`.
* Accepted types: boolean.

### layoutDuration &nbsp;

The duration for item's layout animation in milliseconds. Set to `0` to disable.

* Default value: `300`.
* Accepted types: number.

### layoutEasing &nbsp;

The easing for item's layout animation. Accepts any valid [Velocity.js easing](http://velocityjs.org/#easing) value.

* Default value: `'ease'`.
* Accepted types: string.

### dragEnabled &nbsp;

Should items be draggable?

* Default value: `false`.
* Accepted types: boolean.

### dragContainer &nbsp;

Which item the dragged item should be appended to for the duration of the drag? If `null` the container element will be used.

* Default value: `null`.
* Accepted types: element, null.

### dragStartPredicate &nbsp;

A function that determines when dragging should start. If `null` the default predicate is used (dragging starts immediately).

* Default value: `null`.
* Accepted types: function, null.

The predicate function receives three arguments:
* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The `Muuri.Item` instance that's being dragged.
* **event**  &nbsp;&mdash;&nbsp; *object*
  * The drag event (Hammer.js event).
* **predicate** &nbsp;&mdash;&nbsp; *Predicate*
  * **predicate.resolve** &nbsp;&mdash;&nbsp; *function*
    * Resolves the predicate and initiates the item's drag procedure.
  * **predicate.reject** &nbsp;&mdash;&nbsp; *function*
    * Rejects the predicate and prevents the item's drag procedure from initiating until the user releases the item and starts dragging it again.
  * **predicate.isResolved** &nbsp;&mdash;&nbsp; *function*
    * Returns boolean. Check if the predicate is resolved.
  * **predicate.isRejected** &nbsp;&mdash;&nbsp; *function*
    * Returns boolean. Check if the predicate is rejected.

### dragSort &nbsp;

Should the items be sorted during drag?

* Default value: `true`.
* Accepted types: boolean.

### dragSortInterval &nbsp;

Defines the amount of time the dragged item must be still before `dragSortPredicate` function is called. The default `dragSortPredicate` is pretty intense which means that you might see some janky animations and/or an unresponsive UI if you set this value too low (`0` is definitely not recommended).

* Default value: `50`.
* Accepted types: number.

### dragSortPredicate &nbsp;

Defines the logic for the sort procedure during dragging an item.

* Default value: `{action: 'move', tolerance: 50}`.
* Accepted types: function, object.

If an object is provided the default sort predicate handler will be used. You can define the following properties:
* **action** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'move'`.
  * Allowed values: `'move'`, `'swap'`.
  * Should the dragged item be *moved* to the new position or should it *swap* places with the item it overlaps?
* **threshold** &nbsp;&mdash;&nbsp; *number*
  * Default value: `50`.
  * Allowed values: `1` - `100`.
  * How many percent the intersection area between the dragged item and the compared item should be from the maximum potential intersection area between the items before sorting is triggered.

Alternatively you can provide your own callback function where you can define your own custom sort logic. The callback receives one argument, which is the currently dragged Muuri.Item instance. The callback should return a *falsy* value if sorting should not occur. If, however, sorting should occur the callback should return an object containing the following properties: `action` ("move" or "swap"), `from` (the index of the Muuri.Item to be moved/swapped), `to` (the index the item should be moved to / swapped with). E.g returning `{action: 'move', from: 0, to: 1}` would move the first item as the second item.

### dragSortGroup &nbsp;

The grid's sort group, e.g. "groupA".

* Default value: `null`.
* Accepted types: string, null.

### dragSortConnections &nbsp;

Defines the sort groups that this instance's item's can be dragged to. Provide an array of sort groups (strings), e.g. `['groupA', 'groupC']`.

* Default value: `null`.
* Accepted types: array, null.

### dragReleaseDuration &nbsp;

The duration for item's drag release animation. Set to `0` to disable.

* Default value: `300`.
* Accepted types: number.

### dragReleaseEasing &nbsp;

The easing for item's drag release animation. Accepts any valid [Velocity.js easing](http://velocityjs.org/#easing) value.

* Default value: `'ease'`.
* Accepted types: array, string.

### containerClass &nbsp;

Container element's classname.

* Default value: `'muuri'`.
* Accepted types: string.

### itemClass &nbsp;

Item element's classname.

* Default value: `'muuri-item'`.
* Accepted types: string.

### itemVisibleClass &nbsp;

Visible item's classname.

* Default value: `'muuri-item-shown'`.
* Accepted types: string.

### itemHiddenClass &nbsp;

Hidden item's classname.

* Default value: `'muuri-item-hidden'`.
* Accepted types: string.

### itemPositioningClass &nbsp;

This classname will be added to the item element for the duration of positioning.

* Default value: `'muuri-item-positioning'`.
* Accepted types: string.

### itemDraggingClass &nbsp;

This classname will be added to the item element for the duration of drag.

* Default value: `'muuri-item-dragging'`.
* Accepted types: string.

### itemReleasingClass &nbsp;

This classname will be added to the item element for the duration of release.

* Default value: `'muuri-item-releasing'`.
* Accepted types: string.

## Methods

### grid.getElement()

Get the instance element.

**Returns** &nbsp;&mdash;&nbsp; *element*

**Examples**

```javascript
var elem = grid.getElement();
```

### grid.getRect()

Get instance's cached dimensions and offsets. Basically the same data as provided by [element.getBoundingClientRect()](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) method, just cached. The cached dimensions and offsets are subject to change whenever [layoutItems](#muurilayoutitems-instant-callback-) or [refresh](#muurirefresh) method is called. Note that Muuri uses rounded values (`Math.round(val)`) in all calculations.

**Returns** &nbsp;&mdash;&nbsp; *object*

* **obj.width** &nbsp;&mdash;&nbsp; *number*
  * The element's width in pixels (rounded).
* **obj.height** &nbsp;&mdash;&nbsp; *number*
  * The element's height in pixels (rounded).
* **obj.left** &nbsp;&mdash;&nbsp; *number*
  * The element's left offset in pixels (rounded).
* **obj.right** &nbsp;&mdash;&nbsp; *number*
  * The element's left offset + width in pixels (rounded).
* **obj.top** &nbsp;&mdash;&nbsp; *number*
  * The element's top offset in pixels (rounded).
* **obj.bottom** &nbsp;&mdash;&nbsp; *number*
  * The element's top offset + height in pixels (rounded).

**Examples**

```javascript
var rectData = grid.getRect();
```

### grid.getItems( [targets], [state] )

Get all items in the grid. Optionally you can provide specific targets (indices or elements) and filter the results by the items' state. Note that the returned array is not the same object that is used by the grid instance so modifying it will not affect the instance's items.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
  * Optional.
* **state** &nbsp;&mdash;&nbsp; *string*
  * Allowed values: `'active'`, `'inactive'`, `'visible'`, `'hidden'`, `'showing'`, `'hiding'`, `'positioning'`, `'dragging'`, `'releasing'`, `'migrating'`.
  * Default value: `undefined`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns an array of `Muuri.Item` instances.

**Examples**

```javascript
// Get all items, both active and inactive.
var allItems = grid.getItems();

// Get all active (visible) items.
var activeItems = grid.getItems('active');

// Get all inactive (hidden) items.
var inactiveItems = grid.getItems('inactive');

// Get the first item (active or inactive).
var firstItem = grid.getItems(0)[0];

// Get specific items by their elements (inactive or active).
var items = grid.getItems([elemA, elemB]);

// Get specific inactive items.
var items = grid.getItems([elemA, elemB], 'inactive');
```

### grid.refresh()

Calculate and cache the dimensions and offsets of the grid's container element.

**Examples**

```javascript
grid.refresh();
```

### grid.refreshItems( [items] )

Calculate the width and height of the provided items. By default all *active* items will be refreshed if no items are provided.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
  * Optional.

**Examples**

```javascript
// Refresh all active items
grid.refreshItems();

// Refresh the first item.
grid.refreshItems(0);

// Refresh all items which match the provided DOM elements.
grid.refreshItems([elemA, elemB]);

// Refresh specific items (instances of Muuri.Item).
grid.refreshItems([itemA, itemB]);
```

### grid.synchronize()

Order the item elements to match the order of the items. This comes handy if you need to keep the DOM structure matched with the order of the items. Note that if an item's element is not currently a child of the container element (if it is dragged for example) it is ignored and left untouched.

**Examples**

```javascript
grid.synchronize();
```

### grid.layout( [instant], [callback] )

Calculate item positions and move items to their calculated positions, unless they are already positioned correctly. The grid's height/width (depends on the layout algorithm) is also adjusted according to the position of the items.

**Parameters**

* **instant** &nbsp;&mdash;&nbsp; *boolean*
  * Should the items be positioned instantly without any possible animation?
  * Default value: `false`.
  * Optional.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * A callback function that is called after the items have positioned. Receives one argument: an array of all the items that were successfully positioned without interruptions.
  * Optional.

**Examples**

```javascript
// Layout items.
grid.layout();

// Layout items instantly (without animations).
grid.layout(true);

// Layout all items and define a callback that will be called
// after all items have been animated to their positions.
grid.layout(function (items) {
  console.log('layout done!');
});
```

### grid.add( elements, [index] )

Add new items by providing the elements you wish to add to the instance and optionally provide the index where you want the items to be inserted into. All elements that are not already children of the container element will be automatically appended to the container element.

If an element has it's CSS display property set to none it will be marked as *inactive* during the initiation process. As long as the item is *inactive* it will not be part of the layout, but it will retain it's index. You can activate items at any point with `grid.show()` method.

This method will automatically call `grid.layout()` if one or more of the added elements are visible. If only hidden items are added no layout will be called. All the new visible items are positioned without animation during their first layout.

**Parameters**

* **elements** &nbsp;&mdash;&nbsp; *array / element*
  * An array of DOM elements.
* **index** &nbsp;&mdash;&nbsp; *number*
  * The index where you want the items to be inserted in. A value of `-1` will insert the items to the end of the list while `0` will insert the items to the beginning. Note that the DOM elements are always just appended to the instance container regardless of the index value. You can use the `grid.synchronize()` method to arrange the DOM elments to the same order as the items.
  * Default value: `0`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns an array of `Muuri.Item` instances.

**Examples**

```javascript
// Add two new items to the beginning.
grid.add([elemA, elemB]);

// Add two new items to the end.
grid.add([elemA, elemB], -1);
```

### grid.remove( items, [removeElement] )

Remove items from the instance.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
* **removeElement** &nbsp;&mdash;&nbsp; *boolean*
  * Should the associated DOM element be removed from the DOM?
  * Default value: `false`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns the indices of the removed items.

**Examples**

```javascript
// Remove the first item, but keep the element in the DOM.
grid.remove(0);

// Remove items and the associated elements.
grid.remove([elemA, elemB], true);
```


### grid.show( items, [instant], [callback] )

Show the targeted items.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or indices.
* **instant** &nbsp;&mdash;&nbsp; *boolean*
  * Should the items be shown instantly without any possible animation?
  * Default value: `false`.
  * Optional.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * A callback function that is called after the items are shown.
  * Optional.

**Examples**

```javascript
// Show items with animation (if any).
grid.show([elemA, elemB]);

// Show items instantly without animations.
grid.show([elemA, elemB], true);

// Show items with callback (and with animations if any).
grid.show([elemA, elemB], function (items) {
  console.log('items shown!');
});
```

### grid.hide( items, [instant], [callback] )

Hide the targeted items.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
* **instant** &nbsp;&mdash;&nbsp; *boolean*
  * Should the items be hidden instantly without any possible animation?
  * Default value: `false`.
  * Optional.
* **callback** &nbsp;&mdash;&nbsp; *function*
  * A callback function that is called after the items are hidden.
  * Optional.

**Examples**

```javascript
// Hide items with animation.
grid.hide([elemA, elemB]);

// Hide items instantly without animations.
grid.hide([elemA, elemB], true);

// Hide items and call the callback function after
// all items are hidden.
grid.hide([elemA, elemB], function (items) {
  console.log('items hidden!');
});
```

### grid.filter( predicate, [instant] )

Filter items. Expects at least one argument, a predicate, which should be either a function or a string. The predicate callback is executed for every item in the instance. If the return value of the predicate is truthy the item in question will be shown and otherwise hidden. The predicate callback receives two arguments: the item instance and the instance's element. If the predicate is a string it is considered to be a selector and it is checked against every item element in the instance with the native element.matches() method. All the matching items will be shown and others hidden.

**Parameters**

* **predicate** &nbsp;&mdash;&nbsp; *function / string*
  * A predicate callback or a selector.
* **instant** &nbsp;&mdash;&nbsp; *boolean*
  * Should the items be shown/hidden instantly without any possible animation?
  * Default value: `false`.
  * Optional.

**Examples**

```javascript
// Show all items that have the attribute "data-foo".
grid.filter(function (item, element) {
  return element.hasAttribute('data-foo');
});

// Or simply just...
grid.filter('[data-foo]');

// Show all items that have a class foo.
grid.filter('.foo');
```

### grid.sort( compareFunction )

Sort items. In all it's simplicity this is just a lightweight wrapper for Array.prototype.sort(), which calls `grid._items.sort(compareFunction)` internally.

**Parameters**

* **compareFunction** &nbsp;&mdash;&nbsp; *function*
  * Refer to the [Array.prototype.sort()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) documentation.

**Examples**

```javascript
// Sort items by data-id attribute value.
grid.sort(function (itemA, itemB) {
  // Extract data-ids (as integers) from the items.
  var aId = parseInt(itemA.getElement().getAttribute('data-id'));
  var bId = parseInt(itemB.getElement().getAttribute('data-id'));
  // Sort in ascending order.
  return aId > bId ? 1 : -1;
  // Descending would be:
  // return aId < bId ? 1 : -1;
});
```

### grid.move( item, position, [action] )

Move an item to another position in the grid.

**Parameters**

* **item** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item.
* **position** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item.
* **action** &nbsp;&mdash;&nbsp; *string*
  * Accepts the following values:
    * `'move'`: moves item in place of another item.
    * `'swap'`: swaps position of items.
  * Default value: `'move'`.
  * Optional.

**Examples**

```javascript
// Move elemA to the index of elemB.
grid.move(elemA, elemB);

// Move first item as last.
grid.move(0, -1);

// Swap positions of elemA and elemB.
grid.move(elemA, elemB, 'swap');

// Swap positions of the first and the last item.
grid.move(0, -1, 'swap');
```

### grid.send( item, grid, [options] )

Send an item into another grid.

**Parameters**

* **item** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item.
* **grid** &nbsp;&mdash;&nbsp; *Muuri*
  * The grid where the item should be sent to.
* **options** &nbsp;&mdash;&nbsp; *object*
  * **position** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
    * To which position (index/element/item) should the item be positioned in the new grid?
    * Default value: `0`.
  * **appendTo** &nbsp;&mdash;&nbsp; *element*
    * To which element should the item's element be appended to for the duration of the send animation?
    * Default value: `document.body`.
  * **instant** &nbsp;&mdash;&nbsp; *boolean*
    * Should the item be sent instantly without any possible animation?
    * Default value: `false`.

**Examples**

```javascript
// Move the first item of gridA as the last item of gridB.
gridA.send(0, gridB, {
  position: -1
});
```

### grid.on( event, listener )

Bind an event on the Muuri instance.

**Parameters**

* **event** &nbsp;&mdash;&nbsp; *string*
* **listener** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the instance.

**Examples**

```javascript
grid.on('layoutEnd', function (items) {
  console.log(items);
});
```

### grid.off( event, listener )

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
.on('layoutEnd', listener)
.off('layoutEnd', listener);
```

### grid.destroy()

Destroy the instance.

**Examples**

```javascript
grid.destroy();
```

## Item methods

### item.getGrid()

Get the instance's grid instance.

**Returns** &nbsp;&mdash;&nbsp; *Muuri*

**Examples**

```javascript
var grid = item.getMuuri();
```


### item.getElement()

Get the instance element.

**Returns** &nbsp;&mdash;&nbsp; *element*

**Examples**

```javascript
var elem = item.getElement();
```

### item.getWidth()

Get instance element's cached width. The returned value includes the element's paddings and borders. Note that the values are rounded with `Math.round()`.

**Returns** &nbsp;&mdash;&nbsp; *number*

**Examples**

```javascript
var width = item.getWidth();
```

### item.getHeight()

Get instance element's cached height. The returned value includes the element's paddings and borders. Note that the values are rounded with `Math.round()`.

**Returns** &nbsp;&mdash;&nbsp; *number*

**Examples**

```javascript
var height = item.getHeight();
```

### item.getMargin()

Get instance element's cached margins. Note that the values are rounded with `Math.round()`.

**Returns** &nbsp;&mdash;&nbsp; *object*

* **obj.left** &nbsp;&mdash;&nbsp; *number*
* **obj.right** &nbsp;&mdash;&nbsp; *number*
* **obj.top** &nbsp;&mdash;&nbsp; *number*
* **obj.bottom** &nbsp;&mdash;&nbsp; *number*

**Examples**

```javascript
var margin = item.getMargin();
```

### item.getPosition()

Get instance element's cached position (relative to the container element).

**Returns** &nbsp;&mdash;&nbsp; *object*

* **obj.left** &nbsp;&mdash;&nbsp; *number*
* **obj.top** &nbsp;&mdash;&nbsp; *number*

**Examples**

```javascript
var position = item.getPosition();
```

### item.isActive()

Check if the item is currently *active*. Only active items are considered to be part of the layout.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
var isActive = item.isActive();
```

### item.isVisible()

Check if the item is currently *visible*.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
var isVisible = item.isVisible();
```

### item.isShowing()

Check if the item is currently animating to visible.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
var isShowing = item.isShowing();
```

### item.isHiding()

Check if the item is currently animating to hidden.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
var isHiding = item.isHiding();
```

### item.isPositioning()

Check if the item is currently being positioned.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
var isPositioning = item.isPositioning();
```

### item.isDragging()

Check if the item is currently being dragged.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
var isDragging = item.isDragging();
```

### item.isReleasing()

Check if the item is currently being released.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
var isReleasing = item.isReleasing();
```

### item.isMigrating()

Check if the item is currently being migrated from a grid to another.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

**Examples**

```javascript
var isMigrating = item.isMigrating();
```

## Events

### synchronize

Triggered when the `grid.synchronize()` is called.

**Examples**

```javascript
grid.on('synchronize', function () {
  console.log('Synced!');
});
```

### layoutStart

Triggered when `grid.layout()` method is called, just before the items are positioned.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are about to be positioned.

**Examples**

```javascript
grid.on('layoutStart', function (items) {
  console.log(items);
});
```

### layoutEnd

Triggered when `grid.layout()` method is called, after the items have positioned.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully positioned.

**Examples**

```javascript
grid.on('layoutEnd', function (items) {
  console.log(items);
});
```

### add

Triggered when `grid.add()` method is called.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully added to the muuri instance.

**Examples**

```javascript
grid.on('add', function (items) {
  console.log(items);
});
```

### remove

Triggered when `grid.remove()` method is called.

**Arguments**

* **indices** &nbsp;&mdash;&nbsp; *array*
  * Indices of the `Muuri.Item` instances that were succesfully removed from the muuri instance.

**Examples**

```javascript
grid.on('remove', function (indices) {
  console.log(indices);
});
```

### showStart

Triggered when `grid.show()` method is called, just before the items are shown (with or without animation).

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are about to be shown.

**Examples**

```javascript
grid.on('showStart', function (items) {
  console.log(items);
});
```

### showEnd

Triggered when `grid.show()` method is called, after the items are shown (with or without animation).

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully shown without interruptions. If an item is already visible when the `grid.show()` method is called it is cosidered as successfully shown.

**Examples**

```javascript
grid.on('showEnd', function (items) {
  console.log(items);
});
```

### hideStart

Triggered when `grid.hide()` method is called, just before the items are hidden (with or without animation).

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are about to be hidden.

**Examples**

```javascript
grid.on('hideStart', function (items) {
  console.log(items);
});
```

### hideEnd

Triggered when `grid.hide()` method is called, after the items are hidden (with or without animation).

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully hidden without interruptions. If an item is already hidden when the `grid.hide()` method is called it is considered as successfully hidden.

**Examples**

```javascript
grid.on('hideEnd', function (items) {
  console.log(items);
});
```

### filter

Triggered when `grid.filter()` method is called.

**Arguments**

* **itemsToShow** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are shown.
* **itemsToHide** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are hidden.

**Examples**

```javascript
grid.on('filter', function (itemsToShow, itemsToHide) {
  console.log(itemsToShow);
  console.log(itemsToHide);
});
```

### sort

Triggered when `grid.sort()` method is called.

**Arguments**

* **itemsCurrent** &nbsp;&mdash;&nbsp; *array*
  * An array of all the items in their current order.
* **itemsBefore** &nbsp;&mdash;&nbsp; *array*
  * An array of all the items in their previous order.

**Examples**

```javascript
grid.on('sort', function (itemsCurrent, itemsBefore) {
  console.log(itemsCurrent);
  console.log(itemsBefore);
});
```

### move

Triggered when `grid.move()` method is called.

**Arguments**

* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The item that was moved.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.
    * **data.action** &nbsp;&mdash;&nbsp; *string*
      * "move" or "swap".

**Examples**

```javascript
grid.on('move', function (data) {
  console.log(data);
});
```

### send

Triggered for the originating grid after `grid.send()` method is called.

**Arguments**

* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The item that was sent.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent to.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

**Examples**

```javascript
grid.on('send', function (data) {
  console.log(data);
});
```

### receiveStart

Triggered for the receiving grid after `grid.send()` method is called.

**Arguments**

* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The item that was sent.
    * **data.fromGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent from.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

**Examples**

```javascript
grid.on('receiveStart', function (data) {
  console.log(data);
});
```

### receiveEnd

Triggered for the receiving grid after `grid.send()` method is called and after the item has animated to the new position.

**Arguments**

* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The item that was sent.
    * **data.fromGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent from.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

**Examples**

```javascript
grid.on('receiveEnd', function (data) {
  console.log(data);
});
```

### dragStart

Triggered when dragging of an item begins.

**Arguments**

* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.
* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.

**Examples**

```javascript
grid.on('dragStart', function (event, item) {
  console.log(event);
  console.log(item);
});
```

### dragMove

Triggered when an item is dragged.

**Arguments**

* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.
* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.

**Examples**

```javascript
grid.on('dragMove', function (event, item) {
  console.log(event);
  console.log(item);
});
```

### dragScroll

Triggered when any of the scroll parents of a dragged item is scrolled.

**Arguments**

* **event** &nbsp;&mdash;&nbsp; *object*
  * The scroll event data.
* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.

**Examples**

```javascript
grid.on('dragScroll', function (event, item) {
  console.log(event);
  console.log(item);
});
```


### dragSort

Triggered when the grid is sorted during drag. Note that this has nothing to do with the `grid.sort()` method and won't be triggered when the `.sort()` method called. This is specifically triggered when the dragging causes the sorting. Additionally, this is only triggered when the sorting happens within the current grid, not when an item is dragged into another grid.

**Arguments**

* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.
* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The dragged item.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.
    * **data.action** &nbsp;&mdash;&nbsp; *string*
      * "move" or "swap".

**Examples**

```javascript
grid.on('dragSort', function (event, data) {
  console.log(event);
  console.log(data);
});
```

### dragSend

Triggered for the sending grid when an item is dragged into another grid.

**Arguments**

* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.
* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The dragged item.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent to.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

**Examples**

```javascript
grid.on('dragSend', function (event, data) {
  console.log(event);
  console.log(data);
});
```

### dragReceive

Triggered for the receiving grid when an item is dragged into another grid.

**Arguments**

* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.
* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The dragged item.
    * **data.fromGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent from.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

**Examples**

```javascript
grid.on('dragReceive', function (event, data) {
  console.log(event);
  console.log(data);
});
```

### dragReceiveDrop

Triggered for the receiving grid when an item is dropped into another grid.

**Arguments**

* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.
* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.

**Examples**

```javascript
grid.on('dragReceiveDrop', function (event, item) {
  console.log(event);
  console.log(item);
});
```

### dragEnd

Triggered after item dragging ends.

**Arguments**

* **event** &nbsp;&mdash;&nbsp; *object*
  * Hammer.js event data.
* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.

**Examples**

```javascript
grid.on('dragEnd', function (event, item) {
  console.log(event);
  console.log(item);
});
```

### dragReleaseStart

Triggered when item is released (right after dragging ends).

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The released item.

**Examples**

```javascript
grid.on('dragReleaseStart', function (item) {
  console.log(item);
});
```

### dragReleaseEnd

Triggered after item has been released and animated back to it's position.

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The released item.

**Examples**

```javascript
grid.on('dragReleaseEnd', function (item) {
  console.log(item);
});
```

### destroy

Triggered after `grid.destroy()` method is called.

**Examples**

```javascript
grid.on('destroy', function () {
  console.log('Muuri is no more...');
});
```

## License

Copyright &copy; 2015 Haltu Oy. Licensed under **[the MIT license](LICENSE.md)**.

