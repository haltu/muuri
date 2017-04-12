(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('filter: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.filter(function () {}), grid);
    teardown();

  });

  QUnit.test('filter: should accept a function as the first argument', function (assert) {

    assert.expect(12);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var items = grid.getItems();
    var firstItem = items[0];
    var i = 0;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.filter(function (item) {
      assert.strictEqual(item, items[i], 'predicate function should be called in ascending order for each item');
      ++i;
      return item === firstItem;
    });
    assert.strictEqual(i, 10), 'predicate function should be called for each item';
    assert.deepEqual(grid.getItems('visible'), [firstItem], 'the items for which true were returned should be shown and others hidden');
    teardown();

  });

  QUnit.test('filter: should accept a selector as the first argument', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var items = grid.getItems();
    var firstItem = items[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    firstItem.getElement().classList.add('foo');
    grid.filter('.foo');
    assert.deepEqual(grid.getItems('visible'), [firstItem]);
    teardown();

  });

})(this);