(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test(
    'itemDraggingClass: should define the classname for dragged item elements',
    function (assert) {
      assert.expect(3);

      var done = assert.async();
      var container = utils.createGridElements({ itemCount: 3 });
      var grid = new Muuri(container, {
        itemDraggingClass: 'foo',
        dragEnabled: true,
      });
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      assert.strictEqual(
        utils.matches(item.element, '.foo'),
        false,
        'the classname should not be applied before dragging starts'
      );

      grid.on('dragStart', function () {
        assert.strictEqual(
          utils.matches(item.element, '.foo'),
          true,
          'the classname should be applied when dragging starts'
        );
      });

      grid.on('dragEnd', function () {
        assert.strictEqual(
          utils.matches(item.element, '.foo'),
          false,
          'the classname should be removed when dragging ends'
        );
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
