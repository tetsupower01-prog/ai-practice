"use strict";

const canvas = document.querySelector("#catCanvas");
const ctx = canvas.getContext("2d");
const statusLabel = document.querySelector("#status");

const SPRITE_CONFIG = {
  image: "./assets/cat_sprite.png",
  fps: {
    run: 10,
    jump: 7,
    idle: 1,
    sleep: 3,
    wave: 8,
    box: 1
  },
  // These are provisional crop rectangles for the provided 1536 x 1024 sheet.
  // Adjust x/y/w/h here when you want cleaner frame boundaries.
  animations: {
    run: [
      { x: 38, y: 162, w: 160, h: 118 },
      { x: 235, y: 160, w: 160, h: 120 },
      { x: 450, y: 154, w: 150, h: 130 },
      { x: 626, y: 168, w: 160, h: 112 },
      { x: 818, y: 162, w: 160, h: 118 },
      { x: 1010, y: 162, w: 160, h: 118 },
      { x: 1202, y: 156, w: 145, h: 126 },
      { x: 1365, y: 160, w: 150, h: 124 }
    ],
    jump: [
      { x: 55, y: 382, w: 150, h: 105 },
      { x: 268, y: 370, w: 130, h: 120 },
      { x: 453, y: 382, w: 150, h: 105 }
    ],
    idle: [
      { x: 55, y: 573, w: 115, h: 122 }
    ],
    sleep: [
      { x: 47, y: 790, w: 150, h: 90 },
      { x: 240, y: 786, w: 150, h: 94 },
      { x: 435, y: 786, w: 150, h: 94 },
      { x: 626, y: 786, w: 150, h: 94 }
    ],
    wave: [
      { x: 232, y: 573, w: 115, h: 122 },
      { x: 330, y: 566, w: 120, h: 130 },
      { x: 442, y: 566, w: 120, h: 130 },
      { x: 508, y: 566, w: 125, h: 130 }
    ],
    box: [
      { x: 1155, y: 586, w: 135, h: 110 },
      { x: 1300, y: 586, w: 135, h: 110 },
      { x: 1430, y: 586, w: 100, h: 110 }
    ]
  }
};

const cat = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  targetX: window.innerWidth / 2,
  targetY: window.innerHeight / 2,
  size: 128,
  speed: 180,
  facing: 1,
  state: "idle",
  frameTime: 0,
  frameIndex: 0,
  jumpTime: 0,
  waveTime: 0,
  lastInputAt: performance.now()
};

const pointer = {
  active: false,
  x: cat.targetX,
  y: cat.targetY
};

const sprite = new Image();
let transparentSprite = null;
let lastFrameAt = performance.now();
let imageLoaded = false;

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cat.x = clamp(cat.x, cat.size / 2, width - cat.size / 2);
  cat.y = clamp(cat.y, cat.size / 2, height - cat.size / 2);
}

function setPointer(clientX, clientY) {
  pointer.active = true;
  pointer.x = clientX;
  pointer.y = clientY;
  cat.targetX = clientX;
  cat.targetY = clientY;
  cat.lastInputAt = performance.now();
}

function playWave() {
  cat.state = "wave";
  cat.waveTime = 0;
  cat.frameIndex = 0;
  cat.frameTime = 0;
  cat.lastInputAt = performance.now();
}

function playJump() {
  cat.state = "jump";
  cat.jumpTime = 0;
  cat.frameIndex = 0;
  cat.frameTime = 0;
  cat.lastInputAt = performance.now();
}

function playClickReaction(clientX, clientY) {
  const distance = Math.hypot(clientX - cat.x, clientY - cat.y);

  if (distance > cat.size * 1.15) {
    playJump();
  } else {
    playWave();
  }
}

function animationFrames(name) {
  return SPRITE_CONFIG.animations[name] || SPRITE_CONFIG.animations.idle;
}

function chooseState(distanceToTarget, now) {
  const idleMs = now - cat.lastInputAt;

  if (!pointer.active) {
    return "box";
  }

  if (cat.state === "wave" && cat.waveTime < 650) {
    return "wave";
  }

  if (cat.state === "jump" && cat.jumpTime < 650) {
    return "jump";
  }

  if (idleMs > 30000) {
    return "sleep";
  }

  if (distanceToTarget > 8) {
    return "run";
  }

  return "idle";
}

function update(dt, now) {
  const dx = cat.targetX - cat.x;
  const dy = cat.targetY - cat.y;
  const distance = Math.hypot(dx, dy);
  const nextState = chooseState(distance, now);

  if (nextState !== cat.state) {
    cat.state = nextState;
    cat.frameIndex = 0;
    cat.frameTime = 0;
  }

  if (!pointer.active) {
    return;
  }

  if (distance > 1 && cat.state !== "sleep" && cat.state !== "wave") {
    const step = Math.min(distance, cat.speed * dt);
    cat.x += (dx / distance) * step;
    cat.y += (dy / distance) * step;

    if (Math.abs(dx) > 0.25) {
      cat.facing = dx >= 0 ? 1 : -1;
    }
  }

  cat.x = clamp(cat.x, cat.size / 2, window.innerWidth - cat.size / 2);
  cat.y = clamp(cat.y, cat.size / 2, window.innerHeight - cat.size / 2);

  if (cat.state === "wave") {
    cat.waveTime += dt * 1000;
  }

  if (cat.state === "jump") {
    cat.jumpTime += dt * 1000;
  }

  advanceFrame(dt);
}

function advanceFrame(dt) {
  const frames = animationFrames(cat.state);
  const fps = SPRITE_CONFIG.fps[cat.state] || 1;
  const frameDuration = 1 / fps;

  cat.frameTime += dt;
  while (cat.frameTime >= frameDuration) {
    cat.frameTime -= frameDuration;
    cat.frameIndex += 1;

    if ((cat.state === "wave" || cat.state === "jump") && cat.frameIndex >= frames.length) {
      cat.frameIndex = frames.length - 1;
      break;
    }

    cat.frameIndex %= frames.length;
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  if (pointer.active) {
    ctx.fillStyle = "rgba(72, 111, 120, 0.08)";
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(64, 80, 90, 0.12)";
    ctx.stroke();
  }

  ctx.restore();
}

function drawCat() {
  const frames = animationFrames(cat.state);
  const frame = frames[Math.min(cat.frameIndex, frames.length - 1)];
  const scale = cat.size / Math.max(frame.w, frame.h);
  const drawW = frame.w * scale;
  const drawH = frame.h * scale;
  const sourceImage = transparentSprite || sprite;

  ctx.save();
  ctx.translate(cat.x, cat.y);
  ctx.scale(cat.facing, 1);

  ctx.shadowColor = "rgba(32, 38, 44, 0.16)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(
    sourceImage,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  ctx.restore();
}

function draw() {
  drawBackground();

  if (imageLoaded) {
    drawCat();
  }

  statusLabel.textContent = imageLoaded ? cat.state : "loading";
}

function tick(now) {
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;

  if (imageLoaded) {
    update(dt, now);
  }

  draw();
  requestAnimationFrame(tick);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createTransparentSprite(image) {
  const buffer = document.createElement("canvas");
  const bufferCtx = buffer.getContext("2d", { willReadFrequently: true });
  buffer.width = image.naturalWidth;
  buffer.height = image.naturalHeight;
  bufferCtx.drawImage(image, 0, 0);

  const imageData = bufferCtx.getImageData(0, 0, buffer.width, buffer.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    const distanceFromWhite = Math.hypot(255 - red, 255 - green, 255 - blue);

    if (red > 246 && green > 246 && blue > 246) {
      pixels[i + 3] = 0;
    } else if (distanceFromWhite < 34) {
      pixels[i + 3] = Math.min(pixels[i + 3], Math.round(distanceFromWhite * 7.5));
    }
  }

  bufferCtx.putImageData(imageData, 0, 0);
  return buffer;
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("pointermove", (event) => {
  setPointer(event.clientX, event.clientY);
});

window.addEventListener("pointerdown", (event) => {
  setPointer(event.clientX, event.clientY);
  playClickReaction(event.clientX, event.clientY);
});

window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

document.addEventListener("mouseleave", () => {
  pointer.active = false;
});

window.addEventListener("blur", () => {
  pointer.active = false;
});

sprite.addEventListener("load", () => {
  transparentSprite = createTransparentSprite(sprite);
  imageLoaded = true;
  statusLabel.textContent = "idle";
});

sprite.addEventListener("error", () => {
  statusLabel.textContent = "image error";
});

resizeCanvas();
sprite.src = SPRITE_CONFIG.image;
requestAnimationFrame(tick);
