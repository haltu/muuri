(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('showDuration: should disable show animation when set to 0', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container, {
      showDuration: 0
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(item, {instant: true}).show(item);
    assert.strictEqual(item.isVisible(), true, 'item should be visible');
    assert.strictEqual(item.isShowing(), false, 'item should not be showing');
    teardown();

  });

})(this);