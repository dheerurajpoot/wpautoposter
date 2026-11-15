/**
 * Supabase Schema Migration Runner.
 *
 * Reads supabase/migrations/20261030_saas_schema.sql and applies it to your Supabase PostgreSQL database.
 *
 * Configuration:
 * - Reads DATABASE_URL or SUPABASE_DB_PASSWORD from .env
 */

import '../env-bootstrap';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { logger } from '../logger';

async function runSupabaseMigration() {
    const supabaseUrl = process.env.SUPABASE_URL;
    let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;

    if (!supabaseUrl) {
        console.error('❌ Error: SUPABASE_URL is not defined in .env');
        process.exit(1);
    }

    const host = new URL(supabaseUrl).host;
    const projectRef = host.split('.')[0];

    // If databaseUrl is missing but dbPassword is provided, construct direct pooler connection
    if (!databaseUrl && dbPassword) {
        databaseUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;
    }

    if (!databaseUrl) {
        console.log('\n================================================================');
        console.log('📌 SUPABASE SQL MIGRATION REQUIRED');
        console.log('================================================================');
        console.log('You have configured SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
        console.log('Because Supabase isolates DDL (schema creation) to PostgreSQL, you can either:');
        console.log('\nOption 1: 1-Click via Supabase SQL Editor (Recommended)');
        console.log(`1. Open your browser to:`);
        console.log(`   👉 https://supabase.com/dashboard/project/${projectRef}/sql/new`);
        console.log(`2. Copy and paste the contents of:`);
        console.log(`   👉 supabase/migrations/20261030_saas_schema.sql`);
        console.log(`3. Click the green "Run" button.`);
        console.log('\nOption 2: Automated CLI Migration');
        console.log('Add your Supabase database password to your .env file:');
        console.log('   SUPABASE_DB_PASSWORD=your_db_password');
        console.log('Or add the direct connection string from Supabase Settings -> Database:');
        console.log('   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@...');
        console.log('Then run:');
        console.log('   npm run migrate:supabase\n');
        process.exit(0);
    }

    const migrationFile = path.resolve(process.cwd(), 'supabase/migrations/20261030_saas_schema.sql');
    if (!fs.existsSync(migrationFile)) {
        console.error(`❌ Migration file not found at: ${migrationFile}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationFile, 'utf-8');

    console.log(`🚀 Connecting to Supabase database (project: ${projectRef})...`);
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('✅ Connected to Supabase PostgreSQL!');
        console.log('⏳ Applying schema migration...');

        await client.query(sql);

        console.log('🎉 Schema migration applied successfully!');
        console.log('Tables created: profiles, user_settings, keywords, user_prompts, global_prompt_templates, payment_records, pipeline_runs.');
        console.log('RLS policies and triggers enabled.');
    } catch (err: any) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runSupabaseMigration();

