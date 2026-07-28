"use client";

// Lot A8 — visite virtuelle Matterport. L'`<iframe>` n'est montée QU'AU GESTE
// de l'utilisateur, jamais au chargement : c'est un tiers, et surtout plusieurs
// mégaoctets. La cible est un Android bas de gamme sur réseau algérien lent
// (backlog 24.6) — poser cette iframe d'office ferait payer la visite à tout
// visiteur, y compris celui qui ne fait que comparer des prix.
//
// C'est aussi le seul composant du détail qui a besoin de JavaScript. Le
// repli est prévu : un LIEN vers Matterport, rendu dans tous les cas, qui
// fonctionne même si le script n'arrive jamais.
import { useState } from "react";
import { useTranslations } from "next-intl";

/** URL canonique d'un modèle Matterport. Même construction que la section Pro
 *  (`virtual-tour-section.tsx`) — l'identifiant est encodé, jamais interpolé
 *  nu : il vient de la base, donc d'une saisie pro. */
export function matterportUrl(modelId: string): string {
  return `https://my.matterport.com/show/?m=${encodeURIComponent(modelId)}`;
}

export function MatterportEmbed({ modelId }: { modelId: string }) {
  const t = useTranslations("venueDetail");
  const [mounted, setMounted] = useState(false);
  const url = matterportUrl(modelId);

  return (
    <section style={{ marginBlockStart: 24 }}>
      <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
        {t("tour")}
      </h2>

      {mounted ? (
        <iframe
          title={t("tourFrame")}
          src={url}
          // `allowFullScreen` et `allow="xr-spatial-tracking"` sont ce que
          // Matterport documente ; rien de plus n'est accordé.
          allow="xr-spatial-tracking"
          allowFullScreen
          loading="lazy"
          style={{
            inlineSize: "100%",
            aspectRatio: "16 / 10",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            display: "block"
          }}
        />
      ) : (
        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center"
          }}
        >
          <button type="button" className="btn btn-accent" onClick={() => setMounted(true)}>
            {t("tourLoad")}
          </button>
          {/* Le coût est ANNONCÉ. Sur un forfait de données limité, découvrir
              après coup qu'on a chargé plusieurs mégaoctets est une trahison. */}
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", maxInlineSize: 460 }}>{t("tourNotice")}</p>
        </div>
      )}

      {/* Toujours présent : c'est le repli sans JavaScript, et la sortie de
          secours si l'iframe est bloquée par le réseau ou le navigateur. */}
      <p style={{ marginBlockStart: 8 }}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="backlink" style={{ marginBlockEnd: 0 }}>
          {t("tourOpen")}
        </a>
      </p>
    </section>
  );
}
