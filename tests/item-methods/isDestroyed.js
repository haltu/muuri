(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('isDestroyed: should return true if the item is destroyed and otherwise false', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(item.isDestroyed(), false, 'An item should not be destroyed before it is removed from the grid');
    grid.remove(item);
    assert.strictEqual(item.isDestroyed(), true, 'An item should be destroyed after it is removed from the grid');
    teardown();

  });

})(this);