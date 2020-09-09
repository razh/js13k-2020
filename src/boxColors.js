import { setVector } from './boxTransforms.js';
import { rearg } from './utils.js';
import { vec3_create } from './vec3.js';

export var setFaceVertexColor = (face, index, color) => {
  if (face.a === index) {
    face.vertexColors[0] = color;
  }

  if (face.b === index) {
    face.vertexColors[1] = color;
  }

  if (face.c === index) {
    face.vertexColors[2] = color;
  }
};

export var applyBoxVertexColors = (geom, ...colors) => {
  colors.map(([indices, value]) => {
    var color = vec3_create();
    setVector(color, value);
    geom.faces.map(face =>
      indices.map(index => setFaceVertexColor(face, index, color)),
    );
  });

  return geom;
};

export var colors = rearg(applyBoxVertexColors);
