export const PERMISSION = {
  propertiesView: "properties:view",
  favouritesManage: "favourites:manage",
  searchesSave: "searches:save",
  profileEdit: "profile:edit",
  alertsAdvanced: "alerts:advanced",
  reportsView: "reports:view",
  valuation: "valuation",
  heatmaps: "heatmaps",
} as const;

export type Permission =
  (typeof PERMISSION)[keyof typeof PERMISSION];
