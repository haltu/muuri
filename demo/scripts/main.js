palikka
.define(['jQuery'], function () {

  return window[this.id];

})
.define('docReady', ['jQuery'], function ($) {

  return palikka.defer(function (resolve) {
    $(resolve);
  });

})
.define('demo', ['jQuery',  'docReady'], function ($) {

  var m = {};
  var $grid = $('.grid');
  var $root = $('html');
  var uuid = 0;

  m.grid = null;

  m.init = function () {

    init();

    // Bind events.
    $('.demo-init').on('click', init);
    $('.demo-destroy').on('click', destroy);
    $('.demo-show').on('click', show);
    $('.demo-hide').on('click', hide);
    $('.demo-add').on('click', add);
    $('.demo-remove').on('click', remove);
    $('.demo-refresh').on('click', refresh);
    $('.demo-layout').on('click', layout);
    $('.demo-synchronize').on('click', synchronize);

    return m;

  };

  //
  // Helper utilities
  //

  function generateElements(amount) {

    var ret = [];

    for (var i = 0, len = amount || 1; i < amount; i++) {

      var stuffDiv = document.createElement('div');
      stuffDiv.setAttribute('class', 'item-stuff');
      stuffDiv.appendChild(document.createTextNode(++uuid));

      var innerDiv = document.createElement('div');
      innerDiv.setAttribute('class', 'item-content');
      innerDiv.appendChild(stuffDiv);

      var outerDiv = document.createElement('div');
      var width = Math.floor(Math.random() * 2) + 1;
      var height = Math.floor(Math.random() * 2) + 1;
      outerDiv.setAttribute('class', 'item h' + height + ' w' + width);
      outerDiv.appendChild(innerDiv);

      ret.push(outerDiv);

    }

    return ret;

  }

  function init() {

    if (!m.grid) {

      var dragCounter = 0;

      m.grid = new Muuri({
        container: $grid.get(0),
        items: generateElements(20),
        dragContainer: document.body
      });

      m.grid
      .on('dragstart', function () {
        ++dragCounter;
        $root.addClass('dragging');
      })
      .on('dragend', function () {
        if (--dragCounter < 1) {
          $root.removeClass('dragging');
        }
      });

    }

  }

  function destroy() {

    if (m.grid) {
      m.grid.destroy();
      $grid.empty();
      m.grid = null;
      uuid = 0;
    }

  }

  function show() {

    if (m.grid) {
      m.grid.show(_.sampleSize(m.grid.get('inactive'), 5), function (items) {
        console.log('CALLBACK: Hide ' + items.length + ' items');
      });
    }

  }

  function hide() {

    if (m.grid) {
      m.grid.hide(_.sampleSize(m.grid.get('active'), 5), function (items) {
        console.log('CALLBACK: Hide ' + items.length + ' items');
      });
    }

  }

  function add() {

    if (m.grid) {
      var items = generateElements(5);
      items.forEach(function (item) {
        item.style.display = 'none';
      });
      m.grid.show(m.grid.add(items), function (items) {
        console.log('CALLBACK: Added ' + items.length + ' items');
      });
    }

  }

  function remove() {

    if (m.grid) {
      m.grid.hide(_.sampleSize(m.grid.get('active'), 5), function (items) {
        m.grid.remove(items, true);
        console.log('CALLBACK: Removed ' + items.length + ' items');
      });
    }

  }

  function layout() {

    if (m.grid) {
      m.grid.layout(function () {
        console.log('CALLBACK: Layout');
      });
    }

  }

  function refresh() {

    if (m.grid) {
      m.grid.refresh();
    }

  }

  function synchronize() {

    if (m.grid) {
      m.grid.synchronize();
    }

  }

  return m.init();

})
.require(['jQuery', 'docReady'], function ($) {

});