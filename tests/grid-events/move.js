(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('move: should be triggered after grid.move()', function (assert) {

    assert.expect(7);

    var container = utils.createGridElements().container;
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

})(this);