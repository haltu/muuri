(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('getElement: should return the instance`s associated DOM element', function (assert) {

    assert.expect(1);

    var elements = utils.createGridElements();
    var container = elements.container;
    var itemElement = elements.items[1];
    var grid = new Muuri(container);
    var item = grid.getItems(itemElement)[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(item.getElement(), itemElement);
    teardown();

  });

})(this);