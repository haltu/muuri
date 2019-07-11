(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('dragEnd: should be triggered when item is dragged', function (assert) {

    assert.expect(9);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container, {dragEnabled: true});
    var item = grid.getItems()[0];
    var calls = 0;
    var isStartCalled = false;
    var isMoveCalled = false;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      isStartCalled = true;
    });

    grid.on('dragMove', function () {
      isMoveCalled = true;
    });

    grid.on('dragEnd', function (draggedItem, ev) {
      assert.strictEqual(arguments.length, 2, 'callback: should receive two arguments');
      assert.strictEqual(draggedItem, item, 'callback: first argument should be the dragged item');
      assert.strictEqual(isStartCalled, true, 'callback: should be called after dragStart');
      assert.strictEqual(isMoveCalled, true, 'callback: should be called after dragMove');

      assert.strictEqual(utils.isDraggerEvent(ev), true, 'callback: second argument should be a Dragger event object');
      assert.strictEqual(ev.isFirst, false, 'event.isFirst should be false');
      assert.strictEqual(ev.isFinal, true, 'event.isFinal should be true');
      assert.strictEqual(ev.type, 'end', 'event.type should be "end"');

      ++calls;
    });

    grid.on('dragReleaseEnd', function () {
      assert.strictEqual(calls, 1, 'should be called only once during drag process');
      teardown();
    });

    utils.dragElement(item.getElement(), 100, 100);

  });

})(this);