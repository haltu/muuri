(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('off: should unbind an event listener', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements({itemCount: 5}).container;
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
    grid.on('synchronize', callback1);
    grid.on('synchronize', callback2);
    grid.off('synchronize', callback1);
    grid.synchronize();
    assert.strictEqual(calls, 1, 'should unbind all the listeners from the event that match the provided callback');
    teardown();

  });

})(this);