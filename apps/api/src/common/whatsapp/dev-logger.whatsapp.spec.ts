import { DevLoggerWhatsAppSender } from "./dev-logger.whatsapp";

describe("DevLoggerWhatsAppSender (adaptateur dev du port WhatsApp, D63)", () => {
  it("logge destinataire et corps — sans jamais lever", async () => {
    const info = vi.fn();
    const logger = { setContext: vi.fn(), info } as never;

    const sender = new DevLoggerWhatsAppSender(logger);
    await sender.send({ to: "+213550000009", text: "Nouveau rendez-vous de visite dimanche 09:00" });

    expect(info).toHaveBeenCalledTimes(1);
    const [meta, msg] = info.mock.calls[0]!;
    expect(meta).toMatchObject({ to: "+213550000009" });
    expect(String(msg)).toContain("09:00");
  });
});
