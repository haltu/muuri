(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid events');

  QUnit.test('draggerEvent interface', function (assert) {

    assert.expect(35);

    var done = assert.async();
    var container = utils.createGridElements();
    var grid = new Muuri(container, {dragEnabled: true});
    var item = grid.getItems()[0];
    var evStart, evMove1, evMove2, evEnd;
    var startClientX, startClientY;
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };

    function assertDraggerEvent(draggerEvent) {
      var srcEvent = draggerEvent.srcEvent;
      var srcInterface;
      if (srcEvent.changedTouches) {
        for (var i = 0; i < srcEvent.changedTouches.length; i++) {
          if (srcEvent.changedTouches[i].identifier === draggerEvent.identifier) {
            srcInterface = srcEvent.changedTouches[i];
            break;
          }
        }
      } else {
        srcInterface = srcEvent;
      }

      if (!srcInterface) {
        assert.strictEqual(true, false, 'No matching touch/event interface found from source event');
      }

      var dX = srcInterface.clientX - startClientX;
      var dY = srcInterface.clientY - startClientY;
      var dist = Math.sqrt(dX * dX + dY * dY);

      assert.strictEqual(draggerEvent.screenX, srcInterface.screenX, 'dragger event screenX');
      assert.strictEqual(draggerEvent.screenY, srcInterface.screenY, 'dragger event screenY');
      assert.strictEqual(draggerEvent.pageX, srcInterface.pageX, 'dragger event pageX');
      assert.strictEqual(draggerEvent.pageY, srcInterface.pageY, 'dragger event pageY');
      assert.strictEqual(draggerEvent.clientX, srcInterface.clientX, 'dragger event clientX');
      assert.strictEqual(draggerEvent.clientY, srcInterface.clientY, 'dragger event clientY');
      assert.strictEqual(draggerEvent.target, srcInterface.target, 'dragger event target');
      assert.strictEqual(draggerEvent.deltaX, dX, 'dragger event deltaX');
      assert.strictEqual(draggerEvent.deltaY, dY, 'dragger event deltaY');
      assert.strictEqual(draggerEvent.distance, dist, 'dragger event distance');
      if (draggerEvent.type === 'start') {
        assert.strictEqual(draggerEvent.deltaTime, 0, 'dragger event deltaTime');
      } else {
        assert.strictEqual(draggerEvent.deltaTime > 0, true, 'dragger event deltaTime');
      }
    }

    grid.on('dragStart', function (item, ev) {
      startClientX = ev.clientX;
      startClientY = ev.clientY;
      evStart = ev;
      assertDraggerEvent(ev);
    });

    grid.on('dragMove', function (item, ev) {
      if (!evMove1) {
        evMove1 = ev;
        assertDraggerEvent(ev);
      } else if (!evMove2) {
        evMove2 = ev;
      }
    });

    grid.on('dragEnd', function (item, ev) {
      evEnd = ev;
      assertDraggerEvent(ev);
    });

    grid.on('dragReleaseEnd', function () {
      var hasUniqueEvents = evStart !== evMove1 &&
                            evStart !== evMove2 &&
                            evStart !== evEnd &&
                            evMove1 !== evMove2 &&
                            evMove1 !== evEnd &&
                            evMove2 !== evEnd;

      assert.strictEqual(hasUniqueEvents, true, 'event objects should not be pooled');

      var hasSameId = evStart.identifier === evMove1.identifier &&
                      evStart.identifier === evMove2.identifier &&
                      evStart.identifier === evEnd.identifier;

      assert.strictEqual(hasSameId, true, 'identifier should be same for all events');

      teardown();
    });

    utils.dragElement(item.getElement(), 100, 100);

  });

})(this);