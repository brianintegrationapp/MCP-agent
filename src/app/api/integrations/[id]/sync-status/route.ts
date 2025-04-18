import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { KnowledgeModel } from "@/models/knowledge";
import {
  SyncStatusRouteSuccessResponse,
  SyncStatusRouteErrorResponse,
} from "./types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<
  NextResponse<SyncStatusRouteSuccessResponse | SyncStatusRouteErrorResponse>
> {
  try {
    const connectionId = (await params).id;
    await connectDB();

    const knowledge = await KnowledgeModel.findOne({ connectionId }).lean();

    if (!knowledge) {
      return NextResponse.json(
        { error: "Knowledge does not exist", code: "404" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: knowledge.syncStatus ?? null,
      error: knowledge.syncError ?? null,
      startedAt: knowledge.syncStartedAt ?? null,
      completedAt: knowledge.syncCompletedAt ?? null,
    });
  } catch (error) {
    console.error("Failed to get sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status", code: "500" },
      { status: 500 }
    );
  }
}
