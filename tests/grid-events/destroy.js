(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('destroy: should be triggered after grid.destroy()', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var calls = 0;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('destroy', function () {
      assert.strictEqual(arguments.length, 0, 'callback: should have no arguments');
      ++calls;
    });
    grid.destroy().destroy().destroy();
    assert.strictEqual(calls, 1, 'should be called only once no matter how many times grid.destroy() is called');
    teardown();

  });

})(this);