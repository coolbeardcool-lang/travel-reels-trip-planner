import { describe, it, expect } from 'vitest';
import {
  distanceScore,
  haversineKm,
  estimateTransport,
  buildRecommendation,
} from './geo.js';

// ──────────────────────────────────────────────
// distanceScore
// Han 依據「現在在哪裡」+「幾點」決定推薦順序
// ──────────────────────────────────────────────
describe('distanceScore', () => {
  it('在同一區域 + 符合時段 → 最高分 (5)', () => {
    const spot = { area: '錦市場', bestTime: '上午', stayMinutes: 30 };
    expect(distanceScore(spot, '錦市場', '上午')).toBe(6); // area+3, time+2, short+1
  });

  it('同一區域但時段不符 → 4 分', () => {
    const spot = { area: '錦市場', bestTime: '晚上', stayMinutes: 30 };
    expect(distanceScore(spot, '錦市場', '上午')).toBe(4); // area+3, short+1
  });

  it('不同區域但時段符合 → 3 分', () => {
    const spot = { area: '祇園', bestTime: '下午', stayMinutes: 60 };
    expect(distanceScore(spot, '錦市場', '下午')).toBe(2); // time+2
  });

  it('完全不符合 → 0 分', () => {
    const spot = { area: '祇園', bestTime: '晚上', stayMinutes: 60 };
    expect(distanceScore(spot, '錦市場', '下午')).toBe(0);
  });

  it('停留短 (≤45分) 加一分', () => {
    const spot = { area: '東', bestTime: '早上', stayMinutes: 45 };
    expect(distanceScore(spot, '西', '晚上')).toBe(1); // only short-stay bonus
  });

  it('停留長 (>45分) 不加分', () => {
    const spot = { area: '東', bestTime: '早上', stayMinutes: 46 };
    expect(distanceScore(spot, '西', '晚上')).toBe(0);
  });
});

// ──────────────────────────────────────────────
// haversineKm
// 用於計算 Han 目前位置與景點的真實距離
// ──────────────────────────────────────────────
describe('haversineKm', () => {
  it('相同座標距離為 0', () => {
    const p = { lat: 35.0116, lng: 135.7681 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 5);
  });

  it('京都御所到錦市場約 1.5 km', () => {
    const kyotoImperial = { lat: 35.025, lng: 135.762 };
    const nishiki = { lat: 35.005, lng: 135.765 };
    const km = haversineKm(kyotoImperial, nishiki);
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(3);
  });

  it('首爾到大阪（城市間）距離超過 800 km', () => {
    const seoul = { lat: 37.5665, lng: 126.978 };
    const osaka = { lat: 34.6937, lng: 135.502 };
    const km = haversineKm(seoul, osaka);
    expect(km).toBeGreaterThan(800);
  });
});

// ──────────────────────────────────────────────
// estimateTransport
// Han 要知道景點之間怎麼移動
// ──────────────────────────────────────────────
describe('estimateTransport', () => {
  it('< 0.8 km → 步行', () => {
    const a = { lat: 35.0, lng: 135.76 };
    const b = { lat: 35.005, lng: 135.762 }; // ~600m
    const result = estimateTransport(a, b);
    expect(result?.label).toBe('步行');
    expect(result?.icon).toBe('🚶');
    expect(result?.minutes).toBeGreaterThan(0);
  });

  it('0.8–3 km → 公車/地鐵', () => {
    const a = { lat: 35.0, lng: 135.76 };
    const b = { lat: 35.015, lng: 135.765 }; // ~1.8km
    const result = estimateTransport(a, b);
    expect(result?.label).toBe('公車/地鐵');
  });

  it('> 3 km → 電車/地鐵', () => {
    const a = { lat: 35.0, lng: 135.76 };
    const b = { lat: 35.04, lng: 135.8 }; // ~5km
    const result = estimateTransport(a, b);
    expect(result?.label).toBe('電車/地鐵');
  });

  it('缺少座標 → 回傳 null', () => {
    expect(estimateTransport({ lat: 0, lng: 0 }, { lat: 35.0, lng: 135.76 })).toBeNull();
    expect(estimateTransport(null, { lat: 35.0, lng: 135.76 })).toBeNull();
  });
});

// ──────────────────────────────────────────────
// buildRecommendation
// Han 點一個地點後，系統推薦一起去的景點（核心功能 4）
// ──────────────────────────────────────────────
describe('buildRecommendation', () => {
  const spots = [
    { id: 'a', area: '祇園', bestTime: '下午', stayMinutes: 60, name: '花見小路' },
    { id: 'b', area: '祇園', bestTime: '上午', stayMinutes: 30, name: '八坂神社' },
    { id: 'c', area: '嵐山', bestTime: '下午', stayMinutes: 90, name: '竹林小徑' },
    { id: 'd', area: '錦市場', bestTime: '上午', stayMinutes: 45, name: '錦天満宮' },
  ];

  it('同區域 + 符合時段的景點排第一', () => {
    const result = buildRecommendation(spots, '祇園', '下午');
    expect(result[0].id).toBe('a'); // area+3, time+2, stayLong=0 → score 5
  });

  it('每個項目都帶有 reason 說明推薦原因', () => {
    const result = buildRecommendation(spots, '祇園', '下午');
    result.forEach((item) => {
      expect(typeof item.reason).toBe('string');
    });
  });

  it('同區域+時段符合: reason 包含「最推薦」', () => {
    const result = buildRecommendation(spots, '祇園', '下午');
    const top = result.find((i) => i.id === 'a');
    expect(top?.reason).toContain('最推薦');
  });

  it('同區域但時段不符: reason 包含「很近」', () => {
    const result = buildRecommendation(spots, '祇園', '晚上');
    const nearby = result.find((i) => i.id === 'b');
    expect(nearby?.reason).toContain('很近');
  });

  it('不同區域但時段符合: reason 包含「適合」', () => {
    const result = buildRecommendation(spots, '錦市場', '下午');
    const timeMatch = result.find((i) => i.id === 'c');
    expect(timeMatch?.reason).toContain('適合');
  });

  it('空景點陣列回傳空陣列', () => {
    expect(buildRecommendation([], '祇園', '下午')).toEqual([]);
  });
});
