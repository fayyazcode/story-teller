import type { Shot } from '../types/storyboard';

interface EditorialCanvasProps {
  shot: Shot;
  storyId: string;
  storyTitle: string;
  chapterTitle: string;
  chapterShotCount: number;
}

export function EditorialCanvas({
  shot,
  storyId,
  storyTitle,
  chapterTitle,
  chapterShotCount,
}: EditorialCanvasProps) {
  const ch = shot.chapterNumber;

  if (storyId !== 'flannan-isles-episode-01') {
    const beatNum = Number.parseInt(shot.id.split('.')[1] || '1', 10) || 1;
    const progressPct = Math.min(
      100,
      Math.max(8, Math.round((beatNum / Math.max(1, chapterShotCount)) * 100)),
    );
    return (
      <figure className="border border-[#DDD6C8] bg-[#EFEBE3] rounded-md overflow-hidden">
        <div className="p-5 sm:p-6">
          <svg
            viewBox="0 0 720 180"
            className="w-full h-auto text-[#1C1917]"
            role="img"
            aria-label={`Story chapter ${ch} beat ${beatNum} pacing diagram`}
          >
            <rect x="0" y="0" width="720" height="180" fill="#EAE4D8" />
            <text
              x="28"
              y="38"
              fontSize="11"
              fontFamily="IBM Plex Mono, monospace"
              fill="#57534E"
            >
              EMBER &amp; ECHO · {storyTitle.toUpperCase().slice(0, 46)}
            </text>
            <text
              x="28"
              y="68"
              fontSize="22"
              fontFamily="Cormorant Garamond, Georgia, serif"
              fill="#1C1917"
              fontWeight="600"
            >
              Chapter {String(ch).padStart(2, '0')} — {chapterTitle.slice(0, 48)}
            </text>
            <text
              x="28"
              y="96"
              fontSize="11"
              fontFamily="IBM Plex Mono, monospace"
              fill="#1E3A8A"
            >
              BEAT {shot.id} · TIMECODE {shot.timecode} · {shot.durationSeconds}S · {shot.wordCount} WORDS
            </text>
            <rect x="28" y="124" width="664" height="6" rx="3" fill="#D4CCBC" />
            <rect
              x="28"
              y="124"
              width={Math.round((664 * progressPct) / 100)}
              height="6"
              rx="3"
              fill="#1E3A8A"
            />
            <text
              x="28"
              y="152"
              fontSize="10"
              fontFamily="IBM Plex Mono, monospace"
              fill="#57534E"
            >
              CHAPTER PROGRESS {progressPct}% ({beatNum} OF {chapterShotCount} BEATS)
            </text>
          </svg>
        </div>
        <figcaption className="px-5 py-3 border-t border-[#DDD6C8] text-xs font-serif italic text-[#57534E]">
          Fig. {shot.id} — Narration pacing plate generated from Markdown manuscript.
        </figcaption>
      </figure>
    );
  }

  if (ch === 2) {
    return (
      <figure className="border border-[#DDD6C8] bg-[#EFEBE3] rounded-md overflow-hidden">
        <div className="p-5 sm:p-6">
          <svg
            viewBox="0 0 720 260"
            className="w-full h-auto text-[#1C1917]"
            role="img"
            aria-label="Cartographic relation between Scottish mainland, Isle of Lewis, and the Flannan Isles"
          >
            <rect x="0" y="0" width="720" height="260" fill="#EAE4D8" />
            <g stroke="#D4CCBC" strokeWidth="1">
              <line x1="0" y1="65" x2="720" y2="65" />
              <line x1="0" y1="130" x2="720" y2="130" />
              <line x1="0" y1="195" x2="720" y2="195" />
              <line x1="180" y1="0" x2="180" y2="260" />
              <line x1="360" y1="0" x2="360" y2="260" />
              <line x1="540" y1="0" x2="540" y2="260" />
            </g>

            {/* Scotland Mainland & Outer Hebrides Silhouettes */}
            <path
              d="M 555 245 C 548 210, 560 175, 585 150 C 598 130, 592 98, 614 70 C 632 48, 668 35, 705 32 L 720 32 L 720 260 L 555 260 Z"
              fill="#D9D1C1"
              stroke="#8C8374"
              strokeWidth="1.2"
            />
            <path
              d="M 385 190 C 378 164, 396 130, 415 112 C 425 90, 452 72, 474 88 C 482 108, 466 138, 444 162 C 430 184, 405 204, 385 190 Z"
              fill="#D9D1C1"
              stroke="#8C8374"
              strokeWidth="1.2"
            />

            {/* Flannan Isles / Seven Hunters Cluster */}
            <g transform="translate(155, 118)">
              <circle cx="0" cy="0" r="34" fill="none" stroke="#1E3A8A" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M -12 -6 L 6 -12 L 16 -2 L 8 10 L -10 8 Z" fill="#1C1917" />
              <circle cx="-22" cy="-16" r="3" fill="#57534E" />
              <circle cx="22" cy="-14" r="2.5" fill="#57534E" />
              <circle cx="20" cy="14" r="3" fill="#57534E" />
              <circle cx="-18" cy="18" r="2" fill="#57534E" />
            </g>

            {/* Observation & Telegram Route */}
            <path
              d="M 176 115 L 408 122"
              stroke="#1E3A8A"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <path
              d="M 455 122 L 598 126"
              stroke="#9A3412"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            <circle cx="412" cy="122" r="4" fill="#1E3A8A" />
            <circle cx="598" cy="126" r="4" fill="#9A3412" />

            <text x="88" y="72" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#1C1917" fontWeight="500">
              EILEAN MÒR (FLANNAN ISLES)
            </text>
            <text x="88" y="170" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#57534E">
              58°17′N · 07°35′W · TOWER 23M
            </text>
            <text x="236" y="108" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#1E3A8A">
              OPTICAL SIGNAL LINE (~32 KM)
            </text>
            <text x="380" y="214" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#1C1917" fontWeight="500">
              ISLE OF LEWIS OBSERVER
            </text>
            <text x="488" y="114" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#9A3412">
              TELEGRAM
            </text>
            <text x="580" y="214" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#1C1917" fontWeight="500">
              SCOTTISH MAINLAND
            </text>
          </svg>
        </div>
        <figcaption className="px-5 py-3 border-t border-[#DDD6C8] text-xs font-serif italic text-[#57534E]">
          Fig. {shot.id} — Geographic isolation of the Seven Hunters and optical-to-telegram relay route via the Isle of Lewis.
        </figcaption>
      </figure>
    );
  }

  if (ch === 6 || ch === 7) {
    return (
      <figure className="border border-[#DDD6C8] bg-[#EFEBE3] rounded-md overflow-hidden">
        <div className="p-5 sm:p-6">
          <svg
            viewBox="0 0 720 260"
            className="w-full h-auto text-[#1C1917]"
            role="img"
            aria-label="Western landing 30 metre cliff elevation and wave surge survey"
          >
            <rect x="0" y="0" width="720" height="260" fill="#EAE4D8" />
            {/* Sea Baseline */}
            <rect x="0" y="210" width="720" height="50" fill="#D5DEE8" />
            <path
              d="M 0 210 Q 45 200 90 210 T 180 210 T 270 210 T 360 210"
              fill="none"
              stroke="#1E3A8A"
              strokeWidth="1.5"
            />

            {/* Cliff Profile */}
            <path
              d="M 210 210 L 250 135 L 285 112 L 325 108 L 365 62 L 510 58 L 570 120 L 650 210 Z"
              fill="#D4CCC0"
              stroke="#57534E"
              strokeWidth="1.5"
            />

            {/* 30m Elevation Ruler */}
            <g stroke="#1C1917" strokeWidth="1">
              <line x1="172" y1="210" x2="172" y2="112" />
              <line x1="164" y1="210" x2="180" y2="210" />
              <line x1="164" y1="112" x2="180" y2="112" />
            </g>
            <text x="64" y="164" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#9A3412" fontWeight="500">
              &gt; 30 METRES
            </text>
            <text x="64" y="179" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#57534E">
              ABOVE SEA LEVEL
            </text>

            {/* Wave Surge Arc */}
            <path
              d="M 75 206 C 140 175, 195 110, 265 95 C 295 88, 315 102, 326 110"
              fill="none"
              stroke="#1E3A8A"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <polygon points="326,110 315,103 319,115" fill="#1E3A8A" />

            {/* West Landing Storage Box & Railings Marker */}
            <rect x="275" y="100" width="16" height="10" fill="#9A3412" />
            <line x1="262" y1="112" x2="262" y2="96" stroke="#9A3412" strokeWidth="2" />
            <line x1="262" y1="96" x2="270" y2="102" stroke="#9A3412" strokeWidth="1.5" />

            {/* Station Tower Atop Summit */}
            <rect x="424" y="26" width="14" height="32" fill="#F7F4EE" stroke="#1C1917" strokeWidth="1.2" />
            <polygon points="422,26 431,18 440,26" fill="#1C1917" />

            {/* East Landing Marker */}
            <rect x="580" y="160" width="14" height="8" fill="#1C1917" />

            <text x="242" y="76" fontSize="10.5" fontFamily="IBM Plex Mono, monospace" fill="#9A3412" fontWeight="500">
              WEST LANDING (DAMAGED)
            </text>
            <text x="242" y="89" fontSize="9.5" fontFamily="IBM Plex Mono, monospace" fill="#57534E">
              BOX SWEPT · RAILINGS BENT · LIFEBUOY MISSING
            </text>
            <text x="388" y="14" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#1C1917">
              STATION SUMMIT
            </text>
            <text x="530" y="148" fontSize="10.5" fontFamily="IBM Plex Mono, monospace" fill="#1C1917">
              EAST LANDING (INTACT)
            </text>
          </svg>
        </div>
        <figcaption className="px-5 py-3 border-t border-[#DDD6C8] text-xs font-serif italic text-[#57534E]">
          Fig. {shot.id} — Cross-section survey comparing the undisturbed eastern landing with storm surge damage above 30 metres on the western cliff.
        </figcaption>
      </figure>
    );
  }

  if (ch === 4 || ch === 8) {
    return (
      <figure className="border border-[#DDD6C8] bg-[#EFEBE3] rounded-md overflow-hidden">
        <div className="p-5 sm:p-6">
          <svg
            viewBox="0 0 720 230"
            className="w-full h-auto text-[#1C1917]"
            role="img"
            aria-label="Documentary evidence ledger contrasting surviving official records with unverified legend claims"
          >
            <rect x="0" y="0" width="720" height="230" fill="#EAE4D8" />
            <line x1="360" y1="20" x2="360" y2="210" stroke="#C9C0B0" strokeWidth="1" />

            {/* Left Column: Surviving Record */}
            <text x="28" y="38" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#1E3A8A" fontWeight="500">
              SURVIVING OFFICIAL RECORD
            </text>
            <line x1="28" y1="48" x2="332" y2="48" stroke="#1E3A8A" strokeWidth="1" />

            <text x="28" y="76" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fill="#1C1917" fontWeight="600">
              01. Working Slate Entry
            </text>
            <text x="28" y="94" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fill="#57534E">
              Last entry by James Ducat: Saturday morning, Dec 15, 1900.
            </text>

            <text x="28" y="128" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fill="#1C1917" fontWeight="600">
              02. Station & Kitchen State
            </text>
            <text x="28" y="146" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fill="#57534E">
              Lamps cleaned, oil filled, pots washed, rooms tidy, doors shut.
            </text>

            <text x="28" y="180" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fill="#1C1917" fontWeight="600">
              03. Clothing Clues
            </text>
            <text x="28" y="198" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fill="#57534E">
              Ducat & Marshall boots/oilskins gone; McArthur coat left on hook.
            </text>

            {/* Right Column: Legend / Unsupported */}
            <text x="388" y="38" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#9A3412" fontWeight="500">
              UNVERIFIED FOLKLORE (EXCLUDED AS FACT)
            </text>
            <line x1="388" y1="48" x2="692" y2="48" stroke="#9A3412" strokeWidth="1" />

            <text x="388" y="76" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fill="#1C1917" fontWeight="600">
              Unfinished Meal on Table
            </text>
            <text x="388" y="94" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fill="#57534E">
              Not supported by Muirhead or Moore station inspection reports.
            </text>

            <text x="388" y="128" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fill="#1C1917" fontWeight="600">
              Overturned Chair
            </text>
            <text x="388" y="146" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fill="#57534E">
              Later dramatic embellishment; contradicts documented tidy room.
            </text>

            <text x="388" y="180" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif" fill="#1C1917" fontWeight="600">
              Sensational Logbook Entries
            </text>
            <text x="388" y="198" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif" fill="#57534E">
              No surviving evidence of storm prayers or sudden-calm entries.
            </text>
          </svg>
        </div>
        <figcaption className="px-5 py-3 border-t border-[#DDD6C8] text-xs font-serif italic text-[#57534E]">
          Fig. {shot.id} — Editorial separation between documented inspection records and post-1900 popular legend.
        </figcaption>
      </figure>
    );
  }

  // Default archival plate for Chapters 1, 3, 5, 9: Lighthouse Beacon & Chronology Horizon
  return (
    <figure className="border border-[#DDD6C8] bg-[#EFEBE3] rounded-md overflow-hidden">
      <div className="p-5 sm:p-6">
        <svg
          viewBox="0 0 720 220"
          className="w-full h-auto text-[#1C1917]"
          role="img"
          aria-label="Flannan Isles lighthouse elevation and episode chronology scale"
        >
          <rect x="0" y="0" width="720" height="220" fill="#EAE4D8" />
          {/* Horizon & Sea */}
          <line x1="28" y1="158" x2="692" y2="158" stroke="#8C8374" strokeWidth="1" />
          <path d="M 28 168 Q 110 162 190 168 T 350 168 T 510 168 T 692 168" fill="none" stroke="#1E3A8A" strokeWidth="1" opacity="0.55" />

          {/* Tower Silhouette */}
          <polygon points="105,158 112,62 134,62 141,158" fill="#F7F4EE" stroke="#1C1917" strokeWidth="1.3" />
          <rect x="110" y="50" width="26" height="12" fill="#1C1917" />
          <polygon points="108,50 123,36 138,50" fill="#1C1917" />

          {/* Light Beam */}
          <polygon points="136,56 340,24 340,86" fill="#1E3A8A" opacity="0.1" />
          <line x1="136" y1="56" x2="340" y2="24" stroke="#1E3A8A" strokeWidth="0.8" strokeDasharray="4 4" />
          <line x1="136" y1="56" x2="340" y2="86" stroke="#1E3A8A" strokeWidth="0.8" strokeDasharray="4 4" />

          {/* Chronology Markers */}
          <line x1="220" y1="128" x2="670" y2="128" stroke="#1C1917" strokeWidth="1.2" />
          {[
            { x: 230, date: 'DEC 07', sub: 'Relief Visit' },
            { x: 318, date: 'DEC 15', sub: 'Last Slate' },
            { x: 406, date: 'DEC 18', sub: 'NLB Alerted' },
            { x: 494, date: 'DEC 26', sub: 'Hesperus' },
            { x: 582, date: 'DEC 29', sub: 'Muirhead' },
            { x: 656, date: 'SEP 1971', sub: 'Automated' },
          ].map((pt) => (
            <g key={pt.date}>
              <circle cx={pt.x} cy="128" r="3.5" fill={pt.date === 'DEC 15' || pt.date === 'DEC 26' ? '#9A3412' : '#1C1917'} />
              <text
                x={pt.x}
                y="112"
                textAnchor="middle"
                fontSize="10"
                fontFamily="IBM Plex Mono, monospace"
                fill="#1C1917"
                fontWeight="500"
              >
                {pt.date}
              </text>
              <text
                x={pt.x}
                y="146"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fill="#57534E"
              >
                {pt.sub}
              </text>
            </g>
          ))}

          <text x="220" y="34" fontSize="10.5" fontFamily="IBM Plex Mono, monospace" fill="#57534E">
            SHOT {shot.id} · TIMECODE {shot.timecode} ({shot.durationSeconds}S)
          </text>
          <text x="220" y="54" fontSize="14" fontFamily="Cormorant Garamond, Georgia, serif" fill="#1C1917" fontWeight="600">
            Eilean Mòr Lighthouse — 23m White Tower (Est. 1899)
          </text>
        </svg>
      </div>
      <figcaption className="px-5 py-3 border-t border-[#DDD6C8] text-xs font-serif italic text-[#57534E]">
        Fig. {shot.id} — Station elevation and verified 1900–1971 documentary timeline anchor.
      </figcaption>
    </figure>
  );
}
