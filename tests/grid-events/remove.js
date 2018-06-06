(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('remove: should be triggered after grid.remove()', function (assert) {

    assert.expect(3);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var removedIndices = [0, 1];
    var removedItems = grid.getItems(removedIndices);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('remove', function (items, indices) {
      assert.strictEqual(arguments.length, 2, 'callback: should have two arguments');
      assert.deepEqual(utils.sortedIdList(items), utils.sortedIdList(removedItems), 'callback: first argument should be an array of the removed items');
      assert.deepEqual(indices, removedIndices, 'callback: second argument should be an array of the removed item indices');
    });
    grid.remove(removedItems);
    teardown();

  });

})(this);