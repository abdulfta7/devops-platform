/**
 * Updates the System Administrator roadmap with the new 15-step structure.
 * Run with: node scripts/update-sysadmin-roadmap.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Database = require('better-sqlite3');
const path     = require('path');
const { v4: uuidv4 } = require('uuid');

const db = new Database(path.join(__dirname, '..', 'platform.db'));
db.pragma('journal_mode = WAL');

// ── prepared statements ─────────────────────────────────────
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

// ── find sysadmin track ─────────────────────────────────────
const track = db.prepare("SELECT * FROM tracks WHERE slug = 'sysadmin'").get();
if (!track) { console.error('❌ sysadmin track not found'); process.exit(1); }
console.log(`✅ Found: ${track.title} — ${track.id}`);

// ── wipe old data ───────────────────────────────────────────
const oldIds = db.prepare("SELECT id FROM courses WHERE track_id = ?").all(track.id).map(r => r.id);

db.transaction(() => {
  db.prepare("DELETE FROM roadmap_steps WHERE track_id = ?").run(track.id);
  for (const cid of oldIds) {
    db.prepare("DELETE FROM video_progress WHERE video_id IN (SELECT id FROM videos WHERE course_id = ?)").run(cid);
    db.prepare("DELETE FROM videos WHERE course_id = ?").run(cid);
    db.prepare("DELETE FROM task_submissions WHERE task_id IN (SELECT id FROM tasks WHERE course_id = ?)").run(cid);
    db.prepare("DELETE FROM tasks WHERE course_id = ?").run(cid);
    db.prepare("DELETE FROM enrollments WHERE course_id = ?").run(cid);
  }
  db.prepare("DELETE FROM courses WHERE track_id = ?").run(track.id);
  console.log(`🗑  Cleared ${oldIds.length} old courses + roadmap steps`);
})();

// ── new SysAdmin roadmap ────────────────────────────────────
const STEPS = [
  {
    level: 1,  levelTitle: 'Foundation',
    title: 'Computer Fundamentals',
    slug:  'sysadmin-computer-fundamentals',
    desc:  'Hardware components, BIOS/UEFI, operating system basics, file systems, partitions, boot process.',
    price: 0,   free: 1, lvl: 'beginner',     hours: 8,  type: 'topic',
  },
  {
    level: 2,  levelTitle: 'Foundation',
    title: 'Networking',
    slug:  'sysadmin-networking',
    desc:  'OSI model, TCP/IP, subnetting, switching, routing, VLANs, firewalls, Wi-Fi — for sysadmins.',
    price: 0,   free: 1, lvl: 'beginner',     hours: 10, type: 'topic',
  },
  {
    level: 3,  levelTitle: 'Windows',
    title: 'Windows Administration',
    slug:  'windows-administration',
    desc:  'Windows 10/11 administration, user management, file permissions, registry, Task Manager, Event Viewer.',
    price: 0,   free: 1, lvl: 'beginner',     hours: 10, type: 'topic',
  },
  {
    level: 4,  levelTitle: 'Windows Server',
    title: 'Windows Server',
    slug:  'windows-server',
    desc:  'Windows Server 2019/2022 installation, roles & features, IIS, Remote Desktop Services, licensing.',
    price: 49,  free: 0, lvl: 'intermediate', hours: 14, type: 'topic',
  },
  {
    level: 5,  levelTitle: 'Windows Server',
    title: 'Active Directory',
    slug:  'active-directory',
    desc:  'AD DS, users & groups, OUs, domain controller setup, forests & trusts, FSMO roles, replication.',
    price: 59,  free: 0, lvl: 'intermediate', hours: 14, type: 'topic',
  },
  {
    level: 6,  levelTitle: 'Windows Server',
    title: 'DNS / DHCP / GPO',
    slug:  'dns-dhcp-gpo',
    desc:  'DNS zones & records, DHCP scopes & reservations, Group Policy Objects — design and troubleshooting.',
    price: 49,  free: 0, lvl: 'intermediate', hours: 10, type: 'topic',
  },
  {
    level: 7,  levelTitle: 'Linux',
    title: 'Linux Administration',
    slug:  'sysadmin-linux-administration',
    desc:  'Linux file system, users & permissions, services (systemd), package management, cron, logs, SSH hardening.',
    price: 49,  free: 0, lvl: 'intermediate', hours: 14, type: 'topic',
  },
  {
    level: 8,  levelTitle: 'Virtualization',
    title: 'Virtualization',
    slug:  'sysadmin-virtualization',
    desc:  'VMware ESXi, Hyper-V, vSphere basics, VM lifecycle, snapshots, templates, resource pools.',
    price: 59,  free: 0, lvl: 'intermediate', hours: 12, type: 'topic',
  },
  {
    level: 9,  levelTitle: 'Storage & Backup',
    title: 'Storage & Backup',
    slug:  'sysadmin-storage-backup',
    desc:  'RAID levels, SAN/NAS, iSCSI, NFS/SMB shares, backup strategies, Windows Backup, Veeam basics.',
    price: 49,  free: 0, lvl: 'intermediate', hours: 10, type: 'topic',
  },
  {
    level: 10, levelTitle: 'Monitoring',
    title: 'Monitoring',
    slug:  'sysadmin-monitoring',
    desc:  'Windows Performance Monitor, Nagios, Zabbix, PRTG, log aggregation, alerting, SNMP.',
    price: 49,  free: 0, lvl: 'intermediate', hours: 10, type: 'topic',
  },
  {
    level: 11, levelTitle: 'Security',
    title: 'Security',
    slug:  'sysadmin-security',
    desc:  'System hardening, patch management, antivirus, Windows Defender, firewall rules, audit policies, CIS benchmarks.',
    price: 59,  free: 0, lvl: 'intermediate', hours: 12, type: 'topic',
  },
  {
    level: 12, levelTitle: 'Scripting',
    title: 'PowerShell / Bash',
    slug:  'powershell-bash-scripting',
    desc:  'PowerShell automation for Windows AD & server tasks; Bash scripting for Linux sysadmin workflows.',
    price: 59,  free: 0, lvl: 'intermediate', hours: 12, type: 'topic',
  },
  {
    level: 13, levelTitle: 'Automation',
    title: 'Automation',
    slug:  'sysadmin-automation',
    desc:  'Ansible for configuration management, task automation, scheduled jobs, MDT/WDS for OS deployment.',
    price: 59,  free: 0, lvl: 'advanced',     hours: 12, type: 'topic',
  },
  {
    level: 14, levelTitle: 'Cloud',
    title: 'Cloud',
    slug:  'sysadmin-cloud',
    desc:  'Azure AD (Entra ID), Azure VMs, hybrid identity, Microsoft 365 admin — the sysadmin path to cloud.',
    price: 69,  free: 0, lvl: 'advanced',     hours: 14, type: 'topic',
  },
  {
    level: 15, levelTitle: '🔥 Real-World Projects',
    title: 'Projects & Troubleshooting',
    slug:  'sysadmin-projects-troubleshooting',
    desc:  'Build a full on-prem lab: AD domain, file server, monitoring, backup, GPO policies, and real-world break/fix scenarios.',
    price: 0,   free: 1, lvl: 'advanced',     hours: 20, type: 'project',
  },
];

const SAMPLE_URL = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

db.transaction(() => {
  let order = 0;
  for (const step of STEPS) {
    order++;
    const cid = uuidv4();

    insertCourse.run(
      cid, track.id, step.title, step.slug, step.desc,
      step.price, step.free, step.lvl, step.hours, order
    );

    insertRoadmap.run(
      uuidv4(), track.id, cid,
      step.title, step.desc, step.type,
      step.level, step.levelTitle,
      order, 1
    );

    // 4 sample videos
    insertVideo.run(uuidv4(), cid, `${step.title} — Introduction`,   'Overview, goals and prerequisites', SAMPLE_URL, 15, 1, 1);
    insertVideo.run(uuidv4(), cid, `${step.title} — Core Concepts`,  'Deep dive into key concepts',       SAMPLE_URL, 35, 2, 0);
    insertVideo.run(uuidv4(), cid, `${step.title} — Hands-on Lab`,   'Live demo and lab walkthrough',     SAMPLE_URL, 45, 3, 0);
    insertVideo.run(uuidv4(), cid, `${step.title} — Best Practices`, 'Tips, gotchas and production notes',SAMPLE_URL, 20, 4, 0);

    // 2 sample tasks
    insertTask.run(
      uuidv4(), cid,
      `${step.title} — Practical Task`,
      `Apply what you learned in ${step.title}`,
      `Complete the following steps:\n\n1. Set up your environment for ${step.title}\n2. Follow the lab instructions step by step\n3. Take screenshots or save terminal output as evidence\n4. Write a short summary of what you configured and learned`,
      'Working configuration + screenshots + written summary',
      'medium', 1
    );
    insertTask.run(
      uuidv4(), cid,
      `${step.title} — Challenge`,
      `Advanced challenge for ${step.title}`,
      `Advanced challenge:\n\n1. Extend what you built in the practical task\n2. Simulate a real-world scenario or failure and resolve it\n3. Document the issue, root cause, and solution in a short report`,
      'Extended implementation + troubleshooting report',
      'hard', 2
    );

    console.log(`  ✅ [${step.level}] ${step.title} (${step.free ? 'Free' : '$' + step.price})`);
  }
})();

// ── verify ──────────────────────────────────────────────────
const count = db.prepare("SELECT COUNT(*) as c FROM roadmap_steps WHERE track_id = ?").get(track.id);
const hours = db.prepare("SELECT SUM(duration_hours) as h FROM courses WHERE track_id = ?").get(track.id);
const free  = db.prepare("SELECT COUNT(*) as c FROM courses WHERE track_id = ? AND is_free = 1").get(track.id);

console.log(`\n🚀 SysAdmin roadmap updated!`);
console.log(`   Steps  : ${count.c}`);
console.log(`   Hours  : ${hours.h}h total`);
console.log(`   Free   : ${free.c} courses`);

db.close();
