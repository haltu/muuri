(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('itemVisibleClass: should define the classname for visible item elements', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri(container, {
      itemVisibleClass: 'foo'
    });
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(0);
    assert.strictEqual(utils.matches(grid.getItems()[0].getElement(), '.foo'), false, 'hidden items should not have the classname');
    assert.strictEqual(utils.matches(grid.getItems()[1].getElement(), '.foo'), true, 'visible items should have the classname');
    teardown();

  });

})(this);