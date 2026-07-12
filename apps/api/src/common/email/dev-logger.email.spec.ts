import { DevLoggerEmailSender } from "./dev-logger.email";

describe("DevLoggerEmailSender (adaptateur dev de la primitive email)", () => {
  it("logge destinataire, sujet et corps — sans jamais lever", async () => {
    const info = vi.fn();
    const logger = { setContext: vi.fn(), info } as never;
    const config = { get: () => "Zwadj <no-reply@zwadj.dz>" } as never;

    const sender = new DevLoggerEmailSender(logger, config);
    await sender.send({ to: "aya@example.dz", subject: "Sujet test", text: "Corps avec lien https://x" });

    expect(info).toHaveBeenCalledTimes(1);
    const [meta, msg] = info.mock.calls[0]!;
    expect(meta).toMatchObject({ to: "aya@example.dz", subject: "Sujet test" });
    expect(String(msg)).toContain("https://x");
  });
});
