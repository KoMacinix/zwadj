/**
 * D325 — SONDE DU POINT 12 (créneau à cheval sur minuit) : MESURE, pas lecture. Pièce jetable, versée.
 *
 * QUESTION : « la réservation s'affiche seulement le jour de début » — qu'affiche aujourd'hui le calendrier d'une salle dont le
 * créneau va de 20 h à 2 h ? On ne devine pas : on rejoue LE moteur de disponibilité (`computeDaySlotStatuses`, la fonction que le
 * calendrier pro et le calendrier public appellent) sur les données RÉELLES de la base de développement de Ko.
 *
 * USAGE, depuis `apps/api` (tsx est déjà une dépendance du paquet) :
 *   npx tsx ../../docs/preuves/D325/ouverture/sonde-minuit.ts > ../../docs/preuves/D325/ouverture/sonde-minuit-sortie.txt
 *
 * CE QUE LA SONDE LIT : le créneau de la salle de dev (début, fin en minutes) et les statuts + plages (`starts_at`, `ends_at`) des
 * réservations qui bloquent (PENDING, ACCEPTED, CONFIRMED) — JAMAIS un nom ni un numéro : seuls des dates et des statuts s'impriment.
 * Fuseau d'Alger = UTC+1 sans heure d'été (D48) : le minuit local du jour D est D−1 à 23:00 UTC.
 */
import { execFileSync } from "node:child_process";
import { computeDaySlotStatuses } from "../../../../apps/api/src/venues/availability-engine";

const psql = (sql: string): string[][] =>
  execFileSync("docker", ["exec", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-F", "|", "-c", sql], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("|"));

const dayStart = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) - 3_600_000;
const civil = (ms: number): string => new Date(ms + 3_600_000).toISOString().slice(0, 10);

const [[mode, startMinutes, endMinutes]] = psql(
  "select v.booking_mode, s.start_minutes, s.end_minutes from slot_templates s join venues v on v.id = s.venue_id where s.is_active order by 1 limit 1"
) as [[string, string, string]];
const slots = [{ id: "s", startMinutes: Number(startMinutes), endMinutes: Number(endMinutes) }];
const rows = psql(
  "select status, to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'), to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') " +
    "from bookings where status in ('PENDING','ACCEPTED','CONFIRMED') order by starts_at"
);
const bookings = rows.map(([status, a, b]) => ({ startMs: Date.parse(a!), endMs: Date.parse(b!), slotTemplateId: "s", hard: status !== "PENDING" }));

console.log(`salle de dev : mode ${mode} · créneau ${startMinutes} → ${endMinutes} minutes (${Number(endMinutes) > 1440 ? "FRANCHIT minuit" : "ne franchit pas minuit"})`);
console.log(`réservations qui bloquent (lues en base) : ${rows.length}`);
for (const [status, a, b] of rows) {
  console.log(`  ${status.padEnd(8)} ${civil(Date.parse(a!))} (plage UTC ${a} → ${b}, soit ${((Date.parse(b!) - Date.parse(a!)) / 3_600_000).toFixed(0)} h)`);
}

const jours: string[] = [];
for (let d = Date.parse("2026-10-10T12:00:00Z"); d <= Date.parse("2026-10-25T12:00:00Z"); d += 86_400_000) jours.push(civil(d));
console.log("\nstatut RENDU PAR LE MOTEUR, jour par jour (celui que le calendrier colore) :");
const rendu: Record<string, string> = {};
for (const jour of jours) {
  const [r] = computeDaySlotStatuses({ dayStartMs: dayStart(jour), slots, bookings, blocks: [], singleSlot: mode === "SINGLE_SLOT" });
  rendu[jour] = r!.status;
  const propre = rows.some(([, a]) => civil(Date.parse(a!)) === jour);
  console.log(`  ${jour}  ${r!.status.padEnd(10)} ${propre ? "← réservation qui COMMENCE ce jour" : ""}`);
}
const colores = Object.values(rendu).filter((s) => s !== "AVAILABLE").length;
const proprietaires = new Set(rows.map(([, a]) => civil(Date.parse(a!)))).size;
console.log(`\njours colorés (non libres) : ${colores} · jours où une réservation COMMENCE : ${proprietaires}`);

// Preuve que le front ne peut pas inverser la dilatation : deux jeux de réservations DIFFÉRENTS rendent la MÊME suite de statuts.
const mkBooking = (jour: string) => ({ startMs: dayStart(jour), endMs: dayStart(jour) + 86_400_000, slotTemplateId: "s", hard: true });
const suite = (jours_: string[], reservations: string[]) =>
  jours_
    .map((j) => computeDaySlotStatuses({ dayStartMs: dayStart(j), slots, bookings: reservations.map(mkBooking), blocks: [], singleSlot: true })[0]!.status)
    .join(",");
const fenetre = ["2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20"];
const sansLe17 = suite(fenetre, ["2026-10-18", "2026-10-19"]);
const avecLe17 = suite(fenetre, ["2026-10-17", "2026-10-18", "2026-10-19"]);
const seulLe19 = suite(fenetre, ["2026-10-19"]);
console.log("\nNON-IDENTIFIABILITÉ (SINGLE_SLOT, créneau 20 h → 2 h) — la fenêtre (17, 18, 19, 20), trois jeux de réservations de journée entière :");
console.log(`  {18, 19}     → ${sansLe17}`);
console.log(`  {17, 18, 19} → ${avecLe17}`);
console.log(`  {19}         → ${seulLe19}`);
console.log(`  {18, 19} et {17, 18, 19} rendent la MÊME suite : ${sansLe17 === avecLe17} — une réservation du 17 est INVISIBLE dans la réponse, couverte par`);
console.log("  la dilatation de celle du 18 ; et dans {19}, le 18 est « réservé » alors qu'il ne porte aucune réservation.");
console.log("  ⇒ la réponse du moteur (jour × créneau × statut) ne permet PAS de retrouver quel jour porte la réservation : un correctif d'AFFICHAGE seul");
console.log("    — retirer le statut du jour qui ne COMMENCE pas la réservation — cacherait une réservation réelle (ici le 17) ou en laisserait une fausse.");
