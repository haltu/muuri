(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('dragAxis: should allow dragging items on x and y axis by default', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({
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
    var left = parseInt(item.getElement().getBoundingClientRect().left);
    var top = parseInt(item.getElement().getBoundingClientRect().top);

    grid.on('dragEnd', function () {
      var newLeft = parseInt(item.getElement().getBoundingClientRect().left);
      var newTop = parseInt(item.getElement().getBoundingClientRect().top);
      assert.strictEqual(newLeft, left + 70, 'left');
      assert.strictEqual(newTop, top + 70, 'top');
    });

    utils.dragElement(item.getElement(), 70, 70, teardown);

  });

  QUnit.test('dragAxis: when set to "xy" items should be only moved on x-axis and y-axis', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragAxis: 'xy'
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };
    var left = parseInt(item.getElement().getBoundingClientRect().left);
    var top = parseInt(item.getElement().getBoundingClientRect().top);

    grid.on('dragEnd', function () {
      var newLeft = parseInt(item.getElement().getBoundingClientRect().left);
      var newTop = parseInt(item.getElement().getBoundingClientRect().top);
      assert.strictEqual(newLeft, left + 70, 'left');
      assert.strictEqual(newTop, top + 70, 'top');
    });

    utils.dragElement(item.getElement(), 70, 70, teardown);

  });

  QUnit.test('dragAxis: when set to "x" items should be only moved on x-axis', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragAxis: 'x'
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };
    var left = parseInt(item.getElement().getBoundingClientRect().left);
    var top = parseInt(item.getElement().getBoundingClientRect().top);

    grid.on('dragEnd', function () {
      var newLeft = parseInt(item.getElement().getBoundingClientRect().left);
      var newTop = parseInt(item.getElement().getBoundingClientRect().top);
      assert.strictEqual(newLeft, left + 70, 'left');
      assert.strictEqual(newTop, top, 'top');
    });

    utils.dragElement(item.getElement(), 70, 70, teardown);

  });

  QUnit.test('dragAxis: when set to "y" items should be only moved on y-axis', function (assert) {

    assert.expect(2);

    var done = assert.async();
    var container = utils.createGridElements({
      containerStyles: {
        position: 'relative',
        width: '70px'
      }
    });
    var grid = new Muuri(container, {
      dragEnabled: true,
      dragAxis: 'y'
    });
    var item = grid.getItems()[0];
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
      done();
    };
    var left = parseInt(item.getElement().getBoundingClientRect().left);
    var top = parseInt(item.getElement().getBoundingClientRect().top);

    grid.on('dragEnd', function () {
      var newLeft = parseInt(item.getElement().getBoundingClientRect().left);
      var newTop = parseInt(item.getElement().getBoundingClientRect().top);
      assert.strictEqual(newLeft, left, 'left');
      assert.strictEqual(newTop, top + 70, 'top');
    });

    utils.dragElement(item.getElement(), 70, 70, teardown);

  });

})(this);