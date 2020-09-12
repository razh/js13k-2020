export var interval_create = duration => {
  var previousTime = 0;
  var time = duration;

  var update = dt => {
    time += dt;

    if (time - previousTime > duration) {
      return true;
    }
  };

  update.reset = () => (previousTime = time);

  return update;
};
