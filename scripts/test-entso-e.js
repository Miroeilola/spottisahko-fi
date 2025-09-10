#!/usr/bin/env node

// Test script to fetch real ENTSO-E data
const https = require('https');

const API_KEY = process.env.ENTSOE_API_KEY || '38d07d85-9a72-4938-88b3-c6a349c4e73f';

function formatDateTime(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}`;
}

function testEntsoE() {
  const today = new Date();
  const startTime = new Date(today);
  startTime.setHours(0, 0, 0, 0);
  
  const endTime = new Date(today);
  endTime.setDate(endTime.getDate() + 1);
  endTime.setHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    securityToken: API_KEY,
    documentType: 'A44', // Day-ahead prices
    in_Domain: '10YFI-1--------U', // Finland
    out_Domain: '10YFI-1--------U', // Finland
    periodStart: formatDateTime(startTime),
    periodEnd: formatDateTime(endTime),
  });

  const url = `https://web-api.tp.entsoe.eu/api?${params}`;
  
  console.log('🔍 Testing ENTSO-E API...');
  console.log('📅 Fetching prices for:', startTime.toISOString().split('T')[0]);
  console.log('🔑 Using API key:', API_KEY.substring(0, 8) + '...');
  console.log('🌐 URL:', url.substring(0, 100) + '...');
  
  https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n📊 Response Status:', res.statusCode);
      console.log('📋 Response Headers:', res.headers['content-type']);
      
      if (res.statusCode === 200) {
        if (data.includes('<TimeSeries>')) {
          console.log('✅ SUCCESS: Got valid XML data with TimeSeries');
          console.log('📈 Sample data length:', data.length, 'characters');
          
          // Try to count price points
          const matches = data.match(/<Point>/g);
          if (matches) {
            console.log('⚡ Found', matches.length, 'price points');
          }
        } else {
          console.log('⚠️  Got response but no TimeSeries data');
          console.log('📄 Response preview:', data.substring(0, 500));
        }
      } else {
        console.log('❌ API Error:', res.statusCode);
        console.log('📄 Error response:', data.substring(0, 500));
      }
    });
    
  }).on('error', (err) => {
    console.error('❌ Network Error:', err.message);
  });
}

testEntsoE();