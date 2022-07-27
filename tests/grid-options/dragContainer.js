(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragContainer: should be the grid container by default', function (assert) {
    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri.Grid(container, {
      dragEnabled: true,
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      assert.strictEqual(item.element.parentNode, container);
    });

    utils.dragElement({
      element: item.element,
      x: 100,
      y: 100,
      onFinished: teardown,
    });
  });

  QUnit.test(
    'dragContainer: should define the element the dragged item is appended to during drag',
    function (assert) {
      assert.expect(1);

      var done = assert.async();
      var container = utils.createGridElements();
      var grid = new Muuri.Grid(container, {
        dragEnabled: true,
        dragContainer: document.body,
      });
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      grid.on('dragStart', function () {
        assert.strictEqual(item.element.parentNode, document.body);
      });

      utils.dragElement({
        element: item.element,
        x: 100,
        y: 100,
        onFinished: teardown,
      });
    }
  );
})(this);
