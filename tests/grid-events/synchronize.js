(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('"synchronize" event should be triggered after grid.synchronize() method without any arguments', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);

    grid.on('synchronize', function () {
      assert.strictEqual(arguments.length, 0, '"synchronize" event callback should have no arguments')
    });
    grid.synchronize();

    // Teardown.
    grid.destroy();
    container.parentNode.removeChild(container);

  });

})(this);