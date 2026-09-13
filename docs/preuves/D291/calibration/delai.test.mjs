// CAS CONNU pour calibrer le compteur de delais et l'extracteur de verdict (D291), seconde version.
// Une promesse qui ne se resout jamais, sous un budget de 100 ms : vitest doit rendre un resume
// rouge a 1 test en echec sur 1, et au moins une signature de delai depasse.
// ATTENTION : ce commentaire ne cite PAS la signature. vitest recopie les lignes voisines du test
// dans son cadre de code ; la premiere version de ce fichier la citait, et le compteur comptait sa
// propre documentation (voir delai-premiere-version.log et la section D291 de la continuite).
// Lance par vitest.CMD de apps/client (meme version que la suite mesuree), --globals, sans config.
it("ne se resout jamais", () => new Promise(() => {}));
