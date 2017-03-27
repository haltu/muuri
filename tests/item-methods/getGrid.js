(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('item.getGrid() should return the Item instance`s associated Grid instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var item = grid.getItems()[0];

    assert.strictEqual(item.getGrid(), grid);

    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);