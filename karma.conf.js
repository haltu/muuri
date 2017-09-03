module.exports = function (config) {
  var pkg = require('./package.json');
  config.set({
    basePath: '',
    frameworks: ['qunit'],
    plugins: [
      'karma-qunit',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-safari-launcher',
      'karma-edge-launcher',
      'karma-sauce-launcher',
      'karma-story-reporter'
    ],
    files: [
      './node_modules/hammerjs/hammer.js',
      './node_modules/web-animations-js/web-animations.min.js',
      './node_modules/prosthetic-hand/dist/prosthetic-hand.js',
      './node_modules/mezr/mezr.js',
      './' + pkg.main,
      './tests/index.js',
      './tests/utils.js',
      './tests/grid-constructor/*.js',
      './tests/grid-options/*.js',
      './tests/grid-methods/*.js',
      './tests/grid-events/*.js',
      './tests/item-methods/*.js'
    ],
    reporters: [
      'story',
      'saucelabs'
    ],
    logLevel: config.LOG_INFO,
    colors: true,
    autoWatch: false,
    captureTimeout: 240000,
    browserDisconnectTimeout: 60000,
    browserNoActivityTimeout: 60000,
    browserDisconnectTolerance: 10,
    concurrency: 1,
    singleRun: true,
    hostname: '127.0.0.1',
    sauceLabs: {
      testName: pkg.name + ' - ' + pkg.version + ' - unit tests'
    },
    customLaunchers: {
      slChrome: {
        base: 'SauceLabs',
        browserName: 'chrome',
        platform: 'Windows 10',
        version: 'latest'
      },
      slFirefox: {
        base: 'SauceLabs',
        browserName: 'firefox',
        platform: 'Windows 10',
        version: 'latest'
      },
      slSafari: {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'macOS 10.12',
        version: 'latest'
      },
      slEdge: {
        base: 'SauceLabs',
        browserName: 'MicrosoftEdge',
        platform: 'Windows 10',
        version: 'latest'
      }
    }
  });
};