export type SyncStatusSuccessResponse = {
  status: string;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type SyncStatusErrorResponse = {
  error: string;
};
