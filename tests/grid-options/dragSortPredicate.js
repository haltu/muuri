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
    });
    var grid = new Muuri(container, {
      dragEnabled: true
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    function onMove(data) {
      grid.off('move', onMove)
      assert.strictEqual(data.action, 'move', 'the movement action should be "move"');
    }

    grid.on('move', onMove);

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSortPredicate: should allow "swap" as the sort action', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    });
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

    function onMove(data) {
      grid.off('move', onMove);
      assert.strictEqual(data.action, 'swap', 'the movement action should be "swap"');
    }

    grid.on('move', onMove);

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSortPredicate: should receive the dragged item and current Dragger event as it`s arguments', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    });
    var isChecked = false;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortPredicate: function (draggedItem, ev) {
        if (!isChecked) {
          assert.strictEqual(arguments.length, 2, 'predicate should receive two aguments');
          assert.strictEqual(draggedItem, item, 'predicate first argument should be the dragged item');
          assert.strictEqual(utils.isDraggerEvent(ev), true, 'predicate second argument should be a Dragger event');
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

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSortPredicate: should not trigger sorting if a falsy value is returned', function (assert) {

    assert.expect(0);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    });
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

    function onMove() {
      grid.off('move', onMove);
      assert.strictEqual(true, false, 'move should not be triggered');
    }

    grid.on('move', onMove);

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSortPredicate: should trigger sorting if an object with index is returned', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    });
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

    function onMove(data) {
      grid.off('move', onMove);
      assert.strictEqual(data.action, 'swap', 'sort action should be "swap"');
      assert.strictEqual(data.toIndex, grid.getItems().length - 1, 'target index should be the last index');
    }

    grid.on('move', onMove);

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSortPredicate: should allow using Muuri.ItemDrag.defaultSortPredicate manually without options', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortPredicate: function (item) {
        return Muuri.ItemDrag.defaultSortPredicate(item);
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    function onMove(data) {
      grid.off('move', onMove);
      assert.strictEqual(data.action, 'move', 'sort action should be "move"');
    }

    grid.on('move', onMove);

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSortPredicate: should allow using Muuri.ItemDrag.defaultSortPredicate manually with options', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '140px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortPredicate: function (item) {
        return Muuri.ItemDrag.defaultSortPredicate(item, {
          threshold: 30,
          action: 'swap'
        });
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    function onMove(data) {
      grid.off('move', onMove);
      assert.strictEqual(data.action, 'swap', 'sort action should be "swap"');
    }

    grid.on('move', onMove);

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

})(this);