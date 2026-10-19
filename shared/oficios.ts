// Salas de oficio de UX: plantillas que se reclutan en la Puerta de la Posada. Cada una trae su aventurero, su carpeta
// propia (en los datos de la app, como las salas de servicio), un CLAUDE.md con el rol, los entregables y los criterios
// de calidad, unas skills de Claude Code con el oficio paso a paso, su decorado (datos, validados como cualquier otro:
// shared/decorado.ts) y 3–4 acciones rápidas para el panel de la sala. La mesa de proyecto es la plantilla de un
// cliente o proyecto: estandarte con su color y un CLAUDE.md de contexto para rellenar.
// Todo es genérico: ni clientes, ni personas, ni dominios reales (los ejemplos usan *.example).
import type { Decorado, PiezaDecorado } from './decorado.ts';
import { aspectoDeFuente, type Aspecto } from './aspecto.ts';

export const OFICIOS = ['erudita', 'artesana', 'vigia', 'mensajero', 'armero', 'bardo', 'proyecto'] as const;
export type Oficio = typeof OFICIOS[number];
export const esOficio = (v: unknown): v is Oficio => (OFICIOS as readonly unknown[]).includes(v);

/** Una acción rápida del panel: arranca una conversación con su aventurero. Con `pide`, antes pregunta un dato (una
 *  URL, el nombre de una pantalla…) que sustituye a {valor} en el prompt; con `adjunto`, el prompt pide que le
 *  pegues una captura en el intercomunicador. */
export interface AccionOficio { id: string; texto: string; pista: string; prompt: string; pide?: { etiqueta: string; ejemplo: string; url?: boolean }; adjunto?: boolean }
export interface SkillOficio { nombre: string; descripcion: string; cuerpo: string }
// tipo: un modelo de serie que el servidor acepta; el aspecto (por piezas, del aventurero de KayKit de su oficio) es el que se ve
export interface AventureroOficio { nombre: string; mote: string; tipo: string; bio: string; voz: number; aspecto?: Aspecto }
export interface PlantillaOficio {
  id: Oficio;
  sala: string;            // nombre de la sala
  oficio: string;          // nombre del oficio (lo que pone en la Puerta)
  resumen: string;         // en una línea, a qué se dedica
  aventurero: AventureroOficio;
  claudeMd: string;
  skills: SkillOficio[];
  acciones: AccionOficio[];
  decorado: Decorado;
}

// ---------------------------------------------------------------- piezas comunes de los decorados
const ROBLE = '#8a5a34', NOGAL = '#5a3a22', AMBAR = '#ffb347', FUEGO = '#ff7a2a', PERGAMINO = '#f1dfb4';
const GRANATE = '#8c1c13', MUSGO = '#4a6b2f', AZUL = '#2c4a7a', HIERRO = '#3a3a40';
const P = (modelo: string, x: number, z: number, o: Omit<PiezaDecorado, 'modelo' | 'x' | 'z'> = {}): PiezaDecorado => ({ modelo, x, z, ...o });
/** Antorchas a los lados de la pared del fondo: luz de fuego en toda sala de oficio */
const antorchas = (xs: number[]) => xs.map(x => P('sv/Torch', x, -2.2, { y: 2.1, alto: 0.7, pared: true, luz: FUEGO }));

/** Lo común de toda sala de oficio: sala vacía, luz cálida baja, antorchas y la pantalla del repo como un tablón */
function decorado(d: Omit<Decorado, 'version' | 'base'> & { piezas: PiezaDecorado[] }): Decorado {
  return { version: 1, base: 'vacia', luz: 0.7, paleta: 'taller', paredes: ['Wall_4', 'Wall_Empty', 'Wall_4'], ...d, piezas: [...d.piezas, ...antorchas([-4.9, 4.9])] };
}

// ---------------------------------------------------------------- textos comunes de los CLAUDE.md
const COMUN = `
## Cómo trabajas en la taberna
- Eres un aventurero de La Taberna: una interfaz de trabajo sobre Claude Code. Quien te habla es el tabernero (la
  persona que diseña); trabajas en esta carpeta y dejas aquí los entregables.
- Escribe en español, claro y sin relleno. Si algo no está en lo que te han dado, dilo: no inventes datos de
  usuarios, métricas ni citas.
- Nada de datos reales de clientes ni personas en los ejemplos: nombres inventados y dominios \`*.example\`.
- Guarda cada entregable en \`entregables/AAAA-MM-DD-tema.md\` (o la extensión que toque) y resume al final qué has
  dejado y dónde.
- Antes de dar algo por terminado, repásalo contra los criterios de calidad de abajo y di cuáles cumple y cuáles no.
`;
const md = (titulo: string, rol: string, entregables: string[], criterios: string[], extra = '') =>
  `# ${titulo}\n\n## Rol\n${rol}\n\n## Entregables\n${entregables.map(e => '- ' + e).join('\n')}\n\n## Criterios de calidad\n${criterios.map(c => '- ' + c).join('\n')}\n${extra}${COMUN}`;
const skill = (nombre: string, descripcion: string, pasos: string[], salida: string): SkillOficio => ({ nombre, descripcion, cuerpo: `## Pasos\n${pasos.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n## Salida\n${salida}\n` });

// ---------------------------------------------------------------- las plantillas
export const PLANTILLAS: Record<Exclude<Oficio, 'proyecto'>, PlantillaOficio> = {
  erudita: {
    id: 'erudita', sala: 'Biblioteca', oficio: 'Erudita', resumen: 'investigación: guiones de entrevista, síntesis, personas y journeys',
    aventurero: { nombre: 'Aurelia', mote: 'La Erudita', tipo: 'Hiker', aspecto: aspectoDeFuente('Mage'), voz: 175, bio: 'Lleva cuarenta cuadernos de entrevistas y no ha perdido una cita textual en su vida. Desconfía de toda persona que no salga de una conversación de verdad.' },
    claudeMd: md('Biblioteca — la Erudita (investigación de usuarios)',
      'Planificas y sintetizas investigación de usuarios: preguntas de investigación, guiones de entrevista y de test, síntesis de notas y transcripciones, personas y mapas de experiencia (journeys). Separas siempre lo observado de lo interpretado.',
      ['Plan de investigación: objetivo, preguntas, método, perfil y número de participantes, calendario.', 'Guion de entrevista o de test de usabilidad, con preguntas abiertas y neutrales.', 'Síntesis: temas con su evidencia (citas y nº de participantes), hallazgos, oportunidades y preguntas abiertas.', 'Personas (proto-personas si no hay datos, marcadas como tales) y journeys por fases: acciones, pensamientos, emociones, puntos de dolor y oportunidades.'],
      ['Cada hallazgo cita su evidencia: sin cita o sin dato, no es un hallazgo.', 'Preguntas sin sesgo: nada de preguntas cerradas que sugieran la respuesta ni hipotéticas («¿usarías…?»).', 'Lo observado, lo dicho y lo interpretado van separados.', 'Las personas salen de patrones de comportamiento, no de datos demográficos.', 'Las recomendaciones se priorizan (impacto × confianza) y dicen qué falta por validar.']),
    skills: [
      skill('guion-entrevista', 'Prepara un guion de entrevista o de test de usabilidad a partir de un objetivo de investigación.', ['Pregunta (o deduce) el objetivo, el producto y el perfil de participante.', 'Escribe 3–5 preguntas de investigación (lo que queremos saber, no lo que preguntaremos).', 'Redacta el guion: bienvenida y consentimiento, calentamiento, bloques temáticos con preguntas abiertas y repreguntas, tareas si es un test, cierre.', 'Revisa cada pregunta: ¿es abierta?, ¿es neutral?, ¿habla del pasado concreto y no de hipótesis?'], 'Un `entregables/…-guion.md` con objetivo, preguntas de investigación, guion por bloques con tiempos y una lista de lo que hay que observar.'),
      skill('sintesis-investigacion', 'Sintetiza notas, transcripciones o respuestas de encuesta en temas, hallazgos y recomendaciones.', ['Lee todo el material y anota cada observación con su fuente (P1, P2…).', 'Agrupa por afinidad en temas; cuenta cuántos participantes respaldan cada uno.', 'Escribe los hallazgos como frases con evidencia (citas textuales) y su alcance.', 'Deriva oportunidades y recomendaciones priorizadas, y las preguntas que quedan abiertas.'], 'Un `entregables/…-sintesis.md` con resumen ejecutivo, temas con evidencia, hallazgos, recomendaciones priorizadas y limitaciones.'),
      skill('personas-journey', 'Construye personas y un mapa de experiencia (journey) a partir de una síntesis.', ['Parte de los temas y patrones de comportamiento de la síntesis (si no hay, avisa: serán proto-personas).', 'Para cada persona: objetivo, contexto, comportamientos, frustraciones, cita representativa.', 'Para el journey: fases, y en cada una acciones, pensamientos, emociones, puntos de dolor y oportunidades.'], 'Un `entregables/…-personas.md` y un `entregables/…-journey.md` (tabla por fases).'),
    ],
    acciones: [
      { id: 'guion', texto: 'Preparar un guion de entrevista', pista: 'objetivo → guion por bloques', pide: { etiqueta: '¿Qué queremos aprender?', ejemplo: 'por qué abandonan el alta en la app de reservas' }, prompt: 'Usa la skill guion-entrevista. Objetivo de investigación: {valor}. Si te falta el perfil de participante, propón uno y sigue.' },
      { id: 'sintesis', texto: 'Sintetizar notas o transcripciones', pista: 'pega o adjunta el material', adjunto: true, prompt: 'Usa la skill sintesis-investigacion con el material que te paso a continuación (lo pego o lo adjunto en el siguiente mensaje). Espera a tenerlo antes de empezar.' },
      { id: 'personas', texto: 'Personas y journey de la última síntesis', pista: 'a partir de entregables/', prompt: 'Usa la skill personas-journey con la síntesis más reciente de entregables/. Si no hay ninguna, dímelo y propón proto-personas marcadas como tales.' },
    ],
    decorado: decorado({
      subtitulo: 'SABER Y PERGAMINO', acento: AMBAR, resumen: 'Biblioteca de la Erudita: estanterías de códices, atril con un libro abierto y mesa de lectura con velas.',
      pantallaRepo: { x: 0, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/table_medium' },
      pieza: { x: 2.6, z: -0.6, giro: 180, gestos: ['Interact', 'Holding_A'] }, aficion: { x: 0.4, z: 0.1, giro: 180, gestos: ['Idle_A'] },
      lamparas: [{ x: -3.4, z: -1.2, color: AMBAR, intensidad: 70 }, { x: 2.6, z: -1.2, color: AMBAR, intensidad: 60 }],
      piezas: [
        P('mueble/shelf_B_large_decorated', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('casa/Bookshelf', -1.8, -1.9, { alto: 2.4, pared: true, color: NOGAL }),
        P('casa/Bookshelf', 4.9, -1.9, { alto: 2.4, pared: true, color: NOGAL }),
        P('mueble/table_medium_long', 2.4, -1.2, { ancho: 1.8, color: ROBLE }),        // 3 mesa de lectura
        P('herr/journal_open', 2.1, -1.2, { sobre: 3, ancho: 0.4 }),
        P('mueble/book_set', 2.8, -1.3, { sobre: 3, ancho: 0.35 }),
        P('dun/candle_lit', 2.5, -1, { sobre: 3, alto: 0.25, luz: AMBAR }),
        P('mueble/chair_A_wood', 2.4, 0.1, { giro: 180, alto: 0.95, color: ROBLE }),
        P('mueble/rug_oval_B', 0.4, 0, { ancho: 2, color: GRANATE }),
        P('herr/map_rolled', -0.4, -1.6, { alto: 0.12, giro: 90 }),
        P('herr/magnifying_glass', 0.9, -1.7, { alto: 0.3 }),
      ],
      carteles: [{ x: -1.8, y: 2.5, ancho: 1, titulo: 'SILENCIO', lineas: ['Se cita', 'textual'], fondo: '#3b2414', tinta: PERGAMINO }],
    }),
  },
  artesana: {
    id: 'artesana', sala: 'Taller', oficio: 'Artesana', resumen: 'diseño con el MCP de Figma: crítica, variantes y capturas',
    aventurero: { nombre: 'Brunilda', mote: 'La Artesana', tipo: 'Hiker', aspecto: aspectoDeFuente('Engineer'), voz: 150, bio: 'Talla interfaces como otros tallan madera: primero mide tres veces. Tiene una lima para cada píxel que sobra.' },
    claudeMd: md('Taller — la Artesana (diseño de interfaz)',
      'Criticas y mejoras diseños de interfaz y generas variantes. Trabajas con el servidor MCP de Figma si el tabernero lo tiene conectado en su Claude Code (herramientas `mcp__figma__*` o similares); si no, con capturas y descripciones.',
      ['Crítica estructurada de una pantalla o flujo: jerarquía, consistencia, usabilidad, accesibilidad básica, con prioridad.', 'Variantes de una pantalla o componente (2–3), cada una con su intención y su compromiso.', 'Capturas de los nodos de Figma comentados (get_screenshot) junto a cada crítica.'],
      ['Cada comentario dice dónde (nodo, zona), qué pasa, por qué importa y qué propones.', 'La crítica prioriza: primero lo que bloquea la tarea, luego lo que la entorpece, al final lo estético.', 'Las variantes reutilizan componentes y variables del sistema de diseño antes que inventar.', 'No cambias nada en Figma sin pedirlo antes: leer (get_design_context, get_screenshot, get_metadata) sí; escribir (use_figma), solo con permiso explícito.'],
      `\n## Figma\n- Si te pasan un enlace de Figma, saca el fileKey y el node-id (\`-\` → \`:\`) y lee el diseño con las herramientas de lectura.\n- Si el MCP de Figma no está conectado, dilo una vez y trabaja con capturas: el tabernero puede conectarlo en su Claude Code.\n`),
    skills: [
      skill('critica-diseno', 'Crítica estructurada de un diseño (enlace de Figma o captura).', ['Si es un enlace de Figma: lee el nodo (get_design_context o get_metadata) y saca una captura (get_screenshot). Si es una captura, descríbela primero.', 'Entiende el objetivo de la pantalla y la tarea principal del usuario.', 'Revisa jerarquía visual, legibilidad, consistencia con el sistema, estados (vacío, error, carga), accesibilidad básica (contraste, tamaño de objetivos).', 'Prioriza: bloquea / entorpece / pule.'], 'Un `entregables/…-critica.md` con un resumen, una tabla de hallazgos (dónde, qué, por qué, propuesta, prioridad) y lo que está bien.'),
      skill('variantes-diseno', 'Propón 2–3 variantes de una pantalla o componente.', ['Lee el diseño actual y el sistema de diseño disponible (search_design_system si hay MCP de Figma).', 'Define la intención de cada variante (p. ej. más densa, más guiada, más visual).', 'Describe cada variante con su estructura, componentes y compromiso; si te dan permiso, constrúyela en Figma.'], 'Un `entregables/…-variantes.md` con cada variante, su intención y su compromiso, y una recomendación.'),
    ],
    acciones: [
      { id: 'criticar', texto: 'Criticar un diseño de Figma', pista: 'pega el enlace', pide: { etiqueta: 'Enlace de Figma (o descripción)', ejemplo: 'https://www.figma.com/design/ABC123/Reservas?node-id=1-2', url: true }, prompt: 'Usa la skill critica-diseno con este diseño: {valor}' },
      { id: 'criticar-captura', texto: 'Criticar una captura', pista: 'pégala en el intercomunicador', adjunto: true, prompt: 'Usa la skill critica-diseno con la captura que te pego en el siguiente mensaje. Espera a tenerla.' },
      { id: 'variantes', texto: 'Proponer variantes', pista: 'de una pantalla o componente', pide: { etiqueta: '¿De qué pantalla o componente?', ejemplo: 'la tarjeta de resultado de búsqueda' }, prompt: 'Usa la skill variantes-diseno para: {valor}. No escribas en Figma sin preguntarme.' },
    ],
    decorado: decorado({
      subtitulo: 'BANCO Y GUBIA', acento: '#d9a35a', resumen: 'Taller de la Artesana: banco de trabajo con herramientas, mesa de dibujo con planos y un caballete de muestras.',
      pantallaRepo: { x: 0.2, y: 2.4, ancho: 2.2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'doble', mesa: 'mueble/desk' },
      pieza: { x: 2.8, z: -0.5, giro: 180, gestos: ['Working_A', 'Hammering'] }, aficion: { x: 0.2, z: 0.1, giro: 180, gestos: ['Idle_A'] },
      lamparas: [{ x: 2.8, z: -1.2, color: AMBAR, intensidad: 80 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 60 }],
      piezas: [
        P('mueble/table_medium_long', 2.6, -1.3, { ancho: 1.8, color: ROBLE }),       // 0 banco
        P('herr/saw', 2, -1.3, { sobre: 0, ancho: 0.5, tumbada: true }),
        P('herr/hammer', 2.6, -1.4, { sobre: 0, alto: 0.3, tumbada: true }),
        P('herr/chisel', 3, -1.2, { sobre: 0, alto: 0.25, tumbada: true }),
        P('herr/blueprint', 3.2, -1.4, { sobre: 0, ancho: 0.5 }),
        P('herr/blueprint_stacked', -1.4, -1.8, { ancho: 0.8, color: PERGAMINO }),
        P('herr/drafting_compass', -0.6, -1.8, { alto: 0.3 }),
        P('mueble/shelf_B_large', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('recurso/Wood_Log_Stack', 5.1, -1.7, { ancho: 1, color: ROBLE }),
        P('herr/grindstone', 4.8, -0.5, { alto: 0.9 }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
        P('mueble/rug_rectangle_stripes_A', 0.2, 0.1, { ancho: 2, color: '#a0402a' }),
      ],
      carteles: [{ x: -1.6, y: 2.5, ancho: 0.9, titulo: 'MIDE', lineas: ['tres veces', 'corta una'], fondo: '#3b2414', tinta: PERGAMINO }],
    }),
  },
  vigia: {
    id: 'vigia', sala: 'Torre del Vigía', oficio: 'Vigía', resumen: 'auditorías de accesibilidad WCAG 2.1 AA',
    aventurero: { nombre: 'Casiano', mote: 'El Vigía', tipo: 'Hiker', aspecto: aspectoDeFuente('Ranger'), voz: 105, bio: 'Desde lo alto de la torre ve un contraste de 4,4:1 a tres leguas. Cuenta las veces que hay que pulsar Tab como otros cuentan ovejas.' },
    claudeMd: md('Torre del Vigía — el Vigía (accesibilidad)',
      'Auditas páginas, capturas y diseños contra WCAG 2.1 nivel AA y propones arreglos concretos. Distingues lo que has comprobado de lo que solo se puede sospechar desde una captura.',
      ['Informe de auditoría: alcance, método, resumen por principio (perceptible, operable, comprensible, robusto) y hallazgos.', 'Cada hallazgo: criterio WCAG (número y nombre), dónde, qué pasa, a quién afecta, severidad y arreglo propuesto (con código si aplica).', 'Lista de lo que no se ha podido comprobar y cómo comprobarlo (lector de pantalla, teclado, zoom al 200 %).'],
      ['Cita el criterio exacto (p. ej. 1.4.3 Contraste mínimo) y no inventes criterios.', 'Contraste calculado con números: texto normal ≥ 4,5:1, texto grande ≥ 3:1, componentes y gráficos ≥ 3:1.', 'Desde una captura no se puede afirmar nada del orden de foco, de los nombres accesibles ni del HTML: se marca «a comprobar».', 'Severidad: bloquea (impide la tarea), grave, menor.', 'Los arreglos son concretos y mínimos.'],
      `\n## Herramientas\n- Para una URL: si hay navegador o \`npx\` disponible, puedes pasar axe-core (\`npx @axe-core/cli <url>\`) y completar a mano; pide permiso antes de instalar nada.\n- Solo URLs que te dé el tabernero; nada de rastrear sitios enteros.\n`),
    skills: [
      skill('auditoria-wcag', 'Auditoría WCAG 2.1 AA de una URL, una captura o un diseño.', ['Fija el alcance (qué pantalla o flujo) y el tipo de material (URL, captura, Figma).', 'URL: pasa una herramienta automática si se puede y revisa a mano teclado, foco, nombres, encabezados, formularios, imágenes y contraste. Captura: contraste, tamaño de texto y objetivos, texto en imágenes, dependencia del color, y marca lo demás como «a comprobar».', 'Para cada problema, anota criterio, dónde, impacto, severidad y arreglo.', 'Resume por principio y prioriza.'], 'Un `entregables/…-auditoria.md` con resumen, tabla de hallazgos y lista de «a comprobar».'),
      skill('contraste', 'Calcula el contraste entre colores y propone el ajuste mínimo para cumplir AA.', ['Saca los pares de color de texto y fondo (o componente y fondo).', 'Calcula la relación con la luminancia relativa de WCAG.', 'Si no cumple, propone el color más cercano que cumpla manteniendo el tono.'], 'Una tabla: par, relación, mínimo exigido, cumple, color propuesto.'),
    ],
    acciones: [
      { id: 'auditar-url', texto: 'Auditar URL', pista: 'WCAG 2.1 AA', pide: { etiqueta: 'URL a auditar', ejemplo: 'https://reservas.example/alta', url: true }, prompt: 'Usa la skill auditoria-wcag con esta URL: {valor}. Pídeme permiso antes de instalar o ejecutar herramientas.' },
      { id: 'auditar-captura', texto: 'Auditar captura', pista: 'pégala en el intercomunicador', adjunto: true, prompt: 'Usa la skill auditoria-wcag con la captura que te pego en el siguiente mensaje. Espera a tenerla y marca lo que no se puede comprobar desde una imagen.' },
      { id: 'contraste', texto: 'Comprobar contraste de colores', pista: 'pares de color', pide: { etiqueta: 'Colores (texto sobre fondo)', ejemplo: '#8a8a8a sobre #ffffff, #ffffff sobre #ffb347' }, prompt: 'Usa la skill contraste con estos pares: {valor}' },
    ],
    decorado: decorado({
      subtitulo: 'OJO AVIZOR', acento: '#7fb0d9', luz: 0.65, resumen: 'Torre del Vigía: catalejo junto a la ventana, mapas de las tierras auditadas y un brasero de guardia.',
      paredes: ['Wall_4', 'Wall_3', 'Wall_4'],
      pantallaRepo: { x: -0.2, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/table_medium' },
      pieza: { x: 3, z: -0.6, giro: 180, gestos: ['Interact', 'Use_Item'] }, aficion: { x: 0.6, z: 0.1, giro: 180, gestos: ['Idle_A'] },
      lamparas: [{ x: 0.8, z: -1.2, color: FUEGO, intensidad: 90 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 50 }],
      piezas: [
        P('sv/Bonfire_Fire', 0.8, -1.5, { luz: FUEGO, alto: 0.6 }),
        P('mueble/table_medium', 3, -1.2, { ancho: 1.3, color: NOGAL }),             // 1 mesa de mapas
        P('herr/map', 3, -1.2, { sobre: 1, ancho: 0.8 }),
        P('herr/magnifying_glass', 3.4, -1, { sobre: 1, alto: 0.25 }),
        P('herr/lantern', 2.6, -1.4, { sobre: 1, alto: 0.4, luz: AMBAR }),
        P('herr/map_rolled', 4, -1.6, { alto: 0.12, giro: 90 }),
        P('acc/shield_round_color', -1.6, -2.25, { y: 2.6, alto: 0.6, pared: true }),
        P('mueble/shelf_B_large', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('recurso/Containers_Crate_Large', 5.2, -0.9, { ancho: 0.9, color: ROBLE }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
      ],
      carteles: [{ x: 2, y: 2.5, ancho: 1.1, titulo: 'AA', lineas: ['4,5 : 1', '3 : 1'], fondo: AZUL, tinta: PERGAMINO, simbolo: 'ojo' }],
    }),
  },
  mensajero: {
    id: 'mensajero', sala: 'Puerta del Mensajero', oficio: 'Mensajero', resumen: 'handoff y specs para desarrollo',
    aventurero: { nombre: 'Dámaso', mote: 'El Mensajero', tipo: 'Hiker', aspecto: aspectoDeFuente('Rogue'), voz: 140, bio: 'Lleva los diseños al gremio de los constructores sin que se pierda un estado por el camino. Nunca entrega una carta sin el caso de error.' },
    claudeMd: md('Puerta del Mensajero — el Mensajero (handoff a desarrollo)',
      'Conviertes diseños en especificaciones que un equipo de desarrollo puede construir sin adivinar: estructura, tokens, componentes, estados, comportamiento, casos límite y criterios de aceptación.',
      ['Spec de handoff por pantalla o componente: estructura, medidas y tokens, componentes con sus props, estados (por defecto, hover, foco, deshabilitado, carga, vacío, error), comportamiento responsive, interacciones y animaciones.', 'Casos límite: textos largos, sin datos, errores de red, permisos, internacionalización.', 'Criterios de aceptación en formato Dado/Cuando/Entonces.', 'Notas de accesibilidad para desarrollo (roles, nombres, orden de foco).'],
      ['Nada de medidas sueltas si existe un token: se nombra el token.', 'Cada estado del componente está descrito o se dice explícitamente que no aplica.', 'Los criterios de aceptación se pueden probar.', 'Las dudas abiertas van en una lista al final, con a quién preguntar.']),
    skills: [
      skill('spec-handoff', 'Escribe la especificación de handoff de una pantalla o componente.', ['Lee el diseño (Figma con el MCP si está, captura o descripción) y el sistema de diseño si existe en la carpeta.', 'Describe estructura y layout, tokens (color, tipografía, espaciado, radios, sombras) y componentes con sus props.', 'Enumera estados, responsive, interacciones y casos límite.', 'Escribe criterios de aceptación y notas de accesibilidad.', 'Lista las dudas abiertas.'], 'Un `entregables/…-spec.md` listo para pegar en el ticket.'),
      skill('criterios-aceptacion', 'Criterios de aceptación Dado/Cuando/Entonces para una historia o flujo.', ['Identifica el flujo feliz, las variantes y los errores.', 'Escribe un criterio por comportamiento observable.', 'Añade los de accesibilidad y los de casos límite.'], 'Una lista numerada de criterios, agrupada por flujo.'),
    ],
    acciones: [
      { id: 'spec', texto: 'Spec de handoff de una pantalla', pista: 'enlace de Figma o nombre', pide: { etiqueta: 'Pantalla o enlace de Figma', ejemplo: 'pantalla de pago del carrito' }, prompt: 'Usa la skill spec-handoff para: {valor}' },
      { id: 'spec-captura', texto: 'Spec a partir de una captura', pista: 'pégala en el intercomunicador', adjunto: true, prompt: 'Usa la skill spec-handoff con la captura que te pego en el siguiente mensaje. Espera a tenerla; lo que no se vea, a la lista de dudas.' },
      { id: 'criterios', texto: 'Criterios de aceptación', pista: 'Dado / Cuando / Entonces', pide: { etiqueta: 'Historia o flujo', ejemplo: 'como cliente quiero cambiar la fecha de mi reserva' }, prompt: 'Usa la skill criterios-aceptacion para: {valor}' },
    ],
    decorado: decorado({
      subtitulo: 'CARTAS Y SELLOS', acento: '#c8a24a', resumen: 'Puerta del Mensajero: mostrador de cartas lacradas, sacas de correo y el mapa de rutas.',
      pantallaRepo: { x: 0, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/desk' },
      pieza: { x: 2.8, z: -0.5, giro: 180, gestos: ['PickUp', 'Interact'] }, aficion: { x: 0.2, z: 0.1, giro: 180, gestos: ['Waving'] },
      lamparas: [{ x: 2.8, z: -1.2, color: AMBAR, intensidad: 70 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 60 }],
      piezas: [
        P('cocina/kitchencounter_straight_B', 2.8, -1.5, { ancho: 1.6, color: ROBLE }), // 0 mostrador
        P('herr/journal_closed', 2.3, -1.5, { sobre: 0, alto: 0.25 }),
        P('herr/key_C', 3.2, -1.5, { sobre: 0, alto: 0.15, tumbada: true }),
        P('dun/candle_lit', 2.8, -1.6, { sobre: 0, alto: 0.25, luz: AMBAR }),
        P('recurso/Food_Crate_Small_Empty', 4.6, -1.7, { ancho: 0.7, color: ROBLE }),
        P('sv/Backpack', 5.3, -0.9, { alto: 0.6 }),
        P('herr/rope_bundle_A', 4.5, -0.6, { ancho: 0.5 }),
        P('herr/map', -1.6, -2.25, { y: 2.4, ancho: 1, pared: true }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
        P('mueble/rug_oval_B', 0.2, 0.1, { ancho: 2, color: MUSGO }),
      ],
      carteles: [{ x: -1.6, y: 2.5, ancho: 0.9, titulo: 'ENTREGA', lineas: ['estados', 'errores', 'límites'], fondo: '#3b2414', tinta: PERGAMINO }],
    }),
  },
  armero: {
    id: 'armero', sala: 'Armería', oficio: 'Armero', resumen: 'sistema de diseño: tokens y componentes',
    aventurero: { nombre: 'Eulogio', mote: 'El Armero', tipo: 'Hiker', aspecto: aspectoDeFuente('Knight'), voz: 95, bio: 'Forja cada componente una vez y lo cuelga en la pared con su nombre. Si ve un gris que no está en la paleta, lo funde.' },
    claudeMd: md('Armería — el Armero (sistema de diseño)',
      'Mantienes el sistema de diseño: tokens (color, tipografía, espaciado, radios, sombras, movimiento), componentes con sus variantes y estados, y su documentación. Auditas inconsistencias y propones cómo extender el sistema sin romperlo.',
      ['Inventario de tokens en `sistema/tokens.json` (formato de tokens de diseño W3C: `$value`, `$type`) con su uso.', 'Fichas de componente en `sistema/componentes/<nombre>.md`: propósito, anatomía, variantes, estados, props, accesibilidad, qué hacer y qué no.', 'Auditorías de consistencia: valores sueltos, duplicados, nombres que no siguen la convención, componentes casi iguales.'],
      ['Tokens en capas: primitivos (paleta) → semánticos (uso) → de componente; los componentes usan semánticos.', 'Nombres consistentes y predecibles (categoría-propiedad-variante-estado).', 'Cada componente documenta todos sus estados y su comportamiento con teclado.', 'Nada se añade al sistema sin un caso de uso real y sin comprobar que no existe ya.']),
    skills: [
      skill('tokens-diseno', 'Crea, ordena o audita los tokens del sistema de diseño.', ['Lee `sistema/tokens.json` si existe (o los estilos y variables que te pasen).', 'Agrupa en primitivos, semánticos y de componente; detecta duplicados y valores sueltos.', 'Propón los cambios con su motivo; si te lo piden, escribe el archivo.'], 'El `sistema/tokens.json` actualizado y un `entregables/…-tokens.md` con lo cambiado y por qué.'),
      skill('ficha-componente', 'Documenta un componente del sistema de diseño.', ['Entiende el propósito y dónde se usa.', 'Describe anatomía, variantes, estados, props, tokens que usa y accesibilidad (rol, teclado, foco, nombre).', 'Añade qué hacer y qué no, con ejemplos.'], 'Un `sistema/componentes/<nombre>.md`.'),
      skill('auditoria-sistema', 'Audita la consistencia del sistema de diseño.', ['Recorre tokens y componentes (o el archivo de Figma con el MCP si está).', 'Busca valores sueltos, duplicados, nombres fuera de convención y componentes casi iguales.', 'Prioriza y propone la consolidación.'], 'Un `entregables/…-auditoria-sistema.md`.'),
    ],
    acciones: [
      { id: 'tokens', texto: 'Ordenar o auditar los tokens', pista: 'sistema/tokens.json', prompt: 'Usa la skill tokens-diseno con lo que haya en sistema/. Si no hay nada, propón una base de tokens mínima (primitivos y semánticos) y pregúntame antes de escribirla.' },
      { id: 'componente', texto: 'Documentar un componente', pista: 'ficha completa', pide: { etiqueta: '¿Qué componente?', ejemplo: 'botón' }, prompt: 'Usa la skill ficha-componente para el componente: {valor}' },
      { id: 'auditoria', texto: 'Auditar la consistencia del sistema', pista: 'duplicados y valores sueltos', prompt: 'Usa la skill auditoria-sistema con lo que haya en sistema/ (y en Figma si el MCP está conectado y te paso un enlace).' },
    ],
    decorado: decorado({
      subtitulo: 'FORJA DE COMPONENTES', acento: '#b0b4bc', resumen: 'Armería: armeros con escudos y armas colgados, yunque y cajones de piezas etiquetadas.',
      paredes: ['Wall_3', 'Wall_4', 'Wall_3'],
      pantallaRepo: { x: 0, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/desk' },
      pieza: { x: 2.8, z: -0.4, giro: 180, gestos: ['Hammering', 'Working_B'] }, aficion: { x: 0.2, z: 0.1, giro: 180, gestos: ['Idle_A'] },
      lamparas: [{ x: 2.8, z: -1, color: FUEGO, intensidad: 90 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 50 }],
      piezas: [
        P('herr/anvil', 2.8, -1.1, { ancho: 0.9, color: HIERRO }),
        P('herr/tongs', 3.7, -1.5, { alto: 0.5 }),
        P('herr/bucket_metal', 1.6, -1.6, { alto: 0.5 }),
        P('acc/shield_round_color', -1.8, -2.25, { y: 2.7, alto: 0.6, pared: true }),
        P('acc/shield_round_color', 4.3, -2.25, { y: 2.7, alto: 0.6, pared: true }),
        P('recurso/Iron_Bars_Stack_Large', 5.1, -1.6, { ancho: 0.9 }),
        P('recurso/Containers_Crate_Small_Grey', 4.4, -0.5, { ancho: 0.55 }),
        P('recurso/Containers_Crate_Small_Green', 5.2, -0.4, { ancho: 0.55 }),
        P('mueble/cabinet_medium', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
      ],
      carteles: [{ x: -1.8, y: 1.9, ancho: 1, titulo: 'TOKENS', lineas: ['primitivo', 'semántico', 'componente'], fondo: HIERRO, tinta: PERGAMINO, simbolo: 'engranaje' }],
    }),
  },
  bardo: {
    id: 'bardo', sala: 'Escenario', oficio: 'Bardo', resumen: 'UX copy y microcopy',
    aventurero: { nombre: 'Fabricio', mote: 'El Bardo', tipo: 'Hiker', aspecto: aspectoDeFuente('Druid', { cara: 'cara.Helper_A', cejas: 'cejas.Helper_A', pelo: 'pelo.Rogue', sombrero: 'sombrero.Mage.Hat' }), voz: 160, bio: 'Recita mensajes de error como baladas, pero los deja en una línea. Sostiene que todo botón merece un verbo.' },
    claudeMd: md('Escenario — el Bardo (UX copy y microcopy)',
      'Escribes y revisas los textos de la interfaz: botones, etiquetas, mensajes de error, estados vacíos, confirmaciones, onboarding y notificaciones. Claro antes que ingenioso.',
      ['Revisión de textos de una pantalla: tabla con texto actual, problema, propuesta y motivo.', 'Microcopy nuevo para un componente o flujo, con variantes cuando la elección no sea obvia.', 'Guía de voz y tono en `voz-y-tono.md` si no existe (o su actualización).'],
      ['Los botones dicen la acción con un verbo («Guardar cambios», no «Aceptar»).', 'Los errores dicen qué ha pasado, por qué si ayuda, y cómo arreglarlo; sin culpar a quien usa la interfaz.', 'Los estados vacíos explican qué falta y ofrecen el siguiente paso.', 'Coherencia de términos en todo el flujo y con la guía de voz y tono.', 'Longitud pensada para el espacio real y para traducir (los textos crecen al traducir).']),
    skills: [
      skill('revisar-textos', 'Revisa los textos de una pantalla o flujo.', ['Recoge los textos (captura, Figma con el MCP, o lista pegada).', 'Comprueba claridad, verbos en las acciones, errores útiles, estados vacíos, coherencia de términos y tono.', 'Propón cada cambio con su motivo.'], 'Un `entregables/…-textos.md` con la tabla actual / problema / propuesta / motivo.'),
      skill('microcopy', 'Escribe microcopy para un componente o situación.', ['Entiende el contexto: quién lo lee, en qué momento y qué tiene que hacer después.', 'Escribe 2–3 opciones cuando la elección no sea obvia, con su matiz.', 'Recomienda una.'], 'Las opciones con su recomendación.'),
    ],
    acciones: [
      { id: 'revisar', texto: 'Revisar textos de esta pantalla', pista: 'pega una captura', adjunto: true, prompt: 'Usa la skill revisar-textos con la captura que te pego en el siguiente mensaje. Espera a tenerla.' },
      { id: 'error', texto: 'Escribir un mensaje de error', pista: 'qué ha fallado', pide: { etiqueta: '¿Qué ha fallado y dónde?', ejemplo: 'la tarjeta se rechaza al pagar la reserva' }, prompt: 'Usa la skill microcopy para el mensaje de error de: {valor}. Título, cuerpo y acción.' },
      { id: 'vacio', texto: 'Estado vacío', pista: 'qué falta y siguiente paso', pide: { etiqueta: '¿Qué pantalla está vacía?', ejemplo: 'la lista de favoritos de alguien nuevo' }, prompt: 'Usa la skill microcopy para el estado vacío de: {valor}.' },
      { id: 'voz', texto: 'Guía de voz y tono', pista: 'voz-y-tono.md', prompt: 'Revisa voz-y-tono.md si existe y propón cómo mejorarla; si no existe, hazme 5 preguntas sobre el producto y su público y luego escríbela.' },
    ],
    decorado: decorado({
      subtitulo: 'VERSOS CORTOS', acento: '#d96aa0', resumen: 'Escenario del Bardo: tarima con alfombra, taburete y laúd, atril de partituras y jarras para el público.',
      pantallaRepo: { x: -0.3, y: 2.4, ancho: 2 },
      puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/table_medium' },
      pieza: { x: 2.6, z: -0.4, giro: 180, gestos: ['Cheering', 'Holding_B'] }, aficion: { x: 0.2, z: 0.2, giro: 180, gestos: ['Waving'] },
      lamparas: [{ x: 2.6, z: -1, color: '#ffb0d0', intensidad: 70 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 60 }],
      piezas: [
        P('mueble/rug_rectangle_stripes_A', 2.6, -1, { ancho: 2.2, color: GRANATE }),
        P('mueble/chair_stool_wood', 2.6, -1.4, { alto: 0.5, color: ROBLE }),
        P('herr/journal_open', 1.4, -1.6, { ancho: 0.4 }),
        P('mueble/table_small', 4.6, -0.5, { alto: 0.75, color: ROBLE }),         // 3 mesa del público
        P('mueble/mug_A', 4.5, -0.5, { sobre: 3, alto: 0.15, color: '#d9a35a' }),
        P('mueble/mug_B', 4.8, -0.6, { sobre: 3, alto: 0.15, color: '#d9a35a' }),
        P('recurso/Fuel_C_Barrels', 5.2, -1.7, { ancho: 0.9, color: ROBLE }),
        P('mueble/shelf_B_large_decorated', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
        P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
      ],
      carteles: [{ x: 2.6, y: 2.5, ancho: 1.1, titulo: 'HOY CANTA', lineas: ['«Guardar', 'cambios»'], fondo: '#3b2414', tinta: PERGAMINO }],
    }),
  },
};

// ---------------------------------------------------------------- mesa de proyecto (una por cliente o proyecto)
export const COLORES_ESTANDARTE = [GRANATE, MUSGO, AZUL, '#c8a24a', '#5b3a7a', '#2f6b6b'] as const;
export const NOMBRE_COLOR: Record<string, string> = { [GRANATE]: 'granate', [MUSGO]: 'verde musgo', [AZUL]: 'azul real', '#c8a24a': 'oro viejo', '#5b3a7a': 'púrpura', '#2f6b6b': 'verde azulado' };
export const AVENTURERO_PROYECTO: AventureroOficio = { nombre: 'Gonzalo', mote: 'El Senescal', tipo: 'Hiker', aspecto: aspectoDeFuente('Barbarian'), voz: 100, bio: 'Guarda la mesa del proyecto: sabe quién es quién, qué se prometió y para cuándo. Pregunta antes de suponer.' };

/** El CLAUDE.md de contexto de una mesa de proyecto: una plantilla con huecos que se rellenan con el tabernero */
export function claudeMdProyecto(nombre: string) {
  return `# Mesa de proyecto: ${nombre}

Contexto del proyecto para todas las conversaciones de esta mesa. Rellénalo con el tabernero la primera vez
(«Completar el contexto del proyecto») y mantenlo al día. Lo que esté entre <corchetes> está por rellenar.

## Cliente y producto
- Cliente: <nombre del cliente o del equipo>
- Producto: <qué es y para quién>
- Web o app de referencia: <https://producto.example>

## Objetivos
- Del negocio: <qué tiene que conseguir este trabajo>
- De las personas usuarias: <qué tienen que poder hacer>
- Métricas de éxito: <cómo sabremos que ha salido bien>

## Alcance y plazos
- Entra: <pantallas, flujos, entregables>
- No entra: <lo que se queda fuera>
- Hitos: <fecha — hito>

## Personas implicadas (roles, sin datos personales)
- <rol — qué decide o qué aporta>

## Restricciones
- Marca y sistema de diseño: <enlace al archivo de Figma o a la carpeta de tokens>
- Técnicas: <plataformas, librerías, navegadores>
- Accesibilidad: WCAG 2.1 AA salvo que se diga otra cosa.
- Legales o de privacidad: <lo que haya>

## Decisiones tomadas
- <AAAA-MM-DD — decisión — por qué>

## Cómo trabajas en esta mesa
- Antes de proponer nada, lee este archivo; si falta algo que necesitas, pregúntalo y apúntalo aquí cuando te lo digan.
- Los entregables van en \`entregables/\`, con fecha en el nombre.
- Nada de datos personales de las personas del cliente: roles, no nombres.
- Para trabajo especializado (investigación, accesibilidad, handoff, sistema de diseño, textos), recuerda al
  tabernero que en la taberna hay salas de oficio para eso.
`;
}
export const ACCIONES_PROYECTO: AccionOficio[] = [
  { id: 'contexto', texto: 'Completar el contexto del proyecto', pista: 'rellena el CLAUDE.md contigo', prompt: 'Lee CLAUDE.md y ayúdame a completar los huecos entre <corchetes>: hazme las preguntas de una en una (máximo 8), y al final actualiza el archivo con lo que te diga.' },
  { id: 'estado', texto: 'Resumen del estado del proyecto', pista: 'qué hay hecho y qué falta', prompt: 'Lee CLAUDE.md y entregables/ y resúmeme el estado del proyecto: qué hay hecho, qué falta según el alcance, próximos hitos y riesgos.' },
  { id: 'siguiente', texto: 'Planificar la siguiente semana', pista: 'tareas por prioridad', prompt: 'Con el contexto de CLAUDE.md y lo que hay en entregables/, propón el plan de la siguiente semana: tareas priorizadas, qué sala de oficio de la taberna conviene para cada una y qué necesitas de mí.' },
];

export function decoradoProyecto(nombre: string, color: string): Decorado {
  return decorado({
    subtitulo: 'MESA DE PROYECTO', acento: color, resumen: `Mesa del proyecto ${nombre}: mesa larga con mapas y jarras bajo su estandarte.`,
    pantallaRepo: { x: -0.2, y: 2.4, ancho: 2 },
    puesto: { x: -3.4, z: -1.3, pantalla: 'monitor', mesa: 'mueble/desk' },
    pieza: { x: 2.4, z: -0.3, giro: 180, gestos: ['Interact', 'Working_A'] }, aficion: { x: 0.4, z: 0.2, giro: 180, gestos: ['Idle_A'] },
    lamparas: [{ x: 2.4, z: -1, color: AMBAR, intensidad: 80 }, { x: -3.4, z: -1.2, color: AMBAR, intensidad: 50 }],
    piezas: [
      P('mueble/table_medium_long', 2.4, -1.3, { ancho: 1.8, color: ROBLE }),          // 0 mesa del proyecto
      P('herr/map', 2.1, -1.3, { sobre: 0, ancho: 0.7 }),
      P('herr/journal_open', 2.8, -1.4, { sobre: 0, ancho: 0.4 }),
      P('mueble/mug_A', 1.6, -1.2, { sobre: 0, alto: 0.15, color: '#d9a35a' }),
      P('herr/lantern', 3.1, -1.2, { sobre: 0, alto: 0.4, luz: AMBAR }),
      P('mueble/chair_A_wood', 1.8, -0.1, { giro: 200, alto: 0.95, color: ROBLE }),
      P('mueble/chair_A_wood', 3, -0.1, { giro: 160, alto: 0.95, color: ROBLE }),
      P('mueble/rug_oval_B', 2.4, 0.2, { ancho: 2, color }),
      P('mueble/shelf_B_large', -5.1, -1.9, { ancho: 1.3, pared: true, color: NOGAL }),
      P('mueble/chair_stool_wood', -2.6, -0.4, { alto: 0.5, color: ROBLE }),
    ],
    // el estandarte del proyecto: un cartel alto con su color
    carteles: [{ x: 2.4, y: 2.6, ancho: 1, titulo: nombre.toUpperCase().slice(0, 32), lineas: ['⚑'], fondo: color, tinta: PERGAMINO }],
  });
}

/** Archivos que lleva la carpeta de una sala de oficio, por ruta relativa (CLAUDE.md, skills y la carpeta de entregables) */
export function archivosDeOficio(oficio: Oficio, nombreProyecto = 'Proyecto'): Record<string, string> {
  const out: Record<string, string> = { 'entregables/.gitkeep': '' };
  if (oficio === 'proyecto') { out['CLAUDE.md'] = claudeMdProyecto(nombreProyecto); return out; }
  const p = PLANTILLAS[oficio];
  out['CLAUDE.md'] = p.claudeMd;
  for (const s of p.skills) out[`.claude/skills/${s.nombre}/SKILL.md`] = `---\nname: ${s.nombre}\ndescription: ${s.descripcion}\n---\n\n# ${s.nombre}\n\n${s.cuerpo}`;
  return out;
}
export const accionesDeOficio = (oficio: Oficio) => (oficio === 'proyecto' ? ACCIONES_PROYECTO : PLANTILLAS[oficio].acciones);
/** El prompt de una acción, con el dato que pide ya puesto */
export function promptDeAccion(a: AccionOficio, valor = '') { return a.prompt.replace('{valor}', valor.trim().slice(0, 500)); }
