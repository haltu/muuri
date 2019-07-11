(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('dragMove: should be triggered when item is dragged', function (assert) {

    assert.expect(8);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container, {dragEnabled: true});
    var item = grid.getItems()[0];
    var calls = 0;
    var isStartCalled = false;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      isStartCalled = true;
    });

    grid.on('dragMove', function (draggedItem, ev) {
      if (!calls) {
        assert.strictEqual(arguments.length, 2, 'callback: should have receive two arguments');
        assert.strictEqual(draggedItem, item, 'callback: first argument should be the dragged item');
        assert.strictEqual(isStartCalled, true, 'callback: should be called after dragStart');

        assert.strictEqual(utils.isDraggerEvent(ev), true, 'callback: second argument should be a Dragger event object');
        assert.strictEqual(ev.isFirst, false, 'event.isFirst should be false');
        assert.strictEqual(ev.isFinal, false, 'event.isFinal should be false');
        assert.strictEqual(ev.type, 'move', 'event.type should be "move"');
      }
      ++calls;
    });

    utils.dragElement(item.getElement(), 100, 100, function () {
      assert.strictEqual(calls > 1, true, 'should be called many times during drag process');
      teardown();
    });

  });

})(this);