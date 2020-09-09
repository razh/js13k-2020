import { boxGeom_create } from './boxGeom.js';
import { nx_ny_nz, nx_ny_pz, px_ny_nz, px_ny_pz } from './boxIndices.js';
import { align } from './boxTransforms.js';
import { clone, geom_create, merge, translate } from './geom.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { compose } from './utils.js';
import { vec3_setScalar } from './vec3.js';

export var selection_create = () => {
  var size = 32;
  var height = 2;
  var segmentWidth = 12;
  var segmentDepth = 2;

  var segmentWidthGeometry = boxGeom_create(segmentWidth, height, segmentDepth);
  var segmentDepthGeometry = boxGeom_create(segmentDepth, height, segmentWidth);

  var geometry = compose(
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
          merge,
        ),
      ),
    ),
  )(geom_create());

  var material = material_create();
  vec3_setScalar(material.emissive, 1);

  return mesh_create(geometry, material);
};
