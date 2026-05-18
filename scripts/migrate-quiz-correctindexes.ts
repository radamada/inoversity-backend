/**
 * Migration: Convert quiz questions from correctIndex (number) to correctIndexes (number[]).
 *
 * For each lesson of type 'quiz', converts each question's correctIndex field
 * to correctIndexes array, then removes the old correctIndex field.
 *
 * Run: npx ts-node scripts/migrate-quiz-correctindexes.ts
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
  const lessonsCol = db.collection('lessons');

  // Find all quiz lessons that still have the old correctIndex field
  const quizLessons = await lessonsCol.find({
    type: 'quiz',
    'questions.0': { $exists: true },
  }).toArray();

  console.log(`Found ${quizLessons.length} quiz lesson(s) to check`);

  let migrated = 0;
  for (const lesson of quizLessons) {
    const questions = lesson.questions as any[];
    let needsUpdate = false;

    const updatedQuestions = questions.map((q) => {
      if (q.correctIndexes && Array.isArray(q.correctIndexes)) {
        // Already migrated — remove old field if present
        if (q.correctIndex !== undefined) {
          needsUpdate = true;
          const { correctIndex: _, ...rest } = q;
          return rest;
        }
        return q;
      }
      // Migrate: correctIndex → correctIndexes
      needsUpdate = true;
      const idx = q.correctIndex ?? 0;
      const { correctIndex: _, ...rest } = q;
      return { ...rest, correctIndexes: [idx] };
    });

    if (needsUpdate) {
      await lessonsCol.updateOne(
        { _id: lesson._id },
        { $set: { questions: updatedQuestions } },
      );
      migrated++;
    }
  }

  console.log(`Migrated ${migrated} quiz lesson(s)`);
  await mongoose.disconnect();
  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
