(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('sort: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.sort(function () {}), grid);
    teardown();

  });

})(this);