(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods - isShowing');

  QUnit.test('item.isShowing() should return true if the item is animating to visible and otherwise false', function (assert) {

    assert.expect(5);

    var done = assert.async();
    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var item = grid.getItems()[0];

    assert.strictEqual(item.isShowing(), false, 'An item should not be in showing state when the it`s visible');
    grid.hide(item, {onFinish: function () {
      assert.strictEqual(item.isShowing(), false, 'An item should not be in showing state when the it`s hidden');
      grid.show(item, {onFinish: function () {
        assert.strictEqual(item.isShowing(), false, 'An item should not be in showing state after it has finished the show animation');
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      }});
      assert.strictEqual(item.isShowing(), true, 'An item should be in showing state when it`s being animated to visible');
    }});
    assert.strictEqual(item.isShowing(), false, 'An item should not be in showing state when the it`s being animated to hidden');

  });

})(this);