# Grid Methods

## getElement

`grid.getElement()`

Get the grid element.

**Returns** &nbsp;&mdash;&nbsp; _element_

**Examples**

```javascript
var elem = grid.getElement();
```

## getItem

`grid.getItem( target )`

Get a single grid item by element or by index. Target can also be a `Muuri.Item` instance in which case the function returns the item if it exists within related `Muuri` instance. If nothing is found with the provided target, `null` is returned.

**Parameters**

- **target** &nbsp;&mdash;&nbsp; _element / number / Muuri.Item_

**Returns** &nbsp;&mdash;&nbsp; _Muuri.Item / null_

- Returns the queried item or `null` if no item is found.

**Examples**

```javascript
// Get first item in grid.
var itemA = grid.getItem(0);
// Get item by element reference.
var itemB = grid.getItem(someElement);
```

## getItems

`grid.getItems( [targets] )`

Get all items in the grid. Optionally you can provide specific targets (indices or elements).

**Parameters**

- **targets** &nbsp;&mdash;&nbsp; _array / element / Muuri.Item / number_
  - An array of item instances/elements/indices.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _array_

- Returns the queried items.

**Examples**

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

## refreshItems

`grid.refreshItems( [items], [force] )`

Update the cached dimensions of the instance's items. By default all the items are refreshed, but you can also provide an array of target items as the first argument if you want to refresh specific items. Note that all hidden items are not refreshed by default since their `display` property is `'none'` and their dimensions are therefore not readable from the DOM. However, if you do want to force update hidden item dimensions too you can provide `true` as the second argument, which makes the elements temporarily visible while their dimensions are being read.

**Parameters**

- **items** &nbsp;&mdash;&nbsp; _array_
  - To target specific items provide an array of item instances. By default all items are targeted.
  - Optional.
- **force** &nbsp;&mdash;&nbsp; _boolean_
  - Set to `true` to read dimensions of hidden items too (and make them visible for the duration of the reading).
  - Default: `false`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
// Refresh dimensions of all items.
grid.refreshItems();
// Refresh dimensions of specific items.
grid.refreshItems([0, someElem, someItem]);
// Refresh dimensions of specific items and force read their
// dimensions even if they are hidden. Note that this has performance cost.
grid.refreshItems([0, someElem, someHiddenItem], true);
```

## refreshSortData

`grid.refreshSortData( [items] )`

Refresh the sort data of the grid's items.

**Parameters**

- **items** &nbsp;&mdash;&nbsp; _array_
  - To target specific items provide an array of item instances. By default all items are targeted.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
// Refresh the sort data for every item.
grid.refreshSortData();
// Refresh the sort data for specific items.
grid.refreshSortData([0, someElem, someItem]);
```

## synchronize

`grid.synchronize()`

Synchronize the item elements in the DOM to match the order of the items in the grid. This comes handy if you need to keep the DOM structure matched with the order of the items. Note that if an item's element is not currently a child of the grid element (if it is dragged for example) it is ignored and left untouched. The reason why item elements are not kept in sync automatically is that there's rarely a need for that as they are absolutely positioned elements.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
// Let's say we have to move the first item in the grid as the last.
grid.move(0, -1);
// Now the order of the item elements in the DOM is not in sync anymore
// with the order of the items in the grid. We can sync the DOM with
// synchronize method.
grid.synchronize();
```

## layout

`grid.layout( [instant], [callback] )`

Calculate item positions and move items to their calculated positions, unless they are already positioned correctly. The grid's height/width (depends on the layout algorithm) is also adjusted according to the position of the items.

**Parameters**

- **instant** &nbsp;&mdash;&nbsp; _boolean_
  - Should the items be positioned instantly without any possible animation?
  - Default value: `false`.
  - Optional.
- **callback** &nbsp;&mdash;&nbsp; _function_
  - A callback function that is called after every item in the layout has finished/aborted positioning.
  - Receives two arguments:
    - An array of all the items in the layout.
    - A boolean indicating if the layout has changed or not.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

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

## add

`grid.add( elements, [options] )`

Add new items by providing the elements you wish to add to the grid and optionally provide the index where you want the items to be inserted into. All elements that are not already children of the grid element will be automatically appended to the grid element. If an element has it's CSS display property set to none it will be marked as _inactive_ during the initiation process. As long as the item is _inactive_ it will not be part of the layout, but it will retain it's index. You can activate items at any point with `grid.show()` method. This method will automatically call `grid.layout()` if one or more of the added elements are visible. If only hidden items are added no layout will be called. All the new visible items are positioned without animation during their first layout.

**Parameters**

- **elements** &nbsp;&mdash;&nbsp; _array / element_
  - An array of DOM elements.
- **options.active** &nbsp;&mdash;&nbsp; _boolean / undefined_
  - By default (when this option is `undefined`) Muuri will automatically detect from each element's `display` style if the item should be active (visible) or inactive (hidden) on init. If the element's `display` style is `none` then the item will be inactive on init. However, you can also provide a boolean here to force the item to be active (`true`) or inactive (`false`) on init.
  - Default value: `undefined`.
  - Optional.
- **options.index** &nbsp;&mdash;&nbsp; _number_
  - The index where you want the items to be inserted in. A value of `-1` will insert the items to the end of the list while `0` will insert the items to the beginning. Note that the DOM elements are always just appended to the grid element regardless of the index value. You can use the `grid.synchronize()` method to arrange the DOM elements to the same order as the items.
  - Default value: `-1`.
  - Optional.
- **options.layout** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _array_

- Returns the added items.

**Examples**

```javascript
// Add two new items to the end.
var newItemsA = grid.add([elemA, elemB]);
// Add two new items to the beginning.
var newItemsB = grid.add([elemA, elemB], { index: 0 });
// Skip the automatic layout.
var newItemsC = grid.add([elemA, elemB], { layout: false });
```

## remove

`grid.remove( items, [options] )`

Remove items from the grid.

**Parameters**

- **items** &nbsp;&mdash;&nbsp; _array_
  - An array of item instances.
- **options.removeElements** &nbsp;&mdash;&nbsp; _boolean_
  - Should the associated DOM element be removed from the DOM?
  - Default value: `false`.
  - Optional.
- **options.layout** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _array_

- Returns the removed items. Note that the removal process also _destroys_ the items so they can not be reused e.g. in another grid.

**Examples**

```javascript
// Remove the first item, but keep the element in the DOM.
var removedItemsA = grid.remove(grid.getItems(0));
// Remove items and the associated elements.
var removedItemsB = grid.remove([itemA, itemB], { removeElements: true });
// Skip the layout.
var removedItemsC = grid.remove([itemA, itemB], { layout: false });
```

## show

`grid.show( items, [options] )`

Show the targeted items.

**Parameters**

- **items** &nbsp;&mdash;&nbsp; _array_
  - An array of item instances.
- **options.instant** &nbsp;&mdash;&nbsp; _boolean_
  - Should the items be shown instantly without any possible animation?
  - Default value: `false`.
  - Optional.
- **options.syncWithLayout** &nbsp;&mdash;&nbsp; _boolean_
  - Should we wait for the next layout's calculations (which are potentially async) to finish before starting the show animations? By default this option is enabled so that the show animations are triggered in sync with the layout animations. If that's not needed set this to `false` and the show animations will begin immediately.
  - Default value: `true`.
  - Optional.
- **options.onFinish** &nbsp;&mdash;&nbsp; _function_
  - A callback function that is called after the items are shown.
  - Optional.
- **options.layout** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
// Show items with animation (if any).
grid.show([itemA, itemB]);
// Show items instantly without animations.
grid.show([itemA, itemB], { instant: true });
// Show items with callback (and with animations if any).
grid.show([itemA, itemB], {
  onFinish: function (items) {
    console.log('items shown!');
  },
});
```

## hide

`grid.hide( items, [options] )`

Hide the targeted items.

**Parameters**

- **items** &nbsp;&mdash;&nbsp; _array_
  - An array of item instances.
- **options.instant** &nbsp;&mdash;&nbsp; _boolean_
  - Should the items be hidden instantly without any possible animation?
  - Default value: `false`.
  - Optional.
- **options.syncWithLayout** &nbsp;&mdash;&nbsp; _boolean_
  - Should we wait for the next layout's calculations (which are potentially async) to finish before starting the hide animations? By default this option is enabled so that the hide animations are triggered in sync with the layout animations. If that's not needed set this to `false` and the hide animations will begin immediately.
  - Default value: `true`.
  - Optional.
- **options.onFinish** &nbsp;&mdash;&nbsp; _function_
  - A callback function that is called after the items are hidden.
  - Optional.
- **options.layout** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
// Hide items with animation.
grid.hide([itemA, itemB]);
// Hide items instantly without animations.
grid.hide([itemA, itemB], { instant: true });
// Hide items and call the callback function after
// all items are hidden.
grid.hide([itemA, itemB], {
  onFinish: function (items) {
    console.log('items hidden!');
  },
});
```

## filter

`grid.filter( predicate, [options] )`

Filter items. Expects at least one argument, a predicate, which should be either a function or a string. The predicate callback is executed for every item in the grid. If the return value of the predicate is truthy the item in question will be shown and otherwise hidden. The predicate callback receives the item instance as it's argument. If the predicate is a string it is considered to be a selector and it is checked against every item element in the grid with the native element.matches() method. All the matching items will be shown and others hidden.

**Parameters**

- **predicate** &nbsp;&mdash;&nbsp; _function / string_
  - A predicate callback or a selector.
- **options.instant** &nbsp;&mdash;&nbsp; _boolean_
  - Should the items be shown/hidden instantly without any possible animation?
  - Default value: `false`.
  - Optional.
- **options.syncWithLayout** &nbsp;&mdash;&nbsp; _boolean_
  - Should we wait for the next layout's calculations (which are potentially async) to finish before starting the visibility animations? By default this option is enabled so that the visibility animations are triggered in sync with the layout animations. If that's not needed set this to `false` and the visibility animations will begin immediately.
  - Default value: `true`.
  - Optional.
- **options.onFinish** &nbsp;&mdash;&nbsp; _function_
  - An optional callback function that is called after all the items are shown/hidden.
  - Optional.
- **options.layout** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

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

## sort

`grid.sort( comparer, [options] )`

Sort items. There are three ways to sort the items. The first is simply by providing a function as the comparer which works almost identically to [native array sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort). The only difference is that the sort is always stable. Alternatively you can sort by the sort data you have provided in the grid's options. Just provide the sort data key(s) as a string (separated by space) and the items will be sorted based on the provided sort data keys. Lastly you have the opportunity to provide a presorted array of items which will be used to sync the internal items array in the same order.

**Parameters**

- **comparer** &nbsp;&mdash;&nbsp; _array / function / string_
  - Provide a comparer function, sort data keys as a string (separated with space) or a pre-sorted array of items. When you provide a pre-sorted array of items you _must_ make sure that it contains _exactly_ the same item instances as exists currently in `grid._items` (retrievable safely via `grid.getItems()`), only change the order of items. Muuri does not validate the array of items you provide due to performance reasons.
- **options.descending** &nbsp;&mdash;&nbsp; _boolean_
  - By default the items are sorted in ascending order. If you want to sort them in descending order set this to `true`. Note that this option has no effect when you provide a pre-sorted array of items.
  - Default value: `false`.
  - Optional.
- **options.layout** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

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
grid.sort('foo bar', { descending: true });
// Sort items using the sort data keys. Sort some keys
// ascending and some keys descending.
grid.sort('foo bar:desc');
```

## move

`grid.move( item, position, [options] )`

Move an item to another position in the grid.

**Parameters**

- **item** &nbsp;&mdash;&nbsp; _element / Muuri.Item / number_
  - Item instance, element or index.
- **position** &nbsp;&mdash;&nbsp; _element / Muuri.Item / number_
  - Item instance, element or index.
- **options.action** &nbsp;&mdash;&nbsp; _string_
  - Accepts the following values:
    - `'move'`: moves item in place of another item.
    - `'swap'`: swaps position of items.
  - Default value: `'move'`.
  - Optional.
- **options.layout** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
// Move elemA to the index of elemB.
grid.move(elemA, elemB);
// Move the first item in the grid as the last.
grid.move(0, -1);
// Swap positions of elemA and elemB.
grid.move(elemA, elemB, { action: 'swap' });
// Swap positions of the first and the last item.
grid.move(0, -1, { action: 'swap' });
```

## send

`grid.send( item, grid, position, [options] )`

Move an item into another grid.

**Parameters**

- **item** &nbsp;&mdash;&nbsp; _element / Muuri.Item / number_
  - The item that should be moved. You can define the item with an item instance, element or index.
- **grid** &nbsp;&mdash;&nbsp; _Muuri_
  - The grid where the item should be moved to.
- **position** &nbsp;&mdash;&nbsp; _element / Muuri.Item / number_
  - To which position should the item be placed to in the new grid? You can define the position with an item instance, element or index.
- **options.appendTo** &nbsp;&mdash;&nbsp; _element_
  - Which element the item element should be appended to for the duration of the layout animation?
  - Default value: `document.body`.
- **options.layoutSender** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called for the sending grid at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.
- **options.layoutReceiver** &nbsp;&mdash;&nbsp; _boolean / function / string_
  - By default `grid.layout()` is called for the receiving grid at the end of this method. With this parameter you can control the layout call. You can disable the layout completely with `false`, or provide a callback function for the layout method, or provide the string `'instant'` to make the layout happen instantly without any animations.
  - Default value: `true`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
// Move the first item of gridA as the last item of gridB.
// The sent item will be appended to document.body.
gridA.send(0, gridB, -1);
// Move the first item of gridA as the last item of gridB.
// The sent item will be appended to someElem.
gridA.send(0, gridB, -1, {
  appendTo: someElem,
});
// Do something after the item has been sent and the layout
// processes have finished.
gridA.send(0, gridB, -1, {
  layoutSender: function (isAborted, items) {
    // Do your thing here...
  },
  layoutReceiver: function (isAborted, items) {
    // Do your other thing here...
  },
});
```

## on

`grid.on( event, listener )`

Bind an event listener.

**Parameters**

- **event** &nbsp;&mdash;&nbsp; _string_
- **listener** &nbsp;&mdash;&nbsp; _function_

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
grid.on('layoutEnd', function (items) {
  console.log(items);
});
```

## off

`grid.off( event, listener )`

Unbind an event listener.

**Parameters**

- **event** &nbsp;&mdash;&nbsp; _string_
- **listener** &nbsp;&mdash;&nbsp; _function_

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
function onLayoutEnd(items) {
  console.log(items);
}
// Start listening to some event.
grid.on('layoutEnd', onLayoutEnd);
/// ...sometime later -> unbind listener.
grid.off('layoutEnd', onLayoutEnd);
```

## destroy

`grid.destroy( [removeElements] )`

Destroy the grid.

**Parameters**

- **removeElements** &nbsp;&mdash;&nbsp; _boolean_
  - Should the item elements be removed or not?
  - Default value: `false`.
  - Optional.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

- Returns the grid instance.

**Examples**

```javascript
// Destroy the instance, but keep
// item element in the DOM.
grid.destroy();
```

```javascript
// Destroy the instance and remove
// the item elements from the DOM.
grid.destroy(true);
```
