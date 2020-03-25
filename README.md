# Muuri

[![gzip size](https://img.badgesize.io/https://unpkg.com/muuri@0.9.0/dist/muuri.min.js?compression=gzip)](https://unpkg.com/muuri@0.9.0/dist/muuri.min.js)
[![npm](https://img.shields.io/npm/v/muuri.svg)](http://npm.im/muuri)

Muuri is a JavaScript layout engine that allows you to build all kinds of layouts and make them responsive, sortable, filterable, draggable and/or animated. Comparing to what's out there Muuri is a combination of [Packery](http://packery.metafizzy.co/), [Masonry](http://masonry.desandro.com/), [Isotope](http://isotope.metafizzy.co/) and [Sortable](https://github.com/RubaXa/Sortable). Wanna see it in action? Check out the [demo](http://haltu.github.io/muuri/) on the website.

Muuri's default "First Fit" bin packing layout algorithm generates layouts similar to [Packery](https://github.com/metafizzy/packery) and [Masonry](http://masonry.desandro.com/). The implementation is heavily based on the "maxrects" approach as described by Jukka Jylänki in his survey "A Thousand Ways to Pack the Bin - A Practical Approach to Two-Dimensional Rectangle Bin Packing" (check out the survey's [source code](https://github.com/juj/RectangleBinPack)). If that's not your cup of tea you can always provide your own layout algorithm to position the items as you wish.

Muuri uses [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) for animations and has an internal mechanism to handle dragging. And if you're wondering about the name of the library "muuri" is Finnish meaning a wall.

**Features**

* Fully customizable layout
* Drag & drop (even between grids)
* Nested grids
* Fast animations
* Filtering
* Sorting

## Table of contents

* [Getting started](#getting-started)
* [API](#api)
  * [Grid constructor](#grid-constructor)
  * [Grid options](#grid-options)
  * [Grid methods](#grid-methods)
  * [Grid events](#grid-events)
  * [Item methods](#item-methods)
* [Credits](#credits)
* [License](#license)

## Getting started

### 1. Get Muuri

Install via [npm](https://www.npmjs.com/):
```bash
npm install muuri
```

Or download:
* [muuri.js](https://unpkg.com/muuri@0.9.0/dist/muuri.js) - for development (not minified, with comments).
* [muuri.min.js](https://unpkg.com/muuri@0.9.0/dist/muuri.min.js) - for production (minified, no comments).

Or link directly:
```html
<script src="https://unpkg.com/muuri@0.9.0/dist/muuri.min.js"></script>
```

### 2. Get Web Animations Polyfill (if needed)

Muuri uses [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) to handle all the animations by default. If you need to use Muuri on a browser that does not support Web Animations you need to use a [polyfill](https://github.com/web-animations/web-animations-js).

```bash
npm install web-animations-js
```

### 3. Add the script tags

Add Muuri on your site and make sure to include the Web Animations Polyfill before Muuri (if needed).

```html
<script src="https://unpkg.com/web-animations-js@2.3.2/web-animations.min.js"></script>
<script src="https://unpkg.com/muuri@0.9.0/dist/muuri.min.js"></script>
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

* The container element must be "positioned" meaning that it's CSS position property must be set to *relative*, *absolute* or *fixed*. Also note that Muuri automatically resizes the container element's width/height depending on the area the items cover and the layout algorithm configuration.
* The item elements must have their CSS position set to *absolute* and their display property set to *block*. Muuri actually enforces the `display:block;` rule and adds it as an inline style to all item elements, just in case.
* The item elements must not have any CSS transitions or animations applied to them, because they might conflict with Muuri's internal animation engine. However, the container element can have transitions applied to it if you want it to animate when it's size changes after the layout operation.
* You can control the gaps between the items by giving some margin to the item elements.
* One last thing: never ever set `overflow: auto;` or `overflow: scroll;` to the container element. Muuri's calculation logic does not account for that and you _will_ see some item jumps when dragging starts. Always use a wrapper element for the container where you set the `auto`/`scroll` overflow values.

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
  background: #000;
  color: #fff;
}
.item.muuri-item-dragging {
  z-index: 3;
}
.item.muuri-item-releasing {
  z-index: 2;
}
.item.muuri-item-hidden {
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

You can view this little tutorial demo [here](https://codepen.io/niklasramo/pen/wpwNjK). After that you might want to check some [other demos](https://codepen.io/collection/AWopag/) as well.

## API

### Grid constructor

`Muuri` is a constructor function and should be always instantiated with the `new` keyword. For the sake of clarity, we refer to a Muuri instance as *grid* throughout the documentation.

**Syntax**

`Muuri( element, [options] )`

**Parameters**

* **element** &nbsp;&mdash;&nbsp; *element* / *string*
  * Default value: `null`.
  * You can provide the element directly or use a selector (string) which uses [querySelector()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) internally.
* **options** &nbsp;&mdash;&nbsp; *object*
  * Optional. Check out the [detailed options reference](#grid-options).

**Default options**

The default options are stored in `Muuri.defaultOptions` object, which in it's default state contains the following configuration:

```javascript
{
  // Item elements
  items: '*',

  // Default show animation
  showDuration: 300,
  showEasing: 'ease',

  // Default hide animation
  hideDuration: 300,
  hideEasing: 'ease',

  // Item's visible/hidden state styles
  visibleStyles: {
    opacity: '1',
    transform: 'scale(1)'
  },
  hiddenStyles: {
    opacity: '0',
    transform: 'scale(0.5)'
  },

  // Layout
  layout: {
    fillGaps: false,
    horizontal: false,
    alignRight: false,
    alignBottom: false,
    rounding: true
  },
  layoutOnResize: 150,
  layoutOnInit: true,
  layoutDuration: 300,
  layoutEasing: 'ease',

  // Sorting
  sortData: null,

  // Drag & Drop
  dragEnabled: false,
  dragContainer: null,
  dragHandle: null,
  dragStartPredicate: {
    distance: 0,
    delay: 0
  },
  dragAxis: null,
  dragSort: true,
  dragSortHeuristics: {
    sortInterval: 100,
    minDragDistance: 10,
    minBounceBackAngle: 1
  },
  dragSortPredicate: {
    threshold: 50,
    action: 'move',
    migrateAction: 'swap'
  },
  dragRelease: {
    duration: 300,
    easing: 'ease',
    useDragContainer: true
  },
  dragCssProps: {
    touchAction: 'none',
    userSelect: 'none',
    userDrag: 'none',
    tapHighlightColor: 'rgba(0, 0, 0, 0)',
    touchCallout: 'none',
    contentZooming: 'none'
  },
  dragPlaceholder: {
    enabled: false,
    createElement: null,
    onCreate: null,
    onRemove: null
  },
  dragAutoScroll: {
    targets: [],
    handle: null,
    threshold: 50,
    safeZone: 0.2,
    speed: Muuri.AutoScroller.smoothSpeed(1000, 2000, 2500),
    sortDuringScroll: true,
    syncAfterScroll: true,
    smoothStop: true,
    onStart: null,
    onStop: null
  },

  // Classnames
  containerClass: 'muuri',
  itemClass: 'muuri-item',
  itemVisibleClass: 'muuri-item-shown',
  itemHiddenClass: 'muuri-item-hidden',
  itemPositioningClass: 'muuri-item-positioning',
  itemDraggingClass: 'muuri-item-dragging',
  itemReleasingClass: 'muuri-item-releasing',
  itemPlaceholderClass: 'muuri-item-placeholder'
}
```

You can modify the default options easily:

```javascript
Muuri.defaultOptions.showDuration = 400;
Muuri.defaultOptions.dragSortPredicate.action = 'swap';
```

This is how you would use the options:

```javascript
// Minimum configuration.
var gridA = new Muuri('.grid-a');

// Providing some options.
var gridB = new Muuri('.grid-b', {
  items: '.item'
});
```

### Grid options

* [items](#items-)
* [showDuration](#showduration-)
* [showEasing](#showeasing-)
* [hideDuration](#hideduration-)
* [hideEasing](#hideeasing-)
* [visibleStyles](#visiblestyles-)
* [hiddenStyles](#hiddenstyles-)
* [layout](#layout-)
* [layoutOnResize](#layoutonresize-)
* [layoutOnInit](#layoutoninit-)
* [layoutDuration](#layoutduration-)
* [layoutEasing](#layouteasing-)
* [sortData](#sortdata-)
* [dragEnabled](#dragenabled-)
* [dragContainer](#dragcontainer-)
* [dragHandle](#draghandle-)
* [dragStartPredicate](#dragstartpredicate-)
* [dragAxis](#dragaxis-)
* [dragSort](#dragsort-)
* [dragSortHeuristics](#dragsortheuristics-)
* [dragSortPredicate](#dragsortpredicate-)
* [dragRelease](#dragrelease-)
* [dragCssProps](#dragcssprops-)
* [dragPlaceholder](#dragplaceholder-)
* [dragAutoScroll](#dragautoscroll-)
* [containerClass](#containerclass-)
* [itemClass](#itemclass-)
* [itemVisibleClass](#itemvisibleclass-)
* [itemHiddenClass](#itemhiddenclass-)
* [itemPositioningClass](#itempositioningclass-)
* [itemDraggingClass](#itemdraggingclass-)
* [itemReleasingClass](#itemreleasingclass-)
* [itemPlaceholderClass](#itemplaceholderclass-)

### items &nbsp;

The initial item elements, which should be children of the container element. All elements that are not children of the container will be appended to the container. You can provide an array of elements, [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList), [HTMLCollection](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection) or a selector (string). If you provide a selector Muuri uses it to filter the current child elements of the container element and sets them as initial items. By default all current child elements of the provided container element are used as initial items.

* Default value: `'*'`.
* Accepted types: array (of elements), [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList), [HTMLCollection](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection), string, null.

```javascript
// Use specific items.
var grid = new Muuri(elem, {
  items: [elemA, elemB, elemC]
});

// Use node list.
var grid = new Muuri(elem, {
  items: elem.querySelectorAll('.item')
});

// Use selector.
var grid = new Muuri(elem, {
  items: '.item'
});
```

### showDuration &nbsp;

Show animation duration in milliseconds. Set to `0` to disable show animation.

* Default value: `300`.
* Accepted types: number.

```javascript
var grid = new Muuri(elem, {
  showDuration: 600
});
```

### showEasing &nbsp;

Show animation easing. Accepts any valid [Animation easing](https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/easing) value.

* Default value: `'ease'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  showEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
});
```

### hideDuration &nbsp;

Hide animation duration in milliseconds. Set to `0` to disable hide animation.

* Default value: `300`.
* Accepted types: number.

```javascript
var grid = new Muuri(elem, {
  hideDuration: 600
});
```

### hideEasing &nbsp;

Hide animation easing. Accepts any valid [Animation easing](https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/easing) value.

* Default value: `'ease'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  hideEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
});
```

### visibleStyles &nbsp;

The styles that will be applied to all visible items. These styles are also used for the show/hide animations which means that you have to have the same style properties in visibleStyles and hiddenStyles options. Be sure to define all style properties camel cased and without vendor prefixes (Muuri prefixes the properties automatically where needed).

* Default value: `{opacity: 1, transform: 'scale(1)'}`.
* Accepted types: object.

```javascript
var grid = new Muuri(elem, {
  visibleStyles: {
    opacity: 1,
    transform: 'rotate(45deg)'
  },
  hiddenStyles: {
    opacity: 0,
    transform: 'rotate(-45deg)'
  }
});
```

### hiddenStyles &nbsp;

The styles that will be applied to all hidden items. These styles are also used for the show/hide animations which means that you have to have the same style properties in visibleStyles and hiddenStyles options. Be sure to define all style properties camel cased and without vendor prefixes (Muuri prefixes the properties automatically where needed).

* Default value: `{opacity: 0, transform: 'scale(0.5)'}`.
* Accepted types: object.

```javascript
var grid = new Muuri(elem, {
  visibleStyles: {
    opacity: 1,
    transform: 'rotate(45deg)'
  },
  hiddenStyles: {
    opacity: 0,
    transform: 'rotate(-45deg)'
  }
});
```

### layout &nbsp;

Define how the items will be positioned. Muuri ships with a configurable layout algorithm which is used by default. It's pretty flexible and suitable for most common situations (lists, grids and even bin packed grids). If that does not fit the bill you can always provide your own layout algorithm (it's not as scary as it sounds).

Muuri supports calculating the layout both synchronously and asynchronously. By default (if you use the default layout algorithm) Muuri will use two shared web workers to compute the layouts asynchronously. In browsers that do not support web workers Muuri will fallback to synchronous layout calculations.

* Default value: `{fillGaps: false, horizontal: false, alignRight: false, alignBottom: false}`.
* Accepted types: function, object.

**Provide an _object_ to configure the default layout algorithm with the following properties**

* **fillGaps** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * When `true` the algorithm goes through every item in order and places each item to the first available free slot, even if the slot happens to be visually *before* the previous element's slot. Practically this means that the items might not end up visually in order, but there will be less gaps in the grid.
* **horizontal** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  *  When `true` the grid works in landscape mode (grid expands to the right). Use for horizontally scrolling sites. When `false` the grid works in "portrait" mode and expands downwards.
* **alignRight** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * When `true` the items are aligned from right to left.
* **alignBottom** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * When `true` the items are aligned from the bottom up.
* **rounding** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `true`.
  * When `true` the dimensions of the items will be automatically rounded for the layout calculations using `Math.round()`. Set to `false` to use accurate dimensions. In practice you would want disable this if you are using relative dimension values for items (%, em, rem, etc.). If you have defined item dimensions with pixel values (px) it is recommended that you leave this on.

```javascript
// Customize the default layout algorithm.
var grid = new Muuri(elem, {
  layout: {
    fillGaps: true,
    horizontal: true,
    alignRight: true,
    alignBottom: true,
    rounding: false
  }
});
```

**Provide a _function_ to use a custom layout algorithm**

When you provide a custom layout function Muuri calls it whenever calculation of layout is necessary. Before calling the layout function Muuri always calculates the current width and height of the grid's container element and also creates an array of all the items that are part of the layout currently (all _active_ items).

The layout function always receives the following arguments:

  * **layoutId** &nbsp;&mdash;&nbsp; *number*
    * Automatically generated unique id for the layout which is used to keep track of the layout requests and to make sure that the correct layout gets applied at correct time.
  * **items** &nbsp;&mdash;&nbsp; *array*
    * Array of `Muuri.Item` instances. A new array instance is created for each layout so there's no harm in manipulating this if you need to.
  * **containerWidth** &nbsp;&mdash;&nbsp; *number*
    * Current width (in pixels) of the grid's container element.
  * **containerHeight** &nbsp;&mdash;&nbsp; *number*
    * Current height (in pixels) of the grid's container element.
  * **callback** &nbsp;&mdash;&nbsp; *function*
    * When the layout is calculated and ready to be applied you need to call this callback function and provide a _layout object_ as it's argument. Note that if another layout is requesteded while the current layout is still being calculated (asynchronously) this layout will be ignored.

If the layout function's calculations are asynchronous you can optionally return a cancel function, which Muuri will call if there is a new layout request before the current layout has finished it's calculations.

The layout object, which needs to be provided to the callback, must include the following properties.

* **id** &nbsp;&mdash;&nbsp; *number*
  * The layout's unique id (must be the `layoutId` provided by Muuri).
* **items** &nbsp;&mdash;&nbsp; *array*
  * Array of the active item instances that are part of the layout. You can pass the same `items` array here which is provided by Muuri (in case you haven't mutated it). This array items must be identical to the array of items provided by Muuri.
* **slots** &nbsp;&mdash;&nbsp; *array*
  * Array of the item positions (numbers). E.g. if the items were `[a, b]` this should be `[aLeft, aTop, bLeft, bTop]`. You have to calculate the `left` and `top` position for each item in the provided _items_ array in the same order the items are provided.
* **width** &nbsp;&mdash;&nbsp; *number*
  * The width of the layout (in pixels).
* **height** &nbsp;&mdash;&nbsp; *number*
  * The height of the layout (in pixels).
* **setWidth** &nbsp;&mdash;&nbsp; *boolean*
  * Should Muuri set the layout's width as the grid element's width?
* **setHeight** &nbsp;&mdash;&nbsp; *boolean*
  * Should Muuri set the layout's height as the grid element's height?

```javascript
// Build your own layout algorithm.
var grid = new Muuri(elem, {
  layout: function (layoutId, items, containerWidth, containerHeight, callback) {
    var layout = {
      id: layoutId,
      items: items,
      slots: [],
      width: 0,
      height: 0,
      setWidth: true,
      setHeight: true
    };

    // Calculate the slots asynchronously. Note that the timeout is here only
    // as an example and does not help at all in the calculations. You should
    // offload the calculations to web workers if you want real benefits.
    // Also note that doing asynchronous layout is completely optional and you
    // can call the callback function synchronously also.
    var timerId = window.setTimeout(function () {
      var item, m, x = 0, y = 0, w = 0, h = 0;

      for (var i = 0; i < items.length; i++) {
        item = items[i];
        x += w;
        y += h;
        m = item.getMargin();
        w = item.getWidth() + m.left + m.right;
        h = item.getHeight() + m.top + m.bottom;
        layout.slots.push(x, y);
      }

      // Calculate the layout's total width and height. 
      layout.width = x + w;
      layout.height = y + h;

      // When the layout is fully computed let's call the callback function and
      // provide the layout object as it's argument.
      callback(layout);
    }, 200);

    // If you are doing an async layout you _can_ (if you want to) return a
    // function that cancels this specific layout calculations if it's still
    // processing/queueing when the next layout is requested.
    return function () {
      window.clearTimeout(timerId);
    };
  }
});
```

### layoutOnResize &nbsp;

Should Muuri automatically trigger `layout` method on window resize? Set to `false` to disable. When a number or `true` is provided Muuri will automatically position the items every time window is resized. The provided number (`true` is transformed to `0`) equals to the amount of time (in milliseconds) that is waited before items are positioned after each window resize event.

* Default value: `150`.
* Accepted types: boolean, number.

```javascript
// No layout on resize.
var grid = new Muuri(elem, {
  layoutOnResize: false
});
```

```javascript
// Layout on resize (instantly).
var grid = new Muuri(elem, {
  layoutOnResize: true
});
```

```javascript
// Layout on resize (with 200ms debounce).
var grid = new Muuri(elem, {
  layoutOnResize: 200
});
```

### layoutOnInit &nbsp;

Should Muuri trigger `layout` method automatically on init?

* Default value: `true`.
* Accepted types: boolean.

```javascript
var grid = new Muuri(elem, {
  layoutOnInit: false
});
```

### layoutDuration &nbsp;

The duration for item's layout animation in milliseconds. Set to `0` to disable.

* Default value: `300`.
* Accepted types: number.

```javascript
var grid = new Muuri(elem, {
  layoutDuration: 600
});
```

### layoutEasing &nbsp;

The easing for item's layout animation. Accepts any valid [Animation easing](https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/easing) value.

* Default value: `'ease'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  layoutEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
});
```

### sortData &nbsp;

The sort data getter functions. Provide an object where the key is the name of the sortable attribute and the function returns a value (from the item) by which the items can be sorted.

* Default value: `null`.
* Accepted types: object, null.

```javascript
var grid = new Muuri(elem, {
  sortData: {
    foo: function (item, element) {
      return parseFloat(element.getAttribute('data-foo'));
    },
    bar: function (item, element) {
      return element.getAttribute('data-bar').toUpperCase();
    }
  }
});
// Refresh sort data whenever an item's data-foo or data-bar changes
grid.refreshSortData();
// Sort the grid by foo and bar.
grid.sort('foo bar');
```

### dragEnabled &nbsp;

Should items be draggable?

* Default value: `false`.
* Accepted types: boolean.

```javascript
var grid = new Muuri(elem, {
  dragEnabled: true
});
```

### dragContainer &nbsp;

The element the dragged item should be appended to for the duration of the drag. If set to `null` (which is also the default value) the grid's container element will be used.

* Default value: `null`.
* Accepted types: element, null.

```javascript
var grid = new Muuri(elem, {
  dragContainer: document.body
});
```

### dragHandle &nbsp;

The element within the item element that should be used as the drag handle. This should be a CSS selector which will be fed to `element.querySelector()` as is to obtain the handle element when the item is instantiated. If no valid element is found or if this is `null` Muuri will use the item element as the handle.

* Default value: `null`.
* Accepted types: string, null.

```javascript
var grid = new Muuri(elem, {
  dragHandle: '.handle'
});
```

### dragStartPredicate &nbsp;

A function that determines when the item should start to move when the item is being dragged. By default uses the built-in predicate which has some configurable options.

* Default value: `{distance: 0, delay: 0, handle: false}`.
* Accepted types: function, object.

If an object is provided the default sort predicate handler will be used. You can define the following properties:

* **distance** &nbsp;&mdash;&nbsp; *number*
  * Default value: `0`.
  * How many pixels must be dragged before the dragging starts.
* **delay** &nbsp;&mdash;&nbsp; *number*
  * Default value: `0`.
  * How long (in milliseconds) the user must drag before the dragging starts.

If you provide a function you can totally customize the drag start logic. When the user starts to drag an item this predicate function will be called until you return `true` or `false`. If you return `true` the item will begin to move whenever the item is dragged. If you return `false` the item will not be moved at all. Note that after you have returned `true` or `false` this function will not be called until the item is released and dragged again.

The predicate function receives two arguments:

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The item that's being dragged.
* **event** &nbsp;&mdash;&nbsp; *object*
  * The drag event (Muuri.Dragger event).

```javascript
// Configure the default predicate
var grid = new Muuri(elem, {
  dragStartPredicate: {
    distance: 10,
    delay: 100
  }
});
```

```javascript
// Provide your own predicate
var grid = new Muuri(elem, {
  dragStartPredicate: function (item, e) {
    // Start moving the item after the item has been dragged for one second.
    if (e.deltaTime > 1000) {
      return true;
    }
  }
});
```

```javascript
// Pro tip: provide your own predicate and fall back to the default predicate.
var grid = new Muuri(elem, {
  dragStartPredicate: function (item, e) {
    // If this is final event in the drag process, let's prepare the predicate
    // for the next round (do some resetting/teardown). The default predicate
    // always needs to be called during the final event if there's a chance it
    // has been triggered during the drag process because it does some necessary
    // state resetting.
    if (e.isFinal) {
      Muuri.ItemDrag.defaultStartPredicate(item, e);
      return;
    }

    // Prevent first item from being dragged. 
    if (grid.getItems().indexOf(item) === 0) {
      return false;
    }

    // For other items use the default drag start predicate.
    return Muuri.ItemDrag.defaultStartPredicate(item, e);
  }
});
```

### dragAxis &nbsp;

Force items to be moved only vertically or horizontally when dragged. Set to `'x'` for horizontal movement and to `'y'` for vertical movement. By default items can be dragged both vertically and horizontally.

* Default value: `null`.
* Accepted types: string.
* Allowed values: `'x'`, `'y'`.

```javascript
// Move items only horizontally when dragged.
var grid = new Muuri(elem, {
  dragAxis: 'x'
});
```

```javascript
// Move items only vertically when dragged.
var grid = new Muuri(elem, {
  dragAxis: 'y'
});
```

### dragSort &nbsp;

Should the items be sorted during drag? A simple boolean will do just fine here.

Alternatively you can do some advanced stuff and control within which grids a specific item can be sorted and dragged into. To do that you need to provide a function which receives the dragged item as its first argument and should return an array of grid instances. An important thing to note here is that you need to return *all* the grid instances you want the dragged item to sort within, even the current grid instance. If you return an empty array the dragged item will not cause sorting at all.

* Default value: `true`.
* Accepted types: boolean, function.

```javascript
// Disable drag sorting.
var grid = new Muuri(elem, {
  dragSort: false
});
```

```javascript
// Multigrid drag sorting.
var gridA = new Muuri(elemA, {dragSort: getAllGrids});
var gridB = new Muuri(elemB, {dragSort: getAllGrids});
var gridC = new Muuri(elemC, {dragSort: getAllGrids});

function getAllGrids(item) {
  return [gridA, gridB, gridC];
}
```

### dragSortHeuristics &nbsp;

Defines various heuristics so that sorting during drag would be smoother and faster.

* Default value: `{sortInterval: 100, minDragDistance: 10, minBounceBackAngle: 1}`.
* Accepted types: object.

You can define the following properties:

* **sortInterval** &nbsp;&mdash;&nbsp; *number*
  * Default value: `100`.
  * Defines the amount of time the dragged item must be still before `dragSortPredicate` function is called.
* **minDragDistance** &nbsp;&mdash;&nbsp; *number*
  * Default value: `10`.
  * Defines how much (in pixels) the item must be dragged before `dragSortPredicate` can be called.
* **minBounceBackAngle** &nbsp;&mdash;&nbsp; *number*
  * Default value: `1`.
  * Defines the minimum angle (in radians) of the delta vector between the last movement vector and the current movement vector that is required for the dragged item to be allowed to be sorted to it's previous index. The problem this heuristic is trying to solve is the scenario where you drag an item over a much bigger item and the bigger item moves, but it's still overlapping the dragged item after repositioning. Now when you move the dragged item again another sort is triggered and the bigger item moves back to it's previous position. This bouncing back and forth can go on for quite a while and it looks quite erratic. The fix we do here is that, by default, we disallow an item to be moved back to it's previous position, unless it's drag direction changes enough. And what is enough? That's what you can define here. Note that this option works in tandem with `minDragDistance` and needs it to be set to `3` at minimum to be enabled at all.

```javascript
var grid = new Muuri(elem, {
  dragEnabled: true,
  dragSortHeuristics: {
    sortInterval: 10,
    minDragDistance: 5,
    minBounceBackAngle: Math.PI / 2
  }
});
```

```javascript
// Pro tip: If you want drag sorting happening only on release set a really
// long sortInterval. A bit of a hack, but works.
var grid = new Muuri(elem, {
  dragEnabled: true,
  dragSortHeuristics: {
    sortInterval: 3600000 // 1 hour
  }
});
```

### dragSortPredicate &nbsp;

Defines the logic for the sort procedure during dragging an item.

* Default value: `{action: 'move', migrateAction: 'move', threshold: 50}`.
* Accepted types: function, object.

If an object is provided the default sort predicate handler will be used. You can define the following properties:
* **action** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'move'`.
  * Allowed values: `'move'`, `'swap'`.
  * Should the dragged item be *moved* to the new position or should it *swap* places with the item it overlaps when the drag occurs within the same grid?
* **migrateAction** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'move'`.
  * Allowed values: `'move'`, `'swap'`.
  * Should the dragged item be *moved* to the new position or should it *swap* places with the item it overlaps when the dragged item is moved to another grid?
* **threshold** &nbsp;&mdash;&nbsp; *number*
  * Default value: `50`.
  * Allowed values: `1` - `100`.
  * How many percent the intersection area between the dragged item and the compared item should be from the maximum potential intersection area between the items before sorting is triggered.

Alternatively you can provide your own callback function where you can define your own custom sort logic. The callback function receives two arguments:

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The item that's being dragged.
* **event** &nbsp;&mdash;&nbsp; *object*
  * The drag event (Muuri.Dragger event).

The callback should return a *falsy* value if sorting should not occur. If, however, sorting should occur the callback should return an object containing the following properties:

* **index** &nbsp;&mdash;&nbsp; *number*
  * The index where the item should be moved to.
* **grid** &nbsp;&mdash;&nbsp; *Muuri*
  * The grid where the item should be moved to.
  * Defaults to the item's current grid.
  * Optional.
* **action** &nbsp;&mdash;&nbsp; *string*
  * The movement method.
  * Default value: `'move'`.
  * Allowed values: `'move'` or `'swap'`.
  * Optional.

```javascript
// Customize the default predicate.
var grid = new Muuri(elem, {
  dragSortPredicate: {
    threshold: 90,
    action: 'swap'
  }
});
```

```javascript
// Provide your own predicate.
var grid = new Muuri(elem, {
  dragSortPredicate: function (item, e) {
    if (e.deltaTime < 1000) return false;
    return {
      index: Math.round(e.deltaTime / 1000) % 2 === 0 ? -1 : 0,
      action: 'swap'
    };
  }
});
```

```javascript
// Pro tip: use the default predicate as fallback in your custom predicate.
var grid = new Muuri(elem, {
  dragSortPredicate: function (item, e) {
    if (item.classList.contains('no-sort')) return false;
    return Muuri.ItemDrag.defaultSortPredicate(item, {
      action: 'swap',
      threshold: 75
    });
  }
});
```

### dragRelease &nbsp;

* Default value: `{ duration: 300, easing: 'ease', useDragContainer: true }`.
* Accepted types: object.

You can define the following properties:

* **duration** &nbsp;&mdash;&nbsp; *number*
  * Default value: `300`.
  * The duration for item's drag release animation. Set to `0` to disable.
* **easing** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'ease'`.
  * The easing for item's drag release animation. Accepts any valid [Animation easing](https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/easing) value.
* **useDragContainer** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `true`.
  * If `true` the item element will remain within the `dragContainer` for the duration of the release process. Otherwise the item element will be inserted within the grid element (if not already inside it) at the beginning of the release process.

```javascript
var grid = new Muuri(elem, {
  dragRelease: {
    duration: 600,
    easing: 'ease-out',
    useDragContainer: false
  }
});
```

### dragCssProps &nbsp;

Drag specific CSS properties that Muuri sets to the draggable item elements. Muuri automatically prefixes the properties before applying them to the element. `touchAction` property is required to be always defined, but the other properties are optional and can be omitted by setting their value to an empty string if you want to e.g. define them via CSS only.

* Default value: `{touchAction: 'none', userSelect: 'none', userDrag: 'none', tapHighlightColor: 'rgba(0, 0, 0, 0)', touchCallout: 'none', contentZooming: 'none'}`.
* Accepted types: object.

You can define the following properties:

* **touchAction** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'none'`.
  * https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
* **userSelect** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'none'`.
  * https://developer.mozilla.org/en-US/docs/Web/CSS/user-select
  * Optional.
* **userDrag** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'none'`.
  * http://help.dottoro.com/lcbixvwm.php
  * Optional.
* **tapHighlightColor** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'rgba(0, 0, 0, 0)'`.
  * https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-tap-highlight-color
  * Optional.
* **touchCallout** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'none'`.
  * https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-touch-callout
  * Optional.
* **contentZooming** &nbsp;&mdash;&nbsp; *string*
  * Default value: `'none'`.
  * https://developer.mozilla.org/en-US/docs/Web/CSS/-ms-content-zooming
  * Optional.

```javascript
// Only set the required touch-action CSS property via the options if you for
// example want to set the other props via CSS instead.
var grid = new Muuri(elem, {
  dragEnabled: true,
  dragCssProps: {
    touchAction: 'pan-y',
    userSelect: '',
    userDrag: '',
    tapHighlightColor: '',
    touchCallout: '',
    contentZooming: ''
  }
});
```

### dragPlaceholder &nbsp;

If you want a placeholder item to appear for the duration of an item's drag & drop procedure you can enable and configure it here. The placeholder animation duration is fetched from the grid's `layoutDuration` option and easing from the grid's `layoutEasing` option. Note that a special placeholder class is given to all drag placeholders and is customizable via [itemPlaceholderClass](#itemplaceholderclass-) option.

* Default value: `{enabled: false, duration: 300, easing: 'ease', createElement: null, onCreate: null, onRemove: null}`.
* Accepted types: object.

You can define the following properties:

* **enabled** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `false`.
  * Is the placeholder enabled?
* **createElement** &nbsp;&mdash;&nbsp; *function / null*
  * Default value: `null`.
  * If defined, this method will be used to create the DOM element that is used for the placeholder. By default a new `div` element is created when a placeholder is summoned.
* **onCreate** &nbsp;&mdash;&nbsp; *function / null*
  * Default value: `null`.
  * An optional callback that will be called after a placeholder is created for an item.
* **onRemove** &nbsp;&mdash;&nbsp; *function / null*
  * Default value: `null`.
  * An optional callback that will be called after a placeholder is removed from the grid.

```javascript
// This example showcases how to pool placeholder elements
// for better performance and memory efficiency.
var phPool = [];
var phElem = document.createElement('div');

var grid = new Muuri(elem, {
  dragEnabled: true,
  dragPlaceholder: {
    enabled: true,
    createElement(item) {
      return phPool.pop() || phElem.cloneNode();
    },
    onCreate(item, element) {
      // If you want to do something after the
      // placeholder is fully created, here's
      // the place to do it.
    },
    onRemove (item, element) {
      phPool.push(element);
    }
  }
});
```

### dragAutoScroll &nbsp;

If you want to trigger scrolling on any element during dragging you can enable and configure it here. By default this feature is disabled. When you use this feature it is _highly_ recommended that you create a `fixed` positioned element right under `document.body` and use that as the `dragContainer` for all the dragged items. If you don't do this and a dragged item's parent is auto-scrolled, the dragged item will potentially grow the scrolled element's scroll area to infinity unintentionally.

* Default value: `{ targets: [], handle: null, threshold: 50, speed: Muuri.AutoScroller.smoothSpeed(1000, 2000, 2500), sortDuringScroll: true, syncAfterScroll: true, smoothStop: true, onStart: null, onStop: null }`.
* Accepted types: object.

You can define the following properties:

* **targets** &nbsp;&mdash;&nbsp; *array / function*
  * Default value: `[]`.
  * Define the DOM elements that should be scrolled during drag. As long as this array is empty there will be no scrolling during drag. To keep it simple you can just provide an array of elements here, in which case Muuri attempts to scroll the elements both vertically and horizontally when possible. If you want more fine-grained control, e.g. scroll an element only on specific axis or prioritize some element over another (handy for cases when there are overlapping elements), you can provide an array of scroll targets (objects). Finally, you can also provide a function which receives the dragged `item` instance as it's argument and which should return an array of scroll targets (elements/objects). This way you can provide different configurations for different items.
  * **scrollTarget** &nbsp;&mdash;&nbsp; *object*
    * **element** &nbsp;&mdash;&nbsp; *element*
      * The DOM element to scroll.
      * Required.
    * **axis** &nbsp;&mdash;&nbsp; *number*
      * Optional. Defaults to scrolling both axes: `Muuri.AutoScroller.AXIS_X | Muuri.AutoScroller.AXIS_Y`.
      * To scroll only x-axis: `Muuri.AutoScroller.AXIS_X`.
      * To scroll only y-axis: `Muuri.AutoScroller.AXIS_Y`.
    * **priority** &nbsp;&mdash;&nbsp; *number*
      * Default: `0`.
      * A dragged item can only scroll one element horizontally and one element vertically simultaneously. This is an artificial limit to fend off unnecesary complexity, and to avoid awkward situations. In the case where the dragged item overlaps multiple scrollable elements simultaneously and exceeds their scroll thresholds we pick the one that the dragged item overlaps most. However, that's not always the best choice. This is where `priority` comes in. Here you can manually tell Muuri which element to prefer over another in these scenarios. The element with highest priority _always_ wins the fight, in matches with equal priority we determine the winner by the amount of overlap.
      * Optional.
    * **threshold** &nbsp;&mdash;&nbsp; *number / null*
      * Default: `null`.
      * If defined (a number is provided), this value will override the default threshold for _this scroll target_. Otherwise the default threshold will be used.
      * Optional.
* **handle** &nbsp;&mdash;&nbsp; *function / null*
  * Default value: `null`.
  * This property defines size and position of the handle (the rectangle that is compared against the scroll element's threshold). By default (when `null`) the dragged element's dimensions and offsets are used. However, you can provide a function which should return an object containing the handle's client offsets in pixels (`left` and `top`) and dimensions in pixels (`width` and `height`). The function receives the following arguments:
    * **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
    * **itemClientX** &nbsp;&mdash;&nbsp; *number*
    * **itemClientY** &nbsp;&mdash;&nbsp; *number*
    * **itemWidth** &nbsp;&mdash;&nbsp; *number*
    * **itemHeight** &nbsp;&mdash;&nbsp; *number*
    * **pointerClientX** &nbsp;&mdash;&nbsp; *number*
    * **pointerClientY** &nbsp;&mdash;&nbsp; *number*
  * Tip: Use `Muuri.AutoScroller.pointerHandle(pointerSize)` utility method if you want to use the pointer (instead of the element) as the handle.
* **threshold** &nbsp;&mdash;&nbsp; *number*
  * Default value: `50`.
  * Defines the distance (in pixels) from the edge of the scrollable element when scrolling should start, in pixels. If this value is `0` the scrolling will start when the dragged element reaches the scrollable element's edge. Do note that Muuri dynamically adjusts the scroll element's _edge_ for the calculations (when needed).
* **safeZone** &nbsp;&mdash;&nbsp; *number*
  * Default value: `0.2`.
  * Defines the size of the minimum "safe zone" space, an area in the center of the scrollable element that will be guaranteed not trigger scrolling regardless threshold size and the dragged item size. This value is a percentage of the scrollable element's size (width or height depending on the scroll axis), and should be something between `0` and `1`. So in practice, if you set this to e.g `0.5` the safe zone would be 50% of the scrollable element's width and height.
* **speed** &nbsp;&mdash;&nbsp; *number / function*
  * Default value: `Muuri.AutoScroller.smoothSpeed(1000, 2000, 2500)`.
  * Defines the scrolling speed in pixels per second. You can provide either static speed with a `number` or dynamic speed with a `function`. The function is called before every scroll operation and should return the speed (`number`, pixels per second) for the next scroll operation. The function receives three arguments:
    * **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The dragged `Muuri.Item` instance.
    * **scrollElement** &nbsp;&mdash;&nbsp; *element*
      * The scrolled element.
    * **data** &nbsp;&mdash;&nbsp; *object*
      * **data.direction** &nbsp;&mdash;&nbsp; *number*
        * The direction of the scroll, one of the following: `Muuri.AutoScroller.LEFT`, `Muuri.AutoScroller.RIGHT`, `Muuri.AutoScroller.UP`, `Muuri.AutoScroller.DOWN`.
      * **data.threshold** &nbsp;&mdash;&nbsp; *number*
        * The current threshold in pixels.
      * **data.distance** &nbsp;&mdash;&nbsp; *number*
        * The handle rectangle's (as defined in `handle` option) current distance from the edge of the scroll element. E.g, if `direction` is `Muuri.AutoScroller.RIGHT` then distance is `scrollElement.getBoundingClientRect().right - handleRect.right`, and if `direction` is `Muuri.AutoScroller.LEFT` then distance is `handleRect.left - scrollElement.getBoundingClientRect().left`. Can be a negative value too.
      * **data.value** &nbsp;&mdash;&nbsp; *number*
        * The scroll element's current scroll value on the scrolled axis.
      * **data.maxValue** &nbsp;&mdash;&nbsp; *number*
        * The scroll element's maximum scroll value on the scrolled axis.
      * **data.duration** &nbsp;&mdash;&nbsp; *number*
        * How long (in milliseconds) this specific auto-scroll operation has lasted so far.
      * **data.speed** &nbsp;&mdash;&nbsp; *number*
        * The current speed as pixels per second.
      * **data.deltaTime** &nbsp;&mdash;&nbsp; *number*
        * `requestAnimationFrame`'s delta time (in milliseconds).
      * **data.isEnding** &nbsp;&mdash;&nbsp; *boolean*
        * Is the scroll process ending? When this is `true` it means that the associated drag item does not satisfy the threshold anymore. You should now start decreasing the speed towards `0` to allow the item to come to rest smoothly.
  * Pro tip: Use `Muuri.AutoScroller.smoothSpeed()` for dynamic speed that provides a smooth scrolling experience. When executed it creates and returns a speed function which you can directly provide for `speed` option. The method _requires_ three arguments (in the following order):
    * **maxSpeed** &nbsp;&mdash;&nbsp; *number*
      * The maximum speed (pixels per second) when the handle's distance to the scroll target's edge is `0` or less.
    * **acceleration** &nbsp;&mdash;&nbsp; *number*
      * How fast the the speed may accelerate (pixels per second).
    * **deceleration** &nbsp;&mdash;&nbsp; *number*
      * How fast the the speed may decelerate (pixels per second).
* **sortDuringScroll** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `true`.
  * Should the grid items be sorted during auto-scroll or not?
* **syncAfterScroll** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `true`.
  * Should Muuri automatically update the positions of the dragged items that were affected by scrolling? If you disable this option and the dragged item's parent is scrolled, the dragged item will visually shake during scroll. Unless all of your dragged items are inside a `fixed` positioned container element (which is the recommeded pattern), you should leave this enabled.
* **smoothStop** &nbsp;&mdash;&nbsp; *boolean*
  * Default value: `true`.
  * When a dragged item is moved out of the threshold area the scroll process is set to _ending_ state. However, it's up to you to decide if the actual scrolling motion is stopped gradually or instantly. By default, when this is `true`, scrolling will continue until speed reaches `0`. If you set this to `false` scrolling will stop immediately. _Always_ set this to `false` is you use static speed. When this option is `enabled` you _must_ handle decelerating the speed to `0` yourself within speed `function`. The default `speed` fuction handles the deceleration automatically.
* **onStart** &nbsp;&mdash;&nbsp; *null / function*
  * Default value: `null`.
  * Optionally, you can provide a callback that will be called when an item starts auto-scrolling a scroll target. The callback function will receive the following arguments:
    * **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The dragged `Muuri.Item` instance.
    * **scrollElement** &nbsp;&mdash;&nbsp; *element*
      * The scrolled element.
    * **direction** &nbsp;&mdash;&nbsp; *number*
      * The direction of the scroll, one of the following: `Muuri.AutoScroller.LEFT`, `Muuri.AutoScroller.RIGHT`, `Muuri.AutoScroller.UP`, `Muuri.AutoScroller.DOWN`.
* **onStop** &nbsp;&mdash;&nbsp; *null / function*
  * Default value: `null`.
  * Optionally, you can provide a callback that will be called when an item stops auto-scrolling a scroll target. The callback function will receive the following arguments:
    * **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The dragged `Muuri.Item` instance.
    * **scrollElement** &nbsp;&mdash;&nbsp; *element*
      * The scrolled element.
    * **direction** &nbsp;&mdash;&nbsp; *number*
      * The direction of the scroll, one of the following: `Muuri.AutoScroller.LEFT`, `Muuri.AutoScroller.RIGHT`, `Muuri.AutoScroller.UP`, `Muuri.AutoScroller.DOWN`.

```javascript
// Create a fixed drag container for the dragged items, this is done with JS
// just for example's purposes.
var dragContainer = document.createElement('div');
dragContainer.style.position = 'fixed';
dragContainer.style.left = '0px';
dragContainer.style.top = '0px';
dragContainer.style.zIndex = 1000;
document.body.appendChild(dragContainer);

var grid = new Muuri(elem, {
  dragEnabled: true,
  dragContainer: dragContainer,
  dragAutoScroll: {
    targets: [
      // Scroll window on both x-axis and y-axis.
      { element: window, priority: 0 },
      // Scroll scrollElement (can be any scrollable element) on y-axis only,
      // and prefer it over window in conflict scenarios.
      { element: scrollElement, priority: 1, axis: Muuri.AutoScroller.AXIS_Y }
    ],
    // Let's use the dragged item element as the handle.
    handle: null,
    // Start auto-scroll when the distance from scroll target's edge to dragged
    // item is 40px or less.
    threshold: 40,
    // Make sure the inner 10% of the scroll target's area is always "safe zone"
    // which does not trigger auto-scroll.
    safeZone: 0.1,
    // Let's define smooth dynamic speed.
    // Max speed: 2000 pixels per second
    // Acceleration: 2700 pixels per second
    // Deceleration: 3200 pixels per second.
    speed: Muuri.AutoScroller.smoothSpeed(2000, 2700, 3200),
    // Let's not sort during scroll.
    sortDuringScroll: false,
    // No need to sync dragged item positions after scroll since we place all
    // the dragged items within a fixed element which does not scroll.
    syncAfterScroll: false,
    // Finally let's log some data when auto-scroll starts and stops.
    onStart: function (item, scrollElement, direction) {
      console.log('AUTOSCROLL STARTED', item, scrollElement, direction);
    },
    onStop: function (item, scrollElement, direction) {
      console.log('AUTOSCROLL STOPPED', item, scrollElement, direction);
    }
  }
});
```

### containerClass &nbsp;

Container element's class name.

* Default value: `'muuri'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  containerClass: 'foo'
});
```

### itemClass &nbsp;

Item element's class name.

* Default value: `'muuri-item'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  itemClass: 'foo-item'
});
```

### itemVisibleClass &nbsp;

Visible item's class name.

* Default value: `'muuri-item-shown'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  itemVisibleClass: 'foo-item-shown'
});
```

### itemHiddenClass &nbsp;

Hidden item's class name.

* Default value: `'muuri-item-hidden'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  itemHiddenClass: 'foo-item-hidden'
});
```

### itemPositioningClass &nbsp;

This class name will be added to the item element for the duration of positioning.

* Default value: `'muuri-item-positioning'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  itemPositioningClass: 'foo-item-positioning'
});
```

### itemDraggingClass &nbsp;

This class name will be added to the item element for the duration of drag.

* Default value: `'muuri-item-dragging'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  itemDraggingClass: 'foo-item-dragging'
});
```

### itemReleasingClass &nbsp;

This class name will be added to the item element for the duration of release.

* Default value: `'muuri-item-releasing'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  itemReleasingClass: 'foo-item-releasing'
});
```

### itemPlaceholderClass &nbsp;

This class name will be added to the drag placeholder element.

* Default value: `'muuri-item-placeholder'`.
* Accepted types: string.

```javascript
var grid = new Muuri(elem, {
  itemPlaceholderClass: 'foo-item-placeholder'
});
```

### Grid methods

* [grid.getElement()](#gridgetelement)
* [grid.getItem( target )](#gridgetitem-target-)
* [grid.getItems( [targets] )](#gridgetitems-targets-)
* [grid.refreshItems( [items, force] )](#gridrefreshitems-items-force-)
* [grid.refreshSortData( [items] )](#gridrefreshsortdata-items-)
* [grid.synchronize()](#gridsynchronize)
* [grid.layout( [instant], [callback] )](#gridlayout-instant-callback-)
* [grid.add( elements, [options] )](#gridadd-elements-options-)
* [grid.remove( items, [options] )](#gridremove-items-options-)
* [grid.show( items, [options] )](#gridshow-items-options-)
* [grid.hide( items, [options] )](#gridhide-items-options-)
* [grid.filter( predicate, [options] )](#gridfilter-predicate-options-)
* [grid.sort( comparer, [options] )](#gridsort-comparer-options-)
* [grid.move( item, position, [options] )](#gridmove-item-position-options-)
* [grid.send( item, grid, position, [options] )](#gridsend-item-grid-position-options-)
* [grid.on( event, listener )](#gridon-event-listener-)
* [grid.off( event, listener )](#gridoff-event-listener-)
* [grid.destroy( [removeElements] )](#griddestroy-removeelements-)

### grid.getElement()

Get the grid element.

**Returns** &nbsp;&mdash;&nbsp; *element*

```javascript
var elem = grid.getElement();
```

### grid.getItem( target )

Get a single grid item by element or by index. Target can also be a `Muuri.Item` instance in which case the function returns the item if it exists within related `Muuri` instance. If nothing is found with the provided target, `null` is returned.

**Parameters**

* **target** &nbsp;&mdash;&nbsp; *element / number / Muuri.Item*

**Returns** &nbsp;&mdash;&nbsp; *Muuri.Item / null*

Returns the queried item or `null` if no item is found.

```javascript
// Get first item in grid.
var itemA = grid.getItem(0);

// Get item by element reference.
var itemB = grid.getItem(someElement);
```

### grid.getItems( [targets] )

Get all items in the grid. Optionally you can provide specific targets (indices or elements).

**Parameters**

* **targets** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * An array of item instances/elements/indices.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns the queried items.

```javascript
// Get all items, both active and inactive.
var allItems = grid.getItems();

// Get all active items.
var activeItems = grid.getItems().filter(function (item) {
  return item.isActive();
});

// Get all positioning items.
var positioningItems = grid.getItems().filter(function (item) {
  return item.isPositioning();
});

// Get the first item.
var firstItem = grid.getItems(0)[0];

// Get specific items by their elements.
var items = grid.getItems([elemA, elemB]);
```

### grid.refreshItems( [items], [force] )

Update the cached dimensions of the instance's items. By default all the items are refreshed, but you can also provide an array of target items as the first argument if you want to refresh specific items. Note that all hidden items are not refreshed by default since their `display` property is `'none'` and their dimensions are therefore not readable from the DOM. However, if you do want to force update hidden item dimensions too you can provide `true` as the second argument, which makes the elements temporarily visible while their dimensions are being read.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number / string*
  * To target specific items provide an array of item instances/elements/indices. By default all items are targeted.
  * Optional.
* **force** &nbsp;&mdash;&nbsp; *boolean*
  * Set to `true` to read dimensions of hidden items too (and make them visible for the duration of the reading).
  * Default: `false`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Refresh dimensions of all items.
grid.refreshItems();

// Refresh dimensions of specific items.
grid.refreshItems([0, someElem, someItem]);

// Refresh dimensions of specific items and force read their
// dimensions even if they are hidden. Note that this has performance cost.
grid.refreshItems([0, someElem, someHiddenItem], true);
```

### grid.refreshSortData( [items] )

Refresh the sort data of the grid's items.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array / element / Muuri.Item / number*
  * To target specific items provide an array of item instances/elements/indices. By default all items are targeted.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Refresh the sort data for every item.
grid.refreshSortData();

// Refresh the sort data for specific items.
grid.refreshSortData([0, someElem, someItem]);
```

### grid.synchronize()

Synchronize the item elements in the DOM to match the order of the items in the grid. This comes handy if you need to keep the DOM structure matched with the order of the items. Note that if an item's element is not currently a child of the container element (if it is dragged for example) it is ignored and left untouched. The reason why item elements are not kept in sync automatically is that there's rarely a need for that as they are absolutely positioned elements.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Let's say we have to move the first item in the grid as the last.
grid.move(0, -1);

// Now the order of the item elements in the DOM is not in sync anymore
// with the order of the items in the grid. We can sync the DOM with
// synchronize method.
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
  * A callback function that is called after every item in the layout has finished/aborted positioning.
  * Receives two arguments:
    * An array of all the items in the layout.
    * A boolean indicating if the layout has changed or not.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Layout items.
grid.layout();

// Layout items instantly (without animations).
grid.layout(true);

// Layout all items and define a callback that will be called
// after all items have been animated to their positions.
grid.layout(function (items, hasLayoutChanged) {
  // If hasLayoutChanged is `true` it means that there has been another layout
  // call before this layout had time to finish positioning all the items.
  console.log('layout done!');
});
```

### grid.add( elements, [options] )

Add new items by providing the elements you wish to add to the grid and optionally provide the index where you want the items to be inserted into. All elements that are not already children of the container element will be automatically appended to the container element. If an element has it's CSS display property set to none it will be marked as *inactive* during the initiation process. As long as the item is *inactive* it will not be part of the layout, but it will retain it's index. You can activate items at any point with `grid.show()` method. This method will automatically call `grid.layout()` if one or more of the added elements are visible. If only hidden items are added no layout will be called. All the new visible items are positioned without animation during their first layout.

**Parameters**

* **elements** &nbsp;&mdash;&nbsp; *array / element*
  * An array of DOM elements.
* **options.active** &nbsp;&mdash;&nbsp; *boolean / undefined*
  * By default (when this option is `undefined`) Muuri will automatically detect from each element's `display` style if the item should be active (visible) or inactive (hidden) on init. If the element's `display` style is `none` then the item will be inactive on init. However, you can also provide a boolean here to force the item to be active (`true`) or inactive (`false`) on init.
  * Default value: `undefined`.
  * Optional.
* **options.index** &nbsp;&mdash;&nbsp; *number*
  * The index where you want the items to be inserted in. A value of `-1` will insert the items to the end of the list while `0` will insert the items to the beginning. Note that the DOM elements are always just appended to the instance container regardless of the index value. You can use the `grid.synchronize()` method to arrange the DOM elements to the same order as the items.
  * Default value: `-1`.
  * Optional.
* **options.layout** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns the added items.

```javascript
// Add two new items to the end.
grid.add([elemA, elemB]);

// Add two new items to the beginning.
grid.add([elemA, elemB], {index: 0});

// Skip the automatic layout.
grid.add([elemA, elemB], {layout: false});
```

### grid.remove( items, [options] )

Remove items from the grid.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of item instances.
* **options.removeElements** &nbsp;&mdash;&nbsp; *boolean*
  * Should the associated DOM element be removed from the DOM?
  * Default value: `false`.
  * Optional.
* **options.layout** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *array*

Returns the destroyed items.

```javascript
// Remove the first item, but keep the element in the DOM.
grid.remove(grid.getItems(0));

// Remove items and the associated elements.
grid.remove([itemA, itemB], {removeElements: true});

// Skip the layout.
grid.remove([itemA, itemB], {layout: false});
```

### grid.show( items, [options] )

Show the targeted items.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of item instances.
* **options.instant** &nbsp;&mdash;&nbsp; *boolean*
  * Should the items be shown instantly without any possible animation?
  * Default value: `false`.
  * Optional.
* **options.syncWithLayout** &nbsp;&mdash;&nbsp; *boolean*
  * Should we wait for the next layout's calculations (which are potentially async) to finish before starting the show animations? By default this option is enabled so that the show animations are triggered in sync with the layout animations. If that's not needed set this to `false` and the show animations will begin immediately.
  * Default value: `true`.
  * Optional.
* **options.onFinish** &nbsp;&mdash;&nbsp; *function*
  * A callback function that is called after the items are shown.
  * Optional.
* **options.layout** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Show items with animation (if any).
grid.show([itemA, itemB]);

// Show items instantly without animations.
grid.show([itemA, itemB], {instant: true});

// Show items with callback (and with animations if any).
grid.show([itemA, itemB], {onFinish: function (items) {
  console.log('items shown!');
}});
```

### grid.hide( items, [options] )

Hide the targeted items.

**Parameters**

* **items** &nbsp;&mdash;&nbsp; *array*
  * An array of item instances.
* **options.instant** &nbsp;&mdash;&nbsp; *boolean*
  * Should the items be hidden instantly without any possible animation?
  * Default value: `false`.
  * Optional.
* **options.syncWithLayout** &nbsp;&mdash;&nbsp; *boolean*
  * Should we wait for the next layout's calculations (which are potentially async) to finish before starting the hide animations? By default this option is enabled so that the hide animations are triggered in sync with the layout animations. If that's not needed set this to `false` and the hide animations will begin immediately.
  * Default value: `true`.
  * Optional.
* **options.onFinish** &nbsp;&mdash;&nbsp; *function*
  * A callback function that is called after the items are hidden.
  * Optional.
* **options.layout** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Hide items with animation.
grid.hide([itemA, itemB]);

// Hide items instantly without animations.
grid.hide([itemA, itemB], {instant: true});

// Hide items and call the callback function after
// all items are hidden.
grid.hide([itemA, itemB], {onFinish: function (items) {
  console.log('items hidden!');
}});
```

### grid.filter( predicate, [options] )

Filter items. Expects at least one argument, a predicate, which should be either a function or a string. The predicate callback is executed for every item in the grid. If the return value of the predicate is truthy the item in question will be shown and otherwise hidden. The predicate callback receives the item instance as it's argument. If the predicate is a string it is considered to be a selector and it is checked against every item element in the grid with the native element.matches() method. All the matching items will be shown and others hidden.

**Parameters**

* **predicate** &nbsp;&mdash;&nbsp; *function / string*
  * A predicate callback or a selector.
* **options.instant** &nbsp;&mdash;&nbsp; *boolean*
  * Should the items be shown/hidden instantly without any possible animation?
  * Default value: `false`.
  * Optional.
* **options.syncWithLayout** &nbsp;&mdash;&nbsp; *boolean*
  * Should we wait for the next layout's calculations (which are potentially async) to finish before starting the visibility animations? By default this option is enabled so that the visibility animations are triggered in sync with the layout animations. If that's not needed set this to `false` and the visibility animations will begin immediately.
  * Default value: `true`.
  * Optional.
* **options.onFinish** &nbsp;&mdash;&nbsp; *function*
  * An optional callback function that is called after all the items are shown/hidden.
  * Optional.
* **options.layout** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Show all items that have the attribute "data-foo".
grid.filter(function (item) {
  return item.getElement().hasAttribute('data-foo');
});

// Or simply just...
grid.filter('[data-foo]');

// Show all items that have a class foo.
grid.filter('.foo');
```

### grid.sort( comparer, [options] )

Sort items. There are three ways to sort the items. The first is simply by providing a function as the comparer which works almost identically to [native array sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort). The only difference is that the sort is always stable. Alternatively you can sort by the sort data you have provided in the grid's options. Just provide the sort data key(s) as a string (separated by space) and the items will be sorted based on the provided sort data keys. Lastly you have the opportunity to provide a presorted array of items which will be used to sync the internal items array in the same order.

**Parameters**

* **comparer** &nbsp;&mdash;&nbsp; *array / function / string*
  * Provide a comparer function, sort data keys as a string (separated with space) or a pre-sorted array of items. When you provide a pre-sorted array of items you _must_ make sure that it contains _exactly_ the same item instances as exists currently in `grid._items` (retrievable safely via `grid.getItems()`), only change the order of items. Muuri does not validate the array of items you provide due to performance reasons.
* **options.descending** &nbsp;&mdash;&nbsp; *boolean*
  * By default the items are sorted in ascending order. If you want to sort them in descending order set this to `true`. Note that this option has no effect when you provide a pre-sorted array of items.
  * Default value: `false`.
  * Optional.
* **options.layout** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Sort items by data-id attribute value (ascending).
grid.sort(function (itemA, itemB) {
  var aId = parseInt(itemA.getElement().getAttribute('data-id'));
  var bId = parseInt(itemB.getElement().getAttribute('data-id'));
  return aId - bId;
});

// Sort items with a presorted array of items.
grid.sort(grid.getItems().reverse());

// Sort items using the sort data keys (ascending).
grid.sort('foo bar');

// Sort items using the sort data keys (descending).
grid.sort('foo bar', {descending: true});

// Sort items using the sort data keys. Sort some keys
// ascending and some keys descending.
grid.sort('foo bar:desc');
```

### grid.move( item, position, [options] )

Move an item to another position in the grid.

**Parameters**

* **item** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * Item instance, element or index.
* **position** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * Item instance, element or index.
* **options.action** &nbsp;&mdash;&nbsp; *string*
  * Accepts the following values:
    * `'move'`: moves item in place of another item.
    * `'swap'`: swaps position of items.
  * Default value: `'move'`.
  * Optional.
* **options.layout** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Move elemA to the index of elemB.
grid.move(elemA, elemB);

// Move the first item in the grid as the last.
grid.move(0, -1);

// Swap positions of elemA and elemB.
grid.move(elemA, elemB, {action: 'swap'});

// Swap positions of the first and the last item.
grid.move(0, -1, {action: 'swap'});
```

### grid.send( item, grid, position, [options] )

Move an item into another grid.

**Parameters**

* **item** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * The item that should be moved. You can define the item with an item instance, element or index.
* **grid** &nbsp;&mdash;&nbsp; *Muuri*
  * The grid where the item should be moved to.
* **position** &nbsp;&mdash;&nbsp; *element / Muuri.Item / number*
  * To which position should the item be placed to in the new grid? You can define the position with an item instance, element or index.
* **options.appendTo** &nbsp;&mdash;&nbsp; *element*
  * Which element the item element should be appended to for the duration of the layout animation?
  * Default value: `document.body`.
* **options.layoutSender** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called for the sending grid at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.
* **options.layoutReceiver** &nbsp;&mdash;&nbsp; *boolean / function / string*
  * By default `grid.layout()` is called for the receiving grid at the end of this method. With this argument you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  * Default value: `true`.
  * Optional.

```javascript
// Move the first item of gridA as the last item of gridB.
// The sent item will be appended to document.body.
gridA.send(0, gridB, -1);

// Move the first item of gridA as the last item of gridB.
// The sent item will be appended to someElem.
gridA.send(0, gridB, -1, {
  appendTo: someElem
});

// Do something after the item has been sent and the layout
// processes have finished.
gridA.send(0, gridB, -1, {
  layoutSender: function (isAborted, items) {
    // Do your thing here...
  },
  layoutReceiver: function (isAborted, items) {
    // Do your other thing here...
  }
});
```

### grid.on( event, listener )

Bind an event listener.

**Parameters**

* **event** &nbsp;&mdash;&nbsp; *string*
* **listener** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
grid.on('layoutEnd', function (items) {
  console.log(items);
});
```

### grid.off( event, listener )

Unbind an event listener.

**Parameters**

* **event** &nbsp;&mdash;&nbsp; *string*
* **listener** &nbsp;&mdash;&nbsp; *function*

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
var listener = function (items) {
  console.log(items);
};

muuri
.on('layoutEnd', listener)
.off('layoutEnd', listener);
```

### grid.destroy( [removeElements] )

Destroy the grid.

**Parameters**

* **removeElements** &nbsp;&mdash;&nbsp; *boolean*
  * Should the item elements be removed or not?
  * Default value: `false`.
  * Optional.

**Returns** &nbsp;&mdash;&nbsp; *object*

Returns the grid instance.

```javascript
// Destroy the instance.
grid.destroy();
// Destroy the instance and remove item elements.
grid.destroy(true);
```

### Grid events

* [synchronize](#synchronize)
* [layoutStart](#layoutstart)
* [layoutEnd](#layoutend)
* [layoutAbort](#layoutabort)
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
* [beforeSend](#beforesend)
* [receive](#receive)
* [beforeReceive](#beforereceive)
* [dragInit](#draginit)
* [dragStart](#dragstart)
* [dragMove](#dragmove)
* [dragScroll](#dragscroll)
* [dragEnd](#dragend)
* [dragReleaseStart](#dragreleasestart)
* [dragReleaseEnd](#dragreleaseend)
* [destroy](#destroy)

### synchronize

Triggered after item elements are synchronized via `grid.synchronize()`.

```javascript
grid.on('synchronize', function () {
  console.log('Synced!');
});
```

### layoutStart

Triggered when the the layout procedure begins. More specifically, this event is emitted right after new _layout_ has been generated, internal item positions updated and grid element's dimensions updated. After this event is emitted the items in the layout will be positioned to their new positions. So if you e.g. want to react to grid element dimension changes this is a good place to do that.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that are about to be positioned.
* **isInstant** &nbsp;&mdash;&nbsp; *boolean*
  * Was the layout called with `instant` flag or not.

```javascript
grid.on('layoutStart', function (items, isInstant) {
  console.log(items, isInstant);
});
```

### layoutEnd

Triggered after the layout procedure has finished, successfully. Note that if you abort a layout procedure by calling `grid.layout()` _before_ items have finished positioning, this event will not be emitted for the aborted layout procedure. In such a case `layoutAbort` will be emitted instead.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that were positioned. Note that these items are always identical to what the _layoutStart_ event's callback receives as it's argument.

```javascript
grid.on('layoutEnd', function (items) {
  console.log(items);
  // For good measure you might want to filter out all the non-active items,
  // because it's techniclly possible that some of the items are
  // destroyed/hidden when we receive this event.
  var activeItems = items.filter(function(item) {
    return item.isActive();
  });
});
```

### layoutAbort

Triggered if you start a new layout process (`grid.layout()`) while the current layout process is still busy positioning items. Note that this event is not triggered if you start a new layout process while the layout is being computed and the items have not yet started positioning.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that were attempted to be positioned. Note that these items are always identical to what the _layoutStart_ event's callback receives as it's argument.

```javascript
grid.on('layoutAbort', function (items) {
  console.log(items);
  // For good measure you might want to filter out all the non-active items,
  // because it's techniclly possible that some of the items are destroyed or
  // hidden when we receive this event.
  var activeItems = items.filter(function(item) {
    return item.isActive();
  });
});
```

### add

Triggered after `grid.add()` is called.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that were successfully added.

```javascript
grid.on('add', function (items) {
  console.log(items);
});
```

### remove

Triggered after `grid.remove()` is called.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that were successfully removed.
* **indices** &nbsp;&mdash;&nbsp; *array*
  * Indices of the items that were successfully removed.

```javascript
grid.on('remove', function (items, indices) {
  console.log(items, indices);
});
```

### showStart

Triggered after `grid.show()` is called, just before the items are shown.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that are about to be shown.

```javascript
grid.on('showStart', function (items) {
  console.log(items);
});
```

### showEnd

Triggered after `grid.show()` is called, after the items are shown.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that were successfully shown without interruptions. If you, for example, call `grid.hide()` to some of the items that are currently being shown, those items will be omitted from this argument.

```javascript
grid.on('showEnd', function (items) {
  console.log(items);
});
```

### hideStart

Triggered after `grid.hide()` is called, just before the items are hidden.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that are about to be hidden.

```javascript
grid.on('hideStart', function (items) {
  console.log(items);
});
```

### hideEnd

Triggered after `grid.hide()` is called, after the items are hidden.

**Arguments**

* **items** &nbsp;&mdash;&nbsp; *array*
  * The items that were successfully hidden without interruptions. If you, for example, call `grid.show()` to some of the items that are currently being hidden, those items will be omitted from this argument.

```javascript
grid.on('hideEnd', function (items) {
  console.log(items);
});
```

### filter

Triggered after `grid.filter()` is called.

**Arguments**

* **shownItems** &nbsp;&mdash;&nbsp; *array*
  * The items that are shown.
* **hiddenItems** &nbsp;&mdash;&nbsp; *array*
  * The items that are hidden.

```javascript
grid.on('filter', function (shownItems, hiddenItems) {
  console.log(shownItems);
  console.log(hiddenItems);
});
```

### sort

Triggered after `grid.sort()` is called.

**Arguments**

* **currentOrder** &nbsp;&mdash;&nbsp; *array*
  * All items in their current order.
* **previousOrder** &nbsp;&mdash;&nbsp; *array*
  * All items in their previous order.

```javascript
grid.on('sort', function (currentOrder, previousOrder) {
  console.log(currentOrder);
  console.log(previousOrder);
});
```

### move

Triggered after `grid.move()` is called or when the grid is sorted during drag. Note that this is event not triggered when an item is dragged into another grid.

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

```javascript
grid.on('move', function (data) {
  console.log(data);
});
```

### send

Triggered for the originating grid in the end of the *send process* (after `grid.send()` is called or when an item is dragged into another grid). Note that this event is called *before* the item's layout starts.

**Arguments**

* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The item that was sent.
    * **data.fromGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent from.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent to.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

```javascript
grid.on('send', function (data) {
  console.log(data);
});
```

### beforeSend

Triggered for the originating grid in the beginning of the *send process* (after `grid.send()` is called or when an item is dragged into another grid). This event is highly useful in situations where you need to manipulate the sent item (freeze it's dimensions for example) before it is appended to it's temporary layout container as defined in [send method options](#gridsend-item-grid-position-options-).

**Arguments**

* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The item that was sent.
    * **data.fromGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent from.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent to.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

```javascript
grid.on('beforeSend', function (data) {
  console.log(data);
});
```

### receive

Triggered for the receiving grid in the end of the *send process* (after `grid.send()` is called or when an item is dragged into another grid). Note that this event is called *before* the item's layout starts.

**Arguments**

* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The item that was sent.
    * **data.fromGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent from.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent to.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

```javascript
grid.on('receive', function (data) {
  console.log(data);
});
```

### beforeReceive

Triggered for the receiving grid in the beginning of the *send process* (after `grid.send()` is called or when an item is dragged into another grid). This event is highly useful in situations where you need to manipulate the received item (freeze it's dimensions for example) before it is appended to it's temporary layout container as defined in [send method options](#gridsend-item-grid-position-options-).

**Arguments**

* **data** &nbsp;&mdash;&nbsp; *object*
    * **data.item** &nbsp;&mdash;&nbsp; *Muuri.Item*
      * The item that was sent.
    * **data.fromGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent from.
    * **data.fromIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved from.
    * **data.toGrid** &nbsp;&mdash;&nbsp; *Muuri*
      * The grid the item was sent to.
    * **data.toIndex** &nbsp;&mdash;&nbsp; *number*
      * The index the item was moved to.

```javascript
grid.on('beforeReceive', function (data) {
  console.log(data);
});
```

### dragInit

Triggered in the beginning of the *drag start* process when dragging of an item begins. This event is highly useful in situations where you need to manipulate the dragged item (freeze it's dimensions for example) before it is appended to the [dragContainer](#dragcontainer-).

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.
* **event** &nbsp;&mdash;&nbsp; *object*
  * Muuri.Dragger event data.

```javascript
grid.on('dragInit', function (item, event) {
  console.log(event);
  console.log(item);
});
```

### dragStart

Triggered in the end of the *drag start* process when dragging of an item begins.

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.
* **event** &nbsp;&mdash;&nbsp; *object*
  * Muuri.Dragger event data.

```javascript
grid.on('dragStart', function (item, event) {
  console.log(event);
  console.log(item);
});
```

### dragMove

Triggered when an item is dragged after the *drag start* process.

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.
* **event** &nbsp;&mdash;&nbsp; *object*
  * Muuri.Dragger event data.

```javascript
grid.on('dragMove', function (item, event) {
  console.log(event);
  console.log(item);
});
```

### dragScroll

Triggered when any of the scroll parents of a dragged item is scrolled.

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.
* **event** &nbsp;&mdash;&nbsp; *object*
  * The scroll event data.

```javascript
grid.on('dragScroll', function (item, event) {
  console.log(event);
  console.log(item);
});
```

### dragEnd

Triggered when dragging of an item ends.

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The dragged item.
* **event** &nbsp;&mdash;&nbsp; *object*
  * Muuri.Dragger event data.

```javascript
grid.on('dragEnd', function (item, event) {
  console.log(event);
  console.log(item);
});
```

### dragReleaseStart

Triggered when a dragged item is released.

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The released item.

```javascript
grid.on('dragReleaseStart', function (item) {
  console.log(item);
});
```

### dragReleaseEnd

Triggered after released item has been animated to position.

**Arguments**

* **item** &nbsp;&mdash;&nbsp; *Muuri.Item*
  * The released item.

```javascript
grid.on('dragReleaseEnd', function (item) {
  console.log(item);
});
```

### destroy

Triggered after `grid.destroy()` is called.

```javascript
grid.on('destroy', function () {
  console.log('Muuri is no more...');
});
```

### Item methods

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
* [item.isDestroyed()](#itemisdestroyed)

### item.getGrid()

Get the item's grid instance.

**Returns** &nbsp;&mdash;&nbsp; *Muuri*

```javascript
var grid = item.getGrid();
```

### item.getElement()

Get the item element.

**Returns** &nbsp;&mdash;&nbsp; *element*

```javascript
var elem = item.getElement();
```

### item.getWidth()

Get item element's cached width. The returned value includes the element's paddings and borders.

**Returns** &nbsp;&mdash;&nbsp; *number*

```javascript
var width = item.getWidth();
```

### item.getHeight()

Get item element's cached height. The returned value includes the element's paddings and borders.

**Returns** &nbsp;&mdash;&nbsp; *number*

```javascript
var height = item.getHeight();
```

### item.getMargin()

Get item element's cached margins.

**Returns** &nbsp;&mdash;&nbsp; *object*

* **obj.left** &nbsp;&mdash;&nbsp; *number*
* **obj.right** &nbsp;&mdash;&nbsp; *number*
* **obj.top** &nbsp;&mdash;&nbsp; *number*
* **obj.bottom** &nbsp;&mdash;&nbsp; *number*

```javascript
var margin = item.getMargin();
```

### item.getPosition()

Get item element's cached position (relative to the container element).

**Returns** &nbsp;&mdash;&nbsp; *object*

* **obj.left** &nbsp;&mdash;&nbsp; *number*
* **obj.top** &nbsp;&mdash;&nbsp; *number*

```javascript
var position = item.getPosition();
```

### item.isActive()

Check if the item is currently *active*. Only active items are considered to be part of the layout.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

```javascript
var isActive = item.isActive();
```

### item.isVisible()

Check if the item is currently *visible*.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

```javascript
var isVisible = item.isVisible();
```

### item.isShowing()

Check if the item is currently animating to visible.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

```javascript
var isShowing = item.isShowing();
```

### item.isHiding()

Check if the item is currently animating to hidden.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

```javascript
var isHiding = item.isHiding();
```

### item.isPositioning()

Check if the item is currently being positioned.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

```javascript
var isPositioning = item.isPositioning();
```

### item.isDragging()

Check if the item is currently being dragged.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

```javascript
var isDragging = item.isDragging();
```

### item.isReleasing()

Check if the item is currently being released.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

```javascript
var isReleasing = item.isReleasing();
```

### item.isDestroyed()

Check if the item is destroyed.

**Returns** &nbsp;&mdash;&nbsp; *boolean*

```javascript
var isDestroyed = item.isDestroyed();
```

## Credits

**Created and maintained by [Niklas Rämö](https://github.com/niklasramo).**

* This project owes much to David DeSandro's [Masonry](http://masonry.desandro.com/), [Packery](http://packery.metafizzy.co/) and [Isotope](https://isotope.metafizzy.co/) libraries. You should go ahead and check them out right now if you haven't yet. Thanks Dave!
* Jukka Jylänki's survey "A Thousand Ways to Pack the Bin - A Practical Approach to Two-Dimensional Rectangle Bin Packing" came in handy when building Muuri's layout algorithms. Check out the survey's source code here: https://github.com/juj/RectangleBinPack. Thanks Jukka!
* Big thanks to the people behind [Web Animations polyfill](https://github.com/web-animations/web-animations-js), Muuri would be much less cool without smooth animations.
* [Haltu Oy](http://www.haltu.fi/) was responsible for initiating this project in the first place and funded the initial development. Thanks Haltu!

## License

Copyright &copy; 2015 Haltu Oy. Licensed under **[the MIT license](LICENSE.md)**.
