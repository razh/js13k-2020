import {
  vec3_create,
  vec3_crossVectors,
  vec3_length,
  vec3_normalize,
  vec3_subVectors,
} from './vec3.js';

var _zero = vec3_create();
var _one = vec3_create(1, 1, 1);
var _x = vec3_create();
var _y = vec3_create();
var _z = vec3_create();

export var mat4_create = () => {
  // prettier-ignore
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
};

export var mat4_identity = m => {
  // prettier-ignore
  m.set([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);

  return m;
};

export var mat4_copy = (a, b) => {
  a.set(b);
  return a;
};

export var mat4_makeRotationFromQuaternion = (m, q) => {
  return mat4_compose(m, _zero, q, _one);
};

export var mat4_lookAt = (m, eye, target, up) => {
  vec3_subVectors(_z, eye, target);

  if (!vec3_length(_z)) {
    // eye and target are in the same position
    _z.z = 1;
  }

  vec3_normalize(_z);
  vec3_crossVectors(_x, up, _z);

  if (!vec3_length(_x)) {
    // up and z are parallel
    if (Math.abs(up.z) === 1) {
      _z.x += 0.0001;
    } else {
      _z.z += 0.0001;
    }

    vec3_normalize(_z);
    vec3_crossVectors(_x, up, _z);
  }

  vec3_normalize(_x);
  vec3_crossVectors(_y, _z, _x);

  m[0] = _x.x;
  m[4] = _y.x;
  m[8] = _z.x;

  m[1] = _x.y;
  m[5] = _y.y;
  m[9] = _z.y;

  m[2] = _x.z;
  m[6] = _y.z;
  m[10] = _z.z;

  return m;
};

export var mat4_multiplyMatrices = (m, a, b) => {
  var [
    a11,
    a21,
    a31,
    a41,

    a12,
    a22,
    a32,
    a42,

    a13,
    a23,
    a33,
    a43,

    a14,
    a24,
    a34,
    a44,
  ] = a;

  var [
    b11,
    b21,
    b31,
    b41,

    b12,
    b22,
    b32,
    b42,

    b13,
    b23,
    b33,
    b43,

    b14,
    b24,
    b34,
    b44,
  ] = b;

  m.set([
    a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41,
    a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41,
    a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41,
    a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41,

    a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42,
    a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42,
    a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42,
    a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42,

    a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43,
    a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43,
    a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43,
    a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43,

    a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44,
    a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44,
    a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44,
    a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44,
  ]);

  return m;
};

export var mat4_setPosition = (m, v) => {
  m[12] = v.x;
  m[13] = v.y;
  m[14] = v.z;

  return m;
};

export var mat4_getInverse = (a, b) => {
  // based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
  var [
    n11,
    n21,
    n31,
    n41,

    n12,
    n22,
    n32,
    n42,

    n13,
    n23,
    n33,
    n43,

    n14,
    n24,
    n34,
    n44,
  ] = b;

  var t11 =
    n23 * n34 * n42 -
    n24 * n33 * n42 +
    n24 * n32 * n43 -
    n22 * n34 * n43 -
    n23 * n32 * n44 +
    n22 * n33 * n44;
  var t12 =
    n14 * n33 * n42 -
    n13 * n34 * n42 -
    n14 * n32 * n43 +
    n12 * n34 * n43 +
    n13 * n32 * n44 -
    n12 * n33 * n44;
  var t13 =
    n13 * n24 * n42 -
    n14 * n23 * n42 +
    n14 * n22 * n43 -
    n12 * n24 * n43 -
    n13 * n22 * n44 +
    n12 * n23 * n44;
  var t14 =
    n14 * n23 * n32 -
    n13 * n24 * n32 -
    n14 * n22 * n33 +
    n12 * n24 * n33 +
    n13 * n22 * n34 -
    n12 * n23 * n34;

  var det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

  if (det === 0) {
    return mat4_identity(a);
  }

  var detInv = 1 / det;

  a.set([
    t11 * detInv,

    (n24 * n33 * n41 -
      n23 * n34 * n41 -
      n24 * n31 * n43 +
      n21 * n34 * n43 +
      n23 * n31 * n44 -
      n21 * n33 * n44) *
      detInv,

    (n22 * n34 * n41 -
      n24 * n32 * n41 +
      n24 * n31 * n42 -
      n21 * n34 * n42 -
      n22 * n31 * n44 +
      n21 * n32 * n44) *
      detInv,

    (n23 * n32 * n41 -
      n22 * n33 * n41 -
      n23 * n31 * n42 +
      n21 * n33 * n42 +
      n22 * n31 * n43 -
      n21 * n32 * n43) *
      detInv,

    t12 * detInv,

    (n13 * n34 * n41 -
      n14 * n33 * n41 +
      n14 * n31 * n43 -
      n11 * n34 * n43 -
      n13 * n31 * n44 +
      n11 * n33 * n44) *
      detInv,

    (n14 * n32 * n41 -
      n12 * n34 * n41 -
      n14 * n31 * n42 +
      n11 * n34 * n42 +
      n12 * n31 * n44 -
      n11 * n32 * n44) *
      detInv,

    (n12 * n33 * n41 -
      n13 * n32 * n41 +
      n13 * n31 * n42 -
      n11 * n33 * n42 -
      n12 * n31 * n43 +
      n11 * n32 * n43) *
      detInv,

    t13 * detInv,

    (n14 * n23 * n41 -
      n13 * n24 * n41 -
      n14 * n21 * n43 +
      n11 * n24 * n43 +
      n13 * n21 * n44 -
      n11 * n23 * n44) *
      detInv,

    (n12 * n24 * n41 -
      n14 * n22 * n41 +
      n14 * n21 * n42 -
      n11 * n24 * n42 -
      n12 * n21 * n44 +
      n11 * n22 * n44) *
      detInv,

    (n13 * n22 * n41 -
      n12 * n23 * n41 -
      n13 * n21 * n42 +
      n11 * n23 * n42 +
      n12 * n21 * n43 -
      n11 * n22 * n43) *
      detInv,

    t14 * detInv,

    (n13 * n24 * n31 -
      n14 * n23 * n31 +
      n14 * n21 * n33 -
      n11 * n24 * n33 -
      n13 * n21 * n34 +
      n11 * n23 * n34) *
      detInv,

    (n14 * n22 * n31 -
      n12 * n24 * n31 -
      n14 * n21 * n32 +
      n11 * n24 * n32 +
      n12 * n21 * n34 -
      n11 * n22 * n34) *
      detInv,

    (n12 * n23 * n31 -
      n13 * n22 * n31 +
      n13 * n21 * n32 -
      n11 * n23 * n32 -
      n12 * n21 * n33 +
      n11 * n22 * n33) *
      detInv,
  ]);

  return a;
};

export var mat4_scale = (m, v) => {
  var { x, y, z } = v;

  m[0] *= x;
  m[4] *= y;
  m[8] *= z;

  m[1] *= x;
  m[5] *= y;
  m[9] *= z;

  m[2] *= x;
  m[6] *= y;
  m[10] *= z;

  m[3] *= x;
  m[7] *= y;
  m[11] *= z;

  return m;
};

export var mat4_compose = (m, position, quaternion, scale) => {
  var { x, y, z, w } = quaternion;
  var x2 = x + x,
    y2 = y + y,
    z2 = z + z;
  var xx = x * x2,
    xy = x * y2,
    xz = x * z2;
  var yy = y * y2,
    yz = y * z2,
    zz = z * z2;
  var wx = w * x2,
    wy = w * y2,
    wz = w * z2;

  var sx = scale.x,
    sy = scale.y,
    sz = scale.z;

  m.set([
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,

    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,

    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,

    position.x,
    position.y,
    position.z,
    1,
  ]);

  return m;
};
