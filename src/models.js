import { colors } from './boxColors.js';
import { boxGeom_create } from './boxGeom.js';
import { $scale, $translateY, align, relativeAlign } from './boxTransforms.js';
import { clone, geom_create, merge, scale, translate } from './geom.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { compose } from './utils.js';
import {
  vec3_addScaledVector,
  vec3_create,
  vec3_length,
  vec3_setScalar,
  vec3_subVectors,
} from './vec3.js';

var _v0 = vec3_create();

export var bridge_create = (start, end, height = start.y) => {
  vec3_subVectors(_v0, start, end);
  var width = 48;
  var length = vec3_length(_v0);
  var isX = _v0.x !== 0;
  var direction = isX ? 'x' : 'z';

  var deckHeight = 12;
  var capHeight = 8;

  var pierWidth = 24;
  var pierHeight = height - deckHeight - capHeight;
  var pierSpacing = 128;
  var pierCount = Math.floor(length / pierSpacing) - 1;

  var deck = align('py')(
    isX
      ? boxGeom_create(length, deckHeight, width)
      : boxGeom_create(width, deckHeight, length),
  );

  var piers = [...Array(pierCount)].flatMap((_, index) => {
    var offset = pierSpacing * (index + 1);

    var cap = compose(
      relativeAlign('py', deck, 'ny'),
      $scale({ py: { [direction]: 2 } }),
    )(
      isX
        ? boxGeom_create(pierWidth, capHeight, width)
        : boxGeom_create(width, capHeight, pierWidth),
    );

    var pier = compose(
      relativeAlign('py', cap, 'ny'),
      colors({ py: [1, 1, 1], ny: [0, 0, 0] }),
    )(
      isX
        ? boxGeom_create(pierWidth, pierHeight, width)
        : boxGeom_create(width, pierHeight, pierWidth),
    );

    return [cap, pier].map(
      isX ? translate(offset, 0, 0) : translate(0, 0, offset),
    );
  });

  return [
    // Align deck to start.
    align(isX ? 'nx_py' : 'py_nz')(deck),
    ...piers,
  ].map(geometry => {
    var material = material_create();
    vec3_setScalar(material.color, 1.5);
    return mesh_create(
      translate(start.x, start.y, start.z)(geometry),
      material,
    );
  });
};

export var file_create = color => {
  var material = material_create();
  Object.assign(material.color, color);
  vec3_addScaledVector(material.emissive, color, 0.1);

  return mesh_create(
    compose(align('ny'), translate(0, 4, 0))(boxGeom_create(28, 32, 2)),
    material,
  );
};

export var mac_create = () => {
  var size = 24;
  var height = 32;
  var baseSize = 20;
  var baseHeight = 6;
  var bodyHeight = height - baseHeight;
  var backScale = { x: 0.8 };

  var base = compose(
    align('ny'),
    $scale({ ny: [baseSize / size, 1, baseSize / size], nz: backScale }),
  )(boxGeom_create(size, baseHeight, size));

  var body = compose(
    $scale({ nz: backScale }),
    relativeAlign('ny', base, 'py'),
    $translateY({ py_nz: -6 }),
  )(boxGeom_create(size, bodyHeight, size));

  var screen = compose(
    colors({ all: [0.1, 0.2, 0.2] }),
    scale(0.8, 0.8, 1),
    relativeAlign('nz', body, 'pz'),
  )(boxGeom_create(size, bodyHeight, 0.5));

  var eye = compose(
    colors({ all: [1, 256, 2] }),
    relativeAlign('nz', screen, 'pz'),
  )(boxGeom_create(3, 8, 0.5));

  var geometry = compose(
    ...[
      base,
      body,
      screen,
      compose(clone(), translate(-4, 2, 0))(eye),
      compose(clone(), translate(4, 2, 0))(eye),
    ].map(merge),
  )(geom_create());

  var material = material_create();
  vec3_setScalar(material.color, 1.5);
  material.shininess = 0;

  return mesh_create(geometry, material);
};

export var text_create = string => {
  var scale = 1.5;
  var charWidth = 3;
  var charSpacing = 0.8;
  var charHeight = 5;

  var geometry = compose(
    ...string
      .split('')
      .flatMap((char, index) => {
        var parameters = {
          C: [
            [1, 4],
            [3, 1],
            [3, 1, 0, 4],
          ],
          H: [
            [1, 5],
            [1, 1, 1, 2],
            [1, 5, 2],
          ],
          J: [
            [1, 5, 2],
            [2, 1, 0, 4],
          ],
          L: [
            [1, 5],
            [2, 1, 1, 4],
          ],
          M: [
            [1, 5],
            [1, 2, 1],
            [1, 5, 2],
          ],
          S: [
            [3, 1],
            [1, 1, 0, 1],
            [3, 1, 0, 2],
            [1, 1, 2, 3],
            [3, 1, 0, 4],
          ],
          T: [
            [3, 1],
            [1, 4, 1, 1],
          ],
        }[char];

        return parameters?.map(([x, y, xt = 0, yt = 0]) =>
          compose(
            align('nx_py'),
            translate(
              scale *
                (xt +
                  charWidth * (index - string.length / 2) +
                  charSpacing * (index - 1)),
              scale * (charHeight - yt),
              0,
            ),
            merge,
          )(boxGeom_create(scale * x, scale * y, 1)),
        );
      })
      .filter(Boolean),
  )(geom_create());

  var material = material_create();
  vec3_setScalar(material.color, 0.2);

  return mesh_create(geometry, material);
};
