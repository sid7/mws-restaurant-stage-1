const gulp = require("gulp");
const sass = require("gulp-sass");
const autoprefixer = require("gulp-autoprefixer");
const concat = require("gulp-concat");
const sourcemaps = require("gulp-sourcemaps");
const rename = require("gulp-rename");
const uglify = require("gulp-uglify-es").default;

const path = {
  styles: {
    src: ["./src/styles/*.css", "./src/styles/styles.scss"],
    dest: "./css/"
  },
  scripts: { src: "./src/js/*.js", dest: "./js/" },
  lib: { src: "./src/lib/*.js", dest: "./js/" }
};

/**
 * gulp task to handle css and scss
 */
gulp.task("styles", function () {
  return gulp
    .src(path.styles.src)
    .pipe(
      sass({
        outputStyle: "compressed"
      }).on("error", sass.logError)
    )
    .pipe(concat("styles.css"))
    .pipe(autoprefixer({ browsers: ["last 2 versions"] }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest(path.styles.dest));
});

/**
 * gulp task to gen bundle js file for common scripts
 */
gulp.task("lib", function () {
  return gulp
    .src(path.lib.src)
    .pipe(sourcemaps.init())
    .pipe(concat("lib.min.js"))
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.lib.dest));
});

/**
 * gulp task to optimise js scripts
 */
gulp.task("scripts", function () {
  return gulp
    .src(path.scripts.src)
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(path.scripts.dest));
});

/**
 * gulp task to run all task
 */
gulp.task("build", ["styles", "scripts", "lib", "db"]);
