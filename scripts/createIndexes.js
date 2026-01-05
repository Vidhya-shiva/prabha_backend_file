// scripts/createIndexes.js - FIXED VERSION
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const createIndexes = async () => {
  try {
    // ✅ FIXED: Use MONGODB_URI (your .env variable)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📊 Creating indexes...');
    await Product.createIndexes();
    console.log('✅ Indexes created successfully!');

    // ✅ Show all indexes
    console.log('\n📋 Current indexes on Product collection:');
    const indexes = await Product.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));

    // ✅ Count documents
    const count = await Product.countDocuments();
    console.log(`\n📦 Total products in database: ${count}`);

    await mongoose.connection.close();
    console.log('\n🛑 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createIndexes();