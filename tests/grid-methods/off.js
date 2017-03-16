(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - off');

  QUnit.test('Muuri instance should have an off method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.off, 'function');
  });

})(this);