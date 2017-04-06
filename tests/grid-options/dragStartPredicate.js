(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragStartPredicate: should allow customizing the drag start condition', function (assert) {

    assert.expect(5);

    var done = assert.async();
    var container = utils.createGridElements().container;
    var isChecked = false;
    var counter = 0;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: function (draggedItem, ev) {
        ++counter;
        if (!isChecked) {
          assert.strictEqual(arguments.length, 2, 'predicate should receive two aguments');
          assert.strictEqual(draggedItem, item, 'predicate first argument should be the dragged item');
          assert.strictEqual(utils.isHammerEvent(ev), true, 'predicate second argument should be a hammer event');
          isChecked = true;
        }
        return true;
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      assert.strictEqual(true, true, 'predicate should start dragging when it returns true');
    });

    grid.on('dragReleaseStart', function () {
      assert.strictEqual(counter, 2, 'predicate should be called');
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70}
    });

  });

})(this);