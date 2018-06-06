(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('layout: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.layout(), grid);
    teardown();

  });

  QUnit.test('layout: should not layout the items instantly by default', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.move(0, -1, {layout: false});
    grid.layout();
    assert.strictEqual(items[0].isPositioning(), true);
    teardown();

  });

  QUnit.test('layout: should layout the items instantly if the first argument is true', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.move(0, -1, {layout: false});
    grid.layout(true);
    assert.strictEqual(items[0].isPositioning(), false);
    teardown();

  });

  QUnit.test('layout: should call the provided callback function after layout is finished', function (assert) {

    assert.expect(4);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid
    .move(0, -1, {layout: false})
    .layout(function (isInterrupted, items) {
      assert.strictEqual(arguments.length, 2, 'callback: should have two arguments');
      assert.strictEqual(isInterrupted, false, 'callback: first argument should be a boolean that is true if the layout process was interrupted');
      assert.deepEqual(idList(items), idList(utils.getActiveItems(grid)), 'callback: second argument should be an array of the positioned items (all active items)');
      assert.strictEqual(items[0].isPositioning(), false, 'callback: items should not be in positioning state');
      teardown();
    });

  });

})(this);