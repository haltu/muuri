(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods - isPositioning');

  QUnit.test('item.isPositioning() should return true if the item`s position is being animated', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var item = grid.getItems()[0];

    assert.strictEqual(item.isPositioning(), false, 'An item should not be in positioning state when it`s position is not being animated');
    grid.move(item, -1, {
      layout: function () {
        assert.strictEqual(item.isPositioning(), false, 'An item should not be in positioning state after the positioning animation is finished');
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      }
    });
    assert.strictEqual(item.isPositioning(), true, 'An item should be in positioning state when it`s position is being animated');

  });

})(this);