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

      var muuri = new Muuri({
        container: $grid.get(0),
        items: generateElements(20),
        layoutDuration: 1000,
        dragEnabled: true,
        dragContainer: document.body,
        dragReleaseDuration: 1000,
        dragStartPredicate: function (item, event, predicate) {
          var isLastEvent = event.type === 'draginitup' || event.type === 'dragend' || event.type === 'dragcancel';
          if (isLastEvent && !predicate.isResolved()) {
            window.location.href = item._element.getAttribute('href');
          }
          else if (event.distance > 5 || item.isReleasing()) {
            predicate.resolve();
          }
        },
        dragSortInterval: 40,
        dragSortPredicate: {
          action: 'move'
        }
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
        muuri.showItems(muuri.getItems('inactive').slice(0, 5), function (items) {
          console.log('CALLBACK: Hide ' + items.length + ' items');
        });
      }

    });

  }

  function hide() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.hideItems(muuri.getItems('active').slice(0, 5), function (items) {
          console.log('CALLBACK: Hide ' + items.length + ' items');
        });
      }

    });

  }

  function add() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        var items = generateElements(5);
        items.forEach(function (item) {
          item.style.display = 'none';
        });
        muuri.showItems(muuri.addItems(items), function (items) {
          console.log('CALLBACK: Added ' + items.length + ' items');
        });
      }

    });

  }

  function remove() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.hideItems(muuri.getItems('active').slice(0, 5), function (items) {
          muuri.removeItems(items, true);
          console.log('CALLBACK: Removed ' + items.length + ' items');
        });
      }

    });

  }

  function layout() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.layoutItems(function () {
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
        muuri.refresh().refreshItems();
      }

    });

  }

  function synchronize() {

    $grid1.add($grid2).each(function () {

      var $grid = $(this);
      var muuri = $grid.data('muuri');

      if (muuri) {
        muuri.synchronizeItems();
      }

    });

  }

  function send() {

    var grid1 = $grid1.data('muuri');
    var grid2 = $grid2.data('muuri');

    if (grid1 && grid2) {
      grid1.sendItem({
        item: 0,
        target: grid2,
        position: 0
      });
    }

  }

});