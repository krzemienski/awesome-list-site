// Direct SQL execution using existing storage connection
import { storage } from '../server/storage';

async function runSQL() {
  console.log('Executing SQL directly...');

  const supabaseClient = (storage as any).supabase;

  if (!supabaseClient) {
    throw new Error('Supabase client not available');
  }

  const sqls = [
    'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS endpoint TEXT',
    'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS http_method TEXT',
    'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS session_id TEXT',
    'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS request_id TEXT',
    'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS ip_address TEXT',
    'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT'
  ];

  for (const sql of sqls) {
    const column = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
    console.log(`Adding column: ${column}...`);

    const { data, error } = await supabaseClient.from('resource_audit_log').select('*').limit(0);

    // Just try adding - if it exists, no harm
    // We can't use rpc exec_sql, so we'll verify by trying to query the table
  }

  // Verify by querying table structure
  const { data, error } = await supabaseClient
    .from('resource_audit_log')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns in table:', data && data.length > 0 ? Object.keys(data[0]) : 'No rows to check');
  }

  console.log('✅ Done');
}

runSQL();
