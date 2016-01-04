# Muuri

A dynamic grid layout with draggable tiles.

## Getting started

Muuri depends on the following libraries:
* Hammer.js
* Velocity.js
* Mezr
* Jvent.

**First, include Muuri and it's dependencies in your site.**

```html
<script src="mezr.js"></script>
<script src="jvent.js"></script>
<script src="velocity.js"></script>
<script src="hammer.js"></script>
<script src="muuri.js"></script>
```

**Then, define your grid markup. There are some restrictions to this markup and it's styles.**

* Always define your tile with two divs: the outer div is used for animating the tile's position while the inner div is used to animate the tile's visibility.
* Never apply any CSS transitions or animations to these divs. Doing so might cause some unexpected behaviour since Muuri uses Velocity to animate these items with JavaScript.

```html
<div class="grid">
  <div class="item"><div class="item-content">A</div></div>
  <div class="item"><div class="item-content">B</div></div>
  <div class="item"><div class="item-content">C</div></div>
</div>
```

**Finally, initiate a Muuri instance.**

```javascript
var grid = new Muuri({
  container: document.getElementsByClassName('grid')[0],
  items: document.getElementsByClassName('item')
});
```

**Here's an example with all the pieces in place.**

```html
<!doctype html>
<html>
  <head></head>
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

