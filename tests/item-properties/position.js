(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Item properties');

  QUnit.test(
    'item.left and item.top: should equal the instance element`s cached position in the grid',
    function (assert) {
      assert.expect(4);

      var container = utils.createGridElements({
        containerStyles: {
          position: 'relative',
          width: '140px',
        },
      });
      var grid = new Muuri.Grid(container);
      var items = grid.getItems();
      var itemA = items[0];
      var itemB = items[1];
      var itemC = items[2];
      var itemD = items[3];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
      };

      assert.deepEqual({ left: itemA.left, top: itemA.top }, { left: 0, top: 0 });
      assert.deepEqual({ left: itemB.left, top: itemB.top }, { left: 70, top: 0 });
      assert.deepEqual({ left: itemC.left, top: itemC.top }, { left: 0, top: 70 });
      assert.deepEqual({ left: itemD.left, top: itemD.top }, { left: 70, top: 70 });
      teardown();
    }
  );
})(this);
