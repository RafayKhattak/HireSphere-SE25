// Load environment variables
require('dotenv').config();

// Connect to MongoDB
const mongoose = require('mongoose');
const jobAlertService = require('../services/jobAlertService');

// Frequency to process (passed as command line argument)
const frequency = process.argv[2] || 'all';

// Connect to the database
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    processAlerts();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function processAlerts() {
  try {
    console.log(`Starting job alerts processing for frequency: ${frequency}`);
    
    if (frequency === 'all') {
      // Process all frequencies
      await jobAlertService.processJobAlerts('daily');
      await jobAlertService.processJobAlerts('weekly');
      await jobAlertService.processJobAlerts('immediate');
    } else {
      // Process specific frequency
      if (!['daily', 'weekly', 'immediate'].includes(frequency)) {
        console.error(`Invalid frequency: ${frequency}. Valid values are 'daily', 'weekly', 'immediate', or 'all'`);
        process.exit(1);
      }
      
      await jobAlertService.processJobAlerts(frequency);
    }
    
    console.log('Job alerts processing completed');
    process.exit(0);
  } catch (error) {
    console.error('Error processing job alerts:', error);
    process.exit(1);
  }
} 