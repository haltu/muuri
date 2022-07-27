(function (window) {
  var Muuri = window.Muuri;

  QUnit.module('Grid instance');

  QUnit.test('Muuri.Grid should be a global function', function (assert) {
    assert.expect(1);
    assert.strictEqual(typeof Muuri.Grid, 'function');
  });
})(this);
