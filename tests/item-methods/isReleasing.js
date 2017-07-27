(function (window) {

  var Muuri = window.Muuri;
  var Simulator = window.Simulator;

  QUnit.module('Item methods');

  QUnit.test('isReleasing: should return true if the item is being released', function (assert) {

    assert.expect(6);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {dragEnabled: true});
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid
    .once('dragStart', function () {
      assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state when dragging starts');
    })
    .once('dragMove', function () {
      assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state when dragging');
    })
    .once('dragEnd', function () {
      assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state when drag ends');
    })
    .once('dragReleaseStart', function () {
      assert.strictEqual(item.isReleasing(), true, 'An item should be in releasing state right after it has been released');
    })
    .once('dragReleaseEnd', function () {
      assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state right after releasing has ended');
      teardown();
    });

    assert.strictEqual(item.isReleasing(), false, 'An item should not be in releasing state when it`s not being released');

    utils.dragElement(item.getElement(), 100, 100);

  });

})(this);