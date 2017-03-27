(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"showEnd" event should be triggered after grid.show() is called, after the showing is finished', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({itemCount: 5}).container;
    var grid = new Muuri(container);

    grid.on('showEnd', function (items) {

      // Do the tests.
      assert.strictEqual(arguments.length, 1, 'should have one argument');
      assert.deepEqual(utils.sortItemsById(items), utils.sortItemsById(grid.getItems([0, 1])), 'should be an array of all the valid items that are were shown');

      // Teardown.
      grid.destroy();
      container.parentNode.removeChild(container);
      done();

    });

    // Hide target items instantly.
    grid.hide([0, 1], {layout: false, instant: true});

    // Show the items. The last item on the list is already visible and should
    // be filtered out automatically by the show method.
    grid.show([0, 1, 2], {layout: false});

  });

})(this);