# Muuri

Muuri makes it easy to build responsive grid layouts that can be sorted and filtered. On top of that Muuri has built-in support for making the grid items draggable and thus allowing drag & drop sorting of the grid items. Basically Muuri is  (or aims to be) a combination of [Packery](https://github.com/metafizzy/packery), [Isotope](http://isotope.metafizzy.co/) and [jQuery UI sortable](https://jqueryui.com/sortable/).

The best part of Muuri is it's API. It's designed to be as simple as possible while allowing you to do a multitude of things. For example, there are no built-in API methods for filtering and sorting the grid items because it's trivial to build your own custom filtering and sorting with the API.

Muuri's layout system allows positioning the grid items within the container in pretty much any way imaginable. The default "First Fit" bin packing layout algorithm positions items pretty much the same way as [Packery](https://github.com/metafizzy/packery) does. However, you can also provide your own layout algorithm to position the items in any way you want.

Currently Muuri uses [Velocity](https://github.com/julianshapiro/velocity) for animating the grid items (positioining/showing/hiding) and [Hammer.js](https://github.com/hammerjs/hammer.js) for handling the dragging. Hammer.js is an optional dependency that is only required if dragging is enabled, but Velocity is a hard dependency.

**A word of warning.** This library is currently under active development and not yet recommended to be used in production. The API is likely to change a bit before the magical v1.0.0, unit tests are still under contruction and a few major features completely missing.

## Table of contents

* [Getting started](#getting-started)
* [Options](#options)
* [Methods](#methods)
  * [muuri.on( event, listener )](#muurion-event-listener-)
  * [muuri.off( eventName, listener )](#muurioff-eventname-listener-)
  * [muuri.refresh( [targets] )](#muurirefresh-targets-)
  * [muuri.get( [targets], [filter] )](#muuriget-targets-filter-)
  * [muuri.add( elements, [index] )](#muuriadd-elements-index-)
  * [muuri.remove( targets, [removeElement] )](#muuriremove-targets-removeelement-)
  * [muuri.synchronize()](#muurisynchronize)
  * [muuri.layout( [instant], [callback] )](#muurilayout-instant-callback-)
  * [muuri.show( targets, [instant], [callback] )](#muurishow-targets-instant-callback-)
  * [muuri.hide( targets, [instant], [callback] )](#muurihide-targets-instant-callback-)
  * [muuri.indexOf( target )](#muuriindexof-target-)
  * [muuri.move( targetFrom, targetTo )](#muurimove-targetfrom-targetto-)
  * [muuri.swap( targetA, targetB )](#muuriswap-targeta-targetb-)
  * [muuri.destroy()](#muuridestroy)
* [Events](#events)
  * [refresh](#refresh)
  * [synchronize](#synchronize)
  * [layoutstart](#layoutstart)
  * [layoutend](#layoutend)
  * [showstart](#showstart)
  * [showend](#showend)
  * [hidestart](#hidestart)
  * [hideend](#hideend)
  * [move](#move)
  * [swap](#swap)
  * [add](#add)
  * [remove](#remove)
  * [dragstart](#dragstart)
  * [dragmove](#dragmove)
  * [dragscroll](#dragscroll)
  * [dragend](#dragend)
  * [releasestart](#releasestart)
  * [releaseend](#releaseend)
  * [destroy](#destroy)
* [License](#license)

## Getting started

Muuri depends on the following libraries:
* [Velocity](https://github.com/julianshapiro/velocity) (1.2.x)
* [Hammer.js](https://github.com/hammerjs/hammer.js) (2.0.x) optional, required only if you are using the draggin feature

**First, include Muuri and it's dependencies in your site.**

```html
<script src="velocity.js"></script>
<script src="hammer.js"></script>
<!-- Needs to be within in body element or have access to body element -->
<script src="muuri.js"></script>
```

An important note for including Muuri to your site is that it needs to have access to the `body` element when it's loaded. Muuri does some feature checking on init and might not work correctly if it does not have access to the `body` element.

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

* The grid element must be "positioned" meaning that it's CSS position property must be set to *relative*, *absolute* or *fixed*. Also note that Muuri automatically resizes the container element depending on the area the items cover. More specifically Muuri adjusts the container element's *height* property, which means that if the element's *box-sizing* property is set to *border-box* applying border or padding to the element might not render the desired results.
* The item elements must have their CSS position set to *absolute* and their display property set to *block*, unless of course the elements have their display set to *block* inherently.
* The item elements must not have any CSS transitions or animations applied to them since it might conflict with Velocity's animations.
* You can control the gaps between the tiles by giving some margin to the item elements.

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

* The bare minimum config is demonstrated below. You must always provide Muuri with the container element and the initial item elements.
* Be sure to check out the all the available [options](#options), [methods](#methods) and [events](#events).

```javascript
var grid = new Muuri({
  container: document.getElementsByClassName('grid')[0],
  items: document.getElementsByClassName('item')
});
```

**And here's a complete example with all the pieces together.**

```html
<!doctype html>
<html>
  <head>
      <style>
        * {
          -moz-box-sizing: border-box;
          -webkit-box-sizing: border-box;
          box-sizing: border-box;
        }
        html {
          overflow-y: scroll;
        }
        body {
          margin: 0;
          padding: 0;
        }
        .grid {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          margin: 50px;
          background: #ccc;
        }
        .item {
          position: absolute;
          width: 100px;
          height: 100px;
          line-height: 100px;
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
        .item.h2 {
          height: 210px;
          line-height: 210px;
        }
        .item.w2 {
          width: 210px;
        }
        .item-content {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          font-size: 24px;
          background: #000;
          color: #fff;
        }
      </style>
  </head>
  <body>
    <div class="grid">
      <div class="item"><div class="item-content">1</div></div>
      <div class="item w2"><div class="item-content">2</div></div>
      <div class="item h2"><div class="item-content">3</div></div>
      <div class="item"><div class="item-content">4</div></div>
      <div class="item w2 h2"><div class="item-content">5</div></div>
      <div class="item"><div class="item-content">6</div></div>
      <div class="item w2 h2"><div class="item-content">7</div></div>
      <div class="item"><div class="item-content">8</div></div>
      <div class="item h2"><div class="item-content">9</div></div>
      <div class="item"><div class="item-content">10</div></div>
      <div class="item w2"><div class="item-content">11</div></div>
      <div class="item"><div class="item-content">12</div></div>
    </div>
    <script src="velocity.js"></script>
    <script src="hammer.js"></script>
    <script src="muuri.js"></script>
    <script>
      var grid = new Muuri({
        container: document.getElementsByClassName('grid')[0],
        items: document.getElementsByClassName('item')
      });
    </script>
  </body>
</html>
```

## Options

* **`container`** &nbsp;&mdash;&nbsp; *Element*
  * Default value: `null`.
  * The container element. Must be always defined.
* **`items`** &nbsp;&mdash;&nbsp; *Array of Elements*
  * Default value: `null`.
  * The initial item elements wrapped in an array. The elements must be children of the container element.
* **`positionDuration`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `300`.
  * The duration for item's positioning animation in milliseconds. Set to `0` to disable.
* **`positionEasing`** &nbsp;&mdash;&nbsp; *String / Array*
  * Default value: `"ease-out"`.
  * The easing for item's positioning animation. Read [Velocity's easing documentation](http://julian.com/research/velocity/#easing) for more info on possible easing values.
* **`show`** &nbsp;&mdash;&nbsp; *Object*
  * Default value: `{duration: 300, easing: "ease-out"}`.
  * The object should contain *duration* (integer, milliseconds) and [*easing*](http://julian.com/research/velocity/#easing) properties. Set to *null* to disable hide animation altogether.
* **`hide`** &nbsp;&mdash;&nbsp; *Object*
  * Default value: `{duration: 300, easing: "ease-out"}`.
  * The object should contain *duration* (integer, milliseconds) and [*easing*](http://julian.com/research/velocity/#easing) properties. Set to *null* to disable hide animation altogether.
  * Define row height for the grid (integer) or set to `"auto"` if you want Muuri to automatically calculate this for you based on the height of the items in the Muuri instance.
* **`layout`** &nbsp;&mdash;&nbsp; *Array / Function / String*
  * Default value: `"firstFit"`.
  * Define the layout method to be used for calculating the positions of the items. If you provide a string or an array Muuri will try to locate a registered layout method in `Muuri.Layout.methods` object. Currently there is only one built-in mehthod - `"firstFit"`. If you are using the array syntax the first value should be a string (name of the method) and the second value (optional) should be a configuration object. For example, if you wanted to use the default method on a page that scrolls horizontally you could set this option to: `["firstFit", {horizontal: true}]`. If you provide a function you can fully control the layout of the items. The function will receive a `Muuri.Layout` instance as it's context which you can manipulate as much as you want to get the items to the wanted positions.  
  * `firstFit`
    * `horizontal` (type: *boolean*, default: `false`)
      *  When `true` the grid works in landscape mode (grid expands to the right). Good for horizontally scrolling sites.
    * `alignRight` (type: *boolean*, default: `false`)
      * When `true` the items are aligned from right to left.
    * `alignBottom` (type: *boolean*, default: `false`)
      * When `true` the items are aligned from the bottom up.
* **`layoutOnResize`** &nbsp;&mdash;&nbsp; *Null / Number*
  * Default value: `100`.
  * Should Muuri automatically trigger layout on window resize? Set to `null` to disable. When a number (`0` or greater) is provided Muuri will automatically trigger layout when window is resized. The provided number equals to the amount of time (in milliseconds) that is waited before the layout is triggered after each resize event. The layout method is wrapped in a debouned function in order to avoid unnecessary layout calls.
* **`layoutOnInit`** &nbsp;&mdash;&nbsp; *Boolean*
  * Default value: `true`.
  * Should Muuri trigger layout automatically on init?
* **`dragEnabled`** &nbsp;&mdash;&nbsp; *Boolean*
  * Default value: `false`.
  * Should items be draggable?
* **`dragPredicate`** &nbsp;&mdash;&nbsp; *Function*
  * Default value: `null`.
  * A function that determines when dragging should start. Set to null to use the default predicate.
* **`dragSort`** &nbsp;&mdash;&nbsp; *Boolean*
  * Default value: `true`.
  * Should the items be sorted during drag?
* **`dragContainer`** &nbsp;&mdash;&nbsp; *Element*
  * Default value: `document.body`.
  * Which item should the dragged item be appended to for the duration of the drag?
* **`dragReleaseDuration`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `300`.
  * The duration for item's drag release animation. Set to `0` to disable.
* **`dragReleaseEasing`** &nbsp;&mdash;&nbsp; *String / Array*
  * Default value: `"ease-out"`.
  * The easing for item's drag release animation. Read [Velocity's easing documentation](http://julian.com/research/velocity/#easing) for more info on possible easing values.
* **`dragOverlapInterval`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `50`.
  * When an item is dragged around the grid Muuri automatically checks if the item overlaps another item enough to move the item in it's place. The overlap check method is debounced and this option defines the debounce interval in milliseconds. In other words, this is option defines the amount of time the dragged item must be still before an overlap is checked.
* **`dragOverlapTolerance`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `50`.
  * Allowed values: `1` - `100`.
  * How many percent the intersection area between the dragged item and the compared item should be from the maximum potential intersection area between the two items in order to justify for the dragged item's replacement.
* **`dragOverlapAction`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"move"`.
  * Allowed values: `"move"`, `"swap"`.
  * Should the dragged item be *moved* to the new position or should it *swap* places with the item it overlaps?
* **`containerClass`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"muuri"`.
  * Container element classname.
* **`itemClass`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"muuri-item"`.
  * Item element classname.
* **`shownClass`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"muuri-shown"`.
  * Visible item classname.
* **`hiddenClass`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"muuri-hidden"`.
  * Hidden item classname.
* **`positioningClass`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"muuri-positioning"`.
  * This classname will be added to the item element for the duration of positioing.
* **`draggingClass`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"muuri-dragging"`.
  * This classname will be added to the item element for the duration of drag.
* **`releasingClass`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"muuri-releasing"`.
  * This classname will be added to the item element for the duration of release.

**Modify default settings**

The default settings are stored in `Muuri.defaultSettings` object.

```javascript
Muuri.defaultSettings.containerDuration = 400;
Muuri.defaultSettings.dragOverlapAction = 'swap';
```

**Quick reference**

```javascript
var defaults = {

    // Container
    container: null,

    // Items
    items: [],
    positionDuration: 300,
    positionEasing: 'ease-out',
    show: {
      duration: 300,
      easing: 'ease-out'
    },
    hide: {
      duration: 300,
      easing: 'ease-out'
    },

    // Layout
    colWidth: 'auto',
    rowHeight: 'auto',
    layoutOnResize: 100,
    layoutOnInit: true,

    // Drag & Drop
    dragEnabled: false,
    dragPredicate: null,
    dragSort: true,
    dragContainer: document.body,
    dragReleaseDuration: 300,
    dragReleaseEasing: 'ease-out',
    dragOverlapInterval: 50,
    dragOverlapTolerance: 50,
    dragOverlapAction: 'move',

    // Classnames
    containerClass: 'muuri',
    itemClass: 'muuri-item',
    shownClass: 'muuri-shown',
    hiddenClass: 'muuri-hidden',
    positioningClass: 'muuri-positioning',
    draggingClass: 'muuri-dragging',
    releasingClass: 'muuri-releasing'

};
```

## Methods

### `muuri.on( event, listener )`

Bind an event on the Muuri instance.

**Parameters**

* **event** &nbsp;&mdash;&nbsp; *string*
* **listener** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *Object*

Returns the instance.

**Examples**

```javascript
muuri.on('layoutend', function (items) {
  console.log(items);
});
```

&nbsp;

### `muuri.off( eventName, listener )`

Unbind an event from the Muuri instance.

**Parameters**

* **event** &nbsp;&mdash;&nbsp; *string*
* **listener** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *Object*

Returns the instance.

**Examples**

```javascript
var listener = function (items) {
  console.log(items);
};

muuri
.on('layoutend', listener)
.off('layoutend', listener);
```

### `muuri.refresh( [targets] )`

Recalculate the width and height of the provided targets. If no targets are provided all *active* items will be refreshed.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * Optional.
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).

**Examples**

```javascript
// Refresh all active items
muuri.refresh();

// Refresh the first item.
muuri.refresh(0);

// Refresh all items which match the provided DOM elements.
muuri.refresh([elemA, elemB]);

// Refresh specific items (instances of Muuri.Item).
muuri.refresh([itemA, itemB]);
```

### `muuri.get( [targets], [filter] )`

Get all items. Optionally you can provide specific targets (indices or elements) and filter the results by the items' state (active/inactive). Note that the returned array is not the same object used by the instance so modifying it will not affect instance's items. All items that are not found are omitted from the returned array.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * Optional.
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
* **filter** &nbsp;&mdash;&nbsp; *string*
  * Optional.
  * Default value: `undefined`.
  * Allowed values: `"active"`, `"inactive"`.
  * Filter the returned array by the items' state. For example, if set to `"active"` all *inactive* items will be removed from the returned array.

**Returns** &nbsp;&mdash;&nbsp; *Array*

Returns an array of `Muuri.Item` instances.

**Examples**

```javascript
// Get all items, active and inactive.
var allItems = muuri.get();

// Get all active items.
var activeItems = muuri.get('active');

// Get all inactive items.
var inactiveItems = muuri.get('inactive');

// Get the first item.
var firstItem = muuri.get(0)[0];

// Get specific items by their elements.
var items = muuri.get([elemA, elemB]);

// Get specific inactive items.
var items = muuri.get([elemA, elemB], 'inactive');
```

### `muuri.add( elements, [index] )`

Add new items by providing the elements you wish to add to the instance and optionally provide the index where you want the items to be inserted into. All elements that are not already children of the container element will be automatically appended to the container.

If an element has it's CSS display property set to none it will be marked as *inactive* during the initiation process. As long as the item is *inactive* it will not be part of the layout, but it will retain it's index. You can activate items at any point with `muuri.show()` method.

This method will automatically call `muuri.layout()` if one or more of the added elements are visible. If only hidden items are added no layout will be called. All the new visible items are positioned without animation during their first layout.

**Parameters**

* **elements** &nbsp;&mdash;&nbsp; *array / element*
  * An array of DOM elements.
* **index** &nbsp;&mdash;&nbsp; *number*
  * Optional.
  * Default value: `0`.
  * The index where you want the items to be inserted in. A value of `-1` will insert the items to the end of the list while `0` will insert the items to the beginning. Note that the DOM elements are always just appended to the instance container regardless of the index value. You can use the `muuri.synchronize()` method to arrange the DOM elments to the same order as the items.

**Returns** &nbsp;&mdash;&nbsp; *Array*

Returns an array of `Muuri.Item` instances.

**Examples**

```javascript
// Add two new items to the beginning.
muuri.add([elemA, elemB]);

// Add two new items to the end.
muuri.add([elemA, elemB], -1);
```

### `muuri.remove( targets, [removeElement] )`

Remove items from the instance.

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of DOM elements and/or `Muuri.Item` instances and/or integers (which describe the index of the item).
* **removeElement** &nbsp;&mdash;&nbsp; *boolean*
  * Optional.
  * Default value: `false`.
  * Should the associated DOM element be removed or not?

**Returns** &nbsp;&mdash;&nbsp; *Array*

Returns the indices of the removed items.

**Examples**

```javascript
// Remove the first item, but keep the element in the DOM.
muuri.remove(0);

// Remove items and the associated elements.
muuri.remove([elemA, elemB], true);
```

### `muuri.synchronize()`

Order the item elements to match the order of the items. If the item's element is not a child of the container it is ignored and left untouched. This comes handy if you need to keep the DOM structure matched with the order of the items.

**Examples**

```javascript
muuri.synchronize();
```

### `muuri.layout( [instant], [callback] )`

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
// Layout with animations (if any).
muuri.layout();

// Layout instantly without animations.
muuri.layout(true);

// Layout with callback (and with animations if any).
muuri.layout(function (items, layoutData) {
  console.log('layout done!');
});
```

### `muuri.show( targets, [instant], [callback] )`

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
muuri.show([elemA, elemB]);

// Show items instantly without animations.
muuri.show([elemA, elemB], true);

// Show items with callback (and with animations if any).
muuri.show([elemA, elemB], function (items) {
  console.log('items shown!');
});
```

### `muuri.hide( targets, [instant], [callback] )`

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
// Hide items with animation (if any).
muuri.hide([elemA, elemB]);

// Hide items instantly without animations.
muuri.hide([elemA, elemB], true);

// Hide items with callback (and with animations if any).
muuri.hide([elemA, elemB], function (items) {
  console.log('items hidden!');
});
```

### `muuri.indexOf( target )`

Get item's index.

**Parameters**

* **target** &nbsp;&mdash;&nbsp; *element / Muuri.Item*

**Returns** &nbsp;&mdash;&nbsp; *number / null*

Returns the target's index or null if the target is not found.

**Examples**

```javascript
var index = muuri.indexOf(elemA);
```

### `muuri.move( targetFrom, targetTo )`

Move item to another index or in place of another item.

**Parameters**

* **targetFrom** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item as an integer.
* **targetTo** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item as an integer.

**Examples**

```javascript

// Move elemA to the index of elemB.
muuri.move(elemA, elemB);

// Move first item as last.
muuri.move(0, -1);
```

### `muuri.swap( targetA, targetB )`

Swap positions of two items.

**Parameters**

* **targetA** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item as an integer.
* **targetB** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * DOM element or `Muuri.Item` instance or index of the item as an integer.

**Examples**

```javascript
// Swap positions of elemA and elemB.
muuri.swap(elemA, elemB);

// Swap positions of the first and the last item.
muuri.swap(0, -1);
```

### `muuri.destroy()`

Destroy the instance.

**Examples**

```javascript
muuri.destroy();
```

## Events

### `refresh`

Triggered after the `muuri.refresh()` method is called.

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances which were refreshed.

**Examples**

```javascript
muuri.on('refresh', function (items) {
  console.log(items);
});
```

### `synchronize`

Triggered after the `muuri.synchronize()` is called.

**Examples**

```javascript
muuri.on('synchronize', function () {
  console.log('Synced!');
});
```

### `layoutstart`

Triggered when `muuri.layout()` method is called, just before the items are positioned.

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully positioned. If, for example, an item is being dragged it is ignored by the layout method.
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
muuri.on('layoutstart', function (items, layout) {
  console.log(items);
  console.log(layout);
});
```

### `layoutend`

Triggered when `muuri.layout()` method is called, after the items have positioned.

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully positioned. If, for example, an item is being dragged it is ignored by the layout method.
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
muuri.on('layoutend', function (items, layout) {
  console.log(items);
  console.log(layout);
});
```

### `showstart`

Triggered when `muuri.show()` method is called, just before the items are shown (with or without animation).

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are about to be shown.

**Examples**

```javascript
muuri.on('showstart', function (items) {
  console.log(items);
});
```

### `showend`

Triggered when `muuri.show()` method is called, after the items are shown (with or without animation).

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully shown without interruptions. If an item is already visible when the `muuri.show()` method is called it is cosidered as successfully shown.

**Examples**

```javascript
muuri.on('showend', function (items) {
  console.log(items);
});
```

### `hidestart`

Triggered when `muuri.hide()` method is called, just before the items are hidden (with or without animation).

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that are about to be hidden.

**Examples**

```javascript
muuri.on('hidestart', function (items) {
  console.log(items);
});
```

### `hideend`

Triggered when `muuri.hide()` method is called, after the items are hidden (with or without animation).

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully hidden without interruptions. If an item is already hidden when the `muuri.show()` method is called it is cosidered as successfully hidden.

**Examples**

```javascript
muuri.on('hideend', function (items) {
  console.log(items);
});
```

### `move`

Triggered after `muuri.move()` method is called.

**Listener parameters**

* **targetFrom** &nbsp;&mdash;&nbsp; *array*
  * `Muuri.Item` instance that was moved.
* **targetTo** &nbsp;&mdash;&nbsp; *array*
  * `Muuri.Item` instance to which's index the *targetFrom* item was moved to.

**Examples**

```javascript
muuri.on('move', function (targetFrom, targetTo) {
  console.log(targetFrom);
  console.log(targetTo);
});
```

### `swap`

Triggered after `muuri.swap()` method is called.

**Listener parameters**

* **targetA** &nbsp;&mdash;&nbsp; *array*
  * `Muuri.Item` instance that was swapped with *targetB*.
* **targetB** &nbsp;&mdash;&nbsp; *array*
  * `Muuri.Item` instance that was swapped with *targetA*.

**Examples**

```javascript
muuri.on('move', function (targetA, targetB) {
  console.log(targetA);
  console.log(targetB);
});
```

### `add`

Triggered after `muuri.add()` method is called.

**Listener parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of `Muuri.Item` instances that were succesfully added to the muuri instance.

**Examples**

```javascript
muuri.on('add', function (items) {
  console.log(items);
});
```

### `remove`

Triggered after `muuri.remove()` method is called.

**Listener parameters**

* **itemIndices** &nbsp;&mdash;&nbsp; *array*
  * Indices of the `Muuri.Item` instances that were succesfully removed from the muuri instance.

**Examples**

```javascript
muuri.on('remove', function (itemIndices) {
  console.log(itemIndices);
});
```

### `dragstart`

Triggered when dragging of an item begins.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.
* **data** &nbsp;&mdash;&nbsp; *object*
  * **data.type** &nbsp;&mdash;&nbsp; *String*
    *  `"dragstart"`
  * **data.event** &nbsp;&mdash;&nbsp; *object*
    *  The hammer event for the drag start event.
  * **data.currentLeft** &nbsp;&mdash;&nbsp; *number*
    *  The dragged element's current translateX value.
  * **data.currentTop** &nbsp;&mdash;&nbsp; *object*
    *  The dragged element's current translateY value.
  * **data.gridLeft** &nbsp;&mdash;&nbsp; *number*
    *  The dragged element's current x-coordinate within the muuri container element.
  * **data.gridTop** &nbsp;&mdash;&nbsp; *object*
    *  The dragged element's current y-coordinate within the muuri container element.

**Examples**

```javascript
muuri.on('dragstart', function (item, data) {
  console.log(item);
  console.log(data);
});
```

### `dragmove`

Triggered when an item is dragged.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.
* **data** &nbsp;&mdash;&nbsp; *object*
  * **data.type** &nbsp;&mdash;&nbsp; *String*
    *  `"dragmove"`
  * **data.event** &nbsp;&mdash;&nbsp; *object*
    *  The hammer event for the drag start event.
  * **data.currentLeft** &nbsp;&mdash;&nbsp; *number*
    *  The dragged element's current translateX value.
  * **data.currentTop** &nbsp;&mdash;&nbsp; *object*
    *  The dragged element's current translateY value.
  * **data.gridLeft** &nbsp;&mdash;&nbsp; *number*
    *  The dragged element's current x-coordinate within the muuri container element.
  * **data.gridTop** &nbsp;&mdash;&nbsp; *object*
    *  The dragged element's current y-coordinate within the muuri container element.

**Examples**

```javascript
muuri.on('dragmove', function (item, data) {
  console.log(item);
  console.log(data);
});
```

### `dragscroll`

Triggered when any of the scroll parents of a dragged item is scrolled.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.
* **data** &nbsp;&mdash;&nbsp; *object*
  * **data.type** &nbsp;&mdash;&nbsp; *String*
    *  `"dragscroll"`
  * **data.event** &nbsp;&mdash;&nbsp; *object*
    *  Th scroll event.
  * **data.currentLeft** &nbsp;&mdash;&nbsp; *number*
    *  The dragged element's current translateX value.
  * **data.currentTop** &nbsp;&mdash;&nbsp; *object*
    *  The dragged element's current translateY value.
  * **data.gridLeft** &nbsp;&mdash;&nbsp; *number*
    *  The dragged element's current x-coordinate within the muuri container element.
  * **data.gridTop** &nbsp;&mdash;&nbsp; *object*
    *  The dragged element's current y-coordinate within the muuri container element.

**Examples**

```javascript
muuri.on('dragscroll', function (item, data) {
  console.log(item);
  console.log(data);
});
```

### `dragend`

Triggered after item dragging ends.

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.
* **data** &nbsp;&mdash;&nbsp; *object*
  * **data.type** &nbsp;&mdash;&nbsp; *String*
    *  `"dragend"`
  * **data.event** &nbsp;&mdash;&nbsp; *object*
    *  The hammer event for the drag start event.
  * **data.currentLeft** &nbsp;&mdash;&nbsp; *number*
    *  The dragged element's current translateX value.
  * **data.currentTop** &nbsp;&mdash;&nbsp; *object*
    *  The dragged element's current translateY value.
  * **data.gridLeft** &nbsp;&mdash;&nbsp; *number*
    *  The dragged element's current x-coordinate within the muuri container element.
  * **data.gridTop** &nbsp;&mdash;&nbsp; *object*
    *  The dragged element's current y-coordinate within the muuri container element.

**Examples**

```javascript
muuri.on('dragend', function (item, data) {
  console.log(item);
  console.log(data);
});
```

### `releasestart`

Triggered when item is released (right after dragging ends).

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.

**Examples**

```javascript
muuri.on('releasestart', function (item) {
  console.log(item);
});
```

### `releaseend`

Triggered after item has finished the release procedure (animated back to it's position if animations are enabled).

**Listener parameters**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * `Muuri.Item` instance that is being dragged.

**Examples**

```javascript
muuri.on('releaseend', function (item) {
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

