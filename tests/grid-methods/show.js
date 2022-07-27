(function (window) {
  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('show: should return the instance', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri.Grid(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.show(grid.getItems(0)), grid);
    teardown();
  });

  QUnit.test('show: should accept an array of items as the first argument', function (assert) {
    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri.Grid(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(items, { instant: true });
    assert.strictEqual(
      utils.getVisibleItems(grid).length,
      0,
      'there should be no visible items before the tests start'
    );

    grid.show(items.slice(0, 3));
    assert.deepEqual(
      idList(utils.getVisibleItems(grid)),
      idList(items.slice(0, 3)),
      'should accept an array of items as the first argument'
    );

    teardown();
  });

  QUnit.test('show: should not show instantly by default', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri.Grid(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(items, { instant: true }).show(items.slice(0, 1));
    assert.deepEqual(idList(utils.getShowingItems(grid)), idList(items.slice(0, 1)));

    teardown();
  });

  QUnit.test('show: should show instantly if instant option is true', function (assert) {
    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri.Grid(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(items, { instant: true }).show(items.slice(0, 1), { instant: true });
    assert.deepEqual(items[0].isShowing(), false);
    assert.deepEqual(items[0].isVisible(), true);

    teardown();
  });

  QUnit.test(
    'show: should call the onFinish callback once the animation is finished',
    function (assert) {
      assert.expect(5);

      var done = assert.async();
      var container = utils.createGridElements();
      var grid = new Muuri.Grid(container);
      var items = grid.getItems();
      var argItems = null;
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      grid
        .on('showEnd', function (completedItems) {
          assert.deepEqual(
            idList(completedItems),
            idList(argItems),
            'callback: the received items should match the items of show event callback'
          );
          teardown();
        })
        .hide(items, { instant: true })
        .show(grid.getItems(0), {
          onFinish: function (completedItems) {
            assert.strictEqual(arguments.length, 1, 'callback: should receive one argument');
            assert.deepEqual(
              idList(completedItems),
              idList(items.slice(0, 1)),
              'callback: should receive the shown items as it`s first argument'
            );
            assert.strictEqual(
              completedItems[0].isVisible(),
              true,
              'callback: the received items should be in "visible" state'
            );
            assert.strictEqual(
              completedItems[0].isShowing(),
              false,
              'callback: the received items should not be in "showing" state'
            );
            argItems = completedItems;
          },
        });
    }
  );
})(this);
