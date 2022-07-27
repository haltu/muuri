(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test(
    'dragStartPredicate: should receive the dragged item and current Dragger event as it`s arguments',
    function (assert) {
      assert.expect(3);

      var done = assert.async();
      var container = utils.createGridElements();
      var isChecked = false;
      var grid = new Muuri.Grid(container, {
        dragEnabled: true,
        dragStartPredicate: function (draggedItem, ev) {
          if (!isChecked) {
            assert.strictEqual(arguments.length, 2, 'predicate should receive two aguments');
            assert.strictEqual(
              draggedItem,
              item,
              'predicate first argument should be the dragged item'
            );
            assert.strictEqual(
              utils.isDraggerEvent(ev),
              true,
              'predicate second argument should be a Dragger event'
            );
            isChecked = true;
          }
          return true;
        },
      });
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      utils.dragElement({
        element: item.element,
        x: 0,
        y: 70,
        onFinished: teardown,
      });
    }
  );

  QUnit.test('dragStartPredicate: returning true should resolve the predicate', function (assert) {
    assert.expect(4);

    var done = assert.async();
    var container = utils.createGridElements();
    var counter = 0;
    var grid = new Muuri.Grid(container, {
      dragEnabled: true,
      dragStartPredicate: function () {
        ++counter;
        return true;
      },
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    function onDragStart() {
      grid.off('dragStart', onDragStart);
      assert.strictEqual(
        true,
        true,
        'a resolved predicate should start the dragging procedure and trigger dragStart event'
      );
    }

    function onDragMove() {
      grid.off('dragMove', onDragMove);
      assert.strictEqual(
        true,
        true,
        'a resolved predicate should start the dragging procedure and trigger dragMove event'
      );
    }

    function onDragEnd() {
      grid.off('dragEnd', onDragEnd);
      assert.strictEqual(
        true,
        true,
        'a resolved predicate should start the dragging procedure and trigger dragEnd event'
      );
    }

    function onDragReleaseStart() {
      grid.off('dragReleaseStart', onDragReleaseStart);
      assert.strictEqual(counter, 2, 'predicate should be called twice');
    }

    grid
      .on('dragStart', onDragStart)
      .on('dragMove', onDragMove)
      .on('dragEnd', onDragEnd)
      .on('dragReleaseStart', onDragReleaseStart);

    utils.dragElement({
      element: item.element,
      x: 0,
      y: 70,
      onFinished: teardown,
    });
  });

  QUnit.test('dragStartPredicate: returning false should reject the predicate', function (assert) {
    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements();
    var counter = 0;
    var grid = new Muuri.Grid(container, {
      dragEnabled: true,
      dragStartPredicate: function () {
        ++counter;
        return false;
      },
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid
      .on('dragStart', function () {
        assert.strictEqual(
          true,
          false,
          'a rejected predicate should not start the dragging procedure'
        );
      })
      .on('dragMove', function () {
        assert.strictEqual(
          true,
          false,
          'a rejected predicate should not start the dragging procedure'
        );
      });

    utils.dragElement({
      element: item.element,
      x: 0,
      y: 70,
      onFinished: function () {
        assert.strictEqual(counter, 1, 'predicate should be called once');
        teardown();
      },
    });
  });

  QUnit.test(
    'dragStartPredicate: returning nothing (undefined) should keep calling the predicate and not start the drag procedure',
    function (assert) {
      assert.expect(1);

      var done = assert.async();
      var container = utils.createGridElements();
      var counter = 0;
      var grid = new Muuri.Grid(container, {
        dragEnabled: true,
        dragStartPredicate: function () {
          ++counter;
        },
      });
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      grid
        .on('dragStart', function () {
          assert.strictEqual(
            true,
            false,
            'a rejected predicate should not start the dragging procedure'
          );
        })
        .on('dragMove', function () {
          assert.strictEqual(
            true,
            false,
            'a rejected predicate should not start the dragging procedure'
          );
        });

      utils.dragElement({
        element: item.element,
        x: 0,
        y: 70,
        onFinished: function () {
          assert.strictEqual(counter > 2, true, 'predicate should be called more than twice');
          teardown();
        },
      });
    }
  );

  QUnit.test(
    'dragStartPredicate: delay - drag should start after a delay if delay is defined',
    function (assert) {
      assert.expect(3);

      var done = assert.async();
      var container = utils.createGridElements();
      var grid = new Muuri.Grid(container, {
        dragEnabled: true,
        dragStartPredicate: {
          delay: 100,
        },
      });
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      grid
        .on('dragStart', function () {
          assert.ok(
            true,
            'dragStart event should be emitted after the delay even if there was no movement'
          );
        })
        .on('dragMove', function () {
          assert.ok(false, 'dragMove event should not be emitted if there was no movement');
        })
        .on('dragEnd', function () {
          assert.ok(true, 'dragEnd event should be emitted even if there was no movement');
        });

      window.setTimeout(function () {
        assert.strictEqual(
          item.isDragging(),
          false,
          'the item should not be in dragged state before the delay is finished'
        );
      }, 90);

      utils.dragElement({
        element: item.element,
        x: 0,
        y: 0,
        onFinished: teardown,
      });
    }
  );

  QUnit.test(
    'dragStartPredicate: distance - drag should start after a distance if distance is defined',
    function (assert) {
      assert.expect(1);

      var done = assert.async();
      var container = utils.createGridElements();
      var grid = new Muuri.Grid(container, {
        dragEnabled: true,
        dragStartPredicate: {
          distance: 10,
        },
      });
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
        done();
      };

      grid.on('dragStart', function (item, e) {
        assert.ok(
          e.distance >= 10,
          'dragStart event should be emitted after the specified distance is dragged'
        );
      });

      utils.dragElement({
        element: item.element,
        x: 15,
        y: 15,
        onFinished: teardown,
      });
    }
  );
})(this);
