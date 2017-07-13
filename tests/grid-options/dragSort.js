(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragSort: should be enabled by default', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGrid({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('move', function () {
      assert.strictEqual(true, true);
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 0,
        top: 70
      }
    });

  });

  QUnit.test('dragSort: should be disabled if false is provided', function (assert) {

    assert.expect(1);

    var done = assert.async();
    var container = utils.createGrid({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragSort: false
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.on('move', function () {
      assert.strictEqual(true, false);
    });

    grid.on('dragEnd', function () {
      assert.strictEqual(true, true);
      teardown();
    });

    utils.dragElement({
      element: item.getElement(),
      move: {
        left: 0,
        top: 70
      }
    });

  });

})(this);