import { apiClient } from './apiClient.production';
import type { KeywordSet, KeywordSetListResponse, KeywordSetDetailResponse, KeywordSetCreationResponse, KeywordSetUpdateResponse, KeywordSetDeleteResponse } from '@/lib/types';
import { z } from 'zod';
import { createKeywordSetRequestSchema, updateKeywordSetRequestSchema } from '@/lib/schemas/alignedValidationSchemas';

export type CreateKeywordSetPayload = z.infer<typeof createKeywordSetRequestSchema>;
export type UpdateKeywordSetPayload = z.infer<typeof updateKeywordSetRequestSchema>;

export async function listKeywordSets(): Promise<KeywordSetListResponse> {
  return apiClient.get<KeywordSet[]>('/api/v2/keywords/sets');
}

export async function getKeywordSetById(setId: string): Promise<KeywordSetDetailResponse> {
  return apiClient.get<KeywordSet>(`/api/v2/keywords/sets/${setId}`);
}

export async function createKeywordSet(payload: CreateKeywordSetPayload): Promise<KeywordSetCreationResponse> {
  return apiClient.post<KeywordSet>('/api/v2/keywords/sets', payload as unknown as Record<string, unknown>);
}

export async function updateKeywordSet(setId: string, payload: UpdateKeywordSetPayload): Promise<KeywordSetUpdateResponse> {
  return apiClient.put<KeywordSet>(`/api/v2/keywords/sets/${setId}`, payload as unknown as Record<string, unknown>);
}

export async function deleteKeywordSet(setId: string): Promise<KeywordSetDeleteResponse> {
  return apiClient.delete<null>(`/api/v2/keywords/sets/${setId}`);
}

const keywordSetService = {
  listKeywordSets,
  getKeywordSetById,
  createKeywordSet,
  updateKeywordSet,
  deleteKeywordSet,
};

export default keywordSetService;
