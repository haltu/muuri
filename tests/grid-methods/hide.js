(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - hide');

  QUnit.test('Muuri instance should have a hide method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.hide, 'function');
  });

})(this);