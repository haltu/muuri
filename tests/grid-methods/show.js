(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid methods - show');

  QUnit.test('Muuri instance should have a show method', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.prototype.show, 'function');
  });

})(this);