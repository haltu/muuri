(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - on');

  QUnit.test('Muuri instance should have an on method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.on, 'function');
  });

})(this);