/**
 * Review Step - Summary and confirmation
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { WizardGoalStep, WizardPatternStep, WizardTargetingStep } from '../../types';

interface ReviewStepProps {
  goal: WizardGoalStep;
  pattern: WizardPatternStep;
  targeting: WizardTargetingStep;
}

export function ReviewStep({ goal, pattern, targeting }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Review your campaign settings.</strong> After creation, you'll be redirected to the campaign dashboard 
          where you can configure detailed domain generation and phase execution settings.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {/* Goal Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
              <p className="font-medium">{goal.campaignName}</p>
            </div>
            {goal.description && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                <p className="text-sm">{goal.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Execution Mode</p>
              <Badge variant={goal.executionMode === 'auto' ? 'default' : 'secondary'}>
                {goal.executionMode === 'auto' ? 'Full Auto' : 'Manual (Step-by-Step)'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pattern Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Domain Pattern</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Base Pattern</p>
              <p className="font-mono font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {pattern.basePattern}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Maximum Domains</p>
              <p className="font-medium">{pattern.maxDomains?.toLocaleString()}</p>
            </div>
            {pattern.variations && pattern.variations.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Variations</p>
                <div className="flex flex-wrap gap-1">
                  {pattern.variations.map((variation, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {variation}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Targeting Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Targeting Options</CardTitle>
          </CardHeader>
          <CardContent>
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
                        <Badge key={name || index} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {targeting.httpPersonaNames && targeting.httpPersonaNames.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">HTTP Personas</p>
                    <div className="flex flex-wrap gap-1">
                      {targeting.httpPersonaNames.map((name, index) => (
                        <Badge key={name || index} variant="secondary" className="text-xs">
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
                        <Badge key={index} variant="default" className="text-xs">
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
                        <Badge key={index} variant="destructive" className="text-xs">
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
                        <Badge key={keyword || index} variant="outline" className="text-xs">
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
                        <Badge key={index} variant="outline" className="text-xs">
                          -.{extension}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

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
              <li>• Control when to proceed to validation and analysis phases</li>
            </>
          )}
          <li>• View campaign results and analytics</li>
        </ul>
      </div>
    </div>
  );
}

export default ReviewStep;