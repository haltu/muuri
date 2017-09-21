(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('showStart: should be triggered after grid.show() (just before the showing starts)', function (assert) {

    assert.expect(2);

    var container = utils.createGrid();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('showStart', function (items) {
      assert.strictEqual(arguments.length, 1, 'callback: should have one argument');
      assert.deepEqual(utils.sortedIdList(items), utils.sortedIdList(grid.getItems([0, 1, 2])), 'callback: first argument should be an array of all the items that are about to be shown');
    });
    grid.hide([0, 1], {layout: false, instant: true});
    grid.show([0, 1, 2], {layout: false});
    teardown();

  });

})(this);