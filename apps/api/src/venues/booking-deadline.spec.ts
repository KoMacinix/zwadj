import { describe, expect, it } from "vitest";

import { deadlineClampedToEventStart } from "./booking-deadline";

/**
 * D282 — LA SPEC QUI N'EXISTAIT NI D'UN CÔTÉ NI DE L'AUTRE.
 *
 * L'idiome « une échéance, écrêtée par le début de l'événement » était écrit
 * deux fois en ligne dans `BookingsService`, et le cadrage de S11-b l'a relevé :
 * « aucune spec unitaire ni d'un côté ni de l'autre » (MD6).
 *
 * ⚠ AUCUNE VALEUR ATTENDUE N'EST ÉCRITE EN DUR ICI. Chaque attendu est DÉRIVÉ
 * des entrées de son propre cas — `depart + fenetre`, ou `debut.getTime()`.
 * Un littéral aurait la forme d'une mesure sans en être une, et se contenterait
 * de répéter ce que le module vient de calculer.
 *
 * ⚠ ET AUCUNE DATE « DANS LE FUTUR ». Les instants sont construits à partir d'un
 * repère fixe : une fixture choisie « très loin » finit toujours par entrer dans
 * un domaine refusé, et la suite rougit sans qu'une ligne ait bougé (D213, D227).
 * Ce module ne lit de toute façon pas l'horloge — c'est la moitié de son objet.
 */

/** Repère fixe, sans signification métier : seul l'ÉCART entre les instants
 *  compte pour ce module. */
const REPERE_MS = Date.UTC(2026, 0, 1, 12, 0, 0);
const HEURE_MS = 3_600_000;

describe("booking-deadline — une échéance écrêtée par le début de l'événement", () => {
  it("rend départ + fenêtre quand l'événement est LOIN devant", () => {
    const fenetreMs = 48 * HEURE_MS;
    const debut = new Date(REPERE_MS + 30 * 24 * HEURE_MS);

    const echeance = deadlineClampedToEventStart({
      fromMs: REPERE_MS,
      windowMs: fenetreMs,
      eventStartsAt: debut
    });

    // Attendu DÉRIVÉ des entrées, pas recopié.
    expect(echeance.getTime()).toBe(REPERE_MS + fenetreMs);
    expect(echeance.getTime(), "l'écrêtage a mordu alors que l'événement est loin").toBeLessThan(
      debut.getTime()
    );
  });

  it("⛔ CAS LIMITE 1 — événement AVANT la fin de la fenêtre : l'échéance EST le début", () => {
    const fenetreMs = 48 * HEURE_MS;
    // L'événement commence dans 12 h, la fenêtre en dure 48 : l'écrêtage mord.
    const debut = new Date(REPERE_MS + 12 * HEURE_MS);

    const echeance = deadlineClampedToEventStart({
      fromMs: REPERE_MS,
      windowMs: fenetreMs,
      eventStartsAt: debut
    });

    expect(echeance.getTime()).toBe(debut.getTime());
    // ⚠ C'est la raison d'être de D82, et elle se mesure : sans écrêtage,
    // l'échéance tomberait APRÈS la fête.
    expect(
      echeance.getTime(),
      "sans écrêtage, l'échéance tomberait après le début de l'événement"
    ).toBeLessThan(REPERE_MS + fenetreMs);
  });

  it("à la frontière EXACTE, les deux candidats coïncident — l'écrêtage n'exclut pas l'égalité", () => {
    const fenetreMs = 48 * HEURE_MS;
    const debut = new Date(REPERE_MS + fenetreMs);

    const echeance = deadlineClampedToEventStart({
      fromMs: REPERE_MS,
      windowMs: fenetreMs,
      eventStartsAt: debut
    });

    // Les deux expressions valent le même instant : le cas ne départage rien,
    // et c'est précisément ce qu'il faut figer — un `<` mis à la place du `min`
    // ne se verrait sur AUCUN autre cas de cette spec.
    expect(echeance.getTime()).toBe(REPERE_MS + fenetreMs);
    expect(echeance.getTime()).toBe(debut.getTime());
  });

  it("⛔ CAS LIMITE 2 — événement DÉJÀ COMMENCÉ : l'échéance tombe DANS LE PASSÉ", () => {
    const fenetreMs = 48 * HEURE_MS;
    // L'événement a commencé il y a 3 h au moment où l'échéance se calcule.
    const debut = new Date(REPERE_MS - 3 * HEURE_MS);

    const echeance = deadlineClampedToEventStart({
      fromMs: REPERE_MS,
      windowMs: fenetreMs,
      eventStartsAt: debut
    });

    expect(echeance.getTime()).toBe(debut.getTime());
    // ⛔ ET ELLE EST ANTÉRIEURE À SON PROPRE POINT DE DÉPART. C'est ce que le
    // système fait AUJOURD'HUI, et cette spec le FIGE sans le juger.
    expect(
      echeance.getTime(),
      "l'échéance devrait être dans le passé : c'est le comportement actuel"
    ).toBeLessThan(REPERE_MS);
    // ⚠ CE QUI N'EST PAS TRANCHÉ ICI, ET QUI EST RAPPORTÉ POUR ARBITRAGE : ce que
    // vaut alors le bouton « payer l'acompte ». Le cadrage de S11-b l'a relevé
    // comme non écrit. Aucune décision de comportement n'est prise dans un lot
    // de SRP — le jour où elle le sera, c'est CE test qui devra changer, et il
    // dira ce qu'il a remplacé.
  });

  it("⛔ LES DEUX FENÊTRES RESTENT DISTINCTES — la garde qui interdit de les fusionner", () => {
    // Deux durées MÉTIER différentes : le délai laissé au pro pour répondre, et
    // la fenêtre laissée au client pour payer. Elles ne sont PAS le même nombre,
    // et ce module ne doit jamais en connaître un seul.
    const fenetreCourte = 48 * HEURE_MS;
    const fenetreLongue = 7 * 24 * HEURE_MS;
    const debut = new Date(REPERE_MS + 365 * 24 * HEURE_MS);

    const courte = deadlineClampedToEventStart({ fromMs: REPERE_MS, windowMs: fenetreCourte, eventStartsAt: debut });
    const longue = deadlineClampedToEventStart({ fromMs: REPERE_MS, windowMs: fenetreLongue, eventStartsAt: debut });

    // ⚠ L'écart mesuré est EXACTEMENT l'écart des fenêtres : un module qui
    // ignorerait son paramètre — parce qu'une constante y aurait été écrite —
    // rendrait deux fois le même instant, et ce test tomberait.
    expect(longue.getTime() - courte.getTime()).toBe(fenetreLongue - fenetreCourte);
    expect(courte.getTime()).not.toBe(longue.getTime());
  });

  it("le rendu est une Date NEUVE — l'objet de l'appelant n'est pas exposé", () => {
    const debut = new Date(REPERE_MS - 3 * HEURE_MS);
    const echeance = deadlineClampedToEventStart({
      fromMs: REPERE_MS,
      windowMs: 48 * HEURE_MS,
      eventStartsAt: debut
    });

    // Même valeur, mais pas le même objet : rendre `eventStartsAt` tel quel
    // exposerait une valeur du chemin de l'argent à une mutation à distance.
    expect(echeance.getTime()).toBe(debut.getTime());
    expect(echeance, "le module rend l'objet de l'appelant lui-même").not.toBe(debut);
  });
});
