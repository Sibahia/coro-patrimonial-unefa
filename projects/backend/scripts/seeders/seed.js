import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../../databases/mongodb.js';
import User from '../../api/users/model.js';
import Member from '../../api/members/model.js';
import Work from '../../api/works/model.js';
import Event from '../../api/events/model.js';
import HeritageItem from '../../api/heritage/model.js';

async function seed() {
  await connectDatabase();

  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || 'CoroUnefa2026!', 12);

  const users = [
    { name: 'Administrador', email: 'admin@coro.local', role: 'admin' },
    { name: 'Editor', email: 'editor@coro.local', role: 'editor' },
    { name: 'Corista', email: 'viewer@coro.local', role: 'viewer' }
  ];

  for (const user of users) {
    await User.updateOne(
      { email: user.email },
      { $setOnInsert: { ...user, passwordHash, isActive: true } },
      { upsert: true }
    );
  }
  console.log('[seed] usuarios listos');

  if (await Member.countDocuments() === 0) {
    await Member.create([
      {
        firstName: 'Ana', lastName: 'Pérez', voiceType: 'soprano', role: 'Directora',
        bio: 'Directora del Coro Patrimonial UNEFA.', joinedAt: new Date('2018-03-01')
      },
      {
        firstName: 'Carlos', lastName: 'Ruiz', voiceType: 'tenor', role: 'Corista',
        joinedAt: new Date('2020-09-15')
      }
    ]);
  }

  if (await Work.countDocuments() === 0) {
    await Work.create([
      { title: 'Ave María', composer: 'Charles Gounod', category: 'sacred', language: 'la', isPublished: true },
      { title: 'Canción del alma', composer: 'Autor tradicional', category: 'popular', language: 'es', isPublished: true }
    ]);
  }

  if (await Event.countDocuments() === 0) {
    await Event.create({
      title: 'Concierto aniversario',
      description: 'Presentación conmemorativa del coro.',
      startAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      venue: { name: 'Auditorio UNEFA', city: 'Caracas' },
      type: 'concert',
      status: 'published'
    });
  }

  if (await HeritageItem.countDocuments() === 0) {
    await HeritageItem.create({
      title: 'Archivo fotográfico 1998',
      type: 'photo',
      description: 'Primeras fotografías del coro.',
      year: 1998,
      tags: ['historia', 'fotografía'],
      isPublished: true,
      isFeatured: true
    });
  }

  console.log('[seed] contenido de ejemplo listo');
  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error('[seed] error:', error.message);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
