(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"filter" event should be triggered after grid.filter() method is called', function (assert) {

    assert.expect(3);

    var container = utils.createGridElements({itemCount: 2}).container;
    var grid = new Muuri(container);
    var itemsToShow = grid.getItems([0, 1]);
    var itemsToHide = grid.getItems([2, 3]);

    // Bind move listener.
    grid.on('filter', function (shownItems, hiddenItems) {
      assert.strictEqual(arguments.length, 2, 'should have two arguments');
      assert.deepEqual(utils.sortItemsById(shownItems), utils.sortItemsById(itemsToShow), 'shown items should be correct');
      assert.deepEqual(utils.sortItemsById(hiddenItems), utils.sortItemsById(itemsToHide), 'hidden items should be correct');
    });

    // Do the filtering.
    grid.filter(function (item) {
      return itemsToShow.indexOf(item) > -1;
    });

    // Teardown.
    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);