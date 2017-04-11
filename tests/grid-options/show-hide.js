(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('show: should disable show animation when duration is 0', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container, {
      show: {duration: 0}
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(item, {instant: true}).show(item);
    assert.strictEqual(item.isVisible(), true, 'item should be visible');
    assert.strictEqual(item.isShowing(), false, 'item should not be showing');
    teardown();

  });

  QUnit.test('hide: should disable hide animation when duration is 0', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container, {
      hide: {duration: 0}
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    grid.hide(item);
    assert.strictEqual(item.isVisible(), false, 'item should be hidden');
    assert.strictEqual(item.isHiding(), false, 'item should not be hiding');
    teardown();

  });

  QUnit.test('show/hide: should allow changing the animatable properties', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements().container;
    var grid = new Muuri(container, {
      show: {styles: {
        fontSize: '30px'
      }},
      hide: {styles: {
        fontSize: '10px'
      }}
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