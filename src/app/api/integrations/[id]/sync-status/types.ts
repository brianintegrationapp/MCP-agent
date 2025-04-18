import { KnowledgeStatus } from "@/models/knowledge";

export type SyncStatusRouteSuccessResponse = {
  status: KnowledgeStatus | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type SyncStatusRouteErrorResponse = {
  error: string;
  code: string;
};
