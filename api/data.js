import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS tracker_data (
      id SERIAL PRIMARY KEY,
      account_key VARCHAR(255) UNIQUE NOT NULL DEFAULT 'default',
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const key = req.query.key || 'default';
      const rows = await sql`SELECT data FROM tracker_data WHERE account_key = ${key}`;
      if (rows.length > 0) {
        return res.status(200).json({ success: true, data: rows[0].data });
      }
      return res.status(200).json({ success: true, data: null });
    }

    if (req.method === 'POST') {
      const { key = 'default', data } = req.body;
      await sql`
        INSERT INTO tracker_data (account_key, data, updated_at)
        VALUES (${key}, ${JSON.stringify(data)}, NOW())
        ON CONFLICT (account_key)
        DO UPDATE SET data = ${JSON.stringify(data)}, updated_at = NOW()
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const key = req.query.key || 'default';
      await sql`DELETE FROM tracker_data WHERE account_key = ${key}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
}
