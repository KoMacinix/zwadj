const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
beforeEach(async () => { await dormir(1200); });
it("leger-1", () => {});
it("leger-2", () => {});
