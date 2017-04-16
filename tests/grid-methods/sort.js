(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('sort: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.sort(function () {}), grid);
    teardown();

  });

  QUnit.test('filter: should accept a function as the first argument', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements().container;
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
    assert.deepEqual(grid.getItems(), newItems, 'the items should be in ascending order by default');

    // Test descending flag.
    grid.sort(sortByFoo, {descending: true});
    assert.deepEqual(grid.getItems(), newItems.reverse(), 'the items should be in descending order when descending option is true');

    teardown();

  });

})(this);