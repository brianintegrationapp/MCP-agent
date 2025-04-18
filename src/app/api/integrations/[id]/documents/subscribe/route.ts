import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { getAuthFromRequest } from "@/lib/server-auth";
import { generateCustomerAccessToken } from "@/lib/integration-token";
import { triggerDownloadDocumentFlow } from "@/lib/flows";
import { hasAWSCredentials } from "@/lib/s3-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const connectionId = (await params).id;
    const { documentIds, isSubscribed } = await request.json();

    await connectDB();

    /**
     * `documentIds` is an array of document IDs that we need to subscribe to, some
     * of them are documents of file type some are documents of folder
     *
     * We are going to persist this state to the backend and kick off initial download flow
     * for the documents that are of file type
     */

    await DocumentModel.updateMany(
      {
        connectionId,
        id: { $in: documentIds },
      },
      { $set: { isSubscribed } }
    );

    const auth = getAuthFromRequest(request);
    const token = await generateCustomerAccessToken(auth);

    // Trigger download for subscribed documents
    for (const documentId of documentIds) {
      const document = await DocumentModel.findOne({
        connectionId,
        id: documentId,
      });

      const unsubScribeFile = !isSubscribed;
      const noDocumentFound = !document;

      if (unsubScribeFile || noDocumentFound) {
        continue;
      }

      if (document.canDownload && hasAWSCredentials) {
        const run = await triggerDownloadDocumentFlow(
          token,
          connectionId,
          documentId
        );

        console.log(
          `calling download-document in integration flow for document ${documentId}. Run result:`
        );

        console.log(run);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
