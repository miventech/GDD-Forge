// Genre-specific GDD starter templates. Each template seeds a project with
// opinionated segments, decisions, and features so the writer starts with
// structure instead of a blank page.
//
// ponytail: each template is opinionated but minimal. The point is to
// jumpstart the conversation, not to be exhaustive.

import type { SegmentType } from "./segment-types";

// ---- shapes (must match Prisma + zod schemas elsewhere) ----

export type TemplateSegment = {
  type: SegmentType;
  data: any;
};

export type TemplateDecision = { title: string; body: string };
export type TemplateFeature = { title: string; body: string; dependsOn?: string };
export type TemplateTask = { title: string; group?: string };

export type TemplateLocale = "es" | "en" | "pt-BR";
export type TemplateI18n = {
  name: Partial<Record<TemplateLocale, string>>;
  tagline: Partial<Record<TemplateLocale, string>>;
};

export type Template = {
  id: string;             // "roguelite", "adventure", ...
  name: string;           // "Roguelite" (default/fallback locale)
  tagline: string;        // short description (default/fallback locale)
  icon: string;           // lucide icon name
  accent: "purple" | "teal" | "coral" | "amber";
  i18n?: TemplateI18n;    // ponytail: localized name+tagline per locale; falls back to .name/.tagline
  project: {
    title: string;
    subtitle: string;
    eyebrow: string;
    version: string;
    status: "draft" | "in-progress" | "completed";
  };
  segments: TemplateSegment[];
  decisions: TemplateDecision[];
  features: TemplateFeature[];
  tasks: TemplateTask[];
};

// ---- helpers to keep templates terse ----

const t = (heading: string, body: string): TemplateSegment => ({ type: "text", data: { heading, body } });
const grid = (items: { title: string; body: string }[], columns: number = 2): TemplateSegment => ({ type: "grid", data: { columns, items } });
const callout = (color: "teal" | "amber" | "coral" | "purple", title: string, body: string): TemplateSegment => ({ type: "callout", data: { color, title, body } });

// =====================================================================
// 1. ROGUELITE
// =====================================================================

const roguelite: Template = {
  id: "roguelite",
  name: "Roguelite",
  tagline: "Runs cortos, muerte permanente, meta-progresión.",
  i18n: {
    name: { en: "Roguelite", es: "Roguelite" },
    tagline: {
      en: "Short runs, permadeath, meta-progression.",
      es: "Runs cortos, muerte permanente, meta-progresión.",
    },
  },
  icon: "Dices",
  accent: "coral",
  project: {
    title: "Roguelite GDD",
    subtitle: "Un roguelite con identidad propia. Definí qué lo hace único en una run.",
    eyebrow: "Roguelite · Draft 0.1",
    version: "0.1",
    status: "draft",
  },
  segments: [
    { type: "hero", data: {
      eyebrow: "Roguelite",
      title: "Una run, un estilo.",
      accentWord: "una run",
      subtitle: "Runs cortos, decisiones permanentes en la run, y una capa de progresión entre runs que cambia cómo jugás la próxima vez.",
      tags: [
        { label: "Roguelite", color: "coral" },
        { label: "Single player", color: "purple" },
        { label: "Tactical", color: "teal" },
      ],
    }},
    { type: "loop", data: {
      name: "Run loop",
      description: "El ciclo que se repite dentro de una run.",
      nodes: [
        { id: "n1", label: "Prepárate", description: "Elegís build, equipo inicial, blessings." },
        { id: "n2", label: "Explorá", description: "Mapa procedural, biomas, eventos." },
        { id: "n3", label: "Combatí", description: "Encuentros, elites, mini-bosses." },
        { id: "n4", label: "Recompensa", description: "Items, currencies, blessings." },
        { id: "n5", label: "Progresá", description: "Más fuerte, mapa más difícil, decisiones más pesadas." },
        { id: "n6", label: "Morí", description: "Perdés la run. Subís currency meta." },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n5" },
        { from: "n5", to: "n3" },
        { from: "n3", to: "n6" },
        { from: "n6", to: "n1", label: "loop" },
      ],
    }},
    t("Pillars", "Tres pilares de diseño que el juego tiene que cumplir. Si una feature no sirve a un pilar, se va.\n\n1. **Run = expresión**: cada run debe sentirse como una partida distinta. Builds y eventos cambian el cómo.\n2. **Muerte con historia**: perder debe contar algo, no solo restar.\n3. **Meta-progresión significativa**: lo que desbloqueás entre runs cambia cómo jugás, no solo numéricamente."),
    t("Player character", "El jugador no es un personaje con lore, es un vehículo. Definí:\n\n- Stats base (HP, ataque, velocidad).\n- 2-3 acciones únicas que lo distinguen.\n- Sin personalidad fija: el jugador lo define con la build.\n\nReferenciá a [[Enemigos]] y [[Boss]] para balancear el daño."),
    { type: "enemy", data: {
      name: "Enemigo base",
      description: "Soldado genérico. Tira stats con fórmulas según profundidad de la run.",
      tier: "common",
      behaviors: [
        { trigger: "Jugador en rango", action: "Ataca cuerpo a cuerpo" },
      ],
      stats: { health: 30, damage: 5, speed: 2 },
      formulas: {
        health: "base + 8 * (level - 1)",
        damage: "base + 1 * (level - 1)",
      },
    }},
    { type: "enemy", data: {
      name: "Elite",
      description: "Variante con patrón especial. Aparece a partir de profundidad X.",
      tier: "elite",
      behaviors: [
        { trigger: "HP < 50%", action: "Cambia de fase, ataque cargado" },
      ],
      stats: { health: 80, damage: 12, speed: 3 },
      formulas: {
        health: "base + 15 * (level - 1)",
        damage: "base * Math.pow(1.2, level - 1)",
      },
    }},
    { type: "boss", data: {
      name: "Boss del bioma",
      description: "Punto de control entre biomas. Definí fases y counters.",
      phases: [
        { name: "Fase 1", trigger: "HP > 60%", description: "Patrón base, telegraphing claro.", attacks: ["Carga frontal", "Área frontal"] },
        { name: "Fase 2", trigger: "HP < 60%", description: "Ataques nuevos, más agresiva.", attacks: ["Carga doble", "Invocación", "Salto AoE"] },
      ],
      weakness: "Ataques a distancia durante la carga",
    }},
    grid([
      { title: "Profundidad 1", body: "Introducción. Solo enemigos básicos. 1 elite por piso." },
      { title: "Profundidad 2", body: "El segundo bioma. Elites más frecuentes. 1 mini-boss." },
      { title: "Profundidad 3", body: "El bioma final. Boss + run se decide." },
    ], 3),
    t("Meta-progresión", "Lo que el jugador se lleva entre runs. Tres tipos:\n\n- **Unlock permanente**: nuevos items, clases, biomas.\n- **Currency**: se gasta en mejoras permanentes (stats base, slots extra).\n- **Achievements**: logros que cambian cómo se juega (modos, condiciones).\n\nRegla: la meta-progresión no debe hacer la run 1 trivial. Si pasa, la run 1 ya no importa y el loop se rompe."),
    callout("coral", "Anti-ejemplo", "Si el jugador puede farmear currency y comprar 500% de HP extra en 2 horas, el roguelite deja de ser roguelite. La meta-progresión cambia *cómo* jugás, no si podés jugar."),
  ],
  decisions: [
    { title: "Permadeath total vs. lives limitadas", body: "¿La run termina con la primera muerte, o el jugador tiene 2-3 vidas? Esto define el tono: punitivo vs. indulgente." },
    { title: "Scope de la meta-progresión", body: "¿Qué se desbloquea entre runs? Items, clases, biomas, modos. Demasiado = grind. Poco = falta de progreso." },
    { title: "Procedural: ¿mapas, encuentros, o ambos?", body: "¿Se generan los mapas, los enemigos, los items? Cada uno suma complejidad exponencial." },
    { title: "Single run vs. multi-run storyline", body: "¿Hay narrativa entre runs (Hades-style) o cada run es standalone (Spelunky)?" },
  ],
  features: [
    { title: "Sistema de builds con 3-4 arquetipos base", body: "Cada run empieza con un arquetipo que define la build inicial. El jugador lo modifica durante la run con drops.", dependsOn: "Pillars" },
    { title: "Mapa procedural con seed visible", body: "El jugador ve el seed del run (compartir, comparar). Backbone del shareability.", dependsOn: "Pillars" },
    { title: "Sistema de blessings pasivos", body: "Pequeños modificadores que se acumulan durante la run. Cada blessing cambia 1-2 stats o da 1 efecto nuevo." },
  ],
  tasks: [
    { title: "Definir los 3 pilares del juego en una frase cada uno", group: "Diseño" },
    { title: "Escribir la run ideal de 20 minutos en texto", group: "Diseño" },
    { title: "Prototipar el combate base en una arena vacía", group: "Prototipo" },
    { title: "Listar 20 items únicos con efectos distintos", group: "Contenido" },
  ],
};

// =====================================================================
// 2. ADVENTURE
// =====================================================================

const adventure: Template = {
  id: "adventure",
  name: "Adventure",
  tagline: "Exploración, puzzles, narrativa. El viaje importa más que el score.",
  i18n: {
    name: { en: "Adventure", es: "Aventura" },
    tagline: {
      en: "Exploration, puzzles, narrative. The journey matters more than the score.",
      es: "Exploración, puzzles, narrativa. El viaje importa más que el score.",
    },
  },
  icon: "Map",
  accent: "teal",
  project: {
    title: "Adventure GDD",
    subtitle: "Un juego de exploración con identidad propia.",
    eyebrow: "Adventure · Draft 0.1",
    version: "0.1",
    status: "draft",
  },
  segments: [
    { type: "hero", data: {
      eyebrow: "Adventure",
      title: "El viaje es el juego.",
      subtitle: "Exploración, puzzles, narrativa. Diseñá el ritmo: cuándo el jugador avanza, cuándo se queda, cuándo vuelve.",
      tags: [
        { label: "Adventure", color: "teal" },
        { label: "Single player", color: "purple" },
        { label: "Story-rich", color: "amber" },
      ],
    }},
    { type: "loop", data: {
      name: "Adventure loop",
      description: "El ritmo macro de una sesión de juego.",
      nodes: [
        { id: "n1", label: "Explorá", description: "Caminás, mirás, encontrás." },
        { id: "n2", label: "Descubrí", description: "Nuevo lugar, objeto, NPC." },
        { id: "n3", label: "Resolvé", description: "Puzzle o decisión de historia." },
        { id: "n4", label: "Progresá", description: "Historia avanza, mapa se abre." },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n1", label: "loop" },
      ],
    }},
    t("Pillars", "Tres pilares:\n\n1. **Mundo habitado**: cada lugar tiene historia aunque no la cuentes. Los NPCs viven ahí.\n2. **Puzzles = diálogo con el mundo**: nada de puzzles random. Cada uno enseña algo del mundo.\n3. **El ritmo del jugador**: si el jugador quiere quedarse mirando una pared 5 minutos, esa es la experiencia."),
    t("Player character", "Una persona con habilidades, no con stats. Definí:\n\n- Qué sabe hacer (habilidades narrativas o mecánicas).\n- Qué quiere (motivación, no objetivo).\n- Qué no sabe todavía (esto es el motor del juego)."),
    { type: "character", data: {
      name: "Protagonista",
      role: "Player character",
      description: "Definí: por qué está acá, qué busca, qué está dispuesto a sacrificar.",
    }},
    grid([
      { title: "Puzzle mecánico", body: "Manipulación de objetos, timing, secuencia." },
      { title: "Puzzle de observación", body: "Encontrar un detalle visual o auditivo que cambia algo." },
      { title: "Puzzle de diálogo", body: "Preguntar, ofrecer, recordar. La respuesta correcta depende de qué sabés." },
    ], 3),
    t("Estructura de la historia", "Tres actos (o equivalente). Definí:\n\n- **Acto 1**: el mundo normal, el llamado, la primera pista.\n- **Acto 2**: exploración profunda, el punto medio que cambia todo, el descenso.\n- **Acto 3**: la resolución, el costo, el nuevo equilibrio.\n\nRegla: si el jugador puede perderse el Acto 2, no es Acto 2, es contenido opcional."),
    { type: "dialogue", data: {
      name: "NPC del cruce",
      description: "Encuentro que enseña el tono del juego.",
      startNodeId: "n1",
      nodes: [
        { id: "n1", speaker: "NPC", text: "No esperaba a nadie por acá.", choices: [
          { label: "¿Quién sos?", nextNodeId: "n2" },
          { label: "¿Cómo llego al pueblo?", nextNodeId: "n3" },
        ], x: 40, y: 40 },
        { id: "n2", speaker: "NPC", text: "Alguien que se quedó.", choices: [], x: 280, y: 20 },
        { id: "n3", speaker: "NPC", text: "Al este. Si todavía existe.", choices: [], x: 280, y: 100 },
      ],
    }},
    callout("teal", "Diseño de puzzles", "La regla de los 3 intentos: si el jugador falla 3 veces sin sentir que está progresando, el puzzle está roto. Cambiá la dificultad o agregá una pista ambiental."),
  ],
  decisions: [
    { title: "Lineal vs. mundo abierto", body: "¿El jugador va por una ruta definida (Walking Dead) o elige a dónde ir (Outer Wilds)? Define el resto del diseño." },
    { title: "Muerte / fallo: ¿qué pasa?", body: "¿El jugador puede morir, fallir, perder? Si sí, qué se pierde y qué se gana. Si no, qué mantiene la tensión." },
    { title: "Lenguaje: ¿cuánta historia se cuenta?", body: "¿Cinematics largos, diálogo escrito, Ambiental storytelling? Cada uno tiene un costo distinto." },
  ],
  features: [
    { title: "Sistema de inventario narrativo", body: "Los items no se apilan. Cada uno tiene un nombre, una descripción, y un recuerdo (texto opcional del jugador).", dependsOn: "Pillars" },
    { title: "Mapa dibujado a mano por el jugador", body: "El jugador marca lugares en un mapa que se va llenando. Refuerza la sensación de exploración.", dependsOn: "Pillars" },
  ],
  tasks: [
    { title: "Escribir el Acto 1 en 3 párrafos", group: "Historia" },
    { title: "Diseñar 5 puzzles, uno por tipo", group: "Diseño" },
    { title: "Escribir la descripción de 5 lugares clave", group: "Mundo" },
  ],
};

// =====================================================================
// 3. VISUAL NOVEL
// =====================================================================

const visualNovel: Template = {
  id: "visualnovel",
  name: "Visual Novel",
  tagline: "Historia, personajes, decisiones. Texto + arte + audio.",
  i18n: {
    name: { en: "Visual Novel", es: "Novela Visual" },
    tagline: {
      en: "Story, characters, choices. Text + art + audio.",
      es: "Historia, personajes, decisiones. Texto + arte + audio.",
    },
  },
  icon: "BookOpen",
  accent: "purple",
  project: {
    title: "Visual Novel GDD",
    subtitle: "Una historia interactiva. Definí el tono, los personajes, las rutas.",
    eyebrow: "Visual Novel · Draft 0.1",
    version: "0.1",
    status: "draft",
  },
  segments: [
    { type: "hero", data: {
      eyebrow: "Visual Novel",
      title: "Una historia que se lee.",
      subtitle: "Texto, arte, audio y decisiones. La mecánica es el ritmo de la lectura.",
      tags: [
        { label: "Visual Novel", color: "purple" },
        { label: "Narrativa", color: "amber" },
        { label: "Branching", color: "teal" },
      ],
    }},
    { type: "loop", data: {
      name: "Reading loop",
      description: "El ciclo de una sesión de lectura.",
      nodes: [
        { id: "n1", label: "Leé", description: "Diálogo, narración, descripción." },
        { id: "n2", label: "Sentí", description: "Música, arte, atmósfera." },
        { id: "n3", label: "Elegí", description: "Decisión del jugador (o auto-avance)." },
        { id: "n4", label: "Avanzá", description: "Continuás la historia." },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n1", label: "loop" },
      ],
    }},
    t("Pillars", "Tres pilares:\n\n1. **Personajes que importan**: si el jugador no se interesa por alguien, no termina la VN.\n2. **Tono consistente**: el cambio de tono brusco rompe la inmersión.\n3. **Decisiones que se sienten**: cada decisión debe tener peso, aunque el resultado no cambie la historia macro."),
    t("Estructura de rutas", "Tres modelos típicos:\n\n- **Rutas múltiples paralelas**: el jugador elige una ruta al principio y la termina (Doki Doki, Steins;Gate).\n- **Rutas entrelazadas**: el jugador vive todas las rutas, cada una revela una parte (Higurashi).\n- **Ruta única con branches**: una historia principal con desvíos (most VN indie).\n\nDefiní cuál usás antes de escribir el primer diálogo."),
    { type: "character", data: {
      name: "Protagonista",
      role: "Player character",
      description: "El protagonista de una VN es difícil. ¿Tiene personalidad fija (Persona) o está en blanco (Doki Doki)? Esto define cómo escribís sus diálogos.",
    }},
    { type: "character", data: {
      name: "Interest principal",
      role: "Love interest / main NPC",
      description: "El NPC más importante de la primera ruta. Su arco define el tono. Definí: qué quiere, qué oculta, qué cambia al final.",
    }},
    { type: "dialogue", data: {
      name: "Escena de apertura",
      description: "El primer diálogo del juego. Define el tono en 2-3 intercambios.",
      startNodeId: "n1",
      nodes: [
        { id: "n1", speaker: "Narrador", text: "Era un día normal. La alarma sonó. Pero esta vez, no te levantaste.", choices: [
          { label: "...", nextNodeId: "n2" },
        ], x: 40, y: 40 },
        { id: "n2", speaker: "Vos", text: "Cinco minutos más.", choices: [], x: 280, y: 40 },
        { id: "n3", speaker: "???", text: "Te están esperando.", choices: [
          { label: "¿Quién?", nextNodeId: "n4" },
          { label: "Dejo el teléfono y sigo durmiendo", nextNodeId: "n5" },
        ], x: 280, y: 140 },
        { id: "n4", speaker: "???", text: "Ya lo sabés.", choices: [], x: 520, y: 100 },
        { id: "n5", speaker: "Vos", text: "No me interesa.", choices: [], x: 520, y: 200 },
      ],
    }},
    grid([
      { title: "Escenas cinemáticas", body: "Momentos donde la cámara se mueve, la música cambia, el arte es especial. Máximo 1-2 por hora de juego." },
      { title: "Escenas de elección", body: "Cada decisión con peso: debe haber un 'silencio' antes de la elección. Sin timer, salvo que sea justo." },
      { title: "Escenas de relación", body: "Momentos de a dos. El sistema de 'affection' o equivalente se revela acá." },
    ], 3),
    callout("purple", "Escritura de VN", "Una línea de diálogo de VN toma más tiempo que una línea de cualquier otro género. Es el 80% del juego. No la subestimes. Escribí el doble y cortá la mitad."),
  ],
  decisions: [
    { title: "Longitud total: corta (5h) o larga (30h+)", body: "Define el scope del proyecto. Una VN corta puede terminarse; una larga necesita estructura fuerte." },
    { title: "Sistema de 'affection' o rutas puras", body: "¿Usás un stat numérico (Persona) o el jugador elige ruta explícitamente (Doki Doki)?" },
    { title: "Finales: ¿cuántos y qué significan?", body: "1 final canónico + 2-3 variantes, o muchos finales con uno verdadero. Cada modelo tiene tradeoffs." },
  ],
  features: [
    { title: "Sistema de guardado por escena", body: "El jugador puede volver a cualquier escena. Imprescindible para VN largas.", dependsOn: "Pillars" },
    { title: "Log de diálogos con búsqueda", body: "Permite releer escenas pasadas. El 50% de los jugadores de VN releen.", dependsOn: "Pillars" },
  ],
  tasks: [
    { title: "Escribir la escena de apertura completa", group: "Escritura" },
    { title: "Diseñar los 4-5 personajes principales", group: "Personajes" },
    { title: "Listar las decisiones con peso de la primera ruta", group: "Historia" },
  ],
};

// =====================================================================
// 4. RPG
// =====================================================================

const rpg: Template = {
  id: "rpg",
  name: "RPG",
  tagline: "Stats, builds, progresión, narrativa. El jugador es el sistema.",
  i18n: {
    name: { en: "RPG", es: "RPG" },
    tagline: {
      en: "Stats, builds, progression, narrative. The player is the system.",
      es: "Stats, builds, progresión, narrativa. El jugador es el sistema.",
    },
  },
  icon: "Swords",
  accent: "purple",
  project: {
    title: "RPG GDD",
    subtitle: "Un RPG con identidad. Definí el loop, las builds, el mundo.",
    eyebrow: "RPG · Draft 0.1",
    version: "0.1",
    status: "draft",
  },
  segments: [
    { type: "hero", data: {
      eyebrow: "RPG",
      title: "El mundo te recuerda.",
      subtitle: "Stats, builds, progresión, narrativa. Diseñá el sistema que el jugador aprende a habitar.",
      tags: [
        { label: "RPG", color: "purple" },
        { label: "Builds", color: "teal" },
        { label: "Story-rich", color: "amber" },
      ],
    }},
    { type: "loop", data: {
      name: "Adventure loop",
      description: "Loop macro: explorar, aceptar quests, subir nivel.",
      nodes: [
        { id: "n1", label: "Explorá", description: "Mapa, dungeons, pueblos." },
        { id: "n2", label: "Quest", description: "NPC te da una misión." },
        { id: "n3", label: "Combatí", description: "Encuentros, dungeons, bosses." },
        { id: "n4", label: "Recompensa", description: "XP, items, lore." },
        { id: "n5", label: "Subí nivel", description: "Build más fuerte, más opciones." },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n5" },
        { from: "n5", to: "n1", label: "loop" },
      ],
    }},
    { type: "loop", data: {
      name: "Combat loop",
      description: "Loop micro: lo que pasa en cada pelea.",
      nodes: [
        { id: "n1", label: "Iniciativa", description: "Quién ataca primero." },
        { id: "n2", label: "Turno", description: "Atacar, skill, item, defender." },
        { id: "n3", label: "Efecto", description: "Daño, status, buff/debuff." },
        { id: "n4", label: "Reacción", description: "Enemigo responde, o no." },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n2", label: "loop" },
      ],
    }},
    t("Pillars", "Tres pilares:\n\n1. **Builds con expresión**: dos personajes del mismo nivel se sienten distintos porque las stats importan.\n2. **Mundo con agencia**: las decisiones del jugador cambian el mundo, no solo la historia.\n3. **Progresión legible**: el jugador ve por qué su personaje es más fuerte, no solo que lo es."),
    t("Player character", "Un personaje con stats, clases, historia. Definí:\n\n- Stats base (HP, MP, ataque, defensa, velocidad, etc.).\n- Clase inicial y cómo cambia a lo largo del juego.\n- Motivación que lo lleva a la aventura.\n\nUsá fórmulas en [[Stats]] para que el balanceo escale con el nivel."),
    { type: "character", data: {
      name: "Protagonista",
      role: "Player character",
      description: "Personalidad, motivación, historia. ¿Es un héroe clásico, un anti-héroe, un anti-personaje?",
    }},
    { type: "enemy", data: {
      name: "Enemigo estándar",
      description: "Tropa base. Stats con fórmulas según nivel del área.",
      tier: "common",
      behaviors: [
        { trigger: "HP bajo", action: "Huye o pide refuerzos" },
      ],
      stats: { health: 50, damage: 8, speed: 3 },
      formulas: {
        health: "base + 10 * (level - 1)",
        damage: "base + 2 * (level - 1)",
        speed: "base + Math.floor(level / 5)",
      },
    }},
    { type: "boss", data: {
      name: "Boss del capítulo",
      description: "El cierre narrativo y mecánico de cada arco.",
      phases: [
        { name: "Fase 1", trigger: "HP > 50%", description: "Ataques básicos, vulnerable.", attacks: ["Corte pesado", "Salto"] },
        { name: "Fase 2", trigger: "HP < 50%", description: "Cambia patrón, nuevos ataques.", attacks: ["Corte cargado", "Invocación", "AoE"] },
      ],
      weakness: "Ventana de 2s después del ataque pesado",
    }},
    grid([
      { title: "Guerrero", body: "Tanque cuerpo a cuerpo. Stats: alta HP, alta defensa, ataque moderado." },
      { title: "Mago", body: "Daño a distancia. Stats: baja HP, alto ataque mágico, maná limitado." },
      { title: "Pícaro", body: "Velocidad y crítico. Stats: HP media, ataque físico alto, evasion." },
    ], 3),
    callout("purple", "Balance con fórmulas", "Usá las fórmulas de stats para que los enemigos escalen con el nivel del área. Si base=50 y level=10, el enemy tiene 50+8*9=122 HP. Editá las fórmulas en cada enemy para que el balanceo sea visible."),
  ],
  decisions: [
    { title: "Turn-based vs. action", body: "¿Combate por turnos (Pokémon) o en tiempo real (Dark Souls)? Define el 80% del feel." },
    { title: "Open world vs. lineal", body: "¿El jugador puede ir a donde quiera (Elden Ring) o sigue un orden (Final Fantasy)?" },
    { title: "Partida: ¿una o múltiples?", body: "¿New Game+? ¿Múltiples saves? ¿Un solo personaje recorrible?" },
    { title: "Sistema de progresión: ¿XP, equipment, o ambos?", body: "¿El poder viene de subir nivel, de mejor equipo, o de una combinación? El balance depende de esto." },
  ],
  features: [
    { title: "Sistema de clases con 3-4 specialties", body: "Cada clase tiene 2-3 especializaciones al final del juego. Builds finales × 3.", dependsOn: "Pillars" },
    { title: "Quest system con consecuencias", body: "Quests con múltiples outcomes. Las decisiones del jugador cambian el estado del mundo.", dependsOn: "Pillars" },
  ],
  tasks: [
    { title: "Diseñar el sistema de stats y progresión", group: "Sistemas" },
    { title: "Escribir el Acto 1 de la historia principal", group: "Historia" },
    { title: "Listar 10 enemigos y 3 bosses con stats", group: "Contenido" },
  ],
};

// =====================================================================
// 5. RTS
// =====================================================================

const rts: Template = {
  id: "rts",
  name: "RTS",
  tagline: "Construcción, gestión, guerra en tiempo real. Pensá a escala.",
  i18n: {
    name: { en: "RTS", es: "RTS" },
    tagline: {
      en: "Build, manage, wage real-time war. Think at scale.",
      es: "Construcción, gestión, guerra en tiempo real. Pensá a escala.",
    },
  },
  icon: "Castle",
  accent: "coral",
  project: {
    title: "RTS GDD",
    subtitle: "Un juego de estrategia en tiempo real. Definí la economía, la tech tree, el combate.",
    eyebrow: "RTS · Draft 0.1",
    version: "0.1",
    status: "draft",
  },
  segments: [
    { type: "hero", data: {
      eyebrow: "RTS",
      title: "Pensá a escala.",
      subtitle: "Construcción, gestión, combate en tiempo real. El juego se gana en la cabeza, no en los dedos.",
      tags: [
        { label: "RTS", color: "coral" },
        { label: "Strategy", color: "purple" },
        { label: "Multiplayer", color: "teal" },
      ],
    }},
    { type: "loop", data: {
      name: "Match loop",
      description: "El ciclo macro de una partida.",
      nodes: [
        { id: "n1", label: "Construí", description: "Base, supply, infraestructura." },
        { id: "n2", label: "Recolectá", description: "Workers gatheren resources." },
        { id: "n3", label: "Producí", description: "Unidades, tech, upgrades." },
        { id: "n4", label: "Explorá", description: "Scout, vision, información." },
        { id: "n5", label: "Atacá", description: "Engage, base race, presión." },
        { id: "n6", label: "Ganá", description: "Victoria: destrucción, condición, etc." },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n5" },
        { from: "n5", to: "n6" },
        { from: "n6", to: "n1", label: "loop" },
      ],
    }},
    t("Pillars", "Tres pilares:\n\n1. **Decisiones, no APM**: ganar requiere pensar mejor, no clicar más rápido. El APM bajo debe ser viable.\n2. **Información es poder**: el scouting y la intel valen más que las unidades. La niebla de guerra es central.\n3. **Identidad de facción**: cada facción se siente distinta, no solo en unidades."),
    t("Economía", "Tres modelos:\n\n- **Tributos pasivos**: el jugador recibe resources pasivamente (StarCraft mineral). Macro de base.\n- **Tributos por workers**: el jugador asigna workers a extractores (Age of Empires). Más control, más micro.\n- **Tributos por territorio**: el control de zonas genera resources (Northgard). Más estratégico.\n\nElegí uno. Combinarlos agrega complejidad exponencial."),
    grid([
      { title: "Infantería", body: "Barata, numerosa, débil contravehículo. Counter de infantería." },
      { title: "Vehículos", body: "Cara, poderosa, vulnerable a infantería antivehículo." },
      { title: "Aviones", body: "Rápida, área, vulnerable a AA. Controla el mapa." },
      { title: "Naval", body: "Depende de mapas con agua. Rol específico." },
    ], 4),
    t("Tech tree", "Tres ramas típicas:\n\n- **Economía**: más workers, extracción más rápida.\n- **Militar**: unidades más avanzadas, upgrades de daño/defensa.\n- **Útil/espionaje**: visión, mobility, especiales.\n\nRegla: una tech tree con más de 4 niveles por rama es ilegible. Si tenés más, agrupá en eras."),
    callout("coral", "Win condition", "Tres opciones:\n\n- **Aniquilación total**: destruir todas las unidades y edificios. Estándar pero largo.\n- **Condición especial**: capturar la reliquia, controlar X zonas, sobrevivir Y minutos. Acorta partidas.\n- **Puntuación**: quien tiene más puntos al final del timer. Anti-turtle."),
  ],
  decisions: [
    { title: "Multiplayer, singleplayer, o ambos", body: "El multiplayer es el corazón del RTS. El singleplayer necesita IA competente, que es otro proyecto entero." },
    { title: "Facciones: ¿2, 3, 4, 6+?", body: "Más facciones = más trabajo de balance. 2-3 es lo común para un indie." },
    { title: "Pause: real-time puro o con pausa", body: "Con pausa (Frost Giant, Command & Conquer) = accesible. Sin pausa (StarCraft) = más skill ceiling." },
  ],
  features: [
    { title: "Sistema de niebla de guerra con vision mechanics", body: "El jugador ve solo lo que sus unidades o edificios ven. Scouting es central.", dependsOn: "Pillars" },
    { title: "AI con personalidades distintas", body: "Cada IA enemiga tiene un estilo: agresivo, económico, defensivo. El jugador aprende a leerlas.", dependsOn: "Pillars" },
  ],
  tasks: [
    { title: "Diseñar el sistema económico", group: "Sistemas" },
    { title: "Diseñar 3 facciones con identidad clara", group: "Facciones" },
    { title: "Diseñar 10 unidades por facción", group: "Contenido" },
  ],
};

// =====================================================================
// 6. FARM / AUTOMATION
// =====================================================================

const farmAuto: Template = {
  id: "farm-auto",
  name: "Farm & Automation",
  tagline: "Cosechá, procesá, automatizá. Factorio, Stardew, Satisfactory.",
  i18n: {
    name: { en: "Farm & Automation", es: "Granja y Automatización" },
    tagline: {
      en: "Harvest, process, automate. Factorio, Stardew, Satisfactory.",
      es: "Cosechá, procesá, automatizá. Factorio, Stardew, Satisfactory.",
    },
  },
  icon: "Hammer",
  accent: "amber",
  project: {
    title: "Farm & Automation GDD",
    subtitle: "Granjas, producción, automatización. Diseñá el sistema que el jugador quiere optimizar.",
    eyebrow: "Farm & Automation · Draft 0.1",
    version: "0.1",
    status: "draft",
  },
  segments: [
    { type: "hero", data: {
      eyebrow: "Farm & Automation",
      title: "Un sistema, hermosamente tuneado.",
      subtitle: "Sembrar, crecer, cosechar, procesar, vender, automatizar. El juego es la optimización del sistema.",
      tags: [
        { label: "Farm", color: "amber" },
        { label: "Automation", color: "teal" },
        { label: "Cozy", color: "purple" },
      ],
    }},
    { type: "loop", data: {
      name: "Production loop",
      description: "El ciclo de una sesión de juego.",
      nodes: [
        { id: "n1", label: "Plantá", description: "Elegí qué sembrar, dónde." },
        { id: "n2", label: "Esperá", description: "Tiempo real, riego, cuidado." },
        { id: "n3", label: "Cosechá", description: "Manual o automático." },
        { id: "n4", label: "Procesá", description: "Refinamiento: raw → producto." },
        { id: "n5", label: "Vendé o usá", description: "Currency o cadena siguiente." },
        { id: "n6", label: "Mejorá", description: "Mejor equipment, automatización, expansion." },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n5" },
        { from: "n5", to: "n6" },
        { from: "n6", to: "n1", label: "loop" },
      ],
    }},
    t("Pillars", "Tres pilares:\n\n1. **El sistema es el juego**: si el sistema no es interesante de optimizar, el juego no funciona. No alcanza con 'plantás cosas y cosechás'.\n2. **Automatización como recompensa**: el momento en que reemplazás una tarea manual por una máquina debe sentirse como un logro.\n3. **Tiempo vs. escala**: el jugador gana cuando el sistema escala sin requerir más tiempo real."),
    t("Player character", "El farmer / ingeniero. Definí:\n\n- ¿Tiene stats? (HP, energía, etc.) o es solo un cursor.\n- ¿Puede morir / lastimarse? (Stardew: sí. Factorio: no, pero los biters sí).\n- ¿Tiene relaciones con NPCs?\n- ¿Tiene una casa que se expande?"),
    { type: "character", data: {
      name: "Player character",
      role: "Farmer / Engineer",
      description: "Personalidad, herramientas iniciales, motivación. ¿Es un urbanita que hereda la granja, un ingeniero que llega a un planeta, otra cosa?",
    }},
    grid([
      { title: "Cultivos / recursos crudos", body: "Lo que sembrás / extraés. Crecen en tiempo real, requieren cuidado." },
      { title: "Procesados nivel 1", body: "Refinamiento simple: moler, cortar, etc." },
      { title: "Procesados nivel 2", body: "Refinamiento compuesto: ensamble, cocina, química." },
      { title: "Productos finales", body: "Lo que se vende o se usa para unlockear." },
    ], 4),
    t("Cadena de producción", "El corazón del juego. Diseñá:\n\n- **Inputs**: qué necesita cada paso (raw materials, energía, tiempo).\n- **Throughput**: cuánto produce por minuto.\n- **Bottlenecks**: dónde se acumula, dónde falta.\n- **Automation triggers**: cuándo el jugador decide automatizar un paso.\n\nRegla: cada paso de la cadena debe reducir la acción manual del jugador en 1-2 clicks por minuto."),
    callout("amber", "Balance económico", "Tres preguntas:\n\n1. ¿Cuánto gana el jugador por hora de trabajo?\n2. ¿Cuánto cuesta la próxima mejora?\n3. ¿Cuántas horas para llegar al 'endgame state'?\n\nSi la respuesta a (3) es >40h, el juego es para una comunidad dedicada. Si <20h, es casual. Definí esto antes de balancear."),
  ],
  decisions: [
    { title: "Tiempo real vs. tiempo acelerado", body: "¿El juego corre en tiempo real (Stardew) o tiene un reloj interno que avanza (Factorio)? Define el feel." },
    { title: "Enemigos: ¿hay?", body: "Sin enemigos = cozy. Con enemigos = automation. Mezcla: biters opcionales (Factorio)." },
    { title: "Co-op: ¿singleplayer o multiplayer?", body: "El multiplayer cambia el balance. Más ojos = más eficiencia. Definí si el juego se juega solo." },
    { title: "Persistencia: ¿qué se pierde entre sesiones?", body: "Día siguiente (Stardew), save (Factorio), season reset (Animal Crossing). Define la meta-progresión." },
  ],
  features: [
    { title: "Sistema de automatización con belts/pipes", body: "El jugador conecta máquinas con belts. El core de Factorio/Satisfactory.", dependsOn: "Pillars" },
    { title: "Sistema de energía", body: "Generadores, distribución, picos. Los belts necesitan energía para correr." },
    { title: "Sistema de estaciones y clima", body: "Diferentes biomas con recursos distintos. Primavera/verano/otoño/invierno cambian qué se puede cultivar.", dependsOn: "Pillars" },
  ],
  tasks: [
    { title: "Diseñar la cadena de producción completa", group: "Sistemas" },
    { title: "Balancear la economía hora por hora", group: "Balance" },
    { title: "Prototipar 1 minuto de gameplay", group: "Prototipo" },
  ],
};

// =====================================================================
// Registry
// =====================================================================

export const TEMPLATES: Template[] = [
  roguelite,
  adventure,
  visualNovel,
  rpg,
  rts,
  farmAuto,
];

export function getTemplate(id: string | null | undefined): Template | null {
  if (!id) return null;
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

// ponytail: pick localized name/tagline by active locale, fall back to base,
// then to Spanish, then to the first available entry. Avoids "[key]" runtime.
const FALLBACK_LOCALES: TemplateLocale[] = ["es", "en", "pt-BR"];

export function pickLocalized(
  t: Template,
  field: "name" | "tagline",
  locale: string
): string {
  const localized = t.i18n?.[field]?.[locale as TemplateLocale];
  if (localized) return localized;
  for (const fb of FALLBACK_LOCALES) {
    const v = t.i18n?.[field]?.[fb];
    if (v) return v;
  }
  // ponytail: if no i18n at all, return any non-empty entry from the field map
  if (t.i18n) {
    const any = Object.values(t.i18n[field]).find((v) => v);
    if (any) return any;
  }
  return t[field];
}
