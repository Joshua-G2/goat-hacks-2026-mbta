// Quick test of MBTA API endpoints
const API_KEY = 'e6d82008f5c44c6c9906ca613361e366';
const BASE_URL = 'https://api-v3.mbta.com';

async function testAPI() {
  console.log('🧪 Testing MBTA API...\n');
  
  // Test 1: Get Routes
  console.log('1️⃣ Testing /routes endpoint...');
  try {
    const routesRes = await fetch(`${BASE_URL}/routes?filter[type]=0,1`, {
      headers: { 'x-api-key': API_KEY }
    });
    const routesData = await routesRes.json();
    console.log(`✅ Found ${routesData.data.length} routes`);
    const redLine = routesData.data.find(r => r.id === 'Red');
    console.log(`   Red Line:`, redLine?.attributes?.long_name);
    console.log('');
    
    // Test 2: Get Shapes for Red Line
    console.log('2️⃣ Testing /shapes endpoint for Red Line...');
    const shapesRes = await fetch(`${BASE_URL}/shapes?filter[route]=Red`, {
      headers: { 'x-api-key': API_KEY }
    });
    const shapesData = await shapesRes.json();
    console.log(`✅ Found ${shapesData.data.length} shapes for Red Line`);
    if (shapesData.data.length > 0) {
      const firstShape = shapesData.data[0];
      console.log(`   Shape ID: ${firstShape.id}`);
      console.log(`   Has polyline: ${!!firstShape.attributes.polyline}`);
      if (firstShape.attributes.polyline) {
        console.log(`   Polyline length: ${firstShape.attributes.polyline.length} chars`);
      }
    }
    console.log('');
    
    // Test 3: Get Stops for Red Line
    console.log('3️⃣ Testing /stops endpoint for Red Line...');
    const stopsRes = await fetch(`${BASE_URL}/stops?filter[route]=Red`, {
      headers: { 'x-api-key': API_KEY }
    });
    const stopsData = await stopsRes.json();
    console.log(`✅ Found ${stopsData.data.length} stops for Red Line`);
    if (stopsData.data.length > 0) {
      console.log(`   First stop: ${stopsData.data[0].attributes.name}`);
      console.log(`   Coordinates: ${stopsData.data[0].attributes.latitude}, ${stopsData.data[0].attributes.longitude}`);
    }
    console.log('');
    
    // Test 4: Get Predictions
    if (stopsData.data.length > 0) {
      const stopId = stopsData.data[0].id;
      console.log(`4️⃣ Testing /predictions endpoint for stop ${stopId}...`);
      const predictionsRes = await fetch(`${BASE_URL}/predictions?filter[stop]=${stopId}&filter[route]=Red`, {
        headers: { 'x-api-key': API_KEY }
      });
      const predictionsData = await predictionsRes.json();
      console.log(`✅ Found ${predictionsData.data.length} predictions`);
      if (predictionsData.data.length > 0) {
        console.log(`   Next arrival: ${predictionsData.data[0].attributes.arrival_time || 'N/A'}`);
      }
    }
    console.log('');
    
    // Test 5: Get Vehicles
    console.log('5️⃣ Testing /vehicles endpoint for Red Line...');
    const vehiclesRes = await fetch(`${BASE_URL}/vehicles?filter[route]=Red`, {
      headers: { 'x-api-key': API_KEY }
    });
    const vehiclesData = await vehiclesRes.json();
    console.log(`✅ Found ${vehiclesData.data.length} active vehicles on Red Line`);
    if (vehiclesData.data.length > 0) {
      console.log(`   Vehicle ${vehiclesData.data[0].id} at ${vehiclesData.data[0].attributes.current_status || 'unknown'}`);
    }
    
    console.log('\n✅ All API tests completed!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testAPI();
