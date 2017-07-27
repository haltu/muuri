(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('synchronize: should be triggered after grid.synchronize()', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('synchronize', function () {
      assert.strictEqual(arguments.length, 0, 'callback: should have no arguments');
    });
    grid.synchronize();
    teardown();

  });

})(this);