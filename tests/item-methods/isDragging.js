(function (window) {

  var Muuri = window.Muuri;
  var Simulator = window.Simulator;

  QUnit.module('Item methods - isDragging');

  QUnit.test('item.isDragging() should return true if the item is being dragged', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var itemRect = item.getElement().getBoundingClientRect();
    var touchStartX = itemRect.left + (itemRect.width / 2);
    var touchStartY = itemRect.top + (itemRect.height / 2);

    assert.strictEqual(item.isDragging(), false, 'An item should not be in dragging state when it`s not being dragged');

    utils.dispatchTouchEvent(item.getElement(), 'start', touchStartX, touchStartY);
    assert.strictEqual(item.isDragging(), true, 'An item should be in dragging state when dragging starts');

    utils.dispatchTouchEvent(item.getElement(), 'move', touchStartX + 10, touchStartY + 10);
    assert.strictEqual(item.isDragging(), true, 'An item should be in dragging state when dragging');

    utils.dispatchTouchEvent(item.getElement(), 'end', touchStartX + 10, touchStartY + 10);
    assert.strictEqual(item.isDragging(), false, 'An item should not be in dragging state after dragging has ended');

    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);