(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test(
    'layoutAbort: should be emitted before layoutStart if current layout process is aborted',
    function (assert) {
      assert.expect(8);

      var done = assert.async();
      var container = utils.createGridElements();
      var grid = new Muuri.Grid(container);
      var expectedItems = [];
      var firstItem = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      grid.on('layoutAbort', function (items) {
        assert.strictEqual(arguments.length, 1, 'callback: should have a single argument');
        assert.deepEqual(
          utils.idList(items),
          utils.idList(expectedItems),
          'callback: first argument should be an array of items that were active when the layout was triggered'
        );
      });

      grid.move(1, -1);

      // Abort #1
      expectedItems = utils.getActiveItems(grid);
      grid.move(1, -1);

      // Abort #2
      expectedItems = utils.getActiveItems(grid);
      grid.hide([firstItem]);

      // Abort #3
      expectedItems = utils.getActiveItems(grid);
      grid.show([firstItem]);

      // Abort #4
      expectedItems = utils.getActiveItems(grid);
      grid.hide([firstItem]);

      teardown();
    }
  );
})(this);
