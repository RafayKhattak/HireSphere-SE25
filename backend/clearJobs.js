const mongoose = require('mongoose');
const Job = require('./models/Job');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    try {
      const result = await Job.deleteMany({});
      console.log(`Deleted ${result.deletedCount} jobs from database`);
    } catch (error) {
      console.error('Error deleting jobs:', error);
    } finally {
      mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  }); 