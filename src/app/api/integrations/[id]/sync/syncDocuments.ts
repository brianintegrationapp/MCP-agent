import { inngest } from "@/inngest/client";
import { IntegrationAppClient } from "@integration-app/sdk";
import { DocumentModel, Document } from "@/models/document";
import { KnowledgeModel, KnowledgeStatus } from "@/models/knowledge";
import connectDB from "@/lib/mongodb";
import { NonRetriableError } from "inngest";
import { withTimeout } from "@/lib/timeout";
import { SyncEventData } from "./types";

interface ListDocumentsActionRecord {
  fields: Exclude<Document, "connectionId" | "content" | "userId">;
}

interface DocumentsResponse {
  output: {
    records: ListDocumentsActionRecord[];
    cursor?: string;
  };
}

// Helper function to check if error is a connection not found error
function isConnectionNotFoundError(
  error: unknown,
  connectionId: string
): boolean {
  return (
    error instanceof Error &&
    error.message.includes(`Connection "${connectionId}" not found`)
  );
}

async function handleSyncFailure({
  eventData,
  errorMessage,
}: {
  errorMessage: string;
  eventData: SyncEventData;
}) {
  const { connectionId } = eventData;

  const existingKnowledge = await KnowledgeModel.findOne({
    connectionId,
  });

  if (!existingKnowledge) {
    // If knowledge doesn't exist, delete all associated documents
    await DocumentModel.deleteMany({ connectionId });

    return {
      cleanupDueToError: true,
    };
  }

  await KnowledgeModel.findOneAndUpdate(
    { connectionId },
    {
      $set: {
        syncStatus: KnowledgeStatus.failed,
        syncCompletedAt: new Date(),
        syncError: errorMessage || "Unknown error occurred",
      },
    },
    { new: true }
  );
}

export const SYNC_EVENT_NAME = "integration/sync-documents";

export const inngest_syncDocuments = inngest.createFunction(
  {
    id: "sync-documents",
    retries: 3,
    onFailure: async (props) => {
      const event = props.event.data;

      const errorMessage = event.error.message;
      const eventData = event.event.data;

      await handleSyncFailure({ eventData, errorMessage });
    },
  },
  { event: SYNC_EVENT_NAME },
  async ({ event, step, logger }) => {
    const { connectionId, userId, token } = event.data as SyncEventData;
    let totalDocumentsSynced = 0;

    const FETCH_PAGE_TIMEOUT = 60000; // 30 seconds timeout
    const MAX_DOCUMENTS = 1000; // Maximum number of documents to sync

    await connectDB();

    const integrationApp = new IntegrationAppClient({ token });
    let cursor: string | undefined;

    // Sync all documents in batches
    while (true) {
      logger.info("Fetching documents batch");
      const result = await step.run(`fetch-documents-batch`, async () => {
        try {
          const fetchPromise = integrationApp
            .connection(connectionId)
            .action("list-content-items")
            .run({ cursor }) as Promise<DocumentsResponse>;

          return await withTimeout(
            fetchPromise,
            FETCH_PAGE_TIMEOUT,
            `Fetching page timed out after ${
              FETCH_PAGE_TIMEOUT / 1000
            } seconds, please try again`
          );
        } catch (error) {
          // Check if the error is due to connection not found
          if (isConnectionNotFoundError(error, connectionId)) {
            throw new NonRetriableError(
              `Connection "${connectionId}" was archived during sync process`
            );
          }

          throw error;
        }
      });

      const records = result.output.records as ListDocumentsActionRecord[];

      const docsToSave = records.map((doc) => ({
        ...doc.fields,
        connectionId,
        isSubscribed: false,
        content: null,
        userId,
      }));

      // Check if adding these documents would exceed our limit
      if (totalDocumentsSynced + docsToSave.length > MAX_DOCUMENTS) {
        const remainingSlots = MAX_DOCUMENTS - totalDocumentsSynced;
        docsToSave.splice(remainingSlots);
      }

      if (docsToSave.length) {
        await step.run(`save-documents-batch`, async () => {
          return await DocumentModel.bulkWrite(
            docsToSave.map((doc) => ({
              updateOne: {
                filter: { id: doc.id, connectionId },
                update: { $set: doc },
                upsert: true,
              },
            }))
          );
        });

        totalDocumentsSynced += docsToSave.length;
      }

      // Break if we've reached the maximum number of documents
      if (totalDocumentsSynced >= MAX_DOCUMENTS) {
        break;
      }

      // Only continue if there's more data to fetch
      cursor = result.output.cursor;
      if (!cursor) break;
    }

    // Update final sync status
    await step.run("complete-sync", async () => {
      // Wait for a bit before marking sync as completed so that the UI can update sync count
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // First check if knowledge still exists
      const existingKnowledge = await KnowledgeModel.findOne({
        connectionId,
      });

      if (!existingKnowledge) {
        throw new NonRetriableError(
          `Knowledge for connection "${connectionId}" not found`
        );
      }

      // If knowledge exists, proceed with normal sync completion
      const knowledge = await KnowledgeModel.findOneAndUpdate(
        { connectionId },
        {
          $set: {
            syncStatus: "completed",
            syncCompletedAt: new Date(),
            syncError: null,
            isTruncated: totalDocumentsSynced >= MAX_DOCUMENTS,
          },
        },
        { new: true }
      );

      return knowledge;
    });

    return { success: true, totalDocumentsSynced };
  }
);
