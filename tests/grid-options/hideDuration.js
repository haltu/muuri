(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('hideDuration: should disable hide animation when set to 0', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri(container, {
      hideDuration: 0
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(item);
    assert.strictEqual(item.isVisible(), false, 'item should be hidden');
    assert.strictEqual(item.isHiding(), false, 'item should not be hiding');
    teardown();

  });

})(this);