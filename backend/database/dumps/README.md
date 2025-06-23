# Database Dumps

This directory is for storing database backups and dumps.

## Usage

### Full Database Backup
```bash
# Create timestamped backup
pg_dump "your_connection_string" > dumps/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Schema-Only Backup  
```bash
# Create schema dump
pg_dump --schema-only "your_connection_string" > dumps/schema_$(date +%Y%m%d_%H%M%S).sql
```

### Data-Only Backup
```bash
# Create data-only dump
pg_dump --data-only "your_connection_string" > dumps/data_$(date +%Y%m%d_%H%M%S).sql
```

## File Naming Convention

- `backup_YYYYMMDD_HHMMSS.sql` - Full database backups
- `schema_YYYYMMDD_HHMMSS.sql` - Schema-only dumps  
- `data_YYYYMMDD_HHMMSS.sql` - Data-only dumps
- `migration_YYYYMMDD_description.sql` - Migration-related dumps

## Retention Policy

- Keep daily backups for 1 month
- Keep weekly backups for 6 months  
- Keep monthly backups for 1 year
- Archive important milestone backups permanently
