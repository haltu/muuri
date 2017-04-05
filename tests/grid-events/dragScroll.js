(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('dragScroll: should be triggered when scroll occurs during drag process', function (assert) {

    assert.expect(4);

    var done = assert.async();
    var docElem = document.documentElement;
    var body = document.body;
    var container = utils.createGridElements().container;
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
      utils.setStyles(docElem, {height: ''});
      body.scrollTop = 0;
      done();
    };

    utils.setStyles(docElem, {height: '1000%'});

    grid.on('dragStart', function () {
      body.scrollTop = 100;
    });

    grid.on('dragScroll', function (ev, draggedItem) {
      assert.strictEqual(arguments.length, 2, 'callback: should have receive two arguments');
      assert.strictEqual(utils.isScrollEvent(ev), true, 'callback: first argument should be a scroll event object');
      assert.strictEqual(draggedItem, item, 'callback: second argument should be the dragged item');
      ++calls;
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 0,
        top: 100
      },
      onRelease: function () {
        assert.strictEqual(calls, 1, 'should be called only once');
        teardown();
      }
    });

  });

})(this);