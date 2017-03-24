$(function () {

  var m = {};
  var $root = $('html');
  var $grid1 = $('.grid-1');
  var $grid2 = $('.grid-2');
  var uuid = 0;

  // Bind events.
  $('.demo-init').on('click', initGrids);
  $('.demo-destroy').on('click', destroy);
  $('.demo-show').on('click', show);
  $('.demo-hide').on('click', hide);
  $('.demo-add').on('click', add);
  $('.demo-remove').on('click', remove);
  $('.demo-refresh').on('click', refresh);
  $('.demo-layout').on('click', layout);
  $('.demo-synchronize').on('click', synchronize);
  $('.demo-send').on('click', send);
  $('.demo-filter').on('click', filter);
  $('.demo-sort').on('click', sort);

  // Init.
  initGrids();

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

      var outerDiv = document.createElement('a');
      var width = Math.floor(Math.random() * 2) + 1;
      var height = Math.floor(Math.random() * 2) + 1;
      outerDiv.setAttribute('class', 'item h' + height + ' w' + width);
      outerDiv.setAttribute('href', 'http://google.com');
      outerDiv.setAttribute('target', '_blank');
      outerDiv.appendChild(innerDiv);

      ret.push(outerDiv);

    }

    return ret;

  }

  function initGrids() {

    init($grid1);
    init($grid2);

  }

  function init($grid) {

    if (!$grid.data('muuri')) {

      var dragCounter = 0;

      var muuri = new Muuri($grid.get(0), {
        items: generateElements(20),
        layout: {
          horizontal: false,
          alignRight: false,
          alignBottom: false
        },
        layoutDuration: 1000,
        dragEnabled: true,
        dragContainer: document.body,
        dragReleaseDuration: 1000,
        dragSortGroup: 'a',
        dragSortConnections: ['a']
      });

      $grid.data('muuri', muuri);

      $(document).on('click', '.item', function (e) {
        e.preventDefault();
      });

    }

  }

  function destroy() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.destroy(true);
        $grid.removeData('muuri');
      }

    });

  }

  function show() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.show(muuri.getItems('hidden').slice(0, 5), {
          onFinish: function (items) {
            console.log('CALLBACK: Show ' + items.length + ' items');
          }
        });
      }

    });

  }

  function hide() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.hide(muuri.getItems('visible').slice(0, 5), {
          onFinish: function (items) {
            console.log('CALLBACK: Hide ' + items.length + ' items');
          }
        });
      }

    });

  }

  function add() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        var items = generateElements(5).map(function (item) {
          item.style.display = 'none';
          return item;
        });
        muuri.show(muuri.add(items), {
          onFinish: function (items) {
            console.log('CALLBACK: Added ' + items.length + ' items');
          }
        });
      }

    });

  }

  function remove() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.hide(muuri.getItems('active').slice(0, 5), {
          onFinish: function (items) {
            muuri.remove(items, {removeElements: true});
            console.log('CALLBACK: Removed ' + items.length + ' items');
          }
        });
      }

    });

  }

  function layout() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.layout(function () {
          console.log('CALLBACK: Layout');
        });
      }

    });

  }

  function refresh() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.refreshContainer().refreshItems();
      }

    });

  }

  function synchronize() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.synchronize();
      }

    });

  }

  function send() {

    var grid1 = $grid1.data('muuri');
    var grid2 = $grid2.data('muuri');

    if (grid1 && grid2) {
      grid1.send(grid1.getItems('active')[0], grid2, 0, {
        layout: function () {
          console.log('send layout done');
        }
      });
    }

  }

  function sort() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.sort(function (a, b) {
          return a._id - b._id;
        });
      }

    });

  }

  function filter() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.filter('.h2:not(.w2)');
      }

    });

  }

});