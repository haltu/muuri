(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('itemHiddenClass: should define the classname for hidden item elements', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container, {
      itemHiddenClass: 'foo'
    });
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(0);
    assert.strictEqual(utils.matches(grid.getItems()[0].getElement(), '.foo'), true, 'hidden items should have the classname');
    assert.strictEqual(utils.matches(grid.getItems()[1].getElement(), '.foo'), false, 'visible items should not have the classname');
    teardown();

  });

})(this);