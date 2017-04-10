(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragSortPredicate: the default action should be "move"', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    }).container;
    var grid = new Muuri(container, {
      dragEnabled: true
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.once('move', function (data) {
      assert.strictEqual(data.action, 'move', 'the movement action should be "move"');
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70}
    });

  });

  QUnit.test('dragSortPredicate: should allow "swap" as the sort action', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    }).container;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortPredicate: {
        action: 'swap'
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.once('move', function (data) {
      assert.strictEqual(data.action, 'swap', 'the movement action should be "swap"');
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70}
    });

  });

  QUnit.test('dragSortPredicate: should receive the dragged item and current hammer event as it`s arguments', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    }).container;
    var isChecked = false;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortPredicate: function (draggedItem, ev) {
        if (!isChecked) {
          assert.strictEqual(arguments.length, 2, 'predicate should receive two aguments');
          assert.strictEqual(draggedItem, item, 'predicate first argument should be the dragged item');
          assert.strictEqual(utils.isHammerEvent(ev), true, 'predicate second argument should be a hammer event');
          isChecked = true;
        }
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70},
      onRelease: teardown
    });

  });

  QUnit.test('dragSortPredicate: should not trigger sorting if a falsy value is returned', function (assert) {

    assert.expect(0);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    }).container;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortPredicate: function (draggedItem, ev) {
        return false;
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.once('move', function () {
      assert.strictEqual(true, false, 'move should not be triggered');
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70},
      onRelease: teardown
    });

  });

  QUnit.test('dragSortPredicate: should trigger sorting if an object with index', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    }).container;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortPredicate: function () {
        return {
          index: -1,
          action: 'swap'
        };
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.once('move', function (data) {
      assert.strictEqual(data.action, 'swap', 'sort action should be "swap"');
      assert.strictEqual(data.toIndex, grid.getItems().length - 1, 'target index should be the last index');
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70}
    });

  });

})(this);