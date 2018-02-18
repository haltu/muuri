(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('remove: should be triggered after grid.remove()', function (assert) {

    assert.expect(4);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var removedIndices = [0, 1];
    var removedItems = grid.getItems(removedIndices);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('remove', function (items) {
      assert.strictEqual(arguments.length, 1, 'callback: should have one argument');
      assert.deepEqual(utils.sortedIdList(items), utils.sortedIdList(removedItems), 'callback: first argument should be an array of the removed items');
    });
    grid.on('removeIndices', function (itemIndices) {
      assert.strictEqual(arguments.length, 1, 'callback: should have one argument');
      assert.deepEqual(itemIndices, removedIndices, 'callback: first argument should be an array of the removed item indices');
    });
    grid.remove(removedItems);
    teardown();

  });

})(this);