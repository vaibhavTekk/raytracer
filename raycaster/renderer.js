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

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi / 180);
}

function multiplyMatrices(m1, m2) {
  var result = [];
  for (var i = 0; i < m1.length; i++) {
    result[i] = [];
    for (var j = 0; j < m2[0].length; j++) {
      var sum = 0;
      for (var k = 0; k < m1[0].length; k++) {
        sum += m1[i][k] * m2[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function CalculateRotationMatrix(yaw, pitch, roll) {
  const yawRad = degrees_to_radians(yaw);
  const pitchRad = degrees_to_radians(pitch);
  const rollRad = degrees_to_radians(roll);
  const Rz = [
    [Math.cos(yawRad), -1 * Math.sin(yawRad), 0],
    [Math.sin(yawRad), Math.cos(yawRad), 0],
    [0, 0, 1],
  ];
  const Rx = [
    [1, 0, 0],
    [0, Math.cos(rollRad), -1 * Math.sin(rollRad)],
    [0, Math.sin(rollRad), Math.cos(rollRad)],
  ];
  const Ry = [
    [Math.cos(pitchRad), 0, Math.sin(pitchRad)],
    [0, 1, 0],
    [-1 * Math.sin(pitchRad), 0, Math.cos(pitchRad)],
  ];

  return multiplyMatrices(Rz, multiplyMatrices(Ry, Rx));
}

let yaw = 0; // in degrees Rz;
let pitch = 0;
let roll = 0;

const viewportSize = 1;
const viewportDistance = 1;
let cameraOrigin = [0, 0, 0];
let cameraRotation = CalculateRotationMatrix(yaw, pitch, roll);

const BACKGROUND_COLOR = [0, 0, 0];

class Sphere {
  constructor(center, radius, color, specular) {
    this.center = center;
    this.radius = radius;
    this.color = color;
    this.specular = specular;
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
    new Sphere([0, -1, 3], 1, [255, 0, 0], 500),
    new Sphere([2, 0, 4], 1, [0, 0, 255], 500),
    new Sphere([-2, 0, 4], 1, [0, 255, 0], 10),
    new Sphere([0, -5001, 0], 5000, [255, 255, 0], 1000),
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

function matrixMultiply(m, v) {
  let result = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i] += v[j] * m[i][j];
    }
  }
  return result;
}

function getClosestSphere(O, D, tmin, tmax) {
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

  return [closestT, closestSphere];
}

function traceRay(O, D, tmin, tmax) {
  const [closestT, closestSphere] = getClosestSphere(O, D, tmin, tmax);
  if (!closestSphere) {
    return BACKGROUND_COLOR;
  }

  const P = vectorAdd(O, vectorMultiply(closestT, D));
  let N = vectorSubtract(P, closestSphere.center);
  N = vectorMultiply(1 / vectorLength(N), N);

  return vectorMultiply(computeLighting(P, N, vectorMultiply(-1, D), closestSphere.specular), closestSphere.color);
}

function computeLighting(P, N, V, s) {
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
      //shadows

      const [shadowT, shadowSphere] = getClosestSphere(P, L, 0.01, Infinity);
      if (shadowSphere) {
        // defer lighting if the light ray intersects with another object (ie the other object casts a shadow)
        return;
      }
      // diffusion
      const dotNL = vectorDotProduct(N, L);
      if (dotNL >= 0) {
        i += light.intensity * (dotNL / (vectorLength(N) * vectorLength(L)));
      }

      //specular
      if (s !== -1) {
        const R = vectorSubtract(vectorMultiply(2 * vectorDotProduct(N, L), N), L);
        const dotRV = vectorDotProduct(R, V);
        if (dotRV >= 0) {
          i += light.intensity * Math.pow(dotRV / (vectorLength(R) * vectorLength(V)), s);
        }
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

function Render() {
  for (let i = -canvasWidth / 2; i < canvasWidth / 2; i++) {
    for (let j = -canvasHeight / 2; j < canvasHeight / 2; j++) {
      const D = matrixMultiply(cameraRotation, canvasToViewport(i, j));
      const color = traceRay(cameraOrigin, D, 1, Infinity);
      putPixel(i, j, color);
    }
  }
  updateCanvas();
}

Render();

document.getElementById("yawRange").addEventListener("change", (e) => {
  // console.log(e.target.value);
  yaw = e.target.value;
  cameraRotation = CalculateRotationMatrix(yaw, pitch, roll);
  Render();
});

document.getElementById("pitchRange").addEventListener("change", (e) => {
  // console.log(e.target.value);
  pitch = e.target.value;
  cameraRotation = CalculateRotationMatrix(yaw, pitch, roll);
  Render();
});

document.getElementById("rollRange").addEventListener("change", (e) => {
  // console.log(e.target.value);
  roll = e.target.value;
  cameraRotation = CalculateRotationMatrix(yaw, pitch, roll);
  Render();
});

document.getElementById("forward").addEventListener("click", () => {
  cameraOrigin[2] += 0.1;
  Render();
});

document.getElementById("backward").addEventListener("click", () => {
  cameraOrigin[2] -= 0.1;
  Render();
});

document.getElementById("left").addEventListener("click", () => {
  cameraOrigin[0] -= 0.1;
  Render();
});

document.getElementById("right").addEventListener("click", () => {
  cameraOrigin[0] += 0.1;
  Render();
});
