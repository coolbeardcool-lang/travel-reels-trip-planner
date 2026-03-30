/**
 * useResponsiveColumns Tests
 *
 * Han 主要用 iPhone Max Pro 17 (390px 寬) 和 iPad mini (744px 寬)
 * 兩種裝置都應觸發 isMobile=true (breakpoint < 980px)
 * 桌機 (1280px) 應觸發 isMobile=false
 */
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveColumns } from './useResponsiveColumns.js';

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
}

afterEach(() => {
  setViewportWidth(1024); // reset
});

describe('useResponsiveColumns', () => {
  it('iPhone Max Pro 寬 (390px) → isMobile=true', () => {
    setViewportWidth(390);
    const { result } = renderHook(() => useResponsiveColumns());
    expect(result.current).toBe(true);
  });

  it('iPad mini 寬 (744px) → isMobile=true', () => {
    setViewportWidth(744);
    const { result } = renderHook(() => useResponsiveColumns());
    expect(result.current).toBe(true);
  });

  it('borderline 979px → isMobile=true', () => {
    setViewportWidth(979);
    const { result } = renderHook(() => useResponsiveColumns());
    expect(result.current).toBe(true);
  });

  it('breakpoint 980px → isMobile=false', () => {
    setViewportWidth(980);
    const { result } = renderHook(() => useResponsiveColumns());
    expect(result.current).toBe(false);
  });

  it('桌機 1280px → isMobile=false', () => {
    setViewportWidth(1280);
    const { result } = renderHook(() => useResponsiveColumns());
    expect(result.current).toBe(false);
  });

  it('視窗從 390px 調整到 1280px → 從 true 變 false', () => {
    setViewportWidth(390);
    const { result } = renderHook(() => useResponsiveColumns());
    expect(result.current).toBe(true);

    act(() => setViewportWidth(1280));
    expect(result.current).toBe(false);
  });
});
