(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - getDimensions');

  QUnit.test('Muuri instance should have a getDimensions method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.getDimensions, 'function');
  });

})(this);