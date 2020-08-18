(function (window) {
  var Muuri = window.Muuri;

  function isPlainObject(val) {
    return typeof val === 'object' && Object.prototype.toString.call(val) === '[object Object]';
  }

  function elementMatches(el, selector) {
    var matchesFn =
      Element.prototype.matches ||
      Element.prototype.matchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      Element.prototype.mozMatchesSelector ||
      Element.prototype.msMatchesSelector ||
      Element.prototype.oMatchesSelector ||
      function () {
        return false;
      };
    return matchesFn.call(el, selector);
  }

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
    assert.expect(Object.keys(newOptions).length + 4);

    var container = utils.createGridElements({ itemCount: 1 });
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.updateSettings(newOptions);

    // Make sure the grid's internal settings are updated to match the new options.
    for (var option in newOptions) {
      if (isPlainObject(newOptions[option])) {
        assert.deepEqual(grid._settings[option], newOptions[option], option);
      } else {
        assert.strictEqual(grid._settings[option], newOptions[option], option);
      }
    }

    // Make sure containerClass is updated.
    assert.strictEqual(
      elementMatches(grid.getElement(), '.' + newOptions.containerClass),
      true,
      'new containerClass exists'
    );
    assert.strictEqual(
      elementMatches(grid.getElement(), '.muuri'),
      false,
      'old containerClass doest not exist'
    );

    // Make sure itemClass is updated.
    var item = grid.getItems()[0];
    assert.strictEqual(
      elementMatches(item.getElement(), '.' + newOptions.itemClass),
      true,
      'new itemClass exists'
    );
    assert.strictEqual(
      elementMatches(item.getElement(), '.muuri-item'),
      false,
      'oldItemClass does not exist'
    );

    teardown();
  });
})(this);
