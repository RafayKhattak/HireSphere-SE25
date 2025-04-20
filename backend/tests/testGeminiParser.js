require('dotenv').config();
const fs = require('fs');
const path = require('path');
const resumeParser = require('../services/resumeParser');

/**
 * Test script to validate the Gemini API integration for resume parsing
 * 
 * Usage:
 * 1. Place a test resume in the uploads/test directory
 * 2. Run this script with: node tests/testGeminiParser.js
 */

async function testGeminiParser() {
  try {
    console.log('Testing Gemini resume parser integration');
    
    // Create test directory if it doesn't exist
    const testDir = path.join(__dirname, '../uploads/test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Check if there's a test resume file
    const testFiles = fs.readdirSync(testDir);
    if (testFiles.length === 0) {
      console.log('\nNo test files found. Please place a resume file in the uploads/test directory.');
      console.log('Supported formats: PDF (.pdf), Word (.doc, .docx)');
      return;
    }
    
    // Use the first file for testing
    const testFile = testFiles[0];
    const testFilePath = path.join(testDir, testFile);
    
    console.log(`\nProcessing test file: ${testFile}`);
    
    // First try with Gemini API
    console.log('\n1. Testing parsing with Gemini API:');
    try {
      const startTime = Date.now();
      const parsedDataGemini = await resumeParser.parseResume(testFilePath, true);
      const endTime = Date.now();
      
      console.log(`Time taken: ${(endTime - startTime) / 1000} seconds`);
      console.log('\nParsed data:');
      console.log(JSON.stringify(parsedDataGemini, null, 2));
    } catch (geminiError) {
      console.error('Error with Gemini parsing:', geminiError.message);
    }
    
    // Then try with local parsing
    console.log('\n2. Testing parsing with local methods:');
    try {
      const startTime = Date.now();
      const parsedDataLocal = await resumeParser.parseResume(testFilePath, false);
      const endTime = Date.now();
      
      console.log(`Time taken: ${(endTime - startTime) / 1000} seconds`);
      console.log('\nParsed data:');
      console.log(JSON.stringify(parsedDataLocal, null, 2));
    } catch (localError) {
      console.error('Error with local parsing:', localError.message);
    }
    
    console.log('\nTest completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testGeminiParser(); 