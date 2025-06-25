package keywordextractor

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/fntelecomllc/studio/backend/internal/models" // Changed to models.KeywordRule
	"golang.org/x/net/html"
)

// KeywordExtractionResult holds the details of a single keyword match.
type KeywordExtractionResult struct {
	MatchedPattern string   `json:"matchedPattern"`
	MatchedText    string   `json:"matchedText"`
	Category       string   `json:"category,omitempty"`
	Contexts       []string `json:"contexts,omitempty"`
}

// CleanHTMLToText parses HTML content and extracts clean, searchable text.
func CleanHTMLToText(htmlBody string) (string, error) {
	doc, err := html.Parse(strings.NewReader(htmlBody))
	if err != nil {
		return "", err
	}

	var sb strings.Builder
	extractTextFromNode(doc, &sb)
	cleanedText := strings.Join(strings.Fields(sb.String()), " ")
	return cleanedText, nil
}

// extractTextFromNode recursively extracts text from HTML nodes, skipping unwanted elements
func extractTextFromNode(n *html.Node, sb *strings.Builder) {
	if n.Type == html.TextNode {
		trimmedData := strings.TrimSpace(n.Data)
		if trimmedData != "" {
			sb.WriteString(trimmedData)
			sb.WriteString(" ")
		}
	} else if shouldSkipElement(n) {
		return
	} else if n.Type == html.ElementNode && n.Data == "br" {
		sb.WriteString(" ")
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractTextFromNode(c, sb)
	}

	if shouldAddSpaceAfterElement(n) {
		sb.WriteString(" ")
	}
}

// shouldSkipElement determines if an HTML element should be skipped during text extraction
func shouldSkipElement(n *html.Node) bool {
	if n.Type != html.ElementNode {
		return false
	}
	skipElements := []string{"script", "style", "noscript", "head", "title", "nav", "footer", "aside"}
	for _, element := range skipElements {
		if n.Data == element {
			return true
		}
	}
	return false
}

// shouldAddSpaceAfterElement determines if a space should be added after an HTML element
func shouldAddSpaceAfterElement(n *html.Node) bool {
	if n.Type != html.ElementNode {
		return false
	}
	spaceElements := []string{"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "article", "section", "header"}
	for _, element := range spaceElements {
		if n.Data == element {
			return true
		}
	}
	return false
}

// ExtractKeywordsFromText extracts keywords from already cleaned plain text based on a set of model rules.
// Regex rules are compiled on-the-fly here. For performance with many calls, pre-compile regexes.
func ExtractKeywordsFromText(plainTextContent string, rules []models.KeywordRule) ([]KeywordExtractionResult, error) {
	results := []KeywordExtractionResult{}
	if strings.TrimSpace(plainTextContent) == "" {
		return results, nil // No text content to search
	}

	for _, rule := range rules {
		matches, err := findMatches(plainTextContent, rule)
		if err != nil {
			return nil, err
		}

		for _, matchIndices := range matches {
			result := createResult(plainTextContent, rule, matchIndices)
			results = append(results, result)
		}
	}
	return results, nil
}

// findMatches finds all matches for a given rule in the text content
func findMatches(content string, rule models.KeywordRule) ([][]int, error) {
	switch rule.RuleType {
	case models.KeywordRuleTypeRegex:
		return findRegexMatches(content, rule.Pattern, rule.ID.String())
	case models.KeywordRuleTypeString:
		return findStringMatches(content, rule.Pattern, rule.IsCaseSensitive), nil
	default:
		return nil, nil // Skip unknown rule type
	}
}

// findRegexMatches finds matches using regex pattern
func findRegexMatches(content, pattern, ruleID string) ([][]int, error) {
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to compile regex pattern '%s' for rule %s: %w", pattern, ruleID, err)
	}
	return re.FindAllStringIndex(content, -1), nil
}

// findStringMatches finds matches using string pattern
func findStringMatches(content, pattern string, caseSensitive bool) [][]int {
	var matches [][]int
	searchPattern := pattern
	searchContent := content

	if !caseSensitive {
		searchPattern = strings.ToLower(pattern)
		searchContent = strings.ToLower(content)
	}

	idx := 0
	for {
		foundIdx := strings.Index(searchContent[idx:], searchPattern)
		if foundIdx == -1 {
			break
		}
		actualFoundIdx := idx + foundIdx
		matches = append(matches, []int{actualFoundIdx, actualFoundIdx + len(searchPattern)})
		idx = actualFoundIdx + len(searchPattern)
		if idx >= len(searchContent) {
			break
		}
	}
	return matches
}

// createResult creates a KeywordExtractionResult from match indices
func createResult(content string, rule models.KeywordRule, matchIndices []int) KeywordExtractionResult {
	start := matchIndices[0]
	end := matchIndices[1]
	matchedText := content[start:end]

	var contexts []string
	if rule.ContextChars > 0 {
		contexts = extractContext(content, start, end, rule.ContextChars)
	}

	return KeywordExtractionResult{
		MatchedPattern: rule.Pattern,
		MatchedText:    matchedText,
		Category:       rule.Category.String,
		Contexts:       contexts,
	}
}

// extractContext extracts surrounding context for a match
func extractContext(content string, start, end, contextChars int) []string {
	contextStart := start - contextChars
	if contextStart < 0 {
		contextStart = 0
	}
	contextEnd := end + contextChars
	if contextEnd > len(content) {
		contextEnd = len(content)
	}
	return []string{content[contextStart:contextEnd]}
}

// ExtractKeywords (from HTML) now uses ExtractKeywordsFromText after cleaning HTML.
func ExtractKeywords(htmlContent []byte, rules []models.KeywordRule) ([]KeywordExtractionResult, error) {
	plainTextContent, err := CleanHTMLToText(string(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("failed to clean HTML content: %w", err)
	}
	return ExtractKeywordsFromText(plainTextContent, rules)
}
