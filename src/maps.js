/* global score text u */
import {
  playExplosion,
  playHit,
  playPickup,
  playShoot,
  playSuccess,
} from './audio.js';
import { colors } from './boxColors.js';
import { ny, py } from './boxIndices.js';
import { $scale, align } from './boxTransforms.js';
import { camera_lookAt } from './camera.js';
import {
  color_AMBIENT,
  color_CYAN,
  color_GROUND,
  color_ORANGE,
  color_YELLOW,
  DEBUG,
} from './constants.js';
import { light_create } from './directionalLight.js';
import { component_create, entity_add } from './entity.js';
import { translate } from './geom.js';
import { interval_create } from './interval.js';
import { keys_create } from './keys.js';
import { material_create } from './material.js';
import { randFloat, randFloatSpread } from './math.js';
import { mesh_create } from './mesh.js';
import {
  box,
  bridge_create,
  building0_create,
  building1_create,
  building2_create,
  bulletGeometry,
  controlPoint_create,
  controlPointGeom_create,
  explosion_create,
  file_create,
  mac_create,
  selection_create,
  spaceBetween,
  text_create,
  trail_create,
  window_create,
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
import { shadowMesh_create } from './shadowMesh.js';
import { compose, sample } from './utils.js';
import {
  vec3_add,
  vec3_addScaledVector,
  vec3_addVectors,
  vec3_applyQuaternion,
  vec3_clone,
  vec3_create,
  vec3_cross,
  vec3_distanceTo,
  vec3_distanceToSquared,
  vec3_divideScalar,
  vec3_dot,
  vec3_equals,
  vec3_length,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_round,
  vec3_set,
  vec3_setFromMatrixPosition,
  vec3_setLength,
  vec3_setScalar,
  vec3_subVectors,
  vec3_Y,
  vec3_Z,
} from './vec3.js';

var keys = keys_create();

var CELL_SIZE = 32;

var LEVEL_WIDTH = 896;
var LEVEL_DEPTH = 1024;

var _q0 = quat_create();
var _r0 = ray_create();
var _v0 = vec3_create();
var _v1 = vec3_create();

var cameraDelta = vec3_create(32, 192, 192);

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

var div = (element, textContent, timeout) => {
  var child = document.createElement('div');
  child.textContent = textContent;
  element.append(child);
  if (timeout) {
    setTimeout(() => child.remove(), timeout);
  }
};

export var map0 = (gl, scene, camera) => {
  var map = object3d_create();
  object3d_add(scene, map);

  // Lights
  var ambient = vec3_clone(color_AMBIENT);
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

  // Ground
  [
    box(
      [LEVEL_WIDTH * 0.75, 128, LEVEL_DEPTH],
      align(py),
      translate(-LEVEL_WIDTH * 0.125, 0, 0),
    ),
    box(
      [LEVEL_WIDTH * 0.25, 128, LEVEL_DEPTH * 0.8],
      align(py),
      translate(LEVEL_WIDTH * 0.375, 0, -LEVEL_DEPTH * 0.1),
    ),
  ].map(geometry => {
    var mesh = physics_add(
      mesh_create(geometry, material_create()),
      BODY_STATIC,
    );
    Object.assign(mesh.material.color, color_GROUND);
    object3d_add(map, mesh);
  });

  var selectionMesh = selection_create();
  selectionMesh.visible = false;
  object3d_add(map, selectionMesh);

  var selectedMesh;

  var createFileMesh = () => {
    var [color, text] = sample([
      [color_ORANGE, 'HTML'],
      [color_CYAN, 'CSS'],
      [color_YELLOW, 'JS'],
    ]);
    var mesh = file_create(color);
    var frontTextGeometry = text_create(text);
    var backTextGeometry = text_create(text);
    var material = material_create();
    vec3_setScalar(material.color, 0.2);
    var frontTextMesh = mesh_create(frontTextGeometry, material);
    var backTextMesh = mesh_create(backTextGeometry, material);
    vec3_set(backTextMesh.scale, -1, 1, -1);
    vec3_set(frontTextMesh.position, 0, 16, 1);
    vec3_set(backTextMesh.position, 0, 16, -1);
    object3d_add(mesh, frontTextMesh);
    object3d_add(mesh, backTextMesh);
    createShadow(mesh);
    return mesh;
  };

  var initialFileMesh = createFileMesh();
  initialFileMesh.position.x = -64;
  object3d_add(map, initialFileMesh);
  var fileMeshes = [initialFileMesh];

  var controlPointMeshes = [
    [-96, 0, 128],
    // [0, 0, 256],
    // [-320, 0, 0],
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

  var createStaticMeshFromGeometry = geometry => {
    var mesh = physics_add(
      mesh_create(geometry, material_create()),
      BODY_STATIC,
    );
    createShadow(mesh);
    object3d_add(map, mesh);
    return mesh;
  };

  // Bridges
  [
    [
      [-448, 96, -196],
      [256, 96, -196],
    ],
    [
      [96, 64, -512],
      [96, 64, 256],
    ],
    [
      [-256, 128, -512],
      [-256, 128, 432],
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
      mesh_create(box(dimensions, transform), material_create()),
      BODY_STATIC,
    );
    vec3_set(mesh.position, ...position);
    createShadow(mesh);
    object3d_add(map, mesh);
    return mesh;
  };

  var blockTransform = compose(
    align(ny),
    colors([py, 1], [ny, color_GROUND]),
    geom =>
      $scale([py, { x: randFloat(0.9, 0.95), z: randFloat(0.9, 0.95) }])(geom),
  );

  // Blocks
  [
    [[192, 20, 32], [256, 0, 192], blockTransform],
    [[128, 20, 128], [-32, 0, -384], blockTransform],
  ].map(createBlock);

  // Buildings
  [
    ...building0_create().map(mesh => [mesh, [352, 0, -128]]),
    [building1_create(), [-576, 0, -64]],
    ...building2_create().map(mesh => [mesh, [96, 0, 288]]),
    [box([96, 160, 96], align(ny)), [-256, 0, 464]],
    [box([768, 160, 128], align(ny)), [-128, 0, -576]],
  ].map(([geometry, position]) => {
    var mesh = createStaticMeshFromGeometry(geometry);
    vec3_set(mesh.position, ...position);
    vec3_setScalar(mesh.material.color, 1.2);
  });

  var windowXGeometry = window_create(1);
  var windowZGeometry = window_create();

  [
    ...spaceBetween(-64, 96, 2).flatMap(z =>
      spaceBetween(0, 320, 6).map(y => [windowZGeometry, [-448, y, z]]),
    ),
    ...spaceBetween(256, 448, 3).flatMap(x =>
      spaceBetween(0, 128, 2).map(y => [windowXGeometry, [x, y, 0]]),
    ),
    ...spaceBetween(-224, 64, 4).flatMap(x =>
      spaceBetween(0, 160, 2).map(y => [windowXGeometry, [x, y, -512]]),
    ),
    ...[
      [128, 64, 288],
      [-208, 128, 464],
      [-208, 64, 464],
    ].map(position => [windowZGeometry, position]),
  ].map(([geometry, position]) => {
    var mesh = mesh_create(geometry, material_create());
    vec3_set(mesh.position, ...position);
    object3d_add(map, mesh);
    return mesh;
  });

  var wishForward = -1;
  var wishRight = 0;

  var staticMeshes;

  var traceGround = mesh => {
    Object.assign(_r0.origin, mesh.position);
    _r0.origin.y += CELL_SIZE;
    vec3_set(_r0.direction, 0, -1, 0);
    return ray_intersectObjects(_r0, staticMeshes)?.[0];
  };

  var traceShadow = mesh => {
    // Use mesh.matrixWorld to account for parent transforms.
    object3d_updateWorldMatrix(mesh);
    vec3_setFromMatrixPosition(_r0.origin, mesh.matrixWorld);
    vec3_subVectors(_r0.direction, _r0.origin, light0.position);
    return ray_intersectObjects(_r0, staticMeshes)?.[0];
  };

  var createExplosion = position => {
    var explosion = explosion_create(16);
    Object.assign(explosion.position, position);
    explosion.position.y += 16;
    object3d_add(map, explosion);
  };

  var bulletInterval = interval_create(0.1);
  var enemyInterval = interval_create(1.5);
  var fileIntervalDanger = interval_create(4);
  var fileIntervalSafe = interval_create(2);
  var uploadTime = 0;
  var uploadDuration = 1;
  var uploaded = 0;

  entity_add(
    map,
    component_create((component, dt) => {
      var bodies = physics_bodies(map);
      physics_update(bodies);

      player.dt = dt;

      vec3_setScalar(player.command, 0);

      if (keys.KeyW || keys.ArrowUp) player.command.z++;
      if (keys.KeyS || keys.ArrowDown) player.command.z--;
      if (keys.KeyA || keys.ArrowLeft) player.command.x--;
      if (keys.KeyD || keys.ArrowRight) player.command.x++;
      if (keys.Space) player.command.y++;

      var movespeed = 127;
      vec3_multiplyScalar(player.command, movespeed);

      vec3_set(player.viewForward, 0, 0, -1);
      vec3_set(player.viewRight, 1, 0, 0);

      if (DEBUG && false) {
        vec3_applyQuaternion(
          vec3_set(player.viewForward, 0, 0, -1),
          camera.quaternion,
        );
        vec3_normalize(
          vec3_cross(vec3_set(player.viewRight, 0, -1, 0), player.viewForward),
        );
      }

      player_update(player);

      vec3_addVectors(camera.position, playerMesh.position, cameraDelta);

      if (player.command.z || player.command.x) {
        wishForward = Math.sign(player.command.z);
        wishRight = Math.sign(player.command.x);

        quat_setFromAxisAngle(_q0, vec3_Y, Math.atan2(wishRight, -wishForward));
        quat_rotateTowards(playerMesh.quaternion, _q0, 12 * dt);
      }

      staticMeshes = physics_bodies(scene)
        .filter(body => body.physics === BODY_STATIC)
        .map(body => body.parent);

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
          2 * CELL_SIZE
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
          2 * CELL_SIZE
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

      var uploadFileMesh = findFileAt(controlPointMeshes[0]);
      if (uploadFileMesh) {
        if (!uploadTime) div(text, 'Uploading...', 1000);
        uploadTime += dt;
        if (uploadTime > uploadDuration) {
          uploadTime = 0;
          playSuccess();
          div(text, 'Uploaded!', 2000);
          uploaded++;
          score.textContent = 'Score: ' + uploaded;
          fileMeshes = fileMeshes.filter(mesh => mesh !== uploadFileMesh);
          object3d_remove(map, uploadFileMesh);
          uploadFileMesh = entity_add(
            uploadFileMesh,
            component_create((component, dt) => {
              object3d_rotateY(uploadFileMesh, dt);
              uploadFileMesh.position.y += 100 * dt;
              if (uploadFileMesh.position.y > 1024) {
                object3d_remove(map, uploadFileMesh);
              }
            }),
          );
          object3d_add(map, uploadFileMesh);
        }
      }

      if (
        bulletInterval(dt) &&
        !selectedMesh &&
        (keys.Enter || keys.ShiftLeft)
      ) {
        bulletInterval.reset();
        playShoot();

        var bulletMaterial = material_create();
        vec3_set(bulletMaterial.emissive, 1, 1, 2);

        var time = 0;
        var bullet = entity_add(
          physics_add(mesh_create(bulletGeometry, bulletMaterial), BODY_BULLET),
          component_create((component, dt) => {
            time += dt;
            if (time > 4) {
              object3d_remove(map, bullet);
            }
          }),
        );
        var bulletPhysics = get_physics_component(bullet);
        vec3_applyQuaternion(Object.assign(_v1, vec3_Z), playerMesh.quaternion);
        // Bullets land in box of size 1 that is 8 units away.
        vec3_addScaledVector(
          vec3_set(
            _v0,
            randFloatSpread(1),
            randFloatSpread(1),
            randFloatSpread(1),
          ),
          _v1,
          8,
        );
        object3d_lookAt(bullet, _v0);
        vec3_applyQuaternion(Object.assign(_v0, vec3_Z), bullet.quaternion);
        Object.assign(bullet.position, playerMesh.position);
        bullet.position.y += 24;
        vec3_addScaledVector(bullet.position, _v0, 16);
        vec3_addScaledVector(bulletPhysics.velocity, _v0, 800);
        object3d_add(map, bullet);

        bulletPhysics.collide = () => object3d_remove(map, bullet);
      }

      if (enemyInterval(dt)) {
        enemyInterval.reset();
        var enemyHealth = 2;
        var hitTimeout;
        var hasHitGround = false;
        var enemyPhysics;
        var enemyMesh = entity_add(
          physics_add(mac_create(true), BODY_DYNAMIC),
          component_create((component, dt) => {
            if (hasHitGround && enemyMesh.position.y > -CELL_SIZE) {
              // Head towards nearest file.
              var nearestMesh = findNearestObject(enemyMesh.position, [
                ...fileMeshes.filter(
                  mesh =>
                    mesh !== selectedMesh &&
                    !vec3_equals(
                      mesh.position,
                      controlPointMeshes[0].position,
                    ) &&
                    mesh.position.y <= enemyMesh.position.y,
                ),
                playerMesh,
              ]);
              if (nearestMesh) {
                var wishDirection = vec3_subVectors(
                  _v0,
                  nearestMesh.position,
                  enemyMesh.position,
                );
                var nearestFileMesh =
                  nearestMesh === playerMesh ? undefined : nearestMesh;
                if (nearestFileMesh) {
                  if (vec3_length(wishDirection) < CELL_SIZE) {
                    playExplosion();
                    object3d_remove(map, nearestFileMesh);
                    fileMeshes = fileMeshes.filter(
                      mesh => mesh !== nearestFileMesh,
                    );
                    object3d_remove(map, enemyMesh);
                    createExplosion(nearestFileMesh.position);
                    return;
                  }
                }
                vec3_normalize(wishDirection);
                var friction = 6;
                var stopSpeed = 100;
                var y = enemyPhysics.velocity.y;
                enemyPhysics.velocity.y = 0;
                var speed = vec3_length(enemyPhysics.velocity);
                var control = Math.max(speed, stopSpeed);
                var newSpeed = Math.max(speed - control * friction * dt, 0);
                vec3_setLength(enemyPhysics.velocity, newSpeed);
                var currentSpeed = vec3_dot(
                  enemyPhysics.velocity,
                  wishDirection,
                );
                enemyPhysics.velocity.y = y;
                var wishSpeed = 160;
                var addSpeed = wishSpeed - currentSpeed;
                var accel = 10;
                if (addSpeed > 0) {
                  var accelSpeed = Math.min(accel * dt * wishSpeed, addSpeed);
                  vec3_addScaledVector(
                    enemyPhysics.velocity,
                    wishDirection,
                    accelSpeed,
                  );
                  quat_setFromAxisAngle(
                    _q0,
                    vec3_Y,
                    Math.atan2(wishDirection.x, wishDirection.z),
                  );
                  quat_rotateTowards(enemyMesh.quaternion, _q0, 12 * dt);
                }
              }
            }
            enemyPhysics.velocity.y -= 800 * dt;
          }),
        );
        enemyPhysics = get_physics_component(enemyMesh);
        var enemyX = randFloatSpread(LEVEL_WIDTH / 4);
        var enemyZ = randFloatSpread(LEVEL_DEPTH / 4);
        vec3_set(
          enemyMesh.position,
          enemyX + (Math.sign(enemyX) * LEVEL_WIDTH) / 4,
          1024,
          enemyZ + (Math.sign(enemyZ) * LEVEL_DEPTH) / 4,
        );
        createShadow(enemyMesh);
        object3d_add(map, enemyMesh);
        enemyPhysics.collide = entity => {
          var entityPhysics = get_physics_component(entity).physics;
          if (entityPhysics === BODY_BULLET) {
            enemyHealth--;
            playHit();
            clearTimeout(hitTimeout);
            if (enemyHealth <= 0) {
              createExplosion(enemyMesh.position);
              object3d_remove(map, enemyMesh);
            } else {
              enemyMesh.material.emissive.x = 1;
              hitTimeout = setTimeout(
                () => (enemyMesh.material.emissive.x = 0),
                100,
              );
            }
          }
          if (entityPhysics === BODY_STATIC) {
            hasHitGround = true;
          }
        };
        if (enemyMesh.position.y > 10240) {
          object3d_remove(map, enemyMesh);
        }
      }

      if (fileIntervalDanger(dt)) {
        fileIntervalDanger.reset();
        var filePhysics;
        var fileMeshDanger = entity_add(
          physics_add(createFileMesh(), BODY_DYNAMIC),
          component_create((component, dt) => {
            if (filePhysics.physics) {
              filePhysics.velocity.y -= 800 * dt;
            }
            if (fileMeshDanger.position.y > 10240) {
              object3d_remove(map, fileMeshDanger);
            }
          }),
        );
        vec3_set(
          fileMeshDanger.position,
          randFloatSpread(LEVEL_WIDTH),
          1024,
          randFloatSpread(LEVEL_DEPTH),
        );
        filePhysics = get_physics_component(fileMeshDanger);
        filePhysics.collide = mesh => {
          if (get_physics_component(mesh).physics === BODY_STATIC) {
            filePhysics.physics = undefined;
            filePhysics.update = () => {};
            fileMeshes.push(fileMeshDanger);
          }
        };
        object3d_add(map, fileMeshDanger);
      }

      if (fileIntervalSafe(dt)) {
        fileIntervalSafe.reset();
        var safePositions = [
          [96, 96, 292],
          [-256, 160, 480],
          [352, 128, -48],
          [-256, 160, -544],
        ];
        var fileMeshSafe = createFileMesh();
        var tryCount = 0;
        while (tryCount < 4) {
          vec3_set(fileMeshSafe.position, ...sample(safePositions));
          if (!findFileAt(fileMeshSafe)) {
            object3d_add(map, fileMeshSafe);
            fileMeshes.push(fileMeshSafe);
            break;
          }
          tryCount++;
        }
      }

      [...fileMeshes, playerMesh].map(
        mesh => (mesh.shadow.position.y = traceShadow(mesh)?.point.y || 0),
      );

      fileMeshes.map(mesh => object3d_rotateY(mesh, dt));

      if (playerMesh.position.y < -1024) {
        u.hidden = false;
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

  if (DEBUG) {
    addEventListener('click', () => {
      Object.assign(_r0.origin, camera.position);
      vec3_applyQuaternion(
        vec3_set(_r0.direction, 0, 0, -1),
        camera.quaternion,
      );
      if (staticMeshes) {
        var intersection = ray_intersectObjects(_r0, staticMeshes)?.[0];
        if (intersection) {
          console.log(
            [
              intersection.point.x,
              intersection.point.y,
              intersection.point.z,
            ].map(Math.round),
            { distance: Math.round(intersection.distance) },
          );
          var targetMaterial = material_create();
          vec3_set(targetMaterial.emissive, 0, 1, 0);
          var target = mesh_create(box([2, 2, 2]), targetMaterial);
          Object.assign(target.position, intersection.point);
          object3d_add(map, target);
          setTimeout(() => object3d_remove(map, target), 1000);
        }
      }
    });
  }

  return {
    ambient,
    directional,
  };
};
