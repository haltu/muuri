(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('itemPositioningClass: should define the classname for positioning item elements', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGrid({itemCount: 3});
    var grid = new Muuri(container, {
      itemPositioningClass: 'foo'
    });
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.move(0, -1, {action: 'swap'});
    utils.raf(function () {
      assert.strictEqual(utils.matches(grid.getItems()[0].getElement(), '.foo'), true, 'first item should be positioning');
      assert.strictEqual(utils.matches(grid.getItems()[2].getElement(), '.foo'), true, 'last item should be positioning');
      assert.strictEqual(utils.matches(grid.getItems()[1].getElement(), '.foo'), false, 'second item should not be positioning');
      teardown();
    });

  });

})(this);