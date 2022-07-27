(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid options');

  QUnit.test('items: should fetch all container`s child elements by default', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var grid = new Muuri.Grid(container);
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(
      grid.getItems().map(function (item) {
        return item.element;
      }),
      [].slice.call(container.children)
    );
    teardown();
  });

  QUnit.test(
    'items: should fetch all container`s child elements that match the provided selector',
    function (assert) {
      assert.expect(1);

      var container = utils.createGridElements();
      var children = [].slice.call(container.children);
      var targets = [0, 1, 2].map(function (i) {
        children[i].classList.add('foo');
        return children[i];
      });
      container.classList.add('foo');
      var grid = new Muuri.Grid(container, {
        items: '.foo',
      });
      var teardown = function () {
        grid.destroy();
        container.parentNode.removeChild(container);
      };

      assert.deepEqual(
        grid.getItems().map(function (item) {
          return item.element;
        }),
        targets
      );
      teardown();
    }
  );

  QUnit.test('items: should accept a node list', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var children = [].slice.call(container.children);
    var targets = [0, 1, 2].map(function (i) {
      children[i].classList.add('foo');
      return children[i];
    });
    var grid = new Muuri.Grid(container, {
      items: document.querySelectorAll('.foo'),
    });
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(
      grid.getItems().map(function (item) {
        return item.element;
      }),
      targets
    );
    teardown();
  });

  QUnit.test('items: should accept an array of elements', function (assert) {
    assert.expect(1);

    var container = utils.createGridElements();
    var children = [].slice.call(container.children);
    var targets = [0, 1, 2].map(function (i) {
      return children[i];
    });
    var grid = new Muuri.Grid(container, {
      items: targets,
    });
    var teardown = function () {
      grid.destroy();
      container.parentNode.removeChild(container);
    };

    assert.deepEqual(
      grid.getItems().map(function (item) {
        return item.element;
      }),
      targets
    );
    teardown();
  });
})(this);
