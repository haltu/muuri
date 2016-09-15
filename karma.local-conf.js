module.exports = function (config) {

  var stn = {};

  stn.basePath = '';

  // https://npmjs.org/browse/keyword/karma-adapter
  stn.frameworks = [
    'qunit'
  ];

  // plugins to use
  stn.plugins = [
    'karma-qunit',
    'karma-chrome-launcher',
    'karma-firefox-launcher',
    'karma-safari-launcher',
    'karma-ie-launcher',
    'karma-story-reporter',
    'karma-coverage'
  ];

  // list of files / patterns to load in the browser
  stn.files = [
    './muuri.js',
    './tests/tests.js'
  ];

  // list of files to exclude
  stn.exclude = [];

  // possible values: 'dots', 'progress', 'story'
  // https://npmjs.org/browse/keyword/karma-reporter
  stn.reporters = ['dots'];

  stn.preprocessors = {
    './muuri.js': ['coverage']
  };

  stn.coverageReporter = {
    type : 'html',
    dir : 'coverage/'
  };

  // web server port
  stn.port = 8888;

  // enable / disable colors in the output (reporters and logs)
  stn.colors = true;

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  stn.logLevel = config.LOG_INFO;

  stn.autoWatch = false;

  stn.customLaunchers = {
    IE11: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE11'
    },
    IE10: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE10'
    },
    IE9: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE9'
    }
  };

  stn.browsers = [
    'Chrome'
  ];

  stn.captureTimeout = 60000;

  stn.browserDisconnectTolerance = 2;

  stn.browserDisconnectTimeout = 10000;

  stn.browserNoActivityTimeout = 120000;

  stn.singleRun = true;

  config.set(stn);

};