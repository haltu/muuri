(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('layoutEnd: should be triggered after grid.layout() (after the items have positioned)', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container);
    var isAnyItemPositioning = false;
    var expectedItems = [];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('layoutEnd', function (items) {
      items.forEach(function (item) {
        if (item.isPositioning()) {
          isAnyItemPositioning = true;
        }
      });
      assert.strictEqual(arguments.length, 1, 'callback: should have a single argument');
      assert.deepEqual(utils.sortedIdList(items), utils.sortedIdList(expectedItems), 'callback: first argument should be an array of items that were active when the layout was triggered');
      assert.strictEqual(isAnyItemPositioning, false, 'callback: none of the items in the first argument should be in positioning state');
      teardown();
    });
    grid.hide(0, {instant: true, layout: false});
    expectedItems = grid.getItems('active');
    grid.move(1, -1);

  });

})(this);