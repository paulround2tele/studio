/**
 * Review Step - Summary and confirmation
 * Migrated to TailAdmin + Tailwind patterns (Dec 31, 2025)
 */

import React from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import Alert from '@/components/ta/ui/alert/Alert';
import type { WizardGoalStep, WizardPatternStep, WizardTargetingStep } from '../../types';

interface ReviewStepProps {
  goal: WizardGoalStep;
  pattern: WizardPatternStep;
  targeting: WizardTargetingStep;
}

export function ReviewStep({ goal, pattern, targeting }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <Alert
        variant="info"
        title="Review your campaign settings"
        message="After creation, you'll be redirected to the campaign dashboard where you can configure detailed domain generation and phase execution settings."
      />

      <div className="grid gap-4">
        {/* Goal Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Campaign Goal</h3>
          </div>
          <div className="p-6 space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
              <p className="font-medium text-gray-800 dark:text-white/90">{goal.campaignName}</p>
            </div>
            {goal.description && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                <p className="text-sm text-gray-800 dark:text-white/90">{goal.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Execution Mode</p>
              <Badge color={goal.executionMode === 'auto' ? 'success' : 'light'} size="sm">
                {goal.executionMode === 'auto' ? 'Full Auto' : 'Manual (Step-by-Step)'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Pattern Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Domain Pattern</h3>
          </div>
          <div className="p-6 space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Base Pattern</p>
              <p className="font-mono font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-white/90">
                {pattern.basePattern}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Maximum Domains</p>
              <p className="font-medium text-gray-800 dark:text-white/90">{pattern.maxDomains?.toLocaleString()}</p>
            </div>
            {pattern.variations && pattern.variations.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Variations</p>
                <div className="flex flex-wrap gap-1">
                  {pattern.variations.map((variation, index) => (
                    <Badge key={index} color="light" size="sm">
                      {variation}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Targeting Summary */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Targeting Options</h3>
          </div>
          <div className="p-6">
            {!targeting.includeKeywords?.length &&
             !targeting.excludeKeywords?.length &&
             !targeting.excludeExtensions?.length &&
             !targeting.adHocKeywords?.length &&
             !targeting.dnsPersonaNames?.length &&
             !targeting.httpPersonaNames?.length ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No targeting options configured. All generated domains will be included.
              </p>
            ) : (
              <div className="space-y-3">
                {targeting.dnsPersonaNames && targeting.dnsPersonaNames.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">DNS Personas</p>
                    <div className="flex flex-wrap gap-1">
                      {targeting.dnsPersonaNames.map((name, index) => (
                        <Badge key={name || index} color="light" size="sm">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {targeting.httpPersonaNames && targeting.httpPersonaNames.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Enrichment Personas</p>
                    <div className="flex flex-wrap gap-1">
                      {targeting.httpPersonaNames.map((name, index) => (
                        <Badge key={name || index} color="light" size="sm">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {targeting.keywordSetNames && targeting.keywordSetNames.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Keyword Sets</p>
                    <div className="flex flex-wrap gap-1">
                      {targeting.keywordSetNames.map((name, index) => (
                        <Badge key={name || index} color="primary" size="sm">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {targeting.includeKeywords && targeting.includeKeywords.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Include Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {targeting.includeKeywords.map((keyword, index) => (
                        <Badge key={index} color="success" size="sm">
                          +{keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {targeting.excludeKeywords && targeting.excludeKeywords.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Exclude Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {targeting.excludeKeywords.map((keyword, index) => (
                        <Badge key={index} color="error" size="sm">
                          -{keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {targeting.adHocKeywords && targeting.adHocKeywords.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Custom Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {targeting.adHocKeywords.map((keyword, index) => (
                        <Badge key={keyword || index} color="light" size="sm">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {targeting.excludeExtensions && targeting.excludeExtensions.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Exclude Extensions</p>
                    <div className="flex flex-wrap gap-1">
                      {targeting.excludeExtensions.map((extension, index) => (
                        <Badge key={index} color="warning" size="sm">
                          -.{extension}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Separator */}
      <hr className="border-gray-200 dark:border-gray-700" />

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Next Steps</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Campaign will be created with basic configuration</li>
          {goal.executionMode === 'auto' ? (
            <>
              <li>• Pipeline will run automatically when phases are configured</li>
              <li>• Monitor real-time progress on the dashboard</li>
            </>
          ) : (
            <>
              <li>• Configure and manually start each phase on the dashboard</li>
              <li>• Control when to proceed to validation, enrichment, extraction, and analysis phases</li>
            </>
          )}
          <li>• View campaign results and analytics</li>
        </ul>
      </div>
    </div>
  );
}

export default ReviewStep;