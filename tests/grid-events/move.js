(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('move: should be triggered after grid.move()', function (assert) {

    assert.expect(7);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('move', function (data) {
      assert.strictEqual(arguments.length, 1, 'callback: should have one argument');
      assert.strictEqual(Object.prototype.toString.call(data), '[object Object]', 'callback: first argument should be a plain object');
      assert.strictEqual(Object.keys(data).length, 4, 'callback: first argument should have 4 properties');
      assert.strictEqual(data.item, item, 'callback: first argument item property should be the moved item');
      assert.strictEqual(data.action, 'move', 'callback: first argument action property should be the correct action');
      assert.strictEqual(data.fromIndex, 0, 'callback: first argument fromIndex property should be the index where the item was moved from');
      assert.strictEqual(data.toIndex, 1, 'callback: first argument toIndex property should be the index where the item was moved to');
    });
    grid.move(item, 1, {layout: false});
    teardown();

  });

  QUnit.test('move: should be triggered when sorting occurs during drag', function (assert) {

    assert.expect(7);

    var done = assert.async();
    var container = utils.createGrid({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('move', function (data) {
      assert.strictEqual(arguments.length, 1, 'callback: should receive one argument');
      assert.strictEqual(Object.prototype.toString.call(data), '[object Object]', 'callback: the argument should be a plain object');
      assert.strictEqual(Object.keys(data).length, 4, 'callback: the argument should have 4 properties');
      assert.strictEqual(data.item, item, 'callback: the argument item property should be the moved item');
      assert.strictEqual(data.action, 'move', 'callback: the argument action property should be the correct action');
      assert.strictEqual(data.fromIndex, 0, 'callback: the argument fromIndex property should be the index where the item was moved from');
      assert.strictEqual(data.toIndex, 1, 'callback: the argument toIndex property should be the index where the item was moved to');
    });

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

})(this);