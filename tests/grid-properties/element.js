(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid properties');

  QUnit.test('grid.element: should be the container element', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri.Grid(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.element, container);
    teardown();
  });
})(this);
