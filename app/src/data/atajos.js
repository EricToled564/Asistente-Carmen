// Los dos Atajos de iOS que hacen falta para grabar clase con dos taps.
//
// ¿Por qué no los crea la app sola? Porque iOS no deja. Una página web no puede crear, modificar
// ni siquiera PREGUNTAR qué Atajos tiene el teléfono: no existe ninguna API para eso, y es a
// propósito — si la hubiera, cualquier web podría meterte automatizaciones en el móvil. Lo único
// que se puede hacer desde una web es pedirle a iOS que EJECUTE uno por su nombre
// (`shortcuts://run-shortcut?name=...`), y si no existe, iOS enseña su propio error —"el archivo
// de atajo no existe"— que esta app ni ve ni puede prevenir.
//
// Lo que sí existe, y es casi tan bueno: los enlaces de iCloud. Se construye el Atajo UNA vez en
// un iPhone de verdad, se toca Compartir, y sale un enlace `icloud.com/shortcuts/...`. Quien toque
// ese enlace lo instala de un toque, sin montar nada.
//
// Así que el trabajo manual se reduce a: hacerlo una vez y pegar los dos enlaces aquí (o en las
// variables de entorno). En cuanto estén, la pantalla de Captura deja de enseñar la receta de tres
// pasos y enseña un botón de "Instalar".
//
// Mientras estén vacíos NO se inventa nada ni se esconde el problema: la app dice claramente que
// hay que crearlos a mano y explica cómo, ahí mismo.
// Un solo Atajo, no dos: "Grabar audio" no es un paso que corre y sigue solo, se queda parado en
// pantalla grabando hasta que Carmen toca "Listo" ahí mismo — y solo entonces el propio Atajo
// continúa solo al paso de subir el archivo. No hace falta un segundo Atajo para "terminar".
export const ATAJOS = {
  grabar: {
    nombre: 'GrabarClase',
    // Pega aquí el enlace de iCloud, o ponlo en VITE_ATAJO_GRABAR_URL.
    instalarUrl: import.meta.env.VITE_ATAJO_GRABAR_URL || ''
  }
}

export const HAY_ENLACES_DE_INSTALACION = Boolean(ATAJOS.grabar.instalarUrl)

// `texto`, si se manda, es lo que Carmen eligió como materia en la app — llega al Atajo como su
// "Entrada de acceso directo" (Shortcut Input), y de ahí el Atajo lo usa como valor del campo
// `materia` que /audio necesita para guardar el apunte ya clasificado.
export function urlEjecutar(nombre, texto) {
  const base = `shortcuts://run-shortcut?name=${encodeURIComponent(nombre)}`
  return texto ? `${base}&input=text&text=${encodeURIComponent(texto)}` : base
}
