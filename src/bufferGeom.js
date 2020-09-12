import { bufferAttr_copyVector3sArray } from './bufferAttr.js';
import { directGeom_fromGeom } from './directGeom.js';

export var bufferGeom_fromGeom = geom => {
  return bufferGeom_fromDirectGeom(directGeom_fromGeom(geom));
};

export var bufferGeom_fromDirectGeom = geom => {
  return {
    position: bufferAttr_copyVector3sArray(
      new Float32Array(geom.vertices.length * 3),
      geom.vertices,
    ),
    color: bufferAttr_copyVector3sArray(
      new Float32Array(geom.colors.length * 3),
      geom.colors,
    ),
  };
};
