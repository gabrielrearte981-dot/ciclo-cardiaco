/* Núcleo del modelo, independiente del DOM. Cargable sin servidor (file://).
 * Las curvas y duraciones son reglas didácticas, no un modelo hemodinámico.
 */
(function (root) {
  'use strict';

  const PARAMETERS = Object.freeze({
    endDiastolicVolume: 120,
    endSystolicVolume: 50,
    passiveStrokeFraction: 0.8,
    minHeartRate: 40,
    maxHeartRate: 150,
    defaultHeartRate: 75
  });

  const PHASES = Object.freeze([
    Object.freeze({ id: 'filling', name: 'Llenado pasivo', shortName: 'Llenado pasivo', category: 'Diástole ventricular', color: '#16867b', soft: '#e9f5f1', mitralOpen: true, aorticOpen: false, trend: 'En aumento', description: 'La sangre pasa de la aurícula al ventrículo. El llenado es rápido al principio y se hace más lento al final.', pressure: 'P auricular > P ventricular', flow: 'Flujo: aurícula → ventrículo' }),
    Object.freeze({ id: 'atrial', name: 'Sístole auricular', shortName: 'Sístole auricular', category: 'Diástole ventricular', color: '#477bb5', soft: '#edf3fb', mitralOpen: true, aorticOpen: false, trend: 'En aumento', description: 'La contracción auricular completa el llenado. El ventrículo alcanza su volumen telediastólico antes de iniciar la sístole ventricular.', pressure: 'P auricular > P ventricular', flow: 'Flujo: aurícula → ventrículo' }),
    Object.freeze({ id: 'contraction', name: 'Contracción isovolumétrica', shortName: 'Contracción isovol.', category: 'Sístole ventricular', color: '#9d7940', soft: '#faf4e8', mitralOpen: false, aorticOpen: false, trend: 'Constante · volumen máximo', description: 'La mitral se ha cerrado y la aórtica aún no se abre. Aumenta la presión ventricular con ambas válvulas cerradas: el volumen permanece en 120 mL.', pressure: 'P auricular < P ventricular < P aórtica', flow: 'Sin flujo a través de las válvulas' }),
    Object.freeze({ id: 'ejection', name: 'Eyección ventricular', shortName: 'Eyección', category: 'Sístole ventricular', color: '#bb7045', soft: '#fbf0e9', mitralOpen: false, aorticOpen: true, trend: 'En descenso', description: 'La aórtica está abierta y la sangre sale hacia la aorta. El volumen ventricular desciende de 120 a 50 mL: se eyectan 70 mL.', pressure: 'P ventricular > P aórtica · esquema ideal', flow: 'Flujo: ventrículo → aorta' }),
    Object.freeze({ id: 'relaxation', name: 'Relajación isovolumétrica', shortName: 'Relajación isovol.', category: 'Diástole ventricular', color: '#8171ab', soft: '#f2eef8', mitralOpen: false, aorticOpen: false, trend: 'Constante · volumen mínimo', description: 'La aórtica se ha cerrado y la mitral todavía está cerrada. Disminuye la presión ventricular sin cambio de volumen: quedan 50 mL.', pressure: 'P auricular < P ventricular < P aórtica', flow: 'Sin flujo a través de las válvulas' })
  ]);

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function smoothstep(x) { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); }

  function createCycle(heartRate = PARAMETERS.defaultHeartRate) {
    if (!Number.isFinite(heartRate)) throw new TypeError('La frecuencia debe ser un número finito.');
    const rate = clamp(heartRate, PARAMETERS.minHeartRate, PARAMETERS.maxHeartRate);
    const duration = 60 / rate;
    // A 75 lpm: 0,30 s de sístole y 0,50 s de diástole.
    // Regla ilustrativa: la sístole se acorta menos que el ciclo completo.
    const systole = 0.30 * Math.pow(75 / rate, 0.35);
    const diastole = duration - systole;
    const durations = [diastole * 0.66, diastole * 0.20, systole / 6, systole * 5 / 6, diastole * 0.14];
    let boundary = 0;
    const phases = PHASES.map((phase, index) => {
      const start = boundary;
      boundary += durations[index];
      return Object.freeze({ ...phase, index, start, end: index === PHASES.length - 1 ? duration : boundary, duration: durations[index] });
    });
    return Object.freeze({ heartRate: rate, duration, systole, diastole, phases: Object.freeze(phases), strokeVolume: PARAMETERS.endDiastolicVolume - PARAMETERS.endSystolicVolume, cardiacOutput: rate * (PARAMETERS.endDiastolicVolume - PARAMETERS.endSystolicVolume) / 1000 });
  }

  function getState(cycle, time) {
    if (!Number.isFinite(time)) throw new TypeError('El tiempo debe ser un número finito.');
    // El extremo derecho permite inspeccionar el último instante, sin saltar a 0.
    const t = clamp(time, 0, cycle.duration);
    const phase = cycle.phases.find(item => t < item.end) || cycle.phases[cycle.phases.length - 1];
    const progress = clamp((t - phase.start) / phase.duration, 0, 1);
    const esv = PARAMETERS.endSystolicVolume;
    const edv = PARAMETERS.endDiastolicVolume;
    const sv = edv - esv;
    const passiveEnd = esv + sv * PARAMETERS.passiveStrokeFraction;
    let volume;
    switch (phase.id) {
      case 'filling': {
        // Llenado rápido seguido de una diástasis simplificada.
        const fraction = progress < 0.58 ? 0.96 * smoothstep(progress / 0.58) : 0.96 + 0.04 * smoothstep((progress - 0.58) / 0.42);
        volume = esv + (passiveEnd - esv) * fraction;
        break;
      }
      case 'atrial': volume = passiveEnd + (edv - passiveEnd) * smoothstep(progress); break;
      case 'contraction': volume = edv; break;
      case 'ejection': volume = edv - sv * smoothstep(progress); break;
      case 'relaxation': volume = esv; break;
      default: throw new Error('Fase desconocida.');
    }
    return { time: t, phase, progress, volume, fraction: t / cycle.duration };
  }

  const api = Object.freeze({ PARAMETERS, PHASES, createCycle, getState, clamp });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CardiacModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
