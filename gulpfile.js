'use strict';
const gulp         = require('gulp'),
      babel        = require('gulp-babel'),
      cssnano      = require('gulp-cssnano'),
      autoprefixer = require('gulp-autoprefixer'),
      gulpif       = require('gulp-if'),
      sourcemaps   = require('gulp-sourcemaps'),
      sass         = require('gulp-sass'),
      watch        = require('gulp-watch'),
      csslint      = require('gulp-csslint'),
      uglify       = require('gulp-uglify'),
      imagemin     = require('gulp-imagemin'),
      imacss       = require('gulp-imacss'),
      base64       = require('gulp-base64'),
      pug         = require('gulp-pug2'),
      notify       = require('gulp-notify'),
      rename       = require('gulp-rename'),
      browserSync  = require('browser-sync').create(),
      fpath        = require('path'),
      argv         = require('yargs').argv,
      iconDir      = fpath.join(__dirname, 'options/img/'),
      reload       = browserSync.reload;

// Костыли и велосипеды.
// --------------------------------------
/* небольшой костыль с помощью которого
   можем фильтровать файлы по разрешению,
   юзаем с gulp-if.
*/

let filter = ext => {
  let reg = new RegExp( ext, 'i');
  return file => {
    return !!file.path.match(reg);
  }
}


if ( argv.server){
  if ( typeof argv.server  === 'string') {
    let theme = argv.server.split(':');
    var projectName = theme[0];
    var drupal = `w:/${projectName}/sites/all/themes/${theme[1]}`;
  }
  else {
    return console.error('Ошибка: ты забыл указать проект и тему через символ ":" (например project:theme_name).');
  }
}

// Пути
// -------------------

var path = {
  source: {
    html: './source/*.{html,pug}',
    styles: './source/css/main.scss',
    images: './source/images/**/*.*',
    svg2base: './source/images/**/*.svg',
    js: './source/js/**.js',
    fonts: './source/fonts/**/*.*',
    base64: './source/css/base64.css'
  },
  watch: {
    html: './source/**/*.{html,pug}',
    styles: './source/css/**/*.scss',
    images: './source/images/**/*.*',
    js: './source/js/**/*.js',
    fonts: './source/fonts/**/*.*',
    base64: './source/css/base64.css'
  },
  production: {
    html: './production/',
    defaultStyles: './production/css/',
    defaultImages: './production/images/',
    defaultJs: './production/js/',
    defaultFonts: './production/fonts/',
    styles: argv.server ? `${ drupal }/css/`:'./production/css/',
    images: argv.server ? `${ drupal }/images/`:'./production/images/',
    js: argv.server ? `${ drupal }/js/`:'./production/js/',
    fonts: argv.server ? `${ drupal }/fonts/`:'./production/fonts/'
  }
}

var isTogether = argv.together;


// Запускаем наш сервер
// --------------------

gulp.task('local:server', () => {
  return browserSync.init({
    server: {
      baseDir: './production'
    }
  });
});

/* таск ниже пригодиться когда будем тянуть
   данные с red сервера. Удобно при разработке,
   не нужно будет обновлять страницу.
*/

gulp.task('proxy:server', () => {
  return browserSync.init({
    proxy: `http://${projectName}.raduga.red/`
  });
});


// HTML build
// ----------------------
/* сборка html,также пережует Jade-файлы.
*/

gulp.task('build:html', () => {

  return gulp.src(path.source.html)
             .pipe( pug({
                pretty: true,
                compileDebug: true,
                debug: false
              }).on('error', notify.onError({
                    title: 'Jade: Fail!',
                    icon: iconDir + 'jade.png',
                    message: (err) => {return 'Обнаружен говнокод ' + err.message}
                  })))
             .pipe(gulp.dest(path.production.html))
             .pipe(reload({stream:true}));
});



// Styles build
// ----------------------

/* Сборка стилей: пропускаем через sourcemap,
   компилируем scss в привычный css, добавляем
   горстку автопрефиксов, просмотрим нужно ли нам
   какие-либо картинки закатать в base64.
*/

gulp.task('build:styles', () => {
  return gulp.src(path.source.styles)
             .pipe( gulpif(!argv.production, sourcemaps.init({loadMaps: true})))
             .pipe(sass()
                   .on('error', notify.onError({
                    title: 'CSS: Fail!',
                    icon: iconDir + 'notify.png',
                    message: (err) => {return 'Обнаружен говнокод в стилях ' + err.message}
                  })))
             .pipe(autoprefixer({
                browsers: ['ie 9', '> 1% in RU', 'last 10 versions'],
                cascade: false
              }))
             .pipe(base64({
                   baseDir: './source/images_base64/',
                   extensions: [ /#base64/i],
                   exclude:    [/\.server\.(com|net)\/dynamic\//, '--live.jpg'],
                   maxImageSize: 8*1024, // bytes
                   debug: true
               }))
             // .pipe(csslint())
             // .pipe(csslint.reporter())
             .pipe(gulpif(!argv.production , sourcemaps.write()))
             .pipe(gulp.dest(path.production.styles))
             .pipe(gulpif( isTogether && !argv.proxy , gulp.dest(path.production.defaultStyles)))
             .pipe(browserSync.stream());
  });


// Images build
// ----------------------
/* Сборка изображений(png, jpg, svg), оптимизирует
   их, ужимает отправляет куда надо.
*/


gulp.task('build:images', () => {
  return gulp.src(path.source.images)
            .pipe(imagemin(
              [
                imagemin.gifsicle(),
                imagemin.jpegtran(),
                imagemin.optipng(),
                imagemin.svgo({
                  plugins: [
                    {
                      cleanupIDs: false
                    }
                  ]
                })
              ], {
              optimizationLevel: 3,
              progressive: true,
              interlaced: true
             }))
             .pipe(gulp.dest(path.production.images))
             .pipe(gulpif( isTogether && !argv.proxy , gulp.dest(path.production.defaultImages)))
             .pipe(reload({stream: true}));
  });

/* кодируем картинки в base64.
*/

gulp.task('build:base64', () =>{
    return gulp.src(path.source.base64)
               .pipe(base64({
                   baseDir: './production/images/',
                   extensions: [ /#base64/i],
                   exclude:    [/\.server\.(com|net)\/dynamic\//, '--live.jpg'],
                   maxImageSize: 8*1024, // bytes
                   debug: true
               }))
               .pipe(gulp.dest(path.production.styles))
});

// JS build
// ----------------------
/* Сборка JS, потоком отправляет его в продакш сборку,
   сделав дополнительно минифицированную копию
*/


gulp.task('build:js', () => {

  return gulp.src(path.source.js)
             .pipe( gulpif(argv.babel, babel({
               presets: ['es2015']
              }).on('error', notify.onError({
                    title: 'JS: fail',
                    // icon: fpath.join(__dirname, 'options/img/js-1.png'),
                    icon: iconDir + 'js-1.png',
                    message: (err) => {return 'С этим кодом что-то пошло не так... ' + err.message}
                  }))))
             .pipe(gulp.dest(path.production.js))
             .pipe(gulpif( isTogether && !argv.proxy , gulp.dest(path.production.defaultJs)))
             .pipe(reload({stream:true}));
});

// Fonts
// ----------------------
/* Сборка Fonts, собственно сборки здесь как таковой нет,
   при поступлении шрифтов, gulp перемещает в продакш директорию,
   сообщая серверу что надо бы обновить страницу.
*/

gulp.task('build:fonts', () => {

  return gulp.src(path.source.fonts)
             .pipe(gulp.dest(path.production.fonts))
             .pipe(gulpif( isTogether && !argv.proxy , gulp.dest(path.production.defaultFonts)))
             .pipe(reload({stream:true}));
});

// Watchers
// ----------------------


gulp.task('build:watch', ()=> {
  watch ( [path.watch.images], (event, cb) => gulp.start('build:images'));
  watch ( [path.watch.html], (event, cb) => gulp.start('build:html'));
  watch ( [path.watch.js], (event, cb) => gulp.start('build:js'));
  watch ( [path.watch.styles], (event, cb) => gulp.start('build:styles'));
  watch ( [path.watch.fonts], (event, cb) => gulp.start('build:fonts'));
  watch ( [path.watch.base64], (event, cb) => gulp.start('build:base64'));
});

gulp.task('watcher', function(){
  console.log('watcher run');
  watch (['./sourse/**/*.*'], {}, (event, cb) => console.log(event, cb));
});

// Runners
// ----------------------

/* В зависимости от флагов запускает тот или иной набор задач
*/

gulp.task('build:build', ['build:images', 'build:styles', 'build:js', 'build:fonts'], () => {
  if (!argv.server)gulp.start('build:html');
  });

gulp.task( 'default',['build:build'], () => {

  if (argv.server && argv.proxy  && argv.together  ){
    gulp.start('proxy:server', 'build:watch');
  } else if (argv.server && argv.proxy ){
    gulp.start('proxy:server', 'build:watch');
  } else if(argv.server && !argv.together){
    gulp.start('build:watch');
  }else {
    gulp.start('local:server', 'build:watch');
  }
});
