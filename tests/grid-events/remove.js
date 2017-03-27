(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"remove" event should be triggered after grid.remove() is called', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements({itemCount: 5}).container;
    var grid = new Muuri(container);
    var removedItems = grid.getItems([0,1]);

    grid.on('remove', function (items) {
      assert.strictEqual(arguments.length, 1, '"remove" event callback should have one argument');
      assert.deepEqual(utils.sortItemsById(items), utils.sortItemsById(removedItems), '"remove" event items should be an array of the removed items');
    });
    grid.remove(removedItems);

    // Teardown.
    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);