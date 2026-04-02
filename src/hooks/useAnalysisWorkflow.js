import { useCallback, useEffect, useState } from "react";
import { ANALYZE_API_PATH, CONFIRM_ANALYSIS_API_PATH } from "../config/theme.js";
import { normalizeCitySlugValue, normalizeAnalysisPayload } from "../utils/normalize.js";

const SOCIAL_URL_RE = /^https?:\/\/(www\.)?(instagram\.com|threads\.net|facebook\.com|fb\.watch|tiktok\.com|youtube\.com|youtu\.be)\//i;

export function useAnalysisWorkflow({ selectedCitySlug, selectedCity, setLoadedSpots, setLoadedEvents }) {
  const [submittedUrls, setSubmittedUrls] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("trt:submittedUrls") || "[]")); }
    catch { return new Set(); }
  });
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitType, setSubmitType] = useState("auto");
  const [submitCitySlug, setSubmitCitySlug] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [analysisPreview, setAnalysisPreview] = useState(null);
  const [submitStatus, setSubmitStatus] = useState({ kind: "idle", message: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [writeOverlay, setWriteOverlay] = useState({ status: "idle", dispatched: false, submittedItems: [], result: null });
  const [selectedAnalysisItemIds, setSelectedAnalysisItemIds] = useState(new Set());
  const [inputExpanded, setInputExpanded] = useState(false);
  const [clipboardPrompt, setClipboardPrompt] = useState(null);
  const [urlQueue, setUrlQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem("trt:urlQueue") || "[]"); } catch { return []; }
  });

  function resetSubmitForm() {
    setInputExpanded(false);
    setSubmitUrl("");
    setSubmitTitle("");
    setSubmitType("auto");
    setSubmitCitySlug("");
    setSubmitNotes("");
    setAnalysisPreview(null);
    setSubmitStatus({ kind: "idle", message: "" });
  }

  const handleClipboardCheck = useCallback(async () => {
    if (submitUrl || inputExpanded) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && SOCIAL_URL_RE.test(text.trim()) && !submittedUrls.has(text.trim())) {
        setClipboardPrompt(text.trim());
      }
    } catch {}
  }, [submitUrl, inputExpanded, submittedUrls]);

  useEffect(() => {
    const onFocus = () => handleClipboardCheck();
    window.addEventListener("focus", onFocus);
    const timer = setTimeout(handleClipboardCheck, 500);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearTimeout(timer);
    };
  }, [handleClipboardCheck]);

  useEffect(() => {
    if (analysisPreview?.items?.length) {
      setSelectedAnalysisItemIds(new Set(analysisPreview.items.map((i) => i.id)));
    } else {
      setSelectedAnalysisItemIds(new Set());
    }
  }, [analysisPreview]);

  function handleSaveToQueue(url) {
    if (!url?.trim()) return;
    const cleanUrl = url.trim();
    setUrlQueue((prev) => {
      if (prev.some((q) => q.url === cleanUrl)) return prev;
      const updated = [...prev, { url: cleanUrl, addedAt: new Date().toISOString() }];
      try { localStorage.setItem("trt:urlQueue", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function handleRemoveFromQueue(url) {
    setUrlQueue((prev) => {
      const updated = prev.filter((q) => q.url !== url);
      try { localStorage.setItem("trt:urlQueue", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function handleLoadFromQueue(url) {
    setSubmitUrl(url);
    setInputExpanded(true);
    handleRemoveFromQueue(url);
  }

  async function handleAnalyzeUrl(e) {
    e.preventDefault();
    const cleanUrl = submitUrl.trim();
    if (!cleanUrl) {
      setSubmitStatus({ kind: "error", message: "請先貼上 Reel 或網址。" });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisPreview(null);
    setSubmitStatus({ kind: "loading", message: "正在分析網址內容，完成後會先顯示給你確認。" });
    try {
      const response = await fetch(ANALYZE_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanUrl,
          hints: {
            title: submitTitle.trim(),
            type: submitType === "auto" ? "" : submitType,
            citySlug: normalizeCitySlugValue(submitCitySlug),
            notes: submitNotes.trim(),
          },
        }),
      });
      const text = await response.text();
      let payload = {};
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
      if (!response.ok) throw new Error(payload?.message || `分析失敗，HTTP ${response.status}`);
      const preview = normalizeAnalysisPayload(payload, {
        sourceTitle: submitTitle.trim(),
        contentKind: submitType === "auto" ? "source_only" : submitType,
        citySlug: submitCitySlug,
      });
      setAnalysisPreview(preview);
      setSubmitStatus({ kind: "success", message: "分析完成。請先檢查下方結果，確認無誤後再寫入資料庫。" });
    } catch (error) {
      setSubmitStatus({ kind: "error", message: error instanceof Error ? error.message : "分析失敗。" });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleConfirmAnalysis() {
    if (!analysisPreview) {
      setSubmitStatus({ kind: "error", message: "目前沒有可確認寫入的分析結果。" });
      return;
    }
    if (!analysisPreview.citySlug) {
      setSubmitStatus({ kind: "error", message: "請先確認城市（citySlug 不可為空），再寫入資料庫。" });
      return;
    }
    if ((analysisPreview.confidence || 0) === 0 && analysisPreview.needsReview) {
      setSubmitStatus({ kind: "error", message: "信心值為 0%，請手動補充城市或類型提示後重新分析，再寫入資料庫。" });
      return;
    }
    const selectedItems = analysisPreview.items.filter((i) => selectedAnalysisItemIds.has(i.id));
    if (selectedItems.length === 0 && analysisPreview.contentKind !== "source_only") {
      setSubmitStatus({ kind: "error", message: "請至少選取一個項目後再寫入。" });
      return;
    }
    const previewToSubmit = { ...analysisPreview, items: selectedItems.map((i) => ({ ...i, citySlug: analysisPreview.citySlug })) };
    setIsConfirming(true);
    setWriteOverlay({ status: "writing", dispatched: false, submittedItems: selectedItems, result: null });
    setSubmitStatus({ kind: "loading", message: "正在確認並寫入資料庫…" });
    try {
      const response = await fetch(CONFIRM_ANALYSIS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: submitUrl.trim(),
          sourceTitle: submitTitle.trim() || analysisPreview.sourceTitle,
          notes: submitNotes.trim(),
          analysis: previewToSubmit,
        }),
      });
      const text = await response.text();
      let payload = {};
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
      if (!response.ok) {
        setWriteOverlay({ status: "idle", dispatched: false, submittedItems: [], result: null });
        throw new Error(payload?.message || `寫入失敗，HTTP ${response.status}`);
      }

      const confirmedUrl = submitUrl.trim();
      if (confirmedUrl) {
        setSubmittedUrls((prev) => {
          const next = new Set(prev);
          next.add(confirmedUrl);
          try { localStorage.setItem("trt:submittedUrls", JSON.stringify([...next])); } catch {}
          return next;
        });
      }

      setWriteOverlay({ status: "syncing", dispatched: Boolean(payload.dispatched), submittedItems: selectedItems, result: payload });

      if (selectedItems.length && analysisPreview.citySlug === selectedCitySlug) {
        const ts = Date.now();
        const optimisticSpots = [];
        const optimisticEvents = [];
        selectedItems.forEach((item, i) => {
          const base = {
            id: `_opt_${ts}_${i}`,
            name: item.name || "未命名",
            city: selectedCity?.label || "",
            citySlug: analysisPreview.citySlug,
            area: item.area || "",
            category: item.category || "景點",
            description: item.description || "",
            tags: Array.isArray(item.tags) ? item.tags : [],
            thumbnail: item.thumbnail || "",
            bestTime: item.best_time || "下午",
            stayMinutes: item.stay_minutes || 30,
            lat: 0,
            lng: 0,
            confidence: "推定",
            mapUrl: "",
            sourceId: "",
            sourceTitle: analysisPreview.sourceTitle || "",
            sourceUrl: submitUrl.trim(),
            _optimistic: true,
          };
          if (item.itemKind === "event") {
            optimisticEvents.push({ ...base, startsOn: item.starts_on || null, endsOn: item.ends_on || null, startTime: "", endTime: "", ticketType: "", priceNote: "" });
          } else {
            optimisticSpots.push({ ...base, priorityScore: 0, notes: "" });
          }
        });
        if (optimisticSpots.length) setLoadedSpots((prev) => [...prev, ...optimisticSpots]);
        if (optimisticEvents.length) setLoadedEvents((prev) => [...prev, ...optimisticEvents]);
      }

      resetSubmitForm();
    } catch (error) {
      setSubmitStatus({ kind: "error", message: error instanceof Error ? error.message : "寫入失敗。" });
    } finally {
      setIsConfirming(false);
    }
  }

  const isDuplicateUrl = Boolean(submitUrl.trim() && submittedUrls.has(submitUrl.trim()));
  const shouldShowInput = inputExpanded || Boolean(submitUrl || analysisPreview);

  return {
    submitUrl, setSubmitUrl,
    submitTitle, setSubmitTitle,
    submitType, setSubmitType,
    submitCitySlug, setSubmitCitySlug,
    submitNotes, setSubmitNotes,
    analysisPreview, setAnalysisPreview,
    submitStatus, setSubmitStatus,
    isAnalyzing, isConfirming,
    writeOverlay, setWriteOverlay,
    selectedAnalysisItemIds, setSelectedAnalysisItemIds,
    inputExpanded, setInputExpanded,
    clipboardPrompt, setClipboardPrompt,
    urlQueue,
    isDuplicateUrl,
    shouldShowInput,
    resetSubmitForm,
    handleAnalyzeUrl,
    handleConfirmAnalysis,
    handleSaveToQueue,
    handleRemoveFromQueue,
    handleLoadFromQueue,
  };
}
