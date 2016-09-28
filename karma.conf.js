module.exports = function (config) {

  var package = require('./package.json');

  //
  // Define Sauce Labs browsers.
  //

  var browsers = [
    // IE
    ['Windows 7', 'internet explorer', '9.0'],
    ['Windows 8', 'internet explorer', '10.0'],
    ['Windows 8.1', 'internet explorer', '11.0'],
    // Edge
    ['Windows 10', 'MicrosoftEdge', '13.10586'],
    // Firefox
    ['Windows 10', 'firefox', '48.0'],
    ['OS X 10.11', 'firefox', '48.0'],
    // Chrome
    ['Windows 10', 'chrome', '53.0'],
    ['OS X 10.11', 'chrome', '53.0'],
    // Safari
    ['OS X 10.8', 'safari', '6.0'],
    ['OS X 10.9', 'safari', '7.0'],
    ['OS X 10.10', 'safari', '8.0'],
    ['OS X 10.11', 'safari', '9.0']
  ];

  //
  // Generate Sauce Labs launchers.
  //

  var launchers = {};
  browsers.forEach(function (browser) {

    var launcher = {
      base: 'SauceLabs',
      platform: browser[0],
      browserName: browser[1],
      version: browser[2]
    };
    var key = launcher.platform + ' - ' + launcher.browserName + (launcher.version ? ' - ' + launcher.version : '');

    if (launcher.browserName === 'iphone') {
      launcher.deviceName = 'iPhone Simulator';
      launcher.deviceOrientation = 'portrait';
    }

    if (launcher.browserName === 'android') {
      launcher.deviceName = 'Android Emulator';
      launcher.deviceOrientation = 'portrait';
    }

    launchers[key] = launcher;

  });

  //
  // Karma settings.
  //

  var stn = {};

  stn.basePath = '';

  // https://npmjs.org/browse/keyword/karma-adapter
  stn.frameworks = [
    'qunit'
  ];

  // plugins to use
  stn.plugins = [
    'karma-qunit',
    'karma-sauce-launcher',
    'karma-story-reporter'
  ];

  // list of files / patterns to load in the browser
  stn.files = [
    package.main,
    './tests/tests.js'
  ];

  // list of files to exclude
  stn.exclude = [];

  // preprocess matching files before serving them to the browser
  // https://npmjs.org/browse/keyword/karma-preprocessor
  stn.preprocessors = {};
  //stn.preprocessors[package.main] = ['coverage'];

  // possible values: 'dots', 'progress', 'story'
  // https://npmjs.org/browse/keyword/karma-reporter
  stn.reporters = [
    'story',
    'saucelabs'
  ];

  // enable / disable colors in the output (reporters and logs)
  stn.colors = true;

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  stn.logLevel = config.LOG_INFO;

  stn.autoWatch = false;

  stn.customLaunchers = launchers;

  stn.browsers = Object.keys(launchers);

  stn.captureTimeout = 240000;

  stn.browserDisconnectTimeout = 5000;

  stn.browserDisconnectTolerance = 4;

  stn.singleRun = true;

  stn.sauceLabs = {
    testName: package.name + ' - ' + package.version + ' - unit tests'
  };

  stn.hostname = '127.0.0.1';

  config.set(stn);

};