(function(window) {
  var utils = (window.utils = {});
  var supportsTouch = !!('TouchEvent' in window);
  var supportsPointer = !!('PointerEvent' in window);

  //
  // Methods
  //

  utils.createGridElements = function(options) {
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

  utils.dragElement = function(config) {
    var element = config.element;
    var moveLeft = typeof config.x === 'number' ? config.x : 0;
    var moveTop = typeof config.y === 'number' ? config.y : 0;
    var pressDuration = typeof config.pressDuration === 'number' ? config.pressDuration : 100;
    var moveDuration = typeof config.moveDuration === 'number' ? config.moveDuration : 100;
    var holdDuration = typeof config.holdDuration === 'number' ? config.holdDuration : 200;
    var onFinished = config.onFinished;

    // Calculate start point.
    var from = mezr.offset(element, window);
    from.left += mezr.width(element) / 2;
    from.top += mezr.height(element) / 2;

    // Create the hand instance.
    var hand = new Hand({
      timing: 'fastFrame',
      onStop: function() {
        if (typeof onFinished === 'function') {
          window.setTimeout(onFinished, 100);
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
      finger
        .down()
        .wait(pressDuration)
        .moveTo(from.left + moveLeft, from.top + moveTop, moveDuration)
        .wait(holdDuration)
        .up();
    }
    // Otherwise do a press.
    else {
      finger
        .down()
        .wait(pressDuration + holdDuration)
        .up();
    }
  };

  utils.idList = function(collection) {
    return collection.map(function(item) {
      return item._id;
    });
  };

  utils.sortedIdList = function(items) {
    return utils.idList(
      items.sort(function(a, b) {
        return a._id - b._id;
      })
    );
  };

  utils.getActiveItems = function(grid) {
    return grid.getItems().filter(function(item) {
      return item.isActive();
    });
  };

  utils.getInactiveItems = function(grid) {
    return grid.getItems().filter(function(item) {
      return !item.isActive();
    });
  };

  utils.getVisibleItems = function(grid) {
    return grid.getItems().filter(function(item) {
      return item.isVisible();
    });
  };

  utils.getHiddenItems = function(grid) {
    return grid.getItems().filter(function(item) {
      return !item.isVisible();
    });
  };

  utils.getShowingItems = function(grid) {
    return grid.getItems().filter(function(item) {
      return item.isShowing();
    });
  };

  utils.getHidingItems = function(grid) {
    return grid.getItems().filter(function(item) {
      return item.isHiding();
    });
  };

  utils.getPositioningItems = function(grid) {
    return grid.getItems().filter(function(item) {
      return item.isPositioning();
    });
  };

  utils.getReleasingItems = function(grid) {
    return grid.getItems().filter(function(item) {
      return item.isReleasing();
    });
  };

  utils.setStyles = function(element, styles) {
    var props = Object.keys(styles);
    for (var i = 0; i < props.length; i++) {
      element.style[props[i]] = styles[props[i]];
    }
  };

  utils.matches = function(el, selector) {
    var p = Element.prototype;
    return (
      p.matches ||
      p.matchesSelector ||
      p.webkitMatchesSelector ||
      p.mozMatchesSelector ||
      p.msMatchesSelector ||
      p.oMatchesSelector
    ).call(el, selector);
  };

  utils.raf = function(cb) {
    return (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(cb) {
        return window.setTimeout(cb, 16);
      }
    )(cb);
  };

  utils.isScrollEvent = function(e) {
    return e.type === 'scroll';
  };

  utils.isDraggerEvent = function(e) {
    var ret = true;
    var eventKeys = Object.keys(e);
    var requiredKeys = [
      'type',
      'srcEvent',
      'deltaX',
      'deltaY',
      'deltaTime',
      'distance',
      'isFirst',
      'isFinal',
      'identifier',
      'screenX',
      'screenY',
      'clientX',
      'clientY',
      'pageX',
      'pageY',
      'target'
    ];

    requiredKeys.forEach(function(key) {
      if (eventKeys.indexOf(key) === -1) {
        ret = false;
      }
    });

    return ret;
  };
})(this);
