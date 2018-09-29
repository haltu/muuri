const fs = require('fs');
const gulp = require('gulp');
const eslint = require('gulp-eslint');
const karma = require('karma');
const size = require('gulp-size');
const rimraf = require('rimraf');
const argv = require('yargs').argv;
const dotenv = require('dotenv');
const replace = require('gulp-replace');
const exec = require('child_process').exec;

const pkg = require('./package.json');
const karmaDefaults = require('./karma.defaults.js');

const patchedUMD = `(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    var Hammer;
    try { Hammer = require('hammerjs') } catch (e) {}
    module.exports = factory(Hammer);
  } else {
    global.Muuri = factory(global.Hammer);
  }
}(this, (function (Hammer) {
  'use strict';`;

if (fs.existsSync('./.env')) dotenv.load();

gulp.task('lint', () => {
  return gulp
    .src('./src/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('size', () => {
  const mainPath = './' + pkg.main;
  const minifiedPath = mainPath.replace('.js', '.min.js');

  return gulp
    .src([mainPath, minifiedPath])
    .pipe(
      size({
        showFiles: true,
        showTotal: false
      })
    )
    .pipe(
      size({
        showFiles: true,
        showTotal: false,
        title: 'gzipped',
        gzip: true
      })
    );
});

gulp.task('clean', cb => {
  rimraf('./*.log', cb);
});

gulp.task('test-local', done => {
  // Setup browsers.
  const browsers = [];
  argv.chrome && browsers.push('Chrome');
  argv.firefox && browsers.push('Firefox');
  argv.safari && browsers.push('Safari');
  argv.edge && browsers.push('Edge');
  if (!browsers.length) browsers.push('Chrome');

  new karma.Server(
    {
      configFile: __dirname + '/karma.conf.js',
      action: 'run',
      browsers
    },
    exitCode => {
      done(exitCode);
    }
  ).start();
});

gulp.task('test-local-min', done => {
  // Setup browsers.
  const browsers = [];
  argv.chrome && browsers.push('Chrome');
  argv.firefox && browsers.push('Firefox');
  argv.safari && browsers.push('Safari');
  argv.edge && browsers.push('Edge');
  if (!browsers.length) browsers.push('Chrome');

  // Replace main file with minified version.
  const mainPath = './' + pkg.main;
  const minifiedPath = mainPath.replace('.js', '.min.js');
  const files = karmaDefaults.files.map(path => {
    if (path === mainPath) return minifiedPath;
    return path;
  });

  new karma.Server(
    {
      configFile: __dirname + '/karma.conf.js',
      action: 'run',
      browsers,
      files
    },
    exitCode => {
      done(exitCode);
    }
  ).start();
});

gulp.task('test-sauce', done => {
  // Setup browsers.
  const browsers = [];
  argv.chrome && browsers.push('slChrome');
  argv.firefox && browsers.push('slFirefox');
  argv.safari && browsers.push('slSafari');
  argv.edge && browsers.push('slEdge');
  if (!browsers.length) browsers.push('slChrome', 'slFirefox', 'slSafari');

  new karma.Server(
    {
      configFile: __dirname + '/karma.conf.js',
      action: 'run',
      browsers
    },
    exitCode => {
      done(exitCode);
    }
  ).start();
});

gulp.task('test-sauce-min', done => {
  // Setup browsers.
  const browsers = [];
  argv.chrome && browsers.push('slChrome');
  argv.firefox && browsers.push('slFirefox');
  argv.safari && browsers.push('slSafari');
  argv.edge && browsers.push('slEdge');
  if (!browsers.length) browsers.push('slChrome', 'slFirefox', 'slSafari');

  // Replace main file with minified version.
  const mainPath = './' + pkg.main;
  const minifiedPath = mainPath.replace('.js', '.min.js');
  const files = karmaDefaults.files.map(path => {
    if (path === mainPath) return minifiedPath;
    return path;
  });

  new karma.Server(
    {
      configFile: __dirname + '/karma.conf.js',
      action: 'run',
      browsers,
      files
    },
    exitCode => {
      done(exitCode);
    }
  ).start();
});

gulp.task('format-test', cb => {
  exec('npm run format-test', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('bundle', cb => {
  exec('npm run bundle', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('fix-umd', () => {
  const mainPath = './' + pkg.main;
  return gulp
    .src(mainPath, { base: './' })
    .pipe(replace(/\(function([\s\S]*?)Hammer;/, patchedUMD))
    .pipe(gulp.dest('./'));
});

gulp.task('minify', cb => {
  exec('npm run minify', (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task(
  'build',
  gulp.series('bundle', 'fix-umd', 'minify', done => {
    done();
  })
);

gulp.task(
  'pre-commit',
  gulp.series('lint', 'format-test', done => {
    done();
  })
);

gulp.task(
  'test',
  gulp.series('lint', 'format-test', 'test-sauce', 'test-sauce-min', 'clean', done => {
    done();
  })
);
