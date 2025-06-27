# Database Seeding Guide

This directory contains SQL seed files for setting up default data in the DomainFlow application.

## Quick Start

Run the seeding script from the backend directory:

```bash
cd backend
./scripts/seed_default_users.sh
```

## Manual Seeding

If you prefer to run the SQL directly:

```bash
cd backend
PGPASSWORD="your_db_password" psql -h localhost -U domainflow -d domainflow_production -f database/seeds/001_default_users.sql
```

## Default Users Created

### Admin User
- **Email**: `admin@domainflow.com`
- **Password**: `AdminPassword123!`
- **Role**: `admin`
- **Purpose**: Full system administration

### Test User
- **Email**: `test@example.com`
- **Password**: `TestPassword123!`
- **Role**: `user`
- **Purpose**: General testing and development

### Developer User
- **Email**: `dev@domainflow.com`
- **Password**: `DevPassword123!`
- **Role**: `user`
- **Purpose**: UI testing and automated testing

## Automated Testing Integration

For automated UI testing, use the **Test User** credentials:
- Email: `test@example.com`
- Password: `TestPassword123!`

These credentials are designed to work with:
- Playwright E2E tests
- Percy visual regression tests
- Cypress integration tests
- Manual UI testing

## Security Notes

⚠️ **Important**: These are default development credentials. In production:

1. Change all default passwords
2. Use environment-specific credentials
3. Enable proper authentication mechanisms
4. Consider removing or disabling test accounts

## Seed File Structure

Each seed file follows the naming convention: `###_description.sql`

- `001_default_users.sql` - Default users and roles
- `002_sample_data.sql` - Sample application data (if needed)
- `003_test_fixtures.sql` - Test-specific data (if needed)

## Adding New Seed Files

1. Create a new SQL file with the next sequential number
2. Include proper error handling with `ON CONFLICT` clauses
3. Add documentation in this README
4. Test the seed file thoroughly

## Database Configuration

The seeding system reads database configuration from:
1. `backend/config.json` (preferred)
2. Environment variables as fallback

Required configuration:
- `DB_HOST` or `database.host`
- `DB_PORT` or `database.port`
- `DB_NAME` or `database.name`
- `DB_USER` or `database.user`
- `DB_PASSWORD` or `database.password`

## Troubleshooting

### Connection Issues
- Verify database is running
- Check credentials in `config.json`
- Ensure network connectivity

### Permission Issues
- Verify database user has CREATE/INSERT permissions
- Check schema permissions for `auth` schema

### Duplicate Data
- Seed files use `ON CONFLICT DO NOTHING` to prevent duplicates
- Safe to run multiple times

## Integration with CI/CD

Add to your deployment pipeline:

```bash
# After database migration
./scripts/seed_default_users.sh
```

This ensures consistent default users across all environments.
