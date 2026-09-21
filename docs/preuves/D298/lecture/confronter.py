"""CONFRONTATION de l'outil de D293 et de `neutralisation/audit-secrets.py` sur le MÊME arbre (D298).
Usage, depuis la racine : python3 docs/preuves/D298/lecture/confronter.py <sortie D293> <sortie nouvelle>
Les deux sorties brutes restent HORS dépôt : celle de D293 est un écho non épinglé, la versée le
réintroduirait. Seuls des COMPTES sont imprimés ici.
Identité exigée, les deux instruments ayant les MÊMES motifs (D290) :
    alertes(D293) = alertes auditées + écho exclu − écho des sorties que D293 s'exclut lui-même
    fichiers(D293) = fichiers parcourus − sorties que D293 s'exclut lui-même"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
a = open(sys.argv[1], encoding="utf-8").read()
b = open(sys.argv[2], encoding="utf-8").read()
m = re.search(r"parcourus : (\d+) fichiers, (\d+) octets · alertes : (\d+)", a)
f_a, o_a, al_a = map(int, m.groups())
ex_a = int(re.search(r"EXCLUS \(sorties de cet audit\) : (\d+)", a).group(1))
m = re.search(r"parcourus : (\d+) fichiers, (\d+) octets · audités : (\d+) fichiers, (\d+) octets · exclus : (\d+)"
              r" fichiers \((\d+) alertes d'écho non comptées\) · alertes : (\d+)", b)
f_b, o_b, au_b, oa_b, ex_b, w_b, al_b = map(int, m.groups())
propres_d293 = re.findall(r"^  (docs/preuves/D293/outils/audit-secrets-[^ ]+\.txt) \(\d+ o\) : .*? alertes qu'il aurait rendues : (\d+)",
                          b, flags=re.M)
w_d293 = sum(int(n) for _, n in propres_d293)
exclus_lus = re.findall(r"^  (docs/preuves/\S+) \((\d+) o\) : .*? alertes qu'il aurait rendues : (\d+)", b, flags=re.M)
print(f"D293      : {f_a} fichiers audités, {o_a} octets, {ex_a} exclus (ses propres sorties) · alertes {al_a}")
print(f"nouveau   : {f_b} parcourus ({o_b} octets) · {au_b} audités · {ex_b} exclus · écho non compté {w_b} · alertes {al_b}")
print(f"exclusions relues ligne à ligne : {len(exclus_lus)} (attendu {ex_b}) · somme de leur écho {sum(int(n) for *_, n in exclus_lus)} (attendu {w_b})")
print(f"sorties que D293 s'exclut, relues : {len(propres_d293)} (attendu {ex_a}) · leur écho {w_d293}")
print(f"identité des fichiers : {f_b} − {ex_a} = {f_b - ex_a} (D293 : {f_a}) → {'✓' if f_b - ex_a == f_a else '✗'}")
print(f"identité des alertes  : {al_b} + {w_b} − {w_d293} = {al_b + w_b - w_d293} (D293 : {al_a}) → "
      f"{'✓' if al_b + w_b - w_d293 == al_a else '✗'}")
print("écho exclu, par fichier :")
for chemin, o, n in exclus_lus:
    print(f"  {int(n):4d}  {chemin}")
