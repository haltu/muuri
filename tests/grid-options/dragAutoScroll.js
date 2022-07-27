(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragAutoScroll: should scroll window vertically and horizontally', function (assert) {
    assert.expect(4 + 4 * 6);

    var done = assert.async();
    var container = utils.createGridElements({
      itemCount: 2,
      containerStyles: {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '140px',
      },
    });

    // Create fixed drag container.
    var dragContainer = document.createElement('div');
    dragContainer.style.position = 'fixed';
    document.body.appendChild(dragContainer);

    // Make document body large so that window can scroll.
    document.body.style.position = 'relative';
    document.body.style.height = '10000px';
    document.body.style.width = '10000px';

    // Init grid.
    var grid = new Muuri.Grid(container, {
      dragEnabled: true,
      dragSort: false,
      dragContainer: dragContainer,
      dragAutoScroll: {
        targets: [window],
        onStart: function (item, element, direction) {
          assert.ok(grid.getItems().indexOf(item) > -1, 'onStart item argument is grid item');
          assert.strictEqual(element, window, 'onStart element argument is window');
          assert.ok(
            [
              Muuri.AutoScroller.LEFT,
              Muuri.AutoScroller.RIGHT,
              Muuri.AutoScroller.UP,
              Muuri.AutoScroller.DOWN,
            ].indexOf(direction) > -1,
            'onStart direction argument is valid direction'
          );
        },
        onStop: function (item, element, direction) {
          assert.ok(grid.getItems().indexOf(item) > -1, 'onStop item argument is grid item');
          assert.strictEqual(element, window, 'onStop element argument is window');
          assert.ok(
            [
              Muuri.AutoScroller.LEFT,
              Muuri.AutoScroller.RIGHT,
              Muuri.AutoScroller.UP,
              Muuri.AutoScroller.DOWN,
            ].indexOf(direction) > -1,
            'onStop direction argument is valid direction'
          );
        },
      },
    });

    // Make sure window is not scrolled on init.
    var scrollX = 0;
    var scrollY = 0;
    window.scrollTo(scrollX, scrollY);
    assert.ok(
      window.pageXOffset === scrollX && window.pageYOffset === scrollY,
      'window should not be scrolled on init'
    );

    // Compute how much we need to drag the item and make sure that it is
    // possible to trigger auto-scroll.
    var item = grid.getItems()[0];
    var itemRect = item.element.getBoundingClientRect();
    var leftOffset = window.innerWidth - itemRect.right;
    var topOffset = window.innerHeight - itemRect.bottom;
    assert.ok(leftOffset > 0 && topOffset > 0, 'item can scroll the window');

    // Define teardown procedure.
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      dragContainer.parentNode.removeChild(dragContainer);
      document.body.style.height = '';
      document.body.style.width = '';
      document.body.style.position = '';
      window.scrollTo(0, 0);
      done();
    };

    // Drag down right.
    utils.dragElement({
      element: item.element,
      x: leftOffset,
      y: topOffset,
      holdDuration: 300,
      onFinished: function () {
        assert.ok(
          window.pageXOffset > scrollX && window.pageYOffset > scrollY,
          'window should be scrolled down and right'
        );

        // Place container to the bottom-right corner of the body and scroll
        // window to the max.
        container.style.left = 'auto';
        container.style.top = 'auto';
        container.style.right = '0px';
        container.style.bottom = '0px';
        window.scrollTo(100000, 100000);
        scrollX = window.pageXOffset;
        scrollY = window.pageYOffset;

        // Compute how much we need to drag the item to left and top so that
        // auto-scroll will be triggered.
        item = grid.getItems()[1];
        itemRect = item.element.getBoundingClientRect();
        leftOffset = -itemRect.left;
        topOffset = -itemRect.top;

        // Drag up left.
        utils.dragElement({
          element: item.element,
          x: leftOffset,
          y: topOffset,
          holdDuration: 300,
          onFinished: function () {
            assert.ok(
              window.pageXOffset < scrollX && window.pageYOffset < scrollY,
              'window should be scrolled up and left'
            );
            teardown();
          },
        });
      },
    });
  });
})(this);
