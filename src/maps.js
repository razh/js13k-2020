import { playPickup, playShoot } from './audio.js';
import { colors } from './boxColors.js';
import { boxGeom_create } from './boxGeom.js';
import { ny, py } from './boxIndices.js';
import { $scale, align } from './boxTransforms.js';
import { camera_lookAt } from './camera.js';
import { color_CYAN, color_ORANGE, color_YELLOW } from './constants.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { interval_create } from './interval.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { randFloat, randFloatSpread } from './math.js';
import { mesh_create } from './mesh.js';
import {
  bridge_create,
  controlPoint_create,
  controlPointGeom_create,
  file_create,
  mac_create,
  text_create,
  trail_create,
} from './models.js';
import {
  object3d_add,
  object3d_create,
  object3d_lookAt,
  object3d_remove,
  object3d_rotateY,
  object3d_updateWorldMatrix,
} from './object3d.js';
import {
  BODY_BULLET,
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
  vec3_add,
  vec3_addScaledVector,
  vec3_addVectors,
  vec3_applyQuaternion,
  vec3_create,
  vec3_cross,
  vec3_distanceTo,
  vec3_distanceToSquared,
  vec3_divideScalar,
  vec3_equals,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_round,
  vec3_set,
  vec3_setFromMatrixPosition,
  vec3_setScalar,
  vec3_subVectors,
  vec3_Y,
  vec3_Z,
} from './vec3.js';

var DEBUG = true;

var keys = keys_create();

var CELL_SIZE = 32;

var _q0 = quat_create();
var _r0 = ray_create();
var _v0 = vec3_create();
var _v1 = vec3_create();

var cameraDelta = vec3_create(0, 128, 128);

var worldToGrid = vector => vec3_round(vec3_divideScalar(vector, CELL_SIZE));
var gridToWorld = vector => vec3_multiplyScalar(vector, CELL_SIZE);

var findNearestObject = (point, objects) => {
  var nearestObject;
  var minDistanceSquared = Infinity;
  var distanceSquared;

  objects.map(object => {
    distanceSquared = vec3_distanceToSquared(object.position, point);
    if (distanceSquared < minDistanceSquared) {
      minDistanceSquared = distanceSquared;
      nearestObject = object;
    }
  });

  return nearestObject;
};

export var map0 = (gl, scene, camera) => {
  var map = object3d_create();
  object3d_add(scene, map);

  // Lights
  var ambient = vec3_create(0.2, 0.1, 0.3);
  Object.assign(scene.fogColor, ambient);

  var light0 = light_create(vec3_create(1, 1, 1.2));
  light0.intensity = 1.5;
  vec3_set(light0.position, 256, 512, 256);

  var directional = [light0];
  directional.map(light => object3d_add(map, light));

  var createShadow = mesh => {
    var shadowMesh = shadowMesh_create(mesh);
    shadowMesh.light = light0;
    mesh.shadow = shadowMesh;
  };

  // Camera
  var cameraObject = object3d_create();
  object3d_add(cameraObject, camera);
  object3d_add(map, cameraObject);

  vec3_add(camera.position, cameraDelta);
  camera_lookAt(camera, vec3_create());

  // Action
  var playerMesh = physics_add(mac_create(), BODY_DYNAMIC);
  createShadow(playerMesh);
  object3d_add(map, playerMesh);

  var playerPhysics = get_physics_component(playerMesh);
  playerPhysics.update = () => {};
  var player = player_create(playerMesh, playerPhysics);
  player.scene = map;

  object3d_add(map, trail_create(player));

  var groundMesh = physics_add(
    mesh_create(align(py)(boxGeom_create(2048, 64, 2048)), material_create()),
    BODY_STATIC,
  );
  Object.assign(groundMesh.material.color, color_CYAN);
  object3d_add(map, groundMesh);

  var selectionMesh = selection_create();
  object3d_add(map, selectionMesh);

  var selectedMesh;

  var fileMeshes = [...Array(6)].map((_, index) => {
    var [color, text] = sample([
      [color_ORANGE, 'HTML'],
      [color_CYAN, 'CSS'],
      [color_YELLOW, 'JS'],
    ]);
    var mesh = file_create(color);
    mesh.position.x = -64 * (index + 1);
    var frontTextMesh = text_create(text);
    var backTextMesh = text_create(text);
    vec3_set(backTextMesh.scale, -1, 1, -1);
    vec3_set(frontTextMesh.position, 0, 16, 1);
    vec3_set(backTextMesh.position, 0, 16, -1);
    object3d_add(mesh, frontTextMesh);
    object3d_add(mesh, backTextMesh);
    createShadow(mesh);
    object3d_add(map, mesh);
    return mesh;
  });

  var controlPointMeshes = [
    [64, 0, 0],
    [0, 0, 256],
  ].map(position => {
    var mesh = physics_add(controlPoint_create(), BODY_STATIC);
    mesh.geometry = controlPointGeom_create();
    createShadow(mesh);
    vec3_set(mesh.position, ...position);
    object3d_add(map, mesh);
    return mesh;
  });

  var findFileAt = mesh => {
    worldToGrid(Object.assign(_v0, mesh.position));
    return fileMeshes.find(fileMesh =>
      vec3_equals(_v0, worldToGrid(Object.assign(_v1, fileMesh.position))),
    );
  };

  // Bridges
  [
    [
      [-992, 96, -64],
      [256, 96, -64],
    ],
    [
      [96, 64, -160],
      [96, 64, 256],
    ],
    [
      [-96, 128, -512],
      [-96, 128, 512],
    ],
  ]
    .flatMap(([start, end, height]) =>
      bridge_create(vec3_create(...start), vec3_create(...end), height),
    )
    .map(mesh => {
      var physicsMesh = physics_add(mesh, BODY_STATIC);
      createShadow(physicsMesh);
      object3d_add(map, physicsMesh);
    });

  var createBlock = ([dimensions, position, transform = align(ny)]) => {
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
    align(ny),
    colors([py, color_YELLOW], [ny, color_CYAN]),
    geom =>
      $scale([py, { x: randFloat(0.8, 0.9), z: randFloat(0.8, 0.9) }])(geom),
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

  var bulletInterval = interval_create(0.2);

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
        vec3_addVectors(camera.position, playerMesh.position, cameraDelta);
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
        mesh => (mesh.shadow.position.y = traceShadow(mesh)?.point.y || 0),
      );

      Object.assign(selectionMesh.position, playerMesh.position);
      worldToGrid(selectionMesh.position);
      selectionMesh.position.x += wishRight;
      selectionMesh.position.z -= wishForward;
      gridToWorld(selectionMesh.position);
      selectionMesh.position.y = playerMesh.position.y;
      selectionMesh.visible = true;
      // Snap to nearest file if no current selection.
      var nearestFileMesh;
      var nearestControlPointMesh;
      if (
        !selectedMesh &&
        (nearestFileMesh = findNearestObject(
          playerMesh.position,
          fileMeshes,
        )) &&
        vec3_distanceTo(playerMesh.position, nearestFileMesh.position) <
          Math.SQRT2 * CELL_SIZE
      ) {
        Object.assign(selectionMesh.position, nearestFileMesh.position);
      }

      // Snap to nearest control point if selection exists.
      else if (
        selectedMesh &&
        (nearestControlPointMesh = findNearestObject(
          playerMesh.position,
          controlPointMeshes,
        )) &&
        vec3_distanceTo(playerMesh.position, nearestControlPointMesh.position) <
          Math.SQRT2 * CELL_SIZE
      ) {
        Object.assign(selectionMesh.position, nearestControlPointMesh.position);
        // Trace down to control point mesh.
        selectionMesh.position.y = traceGround(selectionMesh)?.point.y || 0;
      }

      // Find nearest reachable ground.
      else {
        selectionMesh.position.y = traceGround(selectionMesh)?.point.y || 0;
        selectionMesh.visible =
          vec3_distanceTo(selectionMesh.position, playerMesh.position) <
          2 * CELL_SIZE;
      }

      // Prevent multiple files at the same position.
      if (selectedMesh) {
        selectionMesh.visible =
          selectionMesh.visible && !findFileAt(selectionMesh);
      }

      fileMeshes.map(mesh => object3d_rotateY(mesh, dt));

      if (bulletInterval(dt) && !selectedMesh && keys.Enter) {
        bulletInterval.reset();
        playShoot();

        var bulletMaterial = material_create();
        vec3_set(bulletMaterial.emissive, 1, 1, 0.5);

        var time = 0;
        var bullet = entity_add(
          physics_add(
            mesh_create(boxGeom_create(4, 4, 12), bulletMaterial),
            BODY_BULLET,
          ),
          component_create((component, dt) => {
            time += dt;
            if (time > 4) {
              object3d_remove(map, bullet);
            }
          }),
        );
        var bulletPhysics = get_physics_component(bullet);
        vec3_applyQuaternion(Object.assign(_v1, vec3_Z), playerMesh.quaternion);
        // Bullets land in box of size 1 that is 16 units away.
        vec3_addScaledVector(
          vec3_set(
            _v0,
            randFloatSpread(1),
            randFloatSpread(1),
            randFloatSpread(1),
          ),
          _v1,
          16,
        );
        object3d_lookAt(bullet, _v0);
        vec3_applyQuaternion(Object.assign(_v0, vec3_Z), bullet.quaternion);
        Object.assign(bullet.position, playerMesh.position);
        bullet.position.y += 16;
        vec3_addScaledVector(bullet.position, _v0, 16);
        vec3_addScaledVector(bulletPhysics.velocity, _v0, 1200);
        object3d_add(map, bullet);

        bulletPhysics.collide = () => object3d_remove(map, bullet);
      }
    }),
  );

  addEventListener('keydown', event => {
    if (event.code === 'KeyE') {
      if (selectionMesh.visible) {
        if (selectedMesh) {
          object3d_remove(playerMesh, selectedMesh);
          object3d_add(map, selectedMesh);
          Object.assign(selectedMesh.position, selectionMesh.position);
          vec3_setScalar(selectedMesh.scale, 1);
          selectedMesh = undefined;
        } else {
          selectedMesh = findFileAt(selectionMesh);
          if (selectedMesh) {
            object3d_remove(map, selectedMesh);
            object3d_add(playerMesh, selectedMesh);
            vec3_set(selectedMesh.position, 16, 24, 16);
            vec3_setScalar(selectedMesh.scale, 0.5);
            playPickup();
          }
        }
      }
    }

    if (DEBUG) {
      if (event.code === 'Period') {
        console.log(playerMesh.position);
      }
    }
  });

  return {
    ambient,
    directional,
  };
};
