/**
 * Updates the Cloud Engineer roadmap with the new 16-step structure.
 * Run with: node scripts/update-cloud-roadmap.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = new Database(path.join(__dirname, '..', 'platform.db'));
db.pragma('journal_mode = WAL');

// ── helpers ─────────────────────────────────────────────────
const insertCourse  = db.prepare(`
  INSERT OR IGNORE INTO courses
    (id, track_id, title, slug, description, price, is_free, level, duration_hours, order_num)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);
const insertRoadmap = db.prepare(`
  INSERT INTO roadmap_steps
    (id, track_id, course_id, title, description, step_type, level_num, level_title, order_num, is_required)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);
const insertVideo = db.prepare(`
  INSERT OR IGNORE INTO videos
    (id, course_id, title, description, video_url, duration_minutes, order_num, is_preview)
  VALUES (?,?,?,?,?,?,?,?)
`);
const insertTask = db.prepare(`
  INSERT OR IGNORE INTO tasks
    (id, course_id, title, description, instructions, expected_output, difficulty, order_num)
  VALUES (?,?,?,?,?,?,?,?)
`);

// ── get cloud track id ───────────────────────────────────────
const cloudTrack = db.prepare("SELECT * FROM tracks WHERE slug = 'cloud'").get();
if (!cloudTrack) { console.error('❌ Cloud track not found!'); process.exit(1); }

console.log(`✅ Found cloud track: ${cloudTrack.id}`);

// ── wipe old cloud roadmap steps & courses ───────────────────
const oldCourseIds = db.prepare("SELECT id FROM courses WHERE track_id = ?").all(cloudTrack.id).map(r => r.id);

db.transaction(() => {
  // Delete roadmap steps for cloud
  db.prepare("DELETE FROM roadmap_steps WHERE track_id = ?").run(cloudTrack.id);
  console.log('🗑  Removed old roadmap steps');

  // Delete videos, tasks, enrollments, submissions for old courses
  for (const cid of oldCourseIds) {
    db.prepare("DELETE FROM video_progress WHERE video_id IN (SELECT id FROM videos WHERE course_id = ?)").run(cid);
    db.prepare("DELETE FROM videos WHERE course_id = ?").run(cid);
    db.prepare("DELETE FROM task_submissions WHERE task_id IN (SELECT id FROM tasks WHERE course_id = ?)").run(cid);
    db.prepare("DELETE FROM tasks WHERE course_id = ?").run(cid);
    db.prepare("DELETE FROM enrollments WHERE course_id = ?").run(cid);
  }
  db.prepare("DELETE FROM courses WHERE track_id = ?").run(cloudTrack.id);
  console.log(`🗑  Removed ${oldCourseIds.length} old courses`);
})();

// ── new Cloud roadmap ────────────────────────────────────────
const STEPS = [
  {
    level: 1,  title: 'Networking',
    desc:  'TCP/IP, DNS, HTTP/S, OSI model, subnets, routing — fundamentals every cloud engineer needs.',
    price: 0,   free: 1, lvl: 'beginner',     hours: 8,  type: 'topic',
    slug: 'cloud-networking-fundamentals',
  },
  {
    level: 2,  title: 'Linux',
    desc:  'Linux CLI, file system, permissions, processes, SSH, scripting basics.',
    price: 0,   free: 1, lvl: 'beginner',     hours: 10, type: 'topic',
    slug: 'cloud-linux-fundamentals',
  },
  {
    level: 3,  title: 'Cloud Fundamentals',
    desc:  'Cloud computing concepts, service models (IaaS/PaaS/SaaS), AWS global infrastructure.',
    price: 0,   free: 1, lvl: 'beginner',     hours: 6,  type: 'topic',
    slug: 'cloud-fundamentals',
  },
  {
    level: 4,  title: 'AWS Core Services',
    desc:  'EC2, S3, IAM, CloudWatch, billing & cost management — the AWS foundation.',
    price: 49,  free: 0, lvl: 'beginner',     hours: 12, type: 'topic',
    slug: 'aws-core-services',
  },
  {
    level: 5,  title: 'AWS Networking',
    desc:  'VPC, subnets, route tables, NAT Gateway, Internet Gateway, VPC Peering, Transit Gateway.',
    price: 49,  free: 0, lvl: 'intermediate', hours: 10, type: 'topic',
    slug: 'aws-networking',
  },
  {
    level: 6,  title: 'Security & IAM',
    desc:  'IAM users, roles, policies, MFA, AWS Organizations, SCP, Secrets Manager, KMS.',
    price: 49,  free: 0, lvl: 'intermediate', hours: 10, type: 'topic',
    slug: 'aws-security-iam',
  },
  {
    level: 7,  title: 'Compute & Storage',
    desc:  'EC2 types, Auto Scaling, AMIs, EBS, EFS, S3 lifecycle policies, CloudFront, Lambda basics.',
    price: 59,  free: 0, lvl: 'intermediate', hours: 14, type: 'topic',
    slug: 'aws-compute-storage',
  },
  {
    level: 8,  title: 'Databases',
    desc:  'RDS (MySQL/Postgres), Aurora, DynamoDB, ElastiCache, database migration strategies.',
    price: 49,  free: 0, lvl: 'intermediate', hours: 10, type: 'topic',
    slug: 'aws-databases',
  },
  {
    level: 9,  title: 'High Availability & Scalability',
    desc:  'ALB, NLB, Auto Scaling Groups, multi-AZ, Route 53, disaster recovery patterns.',
    price: 59,  free: 0, lvl: 'intermediate', hours: 12, type: 'topic',
    slug: 'aws-high-availability',
  },
  {
    level: 10, title: 'Infrastructure as Code',
    desc:  'Terraform fundamentals, AWS provider, modules, state management, Terragrunt basics.',
    price: 69,  free: 0, lvl: 'intermediate', hours: 15, type: 'topic',
    slug: 'cloud-infrastructure-as-code',
  },
  {
    level: 11, title: 'Automation',
    desc:  'AWS CLI, Boto3/Python automation, EventBridge, AWS Systems Manager, Lambda workflows.',
    price: 59,  free: 0, lvl: 'intermediate', hours: 10, type: 'topic',
    slug: 'cloud-automation',
  },
  {
    level: 12, title: 'Containers & Kubernetes',
    desc:  'Docker, ECS, ECR, EKS, Helm, container best practices on AWS.',
    price: 79,  free: 0, lvl: 'advanced',     hours: 18, type: 'topic',
    slug: 'cloud-containers-kubernetes',
  },
  {
    level: 13, title: 'Monitoring & Observability',
    desc:  'CloudWatch metrics/logs/alarms, X-Ray, Prometheus, Grafana, centralized logging.',
    price: 59,  free: 0, lvl: 'advanced',     hours: 12, type: 'topic',
    slug: 'cloud-monitoring-observability',
  },
  {
    level: 14, title: 'Cloud Security',
    desc:  'AWS Security Hub, GuardDuty, WAF, Shield, Config, CloudTrail auditing, compliance.',
    price: 69,  free: 0, lvl: 'advanced',     hours: 12, type: 'topic',
    slug: 'cloud-security-advanced',
  },
  {
    level: 15, title: 'Architecture',
    desc:  'AWS Well-Architected Framework, microservices, serverless patterns, cost optimisation.',
    price: 79,  free: 0, lvl: 'advanced',     hours: 16, type: 'topic',
    slug: 'cloud-architecture',
  },
  {
    level: 16, title: 'Real-World Projects',
    desc:  'End-to-end cloud projects: 3-tier app on AWS, serverless API, EKS production cluster, full IaC deployment.',
    price: 0,   free: 1, lvl: 'advanced',     hours: 20, type: 'project',
    slug: 'cloud-real-world-projects',
  },
];

const LEVEL_TITLES = {
  1: 'Foundation', 2: 'Foundation', 3: 'Foundation',
  4: 'AWS Basics',
  5: 'Networking', 6: 'Security',
  7: 'Compute & Storage', 8: 'Databases',
  9: 'High Availability',
  10: 'Infrastructure as Code', 11: 'Automation',
  12: 'Containers',
  13: 'Observability', 14: 'Cloud Security',
  15: 'Architecture',
  16: '🔥 Real-World Projects',
};

const SAMPLE_URL = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

db.transaction(() => {
  let order = 0;
  for (const step of STEPS) {
    order++;
    const cid = uuidv4();

    // Create course
    insertCourse.run(
      cid, cloudTrack.id, step.title, step.slug, step.desc,
      step.price, step.free, step.lvl, step.hours, order
    );

    // Create roadmap step
    insertRoadmap.run(
      uuidv4(), cloudTrack.id, cid,
      step.title, step.desc, step.type,
      step.level, LEVEL_TITLES[step.level] || `Level ${step.level}`,
      order, 1
    );

    // Sample videos
    insertVideo.run(uuidv4(), cid, `${step.title} — Introduction`,   'Overview and goals',           SAMPLE_URL, 15, 1, 1);
    insertVideo.run(uuidv4(), cid, `${step.title} — Core Concepts`,  'Deep dive into key concepts',  SAMPLE_URL, 35, 2, 0);
    insertVideo.run(uuidv4(), cid, `${step.title} — Hands-on Lab`,   'Live demo and lab exercise',   SAMPLE_URL, 45, 3, 0);
    insertVideo.run(uuidv4(), cid, `${step.title} — Best Practices`, 'Production tips and gotchas',  SAMPLE_URL, 20, 4, 0);

    // Sample tasks
    insertTask.run(
      uuidv4(), cid, `${step.title} — Practical Task`,
      `Apply what you learned in ${step.title}`,
      `Complete the following:\n\n1. Set up your environment for ${step.title}\n2. Follow the lab instructions step by step\n3. Document your work with screenshots or terminal output\n4. Write a brief summary of what you did and learned`,
      'Working implementation + documentation + summary',
      'medium', 1
    );
    insertTask.run(
      uuidv4(), cid, `${step.title} — Challenge`,
      `Advanced challenge for ${step.title}`,
      `Advanced challenge:\n\n1. Build upon the practical task\n2. Add an extra feature or integration\n3. Write a short report explaining your approach and any issues faced`,
      'Advanced implementation + written report',
      'hard', 2
    );

    console.log(`  ✅ [${step.level}] ${step.title}`);
  }
})();

console.log(`\n🚀 Cloud roadmap updated: ${STEPS.length} steps added.`);

// Verify
const result = db.prepare(`
  SELECT COUNT(*) as count FROM roadmap_steps WHERE track_id = ?
`).get(cloudTrack.id);
console.log(`📊 Roadmap steps in DB: ${result.count}`);

db.close();
