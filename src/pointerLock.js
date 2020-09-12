export var pointerLock_create = (controls, element) => {
  var hasPointerLock = 'pointerLockElement' in document;

  if (!hasPointerLock) {
    controls.enabled = true;
    return;
  }

  document.addEventListener('pointerlockchange', () => {
    controls.enabled = element === document.pointerLockElement;
  });

  addEventListener('click', () => element.requestPointerLock());
};
