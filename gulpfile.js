var pkg = require('./package.json');
var fs = require('fs');
var gulp = require('gulp');
var eslint = require('gulp-eslint');
var karma = require('karma');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var size = require('gulp-size');
var rimraf = require('rimraf');
var runSequence = require('run-sequence');

if (fs.existsSync('./.env')) {
  require('dotenv').load();
}

gulp.task('lint', function () {
  return gulp.src('./' + pkg.main)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('compress', function() {
  return gulp.src('./' + pkg.main)
    .pipe(size({title: 'development'}))
    .pipe(uglify({preserveComments: 'some'}))
    .pipe(size({title: 'minified'}))
    .pipe(size({title: 'gzipped', gzip: true}))
    .pipe(rename(pkg.main.replace('./', '').replace('.js', '.min.js')))
    .pipe(gulp.dest('./'));
});

gulp.task('test-local', function (done) {
  (new karma.Server({
    configFile: __dirname + '/karma.conf.js',
    action: 'run',
    browsers: ['Chrome', 'Firefox']
  }, function (exitCode) {
    done(exitCode);
  })).start();
});

gulp.task('test', function (done) {
  (new karma.Server({
    configFile: __dirname + '/karma.conf.js',
    action: 'run',
    browsers: ['slChrome', 'slFirefox', 'slEdge', 'slSafari']
  }, function (exitCode) {
    done(exitCode);
  })).start();
});

gulp.task('clean', function (cb) {
  rimraf('./*.log', cb);
});

gulp.task('default', function (done) {
  if (process.env.CI) {
    runSequence('lint', 'compress', 'test', 'clean', done);
  }
  else {
    runSequence('lint', 'compress', 'test-local', 'clean', done);
  }
});