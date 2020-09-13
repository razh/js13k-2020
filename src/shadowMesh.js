import { mat4_create, mat4_multiplyMatrices } from './mat4.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { vec3_clone, vec3_dot, vec3_Y } from './vec3.js';

var shadowMatrix = mat4_create();
var normal = vec3_clone(vec3_Y);
var w = 0.001;

var shadowMaterial = material_create();

export var shadowMesh_create = mesh => {
  return {
    ...mesh_create(mesh.geometry, shadowMaterial),
    mesh,
  };
};

// amount of light-ray divergence. Ranging from:
// 0.001 = sunlight(min divergence) to 1.0 = pointlight(max divergence)
// must be slightly greater than 0, due to 0 causing matrixInverse errors
export var shadowMesh_update = (shadowMesh, lightPosition) => {
  var { y } = shadowMesh.position;

  // based on https://www.opengl.org/archives/resources/features/StencilTalk/tsld021.htm
  var dot = vec3_dot(normal, lightPosition) - y * w;

  shadowMatrix.set([
    dot - lightPosition.x * normal.x,
    -lightPosition.y * normal.x,
    -lightPosition.z * normal.x,
    -w * normal.x,

    -lightPosition.x * normal.y,
    dot - lightPosition.y * normal.y,
    -lightPosition.z * normal.y,
    -w * normal.y,

    -lightPosition.x * normal.z,
    -lightPosition.y * normal.z,
    dot - lightPosition.z * normal.z,
    -w * normal.z,

    -lightPosition.x * -y,
    -lightPosition.y * -y,
    -lightPosition.z * -y,
    dot - w * -y,
  ]);

  mat4_multiplyMatrices(
    shadowMesh.matrixWorld,
    shadowMatrix,
    shadowMesh.mesh.matrixWorld,
  );
};
