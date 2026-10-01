const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Reconcile every registered model's indexes with its current schema. This matters
    // because schemas evolve over a project's life — e.g. Payment used to have a single
    // `ticket` field with a unique index; it was later replaced by a `tickets` array.
    // Mongoose never drops indexes on its own when a schema changes, so a stale unique
    // index like `ticket_1` survives in the database forever and silently rejects every
    // new document that doesn't set that now-nonexistent field (they all collide on the
    // same implicit `null` value) — surfacing as a confusing E11000 duplicate key error
    // at insert time, long after the schema change that actually caused it.
    // syncIndexes() drops indexes not present in the schema and builds any that are
    // missing, so this class of bug can't resurface as models change. It's a no-op (and
    // cheap) once indexes are already in sync, so it's safe to run on every boot.
    await Promise.all(
      Object.values(mongoose.connection.models).map((model) =>
        model.syncIndexes().catch((err) =>
          console.error(`⚠️  Failed to sync indexes for ${model.modelName}: ${err.message}`)
        )
      )
    );
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
