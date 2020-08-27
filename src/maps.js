import { boxGeom_create } from './boxGeom.js';
import { align } from './boxTransforms.js';
import { camera_lookAt } from './camera.js';
import { color_CYAN, color_MAGENTA, color_YELLOW } from './constants.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { file_create } from './file.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_create, object3d_rotateY } from './object3d.js';
import {
  BODY_DYNAMIC,
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
  physics_update,
} from './physics.js';
import { player_create, player_update } from './player.js';
import { selection_create } from './selection.js';
import { shadowMesh_create } from './shadowMesh.js';
import { vec3_create, vec3_multiplyScalar, vec3_set } from './vec3.js';

var keys = keys_create();

var CELL_SIZE = 32;

var worldToGrid = (vector, position) =>
  vec3_set(
    vector,
    Math.round(position.x / CELL_SIZE),
    0,
    Math.round(position.z / CELL_SIZE),
  );

var gridToWorld = (vector, position) =>
  vec3_multiplyScalar(Object.assign(vector, position), CELL_SIZE);

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

  vec3_set(camera.position, 0, 160, 128);
  camera_lookAt(camera, vec3_create());

  // Action
  var playerMesh = physics_add(
    mesh_create(boxGeom_create(24, 32, 24), material_create()),
    BODY_DYNAMIC,
  );
  playerMesh.position.y += 16;
  Object.assign(playerMesh.material.color, color_MAGENTA);
  object3d_add(map, playerMesh);

  var playerPhysics = get_physics_component(playerMesh);
  playerPhysics.update = () => {};
  var player = player_create(playerMesh, playerPhysics);
  player.scene = map;

  var alignTop = align('py');

  var groundMesh = physics_add(
    mesh_create(alignTop(boxGeom_create(2048, 64, 2048)), material_create()),
    BODY_STATIC,
  );
  Object.assign(groundMesh.material.color, color_CYAN);
  object3d_add(map, groundMesh);

  var createShadow = mesh => {
    var shadowMesh = shadowMesh_create(mesh);
    shadowMesh.position.y = 0.1;
    shadowMesh.light = light0;
    mesh.shadow = shadowMesh;
  };

  createShadow(playerMesh);

  var selectionMesh = selection_create();
  object3d_add(map, selectionMesh);

  var fileMeshes = [color_CYAN, color_MAGENTA, color_YELLOW].map(
    (color, index) => {
      var mesh = file_create(color);
      mesh.position.x -= 64 * (index + 1);
      createShadow(mesh);
      object3d_add(map, mesh);
      return mesh;
    },
  );

  var wishForward = 0;
  var wishRight = 0;

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

      player_update(player);

      if (player.command.forward || player.command.right) {
        wishForward = Math.sign(player.command.forward);
        wishRight = Math.sign(player.command.right);
      }

      worldToGrid(selectionMesh.position, playerMesh.position);
      selectionMesh.position.x += wishRight;
      selectionMesh.position.z -= wishForward;
      gridToWorld(selectionMesh.position, selectionMesh.position);

      fileMeshes.map(mesh => object3d_rotateY(mesh, dt));
    }),
  );

  return {
    ambient,
    directional,
  };
};
