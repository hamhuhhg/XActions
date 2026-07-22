import { CamofoxClient } from '../src/mcp/camofox-client.js';

async function runTest() {
  console.log('Testing Camofox API Client...');
  const client = new CamofoxClient('test_user');
  
  try {
    console.log('1. Creating tab...');
    await client.createTab();
    console.log('Tab ID:', client.tabId);

    console.log('2. Evaluating script...');
    const result = await client.evaluate(`() => 2 + 2`);
    console.log('Result:', result);

    if (result === 4) {
      console.log('✅ TEST PASSED: Successfully connected to camofox-browser API and evaluated JavaScript context.');
    } else {
      console.log('❌ TEST FAILED: Result did not match expected value.');
    }

    console.log('4. Closing tab...');
    await client.closeTab();
  } catch (err) {
    console.error('❌ TEST ERROR:', err.message);
  }
}

runTest();
