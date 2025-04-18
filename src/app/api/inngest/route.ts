import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { inngest_downloadAndExtractTextFromFile } from "../webhooks/on-download-complete/downloadAndExtractTextFromFile";
import { inngest_syncDocuments } from "../integrations/[id]/sync/syncDocuments";

export const maxDuration = 90;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [inngest_downloadAndExtractTextFromFile, inngest_syncDocuments],
});
