var gulp = require('gulp');
var gls = require('gulp-live-server');
var open = require('gulp-open');


gulp.task('serve', function() {
  // run your script as a server
  var server = gls.new('server.js');;
  server.start();

  //use gulp.watch to trigger server actions(notify, start or stop)
  gulp.watch(['views/**/*.ejs', 'public/**/*.js'], function(file) {
    server.notify.apply(server, [file]);
  });
  gulp.watch('server.js', server.start.bind(server)); //restart my server

});

gulp.task('open', function() {
  gulp.src('')
    .pipe(open({
      uri: 'http://localhost:3000'
    }));
});

gulp.task('default', ['serve', 'open']);
