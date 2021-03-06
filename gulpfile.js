var gulp        = require( 'gulp' );
var gulpUtil    = require( 'gulp-util' );
var concat      = require( 'gulp-concat' );
var uglify      = require( 'gulp-uglify' );
var streamqueue = require( 'streamqueue' );
var filter      = require( 'gulp-filter' );
var flatten     = require( 'gulp-flatten' );
var minify      = require( 'gulp-minify-css' );
var inject      = require( 'gulp-inject' );
var browserify  = require( 'gulp-browserify' );

var paths = {
    buildDest : './build',
    scripts: {
        projectFiles: [
            'ce.js',
            './utils/*.js'
        ],
        vendorFiles: [
            './bower_components/maplite/lib/openlayers/OpenLayers.js',
            './bower_components/maplite/maplite.js',
            './bower_components/mustache/mustache.js',
            './bower_components/drawerpanel/drawerpanel.js',
            './bower_components/permalink/permalink.js',
            './bower_components/multigraph/build/multigraph-min.js'
        ]
    },
    assets: {
        images: [
            'img/*.png'
        ],
        cssimages: [
            'bower_components/permalink/link.png',
            'bower_components/permalink/closebutton.png'
        ],
        templates: './templates/*.xml',
        templateBaseDir: './templates/',
        aggregateTemplate: 'aggregate.js'
    },
    productionWhitelist: {
        ceui: [
	  './ceui/css/**',
	  './ceui/ui/**',
	  './ceui/ceui.css',
	  './ceui/ceui.js'
	],
        testdata: [
	  './testdata/world_imagery_info_cache.json',
	  './testdata/world_street_map_info_cache.json',
	  './testdata/filtered_stations.json'
	]
    }
};

function bundleTemplates() {
    return gulp.src( paths.assets.templateBaseDir + paths.assets.aggregateTemplate )
        .pipe( inject( gulp.src( paths.assets.templates, { read: true } ), {
            starttag: 'var MUGLTEMPLATES = {',
            endtag: '};',
            transform: function(path, file, i, length) {
                // remove line breaks, spaces leading tags, and any remaining places where many spaces should be replaced with a single space
                var contents = file.contents.toString().replace(/(\r\n|\n|\r)/gm, '').replace(/\s+</g, '<').replace(/\s+/g, ' ');
                var key = path.split('.')[0].split('/')[2];
                return '"' + key + '": \'' + contents + (i + 1 < length ? '\',' : '\'');
            }
    }));
}

function browserifyRDV() {
    return gulp.src( 'ce.js' )
        .pipe( browserify( {
            //debug: true,
            insertGlobals: true
        }));
}

gulp.task( 'bundle-templates', function() {
    return bundleTemplates()
        .pipe(gulp.dest( paths.buildDest ));
});

gulp.task( 'bundle-assets', function() {
    // copy bower static assets
    var imageStream = streamqueue( { objectMode: true } );
    imageStream.queue( gulp.src( paths.assets.images ) );
    imageStream.queue( gulp.src( './bower_components/**/*.png' ) );
    imageStream.done()    
        .pipe( filter( '!jquery-ui*/**') )
        .pipe( flatten() )
        .pipe( gulp.dest( paths.buildDest + '/asset/img' ) );

    gulp.src( './bower_components/**/*.tpl.html' )
        .pipe( filter( '!jquery-ui*/**') )
        .pipe( flatten() )
        .pipe( gulp.dest( paths.buildDest + '/asset/tpl' ) );

    gulp.src( paths.assets.cssimages )
        .pipe( gulp.dest( paths.buildDest + '/asset' ) );

    var cssStream = streamqueue( { objectMode: true } );
    cssStream.queue( 
        gulp.src( './bower_components/**/*.css' )
        .pipe( filter( '!jquery-ui*/**') )
    );
    
    return cssStream.done()
        .pipe( minify() )
        .pipe( concat( 'app.css' ) )
        .pipe( gulp.dest( paths.buildDest + '/asset' ) );
});

gulp.task( 'html', ['default'], function() {

    gulp.src( './ce.html' )
        .pipe( concat( 'index.html' ) )
        .pipe( gulp.dest( './html' ) );

    gulp.src( './build/**' )
        .pipe( gulp.dest( './html/build' ) );

    gulp.src( './lib/**' )
        .pipe( gulp.dest( './html/lib' ) );

    gulp.src( './detail.tpl.html' )
        .pipe( gulp.dest( './html' ) );

    gulp.src( './config.json' )
        .pipe( gulp.dest( './html' ) );

    // temporary fix - need to override how OL references images
    gulp.src( './img/**' )
        .pipe( gulp.dest( './html/img' ) );

    gulp.src( './legends/legendimages/**' )
        .pipe( gulp.dest( './html/legends/legendimages' ) );

    // whitelisted items
    gulp.src( paths.productionWhitelist.testdata )
        .pipe( gulp.dest( './html/testdata' ) );

    gulp.src( './ceui/**' )
        .pipe( gulp.dest( './html/ceui' ) );

/*  Confirm these are sufficient
    gulp.src( './ceui/css/**' )
        .pipe( gulp.dest( './html/ceui/css' ) );

    gulp.src( './ceui/ui/**' )
        .pipe( gulp.dest( './html/ceui/ui' ) );

    gulp.src( './ceui/media/**' )
        .pipe( gulp.dest( './html/ceui/media' ) );

    gulp.src( './ceui/ceui.css' )
        .pipe( gulp.dest( './html/ceui' ) );

    gulp.src( './ceui/css.js' )
        .pipe( gulp.dest( './html/ceui' ) );

*/

});

gulp.task( 'package', function() {
    // copy scripts
    var stream = streamqueue( { objectMode: true } );
    stream.queue( gulp.src( paths.scripts.vendorFiles ) );
    stream.queue( bundleTemplates() );
    stream.queue( browserifyRDV() );

    return stream.done()
        .pipe( concat( 'app.js' ) )
//        .pipe( uglify() )
        .pipe( gulp.dest( paths.buildDest ) ); 
});

gulp.task( 'default', ['bundle-assets', 'package'], function() {
    
});

// launch and watch
gulp.task( 'watch', ['default'], function() {
    gulp.watch( paths.scripts.projectFiles, ['package']);
    gulp.watch( paths.assets.templates, ['package']);
});
