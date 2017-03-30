(function (window) {

  var Muuri = window.Muuri;
  var Simulator = window.Simulator;

  QUnit.module('Grid events');

  QUnit.test('dragSort: should be triggered when drag sorting occurs', function (assert) {

    assert.expect(9);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    }).container;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSortInterval: 100,
      dragSortPredicate: {
        threshold: 50,
        action: 'move'
      }
    });
    var item = grid.getItems()[0];
    var calls = 0;
    var isStartCalled = false;
    var isMoveCalled = false;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      isStartCalled = true;
    });

    grid.on('dragMove', function (ev, draggedItem) {
      isMoveCalled = true;
    });

    grid.on('dragSort', function (ev, data) {
      assert.strictEqual(arguments.length, 2, 'callback: should have receive two arguments');
      assert.strictEqual(utils.isHammerEvent(ev), true, 'callback: first argument should be a hammer event object');
      assert.strictEqual(Object.prototype.toString.call(data), '[object Object]', 'callback: second argument should be a plain object');
      assert.strictEqual(Object.keys(data).length, 4, 'callback: second argument should have 4 properties');
      assert.strictEqual(data.item, item, 'callback: second argument item property should be the moved item');
      assert.strictEqual(data.action, 'move', 'callback: second argument action property should be the correct action');
      assert.strictEqual(data.fromIndex, 0, 'callback: second argument fromIndex property should be the index where the item was moved from');
      assert.strictEqual(data.toIndex, 1, 'callback: second argument toIndex property should be the index where the item was moved to');
      ++calls;
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 0,
        top: 70
      },
      onRelease: function () {
        assert.strictEqual(calls, 1, 'should be called only once');
        teardown();
      }
    });

  });

})(this);