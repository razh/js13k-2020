/* eslint-disable func-style */

'use strict';

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const del = require('del');
const { rollup } = require('rollup');

const escapeStringRegexp = require('escape-string-regexp');
const operators = require('glsl-tokenizer/lib/operators');

const SPACES_AROUND_OPERATORS_REGEX = new RegExp(
  `\\s*(${operators.map(escapeStringRegexp).join('|')})\\s*`,
  'g',
);

const clean = () => del(['build', 'dist']);

// https://github.com/mrdoob/three.js/blob/dev/utils/build/rollup.config.js
function glConstants() {
  const constants = {
    TRIANGLES: 4,
    DEPTH_BUFFER_BIT: 256,
    CULL_FACE: 2884,
    DEPTH_TEST: 2929,
    FLOAT: 5126,
    COLOR_BUFFER_BIT: 16384,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    ACTIVE_UNIFORMS: 35718,
    ACTIVE_ATTRIBUTES: 35721,
  };

  return {
    transform(code) {
      return code.replace(/gl\.([A-Z0-9_]+)/g, (match, name) => {
        if (constants[name]) return constants[name];
        console.log('* Unhandled GL Constant:', name);
        return match;
      });
    },
  };
}

function glsl() {
  function minify(code) {
    return (
      code
        // Remove //
        .replace(/\s*\/\/.*\n/g, '')
        // Remove /* */
        .replace(/\s*\/\*[\s\S]*?\*\//g, '')
        // # \n+ to \n
        .replace(/\n{2,}/g, '\n')
        // Remove tabs and consecutive spaces with a single space
        .replace(/\s{2,}|\t/g, ' ')
        .split('\n')
        .map((line, index, array) => {
          line = line.trim();

          // Remove spaces around operators if not an #extension directive.
          // For example, #extension GL_OES_standard_derivatives : enable.
          if (!line.startsWith('#extension')) {
            line = line.replace(SPACES_AROUND_OPERATORS_REGEX, '$1');
          }

          // Append newlines after preprocessor directives.
          if (line[0] === '#') {
            line += '\n';

            // Append newlines before the start of preprocessor directive blocks.
            if (index > 0) {
              if (array[index - 1][0] !== '#') {
                line = '\n' + line;
              }
            }
          }

          return line;
        })
        .join('')
    );
  }

  return {
    transform(code, id) {
      if (!id.endsWith('.glsl.js')) {
        return;
      }

      const startIndex = code.indexOf('`');
      const prefix = code.slice(0, startIndex);
      const endIndex = code.lastIndexOf('`');
      const glslString = code.slice(startIndex + 1, endIndex - 1).trim();

      return `${prefix}\`${minify(glslString)}\``;
    },
  };
}

function replace() {
  return {
    transform(code) {
      var transformedCode = code;
      [
        [/directionalLights/g, 'dL'],
        [/modelViewMatrix/g, 'mVM'],
        [/fogPosition/g, 'fP'],
        [/fogColor/g, 'fC'],
        [/fogNear/g, 'fN'],
        [/fogFar/g, 'fF'],
      ].map(([a, b]) => {
        transformedCode = transformedCode.replace(a, b);
      });
      return transformedCode;
    },
  };
}

function bundle() {
  return rollup({
    input: 'src/index.js',
    plugins: [glConstants(), glsl(), replace()],
  })
    .then(bundle =>
      bundle.write({
        file: 'build/bundle.js',
        format: 'iife',
      }),
    )
    .catch(error => console.error(error));
}

function minify() {
  return gulp
    .src('build/bundle.js')
    .pipe(
      $.terser({
        compress: {
          drop_console: true,
          ecma: 2020,
          module: true,
          passes: 2,
          unsafe_arrows: true,
        },
        mangle: {
          module: true,
        },
      }),
    )
    .pipe(gulp.dest('dist'));
}

function html() {
  return gulp
    .src('./index.html')
    .pipe(
      $.htmlmin({
        collapseWhitespace: true,
        minifyCSS: true,
        removeAttributeQuotes: true,
        removeComments: true,
        removeOptionalTags: true,
      }),
    )
    .pipe($.replace('./src/index.js', './bundle.js'))
    .pipe(gulp.dest('dist'));
}

function compress() {
  return gulp
    .src('dist/**/*')
    .pipe($.zip('build.zip'))
    .pipe($.size())
    .pipe($.size({ pretty: false }))
    .pipe(gulp.dest('build'));
}

const js = gulp.series(bundle, minify);
const build = gulp.series(clean, gulp.parallel(html, js));
const dist = gulp.series(build, compress);

module.exports = {
  build,
  bundle,
  clean,
  compress,
  dist,
  html,
  js,
  minify,
};
