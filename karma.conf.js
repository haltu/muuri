module.exports = function (config) {
  var pkg = require('./package.json');
  config.set({
    basePath: '',
    frameworks: ['qunit'],
    plugins: [
      'karma-qunit',
      'karma-chrome-launcher',
      'karma-sauce-launcher',
      'karma-story-reporter'
    ],
    files: [
      './node_modules/hammerjs/hammer.js',
      './node_modules/velocity-animate/velocity.js',
      pkg.main,
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
    browserDisconnectTimeout: 5000,
    browserDisconnectTolerance: 4,
    concurrency: 2,
    singleRun: true,
    hostname: '127.0.0.1',
    sauceLabs: {testName: pkg.name + ' - ' + pkg.version + ' - unit tests'},
    customLaunchers: {
      slChromeWin: {
        base: 'SauceLabs',
        browserName: 'chrome',
        platform: 'Windows 10',
        version: 'latest'
      },
      slChromeMac: {
        base: 'SauceLabs',
        browserName: 'chrome',
        platform: 'macOS 10.12',
        version: 'latest'
      },
      slChromeLinux: {
        base: 'SauceLabs',
        browserName: 'chrome',
        platform: 'Linux',
        version: 'latest'
      },
      slFirefoxWin: {
        base: 'SauceLabs',
        browserName: 'firefox',
        platform: 'Windows 10',
        version: 'latest'
      },
      slFirefoxMac: {
        base: 'SauceLabs',
        browserName: 'firefox',
        platform: 'macOS 10.12',
        version: 'latest'
      },
      slFirefoxLinux: {
        base: 'SauceLabs',
        browserName: 'firefox',
        platform: 'Linux',
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
      },
      slIE11: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '11.0'
      },
      slIE10: {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '10.0'
      }
    }
  });
};