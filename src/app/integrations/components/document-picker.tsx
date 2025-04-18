import { useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/app/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Integration } from "@integration-app/sdk";
import { Input } from "@/components/ui/input";
import type { Document } from "@/models/document";
import {
  FileIcon,
  RefreshCcwIcon,
  Loader2Icon,
  ExternalLinkIcon,
  ChevronRightIcon,
  FolderIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useDocumentNavigation } from "../hooks/use-document-navigation";
import { ErrorState } from "./error-state";
import { useDocuments } from "../hooks/useDocuments";

const Icons = {
  file: FileIcon,
  folder: FolderIcon,
  chevronRight: ChevronRightIcon,
  refresh: RefreshCcwIcon,
  spinner: Loader2Icon,
  externalLink: ExternalLinkIcon,
} as const;

interface BreadcrumbItem {
  id: string;
  title: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-2 px-4 py-2 text-sm text-gray-500 bg-gray-50 rounded-md">
      <button
        onClick={() => onNavigate(-1)}
        className="hover:text-gray-900 transition-colors"
      >
        Root
      </button>
      {items.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center gap-2">
          <Icons.chevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => onNavigate(index)}
            className="hover:text-gray-900 transition-colors"
          >
            {crumb.title}
          </button>
        </div>
      ))}
    </div>
  );
}

interface DocumentListProps {
  folders: Document[];
  files: Document[];
  onFolderClick: (id: string, title: string) => void;
  onSubscribe: (document: Document) => void;
  isSubscribing: boolean;
}

function DocumentList({
  folders,
  files,
  onFolderClick,
  onSubscribe,
}: DocumentListProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No items found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="flex items-center gap-3 py-2 px-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => onFolderClick(folder.id, folder.title)}
        >
          <Checkbox
            checked={folder.isSubscribed}
            onCheckedChange={() => onSubscribe(folder)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icons.folder className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span
              className={cn("truncate", {
                "text-blue-600": folder.isSubscribed,
              })}
            >
              {folder.title}
            </span>
          </div>
          <Icons.chevronRight className="h-4 w-4 text-gray-400" />
        </div>
      ))}

      {files.map((document) => (
        <div
          key={document.id}
          className="flex items-center gap-3 py-2 px-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => onSubscribe(document)}
        >
          <Checkbox
            checked={document.isSubscribed}
            onCheckedChange={() => onSubscribe(document)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icons.file className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span
              className={cn("truncate", {
                "text-blue-600": document.isSubscribed,
              })}
            >
              {document.title}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface LoadingStateProps {
  message: string;
}

function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icons.spinner className="h-8 w-8 animate-spin mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

interface DocumentPickerProps {
  integration: Integration;
  onComplete: () => void;
  onClose: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSyncing: boolean;
  handleStartSync: (params: { connectionId: string }) => Promise<void>;
  syncError?: string | null;
}

export function DocumentPicker({
  integration,
  onComplete,
  onClose,
  open,
  onOpenChange,
  isSyncing,
  handleStartSync,
  syncError,
}: DocumentPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const {
    documents,
    isTruncated,
    setDocuments,
    loading,
    error: fetchDocumentsError,
    fetchDocuments,
  } = useDocuments(integration.connection?.id, isSyncing);

  const {
    currentFolders,
    currentFiles,
    breadcrumbs,
    navigateToFolder,
    navigateToBreadcrumb,
  } = useDocumentNavigation(documents, searchQuery);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  /**
   * Once a document is toggled, we need to update it's state and all it's children
   * in the local state and then persist the state to the backend.
   *
   * The backend will update the state of the documents in the database
   * and fire off other calls Get the documents associate file and or text
   */
  const subscribeDocument = async (document: Document) => {
    setIsSubscribing(true);

    const currentDocuments = [...documents];

    // Get all documents that should be toggled
    const documentsToUpdate = document.canHaveChildren
      ? [document.id, ...getDocumentsInFolder(document.id).map((doc) => doc.id)]
      : [document.id];

    const newSubscriptionState = !document.isSubscribed;

    const newDocuments = documents.map((doc) => {
      if (documentsToUpdate.includes(doc.id)) {
        return { ...doc, isSubscribed: newSubscriptionState };
      }
      return doc;
    });

    /**
     * Update state optimistically
     */
    setDocuments(newDocuments);

    const payload = {
      documentIds: documentsToUpdate,
      isSubscribed: newSubscriptionState,
    };

    /**
     * Persist state to backend
     */
    try {
      const response = await fetch(
        `/api/integrations/${integration.connection?.id}/documents/subscribe`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        /**
         * Reverse optimistic update since the database update failed
         */
        setDocuments(currentDocuments);
      }
    } catch (error) {
      /**
       * Reverse optimistic update since the database update failed
       */
      setDocuments(currentDocuments);

      toast.error("Failed to update subscription: " + error);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Recursively get all documents inside a folder
  const getDocumentsInFolder = (folderId: string): Document[] => {
    const result: Document[] = [];
    const children = documents.filter((doc) => doc.parentId === folderId);

    for (const child of children) {
      result.push(child);
      if (child.canHaveChildren) {
        result.push(...getDocumentsInFolder(child.id));
      }
    }

    return result;
  };

  const handleDone = () => {
    onComplete();
    onOpenChange(false);
  };

  const reSync = async () => {
    setDocuments([]);

    if (integration.connection?.id) {
      handleStartSync({ connectionId: integration.connection.id });
    }
  };

  const renderContent = () => {
    if (documents.length === 0) {
      if (loading && !isSyncing)
        return <LoadingState message="Loading documents..." />;
      if (isSyncing) return <LoadingState message="Syncing documents..." />;
      if (fetchDocumentsError)
        return (
          <ErrorState message={fetchDocumentsError} onRetry={fetchDocuments} />
        );
      if (syncError)
        return (
          <ErrorState
            title="An error occured during the last sync"
            message={`"${syncError}"`}
            onRetry={reSync}
          />
        );
    }
    return (
      <div className="space-y-4">
        <Breadcrumbs items={breadcrumbs} onNavigate={navigateToBreadcrumb} />
        <DocumentList
          folders={currentFolders}
          files={currentFiles}
          onFolderClick={navigateToFolder}
          onSubscribe={subscribeDocument}
          isSubscribing={isSubscribing}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {integration.logoUri ? (
                <Image
                  width={32}
                  height={32}
                  src={integration.logoUri}
                  alt={`${integration.name} logo`}
                  className="w-8 h-8 rounded-lg"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  {integration.name[0]}
                </div>
              )}
              <DialogTitle>{integration.name}</DialogTitle>
            </div>

            {isSyncing && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Icons.spinner className="h-3 w-3 animate-spin" />
                <span>
                  {documents.length ? `${documents.length} Documents Synced` : "Syncing..."}
                </span>
              </div>
            )}

            {!loading && !isSyncing && (
              <Button
                variant="outline"
                size="sm"
                onClick={reSync}
                className="whitespace-nowrap"
              >
                <Icons.refresh className="h-4 w-4 mr-2" />
                Resync
              </Button>
            )}
          </div>

          <div className="flex justify-between items-center gap-4">
            <Input
              ref={searchInputRef}
              placeholder="Search documents..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1"
            />
          </div>
          {isTruncated && (
            <div className="text-xs text-gray-500 bg-blue-50 text-center py-1.5 rounded-md">
              *Sync was truncated to 1000 documents
            </div>
          )}
        </DialogHeader>

        <div className="min-h-[400px] max-h-[400px] overflow-y-auto my-6">
          {renderContent()}
        </div>

        <DialogFooter className="flex-col gap-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleDone}>Done</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
