import { describe, it, expect } from 'vitest';
import { formatEventWindow, prettyAnalysisKind } from './format.js';

describe('formatEventWindow', () => {
  it('有開始和結束日期 → 顯示區間', () => {
    const result = formatEventWindow({ startsOn: '2026-04-01', endsOn: '2026-04-05' });
    expect(result).toContain('2026-04-01');
    expect(result).toContain('2026-04-05');
  });

  it('相同日期只顯示一次', () => {
    const result = formatEventWindow({ startsOn: '2026-04-01', endsOn: '2026-04-01' });
    expect(result).toBe('2026-04-01');
  });

  it('有時間欄位時一併顯示', () => {
    const result = formatEventWindow({ startsOn: '2026-04-01', startTime: '14:00', endTime: '17:00' });
    expect(result).toContain('14:00');
    expect(result).toContain('17:00');
  });

  it('無日期時顯示「時間未定」', () => {
    expect(formatEventWindow({})).toBe('時間未定');
  });
});

describe('prettyAnalysisKind', () => {
  it('spot → 景點 / 美食', () => {
    expect(prettyAnalysisKind('spot')).toBe('景點 / 美食');
  });

  it('event → 活動 / 展覽', () => {
    expect(prettyAnalysisKind('event')).toBe('活動 / 展覽');
  });

  it('其他 → 來源資料', () => {
    expect(prettyAnalysisKind('source_only')).toBe('來源資料');
    expect(prettyAnalysisKind('')).toBe('來源資料');
  });
});
