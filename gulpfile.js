var package = require('./package.json');
var fs = require('fs');
var gulp = require('gulp');
var eslint = require('gulp-eslint');
var karma = require('karma');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var size = require('gulp-size');
var rimraf = require('rimraf');
var runSequence = require('run-sequence');
try {
  var test = require('testfoo')
}
catch (err) {
  console.log('no foo');
}
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

gulp.task('lint', function () {

  return gulp
  .src(package.main)
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());

});

gulp.task('compress', function() {

  var mainMinified = package.main.replace('./', '').replace('.js', '.min.js');

  return gulp
  .src(package.main)
  .pipe(size({title: 'development'}))
  .pipe(uglify({
    preserveComments: 'some'
  }))
  .pipe(size({title: 'minified'}))
  .pipe(size({title: 'gzipped', gzip: true}))
  .pipe(rename(mainMinified))
  .pipe(gulp.dest('./'));

});

gulp.task('test', function (done) {

  (new karma.Server({
    configFile: __dirname + '/karma.conf.js',
    action: 'run'
  }, function (exitCode) {
    done(exitCode);
  })).start();

});

gulp.task('clean', function (cb) {

  rimraf('./*.log', function () {
    rimraf('./coverage', cb);
  });

});

gulp.task('default', function (done) {

  if (process.env.CI) {
    runSequence('lint', 'compress', 'test', 'clean', done);
  }
  else {
    runSequence('lint', 'compress', 'test', done);
  }

});