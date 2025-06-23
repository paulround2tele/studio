import * as fs from 'fs/promises';
import * as path from 'path';

interface DatabaseContextArgs {
  table?: string;
  includeRelations?: boolean;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  constraints: string[];
  indexes: string[];
  relations: RelationInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  description?: string;
}

interface RelationInfo {
  type: 'foreign_key' | 'one_to_many' | 'many_to_many';
  targetTable: string;
  columns: string[];
  targetColumns: string[];
}

/**
 * Database Context Tool
 * 
 * Provides PostgreSQL schema context for database operations.
 * Understands DomainFlow's database structure and relationships.
 */
export async function databaseContextTool(
  args: DatabaseContextArgs,
  rootPath: string
) {
  const { table, includeRelations = true } = args;

  try {
    const schemaInfo = await getDatabaseSchema(rootPath);
    const migrationInfo = await getMigrationInfo(rootPath);
    
    let relevantTables: TableInfo[];
    if (table) {
      relevantTables = schemaInfo.filter(t => 
        t.name.toLowerCase().includes(table.toLowerCase()) ||
        table.toLowerCase().includes(t.name.toLowerCase())
      );
    } else {
      relevantTables = schemaInfo;
    }

    const summary = generateDatabaseSummary(relevantTables, migrationInfo, includeRelations, table);

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to get database context: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getDatabaseSchema(rootPath: string): Promise<TableInfo[]> {
  const tables: TableInfo[] = [];

  // Try to read production schema first
  let schemaContent = '';
  try {
    const productionSchemaPath = path.join(rootPath, 'backend/database/production_schema_v3.sql');
    schemaContent = await fs.readFile(productionSchemaPath, 'utf-8');
  } catch (error) {
    // Fall back to development schema
    try {
      const devSchemaPath = path.join(rootPath, 'backend/database/schema.sql');
      schemaContent = await fs.readFile(devSchemaPath, 'utf-8');
    } catch (devError) {
      throw new Error('No database schema files found');
    }
  }

  // Parse SQL schema
  const parsedTables = parseSQLSchema(schemaContent);
  tables.push(...parsedTables);

  return tables;
}

async function getMigrationInfo(rootPath: string): Promise<string> {
  try {
    const migrationPath = path.join(rootPath, 'backend/MIGRATIONS.md');
    return await fs.readFile(migrationPath, 'utf-8');
  } catch (error) {
    return 'No migration information available';
  }
}

function parseSQLSchema(schemaContent: string): TableInfo[] {
  const tables: TableInfo[] = [];
  
  // Extract CREATE TABLE statements
  const tableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+\.)?(\w+)\s*\((.*?)\);/gis;
  let match;

  while ((match = tableRegex.exec(schemaContent)) !== null) {
    const schema = match[1]?.replace('.', '') || 'public';
    const tableName = match[2];
    const tableBody = match[3];

    const columns = parseTableColumns(tableBody);
    const constraints = parseTableConstraints(tableBody);
    const indexes = findTableIndexes(schemaContent, tableName);
    const relations = findTableRelations(schemaContent, tableName);

    tables.push({
      name: `${schema === 'public' ? '' : schema + '.'}${tableName}`,
      columns,
      constraints,
      indexes,
      relations,
    });
  }

  return tables;
}

function parseTableColumns(tableBody: string): ColumnInfo[] {
  const columns: ColumnInfo[] = [];
  const lines = tableBody.split('\n').map(line => line.trim());

  for (const line of lines) {
    // Skip constraint lines
    if (line.toUpperCase().includes('CONSTRAINT') || 
        line.toUpperCase().includes('PRIMARY KEY') ||
        line.toUpperCase().includes('FOREIGN KEY') ||
        line.toUpperCase().includes('UNIQUE') ||
        line.toUpperCase().includes('CHECK') ||
        line === '' || line === ',') {
      continue;
    }

    // Parse column definition
    const columnMatch = line.match(/^(\w+)\s+([^,\s]+(?:\s*\([^)]+\))?)\s*(.*?)(?:,|$)/i);
    if (columnMatch) {
      const columnName = columnMatch[1];
      const columnType = columnMatch[2];
      const modifiers = columnMatch[3] || '';

      const nullable = !modifiers.toUpperCase().includes('NOT NULL');
      const defaultMatch = modifiers.match(/DEFAULT\s+([^,\s]+)/i);
      const defaultValue = defaultMatch ? defaultMatch[1] : undefined;

      columns.push({
        name: columnName,
        type: columnType,
        nullable,
        defaultValue,
        description: getColumnDescription(columnName, columnType),
      });
    }
  }

  return columns;
}

function parseTableConstraints(tableBody: string): string[] {
  const constraints: string[] = [];
  const lines = tableBody.split('\n').map(line => line.trim());

  for (const line of lines) {
    if (line.toUpperCase().includes('CONSTRAINT') ||
        line.toUpperCase().includes('PRIMARY KEY') ||
        line.toUpperCase().includes('FOREIGN KEY') ||
        line.toUpperCase().includes('UNIQUE') ||
        line.toUpperCase().includes('CHECK')) {
      constraints.push(line.replace(/,$/, ''));
    }
  }

  return constraints;
}

function findTableIndexes(schemaContent: string, tableName: string): string[] {
  const indexes: string[] = [];
  const indexRegex = new RegExp(`CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+\\w+\\s+ON\\s+${tableName}\\s*\\([^)]+\\)`, 'gi');
  let match;

  while ((match = indexRegex.exec(schemaContent)) !== null) {
    indexes.push(match[0]);
  }

  return indexes;
}

function findTableRelations(schemaContent: string, tableName: string): RelationInfo[] {
  const relations: RelationInfo[] = [];
  
  // Find foreign key constraints
  const fkRegex = new RegExp(
    `FOREIGN KEY\\s*\\(([^)]+)\\)\\s*REFERENCES\\s+(\\w+)\\s*\\(([^)]+)\\)`,
    'gi'
  );
  
  let match;
  while ((match = fkRegex.exec(schemaContent)) !== null) {
    const columns = match[1].split(',').map(c => c.trim());
    const targetTable = match[2];
    const targetColumns = match[3].split(',').map(c => c.trim());

    relations.push({
      type: 'foreign_key',
      targetTable,
      columns,
      targetColumns,
    });
  }

  return relations;
}

function getColumnDescription(columnName: string, columnType: string): string {
  const descriptions: Record<string, string> = {
    'id': 'Primary key identifier',
    'user_id': 'Reference to user table',
    'campaign_id': 'Reference to campaign table',
    'persona_id': 'Reference to persona table',
    'created_at': 'Record creation timestamp',
    'updated_at': 'Record last update timestamp',
    'deleted_at': 'Soft delete timestamp',
    'name': 'Display name or title',
    'email': 'Email address',
    'password_hash': 'Hashed password',
    'status': 'Current status or state',
    'config': 'JSON configuration data',
    'results': 'Operation results data',
    'error_message': 'Error details if operation failed',
    'is_active': 'Active/inactive flag',
    'is_enabled': 'Enabled/disabled flag',
  };

  const knownDescription = descriptions[columnName.toLowerCase()];
  if (knownDescription) {
    return knownDescription;
  }

  // Generate description based on type
  if (columnType.toLowerCase().includes('bigint')) {
    return 'Large integer value (maps to SafeBigInt in TypeScript)';
  } else if (columnType.toLowerCase().includes('uuid')) {
    return 'UUID identifier (maps to UUID branded type)';
  } else if (columnType.toLowerCase().includes('timestamp')) {
    return 'Timestamp value (maps to ISODateString branded type)';
  } else if (columnType.toLowerCase().includes('json')) {
    return 'JSON data structure';
  } else if (columnType.toLowerCase().includes('text')) {
    return 'Text data';
  } else if (columnType.toLowerCase().includes('boolean')) {
    return 'Boolean flag';
  }

  return `${columnType} column`;
}

function generateDatabaseSummary(
  tables: TableInfo[],
  migrationInfo: string,
  includeRelations: boolean,
  specificTable?: string
): string {
  let summary = `# Database Schema Context${specificTable ? `: ${specificTable}` : ''}\n\n`;
  
  if (specificTable) {
    summary += `Found ${tables.length} table(s) related to: **${specificTable}**\n\n`;
  } else {
    summary += `Complete database schema with ${tables.length} tables\n\n`;
  }

  // Schema overview
  summary += generateSchemaOverview(tables);

  // Table details
  for (const table of tables.slice(0, 10)) { // Limit to 10 tables
    summary += generateTableDetail(table, includeRelations);
  }

  // Type mapping guide
  summary += generateTypeMappingGuide();

  // Migration context
  if (migrationInfo !== 'No migration information available') {
    summary += `## Migration Context\n\n`;
    summary += `${migrationInfo.slice(0, 2000)}...\n\n`; // Truncate for brevity
  }

  return summary;
}

function generateSchemaOverview(tables: TableInfo[]): string {
  let overview = `## Schema Overview\n\n`;
  
  const tablesBySchema: Record<string, string[]> = {};
  for (const table of tables) {
    const [schema, tableName] = table.name.includes('.') 
      ? table.name.split('.')
      : ['public', table.name];
    
    if (!tablesBySchema[schema]) {
      tablesBySchema[schema] = [];
    }
    tablesBySchema[schema].push(tableName);
  }

  for (const [schema, tableNames] of Object.entries(tablesBySchema)) {
    overview += `**${schema} schema**: ${tableNames.join(', ')}\n\n`;
  }

  // Key entities
  const keyEntities = tables.filter(t => 
    ['user', 'campaign', 'persona', 'proxy', 'session'].some(entity => 
      t.name.toLowerCase().includes(entity)
    )
  );

  if (keyEntities.length > 0) {
    overview += `**Key Entities**: ${keyEntities.map(t => t.name).join(', ')}\n\n`;
  }

  return overview;
}

function generateTableDetail(table: TableInfo, includeRelations: boolean): string {
  let detail = `## Table: \`${table.name}\`\n\n`;
  
  // Columns
  detail += `### Columns\n\n`;
  detail += `| Column | Type | Nullable | Default | Description |\n`;
  detail += `|--------|------|----------|---------|-------------|\n`;
  
  for (const column of table.columns) {
    const nullable = column.nullable ? 'Yes' : 'No';
    const defaultValue = column.defaultValue || '-';
    const description = column.description || '-';
    
    detail += `| \`${column.name}\` | \`${column.type}\` | ${nullable} | \`${defaultValue}\` | ${description} |\n`;
  }
  detail += '\n';

  // Constraints
  if (table.constraints.length > 0) {
    detail += `### Constraints\n\n`;
    for (const constraint of table.constraints) {
      detail += `- \`${constraint}\`\n`;
    }
    detail += '\n';
  }

  // Indexes
  if (table.indexes.length > 0) {
    detail += `### Indexes\n\n`;
    for (const index of table.indexes) {
      detail += `- \`${index}\`\n`;
    }
    detail += '\n';
  }

  // Relations
  if (includeRelations && table.relations.length > 0) {
    detail += `### Relations\n\n`;
    for (const relation of table.relations) {
      detail += `- **${relation.type}**: \`${relation.columns.join(', ')}\` → \`${relation.targetTable}.${relation.targetColumns.join(', ')}\`\n`;
    }
    detail += '\n';
  }

  return detail;
}

function generateTypeMappingGuide(): string {
  return `
## Type Mapping Guide

### PostgreSQL → Go → TypeScript

| PostgreSQL | Go | TypeScript | Notes |
|------------|----|-----------|---------| 
| \`BIGINT\` | \`int64\` | \`SafeBigInt\` | Use SafeBigInt for type safety |
| \`UUID\` | \`uuid.UUID\` | \`UUID\` | Branded type for UUID validation |
| \`TIMESTAMP\` | \`time.Time\` | \`ISODateString\` | ISO 8601 string format |
| \`TEXT\` | \`string\` | \`string\` | Standard string type |
| \`BOOLEAN\` | \`bool\` | \`boolean\` | Standard boolean type |
| \`JSONB\` | \`json.RawMessage\` | \`Record<string, unknown>\` | Flexible JSON structure |
| \`INTEGER\` | \`int32\` | \`number\` | Standard number type |

### Key Principles

1. **Type Safety**: All int64 fields use SafeBigInt to prevent precision loss
2. **Branded Types**: UUID and ISODateString are branded for compile-time safety
3. **Contract Alignment**: Perfect alignment between database, Go models, and TypeScript types
4. **Validation**: Runtime validation ensures type safety at boundaries

### Common Patterns

- **ID Fields**: Always use UUID type with proper validation
- **Timestamps**: created_at, updated_at use ISODateString
- **Foreign Keys**: Properly typed with target table's ID type
- **JSON Fields**: Use Record<string, unknown> with runtime validation
- **Enums**: Database enums map to TypeScript union types

### Migration Considerations

- **Schema v3**: Production-ready with optimized constraints
- **Type Changes**: Require coordinated updates across all layers
- **Index Updates**: Performance optimizations included in schema
- **Default Values**: Configured for production deployment
`;
}