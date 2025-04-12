// Export actions
import { transferAeAction } from './actions/transferAe';
import { generateKeyPairAction } from './actions/generateKeyPair';
import { callContractAction } from './actions/callContract';
import { tipTelegramUserAction } from './actions/tipTelegramUser';
import { processAddressRegistrationAction } from './actions/processAddressRegistration';
import { analyzeContributionAction } from './actions/analyzeContribution';

// Export providers
import { AeternityWalletProvider } from './providers/walletProvider';

// Export services
import { TransactionService } from './services/transactionService';
import { UserAddressService } from './services/userAddressService';
import { ContributionAnalyzerService, ContributionLevel, ContributionType } from './services/contributionAnalyzerService';

// Export types
import { 
  WalletProvider, 
  TokenInfo, 
  TransactionResult, 
  TransactionOptions,
  TokenTransferParams,
  AeTransferParams,
  ContractCallParams,
  TransactionType,
  WalletSecurityLevel,
  PendingTip,
  UserAddressMapping,
  TelegramClient
} from './types';

// Export environment
import { aeternityEnvSchema, AeternityEnv, env } from './environment';

// Define the Aeternity plugin
export const aeternityPlugin = {
  name: 'aeternity',
  version: '0.1.0',
  description: 'Aeternity blockchain plugin for ElizaOS, enabling private key management and blockchain operations',
  
  // Register actions
  actions: [
    transferAeAction,
    generateKeyPairAction,
    callContractAction,
    tipTelegramUserAction,
    processAddressRegistrationAction,
    analyzeContributionAction,
  ],
  
  // Provider registration function
  registerProviders: async (runtime: any): Promise<void> => {
    // Create and register wallet provider
    const walletProvider = new AeternityWalletProvider();
    await runtime.registerProvider('aeternityWallet', walletProvider);
    
    // Create and register transaction service
    const transactionService = new TransactionService(walletProvider);
    await runtime.registerProvider('aeternityTransaction', transactionService);
    
    // Create and register user address service
    const userAddressService = new UserAddressService();
    await runtime.registerProvider('aeternityUserAddress', userAddressService);
    
    // Create and register contribution analyzer service
    const contributionAnalyzer = new ContributionAnalyzerService(runtime);
    await runtime.registerProvider('contributionAnalyzer', contributionAnalyzer);
  },
  
  // Message handler for Telegram messages (optional, requires ElizaOS support)
  handleMessage: async (message: any, runtime: any): Promise<void> => {
    // Only process direct messages that look like Aeternity addresses
    if (message.is_direct && 
        typeof message.text === 'string' && 
        message.text.trim().startsWith('ak_')) {
      
      try {
        const username = message.from.username;
        const address = message.text.trim();
        
        // Process the address registration
        await runtime.executeAction('PROCESS_ADDRESS_REGISTRATION', {
          username,
          address,
        });
      } catch (error) {
        console.error('Error processing address message:', error);
      }
    }
  },
};

// Export all components
export {
  // Actions
  transferAeAction,
  generateKeyPairAction,
  callContractAction,
  tipTelegramUserAction,
  processAddressRegistrationAction,
  analyzeContributionAction,
  
  // Providers
  AeternityWalletProvider,
  
  // Services
  TransactionService,
  UserAddressService,
  ContributionAnalyzerService,
  
  // Types
  WalletProvider,
  TokenInfo,
  TransactionResult,
  TransactionOptions,
  TokenTransferParams,
  AeTransferParams,
  ContractCallParams,
  TransactionType,
  WalletSecurityLevel,
  PendingTip,
  UserAddressMapping,
  TelegramClient,
  ContributionLevel,
  ContributionType,
  
  // Environment
  aeternityEnvSchema,
  AeternityEnv,
  env,
};
