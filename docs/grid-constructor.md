# Grid constructor

`Muuri` is a constructor function and should be always instantiated with the `new` keyword. For the sake of clarity, we refer to a Muuri instance as _grid_ throughout the documentation.

**Syntax**

`Muuri( element, [options] )`

**Parameters**

- **element** &nbsp;&mdash;&nbsp; _element_ / _string_
  - Default value: `null`.
  - You can provide the element directly or use a selector (string) which uses [querySelector()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) internally.
- **options** &nbsp;&mdash;&nbsp; _object_
  - Optional. Check out the [detailed options reference](#grid-options).

**Default options**

The default options are stored in `Muuri.defaultOptions` object, which in it's default state contains the following configuration:

```javascript
{
  // Initial item elements
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
    rounding: false
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
  dragAxis: 'xy',
  dragSort: true,
  dragSortHeuristics: {
    sortInterval: 100,
    minDragDistance: 10,
    minBounceBackAngle: 1
  },
  dragSortPredicate: {
    threshold: 50,
    action: 'move',
    migrateAction: 'move'
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
    smoothStop: false,
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
  items: '.item',
});
```
