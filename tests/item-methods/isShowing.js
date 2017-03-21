(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods - isShowing');

  QUnit.test('item.isShowing() should return true if the item is animating to visible and otherwise false', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var item = grid.getItems()[0];

    assert.strictEqual(item.isShowing(), false);
    grid.hide(item, {instant: true});
    grid.show(item, {onFinish: function () {
      assert.strictEqual(item.isShowing(), false);
      /*
      grid.destroy();
      container.parentNode.removeChild(container);
      */
      done();
    }});
    assert.strictEqual(item.isShowing(), true);

  });

})(this);