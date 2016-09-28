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

    if (!grid) {

      var dragCounter = 0;

      grid = new Muuri({
        container: $grid.get(0),
        items: generateElements(20),
        dragEnabled: true,
        dragReleaseEasing: 'ease-in',
        dragContainer: document.body
      });

      grid
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

    if (grid) {
      grid.destroy();
      $grid.empty();
      grid = null;
      uuid = 0;
    }

  }

  function show() {

    if (grid) {
      grid.show(grid.get('inactive').slice(0, 5), function (items) {
        console.log('CALLBACK: Hide ' + items.length + ' items');
      });
    }

  }

  function hide() {

    if (grid) {
      grid.hide(grid.get('active').slice(0, 5), function (items) {
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
      grid.show(grid.add(items), function (items) {
        console.log('CALLBACK: Added ' + items.length + ' items');
      });
    }

  }

  function remove() {

    if (grid) {
      grid.hide(grid.get('active').slice(0, 5), function (items) {
        grid.remove(items, true);
        console.log('CALLBACK: Removed ' + items.length + ' items');
      });
    }

  }

  function layout() {

    if (grid) {
      grid.layout(function () {
        console.log('CALLBACK: Layout');
      });
    }

  }

  function refresh() {

    if (grid) {
      grid.refresh();
    }

  }

  function synchronize() {

    if (grid) {
      grid.synchronize();
    }

  }

});