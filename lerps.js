module.exports.Lerps = class Lerps {
  lerps = {};

  trigger(event) {
    this.createLerp(event, Date.now());
  }

  createLerp(event, startAbsoluteMs) {
    const { address, steps } = event;
    const duration = steps.reduce((sum, step) => {
      return sum + step.duration;
    }, 0);

    this.lerps[address] = {
      steps,
      startAbsoluteMs,
      duration,
    };
  }

  process(absoluteMs) {
    Object.keys(this.lerps).forEach((address) => {
      const { steps, startAbsoluteMs, duration } = this.lerps[address];
      const elapsedMs = absoluteMs - startAbsoluteMs;
      let value;

      let step;
      let startStepMs = 0;
      let endStepMs = 0;

      for (let i = 0; i < steps.length; i++) {
        step = steps[i];
        endStepMs = endStepMs + step.duration;

        if (elapsedMs >= startStepMs && elapsedMs < endStepMs) {
          const elapsedStepMs = elapsedMs - startStepMs;
          const percent = elapsedStepMs / step.duration;
          value = this.applyLerp(step.from, step.to, percent);
          break;
        }

        startStepMs += step.duration;
      }

      if (elapsedMs >= duration) {
        // Zero out in case the lerp is finished.
        value = this.zeroOutLerp(step.from);
        delete this.lerps[address];
      }

      this.lerpCallbacks.forEach((callback) => {
        callback(address, value);
      });
    });
  }

  applyLerp(from, to, percent) {
    return percent > 1
      ? from.map(() => 0)
      : from.map((x, i) => x - (x - to[i]) * percent);
  }

  zeroOutLerp(from) {
    return from.map(() => 0);
  }

  lerpCallbacks = new Set();
  onProcess(callback) {
    this.lerpCallbacks.add(callback);
    return () => {
      this.lerpCallbacks.delete(callback);
    };
  }
};
