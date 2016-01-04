# Muuri

A dynamic grid layout with draggable tiles.

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

* Always define your tile with at least two elements. The outer element is used for animating the tile's position and it's first child is used to animate the tile's visibility. You can insert any markup you wish inside these required elements.

```html
<div class="grid">
  <div class="item"><div class="item-content">A</div></div>
  <div class="item"><div class="item-content">B</div></div>
  <div class="item"><div class="item-content">C</div></div>
</div>
```

**Next, let's apply some styles.**

* In order for Muuri function as expected you should at least define width and height for the tile's outer element and set it's position as "absolute".
* You can control the gaps between the tiles by giving some margin to the tile's outer element.
* Never apply any CSS transitions or animations to the tile elements (inner or outer). Doing so might cause some unexpected behaviour since Muuri uses Velocity to animate these items with JavaScript.

```css
.grid {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  margin: 50px;
  background: #ccc;
  min-height: 110px;
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
.item.muuri-item-hidden {
  z-index: 0;
}
.item-content {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  font-size: 24px;
  background: #000;
  color: #fff;
}
```

**Finally, initiate a Muuri instance.**

```javascript
var grid = new Muuri({
  container: document.getElementsByClassName('grid')[0],
  items: document.getElementsByClassName('item')
});
```

**Adn here's an example with all the pieces together.**

```html
<!doctype html>
<html>
  <head>
      <style>
        .grid {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          margin: 50px;
          background: #ccc;
          min-height: 110px;
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
        .item.muuri-item-hidden {
          z-index: 0;
        }
        .item-content {
          position: absolute;
          left: 0;
          top: 0;
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
      <div class="item"><div class="item-content">A</div></div>
      <div class="item"><div class="item-content">B</div></div>
      <div class="item"><div class="item-content">C</div></div>
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

Coming up...

## Methods

Coming up...

## Events

Coming up...

## License

Copyright &copy; 2015 Haltu Oy. Licensed under **[the MIT license](LICENSE.md)**.

