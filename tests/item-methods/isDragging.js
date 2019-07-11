(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('isDragging: should return true if the item is being dragged', function (assert) {

    assert.expect(4);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container, {dragEnabled: true});
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    function onDragStart() {
      grid.off('dragStart', onDragStart);
      assert.strictEqual(item.isDragging(), true, 'An item should be in dragging state when dragging starts');
    }

    function onDragMove() {
      grid.off('dragMove', onDragMove);
      assert.strictEqual(item.isDragging(), true, 'An item should be in dragging state when dragging');
    }

    function onDragEnd() {
      grid.off('dragEnd', onDragEnd);
      assert.strictEqual(item.isDragging(), false, 'An item should not be in dragging state after dragging has ended');
    }

    grid
    .on('dragStart', onDragStart)
    .on('dragMove', onDragMove)
    .on('dragEnd', onDragEnd);

    assert.strictEqual(item.isDragging(), false, 'An item should not be in dragging state when it`s not being dragged');

    utils.dragElement(item.getElement(), 100, 100, teardown);

  });

})(this);