"use client";

import { useIntegrations } from "@integration-app/react";
import { Icons } from "@/components/ui/icons";
import { IntegrationListItem } from "./integration-list-item";
import { Button } from "@/components/ui/button";

export function IntegrationList() {
  const {
    integrations,
    refresh,
    loading: integrationsIsLoading,
    error,
  } = useIntegrations();

  return (
    <div>
      {integrationsIsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">
            Loading integrations...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Icons.alertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || "Failed to load integrations"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="gap-2"
          >
            <Icons.refresh className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <IntegrationListItem
              key={integration.key}
              integration={integration}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
