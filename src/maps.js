import { colors } from './boxColors.js';
import { boxGeom_create } from './boxGeom.js';
import { $scale, align } from './boxTransforms.js';
import { camera_lookAt } from './camera.js';
import { color_CYAN, color_ORANGE, color_YELLOW } from './constants.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { randFloat } from './math.js';
import { mesh_create } from './mesh.js';
import { file_create, mac_create, text_create } from './models.js';
import {
  object3d_add,
  object3d_create,
  object3d_remove,
  object3d_rotateY,
  object3d_updateWorldMatrix,
} from './object3d.js';
import {
  BODY_DYNAMIC,
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
  physics_update,
} from './physics.js';
import { player_create, player_update } from './player.js';
import {
  quat_create,
  quat_rotateTowards,
  quat_setFromAxisAngle,
} from './quat.js';
import { ray_create, ray_intersectObjects } from './ray.js';
import { selection_create } from './selection.js';
import { shadowMesh_create } from './shadowMesh.js';
import { compose, sample } from './utils.js';
import {
  vec3_applyQuaternion,
  vec3_create,
  vec3_cross,
  vec3_divideScalar,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_round,
  vec3_set,
  vec3_setFromMatrixPosition,
  vec3_setScalar,
  vec3_subVectors,
  vec3_Y,
} from './vec3.js';

var DEBUG = true;

var keys = keys_create();

var CELL_SIZE = 32;
var SHADOW_BIAS = 0.1;

var _q0 = quat_create();
var _r0 = ray_create();
var _v0 = vec3_create();
var _v1 = vec3_create();

var worldToGrid = vector => vec3_round(vec3_divideScalar(vector, CELL_SIZE));
var gridToWorld = vector => vec3_multiplyScalar(vector, CELL_SIZE);

export var map0 = (gl, scene, camera) => {
  var map = object3d_create();
  object3d_add(scene, map);

  // Lights
  var ambient = vec3_create(0.2, 0.1, 0.3);
  Object.assign(scene.fogColor, ambient);

  var light0 = light_create(vec3_create(1, 1, 1.2));
  light0.intensity = 3;
  vec3_set(light0.position, 512, 256, 512);

  var directional = [light0];
  directional.map(light => object3d_add(map, light));

  // Camera
  var cameraObject = object3d_create();
  object3d_add(cameraObject, camera);
  object3d_add(map, cameraObject);

  vec3_set(camera.position, 0, 128, 128);
  camera_lookAt(camera, vec3_create());

  // Action
  var playerMesh = physics_add(mac_create(), BODY_DYNAMIC);
  object3d_add(map, playerMesh);

  var playerPhysics = get_physics_component(playerMesh);
  playerPhysics.update = () => {};
  var player = player_create(playerMesh, playerPhysics);
  player.scene = map;

  var alignTop = align('py');
  var alignBottom = align('ny');

  var groundMesh = physics_add(
    mesh_create(alignTop(boxGeom_create(2048, 64, 2048)), material_create()),
    BODY_STATIC,
  );
  Object.assign(groundMesh.material.color, color_CYAN);
  object3d_add(map, groundMesh);

  var createShadow = mesh => {
    var shadowMesh = shadowMesh_create(mesh);
    shadowMesh.position.y = SHADOW_BIAS;
    shadowMesh.light = light0;
    mesh.shadow = shadowMesh;
  };

  createShadow(playerMesh);

  var selectionMesh = selection_create();
  object3d_add(map, selectionMesh);

  var selectedMesh;

  var fileMeshes = [...Array(3)].map((_, index) => {
    var [color, text] = sample([
      [color_ORANGE, 'HTML'],
      [color_CYAN, 'CSS'],
      [color_YELLOW, 'JS'],
    ]);
    var mesh = file_create(color);
    mesh.position.x = -64 * (index + 1);
    mesh.position.y = 4;
    var frontTextMesh = text_create(text);
    var backTextMesh = text_create(text);
    vec3_set(backTextMesh.scale, -1, 1, -1);
    vec3_set(frontTextMesh.position, 0, 12, 1);
    vec3_set(backTextMesh.position, 0, 12, -1);
    object3d_add(mesh, frontTextMesh);
    object3d_add(mesh, backTextMesh);
    createShadow(mesh);
    object3d_add(map, mesh);
    return mesh;
  });

  var createBlock = ([dimensions, position, transform = alignBottom]) => {
    var mesh = physics_add(
      mesh_create(transform(boxGeom_create(...dimensions)), material_create()),
      BODY_STATIC,
    );
    vec3_set(mesh.position, ...position);
    createShadow(mesh);
    object3d_add(map, mesh);
    return mesh;
  };

  var blockTransform = compose(
    alignBottom,
    colors({ all: color_YELLOW, ny: color_CYAN }),
    geom =>
      $scale({ py: { x: randFloat(0.8, 0.9), z: randFloat(0.8, 0.9) } })(geom),
  );

  // Blocks
  [
    [[128, 32, 128], [0, 0, -256], blockTransform],
    [[96, 32, 128], [-256, 0, -160], blockTransform],
    [[128, 32, 64], [0, 0, 128], blockTransform],
  ].map(createBlock);

  var wishForward = 0;
  var wishRight = 0;

  var groundMeshes;

  var traceGround = mesh => {
    Object.assign(_r0.origin, mesh.position);
    _r0.origin.y += CELL_SIZE;
    vec3_set(_r0.direction, 0, -1, 0);
    return ray_intersectObjects(_r0, groundMeshes)?.[0];
  };

  var traceShadow = mesh => {
    // Use mesh.matrixWorld to account for parent transforms.
    object3d_updateWorldMatrix(mesh);
    vec3_setFromMatrixPosition(_r0.origin, mesh.matrixWorld);
    vec3_subVectors(_r0.direction, _r0.origin, light0.position);
    return ray_intersectObjects(_r0, groundMeshes)?.[0];
  };

  entity_add(
    map,
    component_create((component, dt) => {
      var bodies = physics_bodies(map);
      physics_update(bodies);

      player.dt = dt;

      player.command.forward = 0;
      player.command.right = 0;
      player.command.up = 0;

      if (keys.KeyW || keys.ArrowUp) player.command.forward++;
      if (keys.KeyS || keys.ArrowDown) player.command.forward--;
      if (keys.KeyA || keys.ArrowLeft) player.command.right--;
      if (keys.KeyD || keys.ArrowRight) player.command.right++;
      if (keys.Space) player.command.up++;

      var movespeed = 127;
      player.command.forward *= movespeed;
      player.command.right *= movespeed;
      player.command.up *= movespeed;

      vec3_set(player.viewForward, 0, 0, -1);
      vec3_set(player.viewRight, 1, 0, 0);

      if (DEBUG) {
        vec3_applyQuaternion(
          vec3_set(player.viewForward, 0, 0, -1),
          camera.quaternion,
        );
        vec3_normalize(
          vec3_cross(vec3_set(player.viewRight, 0, -1, 0), player.viewForward),
        );
      }

      player_update(player);

      if (DEBUG) {
        Object.assign(cameraObject.position, playerMesh.position);
      }

      if (player.command.forward || player.command.right) {
        wishForward = Math.sign(player.command.forward);
        wishRight = Math.sign(player.command.right);

        quat_setFromAxisAngle(_q0, vec3_Y, Math.atan2(wishRight, -wishForward));
        quat_rotateTowards(playerMesh.quaternion, _q0, 12 * dt);
      }

      groundMeshes = physics_bodies(scene)
        .filter(body => body.physics === BODY_STATIC)
        .map(body => body.parent);

      [...fileMeshes, playerMesh].map(
        mesh =>
          (mesh.shadow.position.y =
            (traceShadow(mesh)?.point.y || 0) + SHADOW_BIAS),
      );

      Object.assign(selectionMesh.position, playerMesh.position);
      worldToGrid(selectionMesh.position);
      selectionMesh.position.x += wishRight;
      selectionMesh.position.z -= wishForward;
      Object.assign(_v0, selectionMesh.position);
      gridToWorld(selectionMesh.position);
      selectionMesh.position.y = playerMesh.position.y;
      selectionMesh.position.y = traceGround(selectionMesh)?.point.y || 0;

      fileMeshes.map(mesh => object3d_rotateY(mesh, dt));
    }),
  );

  document.addEventListener('keydown', event => {
    if (event.code === 'KeyE') {
      if (selectedMesh) {
        object3d_remove(playerMesh, selectedMesh);
        object3d_add(map, selectedMesh);
        Object.assign(selectedMesh.position, selectionMesh.position);
        vec3_setScalar(selectedMesh.scale, 1);
        selectedMesh = undefined;
      } else {
        selectedMesh = fileMeshes.find(mesh => {
          Object.assign(_v1, mesh.position);
          worldToGrid(_v1);
          return _v0.x === _v1.x && _v0.z === _v1.z;
        });
        if (selectedMesh) {
          object3d_remove(map, selectedMesh);
          object3d_add(playerMesh, selectedMesh);
          vec3_set(selectedMesh.position, 16, 24, 16);
          vec3_setScalar(selectedMesh.scale, 0.5);
        }
      }
    }
  });

  return {
    ambient,
    directional,
  };
};
