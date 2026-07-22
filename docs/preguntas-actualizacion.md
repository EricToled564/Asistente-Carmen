# Mecanismo C — Preguntas de actualización

Catálogo en `worker/src/config/preguntasActualizacion.ts`. Todas están siempre disponibles en
**Ajustes → Preguntas** dentro de la app — no hace falta esperar el push para contestarlas. Lo
que varía es si además tienen un recordatorio push automático:

| Pregunta | Doc que actualiza | ¿Push automático? |
|---|---|---|
| `residencia-check` | KB3 | ✅ Sí — mismo cron que "sube tu horario" (25-ago y 20-dic) |
| `contacto-check` | KB3 | ✅ Sí — enganchado al cron mensual de KB5-6, pero solo dispara cada 3er mes (ene/abr/jul/oct) |
| `antropologia-grupo` | KB8 | ❌ No — el prompt v2 la marca "manual una vez"; no tiene recordatorio push |
| `mencion-check` | KB1 | ❌ No — el prompt v2 la marca "solo-4to-curso", un momento muy específico ~3 años a futuro. No se automatizó con un cron dedicado porque el plan gratis de Cloudflare limita a 5 triggers y ya están todos ocupados; además la fecha exacta del calendario académico de 4º curso no se conoce hoy. Queda disponible en la UI para dispararla manualmente cuando llegue el momento (o agregar un cron dedicado ese año, si para entonces hay cupo o se libera alguno de los actuales). |
| `libre` | — (memoria) | Botón siempre visible, sin push — por diseño |

## Por qué no tiene cada una su propio cron trigger

Cloudflare Workers en el plan gratis permite máximo 5 cron triggers por cuenta, y ya están los 5
ocupados (auto-investigación KB1-4 semestral, KB5-6 mensual, recordatorio de horario, check-in
diario — ver `worker/wrangler.toml`). En vez de necesitar más cupo, `residencia-check` y
`contacto-check` se "montan" sobre triggers que ya existen y disparan en fechas compatibles —
ver `worker/src/cron/pushReminders.ts` (`recordatorioResidenciaCheck`,
`recordatorioContactoCheckSiTrimestre`).

## "libre" y la memoria de Maite

La pregunta `libre` no tiene un documento de KB fijo — sus respuestas se guardan como memoria
persistente de Maite (mecanismo 12, `POST /memory/add`) en vez de hacer PATCH a un documento.
Es una decisión de diseño: información suelta sin destino claro encaja mejor como recuerdo
conversacional que como edición de un documento estructurado.
