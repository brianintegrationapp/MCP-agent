import { DocumentModel } from "@/models/document";

/**
 * Get all document IDs in a document tree starting from a root document
 * @param rootDocumentId - The ID of the root document
 * @returns Array of document IDs including the root and all its descendants
 */
export async function getAllDocsInTree(
  rootDocumentId: string
): Promise<string[]> {
  // Get the root document
  const rootDoc = await DocumentModel.findOne({ id: rootDocumentId });
  if (!rootDoc) {
    return [];
  }

  // If the root document cannot have children, return the root document ID
  if (!rootDoc.canHaveChildren) {
    return [rootDocumentId];
  }

  const children = await DocumentModel.find({ parentId: rootDocumentId });

  // Recursively get IDs for all children
  const childrenIds = await Promise.all(
    children.map((child) => getAllDocsInTree(child.id))
  );

  return [rootDocumentId, ...childrenIds.flat()];
}

/**
 * Recursively checks if any parent document in the hierarchy is subscribed
 * @param documentId - The ID of the document to start checking from
 * @returns Promise<boolean> - Returns true if any parent document is subscribed, false otherwise
 */
export async function findParentSubscription(
  parentDocumentId: string | null
): Promise<boolean> {
  if (!parentDocumentId) {
    return false;
  }

  let document = await DocumentModel.findOne({ id: parentDocumentId });

  if (!document) {
    return false;
  }

  if (document.isSubscribed) {
    return true;
  }

  while (document?.parentId) {
    document = await DocumentModel.findOne({ id: document.parentId });

    if (document?.isSubscribed) {
      return true;
    }
  }

  return false;
}
