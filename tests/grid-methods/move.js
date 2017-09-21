(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('move: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.move(0, -1), grid);
    teardown();

  });

  QUnit.test('move: should accept elements, items and indices as the first and second arguments', function (assert) {

    assert.expect(3);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var move = function (array, fromIndex, toIndex) {
      array.splice(toIndex, 0, array.splice(fromIndex, 1)[0]);
    };
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.move(0, 1);
    move(items, 0, 1);
    assert.deepEqual(idList(grid.getItems()), idList(items), 'should accept indices');

    grid.move(items[0].getElement(), items[1].getElement());
    move(items, 0, 1);
    assert.deepEqual(idList(grid.getItems()), idList(items), 'should accept elements');

    grid.move(items[0], items[1]);
    move(items, 0, 1);
    assert.deepEqual(idList(grid.getItems()), idList(items), 'should accept items');

    teardown();

  });

  QUnit.test('move: should normalize negative indices to positive indices', function (assert) {

    assert.expect(3);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var move = function (array, fromIndex, toIndex) {
      array.splice(toIndex, 0, array.splice(fromIndex, 1)[0]);
    };
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.move(0, -1);
    move(items, 0, items.length - 1);
    assert.deepEqual(idList(grid.getItems()), idList(items), 'should normalize -1 to last index');

    grid.move(0, -2);
    move(items, 0, items.length - 2);
    assert.deepEqual(idList(grid.getItems()), idList(items), 'should normalize -2 to second last index');

    grid.move(0, -1000);
    assert.deepEqual(idList(grid.getItems()), idList(items), 'should normalize too large negative index to 0');

    teardown();

  });

  QUnit.test('move: should not swap items by default', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var move = function (array, fromIndex, toIndex) {
      array.splice(toIndex, 0, array.splice(fromIndex, 1)[0]);
    };
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.move(0, 2);
    move(items, 0, 2);
    assert.deepEqual(idList(grid.getItems()), idList(items));

    teardown();

  });

  QUnit.test('move: should swap items when action option is set to "swap"', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.move(0, 2, {action: 'swap'});
    assert.strictEqual(grid.getItems().indexOf(items[0]), 2);
    assert.strictEqual(grid.getItems().indexOf(items[2]), 0);

    teardown();

  });

})(this);