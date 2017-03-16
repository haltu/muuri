(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - getElement');

  QUnit.test('Muuri instance should have a getElement method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.getElement, 'function');
  });

})(this);