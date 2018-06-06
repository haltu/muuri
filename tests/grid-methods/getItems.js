(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('getItems: should return the instance`s items', function (assert) {

    assert.expect(6);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    assert.notStrictEqual(idList(grid.getItems()), idList(grid._items), 'should return a new array and not a reference to the internal array');
    assert.deepEqual(idList(grid.getItems()), idList(grid._items), 'should return all items in correct order if no arguments are provided');
    assert.deepEqual(idList(grid.getItems(0)), idList([items[0]]), 'should allow providing an index as the first argument');
    assert.deepEqual(idList(grid.getItems(items[0].getElement())), idList([items[0]]), 'should allow providing an element as the first argument');
    assert.deepEqual(idList(grid.getItems(items[0])), idList([items[0]]), 'should allow providing an item as the first argument');
    assert.deepEqual(idList(grid.getItems([0, items[1].getElement(), items[2]])), idList([items[0], items[1], items[2]]), 'should allow providing an array of indices, elements and items as the first argument');

    teardown();
  });

})(this);