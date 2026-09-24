// D304 — cadrage de R1 : configuration JETABLE des cas de signature, versée en pièce.
// ⚠ AUCUN import : le fichier vit sous docs/preuves/, d'où aucun paquet ne se résout.
// Lancée depuis apps/api (vitest 3.2.7, la version des quatre paquets qui testent), avec
// `--dir` pointé sur ce dossier : le cache de vite reste sous apps/api/node_modules.
export default {
  test: {
    environment: "node",
    globals: true,
    include: ["cas/*.cas.ts"]
  }
};
