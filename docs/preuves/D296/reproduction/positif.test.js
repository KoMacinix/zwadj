const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
it("lourd", async () => { await dormir(1200); });
it("leger", () => {});
