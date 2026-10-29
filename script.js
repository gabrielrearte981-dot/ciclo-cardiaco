/* Interfaz: un único reloj controla esquema, válvulas, curva y lecturas. */
(function () {
  'use strict';
  const { PARAMETERS, PHASES, createCycle, getState, clamp } = window.CardiacModel;
  const $ = id => document.getElementById(id);
  const elements = {};
  ['metric-hr', 'metric-sv', 'metric-co', 'metric-volume', 'volume-trend', 'chamber-volume', 'ventricle-fill', 'ventricle-level', 'mitral-flow', 'aortic-flow', 'mitral-valve', 'aortic-valve', 'mitral-upper', 'mitral-lower', 'aortic-upper', 'aortic-lower', 'mitral-svg-state', 'aortic-svg-state', 'mitral-state', 'aortic-state', 'phase-summary', 'phase-index', 'phase-category', 'phase-name', 'phase-description', 'pressure-relation', 'flow-description', 'time-readout', 'volume-chart', 'phase-backgrounds', 'chart-grid', 'timeline-segments', 'volume-area', 'volume-curve', 'chart-labels', 'chart-cursor', 'chart-dot', 'chart-dot-halo', 'cycle-position', 'cycle-percent', 'phase-buttons', 'play-pause', 'play-icon', 'play-label', 'playback-status', 'heart-rate', 'hr-output', 'cycle-duration', 'playback-speed'].forEach(id => { elements[id] = $(id); });
  const number = (value, digits = 0) => value.toLocaleString('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const chart = { left: 76, right: 932, top: 91, bottom: 266, min: 30, max: 140 };
  const x = time => chart.left + time / cycle.duration * (chart.right - chart.left);
  const y = volume => chart.bottom - (volume - chart.min) / (chart.max - chart.min) * (chart.bottom - chart.top);
  const ns = 'http://www.w3.org/2000/svg';
  const state = { time: 0, playing: false, speed: 0.25, previousStamp: null, lastPhase: -1, dragging: false };
  let cycle = createCycle();

  function svgElement(tag, attributes, text) {
    const element = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function buildPhaseButtons() {
    elements['phase-buttons'].replaceChildren();
    cycle.phases.forEach(phase => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'phase-button';
      button.style.setProperty('--button-color', phase.color);
      button.style.setProperty('--button-soft', phase.soft);
      button.setAttribute('aria-label', `Fase ${phase.index + 1}: ${phase.name}`);
      button.setAttribute('aria-pressed', 'false');
      const index = document.createElement('span');
      index.className = 'phase-number';
      index.textContent = String(phase.index + 1).padStart(2, '0');
      const name = document.createElement('span');
      name.textContent = phase.shortName;
      const duration = document.createElement('small');
      duration.textContent = `${number(phase.duration * 1000)} ms`;
      button.append(index, name, duration);
      button.addEventListener('click', () => goToPhase(phase.index));
      elements['phase-buttons'].append(button);
    });
  }

  function drawChart() {
    ['phase-backgrounds', 'chart-grid', 'timeline-segments', 'chart-labels'].forEach(id => elements[id].replaceChildren());
    cycle.phases.forEach(phase => {
      const width = x(phase.end) - x(phase.start);
      elements['phase-backgrounds'].append(svgElement('rect', { x: x(phase.start), y: chart.top, width, height: chart.bottom - chart.top, fill: phase.soft, opacity: 0.6 }));
      elements['timeline-segments'].append(svgElement('rect', { x: x(phase.start) + 1, y: 22, width: Math.max(1, width - 2), height: 28, fill: phase.soft, rx: 3 }));
      elements['timeline-segments'].append(svgElement('rect', { x: x(phase.start) + 1, y: 48, width: Math.max(1, width - 2), height: 2, fill: phase.color }));
      if (width > 18) elements['timeline-segments'].append(svgElement('text', { x: x(phase.start) + width / 2, y: 40, 'text-anchor': 'middle', class: 'timeline-number' }, String(phase.index + 1)));
      elements['chart-grid'].append(svgElement('line', { x1: x(phase.start), x2: x(phase.start), y1: chart.top, y2: chart.bottom, class: 'chart-grid-line' }));
    });
    [50, 85, 120].forEach(volume => {
      elements['chart-grid'].append(svgElement('line', { x1: chart.left, x2: chart.right, y1: y(volume), y2: y(volume), class: volume === 85 ? 'chart-grid-line' : 'chart-limit-line' }));
      elements['chart-labels'].append(svgElement('text', { x: chart.left - 12, y: y(volume) + 4, 'text-anchor': 'end', class: 'chart-label' }, String(volume)));
    });
    elements['chart-labels'].append(svgElement('text', { x: chart.left, y: 76, class: 'chart-axis-title' }, 'Volumen ventricular (mL)'));
    elements['chart-labels'].append(svgElement('text', { x: chart.left - 12, y: 40, 'text-anchor': 'end', class: 'chart-label' }, 'Fase'));
    for (let index = 0; index <= 5; index++) {
      const time = cycle.duration * index / 5;
      elements['chart-labels'].append(svgElement('text', { x: x(time), y: chart.bottom + 22, 'text-anchor': 'middle', class: 'chart-label' }, number(time * 1000)));
    }
    elements['chart-labels'].append(svgElement('text', { x: (chart.left + chart.right) / 2, y: 314, 'text-anchor': 'middle', class: 'chart-axis-title' }, 'Tiempo del ciclo (ms)'));
    // Incluir límites de fase exactos evita que el muestreo recorte las mesetas.
    const times = [...Array.from({ length: 501 }, (_, i) => i / 500 * cycle.duration), ...cycle.phases.flatMap(phase => [phase.start, phase.end])].sort((a, b) => a - b);
    const path = times.map((time, index) => `${index ? 'L' : 'M'}${x(time).toFixed(3)} ${y(getState(cycle, time).volume).toFixed(3)}`).join(' ');
    elements['volume-curve'].setAttribute('d', path);
    elements['volume-area'].setAttribute('d', `${path} L${chart.right} ${chart.bottom} L${chart.left} ${chart.bottom} Z`);
    buildPhaseButtons();
    elements['metric-hr'].textContent = number(cycle.heartRate);
    elements['metric-sv'].textContent = number(cycle.strokeVolume);
    elements['metric-co'].textContent = number(cycle.cardiacOutput, 2);
    elements['hr-output'].replaceChildren(document.createTextNode(`${cycle.heartRate} `), Object.assign(document.createElement('span'), { textContent: 'lpm' }));
    elements['heart-rate'].setAttribute('aria-valuetext', `${cycle.heartRate} latidos por minuto`);
    elements['cycle-duration'].textContent = `${number(cycle.duration * 1000)} ms`;
    state.lastPhase = -1;
  }

  function setValve(prefix, open, pivot) {
    elements[`${prefix}-valve`].classList.toggle('is-open', open);
    elements[`${prefix}-upper`].setAttribute('d', open ? `M${pivot} 221 L${pivot + 17} 228` : `M${pivot} 221 L${pivot} 240`);
    elements[`${prefix}-lower`].setAttribute('d', open ? `M${pivot} 259 L${pivot + 17} 252` : `M${pivot} 259 L${pivot} 240`);
    elements[`${prefix}-state`].textContent = open ? 'Abierta' : 'Cerrada';
    elements[`${prefix}-state`].classList.toggle('is-open', open);
    elements[`${prefix}-svg-state`].textContent = open ? 'Abierta' : 'Cerrada';
    elements[`${prefix}-flow`].toggleAttribute('hidden', !open);
  }

  function render() {
    const current = getState(cycle, state.time);
    const { phase, volume } = current;
    if (state.lastPhase !== phase.index) {
      state.lastPhase = phase.index;
      setValve('mitral', phase.mitralOpen, 254);
      setValve('aortic', phase.aorticOpen, 539);
      elements['phase-summary'].style.setProperty('--phase', phase.color);
      elements['phase-summary'].style.setProperty('--phase-soft', phase.soft);
      elements['phase-index'].textContent = String(phase.index + 1).padStart(2, '0');
      elements['phase-category'].textContent = phase.category.toLocaleUpperCase('es');
      elements['phase-name'].textContent = phase.name;
      elements['phase-description'].textContent = phase.description;
      elements['pressure-relation'].textContent = phase.pressure;
      elements['flow-description'].textContent = phase.flow;
      elements['volume-trend'].textContent = phase.trend;
      Array.from(elements['phase-buttons'].children).forEach((button, index) => button.setAttribute('aria-pressed', String(index === phase.index)));
    }
    // Escala de nivel absoluta: 0 mL en y=346; 120 mL en y=146.
    const level = 346 - volume / PARAMETERS.endDiastolicVolume * 200;
    elements['ventricle-fill'].setAttribute('y', level.toFixed(3));
    elements['ventricle-fill'].setAttribute('height', (346 - level).toFixed(3));
    elements['ventricle-level'].setAttribute('y1', level.toFixed(3));
    elements['ventricle-level'].setAttribute('y2', level.toFixed(3));
    elements['metric-volume'].textContent = number(volume);
    elements['chamber-volume'].textContent = number(volume);
    elements['chart-cursor'].setAttribute('x1', x(current.time));
    elements['chart-cursor'].setAttribute('x2', x(current.time));
    ['chart-dot', 'chart-dot-halo'].forEach(id => { elements[id].setAttribute('cx', x(current.time)); elements[id].setAttribute('cy', y(volume)); });
    const offset = -(state.time * 130);
    elements['mitral-flow'].style.strokeDashoffset = offset;
    elements['aortic-flow'].style.strokeDashoffset = offset;
    elements['time-readout'].textContent = `${number(current.time * 1000)} / ${number(cycle.duration * 1000)} ms`;
    elements['cycle-position'].value = String(Math.round(current.fraction * 10000));
    elements['cycle-position'].setAttribute('aria-valuetext', `${number(current.time * 1000)} milisegundos. ${phase.name}. Volumen ${number(volume)} mililitros.`);
    elements['cycle-percent'].textContent = `${number(current.fraction * 100)} %`;
  }

  function setPlaying(playing) {
    state.playing = playing;
    state.previousStamp = null;
    if (playing && state.time >= cycle.duration) state.time = 0;
    elements['play-label'].textContent = playing ? 'Pausar' : 'Reproducir';
    elements['play-icon'].replaceChildren(svgElement('path', { d: playing ? 'M7 5 H10 V19 H7 Z M14 5 H17 V19 H14 Z' : 'M8 5 L19 12 L8 19 Z' }));
    elements['playback-status'].textContent = playing ? 'En curso' : 'En pausa';
    elements['playback-status'].classList.toggle('is-playing', playing);
    elements['play-pause'].setAttribute('aria-label', playing ? 'Pausar el ciclo' : 'Reproducir el ciclo');
    render();
  }

  function seek(time) { setPlaying(false); state.time = clamp(time, 0, cycle.duration); render(); }
  function goToPhase(index) { seek(cycle.phases[(index + PHASES.length) % PHASES.length].start); }
  function movePhase(direction) { goToPhase(getState(cycle, state.time).phase.index + direction); }

  elements['play-pause'].addEventListener('click', () => setPlaying(!state.playing));
  $('previous-phase').addEventListener('click', () => movePhase(-1));
  $('next-phase').addEventListener('click', () => movePhase(1));
  $('restart').addEventListener('click', () => seek(0));
  elements['cycle-position'].addEventListener('input', event => seek(Number(event.target.value) / 10000 * cycle.duration));
  elements['heart-rate'].addEventListener('input', event => {
    // Preservar fase y avance dentro de ella cuando cambia la frecuencia.
    const previous = getState(cycle, state.time);
    cycle = createCycle(Number(event.target.value));
    const phase = cycle.phases[previous.phase.index];
    state.time = phase.start + phase.duration * previous.progress;
    state.previousStamp = null;
    drawChart();
    render();
  });
  elements['playback-speed'].addEventListener('change', event => { state.speed = Number(event.target.value); state.previousStamp = null; });

  function seekFromPointer(event) {
    const point = elements['volume-chart'].createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = elements['volume-chart'].getScreenCTM();
    if (!matrix) return;
    const local = point.matrixTransform(matrix.inverse());
    seek(clamp((local.x - chart.left) / (chart.right - chart.left), 0, 1) * cycle.duration);
  }
  elements['volume-chart'].addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    state.dragging = true;
    elements['volume-chart'].setPointerCapture(event.pointerId);
    seekFromPointer(event);
  });
  elements['volume-chart'].addEventListener('pointermove', event => { if (state.dragging) seekFromPointer(event); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => elements['volume-chart'].addEventListener(name, () => { state.dragging = false; }));
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.closest('input, select, button, textarea, summary, a') || target.isContentEditable)) return;
    if (event.code === 'Space') { event.preventDefault(); setPlaying(!state.playing); }
    if (event.key === 'ArrowRight') { event.preventDefault(); movePhase(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); movePhase(-1); }
  });
  // Al volver a la pestaña no se acumulan saltos de tiempo.
  document.addEventListener('visibilitychange', () => { state.previousStamp = null; });
  function animate(stamp) {
    if (state.playing && !document.hidden) {
      if (state.previousStamp !== null) {
        const elapsed = Math.min((stamp - state.previousStamp) / 1000, 0.1);
        state.time = (state.time + elapsed * state.speed) % cycle.duration;
        render();
      }
      state.previousStamp = stamp;
    } else state.previousStamp = null;
    window.requestAnimationFrame(animate);
  }
  drawChart();
  setPlaying(false);
  window.requestAnimationFrame(animate);
})();
