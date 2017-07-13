(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragStartPredicate: should receive the dragged item and current hammer event as it`s arguments', function (assert) {

    assert.expect(4);

    var done = assert.async();
    var container = utils.createGrid();
    var isChecked = false;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: function (draggedItem, ev, resolve) {
        if (!isChecked) {
          assert.strictEqual(arguments.length, 3, 'predicate should receive three aguments');
          assert.strictEqual(draggedItem, item, 'predicate first argument should be the dragged item');
          assert.strictEqual(utils.isHammerEvent(ev), true, 'predicate second argument should be a hammer event');
          assert.strictEqual(typeof resolve, 'function', 'predicate third argument should be a resolve function');
          isChecked = true;
        }
        return true;
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70}
    });

  });

  QUnit.test('dragStartPredicate: returning true should resolve the predicate', function (assert) {

    assert.expect(4);

    var done = assert.async();
    var container = utils.createGrid();
    var counter = 0;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: function () {
        ++counter;
        return true;
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.once('dragStart', function () {
      assert.strictEqual(true, true, 'a resolved predicate should start the dragging procedure and trigger dragStart event');
    });

    grid.once('dragMove', function () {
      assert.strictEqual(true, true, 'a resolved predicate should start the dragging procedure and trigger dragMove event');
    });

    grid.once('dragEnd', function () {
      assert.strictEqual(true, true, 'a resolved predicate should start the dragging procedure and trigger dragEnd event');
    });

    grid.once('dragReleaseStart', function () {
      assert.strictEqual(counter, 2, 'predicate should be called twice');
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70}
    });

  });

  QUnit.test('dragStartPredicate: returning false should reject the predicate', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGrid();
    var counter = 0;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: function () {
        ++counter;
        return false;
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      assert.strictEqual(true, false, 'a rejected predicate should not start the dragging procedure');
    });

    grid.on('dragMove', function () {
      assert.strictEqual(true, false, 'a rejected predicate should not start the dragging procedure');
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70},
      onRelease: function () {
        window.setTimeout(function () {
          assert.strictEqual(counter, 2, 'predicate should be called twice');
          teardown();
        }, 300);
      }
    });

  });

  QUnit.test('dragStartPredicate: returning nothing (undefined) should keep calling the predicate and not start the drag procedure', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGrid();
    var counter = 0;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: function () {
        ++counter;
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      assert.strictEqual(true, false, 'a rejected predicate should not start the dragging procedure');
    });

    grid.on('dragMove', function () {
      assert.strictEqual(true, false, 'a rejected predicate should not start the dragging procedure');
    });

    utils.dragElement({
      element: item.getElement(),
      move: {left: 0, top: 70},
      onRelease: function () {
        window.setTimeout(function () {
          assert.strictEqual(counter > 2, true, 'predicate should be called more than twice');
          teardown();
        }, 300);
      }
    });

  });

  QUnit.test('dragStartPredicate: drag should start after a delay if delay is defined', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: {
        delay: 100
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    utils.pressElement(item.getElement(), 200, teardown);

    window.setTimeout(function () {
      assert.strictEqual(item.isDragging(), false, 'the item should not be in dragged state right before the delay is finished');
    }, 50);

    window.setTimeout(function () {
      assert.strictEqual(item.isDragging(), true, 'the item should be in dragged state after the delay');
    }, 150);

    grid.on('dragStart', function () {
      assert.ok(true, 'dragStart event should be emitted after the delay even if there was no movement');
    });

  });

  // TODO:
  // - Test handle and distance.
  // - Test using a custom predicate that uses the default predicate.
  // - Test that drag will not start if the pointer is dragged outside handle.

})(this);