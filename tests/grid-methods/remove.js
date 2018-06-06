(function (window) {

  var Muuri = window.Muuri;
  var idList = utils.idList;

  QUnit.module('Grid methods');

  QUnit.test('remove: should return the removed items', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var removedItems = grid.getItems([0, 1]);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(grid.remove(removedItems), removedItems);
    teardown();

  });

  QUnit.test('remove: should accept an item, element or an index (or an array of them) as the first argument', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.remove(grid.getItems()[0]);
    assert.strictEqual(grid.getItems().length, 9, 'should accept an item as the first argument');

    grid.remove(grid.getItems()[0].getElement());
    assert.strictEqual(grid.getItems().length, 8, 'should accept an element as the first argument');

    grid.remove(0);
    assert.strictEqual(grid.getItems().length, 7, 'should accept an index as the first argument');

    grid.remove([0, 1, grid.getItems()[2], grid.getItems()[3].getElement()]);
    assert.strictEqual(grid.getItems().length, 3, 'should accept an array of items, elements and indices as the first argument');

    teardown();

  });

  QUnit.test('remove: should not remove the item elements by default', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.remove([0, 1]);
    assert.strictEqual(container.children.length, 10);
    teardown();

  });

  QUnit.test('remove: should remove the item elements when removeElements option is set to true', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.remove([0, 1], {removeElements: true});
    assert.strictEqual(container.children.length, 8);
    teardown();

  });

  QUnit.test('remove: should automatically layout the grid after remove', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('layoutStart', function () {
      assert.strictEqual(true, true);
      teardown();
    });
    grid.remove(0);

  });

  QUnit.test('remove: should not trigger layout after remove when layout option is set to false', function (assert) {

    assert.expect(0);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('layoutStart', function () {
      assert.strictEqual(true, false);
    });
    grid.remove(0, {layout: false});
    teardown();

  });

  QUnit.test('remove: should trigger unanimated layout after add when layout option is set to "instant"', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.on('layoutEnd', function () {
      assert.strictEqual(true, true);
      teardown();
    });
    grid.remove(0, {layout: 'instant'});

  });

  QUnit.test('remove: should trigger layout and call callback function after add when a callback function is provided to the layout option', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };
    var args;

    grid.on('layoutEnd', function (items) {
      assert.notStrictEqual(args, items, 'layout callback items argument should not the same object as the layoutEnd event callback`s argument');
      assert.deepEqual(idList(args), idList(items), 'layout callback should receive the same items as the layoutEnd event callback');
      teardown();
    });

    grid.remove(0, {layout: function (isInterrupted, items) {
      args = items;
    }});

  });

})(this);