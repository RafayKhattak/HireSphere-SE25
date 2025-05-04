require('dotenv').config({ path: './.env' }); // Load environment variables

const mongoose = require('mongoose');
const Message = require('./models/Message'); // Import the Message model

// Ensure MONGODB_URI is loaded
const dbURI = process.env.MONGODB_URI;
if (!dbURI) {
  console.error('Error: MONGODB_URI environment variable not set.');
  process.exit(1);
}

console.log('Attempting to connect to MongoDB...');

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    try {
      console.log('Attempting to delete all messages...');
      const result = await Message.deleteMany({});
      console.log(`Successfully deleted ${result.deletedCount} messages from the 'messages' collection.`);
    } catch (error) {
      console.error('Error deleting messages:', error);
    } finally {
      mongoose.connection.close();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }); 