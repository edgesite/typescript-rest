// require("harmonize")();

var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');  
var sourcemaps = require('gulp-sourcemaps');
var runSequence = require('run-sequence');
var del = require('del');
var rename = require('gulp-rename');
var jasmine = require('gulp-jasmine');
var JasmineConsoleReporter = require('jasmine-console-reporter');
var typedoc = require("gulp-typedoc");
var istanbul = require('gulp-istanbul');
var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');
var coverageEnforcer = require("gulp-istanbul-enforcer");
var deleteLines = require('gulp-delete-lines');

var tsProject = ts.createProject('tsconfig.json', { 
	sortOutput: true, 
	declaration: false,
	rootDir: "./src", 
	noExternalResolve: false
}, ts.reporter.fullReporter(true));

gulp.task('compile', function() {
 	return gulp.src('src/lib/*.ts')
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(ts(tsProject))
		.pipe(sourcemaps.write('./')) 
		.pipe(gulp.dest('release'));
 });

gulp.task('clean', function() {
	return del(['release/**/*']);
});

gulp.task('docs-clean', function() {
	return del(['doc/']);
});

gulp.task('test-compile', function(done) {
 	return gulp.src('src/spec/test-*.ts')
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(ts(tsProject))
		.pipe(rename({ extname: '.spec.js' }))
		.pipe(sourcemaps.write('./')) 
		.pipe(gulp.dest('release/test'));
});

gulp.task('test-coverage', function(done) {
 	return gulp.src('src/lib/*.ts')
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(ts(tsProject))
		.pipe(istanbul())
		.pipe(sourcemaps.write('./')) 
		.pipe(gulp.dest('release/test'));
});

gulp.task('remap-istanbul-reports', function () {
    return gulp.src('release/test/coverage/coverage-final.json')
        .pipe(remapIstanbul({
            reports: {
                'json': 'release/test/coverage/typescript/coverage-final.json',
                'html': 'release/test/coverage/typescript/lcov-report'
            }
        }));
});

gulp.task('test-run', function() {
	return gulp.src('release/test/spec/*.spec.js')
		.pipe(jasmine({
	        timeout: 10000,
	        includeStackTrace: false,
	        reporter: new JasmineConsoleReporter({
				colors: 2,           // (0|false)|(1|true)|2 
				cleanStack: 1,       // (0|false)|(1|true)|2|3 
				verbosity: 4,        // (0|false)|1|2|(3|true)|4 
				listStyle: 'indent', // "flat"|"indent" 
				activity: false
			})
	    }))
		.pipe(istanbul.writeReports({
			dir: "release/test/coverage"
		}))
		.pipe(istanbul.enforceThresholds({ thresholds: { global: 50 } }));
});

gulp.task('test', function(done) {
    runSequence('test-compile', 'test-coverage', 'test-run', 
				'remap-istanbul-reports', function() {
        console.log('Release tested.');
        done();
    });
});

gulp.task("docs", ['docs-clean'], function() {
    return gulp
        .src(["./src/lib/*.ts"])
        .pipe(typedoc({
            module: "commonjs",
            target: "es6",
            out: "./doc/",
            name: "Typescript-rest",
			includeDeclarations: true,
			experimentalDecorators: true,
			emitDecoratorMetadata: true,
			excludeExternals: true,

			// TypeDoc options (see typedoc docs) 
			version: true,
			verbose: false,
			// json: "output/to/file.json"
 
			// theme: "/path/to/my/theme",
			ignoreCompilerErrors: true
        }))
    ;
});

gulp.task('generate-dts', function() {
	var tsdProject = ts.createProject('tsconfig.json', { 
		sortOutput: true, 
		declaration: true,
		rootDir: "./src", 
		noExternalResolve: false
	}, ts.reporter.fullReporter(true));

 	var tsResult = gulp.src(['src/lib/typescript-rest.ts', 
	 						'src/lib/server-return.ts', 
							'src/lib/server-errors.ts', 
							'src/lib/server-types.ts', 
							'src/lib/server.ts',
							'src/lib/es5-compat.ts', 
							'src/lib/decorators.ts'])
		.pipe(ts(tsdProject))
	return tsResult.dts.pipe(deleteLines({
      'filters': [
          /\/\/\//i
      ]
    })).pipe(gulp.dest('release'));
});

gulp.task('release', function(done) {
    runSequence('clean', 'compile', 'test', 'generate-dts', 'docs', function() {
        console.log('Release deployed.');
        done();
    });
});

gulp.task('watch', ['compile'], function() {
    gulp.watch('src/**/*.ts', ['compile']);
});