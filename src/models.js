import { colors } from './boxColors.js';
import { boxGeom_create } from './boxGeom.js';
import { $scale, $translateY, align, relativeAlign } from './boxTransforms.js';
import { clone, geom_create, merge, scale, translate } from './geom.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { compose } from './utils.js';
import { vec3_setScalar } from './vec3.js';

export var file_create = color => {
  var mesh = mesh_create(
    align('ny')(boxGeom_create(24, 32, 2)),
    material_create(),
  );
  Object.assign(mesh.material.color, color);
  mesh.position.y += 4;
  return mesh;
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
  vec3_setScalar(material.color, 1.2);
  material.shininess = 0;

  return mesh_create(geometry, material);
};
