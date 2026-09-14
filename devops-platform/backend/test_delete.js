const db = require('./src/database');
try {
  const course = db.prepare("SELECT id FROM courses LIMIT 1").get();
  if (!course) return console.log('no course');
  const courseId = course.id;
  db.prepare('DELETE FROM video_progress WHERE video_id IN (SELECT id FROM videos WHERE course_id = ?)').run(courseId);
  db.prepare('DELETE FROM videos WHERE course_id = ?').run(courseId);
  db.prepare('DELETE FROM task_submissions WHERE task_id IN (SELECT id FROM tasks WHERE course_id = ?)').run(courseId);
  db.prepare('DELETE FROM tasks WHERE course_id = ?').run(courseId);
  db.prepare('DELETE FROM enrollments WHERE course_id = ?').run(courseId);
  db.prepare('DELETE FROM reviews WHERE course_id = ?').run(courseId);
  db.prepare('DELETE FROM roadmap_steps WHERE course_id = ?').run(courseId);
  db.prepare('DELETE FROM payments WHERE course_id = ?').run(courseId);
  db.prepare('DELETE FROM certificates WHERE course_id = ?').run(courseId);
  db.prepare('DELETE FROM discussions WHERE course_id = ?').run(courseId);
  db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
  console.log("Success");
} catch(e) {
  console.log("Error:", e);
}
