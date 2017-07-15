(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('dragStart: should be triggered when dragging starts (in the end of the drag start process)', function (assert) {

    assert.expect(6);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragContainer: document.body
    });
    var item = grid.getItems()[0];
    var calls = 0;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function (draggedItem, ev) {
      assert.strictEqual(arguments.length, 2, 'callback: should have receive two arguments');
      assert.strictEqual(draggedItem, item, 'callback: first argument should be the dragged item');
      assert.strictEqual(utils.isHammerEvent(ev), true, 'callback: second argument should be a hammer event object');
      assert.strictEqual(utils.matches(draggedItem.getElement(), '.muuri-item-dragging'), true, 'should be called after dragging classname is set');
      assert.strictEqual(draggedItem.getElement().parentNode, document.body, 'should be called after dragged element is appended to it`s drag container');
      ++calls;
    });

    utils.dragElement(item.getElement(), 100, 100, function () {
      assert.strictEqual(calls, 1, 'should be called only once during drag process');
      teardown();
    });

  });

})(this);