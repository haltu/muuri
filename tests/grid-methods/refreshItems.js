(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('refreshItems: should return the instance', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.refreshItems(), grid);
    teardown();
  });

  QUnit.test(
    'refreshItems: should update the cached dimensions of instance`s items',
    function (assert) {
      assert.expect(7);

      var container = utils.createGridElements({
        itemCount: 5,
        itemStyles: {
          position: 'absolute',
          width: '50px',
          height: '50px',
          padding: '0px',
          border: '0px',
          margin: '10px',
          boxSizing: 'border-box',
          background: '#000',
        },
      });
      var grid = new Muuri(container);
      var items = grid.getItems();
      var updateItemDimensions = function (items) {
        [].concat(items).forEach(function (item) {
          utils.setStyles(item.getElement(), {
            width: '10px',
            height: '20px',
            margin: '30px',
          });
        });
      };
      var assertItemChange = function (items, msg) {
        [].concat(items).forEach(function (item) {
          var result = {
            margin: item.getMargin(),
            width: item.getWidth(),
            height: item.getHeight(),
          };
          assert.deepEqual(
            result,
            {
              width: 10,
              height: 20,
              margin: {
                left: 30,
                right: 30,
                top: 30,
                bottom: 30,
              },
            },
            msg
          );
        });
      };
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
      };

      updateItemDimensions(items.slice(0, 2));
      grid.refreshItems(items.slice(0, 2));
      assertItemChange(items.slice(0, 2), 'should accept an array of items');

      updateItemDimensions(items);
      grid.refreshItems();
      assertItemChange(items, 'should refresh all items if no aguments are provided');

      teardown();
    }
  );
})(this);
