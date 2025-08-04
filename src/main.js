import Plotly from 'plotly.js-dist';
import GUI from 'dat.gui';

const N = 500;
const hbar = 1.0;
const m = 1.0;
const dt = 0.01;

let time = 0;

// === CONFIGURABLE PARAMS ===
const params = {
  A: 0.5,
  sigma: 1.0,
  k0: 5.0,
  k1: 7.0,
  secondWave: true,
  phaseBump: true,
  bumpCenter: 2.0,
  bumpWidth: 1.0,
  bumpPhase: Math.PI / 2
};

// === GUI CONTROLS ===
const gui = new GUI.GUI();
gui.add(params, 'A', 0.1, 2.0).step(0.1);
gui.add(params, 'sigma', 0.1, 3.0).step(0.1);
gui.add(params, 'k0', 0, 20).step(0.5);
gui.add(params, 'k1', 0, 20).step(0.5);
gui.add(params, 'secondWave');
gui.add(params, 'phaseBump');
gui.add(params, 'bumpCenter', -10, 10).step(0.1);
gui.add(params, 'bumpWidth', 0.1, 5).step(0.1);
gui.add(params, 'bumpPhase', -Math.PI, Math.PI).step(0.1);

function phaseGate(x, t) {
  if (!params.phaseBump) return 1;
  const { bumpCenter, bumpWidth, bumpPhase } = params;
  const φ = bumpPhase * Math.exp(-((x - bumpCenter) ** 2) / (2 * bumpWidth ** 2));
  return { re: Math.cos(φ), im: Math.sin(φ) };
}

function getWavefunctionData(t) {
  const x = [];
  const re = [];
  const im = [];

  const v = (hbar * params.k0) / m;
  const xCenter = v * t;
  const xmin = -10 + xCenter, xmax = 10 + xCenter;
  const xvals = new Array(N).fill(0).map((_, i) => xmin + (i / (N - 1)) * (xmax - xmin));

  xvals.forEach(xi => {
    let ψ = { re: 0, im: 0 };

    // Primary wave
    const x0 = v * t;
    const phase = params.k0 * xi - (params.k0 ** 2) * t / (2 * m);
    const env = params.A * Math.exp(-((xi - x0) ** 2) / (2 * params.sigma ** 2));
    ψ.re += env * Math.cos(phase);
    ψ.im += env * Math.sin(phase);

    // Second wave (interference)
    if (params.secondWave) {
      const phase2 = params.k1 * xi - (params.k1 ** 2) * t / (2 * m);
      const env2 = params.A * Math.exp(-((xi - x0) ** 2) / (2 * params.sigma ** 2));
      ψ.re += env2 * Math.cos(phase2);
      ψ.im += env2 * Math.sin(phase2);
    }

    // Apply phase bump: ψ(x) → ψ(x) e^{iφ(x)}
    if (params.phaseBump) {
      const { re: gRe, im: gIm } = phaseGate(xi, t);
      const reTmp = ψ.re * gRe - ψ.im * gIm;
      const imTmp = ψ.re * gIm + ψ.im * gRe;
      ψ.re = reTmp;
      ψ.im = imTmp;
    }

    x.push(xi);
    re.push(ψ.re);
    im.push(ψ.im);
  });

  return { x, re, im, xCenter };
}

function drawProbabilityPlot(x, re, im, xCenter) {
  const prob = re.map((r, i) => r ** 2 + im[i] ** 2);
  const xWindow = 10;

  const trace = {
    x: x,
    y: prob,
    mode: 'lines',
    line: { color: 'blue' }
  };

  const layout = {
    margin: { l: 40, r: 30, b: 40, t: 20 },
    xaxis: {
      title: 'x',
      range: [xCenter - xWindow / 2, xCenter + xWindow / 2]
    },
    yaxis: {
      title: '|ψ(x)|²',
      range: [0, 1.1 * Math.max(...prob)]
    }
  };

  Plotly.react('probability-plot', [trace], layout);
}


const layout = {
  margin: { l: 0, r: 0, b: 0, t: 0 },
  scene: {
    xaxis: { title: 'x', range: [-10, 10] },
    yaxis: { title: 'Re(ψ)', range: [-1, 1] },
    zaxis: { title: 'Im(ψ)', range: [-1, 1] }
  }
};

function animate() {
  const { x, re, im, xCenter } = getWavefunctionData(time);
  const xWindow = 10;

  const trace = {
    x,
    y: re,
    z: im,
    mode: 'lines',
    type: 'scatter3d',
    line: {
      width: 6,
      color: x,
      colorscale: 'Viridis'
    }
  };

  const dynamicLayout = {
    ...layout,
    scene: {
      ...layout.scene,
      xaxis: {
        ...layout.scene.xaxis,
        range: [xCenter - xWindow / 2, xCenter + xWindow / 2]
      }
    }
  };

  if (time === 0) {
    Plotly.newPlot('plot', [trace], dynamicLayout);
  } else {
    Plotly.update('plot', {
      x: [trace.x],
      y: [trace.y],
      z: [trace.z]
    });
    Plotly.relayout('plot', {
      'scene.xaxis.range': [xCenter - xWindow / 2, xCenter + xWindow / 2]
    });
  }
  drawProbabilityPlot(x, re, im, xCenter);

  time += dt;
  requestAnimationFrame(animate);
}


animate();
