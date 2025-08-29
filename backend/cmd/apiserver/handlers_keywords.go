package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/contentfetcher"
	"github.com/fntelecomllc/studio/backend/internal/keywordextractor"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

func (h *strictHandlers) KeywordExtractBatch(ctx context.Context, r gen.KeywordExtractBatchRequestObject) (gen.KeywordExtractBatchResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Keyword == nil {
		return gen.KeywordExtractBatch500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || len(r.Body.Items) == 0 {
		return gen.KeywordExtractBatch400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "items required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	cf := contentfetcher.NewContentFetcher(h.deps.Config, h.deps.ProxyMgr)
	results := make([]struct {
		DnsPersonaIdUsed  *openapi_types.UUID `json:"dnsPersonaIdUsed,omitempty"`
		Error             *string             `json:"error,omitempty"`
		FinalURL          *string             `json:"finalURL,omitempty"`
		HttpPersonaIdUsed *openapi_types.UUID `json:"httpPersonaIdUsed,omitempty"`
		KeywordSetIdUsed  *openapi_types.UUID `json:"keywordSetIdUsed,omitempty"`
		Matches           *[]struct {
			Category       *string   `json:"category,omitempty"`
			Contexts       *[]string `json:"contexts,omitempty"`
			MatchedPattern *string   `json:"matchedPattern,omitempty"`
			MatchedText    *string   `json:"matchedText,omitempty"`
		} `json:"matches,omitempty"`
		ProxyIdUsed *openapi_types.UUID `json:"proxyIdUsed,omitempty"`
		StatusCode  *int                `json:"statusCode,omitempty"`
		Url         *string             `json:"url,omitempty"`
	}, 0, len(r.Body.Items))

	for _, item := range r.Body.Items {
		itemURL := item.Url
		results = append(results, struct {
			DnsPersonaIdUsed  *openapi_types.UUID `json:"dnsPersonaIdUsed,omitempty"`
			Error             *string             `json:"error,omitempty"`
			FinalURL          *string             `json:"finalURL,omitempty"`
			HttpPersonaIdUsed *openapi_types.UUID `json:"httpPersonaIdUsed,omitempty"`
			KeywordSetIdUsed  *openapi_types.UUID `json:"keywordSetIdUsed,omitempty"`
			Matches           *[]struct {
				Category       *string   `json:"category,omitempty"`
				Contexts       *[]string `json:"contexts,omitempty"`
				MatchedPattern *string   `json:"matchedPattern,omitempty"`
				MatchedText    *string   `json:"matchedText,omitempty"`
			} `json:"matches,omitempty"`
			ProxyIdUsed *openapi_types.UUID `json:"proxyIdUsed,omitempty"`
			StatusCode  *int                `json:"statusCode,omitempty"`
			Url         *string             `json:"url,omitempty"`
		}{Url: &itemURL})
		idx := len(results) - 1

		// Load optional personas
		var httpPersona, dnsPersona *models.Persona
		if item.HttpPersonaId != nil && h.deps.Stores.Persona != nil {
			p, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, uuid.UUID(*item.HttpPersonaId))
			if err == nil {
				httpPersona = p
			}
		}
		if item.DnsPersonaId != nil && h.deps.Stores.Persona != nil {
			p, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, uuid.UUID(*item.DnsPersonaId))
			if err == nil {
				dnsPersona = p
			}
		}

		// Load rules for keyword set
		ksID := uuid.UUID(item.KeywordSetId)
		rules, err := h.deps.Stores.Keyword.GetKeywordRulesBySetID(ctx, h.deps.DB, ksID)
		if err != nil {
			errMsg := "failed to load keyword rules"
			results[idx].Error = &errMsg
			ksid := openapi_types.UUID(ksID)
			results[idx].KeywordSetIdUsed = &ksid
			continue
		}

		body, finalURL, status, httpPIDUsed, dnsPIDUsed, proxyIDUsed, fetchErr := cf.FetchUsingPersonas(ctx, item.Url, httpPersona, dnsPersona, nil)
		if fetchErr != nil {
			e := fetchErr.Error()
			results[idx].Error = &e
			ksid := openapi_types.UUID(ksID)
			results[idx].KeywordSetIdUsed = &ksid
			continue
		}
		results[idx].FinalURL = &finalURL
		results[idx].StatusCode = &status
		if httpPIDUsed != nil {
			ophttp := openapi_types.UUID(*httpPIDUsed)
			results[idx].HttpPersonaIdUsed = &ophttp
		}
		if dnsPIDUsed != nil {
			opdns := openapi_types.UUID(*dnsPIDUsed)
			results[idx].DnsPersonaIdUsed = &opdns
		}
		if proxyIDUsed != nil {
			opp := openapi_types.UUID(*proxyIDUsed)
			results[idx].ProxyIdUsed = &opp
		}
		ksid := openapi_types.UUID(ksID)
		results[idx].KeywordSetIdUsed = &ksid

		matches := []struct {
			Category       *string   `json:"category,omitempty"`
			Contexts       *[]string `json:"contexts,omitempty"`
			MatchedPattern *string   `json:"matchedPattern,omitempty"`
			MatchedText    *string   `json:"matchedText,omitempty"`
		}{}

		if len(body) > 0 {
			found, err := keywordextractor.ExtractKeywords(body, rules)
			if err == nil {
				for _, m := range found {
					cat := m.Category
					ctxs := m.Contexts
					pat := m.MatchedPattern
					txt := m.MatchedText
					matches = append(matches, struct {
						Category       *string   `json:"category,omitempty"`
						Contexts       *[]string `json:"contexts,omitempty"`
						MatchedPattern *string   `json:"matchedPattern,omitempty"`
						MatchedText    *string   `json:"matchedText,omitempty"`
					}{
						Category: func() *string {
							if cat == "" {
								return nil
							}
							return &cat
						}(),
						Contexts: func() *[]string {
							if len(ctxs) == 0 {
								return nil
							}
							return &ctxs
						}(),
						MatchedPattern: &pat,
						MatchedText:    &txt,
					})
				}
			}
		}
		if len(matches) > 0 {
			results[idx].Matches = &matches
		}
	}

	data := gen.BatchKeywordExtractionResponse{Results: &results}
	resp := gen.KeywordExtractBatch200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) KeywordExtractStream(ctx context.Context, r gen.KeywordExtractStreamRequestObject) (gen.KeywordExtractStreamResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Keyword == nil {
		return gen.KeywordExtractStream500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	url := r.Params.Url
	setID := uuid.UUID(r.Params.KeywordSetId)
	// Optional personas
	var httpPersona, dnsPersona *models.Persona
	if r.Params.HttpPersonaId != nil && h.deps.Stores.Persona != nil {
		p, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, uuid.UUID(*r.Params.HttpPersonaId))
		if err == nil {
			httpPersona = p
		}
	}
	if r.Params.DnsPersonaId != nil && h.deps.Stores.Persona != nil {
		p, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, uuid.UUID(*r.Params.DnsPersonaId))
		if err == nil {
			dnsPersona = p
		}
	}
	// Load rules
	rules, err := h.deps.Stores.Keyword.GetKeywordRulesBySetID(ctx, h.deps.DB, setID)
	if err != nil {
		return gen.KeywordExtractStream500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load keyword rules", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	pr, pw := io.Pipe()
	go func() {
		enc := func(event string, payload interface{}) {
			b, _ := json.Marshal(payload)
			_, _ = pw.Write([]byte("event: " + event + "\n"))
			_, _ = pw.Write([]byte("data: "))
			_, _ = pw.Write(b)
			_, _ = pw.Write([]byte("\n\n"))
		}
		// Suggest retry window and heartbeat
		_, _ = pw.Write([]byte("retry: 5000\n\n"))
		enc("ping", map[string]interface{}{})

		cf := contentfetcher.NewContentFetcher(h.deps.Config, h.deps.ProxyMgr)
		body, finalURL, status, httpPIDUsed, dnsPIDUsed, proxyIDUsed, fetchErr := cf.FetchUsingPersonas(ctx, url, httpPersona, dnsPersona, nil)
		if fetchErr != nil {
			enc("extraction_complete", map[string]interface{}{
				"url":   url,
				"error": fetchErr.Error(),
			})
			_ = pw.Close()
			return
		}
		matchesPayload := []map[string]interface{}{}
		if len(body) > 0 {
			found, err := keywordextractor.ExtractKeywords(body, rules)
			if err == nil {
				for _, m := range found {
					mp := map[string]interface{}{
						"matchedPattern": m.MatchedPattern,
						"matchedText":    m.MatchedText,
					}
					if m.Category != "" {
						mp["category"] = m.Category
					}
					if len(m.Contexts) > 0 {
						mp["contexts"] = m.Contexts
					}
					matchesPayload = append(matchesPayload, mp)
				}
			}
		}
		payload := map[string]interface{}{
			"url":              url,
			"finalURL":         finalURL,
			"statusCode":       status,
			"keywordSetIdUsed": setID.String(),
			"matches":          matchesPayload,
		}
		if httpPIDUsed != nil {
			payload["httpPersonaIdUsed"] = httpPIDUsed.String()
		}
		if dnsPIDUsed != nil {
			payload["dnsPersonaIdUsed"] = dnsPIDUsed.String()
		}
		if proxyIDUsed != nil {
			payload["proxyIdUsed"] = proxyIDUsed.String()
		}
		enc("extraction_complete", payload)
		_ = pw.Close()
	}()

	return gen.KeywordExtractStream200TexteventStreamResponse{Body: pr}, nil
}

func (h *strictHandlers) KeywordRulesQuery(ctx context.Context, r gen.KeywordRulesQueryRequestObject) (gen.KeywordRulesQueryResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil {
		return gen.KeywordRulesQuery500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "database not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Build dynamic WHERE
	conds := []string{}
	args := []interface{}{}
	if r.Params.KeywordSetId != nil {
		conds = append(conds, "keyword_set_id = $"+fmt.Sprint(len(args)+1))
		args = append(args, uuid.UUID(*r.Params.KeywordSetId))
	}
	if r.Params.RuleType != nil {
		conds = append(conds, "rule_type = $"+fmt.Sprint(len(args)+1))
		args = append(args, string(*r.Params.RuleType))
	}
	if r.Params.IsCaseSensitive != nil {
		conds = append(conds, "is_case_sensitive = $"+fmt.Sprint(len(args)+1))
		args = append(args, *r.Params.IsCaseSensitive)
	}
	if r.Params.Category != nil && strings.TrimSpace(*r.Params.Category) != "" {
		conds = append(conds, "category ILIKE $"+fmt.Sprint(len(args)+1))
		args = append(args, strings.TrimSpace(*r.Params.Category)+"%")
	}
	if r.Params.Pattern != nil && strings.TrimSpace(*r.Params.Pattern) != "" {
		conds = append(conds, "pattern ILIKE $"+fmt.Sprint(len(args)+1))
		args = append(args, strings.TrimSpace(*r.Params.Pattern)+"%")
	}
	query := "SELECT id, keyword_set_id, pattern, rule_type, is_case_sensitive, category, context_chars, created_at, updated_at FROM keyword_rules"
	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}
	query += " ORDER BY created_at ASC"
	limit := 50
	if r.Params.Limit != nil && *r.Params.Limit > 0 {
		limit = *r.Params.Limit
	}
	offset := 0
	if r.Params.Offset != nil && *r.Params.Offset > 0 {
		offset = *r.Params.Offset
	}
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)

	rows := []models.KeywordRule{}
	if err := h.deps.DB.SelectContext(ctx, &rows, query, args...); err != nil {
		return gen.KeywordRulesQuery500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to query rules", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dtos := make([]gen.KeywordRuleDTO, 0, len(rows))
	for _, rr := range rows {
		dtos = append(dtos, gen.KeywordRuleDTO{
			Id:              func() *openapi_types.UUID { id := openapi_types.UUID(rr.ID); return &id }(),
			KeywordSetId:    func() *openapi_types.UUID { id := openapi_types.UUID(rr.KeywordSetID); return &id }(),
			Pattern:         &rr.Pattern,
			RuleType:        func() *string { s := string(rr.RuleType); return &s }(),
			IsCaseSensitive: &rr.IsCaseSensitive,
			Category: func() *string {
				if rr.Category.Valid {
					s := rr.Category.String
					return &s
				}
				return nil
			}(),
			ContextChars: &rr.ContextChars,
			CreatedAt:    &rr.CreatedAt,
			UpdatedAt:    &rr.UpdatedAt,
		})
	}
	resp := gen.KeywordRulesQuery200JSONResponse{Data: &dtos, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) KeywordSetsList(ctx context.Context, r gen.KeywordSetsListRequestObject) (gen.KeywordSetsListResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Keyword == nil {
		return gen.KeywordSetsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "keyword store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	filter := store.ListKeywordSetsFilter{}
	if r.Params.IsEnabled != nil {
		b := bool(*r.Params.IsEnabled)
		filter.IsEnabled = &b
	}
	if r.Params.Limit != nil {
		filter.Limit = int(*r.Params.Limit)
	}
	if r.Params.Offset != nil {
		filter.Offset = int(*r.Params.Offset)
	}
	includeRules := false
	if r.Params.IncludeRules != nil {
		includeRules = bool(*r.Params.IncludeRules)
	}

	keywordSets, err := h.deps.Stores.Keyword.ListKeywordSets(ctx, h.deps.DB, filter)
	if err != nil {
		return gen.KeywordSetsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list keyword sets", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// If includeRules, batch load rules
	var setsWithRules map[uuid.UUID][]models.KeywordRule
	if includeRules && len(keywordSets) > 0 {
		ids := make([]uuid.UUID, len(keywordSets))
		for i, ks := range keywordSets {
			ids[i] = ks.ID
		}
		// Fetch all keywords in batch and group
		keywords, err := h.deps.Stores.Keyword.GetKeywordsByKeywordSetIDs(ctx, h.deps.DB, ids)
		if err == nil {
			setsWithRules = make(map[uuid.UUID][]models.KeywordRule)
			for _, kr := range keywords {
				setsWithRules[kr.KeywordSetID] = append(setsWithRules[kr.KeywordSetID], *kr)
			}
		}
	}

	items := make([]gen.KeywordSetResponse, 0, len(keywordSets))
	for _, ks := range keywordSets {
		var rulesDTO *[]gen.KeywordRuleDTO
		if includeRules {
			if rules, ok := setsWithRules[ks.ID]; ok {
				arr := make([]gen.KeywordRuleDTO, 0, len(rules))
				for _, rr := range rules {
					arr = append(arr, gen.KeywordRuleDTO{
						Id:              func() *openapi_types.UUID { id := openapi_types.UUID(rr.ID); return &id }(),
						KeywordSetId:    func() *openapi_types.UUID { id := openapi_types.UUID(rr.KeywordSetID); return &id }(),
						Pattern:         &rr.Pattern,
						RuleType:        func() *string { s := string(rr.RuleType); return &s }(),
						IsCaseSensitive: &rr.IsCaseSensitive,
						Category: func() *string {
							if rr.Category.Valid {
								s := rr.Category.String
								return &s
							}
							return nil
						}(),
						ContextChars: &rr.ContextChars,
						CreatedAt:    &rr.CreatedAt,
						UpdatedAt:    &rr.UpdatedAt,
					})
				}
				rulesDTO = &arr
			}
		}
		desc := func() *string {
			if ks.Description.Valid {
				s := ks.Description.String
				return &s
			}
			return nil
		}()
		count := 0
		if ks.Rules != nil {
			count = len(*ks.Rules)
		} else if includeRules {
			if rules, ok := setsWithRules[ks.ID]; ok {
				count = len(rules)
			}
		}
		items = append(items, gen.KeywordSetResponse{
			Id:          openapi_types.UUID(ks.ID),
			Name:        ks.Name,
			Description: desc,
			IsEnabled:   ks.IsEnabled,
			CreatedAt:   ks.CreatedAt,
			UpdatedAt:   ks.UpdatedAt,
			RuleCount:   count,
			Rules:       rulesDTO,
		})
	}
	resp := gen.KeywordSetsList200JSONResponse{Data: &items, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) KeywordSetsCreate(ctx context.Context, r gen.KeywordSetsCreateRequestObject) (gen.KeywordSetsCreateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Keyword == nil {
		return gen.KeywordSetsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "keyword store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || strings.TrimSpace(r.Body.Name) == "" {
		return gen.KeywordSetsCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "name required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	now := time.Now().UTC()
	ks := &models.KeywordSet{
		ID:   uuid.New(),
		Name: r.Body.Name,
		Description: func() sql.NullString {
			if r.Body.Description != nil {
				return sql.NullString{String: *r.Body.Description, Valid: *r.Body.Description != ""}
			}
			return sql.NullString{}
		}(),
		IsEnabled: r.Body.IsEnabled != nil && *r.Body.IsEnabled,
		CreatedAt: now,
		UpdatedAt: now,
	}

	tx, err := h.deps.Stores.Keyword.BeginTxx(ctx, nil)
	if err != nil {
		return gen.KeywordSetsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "tx begin failed", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	defer func() { _ = tx.Rollback() }()

	if err := h.deps.Stores.Keyword.CreateKeywordSet(ctx, tx, ks); err != nil {
		if err == store.ErrDuplicateEntry {
			return gen.KeywordSetsCreate409JSONResponse{ConflictJSONResponse: gen.ConflictJSONResponse{Error: gen.ApiError{Message: "keyword set exists", Code: gen.CONFLICT, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.KeywordSetsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create keyword set", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Optional rules
	if r.Body.Rules != nil && len(*r.Body.Rules) > 0 {
		rules := make([]*models.KeywordRule, 0, len(*r.Body.Rules))
		for _, rr := range *r.Body.Rules {
			rules = append(rules, &models.KeywordRule{
				ID:              uuid.New(),
				KeywordSetID:    ks.ID,
				Pattern:         rr.Pattern,
				RuleType:        models.KeywordRuleTypeEnum(string(rr.RuleType)),
				IsCaseSensitive: rr.IsCaseSensitive != nil && *rr.IsCaseSensitive,
				Category: func() sql.NullString {
					if rr.Category != nil {
						return sql.NullString{String: *rr.Category, Valid: *rr.Category != ""}
					}
					return sql.NullString{}
				}(),
				ContextChars: func() int {
					if rr.ContextChars != nil {
						return *rr.ContextChars
					}
					return 0
				}(),
				CreatedAt: now,
				UpdatedAt: now,
			})
		}
		if err := h.deps.Stores.Keyword.CreateKeywordRules(ctx, tx, rules); err != nil {
			return gen.KeywordSetsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create rules", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}

	if err := tx.Commit(); err != nil {
		return gen.KeywordSetsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "tx commit failed", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Build response
	desc := func() *string {
		if ks.Description.Valid {
			s := ks.Description.String
			return &s
		}
		return nil
	}()
	count := 0
	if r.Body.Rules != nil {
		count = len(*r.Body.Rules)
	}
	resp := gen.KeywordSetsCreate201JSONResponse{
		Data: &gen.KeywordSetResponse{
			Id:          openapi_types.UUID(ks.ID),
			Name:        ks.Name,
			Description: desc,
			IsEnabled:   ks.IsEnabled,
			CreatedAt:   ks.CreatedAt,
			UpdatedAt:   ks.UpdatedAt,
			RuleCount:   count,
		},
		Metadata:  okMeta(),
		RequestId: reqID(),
		Success:   boolPtr(true),
	}
	return resp, nil
}

func (h *strictHandlers) KeywordSetsDelete(ctx context.Context, r gen.KeywordSetsDeleteRequestObject) (gen.KeywordSetsDeleteResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Keyword == nil {
		return gen.KeywordSetsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "keyword store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	tx, err := h.deps.Stores.Keyword.BeginTxx(ctx, nil)
	if err != nil {
		return gen.KeywordSetsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "tx begin failed", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	defer func() { _ = tx.Rollback() }()

	setID := uuid.UUID(r.SetId)
	if err := h.deps.Stores.Keyword.DeleteKeywordRulesBySetID(ctx, tx, setID); err != nil {
		return gen.KeywordSetsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete rules", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Keyword.DeleteKeywordSet(ctx, tx, setID); err != nil {
		if err == store.ErrNotFound {
			return gen.KeywordSetsDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "keyword set not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.KeywordSetsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete keyword set", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := tx.Commit(); err != nil {
		return gen.KeywordSetsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "tx commit failed", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.KeywordSetsDelete204Response{}, nil
}

func (h *strictHandlers) KeywordSetsGet(ctx context.Context, r gen.KeywordSetsGetRequestObject) (gen.KeywordSetsGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Keyword == nil {
		return gen.KeywordSetsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "keyword store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	ks, err := h.deps.Stores.Keyword.GetKeywordSetByID(ctx, h.deps.DB, uuid.UUID(r.SetId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.KeywordSetsGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "keyword set not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.KeywordSetsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch keyword set", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	desc := func() *string {
		if ks.Description.Valid {
			s := ks.Description.String
			return &s
		}
		return nil
	}()
	count := 0
	if ks.Rules != nil {
		count = len(*ks.Rules)
	}
	resp := gen.KeywordSetsGet200JSONResponse{Data: &gen.KeywordSetResponse{
		Id:          openapi_types.UUID(ks.ID),
		Name:        ks.Name,
		Description: desc,
		IsEnabled:   ks.IsEnabled,
		CreatedAt:   ks.CreatedAt,
		UpdatedAt:   ks.UpdatedAt,
		RuleCount:   count,
	}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) KeywordSetsUpdate(ctx context.Context, r gen.KeywordSetsUpdateRequestObject) (gen.KeywordSetsUpdateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Keyword == nil {
		return gen.KeywordSetsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "keyword store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.KeywordSetsUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	setID := uuid.UUID(r.SetId)
	// Ensure exists
	_, err := h.deps.Stores.Keyword.GetKeywordSetByID(ctx, h.deps.DB, setID)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.KeywordSetsUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "keyword set not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.KeywordSetsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch keyword set", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	tx, err := h.deps.Stores.Keyword.BeginTxx(ctx, nil)
	if err != nil {
		return gen.KeywordSetsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "tx begin failed", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	defer func() { _ = tx.Rollback() }()

	// Update set fields
	toUpdate := &models.KeywordSet{ID: setID}
	if r.Body.Name != nil {
		toUpdate.Name = *r.Body.Name
	}
	if r.Body.Description != nil {
		toUpdate.Description = sql.NullString{String: *r.Body.Description, Valid: *r.Body.Description != ""}
	}
	if r.Body.IsEnabled != nil {
		toUpdate.IsEnabled = *r.Body.IsEnabled
	}
	toUpdate.UpdatedAt = time.Now().UTC()
	if err := h.deps.Stores.Keyword.UpdateKeywordSet(ctx, tx, toUpdate); err != nil {
		if err == store.ErrDuplicateEntry {
			return gen.KeywordSetsUpdate422JSONResponse{ValidationErrorJSONResponse: gen.ValidationErrorJSONResponse{Error: gen.ApiError{Message: "name already exists", Code: gen.VALIDATIONERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.KeywordSetsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update keyword set", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Replace rules if provided
	if r.Body.Rules != nil {
		if err := h.deps.Stores.Keyword.DeleteKeywordRulesBySetID(ctx, tx, setID); err != nil {
			return gen.KeywordSetsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete existing rules", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		now := time.Now().UTC()
		rules := make([]*models.KeywordRule, 0, len(*r.Body.Rules))
		for _, rr := range *r.Body.Rules {
			rules = append(rules, &models.KeywordRule{
				ID:              uuid.New(),
				KeywordSetID:    setID,
				Pattern:         rr.Pattern,
				RuleType:        models.KeywordRuleTypeEnum(string(rr.RuleType)),
				IsCaseSensitive: rr.IsCaseSensitive != nil && *rr.IsCaseSensitive,
				Category: func() sql.NullString {
					if rr.Category != nil {
						return sql.NullString{String: *rr.Category, Valid: *rr.Category != ""}
					}
					return sql.NullString{}
				}(),
				ContextChars: func() int {
					if rr.ContextChars != nil {
						return *rr.ContextChars
					}
					return 0
				}(),
				CreatedAt: now,
				UpdatedAt: now,
			})
		}
		if err := h.deps.Stores.Keyword.CreateKeywordRules(ctx, tx, rules); err != nil {
			return gen.KeywordSetsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create rules", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}

	if err := tx.Commit(); err != nil {
		return gen.KeywordSetsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "tx commit failed", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Build response summary
	ks, _ := h.deps.Stores.Keyword.GetKeywordSetByID(ctx, h.deps.DB, setID)
	desc := func() *string {
		if ks != nil && ks.Description.Valid {
			s := ks.Description.String
			return &s
		}
		return nil
	}()
	count := 0
	if ks != nil && ks.Rules != nil {
		count = len(*ks.Rules)
	}
	resp := gen.KeywordSetsUpdate200JSONResponse{Data: &gen.KeywordSetResponse{
		Id: openapi_types.UUID(setID),
		Name: func() string {
			if ks != nil {
				return ks.Name
			}
			if r.Body.Name != nil {
				return *r.Body.Name
			}
			return ""
		}(),
		Description: desc,
		IsEnabled: func() bool {
			if ks != nil {
				return ks.IsEnabled
			}
			if r.Body.IsEnabled != nil {
				return *r.Body.IsEnabled
			}
			return true
		}(),
		CreatedAt: func() time.Time {
			if ks != nil {
				return ks.CreatedAt
			}
			return time.Now().UTC()
		}(),
		UpdatedAt: func() time.Time {
			if ks != nil {
				return ks.UpdatedAt
			}
			return time.Now().UTC()
		}(),
		RuleCount: count,
	}, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}

func (h *strictHandlers) KeywordSetsRulesList(ctx context.Context, r gen.KeywordSetsRulesListRequestObject) (gen.KeywordSetsRulesListResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Keyword == nil {
		return gen.KeywordSetsRulesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "keyword store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	setID := uuid.UUID(r.SetId)
	// Ensure set exists (optional)
	if _, err := h.deps.Stores.Keyword.GetKeywordSetByID(ctx, h.deps.DB, setID); err != nil {
		if err == store.ErrNotFound {
			return gen.KeywordSetsRulesList404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "keyword set not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.KeywordSetsRulesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch keyword set", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	rows, err := h.deps.Stores.Keyword.GetKeywordRulesBySetID(ctx, h.deps.DB, setID)
	if err != nil {
		return gen.KeywordSetsRulesList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch rules", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	dtos := make([]gen.KeywordRuleDTO, 0, len(rows))
	for _, rr := range rows {
		dtos = append(dtos, gen.KeywordRuleDTO{
			Id:              func() *openapi_types.UUID { id := openapi_types.UUID(rr.ID); return &id }(),
			KeywordSetId:    func() *openapi_types.UUID { id := openapi_types.UUID(rr.KeywordSetID); return &id }(),
			Pattern:         &rr.Pattern,
			RuleType:        func() *string { s := string(rr.RuleType); return &s }(),
			IsCaseSensitive: &rr.IsCaseSensitive,
			Category: func() *string {
				if rr.Category.Valid {
					s := rr.Category.String
					return &s
				}
				return nil
			}(),
			ContextChars: &rr.ContextChars,
			CreatedAt:    &rr.CreatedAt,
			UpdatedAt:    &rr.UpdatedAt,
		})
	}
	resp := gen.KeywordSetsRulesList200JSONResponse{Data: &dtos, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}
	return resp, nil
}
