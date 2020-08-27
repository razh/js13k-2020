export default `
precision highp float;
precision highp int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
varying vec3 vViewPosition;

attribute vec3 color;
varying vec3 vColor;

varying vec3 fogPosition;

void main() {
  vColor.xyz = color.xyz;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  vViewPosition = -mvPosition.xyz;

  fogPosition = mvPosition.xyz;
}
`.trim();
