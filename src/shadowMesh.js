import { mat4_create, mat4_multiplyMatrices } from './mat4.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { vec3_clone, vec3_dot, vec3_setScalar, vec3_Y } from './vec3.js';

var shadowMatrix = mat4_create();
var normal = vec3_clone(vec3_Y);

var shadowMaterial = material_create();
vec3_setScalar(shadowMaterial.color, 0);
vec3_setScalar(shadowMaterial.specular, 0);
shadowMaterial.shininess = 0;

export var shadowMesh_create = mesh => {
  return {
    ...mesh_create(mesh.geometry, shadowMaterial),
    mesh,
  };
};

// amount of light-ray divergence. Ranging from:
// 0.001 = sunlight(min divergence) to 1.0 = pointlight(max divergence)
// must be slightly greater than 0, due to 0 causing matrixInverse errors
export var shadowMesh_update = (shadowMesh, lightPosition, w = 0.001) => {
  var { y } = shadowMesh.position;

  // based on https://www.opengl.org/archives/resources/features/StencilTalk/tsld021.htm
  var dot = vec3_dot(normal, lightPosition) - y * w;

  shadowMatrix[0] = dot - lightPosition.x * normal.x;
  shadowMatrix[4] = -lightPosition.x * normal.y;
  shadowMatrix[8] = -lightPosition.x * normal.z;
  shadowMatrix[12] = -lightPosition.x * -y;

  shadowMatrix[1] = -lightPosition.y * normal.x;
  shadowMatrix[5] = dot - lightPosition.y * normal.y;
  shadowMatrix[9] = -lightPosition.y * normal.z;
  shadowMatrix[13] = -lightPosition.y * -y;

  shadowMatrix[2] = -lightPosition.z * normal.x;
  shadowMatrix[6] = -lightPosition.z * normal.y;
  shadowMatrix[10] = dot - lightPosition.z * normal.z;
  shadowMatrix[14] = -lightPosition.z * -y;

  shadowMatrix[3] = -w * normal.x;
  shadowMatrix[7] = -w * normal.y;
  shadowMatrix[11] = -w * normal.z;
  shadowMatrix[15] = dot - w * -y;

  mat4_multiplyMatrices(
    shadowMesh.matrixWorld,
    shadowMatrix,
    shadowMesh.mesh.matrixWorld,
  );
};
