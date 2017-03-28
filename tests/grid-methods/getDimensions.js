(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods');

  QUnit.test('getDimensions: Muuri instance should return the container element`s cached dimensions', function (assert) {

    assert.expect(1);

    var container = utils.createGridElements({containerStyles: {
      position: 'relative',
      display: 'block',
      padding: '7px',
      border: '5px solid #000'
    }}).container;
    var grid = new Muuri(container);
    var expected = {
      width: Math.round(container.getBoundingClientRect().width),
      height: Math.round(container.getBoundingClientRect().height),
      padding: {
        left: 7,
        right: 7,
        top: 7,
        bottom: 7
      },
      border: {
        left: 5,
        right: 5,
        top: 5,
        bottom: 5
      }
    };
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    utils.setStyles(container, {
      padding: '0px',
      border: '0px',
      width: '0px',
      height: '0px'
    });

    assert.deepEqual(grid.getDimensions(), expected);
    teardown();

  });

})(this);