import {
  mat4_compose,
  mat4_copy,
  mat4_create,
  mat4_lookAt,
  mat4_multiplyMatrices,
} from './mat4.js';
import {
  quat_create,
  quat_multiply,
  quat_setFromAxisAngle,
  quat_setFromRotationMatrix,
} from './quat.js';
import {
  vec3_add,
  vec3_applyQuaternion,
  vec3_create,
  vec3_multiplyScalar,
  vec3_X,
  vec3_Y,
  vec3_Z,
} from './vec3.js';

var _v1 = vec3_create();
var _q1 = quat_create();
var _m1 = mat4_create();

export var object3d_create = () => {
  return {
    parent: undefined,
    children: [],
    components: [],
    position: vec3_create(),
    quaternion: quat_create(),
    scale: vec3_create(1, 1, 1),
    matrix: mat4_create(),
    matrixWorld: mat4_create(),
    modelViewMatrix: mat4_create(),
    visible: true,
  };
};

export var object3d_lookAt = (object, vector) => {
  mat4_lookAt(_m1, vector, object.position, vec3_Y);
  quat_setFromRotationMatrix(object.quaternion, _m1);
};

export var object3d_add = (parent, child) => {
  child.parent = parent;
  parent.children.push(child);
  return parent;
};

export var object3d_remove = (parent, child) => {
  var index = parent.children.indexOf(child);
  if (index >= 0) {
    parent.children.splice(index, 1);
  }
};

export var object3d_rotateOnAxis = (obj, axis, angle) => {
  // rotate object on axis in object space
  // axis is assumed to be normalized
  quat_setFromAxisAngle(_q1, axis, angle);
  quat_multiply(obj.quaternion, _q1);
  return obj;
};

export var object3d_rotateX = (obj, angle) => {
  return object3d_rotateOnAxis(obj, vec3_X, angle);
};

export var object3d_rotateY = (obj, angle) => {
  return object3d_rotateOnAxis(obj, vec3_Y, angle);
};

export var object3d_rotateZ = (obj, angle) => {
  return object3d_rotateOnAxis(obj, vec3_Z, angle);
};

export var object3d_translateOnAxis = (obj, axis, distance) => {
  // translate object by distance along axis in object space
  // axis is assumed to be normalized
  vec3_applyQuaternion(Object.assign(_v1, axis), obj.quaternion);
  vec3_add(obj.position, vec3_multiplyScalar(_v1, distance));
  return obj;
};

export var object3d_translateX = (obj, distance) => {
  return object3d_translateOnAxis(obj, vec3_X, distance);
};

export var object3d_translateY = (obj, distance) => {
  return object3d_translateOnAxis(obj, vec3_Y, distance);
};

export var object3d_translateZ = (obj, distance) => {
  return object3d_translateOnAxis(obj, vec3_Z, distance);
};

export var object3d_traverse = (obj, callback) => {
  callback(obj);
  obj.children.map(child => object3d_traverse(child, callback));
};

export var object3d_updateMatrix = obj => {
  mat4_compose(obj.matrix, obj.position, obj.quaternion, obj.scale);
};

export var object3d_updateWorldMatrix = obj => {
  object3d_updateMatrix(obj);

  if (!obj.parent) {
    mat4_copy(obj.matrixWorld, obj.matrix);
  } else {
    mat4_multiplyMatrices(obj.matrixWorld, obj.parent.matrixWorld, obj.matrix);
  }

  obj.children.map(object3d_updateWorldMatrix);
};
