# Muuri

A dynamic grid layout with draggable tiles. Works in IE9+ and modern browsers.

## Getting started

Muuri depends on the following libraries:
* [Hammer.js](https://github.com/hammerjs/hammer.js) (2.0.x)
* [Velocity](https://github.com/julianshapiro/velocity) (1.2.x)
* [Mezr](https://github.com/niklasramo/mezr) (0.4.x)
* [jvent](https://github.com/pazguille/jvent) (0.2.x)

**First, include Muuri and it's dependencies in your site.**

```html
<script src="mezr.js"></script>
<script src="jvent.js"></script>
<script src="velocity.js"></script>
<script src="hammer.js"></script>
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
    <script src="mezr.js"></script>
    <script src="jvent.js"></script>
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
* **`containerDuration`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `300`.
  * The duration for container's height animation. Set to `0` to disable.
* **`containerEasing`** &nbsp;&mdash;&nbsp; *String / Array*
  * Default value: `"ease-out"`.
  * The easing for container's height animation. Read [Velocity's easing documentation](http://julian.com/research/velocity/#easing) for more info on possible easing values.
* **`items`** &nbsp;&mdash;&nbsp; *Array of Elements*
  * Default value: `null`.
  * The initial item elements wrapped in an array. The elements must be children of the container element.
* **`positionDuration`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `300`.
  * The duration for item's positioning animation. Set to `0` to disable.
* **`positionEasing`** &nbsp;&mdash;&nbsp; *String / Array*
  * Default value: `"ease-out"`.
  * The easing for item's positioning animation. Read [Velocity's easing documentation](http://julian.com/research/velocity/#easing) for more info on possible easing values.
* **`showDuration`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `300`.
  * The duration for item's show animation. Set to `0` to disable.
* **`showEasing`** &nbsp;&mdash;&nbsp; *String / Array*
  * Default value: `"ease-out"`.
  * The easing for item's show animation. Read [Velocity's easing documentation](http://julian.com/research/velocity/#easing) for more info on possible easing values.
* **`hideDuration`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `300`.
  * The duration for item's hide animation. Set to `0` to disable.
* **`hideEasing`** &nbsp;&mdash;&nbsp; *String / Array*
  * Default value: `"ease-out"`.
  * The easing for item's hide animation. Read [Velocity's easing documentation](http://julian.com/research/velocity/#easing) for more info on possible easing values.
* **`layoutOnResize`** &nbsp;&mdash;&nbsp; *Null / Number*
  * Default value: `100`.
  * Should Muuri automatically trigger layout on window resize? Set to `null` to disable. When a number (`0` or greater) is provided Muuri will automatically trigger layout when window is resized. The provided number equals to the amount of time (in milliseconds) that is waited before the layout is triggered after each resize event. The layout method is wrapped in a debouned function in order to avoid unnecessary layout calls.
* **`layoutOnInit`** &nbsp;&mdash;&nbsp; *Boolean*
  * Default value: `true`.
  * Should Muuri trigger layout automatically on init?
* **`dragEnabled`** &nbsp;&mdash;&nbsp; *Boolean*
  * Default value: `true`.
  * Should items be draggable?
* **`dragPointers`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `1`.
  * Required pointers. 0 for all pointers.
* **`dragThreshold`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `10`.
  * Minimal drag distance required before recognizing.
* **`dragThreshold`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `10`.
  * Minimal drag distance required before recognizing.
* **`dragDirection`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `"all"`.
  * Allowed values: `"all"`, `"none"`, `"left"`, `"right"`, `"up"`, `"down"`, `"horizontal"`, `"vertical"`
  * Minimal drag distance required before recognizing.
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
    containerDuration: 300,
    containerEasing: 'ease-out',

    // Items
    items: [],
    positionDuration: 300,
    positionEasing: 'ease-out',
    showDuration: 200,
    showEasing: 'ease-out',
    hideDuration: 200,
    hideEasing: 'ease-out',
    
    // Layout
    layoutOnResize: 100,
    layoutOnInit: true,
    
    // Drag & Drop
    dragEnabled: true,
    dragPointers: 1,
    dragThreshold: 10,
    dragDirection: 'all',
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

### Muuri instance methods

#### `muuri.on( eventName, listener )`

#### `muuri.once( eventName, listener )`

#### `muuri.off( eventName, listener )`

#### `muuri.getItem( [target] )`

#### `muuri.getItems( [elements] )`

#### `muuri.register( elements, [index] )`

#### `muuri.refresh()`

#### `muuri.syncElements()`

#### `muuri.layout( [animate], [callback] )`

#### `muuri.show( items, [callback] )`

#### `muuri.hide( items, [callback] )`

#### `muuri.add( elements, [index], [callback] )`

#### `muuri.add( elements, [index], [callback] )`

#### `muuri.remove( items, [callback] )`

#### `muuri.destroy()`

### Muuri.Item instance methods

#### `item.index()`

#### `item.refresh()`

#### `item.moveTo()`

#### `item.swapWith()`

#### `item.position( [animate], [callback] )`

#### `item.show( [animate], [callback] )`

#### `item.hide( [animate], [callback] )`

#### `item.destroy()`

## Events

Coming up...

## License

Copyright &copy; 2015 Haltu Oy. Licensed under **[the MIT license](LICENSE.md)**.

