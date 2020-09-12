export default `
#extension GL_OES_standard_derivatives : enable

precision highp float;
precision highp int;

#define R 0.31830988618
#define s(a) clamp(a, 0.0, 1.0)

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;

varying vec3 vColor;

uniform vec3 fogColor;
varying vec3 fogPosition;
uniform float fogNear;
uniform float fogFar;

uniform vec3 ambient;

struct D {
  vec3 direction;
  vec3 color;
};

uniform D directionalLights[NUM_DIR_LIGHTS];

varying vec3 vViewPosition;

void main() {
  vec3 dD = vec3(0);
  vec3 dS = vec3(0);

  vec3 c = diffuse * vColor;

  vec3 n = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
  vec3 v = normalize(vViewPosition);

  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    D d = directionalLights[i];
    vec3 r = s(dot(n, d.direction)) * d.color;
    dD += r * R * c;

    vec3 h = normalize(d.direction + v);
    float L = s(dot(d.direction, h));
    dS += r * (
      ((1.0 - specular) * (exp2((-5.55473 * L - 6.98316) * L)) + specular) *
      (0.25 * (R * (shininess * 0.5 + 1.0) * pow(s(dot(n, h)), shininess)))
    );
  }

  gl_FragColor = vec4(
    mix(
      dD + (ambient * R * c) + dS + emissive,
      fogColor,
      smoothstep(fogNear, fogFar, length(fogPosition))
    ),
    1
  );
}
`.trim();
