(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('once: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.once('foo', function () {}), grid);
    teardown();

  });

  QUnit.test('once: should bind an event listener that is triggered only once', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var calls = 0;
    var callback = function () {
      ++calls;
    };
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.once('synchronize', callback);
    grid.synchronize().synchronize().synchronize();
    assert.strictEqual(calls, 1, 'should execute the listener once when event is emitted');
    teardown();

  });

})(this);