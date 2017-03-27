(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"hideStart" event should be triggered after grid.hide() is called, just before the showing starts', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements({itemCount: 5}).container;
    var grid = new Muuri(container);

    // Hide the first item.
    grid.hide(0, {layout: false, instant: true});

    // Bind the hideStart listener.
    grid.on('hideStart', function (items) {
      assert.strictEqual(arguments.length, 1, 'should have one argument');
      assert.deepEqual(utils.sortItemsById(items).length, utils.sortItemsById(grid.getItems([1, 2])).length, 'should be an array of all the valid items that are about to be hidden');
    });

    // Hide the items. The first item on the list is already hidden and should
    // be filtered out automatically by the hide method.
    grid.hide([0, 1, 2], {layout: false});

    // Teardown.
    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);