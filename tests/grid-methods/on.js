(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('on: should bind an event listener', function (assert) {

    assert.expect(3);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var calls = 0;
    var callback1 = function () {
      ++calls;
    };
    var callback2 = function () {
      ++calls;
    };
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('synchronize', callback1);
    assert.strictEqual(calls, 0, 'should not call the callback on init');
    grid.synchronize();
    assert.strictEqual(calls, 1, 'should execute the event`s callbacks when event emitted');
    grid.on('synchronize', callback1);
    grid.on('synchronize', callback2);
    grid.synchronize();
    assert.strictEqual(calls, 4, 'should allow binding multiple listeners');
    teardown();

  });

})(this);