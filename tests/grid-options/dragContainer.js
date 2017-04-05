(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragContainer: should be the grid container by default', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements().container;
    var grid = new Muuri(container, {
      dragEnabled: true
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      assert.strictEqual(item.getElement().parentNode, container);
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 100,
        top: 100
      }
    });

  });

  QUnit.test('dragContainer: should define the element the dragged item is appended to during drag', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGridElements().container;
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragContainer: document.body
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      assert.strictEqual(item.getElement().parentNode, document.body);
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 100,
        top: 100
      }
    });

  });

})(this);