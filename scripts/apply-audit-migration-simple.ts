import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

async function runMigration() {
  console.log('📦 Applying enhanced audit logging migration via Supabase client...');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Add columns one by one (more reliable than full SQL file)
    console.log('Adding endpoint column...');
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS endpoint TEXT'
    });
    if (e1 && !e1.message.includes('already exists')) console.warn('Warning:', e1.message);

    console.log('Adding http_method column...');
    const { error: e2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS http_method TEXT'
    });
    if (e2 && !e2.message.includes('already exists')) console.warn('Warning:', e2.message);

    console.log('Adding session_id column...');
    const { error: e3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS session_id TEXT'
    });
    if (e3 && !e3.message.includes('already exists')) console.warn('Warning:', e3.message);

    console.log('Adding request_id column...');
    const { error: e4 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS request_id TEXT'
    });
    if (e4 && !e4.message.includes('already exists')) console.warn('Warning:', e4.message);

    console.log('Adding ip_address column...');
    const { error: e5 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS ip_address TEXT'
    });
    if (e5 && !e5.message.includes('already exists')) console.warn('Warning:', e5.message);

    console.log('Adding user_agent column...');
    const { error: e6 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE resource_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT'
    });
    if (e6 && !e6.message.includes('already exists')) console.warn('Warning:', e6.message);

    console.log('✅ All columns added successfully');

    // Verify
    const { data, error } = await supabase
      .from('resource_audit_log')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Verification failed:', error);
    } else {
      console.log('✅ Verification: resource_audit_log table accessible');
      if (data && data.length > 0) {
        console.log('Sample row columns:', Object.keys(data[0]));
      }
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration();
