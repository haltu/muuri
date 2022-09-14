# Item Methods

## getGrid

`item.getGrid()`

Get the grid instance the item belongs to.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

**Examples**

```javascript
const grid = item.getGrid();
```

## getElement

`item.getElement()`

Get the item element.

**Returns** &nbsp;&mdash;&nbsp; _element_

**Examples**

```javascript
const elem = item.getElement();
```

## getWidth

`item.getWidth()`

Get item element's cached width (in pixels). The returned value includes the element's paddings and borders.

**Returns** &nbsp;&mdash;&nbsp; _number_

**Examples**

```javascript
const width = item.getWidth();
```

## getHeight

`item.getWidth()`

Get item element's cached height (in pixels). The returned value includes the element's paddings and borders.

**Returns** &nbsp;&mdash;&nbsp; _number_

**Examples**

```javascript
const height = item.getHeight();
```

## getMargin

`item.getMargin()`

Get item element's cached margins (in pixels).

**Returns** &nbsp;&mdash;&nbsp; _object_

- **obj.left** &nbsp;&mdash;&nbsp; _number_
- **obj.right** &nbsp;&mdash;&nbsp; _number_
- **obj.top** &nbsp;&mdash;&nbsp; _number_
- **obj.bottom** &nbsp;&mdash;&nbsp; _number_

**Examples**

```javascript
const margin = item.getMargin();
```

## getPosition

`item.getPosition()`

Get item element's cached position (in pixels, relative to the grid element).

**Returns** &nbsp;&mdash;&nbsp; _object_

- **obj.left** &nbsp;&mdash;&nbsp; _number_
- **obj.top** &nbsp;&mdash;&nbsp; _number_

**Examples**

```javascript
const position = item.getPosition();
```

## isActive

`item.isActive()`

Check if the item is currently _active_. Only active items are considered to be part of the layout.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
const isActive = item.isActive();
```

## isVisible

`item.isVisible()`

Check if the item is currently _visible_.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
const isVisible = item.isVisible();
```

## isShowing

`item.isShowing()`

Check if the item is currently animating to visible.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
const isShowing = item.isShowing();
```

## isHiding

`item.isHiding()`

Check if the item is currently animating to hidden.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
const isHiding = item.isHiding();
```

## isPositioning

`item.isPositioning()`

Check if the item is currently being positioned.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
const isPositioning = item.isPositioning();
```

## isDragging

`item.isDragging()`

Check if the item is currently being dragged.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
const isDragging = item.isDragging();
```

## isReleasing

`item.isReleasing()`

Check if the item is currently being released.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
const isReleasing = item.isReleasing();
```

## isDestroyed

`item.isDestroyed()`

Check if the item is destroyed.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
const isDestroyed = item.isDestroyed();
```
