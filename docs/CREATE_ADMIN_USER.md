# Creating Admin User

## Step 1: Sign up via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm/auth/users
2. Click "Add user" → "Create new user"
3. Enter email: admin@yourdomain.com (or your email)
4. Enter password: (generate strong password)
5. Click "Create user"
6. **IMPORTANT**: Check "Auto Confirm User" to skip email verification

## Step 2: Promote to Admin via SQL

```sql
-- Run this in Supabase SQL Editor
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@yourdomain.com';

-- Verify
SELECT email, raw_user_meta_data->>'role' as role 
FROM auth.users;
```

## Step 3: Test Admin Access

1. Start dev server: `npm run dev`
2. Open: http://localhost:5000/login
3. Login with admin email and password
4. Navigate to: http://localhost:5000/admin
5. Verify: Dashboard loads, stats visible

## Alternative: Via Supabase MCP

```typescript
// Create user
mcp__supabase__execute_sql({
  query: `
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data
    ) VALUES (
      'admin@yourdomain.com',
      crypt('YourStrongPassword', gen_salt('bf')),
      NOW(),
      '{"role": "admin"}'::jsonb
    );
  `
})
```

