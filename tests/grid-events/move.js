(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"move" event should be triggered after grid.move() method is called', function (assert) {

    assert.expect(5);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var item = grid.getItems()[0];

    // Bind move listener.
    grid.on('move', function (data) {
      assert.strictEqual(arguments.length, 1, 'should have one argument');
      assert.strictEqual(data.item, item, 'data.item should be the moved item');
      assert.strictEqual(data.action, 'move', 'data.action should be the correct action');
      assert.strictEqual(data.fromIndex, 0, 'data.fromIndex should be the index where the item was moved from');
      assert.strictEqual(data.toIndex, 1, 'data.toIndex should be the index where the item was moved to');
    });

    // Do the move.
    grid.move(item, 1, {layout: false});

    // Teardown.
    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);