## _event:_ synchronize

Triggered after item elements are synchronized via `grid.synchronize()`.

**Examples**

```javascript
grid.on('synchronize', function () {
  console.log('Synced!');
});
```

## _event:_ layoutStart

Triggered when the the layout procedure begins. More specifically, this event is emitted right after new _layout_ has been generated, internal item positions updated and grid element's dimensions updated. After this event is emitted the items in the layout will be positioned to their new positions. So if you e.g. want to react to grid element dimension changes this is a good place to do that.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that are about to be positioned.
- **isInstant** &nbsp;&mdash;&nbsp; _boolean_
  - Was the layout called with `instant` flag or not.

**Examples**

```javascript
grid.on('layoutStart', function (items, isInstant) {
  console.log(items, isInstant);
});
```

## _event:_ layoutEnd

Triggered after the layout procedure has finished, successfully. Note that if you abort a layout procedure by calling `grid.layout()` _before_ items have finished positioning, this event will not be emitted for the aborted layout procedure. In such a case `layoutAbort` will be emitted instead.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that were positioned. Note that these items are always identical to what the _layoutStart_ event's callback receives as it's argument.

**Examples**

```javascript
grid.on('layoutEnd', function (items) {
  console.log(items);
  // For good measure you might want to filter out all the non-active items,
  // because it's techniclly possible that some of the items are
  // destroyed/hidden when we receive this event.
  var activeItems = items.filter(function (item) {
    return item.isActive();
  });
});
```

## _event:_ layoutAbort

Triggered if you start a new layout process (`grid.layout()`) while the current layout process is still busy positioning items. Note that this event is not triggered if you start a new layout process while the layout is being computed and the items have not yet started positioning.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that were attempted to be positioned. Note that these items are always identical to what the _layoutStart_ event's callback receives as it's argument.

**Examples**

```javascript
grid.on('layoutAbort', function (items) {
  console.log(items);
  // For good measure you might want to filter out all the non-active items,
  // because it's techniclly possible that some of the items are destroyed or
  // hidden when we receive this event.
  var activeItems = items.filter(function (item) {
    return item.isActive();
  });
});
```

## _event:_ add

Triggered after `grid.add()` is called.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that were successfully added.

**Examples**

```javascript
grid.on('add', function (items) {
  console.log(items);
});
```

## _event:_ remove

Triggered after `grid.remove()` is called.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that were successfully removed.
- **indices** &nbsp;&mdash;&nbsp; _array_
  - Indices of the items that were successfully removed.

**Examples**

```javascript
grid.on('remove', function (items, indices) {
  console.log(items, indices);
});
```

## _event:_ showStart

Triggered after `grid.show()` is called, just before the items are shown.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that are about to be shown.

**Examples**

```javascript
grid.on('showStart', function (items) {
  console.log(items);
});
```

## _event:_ showEnd

Triggered after `grid.show()` is called, after the items are shown.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that were successfully shown without interruptions. If you, for example, call `grid.hide()` to some of the items that are currently being shown, those items will be omitted from this argument.

**Examples**

```javascript
grid.on('showEnd', function (items) {
  console.log(items);
});
```

## _event:_ hideStart

Triggered after `grid.hide()` is called, just before the items are hidden.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that are about to be hidden.

**Examples**

```javascript
grid.on('hideStart', function (items) {
  console.log(items);
});
```

## _event:_ hideEnd

Triggered after `grid.hide()` is called, after the items are hidden.

**Arguments**

- **items** &nbsp;&mdash;&nbsp; _array_
  - The items that were successfully hidden without interruptions. If you, for example, call `grid.show()` to some of the items that are currently being hidden, those items will be omitted from this argument.

**Examples**

```javascript
grid.on('hideEnd', function (items) {
  console.log(items);
});
```

## _event:_ filter

Triggered after `grid.filter()` is called.

**Arguments**

- **shownItems** &nbsp;&mdash;&nbsp; _array_
  - The items that are shown.
- **hiddenItems** &nbsp;&mdash;&nbsp; _array_
  - The items that are hidden.

**Examples**

```javascript
grid.on('filter', function (shownItems, hiddenItems) {
  console.log(shownItems);
  console.log(hiddenItems);
});
```

## _event:_ sort

Triggered after `grid.sort()` is called.

**Arguments**

- **currentOrder** &nbsp;&mdash;&nbsp; _array_
  - All items in their current order.
- **previousOrder** &nbsp;&mdash;&nbsp; _array_
  - All items in their previous order.

**Examples**

```javascript
grid.on('sort', function (currentOrder, previousOrder) {
  console.log(currentOrder);
  console.log(previousOrder);
});
```

## _event:_ move

Triggered after `grid.move()` is called or when the grid is sorted during drag. Note that this is event not triggered when an item is dragged into another grid.

**Arguments**

- **data** &nbsp;&mdash;&nbsp; _object_
  - **data.item** &nbsp;&mdash;&nbsp; _Muuri.Item_
    - The item that was moved.
  - **data.fromIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved from.
  - **data.toIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved to.
  - **data.action** &nbsp;&mdash;&nbsp; _string_
    - "move" or "swap".

**Examples**

```javascript
grid.on('move', function (data) {
  console.log(data);
});
```

## _event:_ send

Triggered for the originating grid in the end of the _send process_ (after `grid.send()` is called or when an item is dragged into another grid). Note that this event is called _before_ the item's layout starts.

**Arguments**

- **data** &nbsp;&mdash;&nbsp; _object_
  - **data.item** &nbsp;&mdash;&nbsp; _Muuri.Item_
    - The item that was sent.
  - **data.fromGrid** &nbsp;&mdash;&nbsp; _Muuri_
    - The grid the item was sent from.
  - **data.fromIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved from.
  - **data.toGrid** &nbsp;&mdash;&nbsp; _Muuri_
    - The grid the item was sent to.
  - **data.toIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved to.

**Examples**

```javascript
grid.on('send', function (data) {
  console.log(data);
});
```

## _event:_ beforeSend

Triggered for the originating grid in the beginning of the _send process_ (after `grid.send()` is called or when an item is dragged into another grid). This event is highly useful in situations where you need to manipulate the sent item (freeze it's dimensions for example) before it is appended to it's temporary layout container as defined in [send method options](#gridsend-item-grid-position-options-).

**Arguments**

- **data** &nbsp;&mdash;&nbsp; _object_
  - **data.item** &nbsp;&mdash;&nbsp; _Muuri.Item_
    - The item that was sent.
  - **data.fromGrid** &nbsp;&mdash;&nbsp; _Muuri_
    - The grid the item was sent from.
  - **data.fromIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved from.
  - **data.toGrid** &nbsp;&mdash;&nbsp; _Muuri_
    - The grid the item was sent to.
  - **data.toIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved to.

**Examples**

```javascript
grid.on('beforeSend', function (data) {
  console.log(data);
});
```

## _event:_ receive

Triggered for the receiving grid in the end of the _send process_ (after `grid.send()` is called or when an item is dragged into another grid). Note that this event is called _before_ the item's layout starts.

**Arguments**

- **data** &nbsp;&mdash;&nbsp; _object_
  - **data.item** &nbsp;&mdash;&nbsp; _Muuri.Item_
    - The item that was sent.
  - **data.fromGrid** &nbsp;&mdash;&nbsp; _Muuri_
    - The grid the item was sent from.
  - **data.fromIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved from.
  - **data.toGrid** &nbsp;&mdash;&nbsp; _Muuri_
    - The grid the item was sent to.
  - **data.toIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved to.

**Examples**

```javascript
grid.on('receive', function (data) {
  console.log(data);
});
```

## _event:_ beforeReceive

Triggered for the receiving grid in the beginning of the _send process_ (after `grid.send()` is called or when an item is dragged into another grid). This event is highly useful in situations where you need to manipulate the received item (freeze it's dimensions for example) before it is appended to it's temporary layout container as defined in [send method options](#gridsend-item-grid-position-options-).

**Arguments**

- **data** &nbsp;&mdash;&nbsp; _object_
  - **data.item** &nbsp;&mdash;&nbsp; _Muuri.Item_
    - The item that was sent.
  - **data.fromGrid** &nbsp;&mdash;&nbsp; _Muuri_
    - The grid the item was sent from.
  - **data.fromIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved from.
  - **data.toGrid** &nbsp;&mdash;&nbsp; _Muuri_
    - The grid the item was sent to.
  - **data.toIndex** &nbsp;&mdash;&nbsp; _number_
    - The index the item was moved to.

**Examples**

```javascript
grid.on('beforeReceive', function (data) {
  console.log(data);
});
```

## _event:_ dragInit

Triggered in the beginning of the _drag start_ process when dragging of an item begins. This event is highly useful in situations where you need to manipulate the dragged item (freeze it's dimensions for example) before it is appended to the [dragContainer](#dragcontainer-).

**Arguments**

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The dragged item.
- **event** &nbsp;&mdash;&nbsp; _object_
  - Muuri.Dragger event data.

**Examples**

```javascript
grid.on('dragInit', function (item, event) {
  console.log(event);
  console.log(item);
});
```

## _event:_ dragStart

Triggered in the end of the _drag start_ process when dragging of an item begins.

**Arguments**

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The dragged item.
- **event** &nbsp;&mdash;&nbsp; _object_
  - Muuri.Dragger event data.

**Examples**

```javascript
grid.on('dragStart', function (item, event) {
  console.log(event);
  console.log(item);
});
```

## _event:_ dragMove

Triggered every time a dragged item is _moved_. Note that Muuri has an automatic throttling system which makes sure that this event is triggered at maximum once in an animation frame.

**Arguments**

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The dragged item.
- **event** &nbsp;&mdash;&nbsp; _object_
  - Muuri.Dragger event data.

**Examples**

```javascript
grid.on('dragMove', function (item, event) {
  console.log(event);
  console.log(item);
});
```

## _event:_ dragScroll

Triggered when any of the scroll parents of a dragged item is scrolled.

**Arguments**

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The dragged item.
- **event** &nbsp;&mdash;&nbsp; _object_
  - Scroll event data.

**Examples**

```javascript
grid.on('dragScroll', function (item, event) {
  console.log(event);
  console.log(item);
});
```

## _event:_ dragEnd

Triggered when dragged item is released and the drag process ends.

**Arguments**

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The dragged item.
- **event** &nbsp;&mdash;&nbsp; _object_
  - Muuri.Dragger event data.

**Examples**

```javascript
grid.on('dragEnd', function (item, event) {
  console.log(event);
  console.log(item);
});
```

## _event:_ dragReleaseStart

Triggered when a dragged item is released (always after `dragEnd` event).

**Arguments**

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The released item.

**Examples**

```javascript
grid.on('dragReleaseStart', function (item) {
  console.log(item);
});
```

## _event:_ dragReleaseEnd

Triggered after released item has finished it's position animation.

**Arguments**

- **item** &nbsp;&mdash;&nbsp; _Muuri.Item_
  - The released item.

**Examples**

```javascript
grid.on('dragReleaseEnd', function (item) {
  console.log(item);
});
```

## _event:_ destroy

Triggered after grid is destroyed.

**Examples**

```javascript
grid.on('destroy', function () {
  console.log('Muuri is no more...');
});
```
