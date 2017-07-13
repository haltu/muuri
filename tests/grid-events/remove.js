(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('remove: should be triggered after grid.remove()', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var removedItems = grid.getItems([0,1]);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('remove', function (items) {
      assert.strictEqual(arguments.length, 1, 'callback: should have one argument');
      assert.deepEqual(utils.sortItemsById(items), utils.sortItemsById(removedItems), 'callback: first argument should be an array of the removed items');
    });
    grid.remove(removedItems);
    teardown();

  });

})(this);