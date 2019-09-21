(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('layoutStart: should be triggered after grid.layout() (before the items are positioned)', function (assert) {

    assert.expect(6);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var layoutId = grid._layout.id;
    var numEvents = 0;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    utils.setStyles(container, {height: ''});
    grid.on('layoutStart', function (items, isInstant) {
      ++numEvents;
      if (numEvents === 1) {
        assert.strictEqual(arguments.length, 2, 'should have two arguments');
        assert.deepEqual(utils.sortedIdList(items), utils.sortedIdList(utils.getActiveItems(grid)), 'first argument should be an array of the items that are about to be laid out');
        assert.strictEqual(isInstant, false, 'second argument should be false when layout was not called with instant flag');
        assert.notStrictEqual(grid._layout.id, layoutId, 'should be called after layout is created');
        assert.notStrictEqual(container.style.height, '', 'should be called after container dimensions are updated');
      } else if (numEvents === 2) {
        assert.strictEqual(isInstant, true, 'second argument should be true when layout was called with instant flag');
      } else {
        assert.strictEqual(true, false, 'there should be one event per layout call, even if ongoing layout is aborted');
      }
    });
    grid.move(0, -1);
    grid.layout(true);
    teardown();

  });

})(this);