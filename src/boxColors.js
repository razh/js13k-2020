import boxIndices from './boxIndices.js';
import { rearg } from './utils.js';
import { vec3_create, vec3_fromArray } from './vec3.js';

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

export var applyBoxVertexColors = (geom, colors) => {
  Object.entries(colors).map(([key, value]) => {
    var color = vec3_create();

    if (Array.isArray(value)) {
      vec3_fromArray(color, value);
    } else if (typeof value === 'object') {
      Object.assign(color, value);
    } else {
      return;
    }

    geom.faces.map(face =>
      boxIndices[key].map(index => setFaceVertexColor(face, index, color)),
    );
  });

  return geom;
};

export var colors = rearg(applyBoxVertexColors);
