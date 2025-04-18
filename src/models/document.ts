import { DownloadStateType, DownloadState } from "@/types/download";
import { Schema, model, models } from "mongoose";

export interface Document {
  _id: string;
  id: string;
  title: string;
  canHaveChildren: boolean;
  canDownload: boolean;
  resourceURI: string;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  connectionId: string;
  userId: string;
  isSubscribed: boolean;
  content?: string;
  lastSyncedAt: string;
  storageKey?: string;

  downloadState?: DownloadStateType;
  downloadError?: string;
}

interface DocumentWithConnection extends Document {
  connectionId: string;
  content?: string;
}

const documentSchema = new Schema<DocumentWithConnection>({
  id: String,
  title: String,
  canHaveChildren: Boolean,
  canDownload: Boolean,
  createdAt: String,
  updatedAt: String,
  resourceURI: String,
  storageKey: {
    type: String,
    default: null,
  },
  parentId: {
    type: String,
    default: null,
  },
  connectionId: String,
  userId: String,
  isSubscribed: {
    type: Boolean,
    default: false,
  },
  content: {
    type: String,
    default: null,
  },
  lastSyncedAt: {
    type: String,
    default: null,
  },
  downloadState: {
    type: String,
    enum: Object.values(DownloadState),
    default: null,
  },
  downloadError: {
    type: String,
    default: null,
  },
});

// Create compound unique index on business key
documentSchema.index({ id: 1, connectionId: 1 }, { unique: true });

if (models.Document) {
  delete models.Document;
}

export const DocumentModel = model<DocumentWithConnection>(
  "Document",
  documentSchema
);
