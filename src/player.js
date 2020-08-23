import {
  box3_copy,
  box3_create,
  box3_expandByPoint,
  box3_overlapsBox,
  box3_translate,
} from './box3.js';
import { physics_bodies, sweptAABB } from './physics.js';
import {
  OVERCLIP,
  pm_clipVelocity,
  vec3_add,
  vec3_addScaledVector,
  vec3_create,
  vec3_crossVectors,
  vec3_dot,
  vec3_length,
  vec3_lerpVectors,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_setScalar,
  vec3_subVectors,
  vec3_Y,
} from './vec3.js';

// bg_public.h
// movement flags
var PMF_JUMP_HELD = 2;

// bg_local.h
var STEPSIZE = 18;

var JUMP_VELOCITY = 270;

// movement parameters
var pm_stopspeed = 100;

var pm_accelerate = 10;
var pm_airaccelerate = 1;

var pm_friction = 6;

var g_speed = 320;
var g_gravity = 800;

export var player_create = (object, body) => {
  return {
    object,
    body,

    scene: undefined,

    // player input
    command: {
      forward: 0,
      right: 0,
      up: 0,
      hook: 0,
    },

    // run-time variables
    dt: 0,
    gravity: g_gravity,
    speed: g_speed,
    viewForward: vec3_create(),
    viewRight: vec3_create(),

    // walk movement
    movementFlags: 0,
    walking: false,
    groundPlane: false,
    groundTrace: {
      normal: vec3_create(0, 1, 0),
    },
  };
};

export var player_update = player => {
  if (player.command.up < 10) {
    // not holding jump
    player.movementFlags &= ~PMF_JUMP_HELD;
  }

  player_checkGround(player);

  if (player.walking) {
    // walking on ground
    player_walkMove(player);
  } else {
    // airborne
    player_airMove(player);
  }

  player_checkGround(player);
};

var trace_create = () => {
  return {
    allsolid: false,
    fraction: 1,
    endpos: vec3_create(),
    normal: vec3_create(),
  };
};

var trace_copy = (a, b) => {
  a.allsolid = b.allsolid;
  a.fraction = b.fraction;
  Object.assign(a.endpos, b.endpos);
  Object.assign(a.normal, b.normal);
  return a;
};

var trace_reset = (() => {
  var _trace = trace_create();

  return trace => {
    trace_copy(trace, _trace);
    return trace;
  };
})();

var player_trace = (() => {
  var boxA = box3_create();
  var boxB = box3_create();
  var sweptBoxA = box3_create();

  var originalVelocity = vec3_create();
  var velocity = vec3_create();
  var _trace = trace_create();

  return (player, trace, start, end) => {
    trace_reset(trace);

    var bodies = physics_bodies(player.scene).filter(
      body => body !== player.body,
    );

    Object.assign(originalVelocity, player.body.velocity);

    vec3_subVectors(velocity, end, start);
    Object.assign(player.body.velocity, velocity);

    box3_translate(box3_copy(boxA, player.body.boundingBox), start);
    box3_translate(box3_copy(sweptBoxA, player.body.boundingBox), end);
    box3_expandByPoint(sweptBoxA, boxA.min);
    box3_expandByPoint(sweptBoxA, boxA.max);

    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      box3_translate(box3_copy(boxB, body.boundingBox), body.parent.position);
      if (!box3_overlapsBox(sweptBoxA, boxB)) {
        continue;
      }

      sweptAABB(trace_reset(_trace), player.body, body, boxA, boxB);
      if (_trace.fraction < trace.fraction) {
        trace_copy(trace, _trace);
      }
    }

    Object.assign(player.body.velocity, originalVelocity);
    vec3_lerpVectors(trace.endpos, start, end, trace.fraction);
  };
})();

var MAX_CLIP_PLANES = 5;

var player_slideMove = (() => {
  var dir = vec3_create();
  var numplanes;
  var planes = [...Array(MAX_CLIP_PLANES)].map(() => vec3_create());
  var clipVelocity = vec3_create();
  var trace = trace_create();
  var end = vec3_create();
  var endVelocity = vec3_create();
  var endClipVelocity = vec3_create();

  return (player, gravity) => {
    if (gravity) {
      Object.assign(endVelocity, player.body.velocity);
      endVelocity.y -= player.gravity * player.dt;
      player.body.velocity.y = (player.body.velocity.y + endVelocity.y) * 0.5;
      if (player.groundPlane) {
        // slide along the ground plane
        pm_clipVelocity(
          player.body.velocity,
          player.groundTrace.normal,
          OVERCLIP,
        );
      }
    }

    var time_left = player.dt;

    // never turn against the ground plane
    if (player.groundPlane) {
      numplanes = 1;
      Object.assign(planes[0], player.groundTrace.normal);
    } else {
      numplanes = 0;
    }

    // never turn against original velocity
    Object.assign(planes[numplanes], player.body.velocity);
    vec3_normalize(planes[numplanes]);
    numplanes++;

    var bumpcount;
    var numbumps = 4;
    for (bumpcount = 0; bumpcount < numbumps; bumpcount++) {
      // calculate position we are trying to move to
      Object.assign(end, player.object.position);
      vec3_addScaledVector(end, player.body.velocity, time_left);

      // see if we can make it there
      player_trace(player, trace, player.object.position, end);

      if (trace.allsolid) {
        player.body.velocity.y = 0;
        return true;
      }

      if (trace.fraction > 0) {
        // actually covered some distance
        Object.assign(player.object.position, trace.endpos);
      }

      if (trace.fraction === 1) {
        // moved the entire distance
        break;
      }

      time_left -= time_left * trace.fraction;

      if (numplanes >= MAX_CLIP_PLANES) {
        // this shouldn't really happen
        vec3_setScalar(player.body.velocity, 0);
        return true;
      }

      var i;
      //
      // if this is the same plane we hit before, nudge velocity
      // out along it, which fixes some epsilon issues with
      // non-axial planes
      //
      for (i = 0; i < numplanes; i++) {
        if (vec3_dot(trace.normal, planes[i]) > 0.99) {
          vec3_add(player.body.velocity, trace.normal);
          break;
        }
      }
      if (i < numplanes) {
        continue;
      }

      Object.assign(planes[numplanes], trace.normal);
      numplanes++;

      //
      //  modify velocity so that it parallels all of the clip planes
      //

      // find a plane that it enters
      for (i = 0; i < numplanes; i++) {
        var into = vec3_dot(player.body.velocity, planes[i]);
        if (into >= 0.1) {
          // move doesn't interact with the plane
          continue;
        }

        // slide along the plane
        Object.assign(clipVelocity, player.body.velocity);
        pm_clipVelocity(clipVelocity, planes[i], OVERCLIP);

        if (gravity) {
          // slide along the plane
          Object.assign(endClipVelocity, endVelocity);
          pm_clipVelocity(endClipVelocity, planes[i], OVERCLIP);
        }

        // see if there is a second plane that the new move enters
        for (var j = 0; j < numplanes; j++) {
          if (j === i) {
            continue;
          }

          if (vec3_dot(clipVelocity, planes[j]) >= 0.1) {
            // move doesn't interact with the plane
            continue;
          }

          // try clipping the move to the plane
          pm_clipVelocity(clipVelocity, planes[j], OVERCLIP);

          if (gravity) {
            pm_clipVelocity(endClipVelocity, planes[j], OVERCLIP);
          }

          // see if it goes back into the first clip plane
          if (vec3_dot(clipVelocity, planes[i]) >= 0) {
            continue;
          }

          // slide the original velocity along the crease
          vec3_crossVectors(dir, planes[i], planes[j]);
          vec3_normalize(dir);
          var d = vec3_dot(dir, player.body.velocity);
          Object.assign(clipVelocity, dir);
          vec3_multiplyScalar(clipVelocity, d);

          if (gravity) {
            d = vec3_dot(dir, endVelocity);
            Object.assign(endClipVelocity, dir);
            vec3_multiplyScalar(endClipVelocity, d);
          }

          // see if there is a third plane that the new move enters
          for (var k = 0; k < numplanes; k++) {
            if (k === i || k === j) {
              continue;
            }

            if (vec3_dot(clipVelocity, planes[k]) >= 0.1) {
              // move doesn't interact with the plane
              continue;
            }

            // stop dead at a triple plane intersection
            vec3_setScalar(player.body.velocity, 0);
            return true;
          }
        }

        // if we have fixed all interactions, try another move
        Object.assign(player.body.velocity, clipVelocity);

        if (gravity) {
          Object.assign(endVelocity, endClipVelocity);
        }

        break;
      }
    }

    if (gravity) {
      Object.assign(player.body.velocity, endVelocity);
    }

    return bumpcount !== 0;
  };
})();

var player_stepSlideMove = (() => {
  var start_o = vec3_create();
  var start_v = vec3_create();
  var up = vec3_create();
  var down = vec3_create();
  var trace = trace_create();

  return (player, gravity) => {
    Object.assign(start_o, player.object.position);
    Object.assign(start_v, player.body.velocity);

    // we got exactly where we wanted to go first try
    if (player_slideMove(player, gravity) === false) {
      return;
    }

    Object.assign(down, start_o);
    down.y -= STEPSIZE;
    player_trace(player, trace, start_o, down);
    Object.assign(up, vec3_Y);
    // never step up when you have up velocity
    if (
      player.body.velocity.y > 0 &&
      (trace.fraction === 1 || vec3_dot(player.groundTrace.normal, up) < 0.7)
    ) {
      return;
    }

    Object.assign(up, start_o);
    up.y += STEPSIZE;

    // test the player position if they were a stepheight higher
    player_trace(player, trace, start_o, up);
    if (trace.allsolid) {
      // can't step up
      return;
    }

    var stepSize = trace.endpos.y - start_o.y;
    // try slidemove from this position
    Object.assign(player.object.position, trace.endpos);
    Object.assign(player.body.velocity, start_v);

    player_slideMove(player, gravity);

    // push down the final amount
    Object.assign(down, player.object.position);
    down.y -= stepSize;
    player_trace(player, trace, player.object.position, down);
    if (!trace.allsolid) {
      Object.assign(player.object.position, trace.endpos);
    }
    if (trace.fraction < 1) {
      pm_clipVelocity(player.body.velocity, trace.normal, OVERCLIP);
    }

    var delta = player.object.position.y - start_o.y;
    if (delta > 2) {
      player.dy = Math.min(delta, 16);
    }
  };
})();

var player_checkJump = player => {
  if (player.command.up < 10) {
    // not holding jump
    return false;
  }

  if (player.movementFlags & PMF_JUMP_HELD) {
    player.command.up = 0;
    return false;
  }

  player.groundPlane = false;
  player.walking = false;
  player.movementFlags |= PMF_JUMP_HELD;

  player.body.velocity.y = JUMP_VELOCITY;

  return true;
};

var player_walkMove = (() => {
  var wishvel = vec3_create();
  var wishdir = vec3_create();

  return player => {
    if (player_checkJump(player)) {
      player_airMove(player);
      return;
    }

    player_friction(player);

    var fmove = player.command.forward;
    var smove = player.command.right;

    var scale = player_cmdScale(player);

    // project moves down to flat plane
    player.viewForward.y = 0;
    player.viewRight.y = 0;

    // project the forward and right directions onto the ground plane
    pm_clipVelocity(player.viewForward, player.groundTrace.normal, OVERCLIP);
    pm_clipVelocity(player.viewRight, player.groundTrace.normal, OVERCLIP);
    //
    vec3_normalize(player.viewForward);
    vec3_normalize(player.viewRight);

    vec3_setScalar(wishvel, 0);
    vec3_addScaledVector(wishvel, player.viewForward, fmove);
    vec3_addScaledVector(wishvel, player.viewRight, smove);

    Object.assign(wishdir, wishvel);
    var wishspeed = vec3_length(wishdir);
    vec3_normalize(wishdir);
    wishspeed *= scale;

    player_accelerate(player, wishdir, wishspeed, pm_accelerate);

    // slide along the ground plane
    pm_clipVelocity(player.body.velocity, player.groundTrace.normal, OVERCLIP);

    // don't do anything if standing still
    if (!player.body.velocity.x && !player.body.velocity.z) {
      return;
    }

    player_stepSlideMove(player, false);
  };
})();

var player_airMove = (() => {
  var wishvel = vec3_create();
  var wishdir = vec3_create();

  return player => {
    player_friction(player);

    var fmove = player.command.forward;
    var smove = player.command.right;

    var scale = player_cmdScale(player);

    // project moves down to flat plane
    player.viewForward.y = 0;
    player.viewRight.y = 0;
    vec3_normalize(player.viewForward);
    vec3_normalize(player.viewRight);

    vec3_setScalar(wishvel, 0);
    vec3_addScaledVector(wishvel, player.viewForward, fmove);
    vec3_addScaledVector(wishvel, player.viewRight, smove);
    wishvel.y = 0;

    Object.assign(wishdir, wishvel);
    var wishspeed = vec3_length(wishdir);
    vec3_normalize(wishdir);
    wishspeed *= scale;

    // not on ground, so little effect on velocity
    player_accelerate(player, wishdir, wishspeed, pm_airaccelerate);

    // we may have a ground plane that is very steep, even
    // though we don't have a groundentity
    // slide along the steep plane
    if (player.groundPlane) {
      pm_clipVelocity(
        player.body.velocity,
        player.groundTrace.normal,
        OVERCLIP,
      );
    }

    player_stepSlideMove(player, true);
  };
})();

var player_friction = (() => {
  var vec = vec3_create();

  return player => {
    var vel = player.body.velocity;

    Object.assign(vec, vel);
    if (player.walking) {
      vec.y = 0; // ignore slope movement
    }

    var speed = vec3_length(vec);
    if (speed < 1) {
      vel.x = 0;
      vel.z = 0;
      return;
    }

    var drop = 0;

    // apply ground friction
    if (player.walking) {
      var control = speed < pm_stopspeed ? pm_stopspeed : speed;
      drop += control * pm_friction * player.dt;
    }

    // scale the velocity
    var newspeed = speed - drop;
    if (newspeed < 0) {
      newspeed = 0;
    }
    newspeed /= speed;

    vec3_multiplyScalar(vel, newspeed);
  };
})();

var player_cmdScale = player => {
  var max = Math.abs(player.command.forward);
  if (Math.abs(player.command.right) > max) {
    max = Math.abs(player.command.right);
  }

  if (Math.abs(player.command.up) > max) {
    max = Math.abs(player.command.up);
  }

  if (!max) {
    return 0;
  }

  var total = Math.sqrt(
    player.command.forward ** 2 +
      player.command.right ** 2 +
      player.command.up ** 2,
  );
  var scale = (player.speed * max) / (127 * total);

  return scale;
};

var player_accelerate = (player, wishdir, wishspeed, accel) => {
  var currentspeed = vec3_dot(player.body.velocity, wishdir);
  var addspeed = wishspeed - currentspeed;
  if (addspeed <= 0) {
    return;
  }
  var accelspeed = accel * player.dt * wishspeed;
  if (accelspeed > addspeed) {
    accelspeed = addspeed;
  }

  vec3_addScaledVector(player.body.velocity, wishdir, accelspeed);
};

var player_checkGround = (() => {
  var position = vec3_create();
  var trace = trace_create();

  return player => {
    Object.assign(position, player.object.position);
    position.y -= 0.25;

    player_trace(player, trace, player.object.position, position);
    // if the trace didn't hit anything, we are in free fall
    if (trace.fraction === 1) {
      player.groundPlane = false;
      player.walking = false;
      return;
    }

    player.groundPlane = true;
    player.walking = true;
  };
})();