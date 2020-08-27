import { boxGeom_create } from './boxGeom.js';
import { align } from './boxTransforms.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_rotateY } from './object3d.js';

export var file_create = color => {
  var mesh = mesh_create(
    align('ny')(boxGeom_create(24, 32, 2)),
    material_create(),
  );
  Object.assign(mesh.material.color, color);
  mesh.position.y += 4;
  object3d_rotateY(mesh, Math.PI / 3);
  return mesh;
};
