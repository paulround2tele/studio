package utils

import (
	"bufio"
	"os"
	"path/filepath"
	"regexp"
)

type SearchResult struct {
	File    string `json:"file"`
	Line    int    `json:"line"`
	Content string `json:"content"`
}

// SearchFiles searches for a pattern in files within a given directory.
func SearchFiles(rootDir, pattern string) ([]SearchResult, error) {
	var results []SearchResult
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, err
	}

	err = filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			file, err := os.Open(path)
			if err != nil {
				return nil // Continue walking
			}
			defer file.Close()

			scanner := bufio.NewScanner(file)
			for i := 1; scanner.Scan(); i++ {
				if re.Match(scanner.Bytes()) {
					results = append(results, SearchResult{
						File:    path,
						Line:    i,
						Content: scanner.Text(),
					})
				}
			}
		}
		return nil
	})

	return results, err
}
