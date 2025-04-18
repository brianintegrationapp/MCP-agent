export const DownloadState = {
  FLOW_TRIGGERED: "FLOW_TRIGGERED",
  DOWNLOADING_FROM_URL: "DOWNLOADING_FROM_URL",
  EXTRACTING_TEXT: "EXTRACTING_TEXT",
  DONE: "DONE",
  FAILED: "FAILED",
} as const;

export type DownloadStateType =
  (typeof DownloadState)[keyof typeof DownloadState];
