const fs = require('fs');
const gulp = require('gulp');
const karma = require('karma');
const size = require('gulp-size');
const rimraf = require('rimraf');
const dotenv = require('dotenv');
const pkg = require('./package.json');

if (fs.existsSync('./.env')) dotenv.config();

gulp.task('size', () => {
  const mainPath = './' + pkg.main;
  const minifiedPath = mainPath.replace('.js', '.min.js');

  return gulp
    .src([mainPath, minifiedPath])
    .pipe(
      size({
        showFiles: true,
        showTotal: false,
      })
    )
    .pipe(
      size({
        showFiles: true,
        showTotal: false,
        title: 'gzipped',
        gzip: true,
      })
    );
});

gulp.task('clean', (cb) => {
  rimraf('./*.log', cb);
});

gulp.task('test-local', (done) => {
  new karma.Server(
    {
      configFile: __dirname + '/karma.conf.js',
      action: 'run',
    },
    (exitCode) => {
      done(exitCode);
    }
  ).start();
});

gulp.task('test-browserstack', (done) => {
  new karma.Server(
    {
      configFile: __dirname + '/karma.conf.js',
      action: 'run',
      plugins: ['karma-qunit', 'karma-story-reporter', 'karma-browserstack-launcher'],
      reporters: ['story', 'BrowserStack'],
      port: 9876,
      browserStack: {
        username: process.env.BROWSERSTACK_USERNAME,
        accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
      },
      customLaunchers: {
        bsChromeWindows: {
          base: 'BrowserStack',
          browser: 'chrome',
          browser_version: '72.0',
          os: 'Windows',
          os_version: '10',
        },
      },
      browsers: ['bsChromeWindows'],
    },
    (exitCode) => {
      done(exitCode);
    }
  ).start();
});

gulp.task(
  'test',
  gulp.series('test-browserstack', 'clean', (done) => {
    done();
  })
);
