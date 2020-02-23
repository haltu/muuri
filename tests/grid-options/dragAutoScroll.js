(function(window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragAutoScroll: should scroll window vertically and horizontally', function(assert) {
    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements();

    // Create fixed drag container.
    var dragContainer = document.createElement('div');
    dragContainer.style.position = 'fixed';
    document.body.appendChild(dragContainer);
    document.body.style.height = '10000px';
    document.body.style.width = '10000px';

    // Init grid.
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragContainer: dragContainer,
      dragAutoScroll: {
        targets: [window]
      }
    });

    // Teardown procedure.
    var teardown = function() {
      assert.ok(
        window.pageYOffset > 0 && window.pageXOffset > 0,
        'window should be scrolled vertically and horizontally'
      );
      grid.destroy();
      container.parentNode.removeChild(container);
      dragContainer.parentNode.removeChild(dragContainer);
      document.body.style.height = '';
      document.body.style.width = '';
      window.scrollTo(0, 0);
      done();
    };

    // Make sure window is no scrolled on init.
    window.scrollTo(0, 0);
    assert.ok(
      window.pageYOffset === 0 && window.pageXOffset === 0,
      'window should not be scrolled on init'
    );

    var item = grid.getItems()[0];
    var itemRect = item.getElement().getBoundingClientRect();
    utils.dragElement(
      item.getElement(),
      window.innerWidth - itemRect.right,
      window.innerHeight - itemRect.bottom,
      teardown,
      {
        holdDuration: 1000
      }
    );
  });

  QUnit.test(
    'dragAutoScroll: should scroll window vertically only when y-axis is defined',
    function(assert) {
      assert.expect(2);

      var done = assert.async();
      var container = utils.createGridElements();

      // Create fixed drag container.
      var dragContainer = document.createElement('div');
      dragContainer.style.position = 'fixed';
      document.body.appendChild(dragContainer);
      document.body.style.height = '10000px';
      document.body.style.width = '10000px';

      // Init grid.
      var grid = new Muuri(container, {
        dragEnabled: true,
        dragContainer: dragContainer,
        dragAutoScroll: {
          targets: [{ element: window, axis: Muuri.AutoScroller.AXIS_Y }]
        }
      });

      // Teardown procedure.
      var teardown = function() {
        assert.ok(
          window.pageYOffset > 0 && window.pageXOffset === 0,
          'window should be scrolled vertically only'
        );
        grid.destroy();
        container.parentNode.removeChild(container);
        dragContainer.parentNode.removeChild(dragContainer);
        document.body.style.height = '';
        document.body.style.width = '';
        window.scrollTo(0, 0);
        done();
      };

      // Make sure window is no scrolled on init.
      window.scrollTo(0, 0);
      assert.ok(
        window.pageYOffset === 0 && window.pageXOffset === 0,
        'window should not be scrolled on init'
      );

      var item = grid.getItems()[0];
      var itemRect = item.getElement().getBoundingClientRect();
      utils.dragElement(
        item.getElement(),
        window.innerWidth - itemRect.right,
        window.innerHeight - itemRect.bottom,
        teardown,
        {
          holdDuration: 1000
        }
      );
    }
  );

  QUnit.test(
    'dragAutoScroll: should scroll window horizontally only when x-axis is defined',
    function(assert) {
      assert.expect(2);

      var done = assert.async();
      var container = utils.createGridElements();

      // Create fixed drag container.
      var dragContainer = document.createElement('div');
      dragContainer.style.position = 'fixed';
      document.body.appendChild(dragContainer);
      document.body.style.height = '10000px';
      document.body.style.width = '10000px';

      // Init grid.
      var grid = new Muuri(container, {
        dragEnabled: true,
        dragContainer: dragContainer,
        dragAutoScroll: {
          targets: [{ element: window, axis: Muuri.AutoScroller.AXIS_X }]
        }
      });

      // Teardown procedure.
      var teardown = function() {
        assert.ok(
          window.pageYOffset === 0 && window.pageXOffset > 0,
          'window should be scrolled vertically only'
        );
        grid.destroy();
        container.parentNode.removeChild(container);
        dragContainer.parentNode.removeChild(dragContainer);
        document.body.style.height = '';
        document.body.style.width = '';
        window.scrollTo(0, 0);
        done();
      };

      // Make sure window is no scrolled on init.
      window.scrollTo(0, 0);
      assert.ok(
        window.pageYOffset === 0 && window.pageXOffset === 0,
        'window should not be scrolled on init'
      );

      var item = grid.getItems()[0];
      var itemRect = item.getElement().getBoundingClientRect();
      utils.dragElement(
        item.getElement(),
        window.innerWidth - itemRect.right,
        window.innerHeight - itemRect.bottom,
        teardown,
        {
          holdDuration: 1000
        }
      );
    }
  );
})(this);
