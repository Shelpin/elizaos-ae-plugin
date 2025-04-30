import { Plugin, Action, IAgentRuntime } from '@elizaos/core'; // Import core types

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
  ContractCallParams
} from './types';
import { aeternityEnvSchema, AeternityEnv, env } from './environment';

// Define a basic validate function (returns boolean)
const basicValidate = async (runtime: IAgentRuntime) => {
  // Add real validation logic if needed
  return true;
};

// Helper to wrap legacy action.execute to the correct handler signature
function wrapHandler(execute: any) {
  return async (runtime: IAgentRuntime, input: any, context: any) => {
    return execute(runtime, input, context);
  };
}

// Define the plugin conforming to the Plugin interface
export const aeternityPlugin: Plugin = {
  name: 'aeternity',
  description: 'Aeternity blockchain plugin for tipping and blockchain operations',
  
  // Define actions conforming to the Action interface
  actions: [
    {
      name: "PROCESS_ADDRESS_REGISTRATION",
      description: "Register a user's Aeternity address for receiving tips. Parameters: username (string, required) - The Telegram username of the user registering an address; address (string, required) - The Aeternity address to register (must start with 'ak_'); chatId (string, optional) - The chat ID where the registration is happening.",
      similes: ['REGISTER_AE_ADDRESS', 'SET_WALLET_ADDRESS'],
      examples: [
        [
          { user: "user", content: { text: "I want to register my Aeternity address: ak_123..." } },
          { user: "ængel", content: { text: "Your address ak_123... has been registered!" } }
        ]
      ],
      validate: basicValidate,
      handler: wrapHandler(processAddressRegistrationAction.execute)
    },
    {
      name: "TIP_TELEGRAM_USER",
      description: "Send a tip to a Telegram user. Parameters: recipient (string, required) - The Telegram username (@username) or AE address (ak_...) of the recipient; amount (string, optional) - The amount of AE tokens to send; message (string, optional) - An optional message to include with the tip; contributionDescription (string, optional) - Description of the contribution to analyze for automatic tip amount calculation; chatId (string, optional) - The chat ID where the tip is being sent, for notifications.",
      similes: ['SEND_TIP', 'REWARD_USER'],
      examples: [
        [
          { user: "user", content: { text: "Tip @testuser 0.5 AE for helping me!" } },
          { user: "ængel", content: { text: "Sent 0.5 AE to @testuser with message: 'Great help!'" } }
        ],
        [
          { user: "user", content: { text: "Send 1.0 AE to ak_..." } },
          { user: "ængel", content: { text: "Transferred 1.0 AE to ak_..." } }
        ],
        [
          { user: "user", content: { text: "Reward @anotheruser for fixing the bug" } },
          { user: "ængel", content: { text: "Tipped @anotheruser for their contribution: 'Fixed the bug'" } }
        ]
      ],
      validate: basicValidate,
      handler: wrapHandler(tipTelegramUserAction.execute)
    },
    {
      name: "ANALYZE_CONTRIBUTION",
      description: "Analyze a contribution to determine its value and suggest a tip amount. Parameters: description (string, required) - The description of the contribution to analyze; type (string, optional) - Optional type of contribution (e.g., code_share, tutorial).",
      similes: ['EVALUATE_CONTRIBUTION', 'ASSESS_VALUE'],
      examples: [
        [
          { user: "user", content: { text: "How valuable is this contribution: Provided a detailed explanation of state channels?" } },
          { user: "ængel", content: { text: "This contribution is highly valuable and deserves a tip!" } }
        ]
      ],
      validate: basicValidate,
      handler: wrapHandler(analyzeContributionAction.execute)
    },
    {
      name: "TRANSFER_AE",
      description: "Transfer AE tokens to a specific Aeternity address. Parameters: recipient (string, required) - The recipient Aeternity address (must start with 'ak_'); amount (string, required) - The amount of AE tokens to send; memo (string, optional) - Optional memo or description for the transaction.",
      similes: ['SEND_AE', 'MAKE_AE_TRANSFER'],
      examples: [
        [
          { user: "user", content: { text: "Transfer 10 AE to ak_... for payment" } },
          { user: "ængel", content: { text: "Transferred 10 AE to ak_... with memo: 'Payment for services'" } }
        ]
      ],
      validate: basicValidate,
      handler: wrapHandler(transferAeAction.execute)
    }
    // Note: generateKeyPairAction and callContractAction are omitted for simplicity
    // but should be added here in the same format if needed by the agent.
  ],
  
  // Providers and Services can be defined here if needed, or initialized via initialize
  providers: [], // Can define providers directly here if they don't need runtime access on init
  services: [],  // Can define services directly here
  evaluators: [], // Added evaluators array
};

// Export other types/classes as needed
export {
  AeternityWalletProvider,
  TransactionService,
  UserAddressService,
  ContributionAnalyzerService,
  ContributionLevel,
  ContributionType,
  WalletProvider,
  TokenInfo,
  TransactionResult,
  ContractCallParams
};

// For CommonJS compatibility
export default aeternityPlugin;
