import { verifyIntegrationAppToken } from "@/lib/integration-app-auth";
import { findParentSubscription } from "@/lib/document-utils";
import { triggerDownloadDocumentFlow } from "@/lib/flows";
import { NextRequest, NextResponse } from "next/server";
import { DocumentModel } from "@/models/document";
import connectDB from "@/lib/mongodb";
import { z } from "zod";

const webhookSchema = z.object({
  connectionId: z.string(),
  fields: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    parentId: z.string().optional(),
    canHaveChildren: z.boolean(),
    resourceURI: z.string().url(),
  }),
});

/**
 * This webhook is triggered when a document is created on external apps
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  console.log("Body:", body);

  const verificationResult = await verifyIntegrationAppToken(request);

  if (!verificationResult) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { sub: userId } = verificationResult;

  const payload = webhookSchema.safeParse(body);

  if (!payload.success) {
    console.error("Invalid webhook payload:", payload.error);
    return NextResponse.json(
      { error: "Invalid webhook payload" },
      { status: 400 }
    );
  }

  const { fields, connectionId } = payload.data;

  if (!userId) {
    console.error("User ID not found for connection:", connectionId);
    return NextResponse.json(
      { error: "User ID not found for connection" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const existingDoc = await DocumentModel.findOne({
      id: fields.id,
      connectionId,
    });

    if (!existingDoc) {
      let isSubscribed = false;

      if (fields.parentId) {
        const parentHasSubscription = await findParentSubscription(
          fields.parentId
        );

        isSubscribed = parentHasSubscription;
      }

      const isFile = !fields.canHaveChildren;

      const shouldDownload = isFile && isSubscribed;

      /**
       * If some parent document is subscribed, we need to add isSubscribed to this document
       * and kick off the download flow if it's a file
       */
      await DocumentModel.bulkWrite([
        {
          insertOne: {
            document: {
              ...fields,
              isSubscribed: isSubscribed,
              userId,
              connectionId,
            },
          },
        },
      ]);

      if (shouldDownload) {
        await triggerDownloadDocumentFlow(
          request.headers.get("x-integration-app-token")!,
          connectionId,
          fields.id
        );
      }
    } else {
      console.log(`Document with id ${fields.id} already exists`);
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
