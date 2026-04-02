import React from "react";
import { MapSection as MapSectionBase } from "./MapSectionBase.jsx";
import { useResolvedLocations } from "../hooks/useResolvedLocations.js";

export function MapSection(props) {
  const { activeCollection, effectiveVisibleIds, visibleItems } = props;
  const { resolvedItems } = useResolvedLocations({
    items: activeCollection,
    visibleIds: effectiveVisibleIds,
  });

  const resolvedItemMap = React.useMemo(
    () => new Map(resolvedItems.map((item) => [item.id, item])),
    [resolvedItems]
  );

  const resolvedVisibleItems = React.useMemo(
    () => visibleItems.map((item) => resolvedItemMap.get(item.id) || item),
    [visibleItems, resolvedItemMap]
  );

  return React.createElement(MapSectionBase, {
    ...props,
    activeCollection: resolvedItems,
    visibleItems: resolvedVisibleItems,
  });
}
