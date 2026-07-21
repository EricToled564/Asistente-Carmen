# AGENTE [NOMBRE] — Arquitectura Maestra v1.0
**Proyecto:** Regalo de despedida — companion de voz + app para estudiante de primer año, Grado en Diseño, Universidad de Navarra (Pamplona)
**Fecha de diseño:** 21-jul-2026 · **Estado:** Diseño cerrado, pendiente construcción

---

## 1. VISIÓN

Un companion personal con tres puertas de entrada — **PWA** (la casa), **bot de Telegram** (el canal diario) y **voz** (el alma, vía ElevenLabs) — que la acompaña emocionalmente, le resuelve la supervivencia práctica de sus primeros meses en España y le da ventaja académica en su carrera. Todo sin pedirle nada antes del regalo (KB 100% de fuentes públicas verificadas) y con costo recurrente mínimo.

**Principio rector:** el agente nunca inventa. Lo que no está en su KB lo dice y deriva a la fuente correcta.

---

## 2. ARQUITECTURA GENERAL (4 PIEZAS)

```
┌─────────────────────────────────────────────────┐
│  ELLA (iPhone)                                  │
│  ├── PWA instalada (pantalla de inicio)         │
│  ├── Telegram (bot)                             │
│  └── 2 Atajos iOS (grabar / terminar clase)     │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  CLOUDFLARE WORKER (middleware único, gratis)   │
│  Todos los webhooks y proxies viven aquí        │
└──┬───────────┬───────────┬──────────────────────┘
   │           │           │
   ▼           ▼           ▼
ElevenLabs   Claude API   APIs externas (v2)
(agente voz  (visión,     (AEMET, Renfe,
 + Scribe    apuntes,     eventos, EUR/MXN)
 STT)        estructura)
```

| Pieza | Rol | Costo |
|---|---|---|
| Agente ElevenLabs | Voz conversacional, persona, RAG sobre KB | Plan Starter/Creator $5-22/mes (único costo fijo) |
| PWA (Claude Code) | Mapa, SOS, foto, académico, widget del agente | Hosting gratis (Cloudflare Pages) |
| Bot Telegram | Chat diario, buzón de audios, proactividad | $0 (API abierta, sin verificación) |
| Worker Cloudflare | Webhooks, proxy de API keys, pipeline de audio | Free tier |
| Claude API | Visión de fotos, estructurar apuntes, bot | Centavos por uso |

**Descartados por decisión:** WhatsApp Business (verificación Meta), Twilio/telefonía (costo), web app custom de voz (reinventar infraestructura), modo-oyente de 90 min (frágil, sin audio verificable).

---

## 3. EL AGENTE (ElevenLabs)

### 3.1 Identidad
- **Nombre:** [NOMBRE] — propuestas: Xane, Iru, Nava
- **Personalidad default:** cálida-práctica; español MX de base, code-switching natural con ES peninsular
- **Rol declarado:** "asistente personal y compañía, regalo de tu tío" — no terapeuta, no autoridad académica, no servicio de emergencia

### 3.2 Canales
1. Widget embebido en la PWA (voz por micrófono — canal principal)
2. Bot de Telegram (texto y notas de voz)

### 3.3 Dominios de cobertura (D1-D7)
- **D1 Carrera:** materias, ECTS, menciones, guías docentes, idioma de clases. Dato estratégico: mención por orden de expediente
- **D2 Campus:** ubicaciones de edificios, servicios, deporte, comida, ADI/correo
- **D3 Alojamiento:** directorio completo de colegios mayores y residencias
- **D4 Pamplona:** villavesas, tarjeta de transporte, zonas, aeropuerto/tren
- **D5 Trámites:** empadronamiento, TIE (plazo 1 mes, EX-17), banco, sanidad, móvil — mayor valor primeras 4 semanas
- **D6 Cultura:** horarios españoles, pintxos, San Fermín, clima, diccionario MX↔ES
- **D7 Emocional ligero:** escucha, normaliza el bajón del mes 2-3, sugiere actividades y llamar a casa. Acompaña, no terapea

### 3.4 Guardrails (en system prompt)
- Si no está en el KB → decirlo + derivar a fuente (Secretaría, ADI, recepción, 112)
- Aulas específicas: solo del horario oficial cargado + disclaimer "confirma en ADI si importa hoy"
- Fuera de alcance: gestiones personales, consejo médico/legal serio, datos inventados
- Horario de verano de villavesas (15-jul a 30-ago) señalado explícitamente

---

## 4. KNOWLEDGE BASE (7 documentos, markdown optimizado RAG)

| # | Documento | Contenido | Fuente (verificada) | Caducidad |
|---|---|---|---|---|
| KB1 | Plan Grado en Diseño | 4 cursos completos, menciones (Producto/Moda/Servicios), regla de expediente, 1º en inglés, links a guías docentes | unav.edu/web/grado-en-diseno/plan-de-estudios | Anual |
| KB2 | Plan Ing. Diseño Industrial | Plan 2025 completo (240 ECTS), itinerarios; nota: se imparte en Tecnun San Sebastián | unav.edu (página oficial del grado) | Anual |
| KB3 | Alojamiento | 8 colegios mayores + ~15 residencias con dirección/tel/web; CM vs residencia | unav.edu/admision-y-ayudas/alojamiento | Anual |
| KB4 | Campus Pamplona | 113 ha, 14 facultades, edificios clave, running 5km, servicios | unav.edu campus + gestión de espacios | Anual |
| KB5 | Movilidad | 25 líneas diurnas + 10 nocturnas, parada Fuente del Hierro, tarjeta, app Tu Villavesa, horario verano, aeropuerto/Renfe | infotuc.es, tuvillavesa.es, transfermuga.eu | Semestral |
| KB6 | Trámites de llegada | Empadronamiento, TIE (1 mes, EX-17, tasa, 3 fotos, 30h/sem trabajo), banco, sanidad, checklist 30 días | parainmigrantes.info + fuentes oficiales | Semestral ⚠️ |
| KB7 | Cultura y vida | Horarios ES, gastronomía, San Fermín, Navarra/euskera básico, clima, diccionario MX↔ES, sabor de casa | Redacción propia curada | Estable |
| KB8* | Horario 1º Diseño 26-27 | Materias + aulas + horas del semestre en curso | unav-publish.bulletscheduling.com (captura manual Eric) | **Cada semestre** |

*KB8 se agrega cuando Eric capture el horario (ya publicado; clases inician 1-sep-2026).
**Mantenimiento total estimado:** ~1 hora por semestre (re-subir KB5, KB6, KB8).

---

## 5. LA PWA (construye Claude Code)

### Módulos v1
1. **Mapa** — pines curados (residencia, Escuela de Arquitectura, biblioteca, comisaría TIE, ayuntamiento, paradas clave, pintxos) + rutas vía deep links a Google Maps (costo $0)
2. **Foto → info** — Claude visión vía proxy: edificios, menús, letreros, cartas del ayuntamiento, formularios
3. **Agente embebido** — widget ElevenLabs (voz)
4. **SOS** — ver §7
5. **Hora de casa** — reloj México siempre visible + "ventana buena para llamar" + countdown a próxima visita/Navidad
6. **Checklist "Mis primeros 30 días"** — tareas palomeables con qué llevar a cada cita; tarea #1: configurar Emergencia SOS nativo del iPhone
7. **Captura rápida** — botón de dictado 2 min post-clase → agente estructura, agenda entregas, archiva referentes
8. **Botón "Grabar clase" / "Terminar clase"** — lanza Atajos iOS (ver §8)
9. **Radar académico** — countdowns de entregas/exámenes + push
10. **Tutor** — quiz y explicación por asignatura (sobre KB1/KB8)
11. **Push notifications** — recordatorios + check-in proactivo

### Módulos v1.5
- Diario de voz con recap de semestre · Check-in de ánimo 1-tap · Gastos EUR con equivalencia MXN · Crit partner (foto de lámina → jurado amable) · Tracker de mención (promedio vs meta) · Banco de referentes · Conversor tallas · "Llegué bien" (check-in nocturno a familia)

---

## 6. BOT DE TELEGRAM (v1)

- Chat de texto/voz con el mismo cerebro y persona del agente
- **Buzón de audios largos:** recibe la grabación de clase (desde menú compartir nativo de iOS) → pipeline de apuntes
- Entrega de apuntes procesados y notificaciones
- **Proactividad:** mensajes programados ("¿cómo estuvo tu primer día?") — recupera lo perdido al descartar WhatsApp
- Costo $0, sin verificación de nadie

---

## 7. MÓDULO SOS (dos capas)

**Capa nativa (la app la activa, no la reemplaza):** Emergencia SOS del iPhone — llamada automática real al 112, aviso a contactos con ubicación, detección de accidentes, satélite. Configurarlo = tarea #1 del checklist.

**Capa app (caso intermedio: "que mi familia sepa dónde estoy YA"):**
1. Tap → cuenta regresiva 5 s cancelable
2. Captura GPS (permiso otorgado desde onboarding)
3. **Tres canales en paralelo:** push a papá/Eric (PWA modo familia) + email automático con link de ubicación y batería (Resend, gratis) + WhatsApp personal pre-armado vía wa.me (ella solo toca enviar — sin API de Meta)
4. Pantalla cambia a modo emergencia: 112 gigante (2 taps), Consulado de México, su dirección en texto grande
5. Degradación con gracia: sin GPS → "última ubicación conocida"; sin datos → encola y reintenta; nunca falla en silencio

**Límite declarado en la app:** no es servicio de emergencia; peligro inmediato = 112 primero.

---

## 8. ATAJOS iOS (2, preconfigurados vía link iCloud en el checklist)

| Atajo | Hace | Taps |
|---|---|---|
| "Grabar clase" | Inicia grabación en Notas de Voz (nativa = pantalla bloqueada OK) | 1 |
| "Terminar clase" | Detiene → toma última nota → POST del audio al Worker | 1 |

Flujo completo de una clase: **2 taps totales.** Apuntes llegan solos a Telegram.
⚠️ **Verificable en hardware real:** disponibilidad exacta de acciones de Notas de Voz según versión de iOS. Fallback definido: abrir app (1 tap extra) / compartir manual (2-3 taps). Degrada, nunca rompe.

---

## 9. WORKER CLOUDFLARE — WEBHOOKS Y ENDPOINTS

### v1 (requeridos)
| Endpoint | Función | Consumidor |
|---|---|---|
| `POST /vision` | Proxy a Claude API con visión (la key NUNCA en frontend) | PWA (módulo foto, crit partner) |
| `POST /audio` | Recibe audio → ElevenLabs Scribe (STT) → Claude estructura → responde apuntes | Atajo "Terminar clase", Telegram |
| `POST /telegram` | Webhook del bot (mensajes entrantes, entrega de respuestas) | Telegram API |
| `POST /sos` | Dispara email (Resend) + push a familia con ubicación | PWA (botón SOS) |
| `POST /push/subscribe` + `cron push` | Registro y envío de notificaciones (radar académico, check-ins) | PWA |

### v2 (server tools del agente ElevenLabs — futuro)
| Tool/Webhook | API origen | Estado verificación |
|---|---|---|
| `GET /clima` | AEMET OpenData (key gratuita, predicción municipal Pamplona) | ✅ Verificada |
| `GET /trenes` | Renfe Data GTFS (sin auth) + GTFS-RT AV/LD/MD cada 30s. Límite: sin llegadas real-time robustas por estación | ✅ Verificada con matiz |
| `GET /eventos` | Scraping ligero pamplona.es + culturanavarra.es + Google Calendars públicos UNAV (ICS) | ✅ Fuentes verificadas, sin API formal |
| `GET /cambio` | Frankfurter/BCE EUR↔MXN (gratis, sin key) | Conocida, verificar al construir |
| `GET /villavesas-rt` | infotuc.es tiempo real | ⚠️ NO verificada — única pendiente; fallback: "abre la app Tu Villavesa" |

---

## 9-BIS. MANTENIMIENTO DEL KB (dos mecanismos, cero carga para Eric)

Diseño explícito: **Eric no participa en el mantenimiento continuo.** Todo corre solo o lo hace ella con 1 minuto de esfuerzo.

### Mecanismo A — Auto-investigación (cron del Worker vía Claude API)

Para las 6 fuentes que son páginas web públicas legibles. Pipeline de 4 pasos por cron: investigar (Claude + web search) → comparar contra el documento actual (GET a ElevenLabs) → decidir (sesgo a NO tocar si hay ambigüedad) → actualizar (PATCH a ElevenLabs solo si hay cambio confirmado con fuente citada).

| Doc | Fuente | Frecuencia |
|---|---|---|
| KB1 Plan Grado en Diseño | unav.edu | Semestral (1-ago, 1-ene) |
| KB2 Plan Ing. Diseño Industrial | unav.edu | Semestral (1-ago, 1-ene) |
| KB3 Alojamiento | unav.edu | Semestral (1-ago, 1-ene) |
| KB4 Campus | unav.edu | Semestral (1-ago, 1-ene) |
| KB5 Movilidad | tuvillavesa.es, transfermuga.eu | Mensual |
| KB6 Trámites de llegada | parainmigrantes.info + oficiales | Mensual |
| KB7 Cultura | — | Nunca (contenido curado, no fuente viva) |

### Mecanismo B — Self-service upload (ella sube, la app actualiza sola)

Para lo que Claude no puede leer solo (KB8, plataforma JS de horarios) o que solo ella sabe que cambió (trámites personales).

**Flujo:** notificación push recordatorio → ella abre tab "Actualizar mi info" → sube foto/screenshot o pega texto → Claude visión extrae y formatea como markdown → **vista previa editable** (ella confirma en 5 seg) → PATCH automático a ElevenLabs → "Listo, ya actualicé lo que sabe tu agente ✅". Eric no está en el loop.

| Qué sube | Disparador |
|---|---|
| Horario del semestre (KB8) | Push recordatorio: 25-ago y 20-dic |
| Trámites/otros documentos | Botón siempre disponible, sin push — cuando a ella le cambie algo |

**Guardrail:** si Claude no reconoce el contenido como estructurable, pide aclaración en vez de meter ruido al KB. Fallos de red/fetch: log + reintento, nunca falla en silencio ni borra el documento existente.

---

## 10. FASEO

- **v1 (el regalo):** Agente + KB1-KB7 + PWA módulos 1-11 + bot Telegram + atajos + SOS
- **KB8:** al capturar horario (antes del 1-sep)
- **v1.5 ("sorpresa parte 2"):** módulos emocionales/académicos avanzados
- **v2:** server tools de APIs dinámicas

---

## 11. PENDIENTES

**De Eric (bloqueantes):**
1. **Fecha de partida** → define cronograma
2. **Nombre + personalidad** del agente (placeholder activo: [NOMBRE], cálida-práctica)
3. Capturar horario 1º Diseño (bulletscheduling — app JS, manual, 15 min)
4. Confirmar nombre exacto de la carrera (Grado en Diseño vs Ingeniería — KB cubre ambos como hedge)
5. Cuenta ElevenLabs · destinatarios SOS · ¿ella usa Telegram?

**Verificables en hardware/construcción (no bloquean diseño):**
- Acciones de Atajos sobre Notas de Voz en su versión de iOS
- Endpoint tiempo real infotuc (solo v2)
- Costo exacto plan ElevenLabs según minutos de uso real

---

## 12. RIESGOS TOP

1. **Caducidad de KB6/KB8** (trámites y horarios) → calendario de mantenimiento semestral, 1h
2. **Confianza destruida por un dato inventado** → guardrails anti-alucinación son la línea roja del system prompt
3. **Scope creep vs fecha de partida** → faseo estricto; v1 se entrega completo o se recorta v1, nunca se atrasa
4. **Adopción de Telegram** → todo lo esencial vive también en la PWA; Telegram es capa, no dependencia
5. **D7 mal calibrado** (condescendiente o terapeuta) → persona se prueba con conversaciones reales antes de entregar
