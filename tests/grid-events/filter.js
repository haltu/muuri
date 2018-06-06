(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('filter: should be triggered after grid.filter()', function (assert) {

    assert.expect(3);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var itemsToShow = grid.getItems([0, 1, 2, 3, 4]);
    var itemsToHide = grid.getItems([5, 6, 7, 8, 9]);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('filter', function (shownItems, hiddenItems) {
      assert.strictEqual(arguments.length, 2, 'callback: should have two arguments');
      assert.deepEqual(utils.sortedIdList(shownItems), utils.sortedIdList(itemsToShow), 'callback: array of shown items should be the first argument');
      assert.deepEqual(utils.sortedIdList(hiddenItems), utils.sortedIdList(itemsToHide), 'callback: array of hidden items should be the second argument');
    });
    grid.filter(function (item) {
      return itemsToShow.indexOf(item) > -1;
    });
    teardown();


  });

})(this);