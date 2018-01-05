var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var stripDebug = require('gulp-strip-debug');
var replace = require('gulp-replace');

var fs = require('fs');
var version = JSON.parse(fs.readFileSync('./package.json')).version;

var probes = {
  dev: [ // MODIFY THIS ARRAY FOR DEV MODE
    {
      domain: "localhost",
      protocol: "http://",
      port: ":8000",
      path: "",
      probe: "/probe.html",
      wallet: "/wallet.html"
    }
  ],
  dist: [ // MODIFY THIS ARRAY FOR PRODUCTION MODE
    {
      domain: "bitcoin-e.org",
      protocol: "https://",
      port: ":443",
      path: "",
      probe: "/probe.html",
      wallet: "/wallet.html"
    }
  ]
}

gulp.task('default', function () {
  return gulp.src('BitcoinExpress.js')
    .pipe(replace("###VERSION###", version))
    .pipe(replace("###WELL_KNOWN_WALLETS###", probes.dist))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify().on('error', function (e) {
      console.log(e);
    }))
    .pipe(stripDebug())
    .pipe(gulp.dest('dist'));
});

gulp.task('build:dev', function () {
  return gulp.src('BitcoinExpress.js')
    .pipe(replace("###VERSION###", version))
    .pipe(replace("###WELL_KNOWN_WALLETS###", probes.dev))
    .pipe(gulp.dest('dist'));
});
