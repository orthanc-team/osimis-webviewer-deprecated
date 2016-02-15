// Generated on 2015-12-01 using generator-angular 0.14.0
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Automatically load required Grunt tasks
  require('jit-grunt')(grunt, {
    useminPrepare: 'grunt-usemin',
    ngtemplates: 'grunt-angular-templates',
    buildcontrol: 'grunt-build-control'
  });

  grunt.loadNpmTasks('grunt-git');
  
  // Configurable paths for the application
  var appConfig = {
    app: require('./bower.json').appPath || 'app',
    dist: 'dist',
    devSyncJsPath: grunt.option('js') || '.tmp/devsync.js',
    devSyncCssPath: grunt.option('css') || '.tmp/devsync.css'
  };

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    yeoman: appConfig,

    version: '???',

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      js: {
        files: ['<%= yeoman.app %>/scripts/{,*/}*.js'],
        options: {
          livereload: '<%= connect.options.livereload %>'
        }
      },
      compass: {
        files: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}'],
        tasks: ['compass:server', 'postcss:server']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          '<%= yeoman.app %>/{,*/}*.html',
          '.tmp/styles/{,*/}*.css',
          '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      },
      devsync: {
        files: [
          '<%= yeoman.app %>/styles/{,*/}*.{scss,sass}',
          '<%= yeoman.app %>/scripts/**/*'
        ],
        tasks: ['compass:server', 'postcss:server', 'ngtemplates:devsync', 'concat:devsync', 'concat:devsyncCss']
      },
      // devsyncCss: {
      //   files: [
      //     '.tmp/styles/{,*/}*.css'
      //   ],
      //   tasks: ['concat:devsyncCss']
      // }
    },

    // The actual grunt server settings
    connect: {
      options: {
        port: 9000,
        // Change this to '0.0.0.0' to access the server from outside.
        hostname: 'localhost',
        livereload: 35765
      },
      serve: {
        options: {
          open: false,
          middleware: function (connect) {
            return [
              connect.static('.tmp'),
              connect().use(
                '/bower_components',
                connect.static('./bower_components')
              ),
              connect().use(
                '/app/styles',
                connect.static('./app/styles')
              ),
              connect().use(
                '/docs_html',
                connect.static('./docs_html')
              ),
              connect.static(appConfig.app)
            ];
          }
        }
      },
      dist: {
        options: {
          open: true,
          base: '<%= yeoman.dist %>'
        }
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= yeoman.dist %>/{,*/}*',
            '!<%= yeoman.dist %>/.git{,*/}*'
          ]
        }]
      },
      server: '.tmp'
    },

    // Add vendor prefixed styles
    postcss: {
      options: {
        processors: [
          require('autoprefixer-core')({browsers: ['last 1 version']})
        ]
      },
      server: {
        options: {
          map: true
        },
        files: [{
          expand: true,
          cwd: '.tmp/styles/',
          src: '{,*/}*.css',
          dest: '.tmp/styles/'
        }]
      },
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/styles/',
          src: '{,*/}*.css',
          dest: '.tmp/styles/'
        }]
      }
    },

    // Compiles Sass to CSS and generates necessary files if requested
    compass: {
      options: {
        sassDir: '<%= yeoman.app %>/styles',
        cssDir: '.tmp/styles',
        generatedImagesDir: '.tmp/images/generated',
        imagesDir: '<%= yeoman.app %>/images',
        javascriptsDir: '<%= yeoman.app %>/scripts',
        fontsDir: '<%= yeoman.app %>/fonts',
        importPath: './bower_components',
        httpImagesPath: '/images',
        httpGeneratedImagesPath: '/images/generated',
        httpFontsPath: '/fonts',
        relativeAssets: false,
        assetCacheBuster: false,
        raw: 'Sass::Script::Number.precision = 10\n'
      },
      dist: {
        options: {
          generatedImagesDir: '<%= yeoman.dist %>/images/generated'
        }
      },
      server: {
        options: {
          sourcemap: true
        }
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: '<%= yeoman.app %>/index.html',
      options: {
        dest: '<%= yeoman.dist %>',
        flow: {
          html: {
            steps: {
              js: ['concat', 'uglifyjs'],
              css: ['cssmin']
            },
            post: {}
          }
        }
      }
    },

    // Performs rewrites based on filerev and the useminPrepare configuration
    usemin: {
      html: ['<%= yeoman.dist %>/{,*/}*.html'],
      css: ['<%= yeoman.dist %>/styles/{,*/}*.css'],
      js: ['<%= yeoman.dist %>/scripts/{,*/}*.js'],
      options: {
        assetsDirs: [
          '<%= yeoman.dist %>',
          '<%= yeoman.dist %>/images',
          '<%= yeoman.dist %>/styles'
        ],
        patterns: {
          js: [[/(images\/[^''""]*\.(png|jpg|jpeg|gif|webp|svg))/g, 'Replacing references to images']]
        }
      }
    },

    // The following *-min tasks will produce minified files in the dist folder
    // By default, your `index.html`'s <!-- Usemin block --> will take care of
    // minification. These next options are pre-configured if you do not wish
    // to use the Usemin blocks.
    // cssmin: {
    //   dist: {
    //     files: {
    //       '<%= yeoman.dist %>/styles/main.css': [
    //         '.tmp/styles/{,*/}*.css'
    //       ]
    //     }
    //   }
    // },
    // uglify: {
    //   dist: {
    //     files: {
    //       '<%= yeoman.dist %>/scripts/scripts.js': [
    //         '<%= yeoman.dist %>/scripts/scripts.js'
    //       ]
    //     }
    //   }
    // },

    concat: {
      devsync: {
        options: {
          sourceMap: true,
        },
        src: [
          '<%= yeoman.app %>/**/*.js',
          '.tmp/templateCache.js'
        ],
        dest: '<%= yeoman.devSyncJsPath %>',
      },
      devsyncCss: {
        options: {
          sourceMap: true,
        },
        src: [
          '.tmp/styles/webviewer.components.css'
        ],
        dest: '<%= yeoman.devSyncCssPath %>',
      }
    },

    htmlmin: {
      dist: {
        options: {
          collapseWhitespace: true,
          conservativeCollapse: true,
          collapseBooleanAttributes: true,
          removeCommentsFromCDATA: true
        },
        files: [{
          expand: true,
          cwd: '<%= yeoman.dist %>',
          src: ['*.html'],
          dest: '<%= yeoman.dist %>'
        }]
      }
    },

    ngtemplates: {
      dist: {
        options: {
          module: 'webviewer',
          htmlmin: '<%= htmlmin.dist.options %>',
          usemin: 'scripts/webviewer.components.js'
        },
        cwd: '<%= yeoman.app %>',
        src: 'scripts/{,*/}*.html',
        dest: '.tmp/templateCache.js'
      },
      devsync: {
        options: {
          module: 'webviewer'
        },
        cwd: '<%= yeoman.app %>',
        src: 'scripts/{,*/}*.html',
        dest: '.tmp/templateCache.js'
      }
    },

    // ng-annotate tries to make the code safe for minification automatically
    // by using the Angular long form for dependency injection.
    ngAnnotate: {
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/concat/scripts',
          src: '*.js',
          dest: '.tmp/concat/scripts'
        }]
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.dist %>',
          src: [
            '*.{ico,png,txt}',
            '*.html',
            'images/{,*/}*.{webp}',
            'fonts/{,*/}*.*',
            'config.js'
          ]
        }, {
          expand: true,
          cwd: '.tmp/images',
          dest: '<%= yeoman.dist %>/images',
          src: ['generated/*']
        }]
      },
      styles: {
        expand: true,
        cwd: '<%= yeoman.app %>/styles',
        dest: '.tmp/styles/',
        src: '{,*/}*.css'
      },
      deploy: {
        expand: true,
        cwd: './',
        dest: 'dist',
        src: [
          'README.md',
          'bower.json'
        ]
      }
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      server: [
        'compass:server'
      ],
      dist: [
        'compass:dist'
      ]
    },

    mkdocs: {
      deploy: {
        src: '.',
        options: {
          'clean': true
        }
      }
    },

    version: {
      deploy: {
        src: ['package.json', 'bower.json', 'app/scripts/app.js']
      }
    },

    gitadd: {
      deploy: {
        files: {
          src: ['package.json', 'bower.json', 'app/scripts/app.js']
        }
      }
    },

    gitcommit: {
      deploy: {
        options: {
          message: 'New version: v<%= version %>',
          noVerify: true
        },
        files: {
          src: ['package.json', 'bower.json', 'app/scripts/app.js']
        }
      }
    },

    gitpush: {
      self: {},
      deploy: {
        branch: 'dist',
        tags: true
      }
    },

    // Create automatic git/bower tags with builded source
    buildcontrol: {
      options: {
        commit: true,
        push: true,
        message: 'New version: v<%= version %> (from %sourceBranch%#%sourceCommit%)'
      },
      dist: {
        options: {
          dir: 'dist',
          remote: '../',
          branch: 'dist',
          tag: 'v<%= version %>'
        }
      }
    },

  });

  grunt.registerTask('serve', 'Compile then start a connect web server', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'concurrent:server',
      'postcss:server',
      'connect:serve',
      'watch'
    ]);
  });

  grunt.registerTask('server', 'DEPRECATED TASK. Use the "serve" task instead', function (target) {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve:' + target]);
  });

  grunt.registerTask('devsync',  ['ngtemplates:devsync', 'compass:server', 'postcss:server', 'concat:devsync', 'concat:devsyncCss', 'watch:devsync']);

  grunt.registerTask('build', [
    'clean:dist',
    'useminPrepare',
    'concurrent:dist',
    'postcss',
    'ngtemplates:dist',
    'concat',
    'ngAnnotate',
    'copy:dist',
    'cssmin',
    'uglify',
    'usemin',
    'htmlmin'
  ]);

  grunt.registerTask('default', [
    'build'
  ]);

  grunt.registerTask('reloadVersion', '', function() {
    delete require.cache[require.resolve('./bower.json')];
    
    var pkg = require('./bower.json');
    grunt.config('version', pkg.version);
  });

  grunt.registerTask('deploy', 'Deploy a built version on the dist branch.', function(version_type) {
    if (version_type !== 'patch' && version_type !== 'minor' && version_type !== 'major') {
      grunt.log.error('Argument [' + version_type + '] invalid.');
      grunt.log.error('Argument should be patch, minor or major.');
      grunt.log.error('Eg.: $ grunt deploy:minor');
      return false;
    }

    var tasklist = [
      'version:deploy:' + version_type,
      'reloadVersion',
      'build',
      'mkdocs',
      'copy:deploy',
      'gitadd:deploy',
      'gitcommit:deploy',
      'gitpush:self',
      'buildcontrol:dist',
      'gitpush:deploy'
    ];

    grunt.task.run(tasklist);
  });
};