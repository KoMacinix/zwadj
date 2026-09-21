import { setTimeout as dormir } from "node:timers/promises";
it("expire", async () => { await dormir(600); });
it("leve", () => { throw new Error("boom"); });
