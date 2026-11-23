import { useEffect, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { StoryboardData } from '../types/storyboard';

interface ChecklistViewProps {
  storyboard: StoryboardData;
}

export function ChecklistView({ storyboard }: ChecklistViewProps) {
  const storageKey = `ember-echo-checklist-${storyboard.id}`;
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as Record<number, boolean>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setCheckedMap(saved ? (JSON.parse(saved) as Record<number, boolean>) : {});
    } catch {
      setCheckedMap({});
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checkedMap));
    } catch {
      // Ignore storage quota errors
    }
  }, [checkedMap, storageKey]);

  const completedCount = storyboard.checklist.filter(
    (_, idx) => checkedMap[idx],
  ).length;

  const toggleItem = (index: number) => {
    setCheckedMap((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <section className="lg:col-span-7 bg-white border border-[#DDD6C8] rounded-md p-6 sm:p-8 space-y-6">
        <div className="pb-4 border-b border-[#E8E2D6] flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
              {storyboard.seriesTitle} · Quality Assurance
            </div>
            <h2 className="font-serif text-3xl font-semibold text-[#1C1917]">
              Editorial Accuracy Checklist
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tabular-nums text-[#57534E]">
              {completedCount} / {storyboard.checklist.length} verified
            </span>
            <button
              type="button"
              onClick={() => setCheckedMap({})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] border border-[#D4CCBC] rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <ul className="divide-y divide-[#E8E2D6]">
          {storyboard.checklist.map((item, idx) => {
            const isChecked = Boolean(checkedMap[idx]);
            return (
              <li key={idx} className="py-3.5 first:pt-0 last:pb-0">
                <label className="flex items-start gap-3.5 cursor-pointer group">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggleItem(idx)}
                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                        : 'bg-[#F7F4EE] border-[#C5BDB0] group-hover:border-[#1C1917]'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                  </button>
                  <span
                    onClick={() => toggleItem(idx)}
                    className={`text-sm leading-relaxed transition-colors ${
                      isChecked
                        ? 'text-[#78716C] line-through'
                        : 'text-[#1C1917]'
                    }`}
                  >
                    {item}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="lg:col-span-5 space-y-6">
        <div className="bg-[#EFEBE3] border border-[#DDD6C8] rounded-md p-6 space-y-4">
          <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
            Sound & Edit Key
          </h3>
          <dl className="divide-y divide-[#DDD6C8] text-sm">
            {storyboard.soundEditKey.map((entry) => (
              <div key={entry.code} className="py-3 first:pt-0 last:pb-0">
                <dt className="font-mono text-xs font-medium text-[#1E3A8A]">
                  {entry.code}
                </dt>
                <dd className="mt-1 text-[#292524] leading-relaxed">
                  {entry.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white border border-[#DDD6C8] rounded-md p-6 space-y-3 text-xs text-[#57534E] leading-relaxed">
          <div className="font-mono uppercase tracking-wider text-[#1C1917] font-medium">
            Production Governance
          </div>
          <p>{storyboard.narrationPolicy}</p>
          <p>{storyboard.timingNote}</p>
          <p>{storyboard.visualTruthPolicy}</p>
        </div>
      </aside>
    </div>
  );
}
