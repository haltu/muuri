(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events - layoutEnd');

  QUnit.test('layoutEnd event should be triggered after grid.layout() is called, after the items have positioned', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({itemCount: 5}).container;
    var grid = new Muuri(container);

    grid.on('layoutEnd', function (items) {
      assert.strictEqual(arguments.length, 1, 'layoutEnd event callback should have one argument');
      assert.deepEqual(utils.sortItemsById(items), utils.sortItemsById(grid.getItems('active')), 'layoutEnd event callback argument should be an array of the items that were successfully laid out');
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    });
    grid.move(0, -1);

  });

})(this);