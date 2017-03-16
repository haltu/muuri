(function (window) {

  var Muuri = window.Muuri;

  QUnit.module('Grid instance');

  QUnit.test('Muuri should be a global function', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri, 'function');
  });

})(this);