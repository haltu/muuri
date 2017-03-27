(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('item.getElement() should return the Item instance`s associated DOM element', function (assert) {

    assert.expect(1);

    var elements = utils.createGridElements();
    var container = elements.container;
    var itemElement = elements.items[1];
    var grid = new Muuri(container);
    var item = grid.getItems(itemElement)[0];

    assert.strictEqual(item.getElement(), itemElement);

    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);