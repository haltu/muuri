$(function () {

  var $elem = $('.muuri-logo');
  var grid;

  function createElements () {

    var rows = 5;
    var cols = 21;
    var length = rows * cols;
    var matrix = [
      [0, 4, 6, 9, 11, 14, 16, 17, 18, 19, 20, 22],
      [0, 4, 6, 9, 11, 14, 16, 17, 18, 19, 20, 22],
    ];

    for (var i = 0; i < length; i++) {
      var elem = document.createElement('div');
      $(elem).addClass('item');
      $elem.push('<div class="item"></div>');
    }

  }

});

$(function () {

  var grid;

  function generateAlphabet() {

    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return possible.charAt(Math.floor(Math.random() * possible.length));

  }

  function generateElements(amount) {

    var ret = [];

    for (var i = 0, len = amount || 1; i < amount; i++) {

      var stuffDiv = document.createElement('div');
      stuffDiv.setAttribute('class', 'item-stuff');
      stuffDiv.appendChild(document.createTextNode(generateAlphabet()));
      stuffDiv.style.backgroundColor = randomColor();

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

    if (grid) {
      grid.destroy();
    }

    grid = new Muuri({
      container: document.getElementsByClassName('grid')[0],
      items: document.getElementsByClassName('item')
    });

  }

  function destroy() {

    grid.destroy();
    grid = null;

  }

  function show() {

    grid.show(_.sample(grid.get('inactive'), 5), function (items) {
      console.log('CALLBACK: Hide ' + items.length + ' items');
    });

  }

  function hide() {

    grid.hide(_.sample(grid.get('active'), 5), function (items) {
      console.log('CALLBACK: Hide ' + items.length + ' items');
    });

  }

  function add() {

    var items = generateElements(5);

    items.forEach(function (item) {
      item.style.display = 'none';
    });

    grid.show(grid.add(items), function (items) {
      console.log('CALLBACK: Added ' + items.length + ' items');
    });

  }

  function remove() {

    grid.hide(_.sample(grid.get('active'), 5), function (items) {
      grid.remove(items, true);
      console.log('CALLBACK: Removed ' + items.length + ' items');
    });

  }

  function layout() {

    grid.layout(function () {
      console.log('CALLBACK: Layout');
    });

  }

  function refresh() {

    grid.refresh();

  }

  function synchronize() {

    grid.synchronize();

  }

  $('#init').on('click', init);
  $('#destroy').on('click', destroy);
  $('#show').on('click', show);
  $('#hide').on('click', hide);
  $('#add').on('click', add);
  $('#remove').on('click', remove);
  $('#refresh').on('click', refresh);
  $('#layout').on('click', layout);
  $('#sync-elements').on('click', synchronize);

});