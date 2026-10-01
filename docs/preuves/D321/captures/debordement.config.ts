/** D321 — configuration de la sonde du débordement : celle des captures, autre motif de test. Pièce versée. */
import captures from "./captures.config";

export default { ...captures, testMatch: /debordement\.spec\.ts/ };
