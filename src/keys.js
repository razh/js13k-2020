export var keys_create = () => {
  var keys = {};

  addEventListener('keydown', event => (keys[event.code] = true));
  addEventListener('keyup', event => (keys[event.code] = false));

  return keys;
};
