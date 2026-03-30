/**
 * UrlAnalyzerPanel Tests
 *
 * Covers Han's flow:
 * 1. 貼社群平台網址 → 看到分析表單
 * 2. 重複網址 → 顯示警告
 * 3. 分析前無法點「確認寫入」
 * 4. 分析完成後可以選擇/取消項目
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UrlAnalyzerPanel } from './UrlAnalyzerPanel.jsx';

// 最小 props 工廠
function makeProps(overrides = {}) {
  return {
    isMobile: false,
    cityIndex: [
      { slug: 'kyoto', label: '京都' },
      { slug: 'osaka', label: '大阪' },
    ],
    submitUrl: '',
    setSubmitUrl: vi.fn(),
    submitTitle: '',
    setSubmitTitle: vi.fn(),
    submitType: 'auto',
    setSubmitType: vi.fn(),
    submitCitySlug: '',
    setSubmitCitySlug: vi.fn(),
    submitNotes: '',
    setSubmitNotes: vi.fn(),
    analysisPreview: null,
    setAnalysisPreview: vi.fn(),
    submitStatus: { kind: 'idle', message: '' },
    setSubmitStatus: vi.fn(),
    isAnalyzing: false,
    isConfirming: false,
    isDuplicateUrl: false,
    shouldShowInput: true,
    submitStatusStyle: {},
    onAnalyze: vi.fn(),
    onConfirm: vi.fn(),
    onClose: { open: vi.fn(), close: vi.fn() },
    selectedItems: [],
    setSelectedItems: vi.fn(),
    ...overrides,
  };
}

describe('UrlAnalyzerPanel — 表單顯示', () => {
  it('shouldShowInput=false 時顯示「貼網址分析」快捷按鈕', () => {
    render(<UrlAnalyzerPanel {...makeProps({ shouldShowInput: false })} />);
    expect(screen.getByText(/貼網址分析/)).toBeInTheDocument();
  });

  it('shouldShowInput=true 時顯示完整表單', () => {
    render(<UrlAnalyzerPanel {...makeProps()} />);
    expect(screen.getByPlaceholderText(/Instagram Reel/)).toBeInTheDocument();
    expect(screen.getByText('先分析網址')).toBeInTheDocument();
  });

  it('點 ✕ 關閉鍵呼叫 onClose.close', () => {
    const onClose = { open: vi.fn(), close: vi.fn() };
    render(<UrlAnalyzerPanel {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose.close).toHaveBeenCalledOnce();
  });
});

describe('UrlAnalyzerPanel — 重複網址警告 (Han 不小心重複分享同一則 Reel)', () => {
  it('isDuplicateUrl=true 顯示重複警告', () => {
    render(<UrlAnalyzerPanel {...makeProps({ isDuplicateUrl: true, submitUrl: 'https://ig.com/reel/abc' })} />);
    expect(screen.getByText(/已提交過/)).toBeInTheDocument();
  });

  it('isDuplicateUrl=false 不顯示警告', () => {
    render(<UrlAnalyzerPanel {...makeProps({ isDuplicateUrl: false })} />);
    expect(screen.queryByText(/已提交過/)).not.toBeInTheDocument();
  });
});

describe('UrlAnalyzerPanel — 分析/確認按鈕狀態', () => {
  it('分析中時按鈕文字變「分析中…」且 disabled', () => {
    render(<UrlAnalyzerPanel {...makeProps({ isAnalyzing: true })} />);
    const btn = screen.getByText('分析中…');
    expect(btn).toBeDisabled();
  });

  it('沒有 analysisPreview 時「確認後寫入」按鈕 disabled', () => {
    render(<UrlAnalyzerPanel {...makeProps({ analysisPreview: null })} />);
    expect(screen.getByText('確認後寫入')).toBeDisabled();
  });

  it('有 analysisPreview 時「確認後寫入」可點擊', () => {
    const preview = {
      sourceTitle: '測試 Reel',
      sourcePlatform: 'Instagram',
      contentKind: 'spot',
      citySlug: 'kyoto',
      confidence: 0.85,
      needsReview: false,
      cached: false,
      summary: '',
      items: [],
    };
    render(<UrlAnalyzerPanel {...makeProps({ analysisPreview: preview, selectedItems: [] })} />);
    expect(screen.getByText('確認後寫入')).not.toBeDisabled();
  });

  it('寫入中時「確認後寫入」變「寫入中…」且 disabled', () => {
    render(<UrlAnalyzerPanel {...makeProps({ isConfirming: true })} />);
    expect(screen.getByText('寫入中…')).toBeDisabled();
  });
});

describe('UrlAnalyzerPanel — 分析預覽項目選擇 (Han 選要存哪些景點)', () => {
  const preview = {
    sourceTitle: '大阪美食 Reel',
    sourcePlatform: 'Instagram',
    contentKind: 'spot',
    citySlug: 'osaka',
    confidence: 0.9,
    needsReview: false,
    cached: false,
    summary: '道頓堀美食推薦',
    items: [
      { id: 'i1', name: '道頓堀章魚燒', category: '美食', area: '道頓堀', description: '', reason: '', tags: [] },
      { id: 'i2', name: '心齋橋冰淇淋', category: '美食', area: '心齋橋', description: '', reason: '', tags: [] },
    ],
  };

  it('顯示所有分析到的景點項目', () => {
    render(<UrlAnalyzerPanel {...makeProps({ analysisPreview: preview, selectedItems: ['i1', 'i2'] })} />);
    expect(screen.getByText('道頓堀章魚燒')).toBeInTheDocument();
    expect(screen.getByText('心齋橋冰淇淋')).toBeInTheDocument();
  });

  it('點擊「全取消」呼叫 setSelectedItems([])', () => {
    const setSelectedItems = vi.fn();
    render(<UrlAnalyzerPanel {...makeProps({ analysisPreview: preview, selectedItems: ['i1', 'i2'], setSelectedItems })} />);
    fireEvent.click(screen.getByText('全取消'));
    expect(setSelectedItems).toHaveBeenCalledWith([]);
  });

  it('點擊「全選」呼叫 setSelectedItems 含所有 id', () => {
    const setSelectedItems = vi.fn();
    render(<UrlAnalyzerPanel {...makeProps({ analysisPreview: preview, selectedItems: [], setSelectedItems })} />);
    fireEvent.click(screen.getByText('全選'));
    expect(setSelectedItems).toHaveBeenCalledWith(['i1', 'i2']);
  });

  it('點擊單一項目呼叫 setSelectedItems 切換選取', () => {
    const setSelectedItems = vi.fn();
    render(<UrlAnalyzerPanel {...makeProps({ analysisPreview: preview, selectedItems: ['i1', 'i2'], setSelectedItems })} />);
    fireEvent.click(screen.getByText('道頓堀章魚燒'));
    expect(setSelectedItems).toHaveBeenCalled();
  });
});

describe('UrlAnalyzerPanel — 狀態訊息顯示', () => {
  it('分析成功時顯示成功訊息', () => {
    const props = makeProps({
      submitStatus: { kind: 'success', message: '分析完成，請確認結果' },
      submitStatusStyle: { background: 'green', color: 'white' },
    });
    render(<UrlAnalyzerPanel {...props} />);
    expect(screen.getByText('分析完成，請確認結果')).toBeInTheDocument();
  });

  it('發生錯誤時顯示錯誤訊息', () => {
    const props = makeProps({
      submitStatus: { kind: 'error', message: '分析失敗，請重試' },
      submitStatusStyle: { background: 'red', color: 'white' },
    });
    render(<UrlAnalyzerPanel {...props} />);
    expect(screen.getByText('分析失敗，請重試')).toBeInTheDocument();
  });

  it('idle 狀態不顯示狀態訊息區塊', () => {
    render(<UrlAnalyzerPanel {...makeProps()} />);
    // submitStatus.kind=idle → the message div should not appear (message is empty)
    // The panel heading "貼網址 → 分析 → 確認寫入" still exists but status div is absent
    expect(screen.queryByText('分析完成，請確認結果')).not.toBeInTheDocument();
    expect(screen.queryByText('分析失敗，請重試')).not.toBeInTheDocument();
  });
});
