(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragPlaceholder: should not be enabled by default', function (assert) {
    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container, { dragEnabled: true });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      assert.strictEqual(item._dragPlaceholder.isActive(), false, '');
    });

    utils.dragElement({
      element: item.element,
      x: 70,
      y: 70,
      onFinished: teardown,
    });
  });

  QUnit.test('dragPlaceholder: should be enabled when `enabled` is set to true', function (assert) {
    assert.expect(12);

    var done = assert.async();
    var placeholderClassName = 'i-am-placeholder';
    var container = utils.createGridElements();
    var phElem = document.createElement('div');
    var grid = new Muuri(container, {
      itemPlaceholderClass: placeholderClassName,
      dragEnabled: true,
      dragPlaceholder: {
        enabled: true,
        createElement: function (draggedItem) {
          assert.strictEqual(arguments.length, 1, 'createElement should receive one argument');
          assert.strictEqual(
            draggedItem,
            item,
            'createElement first argument should be the dragged item'
          );
          return phElem;
        },
        onCreate: function (draggedItem, placeholderElem) {
          assert.strictEqual(arguments.length, 2, 'onCreate: should receive two arguments');
          assert.strictEqual(
            draggedItem,
            item,
            'onCreate: first argument should be the dragged item'
          );
          assert.strictEqual(
            placeholderElem,
            phElem,
            'onCreate: second argument should be the placeholder element'
          );
          assert.strictEqual(
            placeholderElem.classList.contains(placeholderClassName),
            true,
            'onCreate: placeholder element should have itemPlaceholderClass applied'
          );
        },
        onRemove: function (draggedItem, placeholderElem) {
          assert.strictEqual(arguments.length, 2, 'onRemove: should receive two arguments');
          assert.strictEqual(
            draggedItem,
            item,
            'onRemove: first argument should be the dragged item'
          );
          assert.strictEqual(
            placeholderElem,
            phElem,
            'onRemove: second argument should be the placeholder element'
          );
          assert.strictEqual(
            placeholderElem.classList.contains(placeholderClassName),
            false,
            'onRemove: placeholder element should have itemPlaceholderClass removed'
          );
          teardown();
        },
      },
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      var ph = item._dragPlaceholder;
      assert.strictEqual(ph.isActive(), true, 'placeholder should be active');
      assert.strictEqual(
        ph.element,
        phElem,
        'placeholder element should be the element returned from createElement method'
      );
    });

    utils.dragElement({
      element: item.element,
      x: 0,
      y: 70,
    });
  });

  QUnit.test(
    'dragPlaceholder: placeholder element dimensions should be kept in sync with item element dimensions',
    function (assert) {
      assert.expect(4);

      var done = assert.async();
      var container = utils.createGridElements();
      var grid = new Muuri(container, { dragEnabled: true, dragPlaceholder: { enabled: true } });
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      grid.on('dragStart', function () {
        var phElem = item._dragPlaceholder.element;
        var itemElem = item.element;
        var phRect = phElem.getBoundingClientRect();
        var itemRect = itemElem.getBoundingClientRect();

        assert.strictEqual(
          phRect.width,
          itemRect.width,
          'placeholder width should match item width'
        );
        assert.strictEqual(
          phRect.height,
          itemRect.height,
          'placeholder height should match item height'
        );

        itemElem.style.width = '200px';
        itemElem.style.height = '10px';
        grid.refreshItems();
      });

      grid.on('dragEnd', function () {
        var phElem = item._dragPlaceholder.element;
        var itemElem = item.element;
        var phRect = phElem.getBoundingClientRect();
        var itemRect = itemElem.getBoundingClientRect();

        assert.strictEqual(
          phRect.width,
          itemRect.width,
          'placeholder width should match item width after item is resized and refreshed'
        );
        assert.strictEqual(
          phRect.height,
          itemRect.height,
          'placeholder height should match item height after item is resized and refreshed'
        );
      });

      utils.dragElement({
        element: item.element,
        x: 0,
        y: 70,
        onFinished: teardown,
      });
    }
  );
})(this);
