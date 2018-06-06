(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('itemClass: should define the classname for the item elements', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container, {
      itemClass: 'foo'
    });
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(utils.matches(grid.getItems()[0].getElement(), '.foo'), true);
    teardown();

  });

})(this);