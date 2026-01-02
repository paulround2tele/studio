"use client";

import React from "react";
import Link from "next/link";
import Badge from "@/components/ta/ui/badge/Badge";
import Button from "@/components/ta/ui/button/Button";

// TailAdmin inline SVG icons
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 16.6666L5.83333 9.99992L12.5 3.33325" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.16669 2.5L15.8334 10L4.16669 17.5V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PauseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.33331 3.33325H5.83331V16.6666H8.33331V3.33325Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.1667 3.33325H11.6667V16.6666H14.1667V3.33325Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StopCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.66669 6.66659H13.3334V13.3333H6.66669V6.66659Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99992C18.3334 5.39755 14.6024 1.66659 10 1.66659C5.39765 1.66659 1.66669 5.39755 1.66669 9.99992C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.1666 12.5C16.0557 12.7513 16.0226 13.0302 16.0716 13.3005C16.1206 13.5708 16.2495 13.8203 16.4416 14.0167L16.4916 14.0667C16.6466 14.2215 16.7695 14.4053 16.8534 14.6076C16.9373 14.8099 16.9805 15.0268 16.9805 15.2459C16.9805 15.4649 16.9373 15.6818 16.8534 15.8841C16.7695 16.0864 16.6466 16.2702 16.4916 16.425C16.3368 16.58 16.153 16.7029 15.9507 16.7868C15.7484 16.8707 15.5315 16.9139 15.3125 16.9139C15.0934 16.9139 14.8765 16.8707 14.6742 16.7868C14.4719 16.7029 14.2881 16.58 14.1333 16.425L14.0833 16.375C13.8869 16.1829 13.6374 16.054 13.3671 16.005C13.0967 15.956 12.8179 15.9891 12.5666 16.1C12.3201 16.2056 12.1124 16.3813 11.9674 16.6062C11.8225 16.831 11.7467 17.0945 11.75 17.3625V17.5C11.75 17.942 11.5744 18.366 11.2618 18.6785C10.9493 18.9911 10.5254 19.1667 10.0833 19.1667C9.64127 19.1667 9.21735 18.9911 8.90479 18.6785C8.59222 18.366 8.41663 17.942 8.41663 17.5V17.425C8.41381 17.1482 8.32802 16.8786 8.1711 16.6515C8.01417 16.4244 7.79358 16.2502 7.53746 16.1525C7.28621 16.0416 7.00731 16.0085 6.73703 16.0575C6.46676 16.1065 6.21724 16.2354 6.02079 16.4275L5.97079 16.4775C5.81598 16.6325 5.63217 16.7554 5.42987 16.8393C5.22757 16.9232 5.01067 16.9664 4.79163 16.9664C4.57258 16.9664 4.35568 16.9232 4.15338 16.8393C3.95108 16.7554 3.76727 16.6325 3.61246 16.4775C3.45747 16.3227 3.33455 16.1388 3.25067 15.9366C3.16678 15.7343 3.12356 15.5174 3.12356 15.2983C3.12356 15.0793 3.16678 14.8624 3.25067 14.6601C3.33455 14.4578 3.45747 14.274 3.61246 14.1192L3.66246 14.0692C3.85458 13.8727 3.98349 13.6232 4.03248 13.3529C4.08147 13.0826 4.04839 12.8038 3.93746 12.5525C3.83181 12.306 3.65617 12.0983 3.43131 11.9534C3.20645 11.8084 2.94292 11.7327 2.67496 11.7358H2.53746C2.09543 11.7358 1.67151 11.5602 1.35894 11.2477C1.04638 10.9351 0.87079 10.5112 0.87079 10.0692C0.87079 9.62713 1.04638 9.20321 1.35894 8.89065C1.67151 8.57808 2.09543 8.4025 2.53746 8.4025H2.61246C2.88927 8.39968 3.15887 8.31389 3.38596 8.15697C3.61306 7.99004 3.78729 7.76945 3.88496 7.51333C3.99589 7.26208 4.02897 6.98318 3.97998 6.71291C3.93099 6.44263 3.80208 6.19312 3.60996 5.99667L3.55996 5.94667C3.40497 5.79186 3.28205 5.60805 3.19817 5.40575C3.11428 5.20345 3.07106 4.98655 3.07106 4.7675C3.07106 4.54846 3.11428 4.33156 3.19817 4.12926C3.28205 3.92696 3.40497 3.74314 3.55996 3.58833C3.71477 3.43334 3.89858 3.31043 4.10088 3.22654C4.30318 3.14265 4.52008 3.09943 4.73913 3.09943C4.95817 3.09943 5.17507 3.14265 5.37737 3.22654C5.57967 3.31043 5.76349 3.43334 5.91829 3.58833L5.96829 3.63833C6.16474 3.83045 6.41426 3.95937 6.68454 4.00836C6.95482 4.05735 7.23371 4.02427 7.48496 3.91333H7.53746C7.78398 3.80768 7.99169 3.63204 8.13662 3.40718C8.28156 3.18232 8.35732 2.91879 8.35413 2.65083V2.5C8.35413 2.05798 8.52971 1.63405 8.84227 1.32149C9.15484 1.00893 9.57876 0.833336 10.0208 0.833336C10.4628 0.833336 10.8868 1.00893 11.1993 1.32149C11.5119 1.63405 11.6875 2.05798 11.6875 2.5V2.575C11.6843 2.84296 11.76 3.10649 11.905 3.33135C12.0499 3.55621 12.2576 3.73185 12.5041 3.8375C12.7554 3.94843 13.0343 3.98151 13.3046 3.93252C13.5749 3.88353 13.8244 3.75462 14.0208 3.5625L14.0708 3.5125C14.2256 3.35751 14.4094 3.23459 14.6117 3.15071C14.814 3.06682 15.0309 3.0236 15.25 3.0236C15.469 3.0236 15.6859 3.06682 15.8882 3.15071C16.0905 3.23459 16.2744 3.35751 16.4291 3.5125C16.5841 3.66731 16.7071 3.85113 16.791 4.05343C16.8748 4.25573 16.9181 4.47263 16.9181 4.69167C16.9181 4.91072 16.8748 5.12762 16.791 5.32992C16.7071 5.53222 16.5841 5.71603 16.4291 5.87083L16.3791 5.92083C16.187 6.11728 16.0581 6.3668 16.0091 6.63708C15.9601 6.90735 15.9932 7.18625 16.1041 7.4375V7.49C16.2098 7.73652 16.3854 7.94423 16.6103 8.08916C16.8351 8.2341 17.0987 8.30986 17.3666 8.30667H17.5C17.942 8.30667 18.366 8.48225 18.6785 8.79482C18.9911 9.10738 19.1666 9.53131 19.1666 9.97333C19.1666 10.4154 18.9911 10.8393 18.6785 11.1518C18.366 11.4644 17.942 11.64 17.5 11.64H17.425C17.157 11.6432 16.8935 11.7189 16.6686 11.8639C16.4438 12.0088 16.2681 12.2165 16.1625 12.4631" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

type CampaignStatus = "draft" | "running" | "paused" | "completed" | "failed" | "cancelled";

const STATUS_COLORS: Record<CampaignStatus, "success" | "warning" | "error" | "info" | "light"> = {
  draft: "light",
  running: "success",
  paused: "warning",
  completed: "info",
  failed: "error",
  cancelled: "error"
};

interface CampaignDetailHeaderProps {
  name: string;
  status: CampaignStatus;
  currentPhase?: string;
  onBack?: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  isLoading?: boolean;
}

export function CampaignDetailHeader({
  name,
  status,
  currentPhase,
  onBack,
  onStart,
  onPause,
  onResume,
  onStop,
  isLoading
}: CampaignDetailHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left side: Back button and title */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">
                {name}
              </h1>
              <Badge color={STATUS_COLORS[status]}>
                {status}
              </Badge>
            </div>
            {currentPhase && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Current phase: <span className="capitalize font-medium">{currentPhase}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-2">
          {status === "draft" && onStart && (
            <Button
              onClick={onStart}
              disabled={isLoading}
              variant="success"
              size="sm"
              startIcon={<PlayIcon className="w-4 h-4" />}
            >
              Start
            </Button>
          )}
          {status === "running" && onPause && (
            <Button
              onClick={onPause}
              disabled={isLoading}
              variant="warning"
              size="sm"
              startIcon={<PauseIcon className="w-4 h-4" />}
            >
              Pause
            </Button>
          )}
          {status === "paused" && onResume && (
            <Button
              onClick={onResume}
              disabled={isLoading}
              variant="success"
              size="sm"
              startIcon={<PlayIcon className="w-4 h-4" />}
            >
              Resume
            </Button>
          )}
          {(status === "running" || status === "paused") && onStop && (
            <Button
              onClick={onStop}
              disabled={isLoading}
              variant="error"
              size="sm"
              startIcon={<StopCircleIcon className="w-4 h-4" />}
            >
              Stop
            </Button>
          )}
          <Link href={`/campaigns/${name}/edit`}>
            <Button
              variant="outline"
              size="sm"
              startIcon={<SettingsIcon className="w-4 h-4" />}
            >
              Edit
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
