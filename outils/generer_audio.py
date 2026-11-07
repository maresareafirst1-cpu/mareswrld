# -*- coding: utf-8 -*-
"""
Bénin Immersion — génération des textes traduits et des audioguides
====================================================================
À lancer UNE fois sur Google Colab (gratuit) ou sur un ordinateur avec Python.

Ce que fait ce script :
  1. Traduit le texte de chaque site (nom, résumé, histoire) du français vers
     les langues choisies (Google Traduction, qui gère le fon depuis 2024).
     -> fichier « textes.js » : les fiches s'affichent dans ces langues.
  2. Fabrique un fichier audio MP3 par site et par langue avec les voix libres
     de Meta (MMS-TTS) : fon, yoruba, haoussa… (les téléphones n'ont pas ces voix).
     -> dossier « audio/ » + « audio/index.js » : l'appli les joue automatiquement.
  3. Si un texte a été corrigé par un locuteur natif, il est pris en priorité :
     placez-le dans  textes_manuels/<langue>/<id_du_site>.txt
     (ligne 1 = nom du site, ligne 2 = résumé, le reste = histoire).

Résultat : un fichier « resultat_audio.zip » à décompresser dans le dossier de
l'application (il ajoute textes.js et audio/), puis redéposer sur Netlify.

IMPORTANT : une traduction automatique contient des erreurs. Faites relire les
textes (surtout fon, yoruba, haoussa) par des locuteurs natifs avant publication.
"""
import json, os, re, sys, time, shutil, subprocess, urllib.parse, urllib.request

# ------------------------------------------------------------------ réglages
# Langues à TRADUIRE (codes Google Traduction). Le texte traduit s'affiche dans la fiche
# et sert à la voix du téléphone quand elle existe.
TRADUIRE = ['fon', 'yo', 'ha', 'sw', 'es', 'pt', 'de', 'it', 'nl', 'ru', 'ar', 'zh-CN', 'ja']
# Langues pour lesquelles on FABRIQUE un MP3 (voix Meta MMS). Code app -> code MMS (ISO 639-3).
# Les téléphones n'ont pas de voix fon / yoruba / haoussa : on les génère.
AUDIO = {'fon': 'fon', 'yo': 'yor', 'ha': 'hau'}
# Langues sans traduction automatique : seulement si des textes manuels existent.
AUDIO_MANUEL = {'gun': 'guw', 'gej': 'gej', 'ajg': 'ajg', 'bba': 'bba', 'ddn': 'ddn'}
# code Google -> code utilisé dans l'appli
APP_CODE = {'zh-CN': 'zh'}

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, 'resultat')
SITES = json.load(open(os.path.join(ICI, 'sites.json'), encoding='utf-8'))


# ------------------------------------------------------------------ traduction
def traduire(texte, cible, essais=4):
    """Traduit du français vers « cible » (point d'accès public de Google Traduction)."""
    morceaux, actuel = [], ''
    for phrase in re.split(r'(?<=[.!?])\s+', texte):
        if len(actuel) + len(phrase) > 1500:
            morceaux.append(actuel); actuel = ''
        actuel += (' ' if actuel else '') + phrase
    if actuel: morceaux.append(actuel)
    resultat = []
    for m in morceaux:
        url = ('https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl='
               + urllib.parse.quote(cible) + '&dt=t&q=' + urllib.parse.quote(m))
        for i in range(essais):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as r:
                    data = json.loads(r.read().decode('utf-8'))
                resultat.append(''.join(seg[0] for seg in data[0] if seg and seg[0]))
                break
            except Exception as e:
                if i == essais - 1: raise
                time.sleep(3 * (i + 1))
        time.sleep(0.4)
    return ' '.join(resultat)


def texte_manuel(code, sid):
    p = os.path.join(ICI, 'textes_manuels', code, sid + '.txt')
    if not os.path.exists(p): return None
    lignes = [l.strip() for l in open(p, encoding='utf-8').read().splitlines()]
    lignes = [l for l in lignes if l]
    if len(lignes) < 2: return None
    return {'n': lignes[0], 'd': lignes[1], 'h': ' '.join(lignes[2:]) or lignes[1], 'manuel': True}


# ------------------------------------------------------------------ voix (Meta MMS-TTS)
_modeles = {}
def voix(code_mms):
    if code_mms in _modeles: return _modeles[code_mms]
    from transformers import VitsModel, AutoTokenizer
    nom = 'facebook/mms-tts-' + code_mms
    try:
        _modeles[code_mms] = (VitsModel.from_pretrained(nom), AutoTokenizer.from_pretrained(nom))
    except Exception as e:
        print(f'  ! voix {nom} introuvable ({e.__class__.__name__}) : langue ignorée')
        _modeles[code_mms] = None
    return _modeles[code_mms]


def synthese(texte, code_mms, chemin_mp3):
    """Fabrique un MP3 phrase par phrase (le modèle préfère les phrases courtes)."""
    import torch, numpy as np, scipy.io.wavfile as wav
    m = voix(code_mms)
    if not m: return False
    modele, tok = m
    morceaux = [p for p in re.split(r'(?<=[.!?;:])\s+', texte) if p.strip()]
    sons = []
    for p in morceaux:
        entree = tok(p, return_tensors='pt')
        if entree['input_ids'].shape[-1] < 2: continue
        with torch.no_grad():
            onde = modele(**entree).waveform[0].cpu().numpy()
        sons.append(onde); sons.append(np.zeros(int(modele.config.sampling_rate * 0.35), dtype=onde.dtype))
    if not sons: return False
    tmp = chemin_mp3[:-4] + '.wav'
    wav.write(tmp, modele.config.sampling_rate, (np.concatenate(sons) * 32767).clip(-32768, 32767).astype('int16'))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-b:a', '64k', chemin_mp3], check=True)
    os.remove(tmp)
    return True


# ------------------------------------------------------------------ programme principal
def main():
    os.makedirs(os.path.join(SORTIE, 'audio'), exist_ok=True)
    textes, audios = {}, {}
    cache = os.path.join(ICI, 'traductions_cache.json')  # permet de reprendre si la session est coupée
    deja = json.load(open(cache, encoding='utf-8')) if os.path.exists(cache) else {}

    # 1. textes
    langues_texte = TRADUIRE + [c for c in AUDIO_MANUEL]
    for s in SITES:
        sid = s['id']; textes[sid] = {}
        for g in langues_texte:
            app = APP_CODE.get(g, g)
            t = texte_manuel(app, sid)
            if not t and g in TRADUIRE:
                cle = sid + '|' + g
                if cle not in deja:
                    try:
                        deja[cle] = {'n': traduire(s['fr']['n'], g), 'd': traduire(s['fr']['d'], g), 'h': traduire(s['fr']['h'], g)}
                        json.dump(deja, open(cache, 'w', encoding='utf-8'), ensure_ascii=False)
                    except Exception as e:
                        print(f'  ! traduction {sid} -> {g} impossible : {e}'); continue
                t = deja[cle]
            if t: textes[sid][app] = t
        print('texte :', sid, '->', ', '.join(sorted(textes[sid])))

    # 2. audio
    for s in SITES:
        sid = s['id']; audios[sid] = {}
        for app, mms in list(AUDIO.items()) + list(AUDIO_MANUEL.items()):
            t = textes[sid].get(app)
            if not t: continue
            fichier = f'audio/{sid}-{app}.mp3'
            chemin = os.path.join(SORTIE, fichier)
            if os.path.exists(chemin) or synthese(f"{t['n']}. {t['d']} {t['h']}", mms, chemin):
                audios[sid][app] = fichier
                print('audio :', fichier)

    # 3. fichiers pour l'application
    with open(os.path.join(SORTIE, 'textes.js'), 'w', encoding='utf-8') as f:
        f.write('/* Textes des sites traduits automatiquement (à faire relire). Généré par outils/generer_audio.py */\n')
        f.write('window.BI_TEXTS = ' + json.dumps(textes, ensure_ascii=False) + ';\n')
    with open(os.path.join(SORTIE, 'audio', 'index.js'), 'w', encoding='utf-8') as f:
        f.write('/* Audioguides générés (voix Meta MMS-TTS). Généré par outils/generer_audio.py */\n')
        f.write('window.BI_AUDIO = ' + json.dumps({k: v for k, v in audios.items() if v}, ensure_ascii=False) + ';\n')
    shutil.make_archive(os.path.join(ICI, 'resultat_audio'), 'zip', SORTIE)
    n = sum(len(v) for v in audios.values())
    print(f'\nTerminé : {n} fichiers audio, textes dans {len(TRADUIRE)} langues -> resultat_audio.zip')


if __name__ == '__main__':
    main()
