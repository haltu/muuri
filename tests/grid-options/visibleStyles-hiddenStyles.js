(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('visibleStyles/hiddenStyles: should change the visible/hidden state styles of items', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGrid();
    var grid = new Muuri(container, {
      visibleStyles: {
        fontSize: '30px'
      },
      hiddenStyles: {
        fontSize: '10px'
      }
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    grid.hide(item, {onFinish: function () {
      assert.strictEqual(item._child.style.fontSize, '10px', 'item has correct hidden styles');
      grid.show(item, {onFinish: function () {
        assert.strictEqual(item._child.style.fontSize, '30px', 'item has correct visible styles');
        teardown();
      }});
    }})

  });

})(this);