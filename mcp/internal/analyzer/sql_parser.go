package analyzer

import (
	"bufio"
	"io"
	"mcp/internal/models"
	"os"
	"regexp"
	"strings"
)

// ParseSchema parses a SQL schema file and returns a list of tables.
func ParseSchema(filePath string) ([]models.Table, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return parseSQL(file)
}

func parseSQL(r io.Reader) ([]models.Table, error) {
	scanner := bufio.NewScanner(r)
	var tables []models.Table
	var currentTable *models.Table

	createTableRegex := regexp.MustCompile(`(?i)CREATE TABLE (\w+)`)
	columnRegex := regexp.MustCompile(`(?i)^\s*(\w+)\s+([\w\(\)]+)(.*)`)
	primaryKeyRegex := regexp.MustCompile(`(?i)PRIMARY KEY \((.*)\)`)
	indexRegex := regexp.MustCompile(`(?i)CREATE (UNIQUE )?INDEX (\w+) ON (\w+) \((.*)\)`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if strings.HasPrefix(line, "--") || line == "" {
			continue
		}

		if matches := createTableRegex.FindStringSubmatch(line); len(matches) > 1 {
			if currentTable != nil {
				tables = append(tables, *currentTable)
			}
			currentTable = &models.Table{Name: matches[1]}
		} else if currentTable != nil && (strings.HasPrefix(line, ");") || line == ")") {
			tables = append(tables, *currentTable)
			currentTable = nil
		} else if currentTable != nil {
			if colMatches := columnRegex.FindStringSubmatch(line); len(colMatches) > 1 {
				col := models.Column{
					Name: colMatches[1],
					Type: colMatches[2],
				}
				rest := strings.ToLower(colMatches[3])
				if strings.Contains(rest, "not null") {
					col.IsNullable = false
				} else {
					col.IsNullable = true
				}

				defaultValRegex := regexp.MustCompile(`(?i)default\s+'?([^'\s,]+)'?`)
				if defaultMatches := defaultValRegex.FindStringSubmatch(rest); len(defaultMatches) > 1 {
					col.DefaultValue = defaultMatches[1]
				}

				currentTable.Columns = append(currentTable.Columns, col)
			} else if pkMatches := primaryKeyRegex.FindStringSubmatch(line); len(pkMatches) > 1 {
				// This is a simple implementation. It doesn't create a separate index for PK.
			}
		} else if indexMatches := indexRegex.FindStringSubmatch(line); len(indexMatches) > 2 {
			isUnique := indexMatches[1] != ""
			indexName := indexMatches[2]
			tableName := indexMatches[3]
			columns := strings.Split(indexMatches[4], ",")
			for i := range columns {
				columns[i] = strings.TrimSpace(columns[i])
			}

			for i := range tables {
				if tables[i].Name == tableName {
					tables[i].Indexes = append(tables[i].Indexes, models.Index{
						Name:     indexName,
						Columns:  columns,
						IsUnique: isUnique,
					})
					break
				}
			}
		}
	}

	if currentTable != nil {
		tables = append(tables, *currentTable)
	}

	return tables, scanner.Err()
}