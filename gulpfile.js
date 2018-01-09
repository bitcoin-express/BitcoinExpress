var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var stripDebug = require('gulp-strip-debug');
var replace = require('gulp-replace');

var fs = require('fs');
var version = JSON.parse(fs.readFileSync('./package.json')).version;

var argv = require('yargs').argv;

var probes = {
  // MODIFY THIS ARRAY FOR DEV MODE
  dev: [
    {
      domain: "localhost",
      protocol: "http://",
      port: ":8000",
      path: "",
      probe: "/probe.html",
      wallet: "/wallet.html"
    }
  ],
  // MODIFY THIS ARRAY FOR PRODUCTION MODE
  dist: [
    {
      domain: "bitcoin-e.org",
      protocol: "https://",
      port: ":443",
      path: "",
      probe: "/wallet/probe.html",
      wallet: "/wallet/wallet.html"
    }
  ]
}

gulp.task('default', function () {
  var dest = argv.dest || 'dist';
  return gulp.src('BitcoinExpress.js')
    .pipe(replace("###WELL_KNOWN_WALLETS###", JSON.stringify(probes.dist)))
    .pipe(replace("###VERSION###", version))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify().on('error', function (e) {
      console.log(e);
    }))
  //  .pipe(stripDebug())
    .pipe(gulp.dest(dest));
});

gulp.task('build:dev', function () {
  var dest = argv.dest || 'dist';
  return gulp.src('BitcoinExpress.js')
    .pipe(replace("###VERSION###", version))
    .pipe(replace("###WELL_KNOWN_WALLETS###", JSON.stringify(probes.dev)))
    .pipe(gulp.dest(dest));
});
