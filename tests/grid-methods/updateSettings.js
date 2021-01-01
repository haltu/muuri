(function (window) {
  var Muuri = window.Muuri;

  var newOptions = {
    // Default show animation
    showDuration: 1000,
    showEasing: 'linear',

    // Default hide animation
    hideDuration: 1000,
    hideEasing: 'linear',

    // Item's visible/hidden state styles
    visibleStyles: {
      opacity: '0.5',
    },
    hiddenStyles: {
      opacity: '0.1',
    },

    // Layout
    layout: {
      fillGaps: true,
      horizontal: true,
      alignRight: true,
      alignBottom: true,
      rounding: true,
    },
    layoutOnResize: 1000,
    layoutDuration: 1000,
    layoutEasing: 'linear',

    // Sorting
    sortData: {
      id: function () {
        return 0;
      },
    },

    // Drag & Drop
    dragEnabled: true,
    dragContainer: document.createElement('div'),
    dragHandle: '.foo',
    dragStartPredicate: {
      distance: 10,
      delay: 10,
    },
    dragAxis: 'x',
    dragSort: false,
    dragSortHeuristics: {
      sortInterval: 10,
      minDragDistance: 20,
      minBounceBackAngle: 0.5,
    },
    dragSortPredicate: {
      threshold: 10,
      action: 'swap',
      migrateAction: 'swap',
    },
    dragRelease: {
      duration: 1000,
      easing: 'linear',
      useDragContainer: false,
    },
    dragCssProps: {
      touchAction: 'auto',
      userSelect: '',
      userDrag: '',
      tapHighlightColor: '',
      touchCallout: '',
      contentZooming: '',
    },
    dragEventListenerOptions: {
      passive: false,
      capture: true,
    },
    dragPlaceholder: {
      enabled: true,
      createElement: function () {
        return document.createElement('span');
      },
      onCreate: function () {},
      onRemove: function () {},
    },
    dragAutoScroll: {
      targets: [window],
      handle: null,
      threshold: 100,
      safeZone: 1,
      speed: 100,
      sortDuringScroll: false,
      smoothStop: true,
      onStart: function () {},
      onStop: function () {},
    },

    // Classnames
    containerClass: 'm',
    itemClass: 'm-item',
    itemVisibleClass: 'm-item-shown',
    itemHiddenClass: 'm-item-hidden',
    itemPositioningClass: 'm-item-positioning',
    itemDraggingClass: 'm-item-dragging',
    itemReleasingClass: 'm-item-releasing',
    itemPlaceholderClass: 'm-item-placeholder',
  };

  QUnit.module('Grid methods');

  QUnit.test('updateSettings: should return the grid instance', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.updateSettings({}), grid);
    teardown();
  });

  QUnit.test("updateSettings: should update grid's internal settings", function (assert) {
    assert.expect(Object.keys(newOptions).length);

    var container = utils.createGridElements({ itemCount: 1 });
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.updateSettings(newOptions);

    for (var option in newOptions) {
      if (utils.isPlainObject(newOptions[option])) {
        assert.deepEqual(
          grid.settings[option],
          newOptions[option],
          option + ': setting updated internally'
        );
      } else {
        assert.strictEqual(
          grid.settings[option],
          newOptions[option],
          option + ': setting updated internally'
        );
      }
    }

    teardown();
  });

  QUnit.test('updateSettings: should update containerClass', function (assert) {
    assert.expect(3);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(
      utils.matches(grid.element, '.' + Muuri.defaultOptions.containerClass),
      true
    );

    grid.updateSettings({ containerClass: 'foo' });

    assert.strictEqual(utils.matches(grid.element, '.foo'), true, 'new containerClass added');

    assert.strictEqual(
      utils.matches(grid.element, '.' + Muuri.defaultOptions.containerClass),
      false,
      'old containerClass removed'
    );

    teardown();
  });

  QUnit.test('updateSettings: should update itemClass', function (assert) {
    assert.expect(3);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(utils.matches(item.element, '.' + Muuri.defaultOptions.itemClass), true);

    grid.updateSettings({ itemClass: 'foo' });

    assert.strictEqual(utils.matches(item.element, '.foo'), true, 'new itemClass added');

    assert.strictEqual(
      utils.matches(item.element, '.' + Muuri.defaultOptions.itemClass),
      false,
      'old itemClass removed'
    );

    teardown();
  });

  QUnit.test(
    'updateSettings: updating dragEnabled should make items draggable or non-draggable',
    function (assert) {
      assert.expect(4);

      var container = utils.createGridElements();
      var grid = new Muuri(container);
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
      };

      assert.strictEqual(item._drag, null);

      grid.updateSettings({ dragEnabled: true });

      assert.strictEqual(item._drag instanceof Muuri.ItemDrag, true);

      grid.updateSettings({ dragEnabled: false });

      assert.strictEqual(item._drag, null);

      grid.updateSettings({ dragEnabled: true });

      assert.strictEqual(item._drag instanceof Muuri.ItemDrag, true);

      teardown();
    }
  );
})(this);
