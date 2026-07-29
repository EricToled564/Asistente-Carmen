#!/usr/bin/env python3
"""Reemplaza un documento del Knowledge Base de Maite por la version del repo.

    ./actualizar-kb-doc.py KB8 ../kb/KB8-horario.md

Por que existe: los documentos del KB no se pueden editar en sitio de forma fiable, asi que
actualizar uno es crear el nuevo, engancharlo al agente y borrar el viejo. Hecho a mano ese orden se
equivoca facil, y equivocarse tiene dos formas malas: borrar el viejo antes de enganchar el nuevo
(Maite se queda sin ese documento) o no borrarlo (Maite acaba con dos horarios distintos y contesta
con el que le apetezca). Este script hace siempre el orden bueno y comprueba despues.

Usa curl por debajo a proposito: en el sandbox de desarrollo las peticiones de Node y de workerd
las bloquea el proxy y solo curl sale a internet.

Necesita ELEVENLABS_API_KEY en el entorno (o en worker/.dev.vars).
"""
import json
import os
import subprocess
import sys
from pathlib import Path

API = "https://api.elevenlabs.io/v1/convai"
AQUI = Path(__file__).resolve().parent


def clave():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    dev = AQUI.parent / ".dev.vars"
    if dev.exists():
        for linea in dev.read_text().splitlines():
            if linea.startswith("ELEVENLABS_API_KEY="):
                return linea.split("=", 1)[1].strip()
    sys.exit("Falta ELEVENLABS_API_KEY (en el entorno o en worker/.dev.vars)")


def agent_id():
    txt = (AQUI.parent / "wrangler.toml").read_text()
    for linea in txt.splitlines():
        if linea.strip().startswith("ELEVENLABS_AGENT_ID"):
            return linea.split("=", 1)[1].strip().strip('"')
    sys.exit("No encuentro ELEVENLABS_AGENT_ID en wrangler.toml")


def llamar(metodo, ruta, k, cuerpo=None, cruda=False):
    cmd = ["curl", "-sS", "-m", "90", "-X", metodo, f"{API}{ruta}", "-H", f"xi-api-key: {k}", "-w", "\n%{http_code}"]
    if cuerpo is not None:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(cuerpo)]
    salida = subprocess.run(cmd, capture_output=True, text=True).stdout
    texto, _, codigo = salida.rpartition("\n")
    codigo = int(codigo or 0)
    if cruda:
        return codigo, texto
    return codigo, (json.loads(texto) if texto.strip() else {})


def main():
    if len(sys.argv) != 3:
        sys.exit(f"Uso: {sys.argv[0]} <codigo KB, ej KB8> <ruta al .md>")
    codigo, ruta = sys.argv[1], Path(sys.argv[2])
    if not ruta.exists():
        sys.exit(f"No existe {ruta}")
    k, ag = clave(), agent_id()

    contenido = ruta.read_text()
    # Un documento vacio o casi vacio no se sube. Si algo fue mal generandolo, el fallo tiene que
    # salir aqui y no dentro de una conversacion, donde se manifiesta como que Maite "no sabe".
    if len(contenido) < 300:
        sys.exit(f"{ruta} solo tiene {len(contenido)} caracteres. Eso no parece un documento entero.")

    est, agente = llamar("GET", f"/agents/{ag}", k)
    if est != 200:
        sys.exit(f"No pude leer el agente ({est})")
    prompt = agente["conversation_config"]["agent"]["prompt"]
    kb = prompt.get("knowledge_base", [])
    tools_antes = len(prompt.get("tool_ids", []))
    prompt_antes = len(prompt.get("prompt", ""))

    viejos = [d for d in kb if d["name"].startswith(codigo)]
    print(f"Agente: {len(kb)} documentos, {tools_antes} herramientas, prompt de {prompt_antes} caracteres.")
    print(f"Documentos {codigo} enganchados ahora: {[d['id'] for d in viejos] or 'ninguno'}")

    est, nuevo = llamar("POST", "/knowledge-base/text", k, {"name": f"{codigo} - {ruta.stem}", "text": contenido})
    if est != 200 or not nuevo.get("id"):
        sys.exit(f"No se pudo crear el documento nuevo ({est}): {nuevo}")
    print(f"Creado {nuevo['id']} ({len(contenido)} caracteres).")

    # Se manda SOLO la rama knowledge_base. El PATCH del agente hace mezcla profunda, asi que el
    # prompt, las herramientas y el saludo se quedan como estan. Mandar `prompt.tools` en linea da
    # 400 y mandar el prompt entero es la forma facil de pisarlo sin enterarse.
    ids_viejos = {d["id"] for d in viejos}
    kb_nuevo = [d for d in kb if d["id"] not in ids_viejos]
    kb_nuevo.append({"type": "text", "name": nuevo["name"], "id": nuevo["id"], "usage_mode": "auto"})
    est, _ = llamar(
        "PATCH", f"/agents/{ag}", k, {"conversation_config": {"agent": {"prompt": {"knowledge_base": kb_nuevo}}}}
    )
    if est != 200:
        llamar("DELETE", f"/knowledge-base/{nuevo['id']}", k, cruda=True)
        sys.exit(f"No pude enganchar el documento nuevo ({est}). Lo he borrado; el agente sigue como estaba.")

    est, despues = llamar("GET", f"/agents/{ag}", k)
    p2 = despues["conversation_config"]["agent"]["prompt"]
    kb2 = p2.get("knowledge_base", [])
    problemas = []
    if not any(d["id"] == nuevo["id"] for d in kb2):
        problemas.append("el documento nuevo no aparece enganchado")
    if len(kb2) != len(kb) - len(viejos) + 1:
        problemas.append(f"el numero de documentos no cuadra ({len(kb)} -> {len(kb2)})")
    if len(p2.get("tool_ids", [])) != tools_antes:
        problemas.append(f"cambiaron las herramientas ({tools_antes} -> {len(p2.get('tool_ids', []))})")
    if len(p2.get("prompt", "")) != prompt_antes:
        problemas.append(f"cambio el system prompt ({prompt_antes} -> {len(p2.get('prompt', ''))})")
    if problemas:
        sys.exit("PARO SIN BORRAR NADA. " + "; ".join(problemas))

    # Solo ahora, con el nuevo comprobado, se borra el viejo.
    for d in viejos:
        est, _ = llamar("DELETE", f"/knowledge-base/{d['id']}", k, cruda=True)
        print(f"Borrado el viejo {d['id']} ({est})")

    print(f"Listo. {len(kb2)} documentos, {len(p2.get('tool_ids', []))} herramientas, prompt intacto.")


if __name__ == "__main__":
    main()
