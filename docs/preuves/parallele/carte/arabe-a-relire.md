# ARABE À RELIRE PAR UN HUMAIN — session « carte »

Chaque clé arabe NEUVE de la session, avec son français. Écrites par la session : aucune n'a été relue par un arabophone.
Toutes vivent dans le bloc `map` de `packages/i18n/messages/ar.json` (parité FR/AR : mêmes clés).
⚠ Parti pris d'écriture, à valider : les comptes sont écrits « libellé : nombre » (« القاعات على الخريطة: 3 ») pour ne pas
avoir à accorder le nom au nombre (singulier, duel, pluriel de 3 à 10, de 11 à 99). Le français suit la même forme.

## Lot CA-2 (18 clés)
| clé | français | arabe |
|---|---|---|
| `map.region` | Carte des salles | خريطة القاعات |
| `map.zoomIn` | Zoomer | تكبير |
| `map.zoomOut` | Dézoomer | تصغير |
| `map.loading` | Chargement de la carte… | جارٍ تحميل الخريطة… |
| `map.loadError` | La carte n'a pas pu être chargée. Vérifiez votre connexion, puis réessayez. | تعذّر تحميل الخريطة. تحقّق من اتصالك ثم أعد المحاولة. |
| `map.tilesError` | Le fond de carte ne se charge pas. Les salles restent placées au bon endroit. | تعذّر تحميل خلفية الخريطة. مواقع القاعات تبقى صحيحة. |
| `map.unavailableTitle` | Carte indisponible | الخريطة غير متوفرة |
| `map.unavailableBody` | La carte n'est pas disponible pour le moment. Toutes les salles restent visibles dans la liste. | الخريطة غير متوفرة حالياً. تبقى جميع القاعات ظاهرة في القائمة. |
| `map.pointsErrorTitle` | Les salles n'ont pas pu être placées sur la carte | تعذّر عرض القاعات على الخريطة |
| `map.pointsErrorBody` | Réessayez dans un instant. La liste des salles reste disponible. | أعد المحاولة بعد لحظات. قائمة القاعات تبقى متاحة. |
| `map.retry` | Réessayer | إعادة المحاولة |
| `map.count` | Salles sur la carte : {count} | القاعات على الخريطة: {count} |
| `map.withoutCoordinates` | Salles sans position, visibles dans la liste : {count} | قاعات بلا موقع محدّد، تظهر في القائمة: {count} |
| `map.truncated` | La carte montre les {limit} premières salles. Affinez les filtres pour voir les autres. | تعرض الخريطة أول {limit} قاعة. دقّق معايير البحث لرؤية البقية. |
| `map.empty` | Aucune salle de cette recherche n'a encore de position sur la carte. | لا توجد في هذا البحث قاعة لها موقع على الخريطة بعد. |
| `map.card.label` | Salle choisie sur la carte | القاعة المختارة على الخريطة |
| `map.card.open` | Voir la salle | عرض القاعة |
| `map.card.close` | Fermer | إغلاق |
