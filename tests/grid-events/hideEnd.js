(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test(
    'hideEnd: should be triggered after grid.hide() (after the hiding is finished)',
    function (assert) {
      assert.expect(2);

      var done = assert.async();
      var container = utils.createGridElements();
      var grid = new Muuri.Grid(container);
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      grid.hide(grid.getItems(0), { layout: false, instant: true, syncWithLayout: false });
      grid.on('hideEnd', function (items) {
        assert.strictEqual(arguments.length, 1, 'callback: should have one argument');
        assert.deepEqual(
          utils.sortedIdList(items),
          utils.sortedIdList(grid.getItems([0, 1, 2])),
          'callback: first argument should be an array of all the items that are were hidden'
        );
        teardown();
      });
      grid.hide(grid.getItems([0, 1, 2]), { layout: false, syncWithLayout: false });
    }
  );
})(this);
