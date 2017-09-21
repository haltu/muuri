(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid events');

  QUnit.test('add: should be triggered after grid.add()', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var newElems = [
      document.createElement('div').appendChild(document.createElement('div')).parentNode,
      document.createElement('div').appendChild(document.createElement('div')).parentNode
    ];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('add', function (items) {
      assert.strictEqual(arguments.length, 1, 'callback: should have one argument');
      assert.deepEqual(utils.sortedIdList(items), utils.sortedIdList(grid.getItems(newElems)), 'callback: first argument should be an array of the added items');
    });
    grid.add(newElems);
    teardown();

  });

})(this);