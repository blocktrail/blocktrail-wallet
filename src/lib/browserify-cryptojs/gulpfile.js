/* global require */
(function () {
	'use strict';

	var gulp = require('gulp');
	var path = require('path');
	var fs   = require('fs');

	// plugins
	var concat = require('gulp-concat');

	// tasks
	gulp.task('build', function () {
		var files = fs.readdirSync('./src').filter(function (file) {
			return file.indexOf('.js') !== -1;
		});

		return files.forEach(function (file) {
			gulp.src([
				'./components/' + file,
				'./src/' + file
			])
				.pipe(concat('index.js'))
				.pipe(gulp.dest('./'));
		});
	});
})();
