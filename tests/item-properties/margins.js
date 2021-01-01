(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Item properties');

  QUnit.test(
    'item.marginLeft, item.marginRight, item.marginTop and item.marginBottom: should equal the instance element`s cached margins',
    function (assert) {
      assert.expect(2);

      var container = utils.createGridElements();
      var grid = new Muuri(container);
      var item = grid.getItems()[0];
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
      };

      assert.deepEqual(
        {
          left: item.marginLeft,
          right: item.marginRight,
          top: item.marginTop,
          bottom: item.marginBottom,
        },
        { left: 10, right: 10, top: 10, bottom: 10 },
        'The margins should be retrieved from the DOM on init'
      );
      item.element.style.margin = '0px';
      assert.deepEqual(
        {
          left: item.marginLeft,
          right: item.marginRight,
          top: item.marginTop,
          bottom: item.marginBottom,
        },
        { left: 10, right: 10, top: 10, bottom: 10 },
        'The returned margins are cached and not necessarilly the element`s current margins in DOM'
      );
      teardown();
    }
  );
})(this);
