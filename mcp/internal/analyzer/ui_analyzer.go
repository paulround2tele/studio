package analyzer

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"mcp/internal/models"
)

// ParseUI parses HTML and extracts UI components and content information
func ParseUI(html string) ([]models.UIComponent, []models.UIContent, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil, nil, err
	}

	var comps []models.UIComponent
	var contents []models.UIContent

	doc.Find("[data-component], [role]").Each(func(i int, s *goquery.Selection) {
		comp := models.UIComponent{
			Name:    s.AttrOr("data-component", ""),
			Tag:     goquery.NodeName(s),
			ID:      s.AttrOr("id", ""),
			Role:    s.AttrOr("role", ""),
			Classes: strings.Fields(s.AttrOr("class", "")),
		}
		styleAttr, _ := s.Attr("style")
		if styleAttr != "" {
			parts := strings.Split(styleAttr, ";")
			for _, p := range parts {
				p = strings.TrimSpace(p)
				if p != "" {
					comp.Styles = append(comp.Styles, p)
				}
			}
		}
		for _, cls := range comp.Classes {
			if strings.HasPrefix(cls, "text-") || strings.HasPrefix(cls, "bg-") || strings.HasPrefix(cls, "p-") || strings.HasPrefix(cls, "m-") || strings.HasPrefix(cls, "font-") {
				comp.Styles = append(comp.Styles, cls)
			}
		}
		comps = append(comps, comp)

		c := models.UIContent{Component: comp.Name}
		text := strings.TrimSpace(s.Text())
		if text != "" {
			c.Text = text
		}
		if alt, ok := s.Attr("alt"); ok && alt != "" {
			c.Alt = alt
		}
		aria := map[string]string{}
		for _, attr := range s.Nodes[0].Attr {
			if strings.HasPrefix(attr.Key, "aria-") {
				aria[attr.Key] = attr.Val
			}
		}
		if len(aria) > 0 {
			c.ARIA = aria
		}
		if c.Text != "" || c.Alt != "" || len(c.ARIA) > 0 {
			if c.Component == "" {
				if comp.ID != "" {
					c.Component = comp.ID
				} else if comp.Role != "" {
					c.Component = comp.Role
				} else {
					c.Component = comp.Tag
				}
			}
			contents = append(contents, c)
		}
	})

	return comps, contents, nil
}

// MapComponentsToSource attempts to map components to React files in the repo
func MapComponentsToSource(root string, comps []models.UIComponent) ([]models.CodeMap, error) {
	var result []models.CodeMap
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() || !(strings.HasSuffix(path, ".tsx") || strings.HasSuffix(path, ".jsx")) {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		content := string(data)
		for _, comp := range comps {
			key := comp.Name
			if key == "" {
				key = comp.ID
			}
			if key == "" {
				continue
			}
			if strings.Contains(content, key) {
				snippet := extractSnippet(content, key)
				result = append(result, models.CodeMap{Component: key, File: path, Snippet: snippet})
			}
		}
		return nil
	})
	return result, err
}

func extractSnippet(fileContent, token string) string {
	lines := strings.Split(fileContent, "\n")
	for _, line := range lines {
		if strings.Contains(line, token) {
			trimmed := strings.TrimSpace(line)
			if len(trimmed) > 120 {
				return trimmed[:120]
			}
			return trimmed
		}
	}
	return ""
}

// BuildUIPrompt assembles the final payload
func BuildUIPrompt(screenshot string, comps []models.UIComponent, code []models.CodeMap, content []models.UIContent) models.UIPromptPayload {
	return models.UIPromptPayload{
		Screenshot: models.UIScreenshot{Path: screenshot},
		Metadata:   comps,
		CodeMap:    code,
		Content:    content,
	}
}

// ExtractTestElements parses HTML and returns UI elements useful for testing
func ExtractTestElements(html string) ([]models.UITestElement, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil, err
	}

	var elements []models.UITestElement
	selectors := []string{"input", "button", "form", "[role=dialog]", "[role=tab]", "[data-testid]"}
	doc.Find(strings.Join(selectors, ",")).Each(func(i int, s *goquery.Selection) {
		el := models.UITestElement{
			Type:       goquery.NodeName(s),
			Text:       strings.TrimSpace(s.Text()),
			ID:         s.AttrOr("id", ""),
			Name:       s.AttrOr("name", ""),
			DataTestID: s.AttrOr("data-testid", ""),
			Classes:    strings.Fields(s.AttrOr("class", "")),
		}
		aria := map[string]string{}
		for _, attr := range s.Nodes[0].Attr {
			if strings.HasPrefix(attr.Key, "aria-") {
				aria[attr.Key] = attr.Val
			}
		}
		if len(aria) > 0 {
			el.ARIA = aria
		}
		elements = append(elements, el)
	})
	return elements, nil
}

// BuildUITestMarkdown writes a markdown prompt describing the page elements
func BuildUITestMarkdown(url string, elems []models.UITestElement, screenshot string) (string, error) {
	ts := time.Now().Unix()
	file := filepath.Join(os.TempDir(), fmt.Sprintf("ui_prompt_%d.md", ts))
	f, err := os.Create(file)
	if err != nil {
		return "", err
	}
	defer f.Close()

	fmt.Fprintf(f, "Page: %s\n", url)
	fmt.Fprintf(f, "Screenshot: %s\n\n", screenshot)
	fmt.Fprintln(f, "Components:")
	for _, e := range elems {
		meta := []string{}
		if e.ID != "" {
			meta = append(meta, fmt.Sprintf("id: %s", e.ID))
		}
		if e.Name != "" {
			meta = append(meta, fmt.Sprintf("name: %s", e.Name))
		}
		if e.DataTestID != "" {
			meta = append(meta, fmt.Sprintf("data-testid: %s", e.DataTestID))
		}
		line := fmt.Sprintf("- %s: \"%s\"", strings.Title(e.Type), e.Text)
		if len(meta) > 0 {
			line += " (" + strings.Join(meta, ", ") + ")"
		}
		fmt.Fprintln(f, line)
	}
	return file, nil
}
