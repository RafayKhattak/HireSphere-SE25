const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Default admin credentials
const adminData = {
  name: 'Admin User',
  email: 'admin@hiresphere.com',
  password: 'admin123',
  type: 'admin'
};

async function createAdminUser() {
  try {
    // Get MongoDB URI from environment or use default
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hiresphere';
    
    // Connect to MongoDB
    console.log(`Connecting to MongoDB at ${mongoURI}...`);
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create new admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);
    
    const adminUser = new User({
      name: adminData.name,
      email: adminData.email,
      password: hashedPassword,
      type: adminData.type
    });
    
    await adminUser.save();
    console.log('Admin user created successfully');
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser(); 