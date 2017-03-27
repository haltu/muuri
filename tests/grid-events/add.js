(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"add" event should be triggered after grid.add() is called', function (assert) {

    var container = utils.createGridElements({itemCount: 5}).container;
    var grid = new Muuri(container);
    var newElems = [
      document.createElement('div').appendChild(document.createElement('div')).parentNode,
      document.createElement('div').appendChild(document.createElement('div')).parentNode
    ];

    assert.expect(2);

    grid.on('add', function (items) {
      assert.strictEqual(arguments.length, 1, 'should have one argument');
      assert.deepEqual(utils.sortItemsById(items), utils.sortItemsById(grid.getItems(newElems)), 'items should be an array of the added items');
    });

    grid.add(newElems);

    // Teardown.
    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);