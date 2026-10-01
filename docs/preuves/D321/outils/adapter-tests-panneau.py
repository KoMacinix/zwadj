import io
import sys

sys.stdout.reconfigure(encoding="utf-8")
P = "apps/client/src/components/venue/booking-request-panel.test.tsx"
s = io.open(P, encoding="utf-8", newline="").read()
assert s.count("\r\n") == s.count("\n"), "CRLF attendu"
s = s.replace("\r\n", "\n")

R = []  # (ancre, remplacement, occurrences attendues)
R.append(('import { LOGIN_PATH } from "../../lib/routes";\n',
          'import { formatDZD } from "@zwadj/i18n";\nimport { longDate } from "../../lib/booking-calendar";\n'
          'import { monthLabel, weekdayHeaders } from "../../lib/calendar";\nimport { LOGIN_PATH } from "../../lib/routes";\n', 1))
R.append(('const CLIENT_CONNECTE = { id: "u9", email: "client@example.dz", role: "CLIENT", emailVerified: true };\n',
          'const CLIENT_CONNECTE = { id: "u9", email: "client@example.dz", role: "CLIENT", emailVerified: true };\n\n'
          'const MSG = messages.fr.venueDetail.booking;\n'
          '/** Rang 29 (D321) — le nom d\'un JOUR du calendrier, dérivé du MESSAGE et du FORMATEUR (D209 n° 5 : le nom accessible\n'
          ' *  d\'un jour porte son état — il ne se tape pas à la main). */\n'
          'const nomJour = (date: string, libre = true, locale: "fr" | "ar" = "fr"): string =>\n'
          '  (libre ? messages[locale].venueDetail.booking.dayFree : messages[locale].venueDetail.booking.dayFull).replace(\n'
          '    "{date}",\n'
          '    longDate(date, locale)\n'
          '  );\n'
          '/** Choisir une date, comme un visiteur : le JOUR dans le calendrier, puis son créneau. */\n'
          'async function choisir(date: string, creneau = /^Soirée · /): Promise<void> {\n'
          '  fireEvent.click(await screen.findByRole("button", { name: nomJour(date) }));\n'
          '  fireEvent.click(await screen.findByRole("button", { name: creneau }));\n'
          '}\n', 1))
R.append(('  session: unknown = null\n) {', '  session: unknown = null,\n  locale: "fr" | "ar" = "fr"\n) {', 1))
R.append(('    <NextIntlClientProvider locale="fr" messages={messages.fr}>', '    <NextIntlClientProvider locale={locale} messages={messages[locale]}>', 1))
R.append(('''    const taken = await screen.findByRole("button", { name: /2027-08-16/ });
    expect(taken).toBeDisabled();
    expect(taken).toHaveTextContent(/prise/);''', '''    // Rang 29 (D321) : le jour pris est une CASE du calendrier, inactive, et son nom le DIT.
    const taken = await screen.findByRole("button", { name: nomJour("2027-08-16", false) });
    expect(taken).toBeDisabled();
    expect(taken).toHaveTextContent("16");''', 1))
R.append(('expect(await screen.findByRole("button", { name: /2027-08-15/ })).toBeEnabled();',
          'expect(await screen.findByRole("button", { name: nomJour("2027-08-15") })).toBeEnabled();', 2))
R.append(('expect(screen.queryByRole("button", { name: /2027-08-15/ })).toBeNull();',
          'expect(screen.queryByRole("button", { name: nomJour("2027-08-15") })).toBeNull();', 1))
R.append(('(await screen.findByRole("button", { name: /2027-08-15/ })).click();', 'await choisir("2027-08-15");', 5))
R.append(('''    expect(await screen.findByRole("button", { name: /2027-08-15/ })).toBeInTheDocument();''',
          '''    fireEvent.click(await screen.findByRole("button", { name: nomJour("2027-08-15") }));
    // Rang 29 (D321) : le PRIX se lit au créneau du jour regardé — toujours sans session. Attendu dérivé du formateur.
    expect(screen.getByRole("button", { name: (nom) => nom.includes(formatDZD(20_000_000)) })).toBeInTheDocument();''', 1))
R.append(('    fireEvent.click(await screen.findByRole("button", { name: /2027-08-15/ }));\n', '    await choisir("2027-08-15");\n', 1))
R.append(('getByPlaceholderText("Prénom")', 'getByLabelText("Prénom")', 1))
R.append(('getByPlaceholderText("Nom")', 'getByLabelText("Nom")', 1))
R.append(('getByPlaceholderText("Téléphone")', 'getByLabelText("Téléphone")', 2))
R.append(('getByPlaceholderText("E-mail (facultatif)")', 'getByLabelText("E-mail (facultatif)")', 1))
R.append(('    await screen.findByRole("button", { name: /2027-08-15/ });\n',
          '    await screen.findByRole("button", { name: nomJour("2027-08-15") });\n', 1))

# Les tests neufs du calendrier, dans le bloc du rang 29.
R.append(('''    expect(panneau.querySelectorAll("button").length).toBeLessThanOrEqual(31 + 2);
  });
});''', '''    expect(panneau.querySelectorAll("button").length).toBeLessThanOrEqual(31 + 2);
  });

  it("C-c : la navigation parcourt la fenêtre de six mois, et n'en sort pas", async () => {
    const charge = sixMoisLibres();
    stubFetch(charge);
    renderPanel();
    const precedent = await screen.findByRole("button", { name: messages.fr.venueDetail.calendar.previous });
    const suivant = screen.getByRole("button", { name: messages.fr.venueDetail.calendar.next });
    expect(precedent).toBeDisabled();
    const dernier = charge.days[charge.days.length - 1]!.date;
    const cible = { year: Number(dernier.slice(0, 4)), month: Number(dernier.slice(5, 7)) };
    let clics = 0;
    while (!suivant.hasAttribute("disabled") && clics < 12) {
      fireEvent.click(suivant);
      clics += 1;
    }
    // Six mois de 182 jours à partir du 2 août : août → janvier, cinq clics.
    expect(clics).toBe(5);
    expect(screen.getByRole("grid", { name: monthLabel(cible, "fr") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: nomJour(dernier) })).toBeEnabled();
  });

  it("C-f et C-h : une grille nommée par le mois, la semaine commence DIMANCHE (D56)", async () => {
    stubFetch();
    renderPanel();
    const grille = await screen.findByRole("grid", { name: monthLabel({ year: 2027, month: 8 }, "fr") });
    const entetes = grille.querySelectorAll("th");
    expect(entetes).toHaveLength(7);
    expect(entetes[0]!.textContent).toContain(weekdayHeaders("fr", "long")[0]!);
    expect(new Date(Date.UTC(2026, 10, 1)).getUTCDay()).toBe(0); // l'ancre de `weekdayHeaders` est bien un dimanche
  });

  it("C-e : UN arrêt de tabulation dans la grille, et la flèche droite avance d'un jour", async () => {
    stubFetch(sixMoisLibres());
    renderPanel();
    const grille = await screen.findByRole("grid", { name: monthLabel({ year: 2027, month: 8 }, "fr") });
    const arrets = Array.from(grille.querySelectorAll("button")).filter((b) => b.tabIndex === 0);
    expect(arrets.map((b) => b.getAttribute("aria-label"))).toEqual([nomJour("2027-08-02")]);
    arrets[0]!.focus();
    fireEvent.keyDown(arrets[0]!, { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(nomJour("2027-08-03"));
    fireEvent.keyDown(document.activeElement!, { key: "PageDown" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(nomJour("2027-09-01"));
    expect(screen.getByRole("grid", { name: monthLabel({ year: 2027, month: 9 }, "fr") })).toBeInTheDocument();
  });

  it("C-e : EN ARABE, la flèche GAUCHE avance d'un jour — la grille se lit de droite à gauche", async () => {
    stubFetch(sixMoisLibres());
    renderPanel({}, null, "ar");
    const grille = await screen.findByRole("grid", { name: monthLabel({ year: 2027, month: 8 }, "ar") });
    const depart = Array.from(grille.querySelectorAll("button")).find((b) => b.tabIndex === 0)!;
    expect(depart.getAttribute("aria-label")).toBe(nomJour("2027-08-02", true, "ar"));
    depart.focus();
    fireEvent.keyDown(depart, { key: "ArrowLeft" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(nomJour("2027-08-03", true, "ar"));
  });

  it("C-d : le jour REGARDÉ est celui qu'on envoie, au créneau cliqué — et un créneau pris de ce jour reste affiché, inactif", async () => {
    stubFetch({
      ...AVAILABILITY,
      slots: [...AVAILABILITY.slots, { id: "s2", nameFr: "Après-midi", nameAr: "ظهيرة", startMinutes: 780, endMinutes: 1080 }],
      days: [
        ...AVAILABILITY.days,
        {
          date: "2027-08-20",
          isHoliday: false,
          slots: [
            { slotTemplateId: "s1", status: "BOOKED", priceCents: 20_000_000 },
            { slotTemplateId: "s2", status: "AVAILABLE", priceCents: 15_000_000 }
          ]
        }
      ]
    });
    const client = renderPanel({}, CLIENT_CONNECTE);
    fireEvent.click(await screen.findByRole("button", { name: nomJour("2027-08-20") }));
    const pris = screen.getByRole("button", { name: /^Soirée · / });
    expect(pris).toBeDisabled();
    expect(pris).toHaveTextContent(MSG.taken);
    fireEvent.click(screen.getByRole("button", { name: /^Après-midi · / }));
    fireEvent.change(screen.getByLabelText(MSG.guests), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText(MSG.firstName), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText(MSG.lastName), { target: { value: "Bensalem" } });
    fireEvent.change(screen.getByLabelText(MSG.phone), { target: { value: "+213550000001" } });
    fireEvent.click(screen.getByRole("button", { name: MSG.submit }));
    await waitFor(() => expect(client.create).toHaveBeenCalled());
    const corps = vi.mocked(client.create).mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect([corps.eventDate, corps.slotTemplateId, corps.expectedTotalCents]).toEqual(["2027-08-20", "s2", 15_000_000]);
  });
});''', 1))

for ancre, remplacement, n in R:
    vu = s.count(ancre)
    if vu != n:
        sys.exit(f"ANCRE {vu} occurrence(s), {n} attendue(s) : {ancre[:70]!r}")
    s = s.replace(ancre, remplacement)

io.open(P, "w", encoding="utf-8", newline="").write(s.replace("\n", "\r\n"))
relu = io.open(P, encoding="utf-8", newline="").read()
print(f"{len(R)} remplacements · /2027-08-1[56]/ restants : {relu.count('/2027-08-15/') + relu.count('/2027-08-16/')} (attendu 0) · "
      f"getByPlaceholderText restants : {relu.count('getByPlaceholderText')} (attendu 0) · "
      f"« C-d : » {relu.count('C-d :')} (attendu 1) · LF nus {relu.count(chr(10)) - relu.count(chr(13) + chr(10))} (attendu 0)")
