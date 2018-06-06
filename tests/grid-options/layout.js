(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('layout: vertical - left/top', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {width: '140px'});
    utils.setStyles(children[0], {width: '70px'});
    utils.setStyles(children[3], {width: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: false,
        fillGaps: false,
        alignRight: false,
        alignBottom: false
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 0, top: 0});
    assert.deepEqual(items[1].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 0, top: 140});

    teardown();

  });

  QUnit.test('layout: vertical - left/top - fill gaps', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {width: '140px'});
    utils.setStyles(children[0], {width: '70px'});
    utils.setStyles(children[3], {width: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: false,
        fillGaps: true,
        alignRight: false,
        alignBottom: false
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 0, top: 0});
    assert.deepEqual(items[1].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 90, top: 0});

    teardown();

  });

  QUnit.test('layout: vertical - right/top', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {width: '140px'});
    utils.setStyles(children[0], {width: '70px'});
    utils.setStyles(children[3], {width: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: false,
        fillGaps: false,
        alignRight: true,
        alignBottom: false
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 50, top: 0});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 90, top: 140});

    teardown();

  });

  QUnit.test('layout: vertical - right/top - fill gaps', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {width: '140px'});
    utils.setStyles(children[0], {width: '70px'});
    utils.setStyles(children[3], {width: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: false,
        fillGaps: true,
        alignRight: true,
        alignBottom: false
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 50, top: 0});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 0, top: 0});

    teardown();

  });

  QUnit.test('layout: vertical - left/bottom', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {width: '140px'});
    utils.setStyles(children[0], {width: '70px'});
    utils.setStyles(children[3], {width: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: false,
        fillGaps: false,
        alignRight: false,
        alignBottom: true
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 0, top: 140});
    assert.deepEqual(items[1].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 0, top: 0});

    teardown();

  });

  QUnit.test('layout: vertical - left/bottom - fill gaps', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {width: '140px'});
    utils.setStyles(children[0], {width: '70px'});
    utils.setStyles(children[3], {width: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: false,
        fillGaps: true,
        alignRight: false,
        alignBottom: true
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[1].getPosition(), {left: 0, top: 0});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[3].getPosition(), {left: 90, top: 70});

    teardown();

  });

  QUnit.test('layout: vertical - right/bottom', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {width: '140px'});
    utils.setStyles(children[0], {width: '70px'});
    utils.setStyles(children[3], {width: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: false,
        fillGaps: false,
        alignRight: true,
        alignBottom: true
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 50, top: 140});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 90, top: 0});

    teardown();

  });

  QUnit.test('layout: vertical - right/bottom - fill gaps', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {width: '140px'});
    utils.setStyles(children[0], {width: '70px'});
    utils.setStyles(children[3], {width: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: false,
        fillGaps: true,
        alignRight: true,
        alignBottom: true
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 50, top: 70});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[2].getPosition(), {left: 0, top: 0});
    assert.deepEqual(items[3].getPosition(), {left: 0, top: 70});

    teardown();

  });

  QUnit.test('layout: horizontal - left/top', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {height: '140px'});
    utils.setStyles(children[0], {height: '70px'});
    utils.setStyles(children[3], {height: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: true,
        fillGaps: false,
        alignRight: false,
        alignBottom: false
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 0, top: 0});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 140, top: 0});

    teardown();

  });

  QUnit.test('layout: horizontal - left/top - fill gaps', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {height: '140px'});
    utils.setStyles(children[0], {height: '70px'});
    utils.setStyles(children[3], {height: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: true,
        fillGaps: true,
        alignRight: false,
        alignBottom: false
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 0, top: 0});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 0, top: 90});

    teardown();

  });

  QUnit.test('layout: horizontal - right/top', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {height: '140px'});
    utils.setStyles(children[0], {height: '70px'});
    utils.setStyles(children[3], {height: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: true,
        fillGaps: false,
        alignRight: true,
        alignBottom: false
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 140, top: 0});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 0, top: 0});

    teardown();

  });

  QUnit.test('layout: horizontal - right/top - fill gaps', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {height: '140px'});
    utils.setStyles(children[0], {height: '70px'});
    utils.setStyles(children[3], {height: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: true,
        fillGaps: true,
        alignRight: true,
        alignBottom: false
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[1].getPosition(), {left: 0, top: 0});
    assert.deepEqual(items[2].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[3].getPosition(), {left: 70, top: 90});

    teardown();

  });

  QUnit.test('layout: horizontal - left/bottom', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {height: '140px'});
    utils.setStyles(children[0], {height: '70px'});
    utils.setStyles(children[3], {height: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: true,
        fillGaps: false,
        alignRight: false,
        alignBottom: true
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 0, top: 50});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[3].getPosition(), {left: 140, top: 90});

    teardown();

  });

  QUnit.test('layout: horizontal - left/bottom - fill gaps', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {height: '140px'});
    utils.setStyles(children[0], {height: '70px'});
    utils.setStyles(children[3], {height: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: true,
        fillGaps: true,
        alignRight: false,
        alignBottom: true
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 0, top: 50});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[3].getPosition(), {left: 0, top: 0});

    teardown();

  });

  QUnit.test('layout: horizontal - right/bottom', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {height: '140px'});
    utils.setStyles(children[0], {height: '70px'});
    utils.setStyles(children[3], {height: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: true,
        fillGaps: false,
        alignRight: true,
        alignBottom: true
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 140, top: 50});
    assert.deepEqual(items[1].getPosition(), {left: 70, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 70, top: 0});
    assert.deepEqual(items[3].getPosition(), {left: 0, top: 90});

    teardown();

  });

  QUnit.test('layout: horizontal - right/bottom - fill gaps', function (assert) {

    assert.expect(4);

    var container = utils.createGridElements({itemCount: 4});
    var children = [].slice.call(container.children);

    utils.setStyles(container, {height: '140px'});
    utils.setStyles(children[0], {height: '70px'});
    utils.setStyles(children[3], {height: '30px'});

    var grid = new Muuri(container, {
      layout: {
        horizontal: true,
        fillGaps: true,
        alignRight: true,
        alignBottom: true
      }
    });
    var items = grid.getItems();
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(items[0].getPosition(), {left: 70, top: 50});
    assert.deepEqual(items[1].getPosition(), {left: 0, top: 70});
    assert.deepEqual(items[2].getPosition(), {left: 0, top: 0});
    assert.deepEqual(items[3].getPosition(), {left: 70, top: 0});

    teardown();

  });

  QUnit.test('layout: percentage widths with no rounding', function (assert) {

    assert.expect(33);

    for (var i = 1; i < 34; i++) {
      var container = utils.createGridElements({
        itemCount: i,
        itemStyles: {
          position: 'absolute',
          width: (100 / i) + '%',
          height: '50px',
          background: '#000',
          border: '1px solid #ff0000',
          boxSizing: 'border-box'
        }
      });
      var grid = new Muuri(container, {layout: {rounding: false}});
      var hasIncorrectPosition = grid.getItems().some(function (item) {
        return item.getPosition().top !== 0;
      });
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
      };
      assert.strictEqual(hasIncorrectPosition, false, i);
      teardown();
    }
  });

})(this);