var fs = require('fs');
var gulp = require('gulp');
var jscs = require('gulp-jscs');
var karma = require('karma');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var size = require('gulp-size');
var runSequence = require('run-sequence');
var argv = require('yargs').argv;
var fileExists = function (filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
};

// Load environment variables if .env file exists
if (fileExists('./.env')) {
  require('dotenv').load();
}

gulp.task('validate', function () {

  return gulp
  .src('./muuri.js')
  .pipe(jscs())
  .pipe(jscs.reporter());

});

gulp.task('compress', function() {

  return gulp
  .src('./muuri.js')
  .pipe(size({title: 'development'}))
  .pipe(uglify({
    preserveComments: 'some'
  }))
  .pipe(size({title: 'minified'}))
  .pipe(size({title: 'gzipped', gzip: true}))
  .pipe(rename('muuri.min.js'))
  .pipe(gulp.dest('./'));

});

gulp.task('test', function (done) {

  var isLocal = !!argv.local;
  var configPath = isLocal ? '/karma.local-conf.js' : '/karma.sauce-conf.js';
  var browserMapper = {
    'safari': 'Safari',
    'ie9': 'IE9',
    'ie10': 'IE10',
    'ie11': 'IE11',
    'firefox': 'Firefox',
    'chrome': 'Chrome'
  };
  var opts = {
    configFile: __dirname + configPath,
    action: 'run'
  };

  if (argv.reporters) {
    opts.reporters = argv.reporters.split(',');
  }

  if (argv.browsers) {
    if (isLocal) {
      opts.browsers = argv.browsers.split(',').map(function (browserName) {
        return browserMapper[browserName.toLowerCase()] || '';
      });
    }
    else {
      opts.browsers = require('./karma.sauce-browsers.js').getBrowsers(argv.browsers);
    }
  }

  (new karma.Server(opts, function (exitCode) {
    done(exitCode);
  })).start();

});

gulp.task('default', function (done) {

  runSequence('validate', 'test', 'compress', done);

});