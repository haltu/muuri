const pkg = require('./package.json');

module.exports = {
  basePath: '',
  frameworks: ['qunit'],
  plugins: ['karma-qunit', 'karma-chrome-launcher', 'karma-story-reporter'],
  files: [
    './node_modules/prosthetic-hand/dist/prosthetic-hand.js',
    './node_modules/mezr/mezr.js',
    './' + pkg.main,
    './tests/index.js',
    './tests/utils.js',
    './tests/grid-constructor/*.js',
    './tests/grid-options/*.js',
    './tests/grid-properties/*.js',
    './tests/grid-methods/*.js',
    './tests/grid-events/*.js',
    './tests/item-methods/*.js',
    './tests/item-properties/*.js',
  ],
  browsers: ['Chrome'],
  reporters: ['story'],
  logLevel: config.LOG_INFO,
  colors: true,
  autoWatch: false,
  browserDisconnectTolerance: 2,
  singleRun: true,
};
