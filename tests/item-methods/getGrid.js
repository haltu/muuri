(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('getGrid: should return the instance`s associated Grid instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(item.getGrid(), grid);
    teardown();

  });

})(this);