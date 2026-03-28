import { useState, useCallback } from "react";

// ── 工具函式 ──────────────────────────────────────────────
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ── API 呼叫 ──────────────────────────────────────────────
async function apiAnalyzeUrl(url) {
  const res = await fetch("/api/analyze-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "分析失敗");
  return data;
}

async function apiConfirmAnalysis({ url, sourceTitle, notes, analysis }) {
  const res = await fetch("/api/confirm-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, sourceTitle, notes, analysis }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "寫入失敗");
  return data;
}

// ── Badge ─────────────────────────────────────────────────
function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-gray-100 text-gray-700",
    cached: "bg-yellow-100 text-yellow-800",
    event: "bg-blue-100 text-blue-800",
    spot: "bg-green-100 text-green-800",
    source_only: "bg-gray-100 text-gray-600",
    review: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        styles[variant] || styles.default
      )}
    >
      {children}
    </span>
  );
}

// ── Step 1：輸入網址 ──────────────────────────────────────
function AnalyzeForm({ onResult }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      try {
        const result = await apiAnalyzeUrl(trimmed);
        onResult(trimmed, result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [url, onResult]
  );

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🗺️</div>
        <h1 className="text-2xl font-bold text-gray-900">Travel Reels Trip Planner</h1>
        <p className="text-gray-500 mt-2 text-sm">
          貼上 Instagram Reel、Threads 或活動頁網址，自動整理成旅遊資料庫
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.instagram.com/reel/..."
          required
          disabled={loading}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "分析中…" : "分析網址"}
        </button>
        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}
      </form>
    </div>
  );
}

// ── Step 2：預覽分析結果 ───────────────────────────────────
function AnalysisPreview({ url, result, onConfirmed, onReset }) {
  const [sourceTitle, setSourceTitle] = useState(result.sourceTitle || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiConfirmAnalysis({
        url,
        sourceTitle: sourceTitle || result.sourceTitle,
        notes,
        analysis: result,
      });
      onConfirmed(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const kindLabel = {
    spot: "景點 / 美食",
    event: "活動 / 展覽",
    source_only: "來源收藏",
  };

  return (
    <div className="max-w-xl mx-auto mt-10 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">分析結果預覽</h2>
        <div className="flex gap-2">
          {result.cached && <Badge variant="cached">⚡ 快取</Badge>}
          {result.needsReview && <Badge variant="review">需審查</Badge>}
          <Badge variant={result.contentKind}>
            {kindLabel[result.contentKind] || result.contentKind}
          </Badge>
        </div>
      </div>

      {/* 可編輯的來源標題 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">來源標題（可修改）</label>
        <input
          type="text"
          value={sourceTitle}
          onChange={(e) => setSourceTitle(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 資訊列表 */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
        <Row label="平台" value={result.sourcePlatform} />
        <Row label="城市" value={result.citySlug || "—"} />
        <Row label="信心度" value={result.confidence != null ? `${Math.round(result.confidence * 100)}%` : "—"} />
        <Row label="摘要" value={result.summary || "—"} />
        <Row label="Analysis ID" value={<code className="text-xs">{result.analysis_id || result.analysisId}</code>} />
      </div>

      {/* 擷取項目 */}
      {result.items && result.items.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">擷取項目（{result.items.length}）</h3>
          <ul className="space-y-2">
            {result.items.map((item, i) => (
              <li key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-gray-900">{item.name}</div>
                {item.area && <div className="text-gray-500 text-xs mt-0.5">{item.area}</div>}
                {item.category && <Badge>{item.category}</Badge>}
                {item.description && (
                  <div className="text-gray-600 text-xs mt-1">{item.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 備註 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">備註（選填）</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="補充說明..."
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "寫入中…" : "✅ 確認寫入 Notion"}
        </button>
        <button
          onClick={onReset}
          disabled={loading}
          className="px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          取消
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-20 shrink-0">{label}</span>
      <span className="text-gray-900 break-all">{value}</span>
    </div>
  );
}

// ── Step 3：寫入完成 ──────────────────────────────────────
function SuccessView({ result, onReset }) {
  return (
    <div className="max-w-xl mx-auto mt-10 px-4 text-center space-y-4">
      <div className="text-5xl">✅</div>
      <h2 className="text-xl font-semibold text-gray-900">已寫入 Notion！</h2>
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-left space-y-1">
        {result.created?.sourcePageId && (
          <p>Sources 頁面 ID：<code className="text-xs">{result.created.sourcePageId}</code></p>
        )}
        {result.created?.spots?.length > 0 && (
          <p>建立景點：{result.created.spots.map((s) => s.name).join("、")}</p>
        )}
        {result.created?.events?.length > 0 && (
          <p>建立活動：{result.created.events.map((e) => e.name).join("、")}</p>
        )}
        {result.dispatched && <p className="text-green-600">已觸發 GitHub Actions 同步</p>}
      </div>
      <button
        onClick={onReset}
        className="bg-blue-600 text-white rounded-lg px-6 py-3 text-sm font-medium hover:bg-blue-700 transition"
      >
        再貼一個網址
      </button>
    </div>
  );
}

// ── 主元件：狀態機 ────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("input"); // "input" | "preview" | "success"
  const [pendingUrl, setPendingUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);

  const handleResult = useCallback((url, result) => {
    setPendingUrl(url);
    setAnalysisResult(result);
    setStep("preview");
  }, []);

  const handleConfirmed = useCallback((result) => {
    setConfirmResult(result);
    setStep("success");
  }, []);

  const handleReset = useCallback(() => {
    setPendingUrl(null);
    setAnalysisResult(null);
    setConfirmResult(null);
    setStep("input");
  }, []);

  if (step === "preview" && analysisResult) {
    return (
      <AnalysisPreview
        url={pendingUrl}
        result={analysisResult}
        onConfirmed={handleConfirmed}
        onReset={handleReset}
      />
    );
  }

  if (step === "success" && confirmResult) {
    return <SuccessView result={confirmResult} onReset={handleReset} />;
  }

  return <AnalyzeForm onResult={handleResult} />;
}
