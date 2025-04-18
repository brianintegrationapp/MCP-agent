import { KnowledgeStatus } from "@/models/knowledge";

export interface SyncRouteSuccessResponse {
  status: KnowledgeStatus;
}

export interface SyncRouteErrorResponse {
  status: KnowledgeStatus;
  message: string;
}

export type SyncRouteResponse =
  | SyncRouteSuccessResponse
  | SyncRouteErrorResponse;

export interface SyncEventData {
  connectionId: string;
  userId: string;
  token: string;
  integrationId?: string;
  integrationName?: string;
  integrationLogo?: string;
}

export interface SyncRequestBody {
  integrationId: string;
  integrationName: string;
  integrationLogo?: string;
}
