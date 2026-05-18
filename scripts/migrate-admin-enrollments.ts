/**
 * Migration: Convert admin users from paid enrollments to auto-enrollments.
 *
 * 1. Delete all orders placed by admin users
 * 2. Convert admin enrollments with orderId to orderId: null, decrement enrollmentCount
 * 3. Auto-enroll admins to all published courses they're not enrolled in yet
 *
 * Run: npx ts-node scripts/migrate-admin-enrollments.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const usersCol = db.collection('users');
  const ordersCol = db.collection('orders');
  const enrollmentsCol = db.collection('enrollments');
  const coursesCol = db.collection('courses');

  // 1. Find all admin users
  const admins = await usersCol.find({ role: 'admin' }, { projection: { _id: 1, name: 1 } }).toArray();
  const adminIds = admins.map((a) => a._id);
  console.log(`Found ${admins.length} admin(s): ${admins.map((a) => a.name).join(', ')}`);

  if (adminIds.length === 0) {
    console.log('No admins found, nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // 2. Delete all orders placed by admins
  const deleteResult = await ordersCol.deleteMany({ userId: { $in: adminIds } });
  console.log(`Deleted ${deleteResult.deletedCount} admin order(s)`);

  // 3. Convert admin enrollments with orderId to auto-enrollments (orderId: null)
  //    and decrement enrollmentCount on those courses
  const paidAdminEnrollments = await enrollmentsCol
    .find({ userId: { $in: adminIds }, orderId: { $ne: null } })
    .toArray();

  if (paidAdminEnrollments.length > 0) {
    // Decrement enrollmentCount for each affected course
    const courseDecrements = new Map<string, number>();
    for (const enr of paidAdminEnrollments) {
      if (enr.status === 'active') {
        const key = enr.courseId.toString();
        courseDecrements.set(key, (courseDecrements.get(key) || 0) + 1);
      }
    }

    const bulkCourseOps = Array.from(courseDecrements.entries()).map(([courseId, count]) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(courseId) },
        update: { $inc: { enrollmentCount: -count } },
      },
    }));
    if (bulkCourseOps.length > 0) {
      await coursesCol.bulkWrite(bulkCourseOps);
      console.log(`Decremented enrollmentCount on ${bulkCourseOps.length} course(s)`);
    }

    // Set orderId to null on all paid admin enrollments
    const convertResult = await enrollmentsCol.updateMany(
      { userId: { $in: adminIds }, orderId: { $ne: null } },
      { $set: { orderId: null } },
    );
    console.log(`Converted ${convertResult.modifiedCount} paid admin enrollment(s) to auto-enrollment`);
  } else {
    console.log('No paid admin enrollments to convert');
  }

  // 4. Auto-enroll admins to all published courses they're not enrolled in yet
  const publishedCourses = await coursesCol
    .find({ published: true }, { projection: { _id: 1 } })
    .toArray();
  console.log(`Found ${publishedCourses.length} published course(s)`);

  let created = 0;
  for (const course of publishedCourses) {
    for (const adminId of adminIds) {
      const exists = await enrollmentsCol.findOne({
        userId: adminId,
        courseId: course._id,
      });
      if (!exists) {
        await enrollmentsCol.insertOne({
          userId: adminId,
          courseId: course._id,
          orderId: null,
          completedLessons: [],
          quizAttempts: [],
          lastAccessedAt: null,
          completedAt: null,
          status: 'active',
          verificationCode: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        created++;
      }
    }
  }
  console.log(`Created ${created} new auto-enrollment(s) for admins`);

  // Ensure no negative enrollmentCount
  await coursesCol.updateMany(
    { enrollmentCount: { $lt: 0 } },
    { $set: { enrollmentCount: 0 } },
  );

  await mongoose.disconnect();
  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
