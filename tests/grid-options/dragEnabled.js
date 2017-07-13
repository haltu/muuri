(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragEnabled: drag should be disabled by default', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container);
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('dragStart', function () {
      assert.strictEqual(true, false);
    });

    window.setTimeout(function () {
      assert.strictEqual(true, true);
      teardown();
    }, 500);

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 100,
        top: 100
      }
    });

  });

  QUnit.test('dragEnabled: drag is enabled when provided true is provided', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGrid();
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
      assert.strictEqual(true, true);
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