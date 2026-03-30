/**
 * Web Share Target Tests
 *
 * Han 的核心需求 #3:
 * 在 Instagram / Threads / 臉書點「分享」→ 選到這個 APP
 * 系統會透過 manifest.json 的 share_target 將 URL 帶入 ?url= 或 ?text= query 參數
 *
 * App.jsx 的 useEffect 負責讀取這些參數並自動填入 submitUrl + 展開輸入面板
 *
 * 這組測試驗證：
 * 1. manifest.json 正確設定了 share_target
 * 2. URL 參數解析邏輯（從 App.jsx 抽出的純邏輯）
 */
import { describe, it, expect } from 'vitest';
import manifest from '../public/manifest.json';

// ──────────────────────────────────────────────
// 1. manifest.json 的 share_target 設定
//    這是 iOS 系統能識別此 APP 為分享目標的關鍵
// ──────────────────────────────────────────────
describe('Web Share Target manifest 設定', () => {
  it('manifest 包含 share_target', () => {
    expect(manifest).toHaveProperty('share_target');
  });

  it('share_target.action 指向根路徑', () => {
    expect(manifest.share_target.action).toBe('/');
  });

  it('share_target 使用 GET method（iOS Share Extension 相容）', () => {
    expect(manifest.share_target.method).toBe('GET');
  });

  it('share_target.params 包含 url 參數', () => {
    expect(manifest.share_target.params?.url).toBeTruthy();
  });

  it('share_target.params 包含 text 參數（分享純文字 URL 時使用）', () => {
    expect(manifest.share_target.params?.text).toBeTruthy();
  });

  it('PWA display 為 standalone（讓 Han 安裝後像原生 APP）', () => {
    expect(manifest.display).toBe('standalone');
  });
});

// ──────────────────────────────────────────────
// 2. URL 參數解析邏輯
//    對應 App.jsx 第一個 useEffect 中的解析邏輯
// ──────────────────────────────────────────────

// 抽取解析函式，與 App.jsx 邏輯保持一致
function parseShareParams(searchString) {
  const params = new URLSearchParams(searchString);
  const shared = params.get('url') || params.get('text');
  const isValidUrl = shared && /^https?:\/\//i.test(shared);
  const cityParam = params.get('city');
  const spotsParam = params.get('spots');
  const orderParam = params.get('order');
  return {
    sharedUrl: isValidUrl ? shared : null,
    cityParam,
    spotsParam: spotsParam ? spotsParam.split(',') : null,
    orderParam: orderParam ? orderParam.split(',') : null,
  };
}

describe('Web Share Target URL 參數解析', () => {
  it('?url= 帶入 Instagram Reel 網址 → 解析為 sharedUrl', () => {
    const result = parseShareParams('?url=https://www.instagram.com/reel/abc123');
    expect(result.sharedUrl).toBe('https://www.instagram.com/reel/abc123');
  });

  it('?text= 帶入網址（Threads 分享格式）→ 解析為 sharedUrl', () => {
    const result = parseShareParams('?text=https://www.threads.net/post/xyz');
    expect(result.sharedUrl).toBe('https://www.threads.net/post/xyz');
  });

  it('?url= 優先於 ?text=', () => {
    const result = parseShareParams('?url=https://ig.com/reel/aaa&text=https://other.com');
    expect(result.sharedUrl).toBe('https://ig.com/reel/aaa');
  });

  it('非 http/https URL → 不解析（防止 javascript: 等注入）', () => {
    const result = parseShareParams('?url=javascript:alert(1)');
    expect(result.sharedUrl).toBeNull();
  });

  it('空參數 → sharedUrl 為 null', () => {
    const result = parseShareParams('');
    expect(result.sharedUrl).toBeNull();
  });

  it('?city= + ?spots= 行程分享參數正確解析', () => {
    const result = parseShareParams('?city=kyoto&spots=s1,s2,s3&order=s2,s1,s3');
    expect(result.cityParam).toBe('kyoto');
    expect(result.spotsParam).toEqual(['s1', 's2', 's3']);
    expect(result.orderParam).toEqual(['s2', 's1', 's3']);
  });

  it('無 ?city= 時 cityParam 為 null', () => {
    const result = parseShareParams('?url=https://ig.com/reel/abc');
    expect(result.cityParam).toBeNull();
  });
});

// ──────────────────────────────────────────────
// 3. 常見社群平台網址格式驗證
//    Han 主要用 Instagram、臉書、Threads
// ──────────────────────────────────────────────
describe('社群平台網址格式支援', () => {
  const platforms = [
    ['Instagram Reel', 'https://www.instagram.com/reel/CxYZabc123/'],
    // Han 實際測試用的 Reel（含 igsh 追蹤參數）
    ['Instagram Reel + igsh 追蹤參數', 'https://www.instagram.com/reel/DGNUCr8TLbY/?igsh=MTdnOGo2dWNmamFiZg%3D%3D'],
    ['Instagram 貼文', 'https://www.instagram.com/p/CxYZabc123/'],
    ['Threads', 'https://www.threads.net/@user/post/abc123'],
    // Han 實際測試 Threads 長網址（含 xmt 追蹤參數）
    ['Threads + xmt 追蹤參數', 'https://www.threads.com/@whc_photography/post/DWafIpCERVQ?xmt=AQF0KoEzr6qBUS3boz1vVpYM9hvXXQ9KKwLABmqXR2p9RY5Y_l4Cbt6Z3tGDdumZepI9KlHK&slof=1'],
    ['Facebook 影片', 'https://www.facebook.com/reel/123456789'],
    ['Facebook 貼文', 'https://www.facebook.com/photo?fbid=123'],
    ['一般網址', 'https://tabelog.com/kyoto/A2601/A260101/26001234/'],
  ];

  it.each(platforms)('%s 可被識別為有效 URL', (_name, url) => {
    const result = parseShareParams(`?url=${encodeURIComponent(url)}`);
    expect(result.sharedUrl).not.toBeNull();
  });
});
