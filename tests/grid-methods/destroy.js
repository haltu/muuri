(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - destroy');

  QUnit.test('Muuri instance should have a destroy method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.destroy, 'function');
  });

})(this);