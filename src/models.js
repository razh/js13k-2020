import { colors } from './boxColors.js';
import { boxGeom_create } from './boxGeom.js';
import {
  all,
  nx_ny,
  nx_ny_nz,
  nx_ny_pz,
  nx_nz,
  nx_py,
  nx_pz,
  ny,
  ny_nz,
  nz,
  px_ny,
  px_ny_nz,
  px_ny_pz,
  px_nz,
  px_py,
  px_pz,
  py,
  py_nz,
  pz,
} from './boxIndices.js';
import {
  $scale,
  $translate,
  $translateY,
  align,
  relativeAlign,
} from './boxTransforms.js';
import { color_AMBIENT } from './constants.js';
import { component_create, entity_add } from './entity.js';
import { clone, geom_create, merge, scale, translate } from './geom.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_create } from './object3d.js';
import { compose } from './utils.js';
import {
  vec3_addScaledVector,
  vec3_clone,
  vec3_create,
  vec3_distanceTo,
  vec3_length,
  vec3_multiplyScalar,
  vec3_setScalar,
  vec3_subVectors,
} from './vec3.js';

var _v0 = vec3_create();

export var box = (dimensions, ...transforms) =>
  compose(...transforms)(boxGeom_create(...dimensions));

export var mergeAll = (...geoms) => compose(...geoms.map(merge))(geom_create());

export var spaceBetween = (start, end, count) => {
  var spacing = (end - start) / (count + 1);
  return [...Array(count)].map((_, index) => start + spacing * (index + 1));
};

export var bridge_create = (start, end, height = start.y) => {
  vec3_subVectors(_v0, start, end);
  var width = 64;
  var length = vec3_length(_v0);
  var isX = _v0.x;

  var deckHeight = 12;
  var capWidth = 24;
  var capHeight = 8;

  var pierWidth = 12;
  var pierHeight = height - deckHeight - capHeight;
  var pierDepth = 32;
  var pierSpacing = 128;
  var pierCount = ((length / pierSpacing) | 0) - 1;

  var deck = box(
    isX ? [length, deckHeight, width] : [width, deckHeight, length],
    align(py),
  );

  var piers = [...Array(pierCount)].flatMap((_, index) => {
    var offset = pierSpacing * (index + 1);

    var cap = box(
      isX ? [capWidth, capHeight, width] : [width, capHeight, capWidth],
      relativeAlign(py, deck, ny),
    );

    var pier = box(
      isX
        ? [pierWidth, pierHeight, pierDepth]
        : [pierDepth, pierHeight, pierWidth],
      relativeAlign(py, cap, ny),
      colors([py, 1], [ny, 0]),
    );

    return [cap, pier].map(
      isX ? translate(offset, 0, 0) : translate(0, 0, offset),
    );
  });

  return [
    // Align deck to start.
    align(isX ? nx_py : py_nz)(deck),
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

export var building0_create = () => {
  /*
  ┌───┬─┐
  │   ├─┘
  └───┘
  */

  var _256_256 = [256, 256, 256];
  var _256_128 = [256, 128, 256];
  var _128_256 = [128, 256, 128];
  var _128_128 = [128, 128, 128];
  var _128_64 = [128, 64, 128];
  var a = box(_256_128, align(ny));
  return compose(
    ...[a, box(_128_64, relativeAlign(ny_nz, a, py_nz))].map(merge),
  )(geom_create());
};

export var building1_create = () => {};
export var building2_create = () => {};

export var bulletGeometry = boxGeom_create(4, 4, 12);

export var controlPoint_create = () => {
  var size = 32;
  var height = 8;

  // Geometry used for bounding box.
  var geometry = box([size, height, size], align(ny));

  var material = material_create();
  vec3_setScalar(material.color, 0.3);

  return mesh_create(geometry, material);
};

var rotate45 = size =>
  $translate(
    [nx_nz, { x: size / 2 }],
    [px_nz, { z: size / 2 }],
    [px_pz, { x: -size / 2 }],
    [nx_pz, { z: -size / 2 }],
  );

export var controlPointGeom_create = () => {
  var size = 72;
  var height = 8;

  return box(
    [size, height, size],
    align(ny),
    rotate45(size),
    $scale([py, [0.75, 1, 0.75]]),
  );
};

export var file_create = color => {
  var material = material_create();
  Object.assign(material.color, color);
  vec3_addScaledVector(material.emissive, color, 0.1);

  return mesh_create(box([28, 32, 2], align(ny), translate(0, 4, 0)), material);
};

export var mac_create = isEnemy => {
  var size = 24;
  var height = 32;
  var baseSize = 20;
  var baseHeight = 6;
  var bodyHeight = height - baseHeight;
  var backScale = { x: 0.8 };

  var base = box(
    [size, baseHeight, size],
    align(ny),
    $scale([ny, [baseSize / size, 1, baseSize / size]], [nz, backScale]),
  );

  var body = box(
    [size, bodyHeight, size],
    $scale([nz, backScale]),
    relativeAlign(ny, base, py),
    $translateY([py_nz, -6]),
  );

  var screen = box(
    [size, bodyHeight, 0.5],
    colors([all, [0.1, 0.2, 0.2]]),
    scale(0.8, 0.8, 1),
    relativeAlign(nz, body, pz),
  );

  var eye = box(
    [3, isEnemy ? 12 : 8, 0.5],
    colors([all, isEnemy ? [256, 1, 1] : [1, 256, 2]]),
    relativeAlign(nz, screen, pz),
  );

  var geometry = mergeAll(
    base,
    body,
    screen,
    compose(
      clone(),
      translate(-4, 2, 0),
      ...(isEnemy ? [$translateY([px_py, -4], [nx_ny, 4])] : []),
    )(eye),
    compose(
      clone(),
      translate(4, 2, 0),
      ...(isEnemy ? [$translateY([nx_py, -4], [px_ny, 4])] : []),
    )(eye),
  );

  var material = material_create();
  vec3_setScalar(material.color, 1.5);
  if (isEnemy) material.color.x = 3;
  material.shininess = 0;

  return mesh_create(geometry, material);
};

export var selection_create = () => {
  var size = 32;
  var height = 2;
  var segmentWidth = 12;
  var segmentDepth = 2;

  var segmentWidthGeometry = box([segmentWidth, height, segmentDepth]);
  var segmentDepthGeometry = box([segmentDepth, height, segmentWidth]);

  var geometry = mergeAll(
    ...[
      [px_ny_pz, 1, 1],
      [px_ny_nz, 1, -1],
      [nx_ny_nz, -1, -1],
      [nx_ny_pz, -1, 1],
    ].flatMap(([alignment, x, z]) =>
      [segmentWidthGeometry, segmentDepthGeometry].map(
        compose(
          clone(),
          align(alignment),
          translate((x * size) / 2, 0, (z * size) / 2),
        ),
      ),
    ),
  );

  var material = material_create();
  vec3_setScalar(material.emissive, 1);

  return mesh_create(geometry, material);
};

export var text_create = string => {
  var charScale = 1.5;
  var charWidth = 3;
  var charSpacing = 0.8;
  var charHeight = 5;

  var geometry = mergeAll(
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
          box(
            [x, y, 1],
            align(nx_py),
            translate(
              xt +
                charWidth * (index - string.length / 2) +
                charSpacing * (index - 1),
              charHeight - yt,
              0,
            ),
            scale(charScale, charScale, 1),
          ),
        );
      })
      .filter(Boolean),
  );

  var material = material_create();
  vec3_setScalar(material.color, 0.2);

  return mesh_create(geometry, material);
};

export var trail_create = player => {
  var trails = object3d_create();
  var trailSize = 24;

  var geometry = box(
    [trailSize, trailSize / 2, trailSize],
    align(ny),
    rotate45(trailSize),
    $scale([py, 0.5]),
  );

  var material = material_create();
  vec3_setScalar(material.emissive, 0.5);

  var meshes = [...Array(8)].map(() => {
    var mesh = mesh_create(geometry, material);
    object3d_add(trails, mesh);
    mesh.visible = false;
    return mesh;
  });

  var prevPosition = vec3_clone(player.object.position);
  var trailDistance = 48;
  var decay = 4;

  return entity_add(
    trails,
    component_create((component, dt) => {
      if (
        player.walking &&
        vec3_distanceTo(player.object.position, prevPosition) > trailDistance
      ) {
        var mesh = meshes.find(mesh => !mesh.visible);
        if (mesh) {
          vec3_setScalar(mesh.scale, 1);
          Object.assign(prevPosition, player.object.position);
          Object.assign(mesh.position, prevPosition);
          mesh.visible = true;
        }
      }

      meshes.map(mesh => {
        if (mesh.visible) {
          vec3_multiplyScalar(mesh.scale, 1 - decay * dt);
          if (vec3_length(mesh.scale) < 0.01) {
            mesh.visible = false;
          }
        }
      });
    }),
  );
};

export var window_create = isX => {
  var width = 24;
  var height = 32;
  var depth = 1;

  var sillHeight = 2;
  var sillDepth = 2;

  var center = box(
    isX ? [width, height, depth] : [depth, height, width],
    colors([all, color_AMBIENT]),
  );

  return mergeAll(
    center,
    box(
      isX ? [width, sillHeight, sillDepth] : [sillDepth, sillHeight, width],
      isX
        ? relativeAlign(py_nz, center, ny_nz)
        : relativeAlign(nx_py, center, nx_ny),
      colors([all, 1.5]),
    ),
  );
};
