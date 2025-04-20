require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');

async function updateJobCurrencies() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all jobs
    const jobs = await Job.find();
    console.log(`Found ${jobs.length} jobs`);
    
    // Display current currencies
    jobs.forEach(job => {
      console.log(`Job: ${job.title}, Currency: ${job.salary.currency}`);
    });
    
    // Update all jobs to use PKR
    const result = await Job.updateMany(
      { 'salary.currency': { $ne: 'PKR' } },
      { $set: { 'salary.currency': 'PKR' } }
    );
    
    console.log(`Updated ${result.modifiedCount} jobs to use PKR currency`);
    
    // Verify the update
    const updatedJobs = await Job.find();
    updatedJobs.forEach(job => {
      console.log(`Job: ${job.title}, Currency: ${job.salary.currency}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
updateJobCurrencies(); 