(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"hideEnd" event should be triggered after grid.hide() is called, after the hiding is finished', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({itemCount: 5}).container;
    var grid = new Muuri(container);

    // Hide the first item.
    grid.hide(0, {layout: false, instant: true});

    // Bind the hideEnd listener.
    grid.on('hideEnd', function (items) {

      // Do the tests.
      assert.strictEqual(arguments.length, 1, 'should have one argument');
      assert.deepEqual(utils.sortItemsById(items), utils.sortItemsById(grid.getItems([1, 2])), 'should be an array of all the valid items that are were hidden');

      // Teardown.
      grid.destroy();
      container.parentNode.removeChild(container);
      done();

    });

    // Hide the items. The first item on the list is already hidden and should
    // be filtered out automatically by the hide method.
    grid.hide([0, 1, 2], {layout: false});

  });

})(this);