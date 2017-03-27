(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('item.getWidth() should return the Item element`s cached width that includes paddings and borders', function (assert) {

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

    assert.strictEqual(item.getWidth(), 50, 'The returned width is equal to the element`s content width + left/right paddings + left/right borders size');

    item.getElement().style.padding = '0px';

    assert.strictEqual(item.getWidth(), 50, 'The returned width is the cached width and not the element`s current width in DOM');

    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);