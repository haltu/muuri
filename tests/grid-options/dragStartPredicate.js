(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragStartPredicate: should receive the dragged item and current hammer event as it`s arguments', function (assert) {

    assert.expect(3);

    var done = assert.async();
    var container = utils.createGrid();
    var isChecked = false;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: function (draggedItem, ev) {
        if (!isChecked) {
          assert.strictEqual(arguments.length, 2, 'predicate should receive two aguments');
          assert.strictEqual(draggedItem, item, 'predicate first argument should be the dragged item');
          assert.strictEqual(utils.isHammerEvent(ev), true, 'predicate second argument should be a hammer event');
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

    utils.dragElement(item.getElement(), 0, 70, teardown);

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

    grid
    .once('dragStart', function () {
      assert.strictEqual(true, true, 'a resolved predicate should start the dragging procedure and trigger dragStart event');
    })
    .once('dragMove', function () {
      assert.strictEqual(true, true, 'a resolved predicate should start the dragging procedure and trigger dragMove event');
    })
    .once('dragEnd', function () {
      assert.strictEqual(true, true, 'a resolved predicate should start the dragging procedure and trigger dragEnd event');
    })
    .once('dragReleaseStart', function () {
      assert.strictEqual(counter, 2, 'predicate should be called twice');
    });

    utils.dragElement(item.getElement(), 0, 70, teardown);

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

    grid
    .on('dragStart', function () {
      assert.strictEqual(true, false, 'a rejected predicate should not start the dragging procedure');
    })
    .on('dragMove', function () {
      assert.strictEqual(true, false, 'a rejected predicate should not start the dragging procedure');
    });

    utils.dragElement(item.getElement(), 0, 70, function () {
      assert.strictEqual(counter, 2, 'predicate should be called twice');
      teardown();
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

    grid
    .on('dragStart', function () {
      assert.strictEqual(true, false, 'a rejected predicate should not start the dragging procedure');
    })
    .on('dragMove', function () {
      assert.strictEqual(true, false, 'a rejected predicate should not start the dragging procedure');
    });

    utils.dragElement(item.getElement(), 0, 70, function () {
      assert.strictEqual(counter > 2, true, 'predicate should be called more than twice');
      teardown();
    });

  });

  QUnit.test('dragStartPredicate: delay - drag should start after a delay if delay is defined', function (assert) {

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

    grid
    .on('dragStart', function () {
      assert.ok(true, 'dragStart event should be emitted after the delay even if there was no movement');
    })
    .on('dragMove', function () {
      assert.ok(false, 'dragMove event should not be emitted if there was no movement');
    })
    .on('dragEnd', function () {
      assert.ok(true, 'dragEnd event should be emitted even if there was no movement');
    });

    window.setTimeout(function () {
      assert.strictEqual(item.isDragging(), false, 'the item should not be in dragged state before the delay is finished');
    }, 90);

    utils.dragElement(item.getElement(), 0, 0, teardown);

  });

  QUnit.test('dragStartPredicate: distance - drag should start after a distance if distance is defined', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: {
        distance: 10
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function (item, e) {
      assert.ok(e.distance >= 10, 'dragStart event should be emitted after the specified distance is dragged');
    });

    utils.dragElement(item.getElement(), 15, 15, teardown);

  });

  QUnit.test('dragStartPredicate: handle - if a handle is specified the drag should start when the handle is dragged', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: {
        handle: '.handle'
      }
    });
    var item = grid.getItems()[0];
    var handle = document.createElement('div');
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    item.getElement().appendChild(handle);
    handle.classList.add('handle');
    utils.setStyles(handle, {
      position: 'absolute',
      width: '30px',
      height: '30px',
      left: '-30px',
      top: '-30px'
    });

    grid.on('dragStart', function (item, e) {
      assert.ok(true);
    });

    utils.dragElement(item.getElement(), 15, 15, function () {
      utils.dragElement(handle, 15, 15, teardown);
    });

  });

  QUnit.test('dragStartPredicate: handle - drag should not start if the drag pointer is outside the handle when dragging should start', function (assert) {

    assert.expect(0);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragStartPredicate: {
        distance: 500
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function (item, e) {
      assert.ok(false);
    });

    utils.dragElement(item.getElement(), 600, 600, teardown);

  });

})(this);