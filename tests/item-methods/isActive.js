(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Item methods');

  QUnit.test('isActive: should return true if the item is active and otherwise false', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(item.isActive(), true, 'An item should be active when the it`s initiated and it`s display value is set to block');
    grid.hide(item);
    assert.strictEqual(item.isActive(), false, 'An item should not be active after hide is called');
    teardown();

  });

})(this);