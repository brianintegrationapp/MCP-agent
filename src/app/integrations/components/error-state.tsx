import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function ErrorState({
  title = "Error",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="flex flex-col items-center space-y-6 max-w-[400px] w-full text-center animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
            <div className="absolute inset-0 rounded-full bg-red-100/50 animate-ping" />
            <svg
              className="w-8 h-8 text-red-600 relative z-10 transform transition-transform group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-gray-900 tracking-tight">
            {title}
          </h3>
          <div className="text-sm text-gray-600 bg-white ">
            {message}
          </div>
        </div>
        <div className="pt-2">
          <Button
            onClick={onRetry}
            variant="outline"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg px-8 py-3 hover:to-red-200 transition-all duration-300"
          >
            <Icons.refresh className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
            <span className="relative">Try Again</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
