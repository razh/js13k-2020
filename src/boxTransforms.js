import boxIndices from './boxIndices.js';
import { geom_translate } from './geom.js';
import { rearg } from './utils.js';
import {
  vec3_add,
  vec3_create,
  vec3_divideScalar,
  vec3_fromArray,
  vec3_multiply,
  vec3_setScalar,
  vec3_setX,
  vec3_setY,
  vec3_setZ,
  vec3_subVectors,
} from './vec3.js';

// Color#set().
export var setVector = (vector, value, identity) => {
  if (Array.isArray(value)) {
    vec3_fromArray(vector, value);
  } else if (typeof value === 'object') {
    Object.assign(vector, identity, value);
  } else if (typeof value === 'number') {
    vec3_setScalar(vector, value);
  }
};

var computeCentroid = (geom, indices, vector = vec3_create()) => {
  vec3_setScalar(vector, 0);

  indices.map(index => vec3_add(vector, geom.vertices[index]));
  vec3_divideScalar(vector, indices.length);

  return vector;
};

var alignBoxVertices = (() => {
  var centroid = vec3_create();

  return (geom, key) => {
    computeCentroid(geom, boxIndices[key], centroid);
    return geom_translate(geom, -centroid.x, -centroid.y, -centroid.z);
  };
})();

var relativeAlignBoxVertices = (() => {
  var centroidA = vec3_create();
  var centroidB = vec3_create();
  var delta = vec3_create();

  return (geomA, keyA, geomB, keyB) => {
    computeCentroid(geomA, boxIndices[keyA], centroidA);
    computeCentroid(geomB, boxIndices[keyB], centroidB);

    vec3_subVectors(delta, centroidB, centroidA);
    return geom_translate(geomA, delta.x, delta.y, delta.z);
  };
})();

export var align = rearg(alignBoxVertices);
export var relativeAlign = rearg(relativeAlignBoxVertices);

var transformBoxVertices = (() => {
  var vector = vec3_create();

  return (method, identity = vec3_create()) => {
    return (geom, vectors) => {
      Object.entries(vectors).map(([key, delta]) => {
        setVector(vector, delta, identity);
        boxIndices[key].map(index => method(geom.vertices[index], vector));
      });

      return geom;
    };
  };
})();

export var $translate = rearg(transformBoxVertices(vec3_add));
export var $scale = rearg(
  transformBoxVertices(vec3_multiply, vec3_create(1, 1, 1)),
);

var transformAxisBoxVertices = (() => {
  var vector = vec3_create();

  return (method, identity = vec3_create()) => {
    return axis => {
      return (geom, vectors) => {
        Object.entries(vectors).map(([key, delta = identity[axis]]) => {
          Object.assign(vector, identity);
          vector[axis] = delta;
          boxIndices[key].map(index => method(geom.vertices[index], vector));
        });

        return geom;
      };
    };
  };
})();

var translateAxisBoxVertices = transformAxisBoxVertices(vec3_add);

export var $translateX = rearg(translateAxisBoxVertices('x'));
export var $translateY = rearg(translateAxisBoxVertices('y'));
export var $translateZ = rearg(translateAxisBoxVertices('z'));

var callBoxVertices = method => {
  return (geom, vectors) => {
    Object.entries(vectors).map(([key, value]) =>
      boxIndices[key].map(index => method(geom.vertices[index], value)),
    );

    return geom;
  };
};

export var $set = rearg(callBoxVertices(vec3_fromArray));
export var $setX = rearg(callBoxVertices(vec3_setX));
export var $setY = rearg(callBoxVertices(vec3_setY));
export var $setZ = rearg(callBoxVertices(vec3_setZ));
