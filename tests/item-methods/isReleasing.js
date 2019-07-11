(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('isReleasing: should return true if the item is being released', function (assert) {

    assert.expect(6);

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
      assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state when dragging starts');
    }

    function onDragMove() {
      grid.off('dragMove', onDragMove);
      assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state when dragging');
    }

    function onDragEnd() {
      grid.off('dragEnd', onDragEnd);
      assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state when drag ends');
    }

    function onDragReleaseStart() {
      grid.off('dragReleaseStart', onDragReleaseStart);
      assert.strictEqual(item.isReleasing(), true, 'An item should be in releasing state right after it has been released');
    }

    function onDragReleaseEnd() {
      grid.off('dragReleaseEnd', onDragReleaseEnd);
      assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state right after releasing has ended');
      teardown();
    }

    grid
    .on('dragStart', onDragStart)
    .on('dragMove', onDragMove)
    .on('dragEnd', onDragEnd)
    .on('dragReleaseStart', onDragReleaseStart)
    .on('dragReleaseEnd', onDragReleaseEnd);

    assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state when it`s not being released');

    utils.dragElement(item.getElement(), 100, 100);

  });

})(this);