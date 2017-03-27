(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('item.getHeight() should return the Item element`s cached height that includes paddings and borders', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements({
      itemStyles: {
        width: '10px',
        height: '10px',
        padding: '10px',
        border: '10px solid #000',
        margin: '10px'
      }
    }).container;
    var grid = new Muuri(container);
    var item = grid.getItems()[0];

    assert.strictEqual(item.getHeight(), 50, 'The returned height is equal to the element`s content height + top/bottom paddings + top/bottom borders size');

    item.getElement().style.padding = '0px';

    assert.strictEqual(item.getHeight(), 50, 'The returned height is the cached height and not the element`s current height in DOM');

    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);