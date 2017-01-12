$(function () {

  var m = {};
  var $grid = $('.grid');
  var $root = $('html');
  var uuid = 0;
  var grid = null;

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

  // Init.
  init();

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

  function init() {

    if (!grid) {

      var dragCounter = 0;

      grid = new Muuri({
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
          else if (event.distance > 5 || item._drag._release.isActive) {
            predicate.resolve();
          }
        },
        dragSortInterval: 40,
        dragSortPredicate: {
          action: 'move'
        }
      });

      grid
      .on('dragItemStart', function () {
        ++dragCounter;
        $root.addClass('dragging');
      })
      .on('dragItemEnd', function () {
        if (--dragCounter < 1) {
          $root.removeClass('dragging');
        }
      });

      // Don't follow links of items automatically.
      $(document).on('click', '.item', function (e) {
        e.preventDefault();
      });

      // Prevent native link dragging on firefox.
      $(document).on('dragstart', '.item', function() {
        return false;
      });

    }

  }

  function destroy() {

    if (grid) {
      grid.destroy();
      $grid.empty();
      grid = null;
      uuid = 0;
    }

  }

  function show() {

    if (grid) {
      grid.showItems(grid.getItems('inactive').slice(0, 5), function (items) {
        console.log('CALLBACK: Hide ' + items.length + ' items');
      });
    }

  }

  function hide() {

    if (grid) {
      grid.hideItems(grid.getItems('active').slice(0, 5), function (items) {
        console.log('CALLBACK: Hide ' + items.length + ' items');
      });
    }

  }

  function add() {

    if (grid) {
      var items = generateElements(5);
      items.forEach(function (item) {
        item.style.display = 'none';
      });
      grid.showItems(grid.addItems(items), function (items) {
        console.log('CALLBACK: Added ' + items.length + ' items');
      });
    }

  }

  function remove() {

    if (grid) {
      grid.hideItems(grid.getItems('active').slice(0, 5), function (items) {
        grid.removeItems(items, true);
        console.log('CALLBACK: Removed ' + items.length + ' items');
      });
    }

  }

  function layout() {

    if (grid) {
      grid.layoutItems(function () {
        console.log('CALLBACK: Layout');
      });
    }

  }

  function refresh() {

    if (grid) {
      grid.refresh().refreshItems();
    }

  }

  function synchronize() {

    if (grid) {
      grid.synchronizeItems();
    }

  }

});