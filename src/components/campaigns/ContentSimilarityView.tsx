
"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ta/ui/table';
import TabsAdapter from "@/components/ta/adapters/TabsAdapter";
import Badge from '@/components/ta/ui/badge/Badge';
import Button from '@/components/ta/ui/button/Button';
import { FileTextIcon, UserCheckIcon, PercentIcon, LinkIcon, ExternalLinkIcon, SparklesIcon, LoaderIcon } from '@/icons';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
// The generated OpenAPI client does not currently expose explicit ExtractedContentItem/LeadItem models.
// Define minimal structural interfaces here to maintain type safety without invalid imports.
interface ExtractedContentItem {
  id?: string;
  text?: string;
  sourceUrl?: string;
  similarityScore?: number;
  previousCampaignId?: string;
  advancedAnalysis?: {
    summary?: string;
    sentiment?: string;
    advancedKeywords?: string[];
    categories?: string[];
  };
}
interface LeadItem {
  id?: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  sourceUrl?: string | null;
  previousCampaignId?: string | null;
  url?: string;
  title?: string;
  score?: number;
  similarityScore?: number;
  status?: string;
  tags?: string[];
  createdAt?: string;
}
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';

// Mock interface for content analysis (not using real API yet)
interface AnalyzeContentInput {
  urls: string[];
  content: string;
  keywords: string[];
}

interface ContentSimilarityViewProps {
  campaign: Campaign;
  onAnalysisComplete?: (updatedCampaign: Campaign) => void; // Callback to update parent campaign state
}

const getSimilarityBadgeColor = (score: number): "success" | "primary" | "warning" | "error" | "light" => {
  if (score > 75) return "success";
  if (score > 50) return "primary";
  if (score > 25) return "warning";
  return "error";
};

const getSentimentBadgeColor = (sentiment: string): "success" | "error" | "light" => {
  if (sentiment === 'Positive') return "success";
  if (sentiment === 'Negative') return "error";
  return "light";
};

export default function ContentSimilarityView({ campaign, onAnalysisComplete }: ContentSimilarityViewProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<string>('content');

  // Extract data with proper type guards
  const extractedContent: ExtractedContentItem[] = 
    (campaign && typeof campaign === 'object' && 'extractedContent' in campaign && Array.isArray(campaign.extractedContent)) 
      ? campaign.extractedContent 
      : [];
  
  const leads: LeadItem[] = (() => {
    if (campaign && typeof campaign === 'object') {
      if ('leads' in campaign && Array.isArray(campaign.leads)) {
        return campaign.leads;
      }
      if ('leadItems' in campaign && Array.isArray(campaign.leadItems)) {
        return campaign.leadItems;
      }
    }
    return [];
  })();
  const { toast } = useToast();
  const [analyzingContentId, setAnalyzingContentId] = useState<string | null>(null);

  // Build tabs configuration - content defined inline in render due to JSX complexity
  // Content tab content
  const contentTabContent = extractedContent.length > 0 ? (
    <div className="h-[400px] overflow-y-auto pr-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader className="w-[45%]">Content Snippet / Summary</TableCell>
            <TableCell isHeader>Keywords / Categories</TableCell>
            <TableCell isHeader><PercentIcon className="inline mr-1 h-4 w-4"/>Sim.</TableCell>
            <TableCell isHeader>Sentiment</TableCell>
            <TableCell isHeader>Source / Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {extractedContent.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-xs">
                <p className="font-medium truncate" title={item.text || ''}>{(item.text || '').substring(0,100)}{(item.text || '').length > 100 ? "..." : ""}</p>
                {item.advancedAnalysis?.summary && <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">AI Summary: {item.advancedAnalysis.summary}</p>}
              </TableCell>
               <TableCell className="text-xs">
                {item.advancedAnalysis?.advancedKeywords && item.advancedAnalysis.advancedKeywords.length > 0 && (
                  <div>
                    <strong className="block text-sky-600">AI Keywords:</strong>
                    {item.advancedAnalysis.advancedKeywords.join(', ')}
                  </div>
                )}
                {item.advancedAnalysis?.categories && item.advancedAnalysis.categories.length > 0 && (
                  <div className="mt-1">
                    <strong className="block text-purple-600">AI Categories:</strong>
                    {item.advancedAnalysis.categories.join(', ')}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge color={getSimilarityBadgeColor(item.similarityScore || 0)} size="sm">
                  {item.similarityScore || 0}%
                </Badge>
              </TableCell>
              <TableCell>
                 {item.advancedAnalysis?.sentiment ? (
                   <Badge color={getSentimentBadgeColor(item.advancedAnalysis.sentiment)} size="sm">
                     {item.advancedAnalysis.sentiment}
                   </Badge>
                 ) : item.advancedAnalysis ? <Badge color="light" size="sm">N/A</Badge> : null}
              </TableCell>
              <TableCell>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline flex items-center text-xs mb-1">
                    View Source <ExternalLinkIcon className="ml-1 h-3 w-3 opacity-70"/>
                  </a>
                ) : <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">N/A</span>}
                {item.previousCampaignId && <span className="block text-xs text-gray-500 dark:text-gray-400 mb-2">vs C-{item.previousCampaignId.substring(0,4)}</span>}
                {!item.advancedAnalysis && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleAnalyzeContent(item)}
                    disabled={analyzingContentId === item.id}
                  >
                    {analyzingContentId === item.id ? <LoaderIcon className="mr-1 h-3 w-3"/> : <SparklesIcon className="mr-1 h-3 w-3"/>}
                    Analyze
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : (
    <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center">No extracted content for this campaign.</p>
  );

  // Leads tab content
  const leadsTabContent = leads.length > 0 ? (
    <div className="h-[400px] overflow-y-auto pr-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Name/Email</TableCell>
            <TableCell isHeader>Company</TableCell>
            <TableCell isHeader><PercentIcon className="inline mr-1 h-4 w-4"/>Similarity</TableCell>
            <TableCell isHeader><LinkIcon className="inline mr-1 h-4 w-4"/>Source</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <p className="font-medium">{lead.name || 'N/A'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{lead.email || 'N/A'}</p>
              </TableCell>
              <TableCell>{lead.company || 'N/A'}</TableCell>
              <TableCell>
                <Badge color={getSimilarityBadgeColor(lead.similarityScore || 0)} size="sm">
                  {lead.similarityScore || 0}%
                </Badge>
              </TableCell>
              <TableCell>
                {lead.sourceUrl ? (
                   <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline flex items-center text-xs">
                    View Source <ExternalLinkIcon className="ml-1 h-3 w-3 opacity-70"/>
                  </a>
                ) : 'N/A'}
                {lead.previousCampaignId && <span className="block text-xs text-gray-500 dark:text-gray-400">vs C-{lead.previousCampaignId.substring(0,4)}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : (
    <p className="text-gray-500 dark:text-gray-400 text-sm p-4 text-center">No leads generated for this campaign.</p>
  );

  // Full tabs config
  const tabsConfig = [
    { value: 'content', label: `Extracted Content (${extractedContent.length})`, icon: <FileTextIcon className="h-4 w-4" />, content: contentTabContent },
    { value: 'leads', label: `Generated Leads (${leads.length})`, icon: <UserCheckIcon className="h-4 w-4" />, content: leadsTabContent },
  ];

  const handleAnalyzeContent = async (item: ExtractedContentItem) => {
    if (!campaign) return;
    
    if (!campaign.id || !item.id) {
      toast({
        title: "Analysis Error",
        description: "Campaign or item ID is missing",
        variant: "destructive"
      });
      return;
    }
    
    setAnalyzingContentId(item.id);
    try {
      const _analysisInput: AnalyzeContentInput = {
        urls: item.sourceUrl ? [item.sourceUrl] : [],
        content: item.text || '',
        keywords: (item.text || '').toLowerCase().split(/\s+/).filter((kw: string) => kw.length > 3).slice(0, 5), // Simple existing keywords
      };
      // The service will update the mock store, and polling will update the campaign prop
      // Mock content analysis - replace with actual service call when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "AI Analysis Complete",
        description: `Advanced analysis for content from ${item.sourceUrl || 'source'} finished.`,
      });
       if (onAnalysisComplete) {
           // This callback is less critical now that the service updates the store,
           // but can be kept if parent needs an explicit signal.
           // onAnalysisComplete(updatedCampaignData); 
       }

    } catch (error: unknown) {
      toast({
        title: "AI Analysis Failed",
        description: error instanceof Error ? error.message : "Could not complete AI analysis.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingContentId(null);
    }
  };


  if (extractedContent.length === 0 && leads.length === 0 && campaign.currentPhase !== 'analysis' && campaign.status !== 'running') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md mt-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
            <FileTextIcon className="mr-2 h-5 w-5 text-brand-500" />
            Content & Lead Analysis
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No content or lead data available for this campaign yet. This information will appear after the Lead Generation phase completes.</p>
        </div>
      </div>
    );
  }
  if (extractedContent.length === 0 && leads.length === 0 && campaign.currentPhase === 'analysis' && campaign.status === 'running') {
     return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md mt-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
            <LoaderIcon className="mr-2 h-5 w-5 text-brand-500 animate-spin" />
            Analyzing Content & Generating Leads...
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">Real-time results will appear here as leads are identified.</p>
        </div>
      </div>
    );
   }


  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xl mt-6 dark:border-gray-800 dark:bg-white/[0.03]">
       <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
          <FileTextIcon className="h-6 w-6 text-brand-500" />
          Content & Lead Analysis Results
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review extracted content snippets and generated leads, along with their similarity to previously discovered information and AI-powered analysis.
        </p>
      </div>
      <div className="p-6">
        <TabsAdapter
          tabs={tabsConfig}
          value={activeTab}
          onChange={setActiveTab}
          className="w-full"
        />
      </div>
    </div>
  );
}
