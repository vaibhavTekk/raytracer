const canvas = document.getElementById("main-canvas");
const ctx = canvas.getContext("2d");

let imgData = ctx.getImageData(0, 0, canvas.clientWidth, canvas.clientHeight);
let pixels = imgData.data;

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

function putPixel(x, y, color) {
  const canvasX = canvasWidth / 2 + x;
  const canvasY = canvasHeight / 2 - y - 1;

  // each pixel is represented with 4 values => r,g,b,a
  let offset = (canvasY * canvasWidth + canvasX) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = 255;
}

const viewportSize = 1;
const viewportDistance = 1;
const cameraOrigin = [0, 0, 0];

const BACKGROUND_COLOR = [0, 0, 0];

class Sphere {
  constructor(center, radius, color) {
    this.center = center;
    this.radius = radius;
    this.color = color;
  }

  rayIntersects(O, D) {
    // a*t^2 + b*t + c - r^2 = 0

    const CO = vectorSubtract(O, this.center);

    const a = vectorDotProduct(D, D);
    const b = 2 * vectorDotProduct(CO, D);
    const c = vectorDotProduct(CO, CO) - this.radius * this.radius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return [Infinity, Infinity];
    }

    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

    return [t1, t2];
  }
}

const scene = {
  spheres: [
    new Sphere([0, -1, 3], 1, [255, 0, 0]),
    new Sphere([2, 0, 4], 1, [0, 0, 255]),
    new Sphere([-2, 0, 4], 1, [0, 255, 0]),
    new Sphere([0, -5001, 0], 5000, [255, 255, 0]),
  ],
  lights: [
    {
      type: "ambient",
      intensity: 0.2,
    },
    {
      type: "point",
      intensity: 0.6,
      position: [2, 1, 0],
    },
    {
      type: "directional",
      intensity: 0.2,
      direction: [1, 4, 4],
    },
  ],
};

function vectorSubtract(v1, v2) {
  return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

function vectorAdd(v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

function vectorDotProduct(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

function vectorMultiply(k, v) {
  return [k * v[0], k * v[1], k * v[2]];
}

function vectorLength(v) {
  return Math.sqrt(vectorDotProduct(v, v));
}

function traceRay(O, D, tmin, tmax) {
  let closestT = Infinity;
  let closestSphere = null;
  scene.spheres.forEach((sphere) => {
    [t1, t2] = sphere.rayIntersects(O, D);
    if (t1 > tmin && t1 < tmax && t1 < closestT) {
      closestT = t1;
      closestSphere = sphere;
    }
    if (t2 > tmin && t2 < tmax && t2 < closestT) {
      closestT = t2;
      closestSphere = sphere;
    }
  });

  if (!closestSphere) {
    return BACKGROUND_COLOR;
  }

  const P = vectorAdd(O, vectorMultiply(closestT, D));
  let N = vectorSubtract(P, closestSphere.center);
  N = vectorMultiply(1 / vectorLength(N), N);

  return vectorMultiply(computeLighting(P, N), closestSphere.color);
}

function computeLighting(P, N) {
  let i = 0;
  scene.lights.forEach((light) => {
    let L = null;
    if (light.type === "ambient") {
      i += light.intensity;
    } else if (light.type === "directional") {
      L = light.direction;
    } else {
      L = vectorSubtract(light.position, P);
    }
    if (L) {
      const dotNL = vectorDotProduct(N, L);
      if (dotNL >= 0) {
        i += light.intensity * (dotNL / (vectorLength(N) * vectorLength(L)));
      }
    }
  });
  return i;
}

function canvasToViewport(x, y) {
  const vx = x * (viewportSize / canvasWidth);
  const vy = y * (viewportSize / canvasHeight);
  const vz = viewportDistance;
  return [vx, vy, vz];
}

function updateCanvas() {
  ctx.putImageData(imgData, 0, 0);
}

for (let i = -canvasWidth / 2; i < canvasWidth / 2; i++) {
  for (let j = -canvasHeight / 2; j < canvasHeight / 2; j++) {
    const D = canvasToViewport(i, j);
    const color = traceRay(cameraOrigin, D, 1, Infinity);
    putPixel(i, j, color);
  }
}

updateCanvas();
