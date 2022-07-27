(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Item properties');

  QUnit.test('item.element: should be the instance`s associated DOM element', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var itemElement = container.children[1];
    var grid = new Muuri.Grid(container);
    var item = grid.getItems(itemElement)[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(item.element, itemElement);
    teardown();
  });
})(this);
