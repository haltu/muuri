(function (window) {

  var Muuri = window.Muuri;
  var Simulator = window.Simulator;

  QUnit.module('Grid events');

  QUnit.test('dragEnd: should be triggered when item is dragged', function (assert) {

    assert.expect(6);

    var done = assert.async();
    var container = utils.createGridElements().container;
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

    grid.on('dragMove', function (ev, draggedItem) {
      isMoveCalled = true;
    });

    grid.on('dragEnd', function (ev, draggedItem) {
      assert.strictEqual(arguments.length, 2, 'callback: should receive two arguments');
      assert.strictEqual(utils.isHammerEvent(ev), true, 'callback: first argument should be a hammer event object');
      assert.strictEqual(draggedItem, item, 'callback: second argument should be the dragged item');
      assert.strictEqual(isStartCalled, true, 'callback: should be called after dragStart');
      assert.strictEqual(isMoveCalled, true, 'callback: should be called after dragMove');
      ++calls;
    });

    grid.on('dragReleaseEnd', function () {
      assert.strictEqual(calls, 1, 'should be called only once during drag process');
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 100,
        top: 100
      }
    });

  });

})(this);