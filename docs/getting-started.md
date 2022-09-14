# Getting Started

## 1. Get Muuri

Install via [npm](https://www.npmjs.com/package/muuri):

```bash
npm install muuri
```

Or download:

- [muuri.js](https://cdn.jsdelivr.net/npm/muuri@0.9.5/dist/muuri.js) - for development (not minified, with comments).
- [muuri.min.js](https://cdn.jsdelivr.net/npm/muuri@0.9.5/dist/muuri.min.js) - for production (minified, no comments).

Or link directly:

```html
<script src="https://cdn.jsdelivr.net/npm/muuri@0.9.5/dist/muuri.min.js"></script>
```

## 2. Get Web Animations Polyfill (if needed)

Muuri uses [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) to handle all the animations by default. If you need to use Muuri on a browser that does not support Web Animations you need to use a [polyfill](https://github.com/web-animations/web-animations-js).

Install via [npm](https://www.npmjs.com/package/web-animations-js):

```bash
npm install web-animations-js
```

Or download:

- [web-animations.min.js](https://cdn.jsdelivr.net/npm/web-animations-js@2.3.2/web-animations.min.js)

Or link directly:

```html
<script src="https://cdn.jsdelivr.net/npm/web-animations-js@2.3.2/web-animations.min.js"></script>
```

## 3. Add the markup

- Every grid must have a container element (referred as the _grid element_ from now on).
- Grid items must always consist of at least two elements. The outer element is used for positioning the item and the inner element (first direct child) is used for animating the item's visibility (show/hide methods). You can insert any markup you wish inside the inner item element.
- Note that the class names in the below example are not required by Muuri at all, they're just there for example's sake.

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
      <div class="my-custom-content">Yippee!</div>
      <!-- Safe zone ends -->
    </div>
  </div>
</div>
```

## 4. Add the styles

- The grid element must be "positioned" meaning that it's CSS position property must be set to _relative_, _absolute_ or _fixed_. Also note that Muuri automatically resizes the grid element's width/height depending on the area the items cover and the layout algorithm configuration.
- The item elements must have their CSS position set to _absolute_.
- The item elements must not have any CSS transitions or animations applied to them, because they might conflict with Muuri's internal animation engine. However, the grid element can have transitions applied to it if you want it to animate when it's size changes after the layout operation.
- You can control the gaps between the items by giving some margin to the item elements.
- One last thing. Never ever set `overflow: auto;` or `overflow: scroll;` to the grid element. Muuri's calculation logic does not account for that and you _will_ see some item jumps when dragging starts. Always use a wrapper element for the grid element where you set the `auto`/`scroll` overflow values.

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

## 5. Fire it up

The bare minimum configuration is demonstrated below. You must always provide the grid element (or a selector so Muuri can fetch the element for you), everything else is optional.

```javascript
var grid = new Muuri('.grid');
```

You can view this little tutorial demo [here](https://codepen.io/niklasramo/pen/wpwNjK). After that you might want to check some [examples](/examples.html) as well.
