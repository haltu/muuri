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
    });

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

  QUnit.test('dragSort: should be disabled if false is provided', function (assert) {

    assert.expect(0);

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
      assert.strictEqual(true, false, 'items should not be moved');
    });

    utils.dragElement(item.getElement(), 0, 70, teardown);

  });

})(this);