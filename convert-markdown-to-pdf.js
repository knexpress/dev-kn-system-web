/**
 * Convert Markdown to PDF
 * This script converts EMpost_Integration_Fixes_Report.md to PDF
 * 
 * Usage:
 *   node convert-markdown-to-pdf.js
 * 
 * Requirements:
 *   npm install markdown-pdf
 */

const fs = require('fs');
const path = require('path');

// Try to use markdown-pdf if available
try {
  const markdownpdf = require('markdown-pdf');
  
  const inputFile = path.join(__dirname, 'EMpost_Integration_Fixes_Report.md');
  const outputFile = path.join(__dirname, 'EMpost_Integration_Fixes_Report.pdf');
  
  console.log('📄 Converting Markdown to PDF...');
  console.log(`   Input: ${inputFile}`);
  console.log(`   Output: ${outputFile}`);
  
  markdownpdf()
    .from(inputFile)
    .to(outputFile, function () {
      console.log('✅ PDF created successfully!');
      console.log(`   Location: ${outputFile}`);
    });
    
} catch (error) {
  console.error('❌ Error: markdown-pdf package not found.');
  console.log('\n📦 To install markdown-pdf, run:');
  console.log('   npm install markdown-pdf --save-dev');
  console.log('\n📝 Alternative: Use an online markdown-to-PDF converter or:');
  console.log('   1. Open the markdown file in a markdown viewer');
  console.log('   2. Use "Print to PDF" feature');
  console.log('   3. Or use pandoc: pandoc EMpost_Integration_Fixes_Report.md -o EMpost_Integration_Fixes_Report.pdf');
}

