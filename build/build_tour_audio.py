"""Record the guided-tour narration with the Kokoro-82M neural voice (runs offline).

usage: python3 build_tour_audio.py <scripts.json> <model.onnx> <voices.npz> <site_root> [voice]
  scripts.json  {"pwe-iii": [step texts], "pwe-iv": [...]} pulled from TOUR.spoken(k) in each page
  model.onnx    Kokoro-82M v1.0 q8 (npm kokoro-q8-shards, joined; sha256 fbae9257…a1478)
  voices.npz    voice styles from npm kokoro-js voices/*.bin (510x1x256 float32 each)
Writes <site_root>/<project>/tour/NN.mp3 (mono, 48 kbps).
"""
import json, re, subprocess, sys, os
import soundfile as sf, numpy as np
from kokoro_onnx import Kokoro

scripts, model, voices, root = sys.argv[1:5]
voice = sys.argv[5] if len(sys.argv) > 5 else 'af_heart'
k = Kokoro(model, voices)

def tune(t):
    # the on-screen wording mentions the Play button; the narration doesn't need to
    t = re.sub(r'Press Play with voice to have it narrated and move along on its own, or use Next or Back and the arrow keys, and Escape to leave at any time\.',
               'Use Next or Back, or the arrow keys, to move around, and press Escape to leave at any time.', t)
    t = t.replace('P W E 3', 'P.W.E. Three').replace('P W E 4', 'P.W.E. Four').replace('S T R', 'S.T.R.').replace('R R C', 'R.R.C.')
    t = t.replace('(green)', ', in green,').replace('(amber)', ', in amber,').replace('(click again to reverse)', ', and click again to reverse it')
    t = t.replace('(after filters and search)', ', after filters and search,').replace('(on the map or in this list)', ', on the map or in this list,')
    t = re.sub(r' ,', ',', t)
    return t

for proj, steps in json.load(open(scripts)).items():
    out = os.path.join(root, proj, 'tour'); os.makedirs(out, exist_ok=True)
    for n, text in enumerate(steps, 1):
        a, sr = k.create(tune(text), voice=voice, speed=1.0, lang='en-us')
        a = np.concatenate([np.zeros(int(sr * .15), dtype=a.dtype), a])
        wav = os.path.join(out, f'{n:02d}.wav'); sf.write(wav, a, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-b:a', '48k', os.path.join(out, f'{n:02d}.mp3')], check=True)
        os.remove(wav); print(proj, n, f'{len(a)/sr:.1f}s', flush=True)
