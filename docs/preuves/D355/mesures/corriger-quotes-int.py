# Corrige les sept assertions de `apps/api/test/int/quotes.int-spec.ts` que le journal des fiches (rang 57, D355, R-2) rend fausses : elles comptent TOUTES les lignes d'`audit_logs` alors que le setup de ces tests crée une fiche
# par la route K-2, qui écrit désormais sa propre ligne `client_record.create`. L'intention des assertions — « la promotion n'a écrit AUCUNE autre ligne » — est CONSERVÉE : on écarte les lignes de FICHE (`client_record.%`), toute AUTRE ligne reste comptée.
# Chaque remplacement compte ses occurrences (octets) AVANT d'écrire et le marqueur neuf APRÈS ; la fin de ligne du fichier (CRLF) est conservée. Archivé comme PIÈCE (D291), jamais promu en instrument.
import hashlib
import sys

F = "apps/api/test/int/quotes.int-spec.ts"
brut = open(F, "rb").read()
avant = hashlib.sha256(brut).hexdigest()
assert brut.count(b"\r\n") > 1000 and brut.count(b"\n") == brut.count(b"\r\n"), "le fichier doit être en CRLF pur"
t = brut.decode("utf-8")


def rempl(texte: str, ancien: str, neuf: str, attendu: int) -> str:
    n = texte.count(ancien)
    assert n == attendu, (ancien[:90], n, attendu)
    out = texte.replace(ancien, neuf)
    assert out.count(neuf) >= attendu
    return out


HELPER_ANCRE = 'const compte = async (table: "quotes" | "bookings" | "audit_logs"): Promise<number> => Number((await sqlBrut<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`))[0]!.n);\r\n'
HELPER_NEUF = (
    HELPER_ANCRE
    + "// ⛔ D355 (rang 57, R-2) — la création d'une fiche (K-2, `ficheDe`) écrit désormais sa propre ligne `client_record.create` : le setup de ces tests en écrit une. Ce que les assertions ci-dessous gardent est « la promotion n'a écrit AUCUNE\r\n"
    + "// autre ligne » : on écarte les lignes de FICHE (`client_record.%`), toute AUTRE ligne d'audit reste comptée (une promotion refusée qui écrirait n'importe quelle autre ligne rougit toujours).\r\n"
    + "const compteHorsFiches = async (): Promise<number> => Number((await sqlBrut<{ n: string }>(`SELECT count(*)::text AS n FROM audit_logs WHERE action NOT LIKE 'client_record.%'`))[0]!.n);\r\n"
)
t = rempl(t, HELPER_ANCRE, HELPER_NEUF, 1)
t = rempl(t, 'expect(await compte("audit_logs")).toBe(0);', "expect(await compteHorsFiches()).toBe(0);", 4)
t = rempl(t, 'expect(await compte("audit_logs")).toBe(1);', "expect(await compteHorsFiches()).toBe(1);", 2)
t = rempl(t, "const lignes = await ctx.prisma.auditLog.findMany();", 'const lignes = await ctx.prisma.auditLog.findMany({ where: { NOT: { action: { startsWith: "client_record." } } } });', 1)
assert t.count('compte("audit_logs")') == 0, "il reste une lecture globale d'audit_logs"
sortie = t.encode("utf-8")
assert sortie.count(b"\r\n") == sortie.count(b"\n"), "des LF nus ont été introduits"
open(F, "wb").write(sortie)
print(f"{F}\n   AVANT {avant}\n   APRÈS {hashlib.sha256(open(F, 'rb').read()).hexdigest()}\n   remplacements : 1 aide + 4 + 2 + 1 ; lectures globales restantes : 0")
