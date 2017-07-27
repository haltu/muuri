(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('dragReleaseEnd: should be triggered when item has positioned after drag', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {dragEnabled: true});
    var item = grid.getItems()[0];
    var calls = 0;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragReleaseEnd', function (draggedItem) {
      assert.strictEqual(arguments.length, 1, 'callback: should have receive one argument');
      assert.strictEqual(draggedItem, item, 'callback: first argument should be the released item');
      teardown();
    });

    utils.dragElement(item.getElement(), 100, 100);

  });

})(this);