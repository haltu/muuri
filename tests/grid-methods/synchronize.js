(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('synchronize: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.synchronize(), grid);
    teardown();

  });

  QUnit.test('synchronize: should order the dom elements to match the order of items', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements();
    var grid = new Muuri(container);
    var elements = [];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.move(0, -1, {layout: false});
    elements = grid.getItems().map(function (item) {
      return item.getElement();
    });
    assert.notDeepEqual([].slice.call(container.children), elements, 'elements should be out of sync after an item is moved');
    grid.synchronize();
    assert.deepEqual([].slice.call(container.children), elements, 'elements should be in sync after grid.synchronize() is called');
    teardown();

  });

})(this);