import { ArrowUpRight } from 'lucide-react';
import type { StoryboardData } from '../types/storyboard';

interface EvidenceMapViewProps {
  storyboard: StoryboardData;
  onJumpToShot: (chapterNumber: number, shotId: string) => void;
}

const CHRONOLOGY_EVENTS = [
  {
    date: '1899',
    title: 'Station Enters Service',
    detail:
      'Constructed under Northern Lighthouse Board engineer David Alan Stevenson. 23m white tower atop Eilean Mòr.',
    chapter: 2,
    shot: '02.04',
  },
  {
    date: 'Dec 07, 1900',
    title: 'Routine Relief Visit',
    detail:
      'Station receives scheduled relief. James Ducat, Thomas Marshall, and Donald McArthur remain on duty.',
    chapter: 3,
    shot: '03.10',
  },
  {
    date: 'Dec 15, 1900',
    title: 'Last Confirmed Slate Entry & Dark Light',
    detail:
      'Ducat records morning entry. Lamps cleaned, oil filled, kitchen tidy. Steamer Archtor reports lighthouse unlit around midnight.',
    chapter: 4,
    shot: '04.01',
  },
  {
    date: 'Dec 18, 1900',
    title: 'Board Notified on Mainland',
    detail:
      'Report of dark beacon reaches Northern Lighthouse Board, but severe Atlantic weather delays the relief vessel.',
    chapter: 4,
    shot: '04.07',
  },
  {
    date: 'Dec 26, 1900',
    title: 'Hesperus Arrives — Station Found Empty',
    detail:
      'Captain James Harvie fires signal rocket; Joseph Moore climbs to closed doors, cold hearth, and empty quarters.',
    chapter: 5,
    shot: '05.01',
  },
  {
    date: 'Dec 29, 1900',
    title: 'Robert Muirhead Official Investigation',
    detail:
      'Superintendent inspects undisturbed eastern landing and damaged western landing above 30 metres; concludes wave strike most plausible.',
    chapter: 7,
    shot: '07.01',
  },
  {
    date: 'Sep 1971',
    title: 'Station Automated',
    detail:
      'Era of resident lighthouse keepers on Eilean Mòr ends; tower continues operating remotely.',
    chapter: 9,
    shot: '09.02',
  },
];

const PERSONNEL_RECORD = [
  {
    name: 'James Ducat',
    role: 'Principal Keeper',
    status: 'Missing · Sea boots & waterproofs absent',
    chapter: 3,
    shot: '03.01',
  },
  {
    name: 'Thomas Marshall',
    role: 'Second Assistant Keeper',
    status: 'Missing · Sea boots & oilskins absent',
    chapter: 3,
    shot: '03.02',
  },
  {
    name: 'Donald McArthur',
    role: 'Occasional Keeper (Replacing William Ross)',
    status: 'Missing · Usual outdoor coat left on hook',
    chapter: 6,
    shot: '06.07',
  },
  {
    name: 'Joseph Moore',
    role: 'Fourth Keeper (Ashore Dec 15)',
    status: 'Returned aboard Hesperus Dec 26 · First ashore',
    chapter: 5,
    shot: '05.04',
  },
  {
    name: 'Captain James Harvie',
    role: 'Master of Tender Hesperus',
    status: 'Commanded Dec 26 relief & sent telegram',
    chapter: 5,
    shot: '05.01',
  },
  {
    name: 'Robert Muirhead',
    role: 'NLB Superintendent',
    status: 'Led Dec 29 official inquiry on Eilean Mòr',
    chapter: 7,
    shot: '07.01',
  },
];

export function EvidenceMapView({
  storyboard,
  onJumpToShot,
}: EvidenceMapViewProps) {
  if (storyboard.id !== 'flannan-isles-episode-01') {
    return (
      <div className="space-y-8">
        <div className="pb-5 border-b border-[#DDD6C8] space-y-1.5">
          <div className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
            Ember &amp; Echo · Manuscript Structure · {storyboard.source}
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917]">
            {storyboard.episodeTitle} — Chapter Index
          </h2>
          <p className="text-sm text-[#57534E] max-w-2xl leading-relaxed">
            Overview of chapters and narration beats parsed directly from your Markdown file. Select any chapter or beat to jump into the reader.
          </p>
        </div>

        <div className="bg-white border border-[#DDD6C8] rounded-md divide-y divide-[#E8E2D6]">
          {storyboard.chapters.map((ch) => {
            const firstShot = ch.shots[0];
            return (
              <div
                key={ch.number}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs font-mono tabular-nums text-[#9A3412]">
                    Chapter {String(ch.number).padStart(2, '0')} · {ch.editorialWindow} · {ch.shots.length} beats · {ch.narrationWords} words
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                    {ch.title}
                  </h3>
                  {firstShot && (
                    <p className="text-sm text-[#57534E] line-clamp-2 max-w-2xl">
                      {firstShot.narration}
                    </p>
                  )}
                </div>
                {firstShot && (
                  <button
                    type="button"
                    onClick={() => onJumpToShot(ch.number, firstShot.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-[#1E3A8A] bg-[#F7F4EE] hover:bg-[#EAE4D8] border border-[#D4CCBC] rounded transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <span>Open Beat {firstShot.id}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="pb-5 border-b border-[#DDD6C8] space-y-1.5">
        <div className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
          Archival Dossier · Verified Facts vs. Post-1900 Folklore
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917]">
          Chronology, Personnel & Physical Evidence
        </h2>
        <p className="text-sm text-[#57534E] max-w-2xl leading-relaxed">
          Reference ledger derived from the episode storyboard. Select any record entry to jump directly to its corresponding storyboard shot and narration.
        </p>
      </div>

      {/* Chronology */}
      <section className="space-y-4">
        <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
          01. Verified Timeline (1899–1971)
        </h3>
        <div className="bg-white border border-[#DDD6C8] rounded-md divide-y divide-[#E8E2D6]">
          {CHRONOLOGY_EVENTS.map((ev) => (
            <div
              key={ev.date}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <span className="font-mono text-xs font-medium tabular-nums text-[#9A3412] w-28 shrink-0">
                  {ev.date}
                </span>
                <div className="space-y-1">
                  <div className="text-base font-semibold text-[#1C1917]">
                    {ev.title}
                  </div>
                  <p className="text-sm text-[#57534E] max-w-2xl leading-relaxed">
                    {ev.detail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onJumpToShot(ev.chapter, ev.shot)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#1E3A8A] bg-[#F7F4EE] hover:bg-[#EAE4D8] border border-[#D4CCBC] rounded transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                <span>Shot {ev.shot}</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Keepers & Witnesses */}
      <section className="space-y-4">
        <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
          02. Keepers & Official Investigators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PERSONNEL_RECORD.map((person) => (
            <div
              key={person.name}
              className="bg-white border border-[#DDD6C8] rounded-md p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="text-xs font-mono text-[#57534E]">
                  {person.role}
                </div>
                <h4 className="font-serif text-xl font-semibold text-[#1C1917]">
                  {person.name}
                </h4>
                <p className="text-sm text-[#57534E] leading-relaxed">
                  {person.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onJumpToShot(person.chapter, person.shot)}
                className="inline-flex items-center justify-between px-3 py-1.5 text-xs font-mono text-[#1C1917] bg-[#F7F4EE] hover:bg-[#EAE4D8] border border-[#D4CCBC] rounded transition-colors"
              >
                <span>Open Shot {person.shot}</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Evidence vs Folklore Table */}
      <section className="space-y-4">
        <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
          03. Surviving Inspection vs. Unverified Legend
        </h3>
        <div className="bg-white border border-[#DDD6C8] rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#EFEBE3] border-b border-[#DDD6C8] text-xs font-mono uppercase tracking-wider text-[#57534E]">
                <th className="py-3.5 px-5 font-medium">Subject</th>
                <th className="py-3.5 px-5 font-medium">
                  Documented Official Record
                </th>
                <th className="py-3.5 px-5 font-medium">
                  Unverified Folklore (Must Label Legend)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D6]">
              <tr>
                <td className="py-4 px-5 font-medium text-[#1C1917]">
                  Kitchen & Living Quarters
                </td>
                <td className="py-4 px-5 text-[#292524]">
                  Pots and pans washed, kitchen tidy, entrance gate and outside doors closed, hearth cold.
                </td>
                <td className="py-4 px-5 text-[#9A3412]">
                  Unfinished meal abandoned on the table; chair knocked over in sudden panic.
                </td>
              </tr>
              <tr>
                <td className="py-4 px-5 font-medium text-[#1C1917]">
                  Written Records
                </td>
                <td className="py-4 px-5 text-[#292524]">
                  Last working slate entry made Saturday morning, December 15, by James Ducat.
                </td>
                <td className="py-4 px-5 text-[#9A3412]">
                  Sensational logbook entries describing men praying in fear and a sudden calm.
                </td>
              </tr>
              <tr>
                <td className="py-4 px-5 font-medium text-[#1C1917]">
                  Western Landing (&gt;30m)
                </td>
                <td className="py-4 px-5 text-[#292524]">
                  Wooden rope box swept away, iron railings bent, heavy stone displaced, lifebuoy missing.
                </td>
                <td className="py-4 px-5 text-[#9A3412]">
                  Supernatural abduction, sea monster, or violent mutiny without physical trace.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
