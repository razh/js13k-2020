/* global canvas */

// import { playBassline } from './audio.js';
import { bufferGeom_fromGeom } from './bufferGeom.js';
import { camera_create, camera_updateProjectionMatrix } from './camera.js';
import { DEBUG } from './constants.js';
import { controls_create } from './controls.js';
import { entity_update } from './entity.js';
import { map0 } from './maps.js';
import { mat4_getInverse, mat4_multiplyMatrices } from './mat4.js';
import {
  object3d_create,
  object3d_traverse,
  object3d_updateWorldMatrix,
} from './object3d.js';
import { pointerLock_create } from './pointerLock.js';
import {
  createFloat32Buffer,
  createShaderProgram,
  getAttributeLocations,
  getUniformLocations,
  setFloat32Attribute,
  setFloatUniform,
  setMat4Uniform,
  setVec3Uniform,
} from './shader.js';
import frag from './shaders/phong_frag.glsl.js';
import vert from './shaders/phong_vert.glsl.js';
import { shadowMesh_update } from './shadowMesh.js';
import {
  vec3_create,
  vec3_multiplyScalar,
  vec3_setFromMatrixPosition,
  vec3_sub,
  vec3_transformDirection,
} from './vec3.js';

var gl = canvas.getContext('webgl');

gl.clearColor(0, 0, 0, 0);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.getExtension('OES_standard_derivatives');

var running = false;

// Scene
var scene = object3d_create();
scene.fogColor = vec3_create();
scene.fogNear = 1;
scene.fogFar = 1000;

// Camera
var camera = camera_create(90);
if (DEBUG) {
  pointerLock_create(controls_create(camera), canvas);
}

var lights = map0(gl, scene, camera);

// Shader
var program = createShaderProgram(
  gl,
  vert,
  frag.replace(/NUM_DIR_LIGHTS/g, lights.directional.length),
);

gl.useProgram(program);

var attributes = getAttributeLocations(gl, program);
var uniforms = getUniformLocations(gl, program);

var dt = 1 / 60;
var accumulatedTime = 0;
var previousTime;

var update = () => {
  var time = (performance.now() || 0) * 1e-3;
  if (!previousTime) {
    previousTime = time;
  }

  var frameTime = Math.min(time - previousTime, 0.1);
  accumulatedTime += frameTime;
  previousTime = time;

  while (accumulatedTime >= dt) {
    object3d_traverse(scene, object => {
      entity_update(object, dt, scene);
    });

    accumulatedTime -= dt;
  }
};

var bufferGeomBuffers = new WeakMap();

var setFloat32AttributeBuffer = (name, location, bufferGeom, size) => {
  var buffers = bufferGeomBuffers.get(bufferGeom) || {};
  bufferGeomBuffers.set(bufferGeom, buffers);

  var buffer = buffers[name] || createFloat32Buffer(gl, bufferGeom[name]);
  buffers[name] = buffer;

  setFloat32Attribute(gl, location, buffer, size);
};

var bufferGeoms = new WeakMap();

var renderMesh = mesh => {
  var { geometry, material } = mesh;

  setVec3Uniform(gl, uniforms.fogColor, scene.fogColor);
  setFloatUniform(gl, uniforms.fogNear, scene.fogNear);
  setFloatUniform(gl, uniforms.fogFar, scene.fogFar);

  setVec3Uniform(gl, uniforms.diffuse, material.color);
  setVec3Uniform(gl, uniforms.specular, material.specular);
  setFloatUniform(gl, uniforms.shininess, material.shininess);
  setVec3Uniform(gl, uniforms.emissive, material.emissive);

  mat4_multiplyMatrices(
    mesh.modelViewMatrix,
    camera.matrixWorldInverse,
    mesh.matrixWorld,
  );

  setMat4Uniform(gl, uniforms.modelViewMatrix, mesh.modelViewMatrix);
  setMat4Uniform(gl, uniforms.projectionMatrix, camera.projectionMatrix);

  var bufferGeom = bufferGeoms.get(geometry) || bufferGeom_fromGeom(geometry);
  bufferGeoms.set(geometry, bufferGeom);

  setFloat32AttributeBuffer('position', attributes.position, bufferGeom, 3);
  setFloat32AttributeBuffer('color', attributes.color, bufferGeom, 3);

  gl.drawArrays(gl.TRIANGLES, 0, bufferGeom.position.length / 3);
};

var lightDirection = vec3_create();

var render = () => {
  object3d_updateWorldMatrix(scene);
  mat4_getInverse(camera.matrixWorldInverse, camera.matrixWorld);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  setVec3Uniform(gl, uniforms.ambient, lights.ambient);

  lights.directional.map((light, index) => {
    var temp = vec3_create();

    var direction = vec3_setFromMatrixPosition(
      lightDirection,
      light.matrixWorld,
    );
    vec3_setFromMatrixPosition(temp, light.target.matrixWorld);
    vec3_transformDirection(
      vec3_sub(direction, temp),
      camera.matrixWorldInverse,
    );

    var color = vec3_multiplyScalar(
      Object.assign(temp, light.color),
      light.intensity,
    );

    setVec3Uniform(
      gl,
      uniforms[`directionalLights[${index}].direction`],
      direction,
    );
    setVec3Uniform(gl, uniforms[`directionalLights[${index}].color`], color);
  });

  object3d_traverse(scene, object => {
    if (object.visible && object.geometry && object.material) {
      renderMesh(object);

      if (object.shadow) {
        var { y } = object.shadow.position;
        // Calculate shadow bias (only accounts for y-axis delta).
        object.shadow.position.y += 0.001 * (camera.position.y - y);
        shadowMesh_update(object.shadow, object.shadow.light.position);
        renderMesh(object.shadow);
        object.shadow.position.y = y;
      }
    }
  });
};

var animate = () => {
  update();
  render();

  if (running) {
    requestAnimationFrame(animate);
  }
};

var setSize = (width, height) => {
  canvas.width = width * (devicePixelRatio || 1);
  canvas.height = height * (devicePixelRatio || 1);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  gl.viewport(0, 0, canvas.width, canvas.height);

  camera.aspect = width / height;
  camera_updateProjectionMatrix(camera);
};

setSize(innerWidth, innerHeight);
animate();

addEventListener('resize', () => {
  setSize(innerWidth, innerHeight);
  render();
});

// var playMusic = async () => {
//   await playBassline();
//   if (running) {
//     // eslint-disable-next-line no-unused-vars
//     await playMusic();
//   }
// };

addEventListener('keypress', event => {
  // Pause/play.
  if (event.code === 'KeyP') {
    running = !running;
    if (running) {
      animate();
    } else {
      document.exitPointerLock();
    }
  }
});

addEventListener('click', () => {
  if (!running) {
    running = true;
    animate();
    // playMusic();
  }
});
