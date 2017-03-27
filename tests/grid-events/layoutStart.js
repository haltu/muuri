(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"layoutStart" event should be triggered after grid.layout() is called, just before the items are positioned', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements({itemCount: 5}).container;
    var grid = new Muuri(container);

    grid.on('layoutStart', function (items) {
      assert.strictEqual(arguments.length, 1, 'should have one argument');
      assert.deepEqual(utils.sortItemsById(items), utils.sortItemsById(grid.getItems('active')), 'should be an array of the items that are about to be laid out');
    });

    // Cause a layout.
    grid.move(0, -1);

    // Teardown.
    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);