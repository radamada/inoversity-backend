import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI lipsește din backend/.env');
  process.exit(1);
}
const DB_NAME = 'test'; // MongoDB Atlas default db name

const client = new MongoClient(MONGODB_URI);

async function main() {
  await client.connect();
  console.log('Connected to MongoDB');

  // Try both common db names
  let db = client.db(DB_NAME);
  let courses = await db.collection('courses').find({}).toArray();
  if (!courses.length) {
    db = client.db('edumarket');
    courses = await db.collection('courses').find({}).toArray();
  }

  console.log(`Found ${courses.length} courses:`);
  courses.forEach(c => console.log(`  - ${c._id} | ${c.title} | published: ${c.published}`));

  for (const course of courses) {
    const courseId = course._id;
    const existingSections = await db.collection('sections').find({ courseId }).toArray();

    if (existingSections.length > 0) {
      const lessonCount = await db.collection('lessons').countDocuments({ courseId });
      console.log(`\nCurs "${course.title}": ${existingSections.length} secțiuni, ${lessonCount} lecții — skip`);
      continue;
    }

    console.log(`\nRestaur curriculum pentru cursul "${course.title}" (${courseId})...`);

    const sectionsData = [
      {
        _id: new ObjectId(),
        courseId,
        title: 'Introducere',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        courseId,
        title: 'Modul 1 – Fundamente',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.collection('sections').insertMany(sectionsData);
    console.log(`  ✓ Inserat ${sectionsData.length} secțiuni`);

    const lessonsData = [
      {
        _id: new ObjectId(),
        courseId,
        sectionId: sectionsData[0]._id,
        title: 'Bun venit la curs',
        type: 'video',
        cdnVideoId: '',
        duration: 120,
        order: 0,
        isFree: true,
        questions: [],
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        courseId,
        sectionId: sectionsData[0]._id,
        title: 'Cum funcționează platforma',
        type: 'video',
        cdnVideoId: '',
        duration: 300,
        order: 1,
        isFree: false,
        questions: [],
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        courseId,
        sectionId: sectionsData[1]._id,
        title: 'Concepte de bază',
        type: 'video',
        cdnVideoId: '',
        duration: 480,
        order: 0,
        isFree: false,
        questions: [],
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        courseId,
        sectionId: sectionsData[1]._id,
        title: 'Quiz – Concepte de bază',
        type: 'quiz',
        cdnVideoId: '',
        duration: 0,
        order: 1,
        isFree: false,
        questions: [
          { question: 'Care este scopul acestui curs?', options: ['Să înveți ceva nou', 'Să te plictisești', 'Nimic', 'Alt răspuns'], correctIndex: 0 },
          { question: 'Cât de des trebuie să exersezi?', options: ['Niciodată', 'Zilnic', 'O dată pe an', 'Când ai chef'], correctIndex: 1 },
        ],
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.collection('lessons').insertMany(lessonsData);
    console.log(`  ✓ Inserat ${lessonsData.length} lecții (3 video + 1 quiz)`);

    // Clear pendingChanges if any
    await db.collection('courses').updateOne({ _id: courseId }, { $unset: { pendingChanges: '' } });
    console.log(`  ✓ pendingChanges șters`);
  }

  console.log('\nGata!');
  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
