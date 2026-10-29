# Ciclo cardíaco · Laboratorio de fisiología

Simulador didáctico del corazón izquierdo, listo para abrir en VSCode. No requiere instalación, compilación, cuenta ni conexión a Internet.

## Abrir y ejecutar

1. Extraé el ZIP.
2. En VSCode, elegí **Archivo → Abrir carpeta** y seleccioná `ciclo-cardiaco`.
3. Abrí `index.html` en tu navegador desde el explorador de archivos de Windows (doble clic).

También podés usar **Live Server** si ya tenés esa extensión de VSCode: clic derecho en `index.html` → **Open with Live Server**. Es opcional.

Al guardar una modificación, recargá la pestaña del navegador. Si abrís directamente el archivo, mantené los archivos de código juntos en la misma carpeta.

## Qué incluye

- Circuito con aurícula izquierda, ventrículo izquierdo y aorta.
- Válvulas mitral y aórtica que cambian de estado según la fase.
- Flechas que muestran la dirección del flujo transvalvular.
- Nivel ventricular y curva de volumen sincronizados.
- Línea temporal proporcional a la duración de las fases.
- Reproducción, pausa, fase anterior, siguiente y reinicio.
- Frecuencia entre 40 y 150 lpm, y cámara lenta independiente.
- Exploración del tiempo con clic/arrastre en el gráfico o con la barra inferior.
- Lecturas de frecuencia, volumen sistólico, gasto cardíaco y volumen actual.

El simulador comienza **en pausa**, a **75 lpm** y con velocidad **×0,25**. En cámara lenta ×0,25, un ciclo fisiológico de 800 ms se observa en 3,2 s.

## Controles

| Acción | Control |
| --- | --- |
| Reproducir / pausar | Botón o barra espaciadora |
| Fase anterior / siguiente | Botones o flechas izquierda / derecha |
| Ir al comienzo de una fase | Tarjeta numerada de la fase |
| Explorar un instante | Clic/arrastre en el gráfico o barra «Explorar ciclo» |
| Cambiar frecuencia | Barra «Frecuencia cardíaca» |
| Cambiar velocidad visual | Selector «Velocidad de reproducción» |

Seleccionar una fase, explorar el tiempo o reiniciar pausa el ciclo. Cambiar la frecuencia conserva la fase actual y la proporción de avance dentro de ella. Al llegar al final durante la reproducción, el ciclo se repite. Al ocultar la pestaña, el tiempo deja de avanzar hasta volver.

Los atajos globales no interfieren cuando el foco está sobre un control: allí funcionan las teclas propias de cada botón, barra o selector.

## Archivos y puntos de modificación

| Archivo | Función |
| --- | --- |
| `index.html` | Estructura de la interfaz y dibujo SVG del circuito |
| `styles.css` | Colores, tipografía, tamaños y diseño adaptable |
| `model.js` | Parámetros, fases, tiempos y función de volumen |
| `script.js` | Reloj de animación, controles y representación gráfica |
| `tests/model.test.cjs` | Comprobaciones del núcleo fisiológico simplificado |
| `package.json` | Comando opcional para ejecutar las pruebas con Node |

**Para cambiar la estética:** editá las variables al comienzo de `styles.css`. Los colores de cada fase están en `PHASES`, en `model.js`.

**Para modificar el modelo:** empezá por `PARAMETERS`, `createCycle()` y `getState()` en `model.js`. Si cambiás los volúmenes de referencia, actualizá también los textos explicativos, las lecturas fijas y las marcas del esquema y del gráfico, que en esta primera versión están diseñadas para 120/50 mL.

**Para ampliar después:** el modelo está separado de la interfaz; podemos sumar presiones, ECG, ruidos cardíacos o parámetros de llenado sin reemplazar el diseño completo.

## Supuestos fisiológicos y matemáticos

Se usa una secuencia cíclica de cinco fases, comenzando con la apertura mitral. La sístole auricular ocurre durante la diástole ventricular.

| Fase | Mitral | Aórtica | Volumen |
| --- | --- | --- | --- |
| Llenado pasivo | Abierta | Cerrada | Aumenta de 50 a 106 mL |
| Sístole auricular | Abierta | Cerrada | Aumenta de 106 a 120 mL |
| Contracción isovolumétrica | Cerrada | Cerrada | 120 mL constantes |
| Eyección ventricular | Cerrada | Abierta | Desciende de 120 a 50 mL |
| Relajación isovolumétrica | Cerrada | Cerrada | 50 mL constantes |

- **VTD = 120 mL; VTS = 50 mL; VS = 70 mL.**
- **GC (L/min) = FC (lpm) × VS (mL/latido) / 1000.**
- **Duración del ciclo (s) = 60 / FC.**
- El llenado pasivo aporta aquí el 80 % del **volumen incorporado por latido** (56 de 70 mL); la contracción auricular agrega 14 mL. Es una elección ilustrativa, no una fracción universal.
- El llenado pasivo se divide en un ascenso rápido y una diástasis simplificada. Las interpolaciones son suaves y continuas; no derivan de mediciones de un paciente.
- El gasto mostrado es un **cálculo por minuto**, no un caudal instantáneo.
- La regla de tiempos es `sístole = 0.30 × (75 / FC)^0.35` segundos; la diástole ocupa el tiempo restante. La contracción isovolumétrica ocupa 1/6 de la sístole y la eyección 5/6. El llenado pasivo, la sístole auricular y la relajación isovolumétrica ocupan respectivamente el 66 %, 20 % y 14 % de la diástole.
- A 75 lpm, las cinco fases duran 330, 100, 50, 250 y 70 ms. Los milisegundos mostrados se redondean individualmente.
- La regla de tiempos es **didáctica, no una ecuación clínica validada**. Dentro del rango permitido, la diástole cambia más en términos absolutos que la sístole al modificar la frecuencia.
- El volumen sistólico permanece fijo aunque cambie la frecuencia. No se modelan Frank-Starling, contractilidad, poscarga ni disminución del llenado con taquicardia.
- La aurícula y la aorta son reservorios esquemáticos con niveles gráficos fijos. El nivel del ventrículo es un indicador de volumen, no una superficie real de sangre ni una forma anatómica.
- Las relaciones de presión se muestran de forma **cualitativa** para un circuito con válvulas ideales. No se calculan curvas de presión ni se modela la inercia del flujo.

Referencia conceptual: [OpenStax, Anatomy and Physiology 2e, sección 19.3: Cardiac Cycle](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle). La interfaz, los gráficos y los textos explicativos son originales; no se incluyen imágenes externas.

## Pruebas opcionales

Para usar el simulador no necesitás Node. Si lo tenés instalado, podés comprobar el núcleo del modelo desde la terminal de VSCode:

```bash
npm test
```

También se puede ejecutar directamente:

```bash
node --test tests/model.test.cjs
```

Se comprueban duración del ciclo, continuidad del volumen entre fases y al reiniciar, límites, dirección de los cambios de volumen, válvulas y cálculo del gasto para todo el rango de frecuencias.

Probalo en una versión actual de Chrome, Edge, Firefox o Safari. No se usan bibliotecas externas, fuentes remotas, solicitudes de red ni almacenamiento de datos.
