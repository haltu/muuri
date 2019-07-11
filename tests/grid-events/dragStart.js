(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('dragStart: should be triggered when dragging starts (in the end of the drag start process)', function (assert) {

    assert.expect(9);

    var done = assert.async();
    var container = utils.createGridElements();
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
      assert.strictEqual(utils.matches(draggedItem.getElement(), '.muuri-item-dragging'), true, 'should be called after dragging classname is set');
      assert.strictEqual(draggedItem.getElement().parentNode, document.body, 'should be called after dragged element is appended to it`s drag container');

      assert.strictEqual(utils.isDraggerEvent(ev), true, 'callback: second argument should be a Dragger event object');
      assert.strictEqual(ev.isFirst, true, 'event.isFirst should be true');
      assert.strictEqual(ev.isFinal, false, 'event.isFinal should be false');
      assert.strictEqual(ev.type, 'start', 'event.type should be "start"');

      ++calls;
    });

    utils.dragElement(item.getElement(), 100, 100, function () {
      assert.strictEqual(calls, 1, 'should be called only once during drag process');
      teardown();
    });

  });

})(this);