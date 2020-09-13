import {
  box3_containsPoint,
  box3_copy,
  box3_create,
  box3_overlapsBox,
  box3_setFromObject,
  box3_translate,
} from './box3.js';
import {
  component_create,
  entity_add,
  entity_filter,
  entity_find,
} from './entity.js';
import { object3d_traverse } from './object3d.js';
import {
  OVERCLIP,
  pm_clipVelocity,
  vec3_add,
  vec3_addScaledVector,
  vec3_create,
  vec3_length,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_set,
  vec3_setLength,
  vec3_setScalar,
  vec3_sub,
  vec3_subVectors,
} from './vec3.js';

export var BODY_STATIC = 1;
export var BODY_DYNAMIC = 2;
export var BODY_BULLET = 4;

export var physics_create = (entity, physics) => {
  return component_create(
    (component, dt) => {
      vec3_addScaledVector(component.parent.position, component.velocity, dt);
    },
    {
      physics,
      boundingBox: box3_setFromObject(box3_create(), entity),
      velocity: vec3_create(),
      collide() {},
    },
  );
};

export var physics_add = (entity, physics) => {
  return entity_add(entity, physics_create(entity, physics));
};

export var get_physics_component = entity => {
  return entity_find(entity, is_physics_component);
};

export var is_physics_component = object => object.physics;

export var physics_bodies = object => {
  var bodies = [];

  object3d_traverse(object, node => {
    bodies.push(...entity_filter(node, is_physics_component));
  });

  return bodies;
};

var narrowPhase = (() => {
  var penetration = vec3_create();

  return (bodyA, bodyB, boxA, boxB) => {
    // Determine overlap.
    // d0 is negative side or 'left' side.
    // d1 is positive or 'right' side.
    var d0x = boxB.max.x - boxA.min.x;
    var d1x = boxA.max.x - boxB.min.x;

    var d0y = boxB.max.y - boxA.min.y;
    var d1y = boxA.max.y - boxB.min.y;

    var d0z = boxB.max.z - boxA.min.z;
    var d1z = boxA.max.z - boxB.min.z;

    // Only overlapping on an axis if both ranges intersect.
    var dx = 0;
    if (d0x > 0 && d1x > 0) {
      dx = d0x < d1x ? d0x : -d1x;
    }

    var dy = 0;
    if (d0y > 0 && d1y > 0) {
      dy = d0y < d1y ? d0y : -d1y;
    }

    var dz = 0;
    if (d0z > 0 && d1z > 0) {
      dz = d0z < d1z ? d0z : -d1z;
    }

    // Determine minimum axis of separation.
    var adx = Math.abs(dx);
    var ady = Math.abs(dy);
    var adz = Math.abs(dz);

    if (adx < ady && adx < adz) {
      vec3_set(penetration, dx, 0, 0);
    } else if (ady < adz) {
      vec3_set(penetration, 0, dy, 0);
    } else {
      vec3_set(penetration, 0, 0, dz);
    }

    var objectA = bodyA.parent;
    var objectB = bodyB.parent;

    if (bodyA.physics === BODY_STATIC) {
      vec3_addScaledVector(objectB.position, penetration, -OVERCLIP);
      pm_clipVelocity(bodyB.velocity, vec3_normalize(penetration), OVERCLIP);
    } else if (bodyB.physics === BODY_STATIC) {
      vec3_addScaledVector(objectA.position, penetration, OVERCLIP);
      pm_clipVelocity(bodyA.velocity, vec3_normalize(penetration), OVERCLIP);
    } else {
      vec3_multiplyScalar(penetration, 0.5);
      // HACK: Set minimum level of separation to avoid getting stuck.
      if (vec3_length(penetration) < OVERCLIP) {
        vec3_setLength(penetration, OVERCLIP);
      }
      vec3_add(objectA.position, penetration);
      vec3_sub(objectB.position, penetration);
    }
  };
})();

export var sweptAABB = (() => {
  var time = vec3_create();
  var velocity = vec3_create();

  return (trace, bodyA, bodyB, boxA, boxB) => {
    if (box3_overlapsBox(boxA, boxB)) {
      trace.allsolid = true;
      trace.fraction = 0;
      return;
    }

    vec3_setScalar(time, Infinity);
    vec3_subVectors(velocity, bodyB.velocity, bodyA.velocity);

    var vx = velocity.x;
    var vy = velocity.y;
    var vz = velocity.z;

    // d0 is negative side or 'left' side.
    // d1 is positive or 'right' side.
    var d0x = boxB.max.x - boxA.min.x;
    var d1x = boxA.max.x - boxB.min.x;

    var d0y = boxB.max.y - boxA.min.y;
    var d1y = boxA.max.y - boxB.min.y;

    var d0z = boxB.max.z - boxA.min.z;
    var d1z = boxA.max.z - boxB.min.z;

    var t0 = 0;
    var t1 = Infinity;

    if (vx < 0) {
      if (d0x < 0) return;
      if (d0x > 0) t1 = Math.min(-d0x / vx, t1);
      if (d1x < 0) {
        time.x = d1x / vx;
        t0 = Math.max(time.x, t0);
      }
    } else if (vx > 0) {
      if (d1x < 0) return;
      if (d1x > 0) t1 = Math.min(d1x / vx, t1);
      if (d0x < 0) {
        time.x = -d0x / vx;
        t0 = Math.max(time.x, t0);
      }
    }

    if (t0 > t1) return;

    if (vy < 0) {
      if (d0y < 0) return;
      if (d0y > 0) t1 = Math.min(-d0y / vy, t1);
      if (d1y < 0) {
        time.y = d1y / vy;
        t0 = Math.max(time.y, t0);
      }
    } else if (vy > 0) {
      if (d1y < 0) return;
      if (d1y > 0) t1 = Math.min(d1y / vy, t1);
      if (d0y < 0) {
        time.y = -d0y / vy;
        t0 = Math.max(time.y, t0);
      }
    }

    if (t0 > t1) return;

    if (vz < 0) {
      if (d0z < 0) return;
      if (d0z > 0) t1 = Math.min(-d0z / vz, t1);
      if (d1z < 0) {
        time.z = d1z / vz;
        t0 = Math.max(time.z, t0);
      }
    } else if (vz > 0) {
      if (d1z < 0) return;
      if (d1z > 0) t1 = Math.min(d1z / vz, t1);
      if (d0z < 0) {
        time.z = -d0z / vz;
        t0 = Math.max(time.z, t0);
      }
    }

    if (t0 > t1) return;

    trace.fraction = t0;

    if (time.x < time.y && time.x < time.z) {
      vec3_set(trace.normal, Math.sign(vx), 0, 0);
    } else if (time.y < time.z) {
      vec3_set(trace.normal, 0, Math.sign(vy), 0);
    } else {
      vec3_set(trace.normal, 0, 0, Math.sign(vz));
    }
  };
})();

var physics_setBoxFromBody = (box, body) => {
  return box3_translate(box3_copy(box, body.boundingBox), body.parent.position);
};

export var physics_update = (() => {
  var box = box3_create();
  var boxA = box3_create();
  var boxB = box3_create();

  return bodies => {
    for (var i = 0; i < bodies.length; i++) {
      var bodyA = bodies[i];

      for (var j = i + 1; j < bodies.length; j++) {
        var bodyB = bodies[j];

        // Immovable objects.
        if (bodyA.physics === BODY_STATIC && bodyB.physics === BODY_STATIC) {
          continue;
        }

        // Projectiles don't collide.
        if (bodyA.physics === BODY_BULLET && bodyB.physics === BODY_BULLET) {
          continue;
        }

        // One projectile.
        var bullet;
        var body;

        if (bodyA.physics === BODY_BULLET || bodyB.physics === BODY_BULLET) {
          if (bodyA.physics === BODY_BULLET) {
            bullet = bodyA;
            body = bodyB;
          } else {
            bullet = bodyB;
            body = bodyA;
          }

          physics_setBoxFromBody(box, body);
          if (box3_containsPoint(box, bullet.parent.position)) {
            if (bullet.collide(body.parent) === false) {
              continue;
            }
          }
        }

        // Two dynamic bodies, or one static and one dynamic body.
        physics_setBoxFromBody(boxA, bodyA);
        physics_setBoxFromBody(boxB, bodyB);

        if (box3_overlapsBox(boxA, boxB)) {
          // Handle case when bullet box overlaps, but not the point.
          if (
            bodyA.collide(bodyB.parent) === false ||
            bodyB.collide(bodyA.parent) === false
          ) {
            continue;
          }

          narrowPhase(bodyA, bodyB, boxA, boxB);
        }
      }
    }
  };
})();
