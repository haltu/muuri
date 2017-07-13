(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('containerClass: should define the classname for the container element', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container, {
      containerClass: 'foo'
    });
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(utils.matches(container, '.foo'), true);
    teardown();

  });

})(this);