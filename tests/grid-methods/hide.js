(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('hide: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.hide(0), grid);
    teardown();

  });

})(this);