# PROMPT MAESTRO — Claude Code
## Proyecto: App "[NOMBRE]" — companion PWA para estudiante en Navarra

Pega esto como primer mensaje a Claude Code (terminal, VS Code o app desktop) en un directorio vacío. Modelo recomendado: **Sonnet 5** (escala a Opus 4.8 solo si te atoras en un módulo específico).

---

## CONTEXTO DEL PROYECTO

Estoy construyendo un regalo de despedida: una PWA companion para mi sobrina de 18 años que se muda sola a Pamplona, España, a estudiar el Grado en Diseño en la Universidad de Navarra. Es su primera vez lejos de casa (México), en un país nuevo. La app debe darle compañía emocional, resolver su supervivencia práctica los primeros meses, y darle ventaja académica. Debe funcionar como PWA instalable en iPhone.

**Principio no negociable:** la app nunca debe inventar información. Todo dato de campus/trámites/ciudad viene de una Knowledge Base curada (vive en un agente de voz aparte de ElevenLabs, no en esta app) — la app consume ese agente vía widget embebido, no reimplementa su lógica.

## STACK TÉCNICO

- **Frontend:** React + Vite, PWA (manifest + service worker), Tailwind
- **Hosting:** Cloudflare Pages (gratis)
- **Backend/middleware:** Cloudflare Worker — TODOS los proxies y webhooks viven aquí, nunca API keys en el frontend
- **APIs externas:** Claude API (visión, estructura de texto), ElevenLabs API (Scribe STT, widget de agente embebido), Telegram Bot API, Resend (email transaccional, para SOS)
- **Sin base de datos pesada:** usar KV de Cloudflare Workers o D1 (SQLite) para lo mínimo (registro de push subscriptions, log de gastos si aplica)

## MÓDULOS A CONSTRUIR (en este orden de prioridad)

### 1. Esqueleto PWA
- Manifest, ícono, service worker básico, instalable en iPhone (Add to Home Screen)
- Navegación simple: 5-6 tabs (Inicio, Mapa, Agente, Académico, SOS, Ajustes)
- Diseño: cálido pero no infantil — para una estudiante de diseño, el propio look de la app debe verse cuidado. Usa tu criterio de diseño visual distintivo, no defaults genéricos de UI kit.

### 2. Widget del agente (ElevenLabs embebido)
- Integrar el widget/SDK de ElevenLabs Agents en un tab dedicado
- El agent_id y la configuración vendrán después (yo los genero por separado en la plataforma de ElevenLabs)
- Dejar el componente listo para recibir esas credenciales vía variable de entorno

### 3. Mapa
- Mapbox GL JS o Google Maps JS (usa el que tengas más fácil de configurar con free tier)
- Pines curados hardcodeados (te paso la lista de lugares después: residencia, Escuela de Arquitectura, biblioteca, comisaría, ayuntamiento, paradas de villavesa clave)
- Cada pin, al tocarlo, abre un deep link a Google Maps con ruta desde ubicación actual (no reimplementes Directions API — usa el deep link `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`)

### 4. Foto → información (Claude visión)
- Botón "tomar/subir foto" → POST al Worker → Worker llama Claude API con la imagen → devuelve explicación en texto
- El Worker es quien tiene la ANTHROPIC_API_KEY, nunca el frontend
- Mostrar respuesta en un chat simple de esa sesión (no necesita persistir historial largo)

### 5. Módulo Académico
- Radar de fechas: input manual inicial de fechas de entregas/exámenes (después se puede alimentar del KB del agente); countdown visual
- Tutor: este vive dentro del widget del agente (módulo 2), no se reconstruye aquí — solo asegúrate que el tab de Académico tenga acceso directo al agente con un prompt de contexto ("modo estudio")
- Captura rápida: botón de grabación corta (2 min máx, esto SÍ funciona nativo en navegador con pantalla activa) → POST audio al Worker → Worker transcribe (ElevenLabs Scribe) → Claude estructura → mostrar resultado

### 6. Botones "Grabar clase" / "Terminar clase" (Atajos iOS)
- Estos NO se programan en la PWA — son enlaces que disparan Atajos de iOS: `shortcuts://run-shortcut?name=GrabarClase` y `shortcuts://run-shortcut?name=TerminarClase`
- Construye los botones que abren esos links
- Deja un doc README explicando qué Atajo debo crear yo en la app Atajos de iOS (acciones: iniciar grabación en Notas de Voz / detener y hacer POST del archivo al endpoint `/audio` del Worker) — investiga en tiempo de construcción si esas acciones existen en iOS actual y documenta el fallback si no

### 7. Módulo SOS
- Botón grande, cuenta regresiva de 5s cancelable
- Captura GPS (permiso pedido en onboarding, no en el momento)
- POST al Worker endpoint `/sos` con lat/lng + batería
- Worker dispara: (a) push notification a dispositivos "familia" registrados, (b) email vía Resend con link de Google Maps de la ubicación
- Tercer canal: abrir `https://wa.me/NUMERO?text=SOS...` con mensaje pre-armado (ella confirma envío manual)
- Tras enviar: pantalla cambia a "modo emergencia" con botón tel:112 gigante, tel: del consulado, dirección de su residencia en texto grande

### 8. Notificaciones push
- Web Push API estándar, suscripción guardada en KV/D1
- Cron en el Worker (Cloudflare Cron Triggers) para check-ins proactivos programados

### 9. Módulo "Actualizar mi info" (self-service KB upload)
- Tab/sección con botón de subir foto/screenshot o pegar texto + selector de tipo (Horario/Trámite/Otro)
- POST a `/kb-upload` → Worker extrae con Claude visión si es imagen → Claude formatea como markdown → **vista previa editable antes de confirmar** → al confirmar, Worker hace PATCH al documento correspondiente vía API de ElevenLabs
- Mensaje de confirmación simple post-actualización
- Recordatorios push programados: 25-ago y 20-dic ("ya deben estar tus horarios, súbelos aquí")
- Ver especificación completa de mantenimiento del KB más abajo

### 10. Onboarding
- Primera vez que abre la app: pedir permisos (ubicación, notificaciones), explicar qué es la app, checklist "Mis primeros 30 días" con la tarea #1 siendo "configura Emergencia SOS nativo del iPhone con estos contactos" (con capturas de cómo hacerlo)

## MANTENIMIENTO DEL KB — DOS MECANISMOS COMPLEMENTARIOS

El KB del agente (en ElevenLabs) tiene 8 documentos con distinta naturaleza de cambio. Se mantiene con dos mecanismos, no uno solo:

### A) Auto-investigación (cron del Worker, sin intervención humana)

Para documentos con fuente pública que Claude SÍ puede leer (páginas web estáticas). El Worker corre varios Cloudflare Cron Triggers, cada uno con su propia frecuencia:

**Pipeline por cron (4 pasos, mismo patrón para todos):**
1. **Investigar** — llamar a Claude API (con tool de web search) pidiendo revisar la fuente oficial de ese documento específico
2. **Comparar** — pasarle el contenido actual del documento (GET del endpoint de ElevenLabs) + lo que encontró; responde en JSON: `{cambios: boolean, contenido_nuevo, resumen_del_cambio, fuente_citada}`
3. **Decidir** — si `cambios: false`, no tocar nada. Sesgo deliberado a NO actualizar ante ambigüedad (mejor no tocar que corromper con una falsa detección)
4. **Actualizar** — si `cambios: true` Y hay `fuente_citada` verificable, hacer PATCH al documento vía API de ElevenLabs, y loguear el cambio (no requiere notificar a nadie salvo que quieras un log opcional)

**Documentos y frecuencia (cron por tema, no uno general):**

| Doc | Fuente a vigilar | Cron | Automatizable |
|---|---|---|---|
| KB1 Plan Grado en Diseño | unav.edu | Semestral (1-ago, 1-ene) | ✅ Sí |
| KB2 Plan Ing. Diseño Industrial | unav.edu | Semestral (1-ago, 1-ene) | ✅ Sí |
| KB3 Alojamiento | unav.edu | Semestral (1-ago, 1-ene) | ✅ Sí |
| KB4 Campus | unav.edu | Semestral (1-ago, 1-ene) | ✅ Sí |
| KB5 Movilidad (villavesas) | tuvillavesa.es, transfermuga.eu | Mensual | ✅ Sí |
| KB6 Trámites de llegada | parainmigrantes.info + fuentes oficiales | Mensual | ✅ Sí |
| KB7 Cultura | — | Nunca | No aplica (contenido curado, no una fuente viva) |
| KB8 Horario de clases | Plataforma JS de scheduling (bulletscheduling) | — | ❌ No — Claude no puede leer una plataforma JS de forma confiable → ver mecanismo B |

### B) Self-service upload (ella sube, la app actualiza sola)

Para lo que Claude no puede leer solo (plataformas JS, documentos personales) o que solo ella sabe que cambió.

**Tab/módulo "Actualizar mi info" en la PWA:**
- Botón siempre visible: subir foto/screenshot o pegar texto
- Selector de tipo: Horario / Trámite / Otro
- Flujo del Worker: recibe archivo en `POST /kb-upload` → si es imagen, Claude API con visión extrae contenido estructurado → Claude formatea como el documento markdown correspondiente → **muestra vista previa editable a ella antes de confirmar** (5 segundos de revisión, nunca ciego) → al confirmar, PATCH automático al documento del agente vía API de ElevenLabs → mensaje simple: "Listo, ya actualicé lo que sabe tu agente ✅"

**Recordatorios push programados (calendario, no cron de investigación):**

| Qué le recuerda | Cuándo |
|---|---|
| Subir horario del semestre | 25-ago y 20-dic (antes de cada inicio de semestre) |
| — (sin recordatorio, botón siempre disponible) | Trámites/otros documentos cuando a ella le cambien |

**Guardrail del prompt de extracción:** si Claude no reconoce el contenido subido como información útil y estructurable, debe responder pidiendo aclaración ("no reconozco esto como un horario, ¿me lo describes?") en vez de meter ruido al KB — nunca actualizar con contenido dudoso.

**Manejo de fallos (ambos mecanismos):** fuente caída, error de fetch, o timeout → nunca fallar en silencio ni borrar el documento existente; loguear y reintentar en el próximo ciclo (mecanismo A) o mostrarle error claro con reintento (mecanismo B).

## BOT DE TELEGRAM (proyecto separado, mismo Worker)

- Webhook en `/telegram` recibiendo updates de la Bot API
- Reenvía texto/audio al mismo pipeline que el módulo de captura rápida
- Responde con el mismo tono/persona del agente (definido en el system prompt que te paso aparte)
- Yo creo el bot con @BotFather y te paso el token después

## LO QUE NO CONSTRUIMOS AQUÍ

- No reimplementes el agente conversacional (eso es ElevenLabs, vía widget)
- No reimplementes reconocimiento de voz para clases largas (eso es Notas de Voz nativo + Atajos)
- No necesitas autenticación de usuarios — es una app de un solo usuario (ella), sin login, o con un PIN simple si acaso

## CÓMO QUIERO TRABAJAR

- Ve construyendo por módulos, en el orden de arriba, y para después de cada módulo: muéstrame qué funciona antes de seguir
- Todo el código en un repo, estructura clara `/app` (frontend) y `/worker` (backend)
- Documenta en un README qué variables de entorno necesito llenar yo (API keys) y qué configuración externa me falta hacer (Cloudflare account, Resend account, etc.)
- Si algo de iOS/Atajos no lo puedes verificar sin hardware real, dilo explícitamente y deja el fallback documentado — no asumas que funciona

## PRIMER PASO

Antes de escribir código: propón la estructura de carpetas del repo y un plan de los primeros 3 módulos (esqueleto PWA + widget agente + mapa) para que yo lo apruebe antes de que generes archivos.
