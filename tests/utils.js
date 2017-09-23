(function (window) {

  var utils = window.utils = {};
  var supportsTouch = !!('TouchEvent' in window);
  var supportsPointer = !!('PointerEvent' in window);

  //
  // Methods
  //

  utils.createGrid = function (options) {

    var opts = options || {};
    var container = opts.container || document.createElement('div');
    var itemCount = typeof opts.itemCount === 'number' && opts.itemCount >= 0 ? opts.itemCount : 10;
    var itemStyles = opts.itemStyles || {
      position: 'absolute',
      width: '50px',
      height: '50px',
      padding: '5px',
      border: '5px solid #ff0000',
      margin: '10px',
      background: '#000',
      boxSizing: 'border-box'
    };
    var containerStyles = opts.containerStyles || {
      position: 'relative'
    };
    var items = [];
    var item;

    utils.setStyles(container, containerStyles);

    for (var i = 0; i < itemCount; i++) {
      item = document.createElement('div');
      utils.setStyles(item, itemStyles);
      item.appendChild(document.createElement('div'));
      container.appendChild(item);
      items.push(item);
    }

    if (container !== document.body && !document.body.contains(container)) {
      (opts.appendTo || document.body).appendChild(container);
    }

    return container;

  };

  utils.dragElement = function(element, moveLeft, moveTop, onStop) {

    // Calculate start point.
    var from = mezr.offset(element, window);
    from.left += mezr.width(element) / 2;
    from.top += mezr.height(element) / 2;

    // Create the hand istance.
    var hand = new Hand({
      timing: 'fastFrame',
      onStop: function () {
        if (typeof onStop === 'function') {
          window.setTimeout(onStop, 100);
        }
      }
    });

    // Create finger instance.
    var finger = hand.growFinger(supportsPointer ? 'pointer' : supportsTouch ? 'touch' : 'mouse', {
      pointerType: supportsTouch ? 'touch' : 'mouse',
      down: false,
      width: 30,
      height: 30,
      x: from.left,
      y: from.top
    });

    // Do the drag if movement is defined.
    if (moveTop || moveLeft) {
      finger.down().wait(100).moveTo(from.left + moveLeft, from.top + moveTop, 100).wait(200).up();
    }
    // Otherwise do a press.
    else {
      finger.down().wait(400).up();
    }

  };

  utils.idList = function (collection) {
    return collection.map(function (item) {
      return item._id;
    });
  };

  utils.sortedIdList = function (items) {
    return utils.idList(items.sort(function (a, b) {
      return a._id - b._id;
    }));
  };

  utils.setStyles = function (element, styles) {
    var props = Object.keys(styles);
    for (var i = 0; i < props.length; i++) {
      element.style[props[i]] = styles[props[i]];
    }
  };

  utils.matches = function (el, selector) {
    var p = Element.prototype;
    return (p.matches || p.matchesSelector || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector).call(el, selector);
  };

  utils.raf = function (cb) {
    return (window.requestAnimationFrame
      || window.webkitRequestAnimationFrame
      || window.mozRequestAnimationFrame
      || window.msRequestAnimationFrame
      || function (cb) {
        return window.setTimeout(cb, 16);
      }
    )(cb);
  };

  utils.isScrollEvent = function (e) {
    return e.type === 'scroll';
  };

  utils.isHammerEvent = function (e) {

    var ret = true;
    var eventKeys = Object.keys(e);
    var requiredKeys = [
      'type',
      'deltaX',
      'deltaY',
      'deltaTime',
      'distance',
      'angle',
      'velocityX',
      'velocityY',
      'velocity',
      'direction',
      'offsetDirection',
      'scale',
      'rotation',
      'center',
      'srcEvent',
      'target',
      'pointerType',
      'eventType',
      'isFirst',
      'isFinal',
      'pointers',
      'changedPointers',
      'preventDefault'
    ];

    requiredKeys.forEach(function (key) {
      if (eventKeys.indexOf(key) === -1) {
        ret = false;
      }
    });

    return ret;

  };

})(this);