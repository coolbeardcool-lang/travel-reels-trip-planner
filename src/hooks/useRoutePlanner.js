import { useState } from "react";

export function useRoutePlanner({
  hasCitySelected,
  selectedCitySlug,
  setSelectedCitySlug,
  selectedContentMode,
  setSelectedContentMode,
  routeItems,
  routeOrder,
  setRouteOrder,
  setPendingRouteIds,
}) {
  const [dragSourceId, setDragSourceId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trt:routes") || "[]");
    } catch {
      return [];
    }
  });
  const [newRouteName, setNewRouteName] = useState("");
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);

  function handleDragStart(e, id) {
    setDragSourceId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    setDragOverId(id);
  }

  function handleDrop(e, targetId) {
    e.preventDefault();
    if (!dragSourceId || dragSourceId === targetId) {
      setDragSourceId(null);
      setDragOverId(null);
      return;
    }
    const base = routeOrder.length ? routeOrder : routeItems.map((i) => i.id);
    const arr = [...base];
    const from = arr.indexOf(dragSourceId);
    const to = arr.indexOf(targetId);
    if (from === -1 && to !== -1) {
      arr.splice(to, 0, dragSourceId);
    } else if (from !== -1 && to !== -1) {
      arr.splice(from, 1);
      arr.splice(arr.indexOf(targetId), 0, dragSourceId);
    }
    setRouteOrder(arr);
    setDragSourceId(null);
    setDragOverId(null);
  }

  function handleSaveRoute() {
    if (!newRouteName.trim() || !hasCitySelected || !routeItems.length) return;
    const route = {
      id: Date.now().toString(),
      name: newRouteName.trim(),
      citySlug: selectedCitySlug,
      mode: selectedContentMode,
      itemIds: routeItems.map((i) => i.id),
      order: routeItems.map((i) => i.id),
      createdAt: new Date().toISOString(),
    };
    const updated = [route, ...savedRoutes].slice(0, 20);
    localStorage.setItem("trt:routes", JSON.stringify(updated));
    setSavedRoutes(updated);
    setNewRouteName("");
  }

  function handleLoadRoute(route) {
    setSelectedCitySlug(route.citySlug);
    setSelectedContentMode(route.mode || "spots");
    setPendingRouteIds({ ids: route.itemIds, order: route.order });
    setShowSavedRoutes(false);
  }

  async function handleCopyShare() {
    const url = new URL(window.location.href);
    url.searchParams.set("city", selectedCitySlug);
    url.searchParams.set("spots", routeItems.map((i) => i.id).join(","));
    const order = routeOrder.join(",");
    if (order) url.searchParams.set("order", order);
    const shareUrl = url.toString();
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("🔗 連結已複製到剪貼簿！");
    } catch {
      window.prompt("複製以下連結：", shareUrl);
    }
  }

  return {
    dragSourceId,
    dragOverId,
    setDragSourceId,
    setDragOverId,
    savedRoutes,
    newRouteName,
    setNewRouteName,
    showSavedRoutes,
    setShowSavedRoutes,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSaveRoute,
    handleLoadRoute,
    handleCopyShare,
  };
}
