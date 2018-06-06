(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('itemReleasingClass: should define the classname for released item elements', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGridElements({itemCount: 3});
    var grid = new Muuri(container, {
      itemReleasingClass: 'foo',
      dragEnabled: true
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    assert.strictEqual(utils.matches(item.getElement(), '.foo'), false, 'the classname should not be applied before release starts');

    grid.on('dragReleaseStart', function () {
      assert.strictEqual(utils.matches(item.getElement(), '.foo'), true, 'the classname should be applied when release starts');
    });

    grid.on('dragReleaseEnd', function () {
      assert.strictEqual(utils.matches(item.getElement(), '.foo'), false, 'the classname should be removed when release ends');
      teardown();
    });

    utils.dragElement(item.getElement(), 100, 100);

  });

})(this);