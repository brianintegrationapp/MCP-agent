import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";
import { inngest } from "@/inngest/client";
import { generateCustomerAccessToken } from "@/lib/integration-token";
import connectDB from "@/lib/mongodb";
import { KnowledgeModel, KnowledgeStatus } from "@/models/knowledge";
import { SyncEventData, SyncRequestBody, SyncRouteResponse } from "./types";
import { SYNC_EVENT_NAME } from "./syncDocuments";
import { DocumentModel } from "@/models/document";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SyncRouteResponse>> {
  try {
    const connectionId = (await params).id;
    const { integrationId, integrationName, integrationLogo } =
      (await request.json()) as SyncRequestBody;

    const auth = getAuthFromRequest(request);
    const token = await generateCustomerAccessToken(auth);

    await connectDB();

    const userId = auth.customerId;

    await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      {
        $set: {
          userId,
          integrationId,
          integrationName,
          integrationLogo,
          syncStatus: KnowledgeStatus.in_progress,
          syncStartedAt: new Date(),
          syncError: null,
          isTruncated: false,
        },
      },
      { upsert: true }
    );

    const eventData = {
      connectionId,
      token,
      userId: auth.customerId,
    } satisfies SyncEventData;

    // Clear existing documents
    await DocumentModel.deleteMany({ connectionId });

    await inngest.send<{ name: string; data: SyncEventData }>({
      name: SYNC_EVENT_NAME,
      data: eventData,
    });

    return NextResponse.json({ status: KnowledgeStatus.in_progress });
  } catch (error) {
    console.error("Failed to start sync:", error);
    return NextResponse.json(
      { status: KnowledgeStatus.failed, message: "Failed to start sync" },
      { status: 500 }
    );
  }
}
