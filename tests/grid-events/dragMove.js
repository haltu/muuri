(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('dragMove: should be triggered when item is dragged', function (assert) {

    assert.expect(5);

    var done = assert.async();
    var container = utils.createGrid();
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
        assert.strictEqual(utils.isHammerEvent(ev), true, 'callback: second argument should be a hammer event object');
        assert.strictEqual(isStartCalled, true, 'callback: should be called after dragStart');
      }
      ++calls;
    });

    utils.dragElement(item.getElement(), 100, 100, function () {
      assert.strictEqual(calls > 1, true, 'should be called many times during drag process');
      teardown();
    });

  });

})(this);