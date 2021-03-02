const FadeCandy = require("./node-fadecandy/src/FadeCandy");
const midi = require("midi");
const midiParser = require("midi-node");
const { Lerps } = require("./lerps");
const config = require("./config.json");

const fc = new FadeCandy();
const midiIn = new midi.Input();

midiIn.openVirtualPort("LED Driver");

let isReady = false;

fc.on(FadeCandy.events.READY, function () {
  // create default color look-up table
  fc.clut.create();
});

fc.on(FadeCandy.events.COLOR_LUT_READY, function () {
  isReady = true;
  console.log("READY!");
  setInterval(() => {
    processPixels();
  }, 5);
});

process.on("SIGINT", () => {
  clearAllPixels();
  process.exit(0);
});

let absoluteMs = Date.now();
const pixelData = new Uint8Array(20 * 3);
const lerps = new Lerps();
lerps.onProcess((address, value) => {
  const [r, g, b] = value;
  const offset = address * 3;
  pixelData[offset] = r;
  pixelData[offset + 1] = g;
  pixelData[offset + 2] = b;
});

function processPixels() {
  absoluteMs = Date.now();
  lerps.process(absoluteMs);

  fc.send(pixelData);
}

midiIn.on("message", (deltaTime, message) => {
  if (!isReady) return;

  const messageBuffer = Buffer.from(message);
  const midiMessage = midiParser.Message.fromBuffer(messageBuffer);

  const command = midiMessage.getCommand();
  if (command === "NOTE_ON" || command === "NOTE_OFF") {
    if (command === "NOTE_ON") {
      const [pitch, velocity] = midiMessage.getData();
      processNote(pitch, velocity);
    }
  }
});

const fadesMap = {};
const triggerMap = {};

config.triggers.forEach((trigger) => {
  triggerMap[trigger.velocity] = trigger.fade;
});
Object.keys(config.fades).forEach((name) => {
  fadesMap[name] = config.fades[name];
});

function getNoteFade(velocity) {
  const fadeId = triggerMap[velocity];
  const fade = fadesMap[fadeId];
  return fade instanceof Array ? fade : [fade];
}

function processNote(pitch, velocity) {
  const fade = getNoteFade(velocity);
  const address = pitch;

  if (!fade) {
    console.log(`No fade mapped for velocity ${velocity}`);
    return;
  } else if (address >= 20) {
    console.log(`LED #${pitch} is not addressable`);
  }

  lerps.trigger({ address, steps: fade });
}

function clearAllPixels() {
  let data = new Uint8Array(20 * 3);

  for (let pixel = 0; pixel < 20; pixel++) {
    let i = 3 * pixel;

    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
  }
  fc.send(data);
}
