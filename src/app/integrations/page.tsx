import { IntegrationList } from "./components/integrations-list";

export default function Integrations() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex flex-col mb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Integrations
        </h1>
        <p className="text-gray-500">
          Import data from various sources and configure specific folders or
          files to track for updates.
        </p>
      </div>
      <IntegrationList />
    </div>
  );
}
