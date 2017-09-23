(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('sort: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.sort(function () {}), grid);
    teardown();

  });

  QUnit.test('sort: should accept a function as the first argument', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var newIndices = [1, 0, 3, 2, 5, 4, 7, 6, 9, 8];
    var newItems = [];
    var sortByFoo = function (itemA, itemB) {
      var a = parseInt(itemA.getElement().getAttribute('data-foo'));
      var b = parseInt(itemB.getElement().getAttribute('data-foo'));
      return a - b;
    };
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    // Add new indices to item elements.
    items.forEach(function (item, i) {
      item.getElement().setAttribute('data-foo', newIndices[i]);
      newItems[newIndices[i]] = item;
    });

    // Test the default ascending order.
    grid.sort(sortByFoo);
    assert.deepEqual(idList(grid.getItems()), idList(newItems), 'the items should be in ascending order by default');

    // Test descending flag.
    grid.sort(sortByFoo, {descending: true});
    assert.deepEqual(idList(grid.getItems()), idList(newItems.reverse()), 'the items should be in descending order when descending option is true');

    teardown();

  });

  QUnit.test('sort: should accept a single sort property (string) as the first argument', function (assert) {

    assert.expect(3);

    var container = utils.createGrid();
    var grid = new Muuri(container, {
      sortData: {
        foo: function (item, element) {
          return parseFloat(element.getAttribute('data-foo'));
        }
      }
    });
    var items = grid.getItems();
    var newIndices = [1, 0, 3, 2, 5, 4, 7, 6, 9, 8];
    var newItems = [];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    // Add foo data to elements and refresh sort data.
    items.forEach(function (item, i) {
      item.getElement().setAttribute('data-foo', newIndices[i]);
      newItems[newIndices[i]] = item;
    });
    grid.refreshSortData();

    // Test the default ascending order.
    grid.sort('foo');
    assert.deepEqual(idList(grid.getItems()), idList(newItems.concat()), 'the items should be in ascending order by default');

    // Test property's descending flag.
    grid.sort('foo:desc');
    assert.deepEqual(idList(grid.getItems()), idList(newItems.concat().reverse()), 'the items should be in descending order when "desc" flag is added to the property');

    // Test property's descending flag.
    grid.sort('foo', {descending: true});
    assert.deepEqual(idList(grid.getItems()), idList(newItems.concat().reverse()), 'the items should be in descending order when descending option is true');

    teardown();

  });

  QUnit.test('sort: should accept multiple sort properties (string) as the first argument', function (assert) {

    assert.expect(5);

    var container = utils.createGrid();
    var grid = new Muuri(container, {
      sortData: {
        foo: function (item, element) {
          return parseFloat(element.getAttribute('data-foo'));
        },
        bar: function (item, element) {
          return parseFloat(element.getAttribute('data-bar'));
        }
      }
    });
    var items = grid.getItems();
    var fooData = [2, 1, 4, 3, 6, 5, 8, 7, 10, 9];
    var barData = [2, 2, 2, 2, 2, 1, 1, 1, 1, 1];
    var orderFooBar = [1, 0, 3, 2, 5, 4, 7, 6, 9, 8];
    var orderFooBarDesc = [8, 9, 6, 7, 4, 5, 2, 3, 0, 1];
    var orderBarFoo = [6, 5, 8, 7, 9, 0, 2, 1, 4, 3];
    var orderBarFooDesc = [3, 4, 1, 2, 0, 9, 7, 8, 5, 6];
    var orderBarFooSpecial = [1, 0, 3, 2, 4, 5, 7, 6, 9, 8];
    var itemsFooBar = [];
    var itemsFooBarDesc = [];
    var itemsBarFoo = [];
    var itemsBarFooDesc = [];
    var itemsBarFooSpecial = [];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    // Add foo and bar data to elements and refresh sort data.
    items.forEach(function (item, i) {
      item.getElement().setAttribute('data-foo', fooData[i]);
      item.getElement().setAttribute('data-bar', barData[i]);
      itemsFooBar[orderFooBar[i]] = item;
      itemsFooBarDesc[orderFooBarDesc[i]] = item;
      itemsBarFoo[orderBarFoo[i]] = item;
      itemsBarFooDesc[orderBarFooDesc[i]] = item;
      itemsBarFooSpecial[orderBarFooSpecial[i]] = item;
    });
    grid.refreshSortData();

    grid.sort('foo bar');
    assert.deepEqual(idList(grid.getItems()), idList(itemsFooBar), 'foo bar');

    grid.sort('bar foo');
    assert.deepEqual(idList(grid.getItems()), idList(itemsBarFoo), 'bar foo');

    grid.sort('foo bar', {descending: true});
    assert.deepEqual(idList(grid.getItems()), idList(itemsFooBarDesc), 'foo bar (descending)');

    grid.sort('bar foo', {descending: true});
    assert.deepEqual(idList(grid.getItems()), idList(itemsBarFooDesc), 'bar foo (descending)');

    grid.sort('bar:desc foo');
    assert.deepEqual(idList(grid.getItems()), idList(itemsBarFooSpecial), 'bar:desc foo');

    teardown();

  });

  QUnit.test('sort: should accept an array of items as the first argument', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var newItems = items.concat().reverse();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.sort(newItems);
    assert.deepEqual(idList(grid.getItems()), idList(newItems));

    teardown();

  });

})(this);