const FadeCandy = require("./node-fadecandy/src/FadeCandy");
const midi = require("midi");
const midiParser = require("midi-node");

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
});

process.on("SIGINT", () => {
  clearAllPixels();
  process.exit(0);
});

let pixel = 0;
let N_PIXELS = 20;

midiIn.on("message", (deltaTime, message) => {
  if (!isReady) return;

  const messageBuffer = Buffer.from(message);
  const midiMessage = midiParser.Message.fromBuffer(messageBuffer);

  const command = midiMessage.getCommand();
  if (command === "NOTE_ON" || command === "NOTE_OFF") {
    if (command === "NOTE_ON") {
      setPixel(pixel, [255, 0, 0]);
    } else if (command === "NOTE_OFF") {
      setPixel(pixel, [0, 0, 255]);
      pixel = pixel === N_PIXELS - 1 ? 0 : pixel + 1;
    }
  }
});

function setPixel(pixel, color) {
  let data = new Uint8Array(20 * 3);

  const offset = pixel * 3;
  data[offset] = color[0];
  data[offset + 1] = color[1];
  data[offset + 2] = color[2];
  fc.send(data);
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
