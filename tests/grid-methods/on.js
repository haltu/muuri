(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('on: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.on('foo', function () {}), grid);
    teardown();

  });

  QUnit.test('on: should bind an event listener', function (assert) {

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

    grid.on('synchronize', callback);
    grid.synchronize().synchronize().synchronize();
    assert.strictEqual(calls, 3, 'should execute the listeners when event is emitted');
    teardown();

  });

})(this);