## _option:_ items

The initial item elements, which should be children of the grid element. All elements that are not children of the grid element (e.g. if they are not in the DOM yet) will be appended to the grid element. You can provide an array of elements, [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList), [HTMLCollection](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection) or a selector (string). If you provide a selector Muuri uses it to filter the current child elements of the container element and sets them as initial items. By default all current child elements of the provided grid element are used as initial items.

- Default value: `'*'`.
- Accepted types: array (of elements), [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList), [HTMLCollection](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection), string, null.

**Examples**

```javascript
// Use specific items.
var grid = new Muuri(elem, {
  items: [elemA, elemB, elemC],
});
// Use node list.
var grid = new Muuri(elem, {
  items: elem.querySelectorAll('.item'),
});
// Use selector.
var grid = new Muuri(elem, {
  items: '.item',
});
```

## _option:_ showDuration

Show animation duration in milliseconds. Set to `0` to disable show animation.

- Default value: `300`.
- Accepted types: number.

**Examples**

```javascript
var grid = new Muuri(elem, {
  showDuration: 600,
});
```

## _option:_ showEasing

Show animation easing. Accepts any valid [Animation easing](https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/easing) value.

- Default value: `'ease'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  showEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
});
```

## _option:_ hideDuration

Hide animation duration in milliseconds. Set to `0` to disable hide animation.

- Default value: `300`.
- Accepted types: number.

**Examples**

```javascript
var grid = new Muuri(elem, {
  hideDuration: 600,
});
```

## _option:_ hideEasing

Hide animation easing. Accepts any valid [Animation easing](https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/easing) value.

- Default value: `'ease'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  hideEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
});
```

## _option:_ visibleStyles

The styles that will be applied to all visible items. These styles are also used for the show/hide animations which means that you have to have the same style properties in visibleStyles and hiddenStyles options. Be sure to define all style properties camel cased and without vendor prefixes (Muuri prefixes the properties automatically where needed).

- Default value:
  ```javascript
  {
    opacity: 1,
    transform: 'scale(1)'
  }
  ```
- Accepted types: object.

**Examples**

```javascript
var grid = new Muuri(elem, {
  visibleStyles: {
    opacity: 1,
    transform: 'rotate(45deg)',
  },
  hiddenStyles: {
    opacity: 0,
    transform: 'rotate(-45deg)',
  },
});
```

## _option:_ hiddenStyles

The styles that will be applied to all hidden items. These styles are also used for the show/hide animations which means that you have to have the same style properties in visibleStyles and hiddenStyles options. Be sure to define all style properties camel cased and without vendor prefixes (Muuri prefixes the properties automatically where needed).

- Default value:
  ```javascript
  {
    opacity: 0,
    transform: 'scale(0.5)'
  }
  ```
- Accepted types: object.

**Examples**

```javascript
var grid = new Muuri(elem, {
  visibleStyles: {
    opacity: 1,
    transform: 'rotate(45deg)',
  },
  hiddenStyles: {
    opacity: 0,
    transform: 'rotate(-45deg)',
  },
});
```

## _option:_ layout

Define how the items will be positioned. Muuri ships with a configurable layout algorithm which is used by default. It's pretty flexible and suitable for most common situations (lists, grids and even bin packed grids). If that does not fit the bill you can always provide your own layout algorithm (it's not as scary as it sounds).

Muuri supports calculating the layout both synchronously and asynchronously. By default (if you use the default layout algorithm) Muuri will use two shared web workers to compute the layouts asynchronously. In browsers that do not support web workers Muuri will fallback to synchronous layout calculations.

- Default value:
  ```javascript
  {
    fillGaps: false,
    horizontal: false,
    alignRight: false,
    alignBottom: false,
    rounding: false
  }
  ```
- Accepted types: function, object.

**Provide an _object_ to configure the default layout algorithm with the following properties**

- **fillGaps** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `false`.
  - When `true` the algorithm goes through every item in order and places each item to the first available free slot, even if the slot happens to be visually _before_ the previous element's slot. Practically this means that the items might not end up visually in order, but there will be less gaps in the grid.
- **horizontal** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `false`.
  - When `true` the grid works in landscape mode (grid expands to the right). Use for horizontally scrolling sites. When `false` the grid works in "portrait" mode and expands downwards.
- **alignRight** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `false`.
  - When `true` the items are aligned from right to left.
- **alignBottom** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `false`.
  - When `true` the items are aligned from the bottom up.
- **rounding** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `false`.
  - When `true` the item dimensions are rounded to a precision of two decimals for the duration of layout calculations. This procedure stabilizes the layout calculations quite a lot, but also causes a hit on performance. Use only if you see your layout behaving badly, which might happen sometimes (hopefully never) when using relative dimension values.

**Provide a _function_ to use a custom layout algorithm**

When you provide a custom layout function Muuri calls it whenever calculation of layout is necessary. Before calling the layout function Muuri always calculates the current width and height of the grid element and also creates an array of all the items that are part of the layout currently (all _active_ items).

The layout function always receives the following arguments:

- **grid** &nbsp;&mdash;&nbsp; _Muuri_
  - The grid instance that requested the layout.
- **layoutId** &nbsp;&mdash;&nbsp; _number_
  - Automatically generated unique id for the layout which is used to keep track of the layout requests and to make sure that the correct layout gets applied at correct time.
- **items** &nbsp;&mdash;&nbsp; _array_
  - Array of `Muuri.Item` instances. A new array instance is created for each layout so there's no harm in manipulating this if you need to (or using it as is for the layout data object).
- **width** &nbsp;&mdash;&nbsp; _number_
  - Current width (in pixels) of the grid element (excluding borders, but including padding).
- **height** &nbsp;&mdash;&nbsp; _number_
  - Current height (in pixels) of the grid element (excluding borders, but including padding).
- **callback** &nbsp;&mdash;&nbsp; _function_
  - When the layout is calculated and ready to be applied you need to call this callback function and provide a _layout object_ as it's argument. Note that if another layout is requesteded while the current layout is still being calculated (asynchronously) this layout will be ignored.

If the layout function's calculations are asynchronous you can optionally return a cancel function, which Muuri will call if there is a new layout request before the current layout has finished it's calculations.

The layout object, which needs to be provided to the callback, must include the following properties.

- **id** &nbsp;&mdash;&nbsp; _number_
  - The layout's unique id (must be the `layoutId` provided by Muuri).
- **items** &nbsp;&mdash;&nbsp; _array_
  - Array of the active item instances that are part of the layout. You can pass the same `items` array here which is provided by Muuri (in case you haven't mutated it). This array items must be identical to the array of items provided by Muuri.
- **slots** &nbsp;&mdash;&nbsp; _array_
  - Array of the item positions (numbers). E.g. if the items were `[a, b]` this should be `[aLeft, aTop, bLeft, bTop]`. You have to calculate the `left` and `top` position for each item in the provided _items_ array in the same order the items are provided.
- **styles** &nbsp;&mdash;&nbsp; _object / null_
  - Here you can optionally define all the layout related CSS styles that should be applied to the grid element _just_ before the `layoutStart` event is emitted. E.g. `{width: '100%', height: '200px', minWidth: '200px'}`.
  - It's important to keep in mind here that if the grid element's `box-sizing` CSS property is set to `border-box` the element's borders are included in the dimensions. E.g. if you set `{width: '100px', width: '100px'}` here and the element has a `5px` border and `box-sizing` is set to `border-box`, then the _layout's_ effective `width` and `height` (as perceived by Muuri) will be `90px`. So remember to take that into account and add the borders to the dimensions when necessary. If this sounds complicated then just don't set borders directly to the grid element or make sure that grid element's `box-sizing` is set to `content-box` (which is the default value).

Note that you can add additional properties to the layout object if you wish, e.g. the default layout algorithm also stores the layout's width and height (in pixels) to the layout object.

**Examples**

```javascript
// Customize the default layout algorithm.
var grid = new Muuri(elem, {
  layout: {
    fillGaps: true,
    horizontal: true,
    alignRight: true,
    alignBottom: true,
    rounding: true,
  },
});
```

```javascript
// Build your own layout algorithm.
var grid = new Muuri(elem, {
  layout: function (grid, layoutId, items, width, height, callback) {
    var layout = {
      id: layoutId,
      items: items,
      slots: [],
      styles: {},
    };
    // Calculate the slots asynchronously. Note that the timeout is here only
    // as an example and does not help at all in the calculations. You should
    // offload the calculations to web workers if you want real benefits.
    // Also note that doing asynchronous layout is completely optional and you
    // can call the callback function synchronously also.
    var timerId = window.setTimeout(function () {
      var item,
        m,
        x = 0,
        y = 0,
        w = 0,
        h = 0;
      for (var i = 0; i < items.length; i++) {
        item = items[i];
        x += w;
        y += h;
        m = item.getMargin();
        w = item.getWidth() + m.left + m.right;
        h = item.getHeight() + m.top + m.bottom;
        layout.slots.push(x, y);
      }
      w += x;
      h += y;
      // Set the CSS styles that should be applied to the grid element.
      layout.styles.width = w + 'px';
      layout.styles.height = h + 'px';
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
  },
});
```

## _option:_ layoutOnResize

Should Muuri automatically trigger `layout` method on window resize? Set to `false` to disable. When a number or `true` is provided Muuri will automatically position the items every time window is resized. The provided number (`true` is transformed to `0`) equals to the amount of time (in milliseconds) that is waited before items are positioned after each window resize event.

- Default value: `150`.
- Accepted types: boolean, number.

**Examples**

```javascript
// No layout on resize.
var grid = new Muuri(elem, {
  layoutOnResize: false,
});
```

```javascript
// Layout on resize (instantly).
var grid = new Muuri(elem, {
  layoutOnResize: true,
});
```

```javascript
// Layout on resize (with 200ms debounce).
var grid = new Muuri(elem, {
  layoutOnResize: 200,
});
```

## _option:_ layoutOnInit

Should Muuri trigger `layout` method automatically on init?

- Default value: `true`.
- Accepted types: boolean.

**Examples**

```javascript
var grid = new Muuri(elem, {
  layoutOnInit: false,
});
```

## _option:_ layoutDuration

The duration for item's layout animation in milliseconds. Set to `0` to disable.

- Default value: `300`.
- Accepted types: number.

**Examples**

```javascript
var grid = new Muuri(elem, {
  layoutDuration: 600,
});
```

## _option:_ layoutEasing

The easing for item's layout animation. Accepts any valid [Animation easing](https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/easing) value.

- Default value: `'ease'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  layoutEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
});
```

## _option:_ sortData

The sort data getter functions. Provide an object where the key is the name of the sortable attribute and the function returns a value (from the item) by which the items can be sorted.

- Default value: `null`.
- Accepted types: object, null.

**Examples**

```javascript
var grid = new Muuri(elem, {
  sortData: {
    foo: function (item, element) {
      return parseFloat(element.getAttribute('data-foo'));
    },
    bar: function (item, element) {
      return element.getAttribute('data-bar').toUpperCase();
    },
  },
});
// Refresh sort data whenever an item's data-foo or data-bar changes
grid.refreshSortData();
// Sort the grid by foo and bar.
grid.sort('foo bar');
```

## _option:_ dragEnabled

Should items be draggable?

- Default value: `false`.
- Accepted types: boolean.

**Examples**

```javascript
var grid = new Muuri(elem, {
  dragEnabled: true,
});
```

## _option:_ dragContainer

The element the dragged item should be appended to for the duration of the drag. If set to `null` (which is also the default value) the grid element will be used.

- Default value: `null`.
- Accepted types: element, null.

**Examples**

```javascript
var grid = new Muuri(elem, {
  dragContainer: document.body,
});
```

## _option:_ dragHandle

The element within the item element that should be used as the drag handle. This should be a CSS selector which will be fed to `element.querySelector()` as is to obtain the handle element when the item is instantiated. If no valid element is found or if this is `null` Muuri will use the item element as the handle.

- Default value: `null`.
- Accepted types: string, null.

**Examples**

```javascript
var grid = new Muuri(elem, {
  dragHandle: '.handle',
});
```

## _option:_ dragStartPredicate

A function that determines when the item should start moving when the item is being dragged. By default uses the built-in start predicate which has some configurable options.

- Default value:
  ```javascript
  {
    distance: 0,
    delay: 0
  }
  ```
- Accepted types: function, object.

If an object is provided the default start predicate handler will be used. You can define the following properties:

- **distance** &nbsp;&mdash;&nbsp; _number_
  - Default value: `0`.
  - How many pixels the user must drag before the drag procedure starts and the item starts moving.
- **delay** &nbsp;&mdash;&nbsp; _number_
  - Default value: `0`.
  - How long (in milliseconds) the user must drag before the dragging starts.

If you provide a function you can customize the drag start logic as you please. When the user starts to drag an item this predicate function will be called until you return `true` or `false`. If you return `true` the item will begin to move whenever the item is dragged. If you return `false` the item will not be moved at all. Note that after you have returned `true` or `false` this function will not be called until the item is released and dragged again.

The predicate function receives two arguments:

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The item that's being dragged.
- **event** &nbsp;&mdash;&nbsp; _object_
  - Muuri.Dragger event data.

**Examples**

```javascript
// Configure the default predicate
var grid = new Muuri(elem, {
  dragStartPredicate: {
    distance: 10,
    delay: 100,
  },
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
  },
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
    if (grid.getItems()[0] === item) {
      return false;
    }
    // For other items use the default drag start predicate.
    return Muuri.ItemDrag.defaultStartPredicate(item, e);
  },
});
```

## _option:_ dragAxis

Force items to be moved only vertically or horizontally when dragged. Set to `'x'` for horizontal movement and to `'y'` for vertical movement. By default items can be dragged both vertically and horizontally.

- Default value: `'xy'`.
- Accepted types: string.
- Allowed values: `'x'`, `'y'`, `'xy'`.

**Examples**

```javascript
// Move items only horizontally when dragged.
var grid = new Muuri(elem, {
  dragAxis: 'x',
});
```

```javascript
// Move items only vertically when dragged.
var grid = new Muuri(elem, {
  dragAxis: 'y',
});
```

## _option:_ dragSort

Should the items be sorted during drag? A simple boolean will do just fine here.

Alternatively you can do some advanced stuff and control within which grids a specific item can be sorted and dragged into. To do that you need to provide a function which receives the dragged item as its first argument and should return an array of grid instances. An important thing to note here is that you need to return _all_ the grid instances you want the dragged item to sort within, even the current grid instance. If you return an empty array the dragged item will not cause sorting at all.

- Default value: `true`.
- Accepted types: boolean, function.

**Examples**

```javascript
// Disable drag sorting.
var grid = new Muuri(elem, {
  dragSort: false,
});
```

```javascript
// Multigrid drag sorting.
var gridA = new Muuri(elemA, { dragSort: getAllGrids });
var gridB = new Muuri(elemB, { dragSort: getAllGrids });
var gridC = new Muuri(elemC, { dragSort: getAllGrids });
function getAllGrids(item) {
  return [gridA, gridB, gridC];
}
```

## _option:_ dragSortHeuristics

Defines various heuristics so that sorting during drag would be smoother and faster.

- Default value:
  ```javascript
  {
    sortInterval: 100,
    minDragDistance: 10,
    minBounceBackAngle: 1
  }
  ```
- Accepted types: object.

You can define the following properties:

- **sortInterval** &nbsp;&mdash;&nbsp; _number_
  - Default value: `100`.
  - Defines the amount of time the dragged item must be still before `dragSortPredicate` function is called.
- **minDragDistance** &nbsp;&mdash;&nbsp; _number_
  - Default value: `10`.
  - Defines how much (in pixels) the item must be dragged before `dragSortPredicate` can be called.
- **minBounceBackAngle** &nbsp;&mdash;&nbsp; _number_
  - Default value: `1`.
  - Defines the minimum angle (in radians) of the delta vector between the last movement vector and the current movement vector that is required for the dragged item to be allowed to be sorted to it's previous index. The problem this heuristic is trying to solve is the scenario where you drag an item over a much bigger item and the bigger item moves, but it's still overlapping the dragged item after repositioning. Now when you move the dragged item again another sort is triggered and the bigger item moves back to it's previous position. This bouncing back and forth can go on for quite a while and it looks quite erratic. The fix we do here is that, by default, we disallow an item to be moved back to it's previous position, unless it's drag direction changes enough. And what is enough? That's what you can define here. Note that this option works in tandem with `minDragDistance` and needs it to be set to `3` at minimum to be enabled at all.

**Examples**

```javascript
var grid = new Muuri(elem, {
  dragEnabled: true,
  dragSortHeuristics: {
    sortInterval: 10,
    minDragDistance: 5,
    minBounceBackAngle: Math.PI / 2,
  },
});
```

```javascript
// Pro tip: If you want drag sorting happening only on release set a really
// long sortInterval. A bit of a hack, but works.
var grid = new Muuri(elem, {
  dragEnabled: true,
  dragSortHeuristics: {
    sortInterval: 3600000, // 1 hour
  },
});
```

## _option:_ dragSortPredicate

Defines the logic for the sort procedure during dragging an item.

- Default value:
  ```javascript
  {
    threshold: 50,
    action: 'move',
    migrateAction: 'move'
  }
  ```
- Accepted types: function, object.

If an object is provided the default sort predicate handler will be used. You can define the following properties:

- **threshold** &nbsp;&mdash;&nbsp; _number_
  - Default value: `50`.
  - Allowed values: `1` - `100`.
  - How many percent the intersection area between the dragged item and the compared item should be from the maximum potential intersection area between the items before sorting is triggered.
- **action** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'move'`.
  - Allowed values: `'move'`, `'swap'`.
  - Should the dragged item be _moved_ to the new position or should it _swap_ places with the item it overlaps when the drag occurs within the same grid?
- **migrateAction** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'move'`.
  - Allowed values: `'move'`, `'swap'`.
  - Should the dragged item be _moved_ to the new position or should it _swap_ places with the item it overlaps when the dragged item is moved to another grid?

Alternatively you can provide your own callback function where you can define your own custom sort logic. The callback function receives two arguments:

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The item that's being dragged.
- **event** &nbsp;&mdash;&nbsp; _object_
  - Muuri.Dragger event data.

The callback should return a _falsy_ value if sorting should not occur. If, however, sorting should occur the callback should return an object containing the following properties:

- **index** &nbsp;&mdash;&nbsp; _number_
  - The index where the item should be moved to.
- **grid** &nbsp;&mdash;&nbsp; _Muuri_
  - The grid where the item should be moved to.
  - Defaults to the item's current grid.
  - Optional.
- **action** &nbsp;&mdash;&nbsp; _string_
  - The movement method.
  - Default value: `'move'`.
  - Allowed values: `'move'` or `'swap'`.
  - Optional.

**Examples**

```javascript
// Customize the default predicate.
var grid = new Muuri(elem, {
  dragSortPredicate: {
    threshold: 90,
    action: 'swap',
  },
});
```

```javascript
// Provide your own predicate.
var grid = new Muuri(elem, {
  dragSortPredicate: function (item, e) {
    if (e.deltaTime < 1000) return false;
    return {
      index: Math.round(e.deltaTime / 1000) % 2 === 0 ? -1 : 0,
      action: 'swap',
    };
  },
});
```

```javascript
// Pro tip: use the default predicate as fallback in your custom predicate.
var grid = new Muuri(elem, {
  dragSortPredicate: function (item, e) {
    if (item.classList.contains('no-sort')) return false;
    return Muuri.ItemDrag.defaultSortPredicate(item, {
      action: 'swap',
      threshold: 75,
    });
  },
});
```

## _option:_ dragRelease

- Default value:
  ```javascript
  {
    duration: 300,
    easing: 'ease',
    useDragContainer: true
  }
  ```
- Accepted types: object.

You can define the following properties:

- **duration** &nbsp;&mdash;&nbsp; _number_
  - Default value: `300`.
  - The duration for item's drag release animation. Set to `0` to disable.
- **easing** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'ease'`.
  - The easing for item's drag release animation. Accepts any valid [Animation easing](https://developer.mozilla.org/en-US/docs/Web/API/AnimationEffectTimingProperties/easing) value.
- **useDragContainer** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `true`.
  - If `true` the item element will remain within the `dragContainer` for the duration of the release process. Otherwise the item element will be inserted within the grid element (if not already inside it) at the beginning of the release process.

**Examples**

```javascript
var grid = new Muuri(elem, {
  dragRelease: {
    duration: 600,
    easing: 'ease-out',
    useDragContainer: false,
  },
});
```

## _option:_ dragCssProps

Drag specific CSS properties that Muuri sets to the draggable item elements. Muuri automatically prefixes the properties before applying them to the element. `touchAction` property is required to be always defined, but the other properties are optional and can be omitted by setting their value to an empty string if you want to e.g. define them via CSS only.

- Default value:
  ```javascript
  {
    touchAction: 'none',
    userSelect: 'none',
    userDrag: 'none',
    tapHighlightColor: 'rgba(0, 0, 0, 0)',
    touchCallout: 'none',
    contentZooming: 'none'
  }
  ```
- Accepted types: object.

You can define the following properties:

- **touchAction** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'none'`.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- **userSelect** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'none'`.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/user-select
  - Optional.
- **userDrag** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'none'`.
  - http://help.dottoro.com/lcbixvwm.php
  - Optional.
- **tapHighlightColor** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'rgba(0, 0, 0, 0)'`.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-tap-highlight-color
  - Optional.
- **touchCallout** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'none'`.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-touch-callout
  - Optional.
- **contentZooming** &nbsp;&mdash;&nbsp; _string_
  - Default value: `'none'`.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/-ms-content-zooming
  - Optional.

**Examples**

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
    contentZooming: '',
  },
});
```

## _option:_ dragPlaceholder

If you want a placeholder item to appear for the duration of an item's drag & drop procedure you can enable and configure it here. The placeholder animation duration is fetched from the grid's `layoutDuration` option and easing from the grid's `layoutEasing` option. Note that a special placeholder class is given to all drag placeholders and is customizable via [itemPlaceholderClass](#itemplaceholderclass-) option.

- Default value:
  ```javascript
  {
    enabled: false,
    createElement: null,
    onCreate: null,
    onRemove: null
  }
  ```
- Accepted types: object.

You can define the following properties:

- **enabled** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `false`.
  - Is the placeholder enabled?
- **createElement** &nbsp;&mdash;&nbsp; _function / null_
  - Default value: `null`.
  - If defined, this method will be used to create the DOM element that is used for the placeholder. By default a new `div` element is created when a placeholder is summoned.
- **onCreate** &nbsp;&mdash;&nbsp; _function / null_
  - Default value: `null`.
  - An optional callback that will be called after a placeholder is created for an item.
- **onRemove** &nbsp;&mdash;&nbsp; _function / null_
  - Default value: `null`.
  - An optional callback that will be called after a placeholder is removed from the grid.

**Examples**

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
    onRemove(item, element) {
      phPool.push(element);
    },
  },
});
```

## _option:_ dragAutoScroll

If you want to trigger scrolling on any element during dragging you can enable and configure it here. By default this feature is disabled. When you use this feature it is _highly_ recommended that you create a `fixed` positioned element right under `document.body` and use that as the `dragContainer` for all the dragged items. If you don't do this and a dragged item's parent is auto-scrolled, the dragged item will potentially grow the scrolled element's scroll area to infinity unintentionally.

- Default value:
  ```javascript
  {
    targets: [],
    handle: null,
    threshold: 50,
    safeZone: 0.2,
    speed: Muuri.AutoScroller.smoothSpeed(1000, 2000, 2500),
    sortDuringScroll: true,
    smoothStop: false,
    onStart: null,
    onStop: null
  }
  ```
- Accepted types: object.

You can define the following properties:

- **targets** &nbsp;&mdash;&nbsp; _array / function_
  - Default value: `[]`.
  - Define the DOM elements that should be scrolled during drag. As long as this array is empty there will be no scrolling during drag. To keep it simple you can just provide an array of elements here, in which case Muuri attempts to scroll the elements both vertically and horizontally when possible. If you want more fine-grained control, e.g. scroll an element only on specific axis or prioritize some element over another (handy for cases when there are overlapping elements), you can provide an array of scroll targets (objects). Finally, you can also provide a function which receives the dragged `item` instance as it's argument and which should return an array of scroll targets (elements and/or objects). This way you can provide different configurations for different items.
  - **scrollTarget** &nbsp;&mdash;&nbsp; _object_
    - **element** &nbsp;&mdash;&nbsp; _element_ / _window_
      - The DOM element to scroll.
      - Required.
    - **axis** &nbsp;&mdash;&nbsp; _number_
      - Optional. Defaults to scrolling both axes: `Muuri.AutoScroller.AXIS_X | Muuri.AutoScroller.AXIS_Y`.
      - To scroll only x-axis: `Muuri.AutoScroller.AXIS_X`.
      - To scroll only y-axis: `Muuri.AutoScroller.AXIS_Y`.
    - **priority** &nbsp;&mdash;&nbsp; _number_
      - Default: `0`.
      - A dragged item can only scroll one element horizontally and one element vertically simultaneously. This is an artificial limit to fend off unnecesary complexity, and to avoid awkward situations. In the case where the dragged item overlaps multiple scrollable elements simultaneously and exceeds their scroll thresholds we pick the one that the dragged item overlaps most. However, that's not always the best choice. This is where `priority` comes in. Here you can manually tell Muuri which element to prefer over another in these scenarios. The element with highest priority _always_ wins the fight, in matches with equal priority we determine the winner by the amount of overlap.
      - Optional.
    - **threshold** &nbsp;&mdash;&nbsp; _number / null_
      - Default: `null`.
      - If defined (a number is provided), this value will override the default threshold for _this scroll target_. Otherwise the default threshold will be used.
      - Optional.
- **handle** &nbsp;&mdash;&nbsp; _function / null_
  - Default value: `null`.
  - This property defines size and position of the handle (the rectangle that is compared against the scroll element's threshold). By default (when `null`) the dragged element's dimensions and offsets are used. However, you can provide a function which should return an object containing the handle's client offsets in pixels (`left` and `top`) and dimensions in pixels (`width` and `height`). The function receives the following arguments:
    - **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
    - **itemClientX** &nbsp;&mdash;&nbsp; _number_
    - **itemClientY** &nbsp;&mdash;&nbsp; _number_
    - **itemWidth** &nbsp;&mdash;&nbsp; _number_
    - **itemHeight** &nbsp;&mdash;&nbsp; _number_
    - **pointerClientX** &nbsp;&mdash;&nbsp; _number_
    - **pointerClientY** &nbsp;&mdash;&nbsp; _number_
  - Tip: Use `Muuri.AutoScroller.pointerHandle(pointerSize)` utility method if you want to use the pointer (instead of the element) as the handle.
- **threshold** &nbsp;&mdash;&nbsp; _number_
  - Default value: `50`.
  - Defines the distance (in pixels) from the edge of the scrollable element when scrolling should start, in pixels. If this value is `0` the scrolling will start when the dragged element reaches the scrollable element's edge. Do note that Muuri dynamically adjusts the scroll element's _edge_ for the calculations (when needed).
- **safeZone** &nbsp;&mdash;&nbsp; _number_
  - Default value: `0.2`.
  - Defines the size of the minimum "safe zone" space, an area in the center of the scrollable element that will be guaranteed not trigger scrolling regardless of threshold size and the dragged item's size. This value is a percentage of the scrollable element's size (width and/or height depending on the scroll axes), and should be something between `0` and `1`. So in practice, if you set this to e.g `0.5` the safe zone would be 50% of the scrollable element's width and/or height.
- **speed** &nbsp;&mdash;&nbsp; _number / function_
  - Default value: `Muuri.AutoScroller.smoothSpeed(1000, 2000, 2500)`.
  - Defines the scrolling speed in pixels per second. You can provide either static speed with a `number` or dynamic speed with a `function`. The function is called before every scroll operation and should return the speed (`number`, pixels per second) for the next scroll operation. The function receives three arguments:
    - **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
      - The dragged `Muuri.Item` instance.
    - **scrollElement** &nbsp;&mdash;&nbsp; _element_ / _window_
      - The scrolled element.
    - **data** &nbsp;&mdash;&nbsp; _object_
      - **data.direction** &nbsp;&mdash;&nbsp; _number_
        - The direction of the scroll, one of the following: `Muuri.AutoScroller.LEFT`, `Muuri.AutoScroller.RIGHT`, `Muuri.AutoScroller.UP`, `Muuri.AutoScroller.DOWN`.
      - **data.threshold** &nbsp;&mdash;&nbsp; _number_
        - The current threshold in pixels.
      - **data.distance** &nbsp;&mdash;&nbsp; _number_
        - The handle rectangle's (as defined in `handle` option) current distance from the edge of the scroll element. E.g, if `direction` is `Muuri.AutoScroller.RIGHT` then distance is `scrollElement.getBoundingClientRect().right - handleRect.right`, and if `direction` is `Muuri.AutoScroller.LEFT` then distance is `handleRect.left - scrollElement.getBoundingClientRect().left`. Can be a negative value too.
      - **data.value** &nbsp;&mdash;&nbsp; _number_
        - The scroll element's current scroll value on the scrolled axis.
      - **data.maxValue** &nbsp;&mdash;&nbsp; _number_
        - The scroll element's maximum scroll value on the scrolled axis.
      - **data.duration** &nbsp;&mdash;&nbsp; _number_
        - How long (in milliseconds) this specific auto-scroll operation has lasted so far.
      - **data.speed** &nbsp;&mdash;&nbsp; _number_
        - The current speed as pixels per second.
      - **data.deltaTime** &nbsp;&mdash;&nbsp; _number_
        - `requestAnimationFrame`'s delta time (in milliseconds).
      - **data.isEnding** &nbsp;&mdash;&nbsp; _boolean_
        - Is the scroll process ending? When this is `true` it means that the associated drag item does not satisfy the threshold anymore. You should now start decreasing the speed towards `0` to allow the item to come to rest smoothly.
  - Pro tip: Use `Muuri.AutoScroller.smoothSpeed()` for dynamic speed that provides a smooth scrolling experience. When executed it creates and returns a speed function which you can directly provide for `speed` option. The method _requires_ three arguments (in the following order):
    - **maxSpeed** &nbsp;&mdash;&nbsp; _number_
      - The maximum speed (pixels per second) when the handle's distance to the scroll target's edge is `0` or less.
    - **acceleration** &nbsp;&mdash;&nbsp; _number_
      - How fast the the speed may accelerate (pixels per second).
    - **deceleration** &nbsp;&mdash;&nbsp; _number_
      - How fast the the speed may decelerate (pixels per second).
- **sortDuringScroll** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `true`.
  - Should the grid items be sorted during auto-scroll or not?
- **smoothStop** &nbsp;&mdash;&nbsp; _boolean_
  - Default value: `false`.
  - When a dragged item is moved out of the threshold area the scroll process is set to _ending_ state. However, it's up to you to decide if the actual scrolling motion is stopped gradually or instantly. By default, when this is `false`, scrolling will stop immediately. If you set this to `true` scrolling will continue until speed drops to `0`. When this option is `enabled` you _must_ handle decelerating the speed to `0` manually within `speed` function, so do not enable this option if you use a static speed value. The default `speed` function handles the deceleration automatically.
- **onStart** &nbsp;&mdash;&nbsp; _null / function_
  - Default value: `null`.
  - Optionally, you can provide a callback that will be called when an item starts auto-scrolling a scroll target. The callback function will receive the following arguments:
    - **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
      - The dragged `Muuri.Item` instance.
    - **scrollElement** &nbsp;&mdash;&nbsp; _element_ / _window_
      - The scrolled element.
    - **direction** &nbsp;&mdash;&nbsp; _number_
      - The direction of the scroll, one of the following: `Muuri.AutoScroller.LEFT`, `Muuri.AutoScroller.RIGHT`, `Muuri.AutoScroller.UP`, `Muuri.AutoScroller.DOWN`.
- **onStop** &nbsp;&mdash;&nbsp; _null / function_
  - Default value: `null`.
  - Optionally, you can provide a callback that will be called when an item stops auto-scrolling a scroll target. The callback function will receive the following arguments:
    - **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
      - The dragged `Muuri.Item` instance.
    - **scrollElement** &nbsp;&mdash;&nbsp; _element_ / _window_
      - The scrolled element.
    - **direction** &nbsp;&mdash;&nbsp; _number_
      - The direction of the scroll, one of the following: `Muuri.AutoScroller.LEFT`, `Muuri.AutoScroller.RIGHT`, `Muuri.AutoScroller.UP`, `Muuri.AutoScroller.DOWN`.

**Examples**

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
      { element: scrollElement, priority: 1, axis: Muuri.AutoScroller.AXIS_Y },
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
    // Enable smooth stop.
    smoothStop: true,
    // Finally let's log some data when auto-scroll starts and stops.
    onStart: function (item, scrollElement, direction) {
      console.log('AUTOSCROLL STARTED', item, scrollElement, direction);
    },
    onStop: function (item, scrollElement, direction) {
      console.log('AUTOSCROLL STOPPED', item, scrollElement, direction);
    },
  },
});
```

## _option:_ containerClass

Grid element's class name.

- Default value: `'muuri'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  containerClass: 'foo',
});
```

## _option:_ itemClass

Item element's class name.

- Default value: `'muuri-item'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  itemClass: 'foo-item',
});
```

## _option:_ itemVisibleClass

Visible item's class name.

- Default value: `'muuri-item-shown'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  itemVisibleClass: 'foo-item-shown',
});
```

## _option:_ itemHiddenClass

Hidden item's class name.

- Default value: `'muuri-item-hidden'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  itemHiddenClass: 'foo-item-hidden',
});
```

## _option:_ itemPositioningClass

This class name will be added to the item element for the duration of positioning.

- Default value: `'muuri-item-positioning'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  itemPositioningClass: 'foo-item-positioning',
});
```

## _option:_ itemDraggingClass

This class name will be added to the item element for the duration of drag.

- Default value: `'muuri-item-dragging'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  itemDraggingClass: 'foo-item-dragging',
});
```

## _option:_ itemReleasingClass

This class name will be added to the item element for the duration of release.

- Default value: `'muuri-item-releasing'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  itemReleasingClass: 'foo-item-releasing',
});
```

## _option:_ itemPlaceholderClass

This class name will be added to the drag placeholder element.

- Default value: `'muuri-item-placeholder'`.
- Accepted types: string.

**Examples**

```javascript
var grid = new Muuri(elem, {
  itemPlaceholderClass: 'foo-item-placeholder',
});
```
