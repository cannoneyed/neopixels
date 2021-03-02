module.exports.Lerps = class Lerps {
  lerps = {};

  trigger(event) {
    this.createLerp(event, Date.now());
  }

  createLerp(event, startAbsoluteMs) {
    const { address, from, to, duration } = event;

    this.lerps[address] = {
      from,
      to,
      startAbsoluteMs,
      duration,
    };
  }

  process(absoluteMs) {
    Object.keys(this.lerps).forEach((address) => {
      const { from, to, startAbsoluteMs, duration } = this.lerps[address];
      const percent = (absoluteMs - startAbsoluteMs) / duration;

      let value;
      if (percent >= 1) {
        // Zero out in case the lerp is finished.
        value = this.zeroOutLerp(from);
        delete this.lerps[address];
      } else {
        value = this.applyLerp(from, to, percent);
      }

      this.lerpCallbacks.forEach((callback) => {
        callback(address, value);
      });
    });
  }

  applyLerp(from, to, percent) {
    if (from instanceof Array) {
      return percent > 1
        ? from.map(() => 0)
        : from.map((x, i) => x - (x - to[i]) * percent);
    } else if (typeof from === "object") {
      const results = {};
      for (const key in from) {
        results[key] =
          percent > 1 ? 0 : from[key] - (from[key] - to[key]) * percent;
      }
      return results;
    } else if (typeof from === "number" && typeof to === "number") {
      return from - (from - to) * percent;
    }
  }

  zeroOutLerp(from) {
    if (from instanceof Array) {
      return from.map(() => 0);
    } else if (typeof from === "object") {
      const results = {};
      for (const key in from) {
        results[key] = 0;
      }
      return results;
    } else if (typeof from === "number") {
      return 0;
    }
  }

  lerpCallbacks = new Set();
  onProcess(callback) {
    this.lerpCallbacks.add(callback);
    return () => {
      this.lerpCallbacks.delete(callback);
    };
  }
};
