import { boxGeom_create } from './boxGeom.js';
import { camera_lookAt } from './camera.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { mesh_create } from './mesh.js';
import { object3d_add, object3d_create } from './object3d.js';
import {
  BODY_DYNAMIC,
  BODY_STATIC,
  get_physics_component,
  physics_add,
  physics_bodies,
  physics_update,
} from './physics.js';
import { player_create, player_update } from './player.js';
import { shadowMesh_create } from './shadowMesh.js';
import { vec3_create, vec3_set } from './vec3.js';

var keys = keys_create();

export var map0 = (gl, scene, camera) => {
  var map = object3d_create();
  object3d_add(scene, map);

  // Lights
  var ambient = vec3_create(0.5, 0.5, 0.5);

  var light0 = light_create(vec3_create(1, 1, 1));
  light0.intensity = 3;
  vec3_set(light0.position, 512, 256, 512);

  var directional = [light0];
  directional.map(light => object3d_add(map, light));

  // Camera
  var cameraObject = object3d_create();
  object3d_add(cameraObject, camera);
  object3d_add(map, cameraObject);

  vec3_set(camera.position, 0, 256, 128);
  camera_lookAt(camera, vec3_create());

  // Action
  var playerMesh = physics_add(
    mesh_create(boxGeom_create(32, 32, 32), material_create()),
    BODY_DYNAMIC,
  );
  playerMesh.position.y += 16;
  object3d_add(map, playerMesh);

  var playerPhysics = get_physics_component(playerMesh);
  playerPhysics.update = () => {};
  var player = player_create(playerMesh, playerPhysics);
  player.scene = map;

  var groundMesh = physics_add(
    mesh_create(boxGeom_create(2048, 64, 2048), material_create()),
    BODY_STATIC,
  );
  vec3_set(groundMesh.material.color, 0.5, 0.5, 0.5);
  groundMesh.position.y -= 32;
  object3d_add(map, groundMesh);

  var createShadow = mesh => {
    var shadowMesh = shadowMesh_create(mesh);
    shadowMesh.position.y = 0.1;
    shadowMesh.light = light0;
    mesh.shadow = shadowMesh;
  };

  createShadow(playerMesh);

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
    }),
  );

  return {
    ambient,
    directional,
  };
};
