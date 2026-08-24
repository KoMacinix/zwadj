import type { ReactNode, SVGProps } from "react";

export const LATIN_LOST_WORDS = [
  "Wedderna el-cortege",
  "Tlef el-khit",
  "Khredjt 3la la-piste",
  "Khredjti 3la el-pista",
  "Tlef",
  "Wedder",
  "Tbahr",
  "Hayer",
  "Ghlat",
  "Tbahhar",
  "Tleftou el-triq"
] as const;

type WordProps = SVGProps<SVGTextElement> & {
  children: ReactNode;
  tone?: "default" | "soft" | "faint" | "accent";
};

function Word({ children, className = "", tone = "default", ...props }: WordProps) {
  return (
    <text
      className={`lost-word-cloud__word is-${tone} ${className}`.trim()}
      dominantBaseline="middle"
      {...props}
    >
      {children}
    </text>
  );
}

function ArabicWord(props: WordProps) {
  return <Word lang="ar" direction="rtl" unicodeBidi="bidi-override" {...props} />;
}

export function LostWordCloud() {
  return (
    <div className="lost-word-cloud" aria-hidden="true">
      <svg
        className="lost-word-cloud__svg lost-word-cloud__svg--wide"
        viewBox="0 0 1200 760"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <Word x="70" y="82" fontSize="30" fontWeight="500" tone="soft" transform="rotate(-5 70 82)">
          Wedderna el-cortege
        </Word>
        <ArabicWord x="720" y="72" fontSize="34" fontWeight="500" tone="accent">
          ضيّعنا الكورتيج
        </ArabicWord>
        <Word x="925" y="145" fontSize="25" tone="faint" transform="rotate(5 925 145)">
          Tlef el-khit
        </Word>
        <ArabicWord x="1035" y="215" fontSize="31" tone="soft">
          تلف الخيط
        </ArabicWord>

        <Word x="22" y="245" fontSize="23" tone="faint" transform="rotate(-7 22 245)">
          Khredjt 3la la-piste
        </Word>
        <ArabicWord x="65" y="350" fontSize="28" fontWeight="500" tone="accent">
          خرجت على البيست
        </ArabicWord>
        <Word x="970" y="326" fontSize="23" tone="soft" transform="rotate(7 970 326)">
          Khredjti 3la el-pista
        </Word>
        <ArabicWord x="1138" y="400" fontSize="27" tone="faint">
          خرجتي على البيستا
        </ArabicWord>

        <Word x="260" y="158" fontSize="41" fontWeight="600" tone="accent">
          Tlef
        </Word>
        <ArabicWord x="495" y="172" fontSize="38" tone="faint">
          تبحّر
        </ArabicWord>
        <Word x="50" y="505" fontSize="34" fontWeight="500" tone="soft">
          Wedder
        </Word>
        <ArabicWord x="286" y="565" fontSize="37" tone="faint">
          ودّر
        </ArabicWord>
        <Word x="1100" y="515" fontSize="32" tone="accent">
          Tbahr
        </Word>
        <Word x="920" y="590" fontSize="42" fontWeight="500" tone="faint">
          Hayer
        </Word>
        <ArabicWord x="790" y="625" fontSize="37" tone="soft">
          حاير
        </ArabicWord>
        <Word x="72" y="682" fontSize="28" tone="faint" transform="rotate(4 72 682)">
          Ghlat
        </Word>
        <ArabicWord x="1110" y="672" fontSize="35" tone="soft">
          غلط
        </ArabicWord>
        <Word x="555" y="712" fontSize="27" tone="soft" transform="rotate(-3 555 712)">
          Tbahhar
        </Word>
        <Word x="915" y="720" fontSize="24" tone="faint">
          Tleftou el-triq
        </Word>
        <ArabicWord x="380" y="650" fontSize="31" fontWeight="500" tone="accent">
          تلفتو الطريق
        </ArabicWord>
      </svg>

      <svg
        className="lost-word-cloud__svg lost-word-cloud__svg--compact"
        viewBox="0 0 390 760"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <Word x="12" y="40" fontSize="18" fontWeight="500" tone="soft" transform="rotate(-4 12 40)">
          Wedderna el-cortege
        </Word>
        <ArabicWord x="372" y="85" fontSize="24" fontWeight="500" tone="accent">
          ضيّعنا الكورتيج
        </ArabicWord>
        <Word x="196" y="128" fontSize="19" tone="faint" transform="rotate(5 196 128)">
          Tlef el-khit
        </Word>
        <ArabicWord x="110" y="168" fontSize="23" tone="soft">
          تلف الخيط
        </ArabicWord>

        <Word x="-10" y="224" fontSize="17" tone="faint" transform="rotate(-8 -10 224)">
          Khredjt 3la la-piste
        </Word>
        <ArabicWord x="380" y="275" fontSize="22" tone="accent">
          خرجت على البيست
        </ArabicWord>
        <Word x="205" y="332" fontSize="16" tone="soft" transform="rotate(7 205 332)">
          Khredjti 3la el-pista
        </Word>
        <ArabicWord x="88" y="385" fontSize="20" tone="faint">
          خرجتي على البيستا
        </ArabicWord>

        <Word x="20" y="456" fontSize="31" fontWeight="600" tone="accent">
          Tlef
        </Word>
        <Word x="286" y="448" fontSize="26" tone="faint">
          Wedder
        </Word>
        <ArabicWord x="382" y="500" fontSize="30" tone="soft">
          ودّر
        </ArabicWord>
        <Word x="18" y="542" fontSize="25" tone="soft">
          Tbahr
        </Word>
        <Word x="273" y="570" fontSize="30" fontWeight="500" tone="faint">
          Hayer
        </Word>
        <ArabicWord x="144" y="606" fontSize="27" tone="soft">
          حاير
        </ArabicWord>
        <Word x="20" y="650" fontSize="23" tone="faint">
          Ghlat
        </Word>
        <ArabicWord x="368" y="640" fontSize="27" tone="soft">
          غلط
        </ArabicWord>
        <Word x="166" y="690" fontSize="21" tone="soft" transform="rotate(-4 166 690)">
          Tbahhar
        </Word>
        <ArabicWord x="96" y="726" fontSize="23" fontWeight="500" tone="accent">
          تلفتو الطريق
        </ArabicWord>
        <Word x="230" y="742" fontSize="18" tone="faint">
          Tleftou el-triq
        </Word>
      </svg>
    </div>
  );
}
