# Atajos de iOS — "Grabar clase" / "Terminar clase"

La PWA **no puede** grabar audio con la pantalla bloqueada ni controlar la app nativa Notas de
Voz — eso es una limitación de Safari/PWA en iOS, no algo que se pueda resolver con más código.
Por eso esta parte vive fuera de la app, en la app **Atajos** (Shortcuts) de iOS. Los botones
"Grabar clase" / "Terminar clase" de la PWA solo abren estos Atajos vía el esquema
`shortcuts://run-shortcut?name=...` — la lógica real de grabar y subir el audio va dentro del Atajo.

Esto lo tiene que crear **Eric, una sola vez, en el iPhone de ella** (o ella misma, siguiendo esta
guía). Toma ~10 minutos.

## ⚠️ Nota de verificación

Esto **no se pudo verificar en hardware real** durante la construcción de la app (Claude Code no
tiene acceso a un iPhone físico). Las acciones exactas disponibles en la app Atajos varían según
versión de iOS, y Apple ha cambiado el comportamiento de grabación en segundo plano de Notas de
Voz en varias versiones. Antes de entregar el regalo, **prueba ambos Atajos en el iPhone real de
ella** (o uno equivalente) y ajusta según lo que encuentres. Abajo se documenta el plan A y el
fallback si el plan A no funciona en su versión de iOS.

## Atajo 1: "GrabarClase"

**Nombre exacto:** `GrabarClase` (debe coincidir exactamente con el link `shortcuts://run-shortcut?name=GrabarClase` — sensible a mayúsculas/espacios).

Plan A (si tu versión de iOS lo soporta):
1. Abre **Atajos** → pestaña **Atajos** → botón **+**
2. Nombra el atajo `GrabarClase`
3. Agrega la acción **"Iniciar grabación de audio"** (o **"Grabar audio"**, el nombre varía por
   versión) — configúrala para que grabe indefinidamente hasta que se detenga manualmente
4. Guarda

Si esa acción no existe en su versión de iOS (algunas versiones no exponen control programático de
Notas de Voz), usa el **fallback**:
- El Atajo simplemente abre la app **Notas de Voz** (acción "Abrir app" → Notas de Voz)
- Ella toca el botón rojo de grabar manualmente (1 tap extra, en vez de 0)

## Atajo 2: "TerminarClase"

**Nombre exacto:** `TerminarClase`.

Plan A:
1. Nuevo atajo, nómbralo `TerminarClase`
2. Acción **"Detener grabación de audio"**
3. Acción **"Obtener último elemento de Notas de Voz"** (o "Obtener grabaciones recientes")
4. Acción **"Obtener contenido de URL"** apuntando a:
   - URL: `https://asistentecarmen.erictoled564.workers.dev/audio`
   - Método: `POST`
   - Cuerpo de solicitud: **Form** → campo `audio` = el archivo de audio del paso anterior
5. Guarda

Fallback si "Detener grabación" no existe o no encuentra el archivo automáticamente:
- El Atajo abre **Notas de Voz** y le pide a ella compartir manualmente la última grabación
  usando el botón de compartir nativo de iOS → elegir la app "Maite" (necesitarías registrar
  la PWA como target del share sheet, lo cual iOS permite de forma limitada para PWAs) o,
  más simple, compartir el archivo por Telegram al bot (que ya tiene el mismo pipeline en
  `/audio` vía el webhook `/telegram`) — esto ya funciona sin configuración adicional de Atajos.

## Flujo completo esperado (plan A)

1. Ella toca "Grabar clase" en la PWA → 1 tap → empieza a grabar con la pantalla bloqueada
2. Al terminar la clase, toca "Terminar clase" → 1 tap → se sube sola al Worker
3. El Worker transcribe (ElevenLabs Scribe) y estructura (Claude) → le llegan los apuntes
   procesados por Telegram

**Total: 2 taps**, tal como se diseñó. Si el hardware no soporta el plan A completo, el fallback
más simple y confiable es: grabar con Notas de Voz manualmente y compartir el archivo al bot de
Telegram — cero configuración de Atajos necesaria, funciona en cualquier versión de iOS.

## Compartir el Atajo con ella

Una vez creados y probados, usa el botón de compartir dentro de la app Atajos para generar un
link de iCloud (`https://www.icloud.com/shortcuts/...`) por cada uno. Esos son los links que se
sugieren incluir en el checklist de onboarding ("Mis primeros 30 días") si prefieres que ella los
instale desde ahí en vez de crearlos tú directamente en su teléfono.
