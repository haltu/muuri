(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('refreshContainer: should return the instance', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements().container;
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.strictEqual(grid.refreshContainer(), grid);
    teardown();

  });

  QUnit.test('refreshContainer: should update the container element`s cached styles/dimensions', function (assert) {

    assert.expect(2);

    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        display: 'block',
        width: '300px',
        padding: '0px',
        border: '0px solid #000',
        boxSizing: 'padding-box'
      }
    }).container;
    var grid = new Muuri(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    utils.setStyles(container, {
      width: '400px',
      height: '200px',
      padding: '2px',
      border: '1px solid #000',
      boxSizing: 'border-box'
    });

    grid.refreshContainer();
    assert.strictEqual(grid._boxSizing, 'border-box', 'box-sizing should be updated to reflect the current value in DOM');
    assert.deepEqual(grid.getDimensions(), {
      width: 400,
      height: 200,
      padding: {
        left: 2,
        right: 2,
        top: 2,
        bottom: 2
      },
      border: {
        left: 1,
        right: 1,
        top: 1,
        bottom: 1
      }
    }, 'dimensions should be updated to reflect the current values in DOM');

    teardown();

  });

})(this);