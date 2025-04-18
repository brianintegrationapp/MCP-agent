import { v4 as uuidv4 } from "uuid";
import {
  isSupportedFile,
  Unstructured,
  UnstructuredIsEnabled,
} from "./text-extraction-utils";

import {
  deleteFileFromS3,
  getS3ObjectStream,
  processAndUploadFileToS3,
} from "@/lib/s3-utils";

import { inngest } from "@/inngest/client";
import { DocumentModel } from "@/models/document";
import { NonRetriableError } from "inngest";
import connectDB from "@/lib/mongodb";
import { DownloadState } from "@/types/download";

const TEXT_EXTRACTION_TIMEOUT = 55 * 1000; // 55 seconds

interface DownloadEventData {
  downloadURI: string;
  documentId: string;
  connectionId: string;
  title: string;
  currentStorageKey?: string;
}

export const inngest_downloadAndExtractTextFromFile = inngest.createFunction(
  {
    id: "download-and-extract-text-from-file",
    retries: 3,
    onFailure: async (props) => {
      const event = props.event.data;

      const eventData = event.event.data;
      const errorMessage = event.error.message;

      await DocumentModel.updateOne(
        { connectionId: eventData.connectionId, id: eventData.documentId },
        {
          $set: {
            downloadState: DownloadState.FAILED,
            downloadError:
              errorMessage || "Error downloading or extracting text",
          },
        }
      );
    },
  },
  { event: "document/download-and-extract-text-from-file" },
  async ({ event, step, logger }) => {
    const { downloadURI, documentId, connectionId, title, currentStorageKey } =
      event.data as DownloadEventData;

    await connectDB();

    // Mark document as downloading
    await step.run("mark-document-as-downloading", async () => {
      await DocumentModel.updateOne(
        { connectionId, id: documentId },
        { $set: { downloadState: DownloadState.DOWNLOADING_FROM_URL } }
      );
    });

    // Download and upload file to S3
    const { newStorageKey } = await step.run(
      "process-and-upload-file",
      async () => {
        const { keyWithExtension } = await processAndUploadFileToS3(
          downloadURI,
          `${connectionId}/${documentId}/${uuidv4()}/${title}`
        );

        return {
          newStorageKey: keyWithExtension,
        };
      }
    );

    // Clean up old S3 file if needed
    if (currentStorageKey) {
      await step.run("cleanup-old-file", async () => {
        await deleteFileFromS3(currentStorageKey);
        logger.info(`Deleted old file from S3: ${currentStorageKey}`);
      });
    }

    // Update document with new storage key
    const updatedDoc = await step.run("update-document-storage", async () => {
      const doc = await DocumentModel.findOneAndUpdate(
        { connectionId, id: documentId },
        {
          $set: {
            downloadState: DownloadState.DONE,
            lastSyncedAt: new Date().toISOString(),
            storageKey: newStorageKey,
          },
        },
        { new: true }
      ).lean();

      if (!doc) {
        throw new NonRetriableError("Failed to update document");
      }

      return doc;
    });

    // Extract text if possible
    const shouldExtractText =
      Unstructured.hasUnstructuredCredentials &&
      updatedDoc.storageKey &&
      UnstructuredIsEnabled &&
      isSupportedFile(updatedDoc.title);

    if (shouldExtractText) {
      // Mark document as processing
      await step.run("mark-text-extraction-start", async () => {
        await DocumentModel.updateOne(
          { connectionId, id: documentId },
          { $set: { downloadState: DownloadState.EXTRACTING_TEXT } }
        );
      });

      // Extract text content
      const { text: extractedText, timedOut } = await step.run(
        "extract-text",
        async () => {
          const { Body } = await getS3ObjectStream(newStorageKey);

          if (!Body) {
            throw new Error("Failed to get file content from S3");
          }

          logger.info(`Got file content from S3: ${updatedDoc.title}`);
          const chunks: Buffer[] = [];
          for await (const chunk of Body as AsyncIterable<Buffer>) {
            chunks.push(chunk);
          }
          const fileBuffer = Buffer.concat(chunks);

          logger.info(`Sending file to Unstructured: ${updatedDoc.title}`);

          // Create a timeout promise
          const timeout = new Promise<string>((_, reject) => {
            setTimeout(() => {
              reject(new Error("Text extraction timed out"));
            }, TEXT_EXTRACTION_TIMEOUT);
          });

          try {
            // Race between the text extraction and timeout
            const text = await Promise.race([
              Unstructured.extractTextFromFile({
                fileName: updatedDoc.title,
                content: fileBuffer,
              }),
              timeout,
            ]);

            logger.info(`Unstructured extracted text successfully`);
            return {
              text,
              timedOut: false,
            };
          } catch (error: unknown) {
            logger.error(
              `Text extraction failed or timed out: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );

            await DocumentModel.updateOne(
              { connectionId, id: documentId },
              {
                $set: {
                  downloadState: DownloadState.FAILED,
                  downloadError:
                    error instanceof Error
                      ? error.message
                      : "Unable to extract text from file",
                },
              }
            );

            return {
              text: "",
              timedOut: true,
            };
          }
        }
      );

      if (!timedOut) {
        // Update document with extracted text
        await step.run("save-extracted-text", async () => {
          await DocumentModel.updateOne(
            { connectionId, id: documentId },
            {
              $set: {
                content: extractedText,
                downloadState: DownloadState.DONE,
              },
            }
          );
        });
      }
    }

    return { success: true };
  }
);
