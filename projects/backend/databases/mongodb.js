import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI no está definida. Copia .env.example a .env y configúrala.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[db] MongoDB conectado');
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
