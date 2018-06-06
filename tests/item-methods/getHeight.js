(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('getHeight: should return the instance element`s cached height that includes paddings and borders', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(item.getHeight(), 50, 'The returned height is equal to the element`s content height + top/bottom paddings + top/bottom borders size');
    item.getElement().style.padding = '0px';
    assert.strictEqual(item.getHeight(), 50, 'The returned height is the cached height and not the element`s current height in DOM');
    teardown();

  });

})(this);