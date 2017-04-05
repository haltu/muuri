(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('remove: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var removedItems = grid.getItems([0, 1]);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(grid.remove(removedItems), removedItems);
    teardown();

  });

})(this);