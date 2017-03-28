(function (window) {

  var Muuri = window.Muuri;
  var Simulator = window.Simulator;

  QUnit.module('Item methods');

  QUnit.test('isDragging: should return true if the item is being dragged', function (assert) {

    assert.expect(4);

    var done = assert.async();
    var container = utils.createGridElements().container;
    var grid = new Muuri(container, {dragEnabled: true});
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    assert.strictEqual(item.isDragging(), false, 'An item should not be in dragging state when it`s not being dragged');
    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 100,
        top: 100
      },
      onStart: function () {
        assert.strictEqual(item.isDragging(), true, 'An item should be in dragging state when dragging starts');
      },
      onStop: function () {
        assert.strictEqual(item.isDragging(), true, 'An item should be in dragging state when dragging');
      },
      onRelease: function () {
        assert.strictEqual(item.isDragging(), false, 'An item should not be in dragging state after dragging has ended');
        teardown();
      }
    });

  });

})(this);