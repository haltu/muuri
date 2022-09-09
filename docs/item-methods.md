

## item.getGrid()

Get the grid instance the item belongs to.

**Returns** &nbsp;&mdash;&nbsp; _Muuri_

**Examples**

```javascript
var grid = item.getGrid();
```

## item.getElement()

Get the item element.

**Returns** &nbsp;&mdash;&nbsp; _element_

**Examples**

```javascript
var elem = item.getElement();
```

## item.getWidth()

Get item element's cached width (in pixels). The returned value includes the element's paddings and borders.

**Returns** &nbsp;&mdash;&nbsp; _number_

**Examples**

```javascript
var width = item.getWidth();
```

## item.getHeight()

Get item element's cached height (in pixels). The returned value includes the element's paddings and borders.

**Returns** &nbsp;&mdash;&nbsp; _number_

**Examples**

```javascript
var height = item.getHeight();
```

## item.getMargin()

Get item element's cached margins (in pixels).

**Returns** &nbsp;&mdash;&nbsp; _object_

- **obj.left** &nbsp;&mdash;&nbsp; _number_
- **obj.right** &nbsp;&mdash;&nbsp; _number_
- **obj.top** &nbsp;&mdash;&nbsp; _number_
- **obj.bottom** &nbsp;&mdash;&nbsp; _number_

**Examples**

```javascript
var margin = item.getMargin();
```

## item.getPosition()

Get item element's cached position (in pixels, relative to the grid element).

**Returns** &nbsp;&mdash;&nbsp; _object_

- **obj.left** &nbsp;&mdash;&nbsp; _number_
- **obj.top** &nbsp;&mdash;&nbsp; _number_

**Examples**

```javascript
var position = item.getPosition();
```

## item.isActive()

Check if the item is currently _active_. Only active items are considered to be part of the layout.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
var isActive = item.isActive();
```

## item.isVisible()

Check if the item is currently _visible_.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
var isVisible = item.isVisible();
```

## item.isShowing()

Check if the item is currently animating to visible.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
var isShowing = item.isShowing();
```

## item.isHiding()

Check if the item is currently animating to hidden.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
var isHiding = item.isHiding();
```

## item.isPositioning()

Check if the item is currently being positioned.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
var isPositioning = item.isPositioning();
```

## item.isDragging()

Check if the item is currently being dragged.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
var isDragging = item.isDragging();
```

## item.isReleasing()

Check if the item is currently being released.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
var isReleasing = item.isReleasing();
```

## item.isDestroyed()

Check if the item is destroyed.

**Returns** &nbsp;&mdash;&nbsp; _boolean_

**Examples**

```javascript
var isDestroyed = item.isDestroyed();
```