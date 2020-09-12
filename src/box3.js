import { object3d_traverse, object3d_updateWorldMatrix } from './object3d.js';
import {
  vec3_add,
  vec3_applyMatrix4,
  vec3_create,
  vec3_max,
  vec3_min,
} from './vec3.js';

var _vector = vec3_create();

export var box3_create = (
  min = vec3_create(Infinity, Infinity, Infinity),
  max = vec3_create(-Infinity, -Infinity, -Infinity),
) => {
  return {
    min,
    max,
  };
};

export var box3_copy = (a, b) => {
  Object.assign(a.min, b.min);
  Object.assign(a.max, b.max);
  return a;
};

export var box3_makeEmpty = box => {
  box.min.x = box.min.y = box.min.z = Infinity;
  box.max.x = box.max.y = box.max.z -= Infinity;
  return box;
};

export var box3_expandByPoint = (box, point) => {
  vec3_min(box.min, point);
  vec3_max(box.max, point);
  return box;
};

export var box3_expandByObject = (box, object) => {
  object3d_updateWorldMatrix(object);
  object3d_traverse(object, node =>
    node.geometry?.vertices.map(vertex => {
      Object.assign(_vector, vertex);
      vec3_applyMatrix4(_vector, node.matrixWorld);
      box3_expandByPoint(box, _vector);
    }),
  );
  return box;
};

export var box3_setFromPoints = (box, points) => {
  box3_makeEmpty(box);
  points.map(point => box3_expandByPoint(box, point));
  return box;
};

export var box3_setFromObject = (box, object) => {
  box3_makeEmpty(box);
  box3_expandByObject(box, object);
  return box;
};

export var box3_containsPoint = (box, point) => {
  // prettier-ignore
  return (
    box.min.x <= point.x && point.x <= box.max.x &&
    box.min.y <= point.y && point.y <= box.max.y &&
    box.min.z <= point.z && point.z <= box.max.z
  );
};

export var box3_intersectsBox = (a, b) => {
  // prettier-ignore
  return !(
    a.max.x < b.min.x || a.min.x > b.max.x ||
    a.max.y < b.min.y || a.min.y > b.max.y ||
    a.max.z < b.min.z || a.min.z > b.max.z
  );
};

export var box3_overlapsBox = (a, b) => {
  // prettier-ignore
  return !(
    a.max.x <= b.min.x || a.min.x >= b.max.x ||
    a.max.y <= b.min.y || a.min.y >= b.max.y ||
    a.max.z <= b.min.z || a.min.z >= b.max.z
  );
};

export var box3_translate = (box, offset) => {
  vec3_add(box.min, offset);
  vec3_add(box.max, offset);
  return box;
};
