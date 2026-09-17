const { Pool } = require('pg');

// PostgreSQL connection pool for serverless environment
let pool;
let isPoolClosed = false;

const getPool = () => {
  if (!pool || isPoolClosed) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/devops_platform',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1, // For serverless, limit to 1 connection per function
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    isPoolClosed = false;
  }
  return pool;
};

// Helper function to run queries
const executeQuery = async (text, params) => {
  const start = Date.now();
  try {
    const currentPool = getPool();
    console.log('Database pool created:', !!currentPool);
    // Convert SQLite style (?) placeholders to PostgreSQL style ($1, $2, etc.)
    let pgQuery = text;
    let paramIndex = 1;
    while (pgQuery.includes('?')) {
      pgQuery = pgQuery.replace('?', `$${paramIndex}`);
      paramIndex++;
    }
    console.log('Executing query:', pgQuery, 'with params:', params);
    const res = await currentPool.query(pgQuery, params);
    const duration = Date.now() - start;
    console.log('Executed query successfully', { text: pgQuery, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Initialize database schema
const initializeDatabase = async () => {
  try {
    console.log('Starting database initialization...');
    // Create tables
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'student',
        avatar TEXT,
        is_approved INTEGER DEFAULT 0,
        approved_by TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT DEFAULT '#3B82F6',
        order_num INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        track_id TEXT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        thumbnail TEXT,
        price REAL DEFAULT 0,
        is_free INTEGER DEFAULT 0,
        level TEXT DEFAULT 'beginner',
        duration_hours INTEGER DEFAULT 0,
        order_num INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (track_id) REFERENCES tracks(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS roadmap_steps (
        id TEXT PRIMARY KEY,
        track_id TEXT NOT NULL,
        course_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        step_type TEXT DEFAULT 'topic',
        level_num INTEGER DEFAULT 1,
        level_title TEXT,
        order_num INTEGER DEFAULT 0,
        is_required INTEGER DEFAULT 1,
        FOREIGN KEY (track_id) REFERENCES tracks(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT,
        duration_minutes INTEGER DEFAULT 0,
        order_num INTEGER DEFAULT 0,
        is_preview INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        instructions TEXT,
        expected_output TEXT,
        difficulty TEXT DEFAULT 'medium',
        order_num INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS task_submissions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        answer TEXT,
        status TEXT DEFAULT 'pending',
        feedback TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        payment_status TEXT DEFAULT 'free',
        payment_id TEXT,
        is_approved INTEGER DEFAULT 0,
        approved_by TEXT,
        approved_at TIMESTAMP,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS video_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        watched INTEGER DEFAULT 0,
        progress_seconds INTEGER DEFAULT 0,
        UNIQUE(user_id, video_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (video_id) REFERENCES videos(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'usd',
        status TEXT DEFAULT 'pending',
        stripe_session_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        certificate_url TEXT,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS discussions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (parent_id) REFERENCES discussions(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image TEXT,
        tags TEXT,
        category TEXT DEFAULT 'general',
        is_published INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS article_likes (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(article_id, user_id),
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS article_comments (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES article_comments(id) ON DELETE CASCADE
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS article_shares (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    console.error('Error details:', error.message);
    throw error;
  }
};

// Seed initial data
const seedDatabase = async () => {
  try {
    const { v4: uuidv4 } = require('uuid');

    // Check if tracks exist
    const tracksCount = await executeQuery('SELECT COUNT(*) as count FROM tracks');
    if (tracksCount.rows[0].count > 0) {
      console.log('Database already seeded');
      return;
    }

    console.log('Seeding database...');

    // Insert tracks
    const devopsId = uuidv4();
    const cloudId = uuidv4();
    const sysadminId = uuidv4();

    await executeQuery('INSERT INTO tracks (id, title, slug, description, icon, color, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [devopsId, 'DevOps Engineer', 'devops', 'Master CI/CD, Docker, Kubernetes, Jenkins, and modern DevOps practices from zero to hero', '⚙️', '#F59E0B', 1]);
    await executeQuery('INSERT INTO tracks (id, title, slug, description, icon, color, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [cloudId, 'Cloud Engineer', 'cloud', 'Master AWS, Azure, GCP and cloud architecture best practices', '☁️', '#3B82F6', 2]);
    await executeQuery('INSERT INTO tracks (id, title, slug, description, icon, color, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [sysadminId, 'System Administrator', 'sysadmin', 'Master Linux, networking, security and system administration', '🖥️', '#10B981', 3]);

    // Insert sample courses
    const insertCourse = async (trackId, name, slug, desc, price, free, level, hours, order) => {
      const cid = uuidv4();
      await executeQuery('INSERT INTO courses (id, track_id, title, slug, description, price, is_free, level, duration_hours, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [cid, trackId, name, slug, desc, price, free, level, hours, order]);
      return cid;
    };

    // DevOps courses
    await insertCourse(devopsId, 'Networking Basics', 'networking-basics', 'TCP/IP, DNS, HTTP, OSI model — core networking for DevOps', 0, 1, 'beginner', 8, 1);
    await insertCourse(devopsId, 'Linux Fundamentals', 'linux-devops', 'Linux fundamentals, file system, permissions, processes', 0, 1, 'beginner', 10, 2);
    await insertCourse(devopsId, 'Git Version Control', 'git-devops', 'Version control, branching strategies, Git workflows', 0, 1, 'beginner', 6, 3);
    await insertCourse(devopsId, 'Bash Scripting', 'bash-scripting', 'Shell scripting, automation with Bash', 39, 0, 'beginner', 8, 4);
    await insertCourse(devopsId, 'Python for DevOps', 'python-devops', 'Python scripting for automation and DevOps tooling', 49, 0, 'beginner', 12, 5);

    // Cloud courses
    await insertCourse(cloudId, 'Cloud Computing Basics', 'cloud-basics', 'Introduction to cloud computing concepts', 0, 1, 'beginner', 6, 1);
    await insertCourse(cloudId, 'AWS Core Services', 'aws-core', 'EC2, S3, VPC, IAM and more', 69, 0, 'intermediate', 18, 2);
    await insertCourse(cloudId, 'AWS Solutions Architect', 'aws-architect', 'Design scalable AWS architectures', 99, 0, 'advanced', 25, 3);

    // System Admin courses
    await insertCourse(sysadminId, 'Linux System Administration', 'linux-sysadmin', 'Complete Linux system administration guide', 0, 1, 'beginner', 15, 1);
    await insertCourse(sysadminId, 'Network Security', 'network-security', 'Network security fundamentals and best practices', 59, 0, 'intermediate', 12, 2);
    await insertCourse(sysadminId, 'Server Management', 'server-management', 'Server deployment and management', 49, 0, 'intermediate', 10, 3);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Simple PostgreSQL query helpers
const db = {
  async get(query, params) {
    const result = await executeQuery(query, params);
    return result.rows[0];
  },
  async all(query, params) {
    const result = await executeQuery(query, params);
    return result.rows;
  },
  async run(query, params) {
    const result = await executeQuery(query, params);
    return { changes: result.rowCount };
  },
  async exec(sql) {
    return await executeQuery(sql);
  },
  async prepare(queryText) {
    return {
      get: async (...params) => await db.get(queryText, params),
      all: async (...params) => await db.all(queryText, params),
      run: async (...params) => await db.run(queryText, params)
    };
  },
  pragma(statement) {
    console.log('Pragma ignored:', statement);
  },
  async close() {
    if (pool && !isPoolClosed) {
      try {
        await pool.end();
        isPoolClosed = true;
      } catch (err) {
        console.error('Error closing pool:', err);
      }
    }
  }
};

// Initialize and seed database (but don't block startup)
let dbInitialized = false;
const ensureDbInitialized = async () => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      await seedDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  }
};

// Auto-initialize on module load
ensureDbInitialized().catch(err => {
  console.error('Database initialization error:', err);
});

module.exports = db;