import fs from 'fs';
import gulp from 'gulp';
import karma from 'karma';
import size from 'gulp-size';
import rimraf from 'rimraf';
import dotenv from 'dotenv';
import * as url from 'url';
import pkg from './package.json' assert { type: 'json' };

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

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
      configFile: __dirname + '/karma.conf.cjs',
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
      configFile: __dirname + '/karma.conf.cjs',
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
