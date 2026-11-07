# FC-4 — l'arabe à relire par un humain

Trois clés neuves, sous `venueDetail.booking` de `packages/i18n/messages/ar.json` (parité FR/AR vérifiée par
`apps/api/src/common/i18n-parity.spec.ts`). Écrites par la session, **non relues par un arabophone** (consigne, § 4 : la relecture
humaine de l'arabe est hors session).

| clé | français (référence) | arabe proposé | où elle se lit |
|---|---|---|---|
| `dayRequested` | `{date}, demandes en attente` | `{date}، طلبات قيد الانتظار` | nom accessible d'un jour du calendrier qui ne porte qu'une demande en attente (lecteur d'écran) |
| `requested` | `demandes en attente` | `طلبات قيد الانتظار` | suffixe du bouton d'un créneau déjà demandé (« سهرة · {prix} · طلبات قيد الانتظار » — le prix est formaté par `formatDZD`, voir FC-6) |
| `requestedNotice` | `D'autres demandes sont déjà en attente pour ce créneau. La salle choisit entre les demandes : vous pouvez envoyer la vôtre.` | `توجد طلبات أخرى قيد الانتظار لهذه الفترة. تختار القاعة بين الطلبات، ويمكنك إرسال طلبك.` | l'avis sous le choix, quand le créneau choisi porte déjà une demande |

Points à vérifier par le relecteur : « الفترة » pour « créneau » (le catalogue emploie déjà « فترات يوم {date} » pour « Créneaux du
{date} ») ; la virgule arabe « ، » après `{date}` (comme `dayFree` et `dayFull`).
