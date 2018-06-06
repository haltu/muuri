(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('showEnd: should be triggered after grid.show() (after the showing is finished)', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('showEnd', function (items) {
      assert.strictEqual(arguments.length, 1, 'callback: should have one argument');
      assert.deepEqual(utils.sortedIdList(items), utils.sortedIdList(grid.getItems([0, 1, 2])), 'callback: first argument should be an array of all the items that are were shown');
      teardown();
    });
    grid.hide([0, 1], {layout: false, instant: true});
    grid.show([0, 1, 2], {layout: false});

  });

})(this);