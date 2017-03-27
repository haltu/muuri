(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"layoutEnd" event should be triggered after the items have positioned', function (assert) {

    var done = assert.async();
    var container = utils.createGridElements({itemCount: 5}).container;
    var grid = new Muuri(container);
    var isAnyItemPositioning = false;
    var expectedItems;

    assert.expect(3);

    grid.on('layoutEnd', function (items) {

      // Check if any of the items is still positioning.
      items.forEach(function (item) {
        if (item.isPositioning()) {
          isAnyItemPositioning = true;
        }
      });

      // Do the assertions.
      assert.strictEqual(arguments.length, 1, '"layoutEnd" callback should have a single argument');
      assert.strictEqual(isAnyItemPositioning, false, '"layoutEnd" callback items should not be in positioning state');
      assert.deepEqual(utils.sortItemsById(items), utils.sortItemsById(expectedItems), '"layoutEnd" callback items should be identical to the array of items that were active when the layout was triggered');

      // Teardown.
      grid.destroy();
      container.parentNode.removeChild(container);
      done();

    });

    // Hide the first item instantly.
    grid.hide(0, {instant: true, layout: false});

    // Cache all currently active items.
    expectedItems = grid.getItems('active');

    // Do an action that causes a layout.
    grid.move(1, -1);

  });

})(this);