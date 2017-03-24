(function (window) {

  var utils = window.utils = {};
  var vendorPrefixes = ['', 'webkit', 'Moz', 'MS', 'ms', 'o'];
  var supportsTouch = 'ontouchstart' in window;
  var supportsPointerEvents = (function () {
    for (var i = 0; i < vendorPrefixes.length; i++) {
      if ((vendorPrefixes[i] + 'PointerEvent') in window) {
        return true;
      }
    }
  })();

  //
  // Methods
  //

  utils.createGridElements = function (options) {

    var opts = options || {};
    var container = opts.container || document.createElement('div');
    var itemCount = typeof opts.itemCount === 'number' && opts.itemCount >= 0 ? opts.itemCount : 10;
    var itemStyles = opts.itemStyles || {
      width: '10px',
      height: '10px',
      padding: '10px',
      border: '10px solid #000',
      margin: '10px'
    };
    var containerStyles = opts.containerStyles || {
      position: 'relative',
      display: 'block'
    };
    var items = [];
    var item;

    setStyles(container, containerStyles);

    for (var i = 0; i < itemCount; i++) {
      item = document.createElement('div');
      setStyles(item, itemStyles);
      item.appendChild(document.createElement('div'));
      container.appendChild(item);
      items.push(item);
    }

    if (container !== document.body && !document.body.contains(container)) {
      (opts.appendTo || document.body).appendChild(container);
    }

    return {
      container: container,
      items: items
    };

  };

  utils.dragElement = function(options) {

    // Parse options.
    var opts = options || {};
    var noop = function () {};
    var element = opts.element;
    var move = opts.move;
    var onStart = opts.onStart || noop;
    var onStop = opts.onStop || noop;
    var onRelease = opts.onRelease || noop;

    // Calculate start and end points.
    var from = mezr.offset(element, window);
    var to = {
      left: from.left + move.left,
      top: from.top + move.top
    };

    // Create the hand and finger istances.
    var eventMode = supportsPointerEvents ? 'pointer' : supportsTouch ? 'touch' : 'mouse';
    var pointerType = supportsTouch ? 'touch' : 'mouse';
    var hand = new Hand({timing: 'fastFrame'});
    var finger = hand.growFinger(eventMode, {
      pointerType: pointerType,
      down: false,
      width: 30,
      height: 30,
      x: from.left,
      y: from.top
    });

    // Do the drag.
    finger.down();
    window.setTimeout(function () {
      onStart();
      finger.moveTo(to.left, to.top, 100);
      window.setTimeout(function () {
        onStop();
        finger.up();
        window.setTimeout(function () {
          onRelease();
        }, 100);
      }, 200);
    }, 100);

  };

  utils.sortItemsById = function (items) {
    items.sort(function (a, b) {
      return a._id - b._id;
    });
  };

  //
  // Helpers
  //

  function setStyles(element, styles) {

    var props = Object.keys(styles);
    var i;

    for (i = 0; i < props.length; i++) {
      element.style[props[i]] = styles[props[i]];
    }

  }

})(this);