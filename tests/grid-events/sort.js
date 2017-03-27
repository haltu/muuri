(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"sort" event should be triggered after grid.sort() method is called', function (assert) {

    assert.expect(3);

    var container = utils.createGridElements({itemCount: 4}).container;
    var grid = new Muuri(container);
    var currentOrder = grid.getItems();
    var newOrder = grid.getItems([3,2,1,0]);

    // Bind move listener.
    grid.on('sort', function (itemsNew, itemsPrev) {
      assert.strictEqual(arguments.length, 2, 'should have two arguments');
      assert.deepEqual(utils.sortItemsById(itemsNew), utils.sortItemsById(newOrder), 'new items should be correct');
      assert.deepEqual(utils.sortItemsById(itemsPrev), utils.sortItemsById(currentOrder), 'previous items should be correct');
    });

    // Do the filtering.
    grid.sort(newOrder);

    // Teardown.
    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);