(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('isHiding: should return true if the item is animating to hidden and otherwise false', function (assert) {

    assert.expect(4);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    assert.strictEqual(item.isHiding(), false, 'An item should not be in hiding state when the it`s visible');
    grid.hide(item, {onFinish: function () {
      assert.strictEqual(item.isHiding(), false, 'An item should not be in hiding state after it has finished the hide animation');
      grid.show(item);
      assert.strictEqual(item.isHiding(), false, 'An item should not be in hiding state when it`s being animated to visible');
      teardown();
    }});
    assert.strictEqual(item.isHiding(), true, 'An item should be in hiding state when the it`s being animated to hidden');

  });

})(this);