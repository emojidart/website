from __future__ import annotations
import io, json, os, re, threading, wave, hashlib
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import numpy as np
import onnxruntime as ort
from kokoro_onnx import Kokoro

BASE=Path(__file__).resolve().parent
MODEL=BASE/'models'/'kokoro-martin.onnx'
VOICES=BASE/'models'/'voices-martin.npz'
if not MODEL.exists() or not VOICES.exists():
    raise SystemExit('Modelldateien fehlen. Bitte zuerst INSTALLIEREN.cmd ausfuehren.')

# eSpeak NG ist die Phonemisierung; die ausgegebene Stimme kommt ausschliesslich von Martin.
espeak_paths=[Path(os.environ.get('PHONEMIZER_ESPEAK_LIBRARY','')),
              Path(r'C:\Program Files\eSpeak NG\libespeak-ng.dll'),
              Path(r'C:\Program Files (x86)\eSpeak NG\libespeak-ng.dll')]
_dll_handle = None
for p in espeak_paths:
    if p.is_file():
        os.environ['PHONEMIZER_ESPEAK_LIBRARY']=str(p)
        _dll_handle = os.add_dll_directory(str(p.parent)) if hasattr(os, 'add_dll_directory') else None
        break

session_opts=ort.SessionOptions()
session_opts.intra_op_num_threads=2
session=ort.InferenceSession(str(MODEL),sess_options=session_opts,providers=['CPUExecutionProvider'])
tts=Kokoro.from_session(session,str(VOICES))
# Prioritaet: angeklickte Aufrufe zuerst, Hintergrundjobs nur wenn frei.
# Die bereits laufende Berechnung kann nicht unterbrochen werden.
priority_condition = threading.Condition()
synthesis_busy = False
foreground_waiters = 0
# Maximal 48 MB im RAM fuer wiederkehrende Turnieransagen.
CACHE_LIMIT_BYTES = 48 * 1024 * 1024
cache = OrderedDict()
cache_bytes = 0
cache_lock = threading.Lock()

def synthesize_cached(sentence, speed, prefetch=False):
    global cache_bytes, synthesis_busy, foreground_waiters
    key = hashlib.sha256(f"martin|{speed:.3f}|{sentence}".encode('utf-8')).hexdigest()
    with cache_lock:
        stored = cache.get(key)
        if stored is not None:
            cache.move_to_end(key)
            print('CACHE HIT:', sentence, flush=True)
            return stored

    # A foreground request wins over any waiting preload after the currently
    # running synthesis finishes. Avoid holding the cache lock while waiting.
    with priority_condition:
        if not prefetch:
            foreground_waiters += 1
        try:
            while synthesis_busy or (prefetch and foreground_waiters > 0):
                priority_condition.wait()
            synthesis_busy = True
        finally:
            if not prefetch:
                foreground_waiters -= 1

    try:
        with cache_lock:
            stored = cache.get(key)
            if stored is not None:
                cache.move_to_end(key)
                print('CACHE HIT:', sentence, flush=True)
                return stored
        samples, sr = tts.create(sentence, voice='martin', speed=speed, lang='de')
        samples = np.clip(np.asarray(samples, dtype=np.float32), -1, 1)
        pcm = (samples * 32767).astype(np.int16)
        bio = io.BytesIO()
        with wave.open(bio, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(pcm.tobytes())
        out = bio.getvalue()
        with cache_lock:
            if len(out) <= CACHE_LIMIT_BYTES:
                while cache and cache_bytes + len(out) > CACHE_LIMIT_BYTES:
                    _, old = cache.popitem(last=False)
                    cache_bytes -= len(old)
                cache[key] = out
                cache_bytes += len(out)
        print('NEU ERZEUGT:', sentence, flush=True)
        return out
    finally:
        with priority_condition:
            synthesis_busy = False
            priority_condition.notify_all()



def compose_announcement(p1, p2, short1, short2, machine, intro, speed, prefetch):
    """Reuse individual name and machine fragments across different machines/calls.

    The original spoken words and order stay identical. A small pause between
    fragments keeps the pre-rendered pieces sounding like a live announcer.
    """
    fragments = (
        f"{intro} {p1} gegen {p2}",
        f"auf Automat {machine}.",
        f"{short1} gegen {short2}.",
        f"Auf Automat {machine}!",
    )
    pcm_parts = []
    sample_rate = None
    for phrase in fragments:
        recording = synthesize_cached(phrase, speed, prefetch=prefetch)
        with wave.open(io.BytesIO(recording), 'rb') as reader:
            if reader.getnchannels() != 1 or reader.getsampwidth() != 2:
                raise ValueError('Unerwartetes Audioformat')
            rate = reader.getframerate()
            if sample_rate is None:
                sample_rate = rate
            elif sample_rate != rate:
                raise ValueError('Unterschiedliche Abtastraten')
            pcm_parts.append(reader.readframes(reader.getnframes()))
    pause = b'\x00\x00' * int((sample_rate or 24000) * 0.075)
    combined = io.BytesIO()
    with wave.open(combined, 'wb') as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(sample_rate or 24000)
        writer.writeframes(pause.join(pcm_parts))
    return combined.getvalue()

HTML='''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>EMD | Martin Turniersprecher</title><style>
:root{color-scheme:dark}body{margin:0;background:#080b12;color:#f5f6f9;font:16px system-ui,Segoe UI,Arial}main{max-width:740px;margin:35px auto;padding:25px;border-radius:24px;background:#131a25;border:1px solid #343b47}h1{font-size:32px;margin:4px 0}small{color:#c1c6d1}label{display:block;margin-top:18px;margin-bottom:7px;font-weight:700}input,select{box-sizing:border-box;width:100%;padding:14px;border:1px solid #4c5565;border-radius:12px;background:#070b12;color:white;font-size:17px}button{margin-top:20px;border:0;background:#fa7b20;border-radius:14px;padding:15px 22px;font-size:18px;font-weight:800;cursor:pointer;color:#1a1010}button:disabled{opacity:.5}audio{width:100%;margin-top:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}@media(max-width:570px){.grid{grid-template-columns:1fr}}#status{color:#ffcd9f;min-height:28px;margin-top:18px}p{color:#b6bfcc;line-height:1.5}
</style></head><body><main><small>EMD · LOKALER KI-SPRACHTEST</small><h1>🎤 Martin Turniersprecher</h1><p>Keine Verbindung zu Supabase oder Netlify. Deine bisherige EMD-Ansage bleibt unangetastet.</p><div class="grid"><div><label for="p1">Spieler 1</label><input id="p1" value="Christoph Steiner"></div><div><label for="p2">Spieler 2</label><input id="p2" value="Orhan Akbiyik"></div></div><div class="grid"><div><label for="machine">Automat</label><input id="machine" type="number" min="1" max="99" value="4"></div><div><label for="call">Aufruf</label><select id="call"><option value="1">Erster Aufruf</option><option value="2">Zweiter Aufruf</option><option value="3">Letzter Aufruf</option></select></div></div><label for="speed">Sprechtempo</label><select id="speed"><option value="0.9">Langsam</option><option value="1.0" selected>Normal</option><option value="1.1">Etwas schneller</option><option value="1.2">Schnell</option></select><button id="say">▶ Ansage mit Martin erzeugen</button><div id="status" role="status"></div><audio id="audio" controls></audio><p>Zum Korrigieren der Aussprache kannst du Spielernamen testweise so schreiben, wie Martin sie aussprechen soll. Die richtigen Vereinsnamen ändern wir dabei nicht.</p></main><script>
const el=id=>document.getElementById(id);let url=null;
el('say').onclick=async()=>{el('say').disabled=true;el('status').textContent='Martin spricht ... beim ersten Aufruf kann es etwas dauern.';try{const r=await fetch('/speak',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({player1:el('p1').value,player2:el('p2').value,machine:el('machine').value,call:el('call').value,speed:Number(el('speed').value)})});if(!r.ok)throw Error((await r.json()).error||r.statusText);const blob=await r.blob();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);el('audio').src=url;await el('audio').play();el('status').textContent='Fertig. Über den Player kannst du die Ansage erneut anhören.';}catch(e){el('status').textContent='Fehler: '+e.message;}finally{el('say').disabled=false;}}
</script></body></html>'''

# Die EMD-Webseite darf vom gleichen PC auf Martin zugreifen.
# Weitere Vereinsdomains koennen per EMD_MARTIN_ORIGINS (durch Komma getrennt) erlaubt werden.
ALLOWED_ORIGINS={"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"}
ALLOWED_ORIGINS.update(x.strip().rstrip("/") for x in os.environ.get("EMD_MARTIN_ORIGINS","").split(",") if x.strip())

class Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        origin=self.headers.get('Origin','')
        if origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Vary','Origin')
            self.send_header('Access-Control-Allow-Methods','POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers','Content-Type')
            self.send_header('Access-Control-Allow-Private-Network','true')
        super().end_headers()
    def do_OPTIONS(self):
        if self.path!='/speak' or self.headers.get('Origin','') not in ALLOWED_ORIGINS:
            self.send_error(403);return
        self.send_response(204);self.end_headers()

    def do_GET(self):
        if self.path=='/':
            body=HTML.encode('utf-8');self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        else:self.send_error(404)
    def do_POST(self):
        if self.path!='/speak':self.send_error(404);return
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n>8192:raise ValueError('Text zu lang')
            data=json.loads(self.rfile.read(n))
            # Kratzer: group announcements are different from 1-v-1 DKO matches.
            # Do not touch the existing DKO text or synthesis path.
            if data.get('kind') == 'kratzer':
                names = data.get('players', [])
                if not isinstance(names, list) or not 1 <= len(names) <= 6:
                    raise ValueError('Kratzer: 1 bis 6 Spieler notwendig')
                names = [str(name).strip()[:90] for name in names]
                if any(not name for name in names):
                    raise ValueError('Kratzer: Ungueltiger Spielername')
                machine = int(data.get('machine', 4))
                call = int(data.get('call', 1))
                speed = float(data.get('speed', 1.0))
                if not 1 <= machine <= 99 or call not in (1, 2, 3) or not 0.75 <= speed <= 1.3:
                    raise ValueError('Kratzer: Ungueltige Einstellung')
                members = names[0] if len(names) == 1 else ', '.join(names[:-1]) + ' und ' + names[-1]
                intro = {1:'Nächste Spielergruppe!', 2:'Zweiter Aufruf!', 3:'Letzter Aufruf!'}[call]
                # Reuse cache by identical complete group/call.
                announcement = f'{intro} Auf Automat {machine}: {members}. Bitte zu Automat {machine} kommen!'
                print('KRATZER-ANSAGE:', announcement, flush=True)
                out = synthesize_cached(announcement, speed, prefetch=bool(data.get('prefetch', False)))
                if data.get('prefetch', False):
                    self.send_response(204)
                    self.send_header('Content-Length','0')
                    self.end_headers()
                    return
                self.send_response(200)
                self.send_header('Content-Type','audio/wav')
                self.send_header('Content-Length',str(len(out)))
                self.end_headers()
                self.wfile.write(out)
                return
            p1=str(data.get('player1','')).strip()[:90]
            p2=str(data.get('player2','')).strip()[:90]
            if not p1 or not p2:raise ValueError('Bitte beide Spielernamen eingeben.')
            machine=int(data.get('machine',4))
            if not 1<=machine<=99:raise ValueError('Ungültige Automatennummer')
            call=int(data.get('call',1));speed=float(data.get('speed',1.0))
            if call not in (1,2,3) or not 0.75<=speed<=1.3:raise ValueError('Ungültige Einstellung')
            intro={1:'Nächste Begegnung!',2:'Zweiter Aufruf!',3:'Letzter Aufruf!'}[call]
            # Fuer die kurze Wiederholung nur den Nachnamen verwenden.
            # Bei einteiligen Namen den vollstaendigen Namen beibehalten.
            short1=p1.split()[-1]
            short2=p2.split()[-1]
            # Sind die Kurzformen identisch, zur Unterscheidung volle Namen sagen.
            if short1.casefold()==short2.casefold():
                short1,short2=p1,p2
            sentence=(f'{intro} {p1} gegen {p2} auf Automat {machine}. '
                      f'{short1} gegen {short2}. Auf Automat {machine}!')
            print('ANSAGE:',sentence,flush=True)
            out=compose_announcement(p1, p2, short1, short2, machine, intro, speed, prefetch=bool(data.get('prefetch', False)))
            self.send_response(200);self.send_header('Content-Type','audio/wav');self.send_header('Content-Length',str(len(out)));self.end_headers();self.wfile.write(out)
        except Exception as exc:
            print('FEHLER:',repr(exc),flush=True)
            out=json.dumps({'error':str(exc)},ensure_ascii=False).encode('utf-8')
            self.send_response(400);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(out)));self.end_headers();self.wfile.write(out)

if __name__=='__main__':
    print('EMD Martin gestartet unter http://127.0.0.1:8765',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
