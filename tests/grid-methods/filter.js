(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('filter: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.filter(function () {}), grid);
    teardown();

  });

})(this);