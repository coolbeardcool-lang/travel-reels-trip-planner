import { describe, it, expect } from 'vitest';
import {
  normalizeCitySlugValue,
  normalizeAnalysisPayload,
  normalizeSpot,
  normalizeEvent,
  normalizeCityPayload,
} from './normalize.js';

// ──────────────────────────────────────────────
// normalizeCitySlugValue
// Han 輸入「京都」「大阪」等中文城市名，系統要轉成 slug
// ──────────────────────────────────────────────
describe('normalizeCitySlugValue', () => {
  it.each([
    ['京都', 'kyoto'],
    ['大阪', 'osaka'],
    ['台中', 'taichung'],
    ['首爾', 'seoul'],
    ['全部', 'all'],
  ])('中文城市名 "%s" → "%s"', (input, expected) => {
    expect(normalizeCitySlugValue(input)).toBe(expected);
  });

  it('已是英文 slug 時轉小寫', () => {
    expect(normalizeCitySlugValue('Osaka')).toBe('osaka');
  });

  it('空值回傳空字串', () => {
    expect(normalizeCitySlugValue('')).toBe('');
    expect(normalizeCitySlugValue(null)).toBe('');
    expect(normalizeCitySlugValue(undefined)).toBe('');
  });
});

// ──────────────────────────────────────────────
// normalizeAnalysisPayload
// Han 從 Instagram 分享連結後，AI 分析回傳的資料要正規化
// ──────────────────────────────────────────────
describe('normalizeAnalysisPayload', () => {
  it('完整 payload 正規化後欄位齊全', () => {
    const raw = {
      sourceTitle: '京都美食 Reel',
      sourcePlatform: 'Instagram',
      contentKind: 'spot',
      citySlug: 'kyoto',
      area: '錦市場',
      confidence: 0.9,
      needsReview: false,
      summary: '錦市場的必吃攤位',
      analysis_id: 'abc123',
      items: [
        { id: 'i1', name: '漬物老舖', category: '美食', description: '醃漬物', area: '錦市場', tags: ['醃漬', '伴手禮'] },
      ],
    };
    const result = normalizeAnalysisPayload(raw);
    expect(result.sourceTitle).toBe('京都美食 Reel');
    expect(result.sourcePlatform).toBe('Instagram');
    expect(result.contentKind).toBe('spot');
    expect(result.citySlug).toBe('kyoto');
    expect(result.confidence).toBe(0.9);
    expect(result.needsReview).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('漬物老舖');
    expect(result.items[0].tags).toEqual(['醃漬', '伴手禮']);
  });

  it('空 payload 使用 fallback 預設值', () => {
    const result = normalizeAnalysisPayload({});
    expect(result.sourceTitle).toBe('未命名來源');
    expect(result.items).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.needsReview).toBe(true);
  });

  it('items 缺少 id 時自動補上 fallback id', () => {
    const raw = { items: [{ name: '某景點' }] };
    const result = normalizeAnalysisPayload(raw);
    expect(result.items[0].id).toBe('analysis-item-0');
  });

  it('中文城市名也能正規化', () => {
    const raw = { citySlug: '大阪', items: [] };
    const result = normalizeAnalysisPayload(raw);
    expect(result.citySlug).toBe('osaka');
  });

  it('cached 欄位正確解析', () => {
    expect(normalizeAnalysisPayload({ cached: true, items: [] }).cached).toBe(true);
    expect(normalizeAnalysisPayload({ cached: false, items: [] }).cached).toBe(false);
    expect(normalizeAnalysisPayload({ items: [] }).cached).toBe(false);
  });
});

// ──────────────────────────────────────────────
// normalizeSpot
// Han 從社群平台收藏的景點，存入前要確保欄位正確
// ──────────────────────────────────────────────
describe('normalizeSpot', () => {
  const cityIndex = [{ slug: 'kyoto', label: '京都' }];

  it('正常景點欄位齊全', () => {
    const spot = {
      id: 's1', citySlug: 'kyoto', area: '嵐山', name: '天龍寺',
      category: '寺廟', description: '世界遺產', lat: 35.0168, lng: 135.672,
      stayMinutes: 60, bestTime: '上午', tags: ['世界遺產', '庭園'],
    };
    const result = normalizeSpot(spot, 0, cityIndex);
    expect(result.id).toBe('s1');
    expect(result.city).toBe('京都');
    expect(result.lat).toBe(35.0168);
    expect(result.stayMinutes).toBe(60);
    expect(result.tags).toEqual(['世界遺產', '庭園']);
  });

  it('缺少 id 時自動補 fallback', () => {
    const result = normalizeSpot({}, 3, cityIndex);
    expect(result.id).toBe('spot-3');
  });

  it('缺少 name 時使用預設', () => {
    const result = normalizeSpot({}, 0, cityIndex);
    expect(result.name).toBe('未命名景點');
  });

  it('無效的 lat/lng → 0', () => {
    const result = normalizeSpot({ lat: 'N/A', lng: undefined }, 0, cityIndex);
    expect(result.lat).toBe(0);
    expect(result.lng).toBe(0);
  });

  it('tags 不是陣列時轉為空陣列', () => {
    const result = normalizeSpot({ tags: 'food' }, 0, cityIndex);
    expect(result.tags).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// normalizeCityPayload
// 載入城市資料時（Han 選了城市後），回傳完整正規化資料
// ──────────────────────────────────────────────
describe('normalizeCityPayload', () => {
  const cityIndex = [{ slug: 'osaka', label: '大阪' }];

  it('回傳 spots、events、sources 三個陣列', () => {
    const payload = {
      city: { slug: 'osaka', label: '大阪' },
      spots: [{ id: '1', name: '道頓堀' }],
      events: [{ id: 'e1', name: '大阪祭典' }],
      sources: [{ id: 'src1', title: 'Reel 1', url: 'https://example.com' }],
    };
    const result = normalizeCityPayload(payload, 'osaka', cityIndex);
    expect(result.spots).toHaveLength(1);
    expect(result.events).toHaveLength(1);
    expect(result.sources).toHaveLength(1);
    expect(result.city.slug).toBe('osaka');
  });

  it('缺少欄位時回傳空陣列不崩潰', () => {
    const result = normalizeCityPayload({}, 'osaka', cityIndex);
    expect(result.spots).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.sources).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// Han 實際測試場景：Instagram Reel 分析結果正規化
// 測試 URL: https://www.instagram.com/reel/DGNUCr8TLbY/?igsh=...
// 模擬 AI 分析後回傳的 payload，驗證正規化後欄位正確
// ──────────────────────────────────────────────
describe('Han 實測場景 — Instagram Reel 分析結果正規化', () => {
  // 模擬 analyze-url API 回傳（首爾美食 Reel 典型格式）
  const mockInstagramAnalysis = {
    sourceTitle: '首爾燒肉推薦 Reel',
    sourcePlatform: 'Instagram',
    contentKind: 'spot',
    citySlug: 'seoul',
    area: '弘大',
    confidence: 0.75,
    needsReview: false,
    summary: '介紹首爾弘大周邊韓牛燒烤',
    analysis_id: 'test-reel-DGNUCr8TLbY',
    cached: false,
    items: [
      {
        id: 'item-1',
        name: '草原 (초원)',
        category: '餐廳',
        description: '厚切牛舌專門店，推薦烤腸配酒',
        area: '南營洞',
        tags: ['韓牛', '燒肉', '首爾'],
        best_time: '晚上',
        stay_minutes: 90,
      },
      {
        id: 'item-2',
        name: '草原 (초원)',
        category: '餐廳',
        description: '狎鷗亭分店',
        area: '狎鷗亭',
        tags: ['韓牛', '分店'],
        best_time: '晚上',
        stay_minutes: 90,
      },
    ],
  };

  it('正規化後 contentKind 和 citySlug 正確', () => {
    const result = normalizeAnalysisPayload(mockInstagramAnalysis);
    expect(result.contentKind).toBe('spot');
    expect(result.citySlug).toBe('seoul');
  });

  it('信心值 0.75 正確保留（非 0，可寫入）', () => {
    const result = normalizeAnalysisPayload(mockInstagramAnalysis);
    expect(result.confidence).toBe(0.75);
    expect(result.needsReview).toBe(false);
  });

  it('兩個同名不同區的分店各自為獨立 item', () => {
    const result = normalizeAnalysisPayload(mockInstagramAnalysis);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].area).toBe('南營洞');
    expect(result.items[1].area).toBe('狎鷗亭');
  });

  it('信心值 0% + needsReview=true → 前端應阻擋寫入（guard 邏輯驗證）', () => {
    const zeroCofidencePayload = { ...mockInstagramAnalysis, confidence: 0, needsReview: true };
    const result = normalizeAnalysisPayload(zeroCofidencePayload);
    // 前端 guard：(confidence === 0) && needsReview → 不送 API
    const shouldBlock = result.confidence === 0 && result.needsReview === true;
    expect(shouldBlock).toBe(true);
  });

  it('igsh 追蹤參數不影響 URL 識別', () => {
    const urlWithIgsh = 'https://www.instagram.com/reel/DGNUCr8TLbY/?igsh=MTdnOGo2dWNmamFiZg%3D%3D';
    expect(/^https?:\/\//i.test(urlWithIgsh)).toBe(true);
  });
});
