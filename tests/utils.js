(function (window) {

  var utils = window.utils = {};

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