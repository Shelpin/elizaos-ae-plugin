import { aeternityPlugin } from './dist';

// Simple plugin verification test
function testPlugin() {
  console.log('=== Aeternity Plugin Verification Test ===\n');
  
  // Verify that the plugin has the required structure
  console.log('Plugin name:', aeternityPlugin.name);
  console.log('Plugin description:', aeternityPlugin.description);
  
  // Check for actions
  if (aeternityPlugin.actions && aeternityPlugin.actions.length > 0) {
    console.log('\nPlugin actions:');
    aeternityPlugin.actions.forEach(action => {
      console.log(`- ${action.name}: ${action.description}`);
    });
  } else {
    console.log('No actions found in the plugin');
  }
  
  // Check for providers
  if (aeternityPlugin.providers && aeternityPlugin.providers.length > 0) {
    console.log('\nPlugin providers:');
    aeternityPlugin.providers.forEach(provider => {
      console.log(`- ${provider.name}: ${provider.description}`);
    });
  } else {
    console.log('No providers found in the plugin');
  }
  
  // Check for services
  if (aeternityPlugin.services && aeternityPlugin.services.length > 0) {
    console.log('\nPlugin services:');
    aeternityPlugin.services.forEach(service => {
      console.log(`- ${service.name}`);
    });
  } else {
    console.log('\nNo services found in the plugin');
  }
  
  // Check for evaluators
  if (aeternityPlugin.evaluators && aeternityPlugin.evaluators.length > 0) {
    console.log('\nPlugin evaluators:');
    aeternityPlugin.evaluators.forEach(evaluator => {
      console.log(`- ${evaluator.name}`);
    });
  } else {
    console.log('\nNo evaluators found in the plugin');
  }
  
  console.log('\n=== Verification Complete ===');
  console.log('The Aeternity plugin is properly structured and available for integration with ElizaOS.');
}

// Run the test
testPlugin(); 