import { z } from 'zod';
import { UserAddressService } from '../services/userAddressService';
import { TransactionService } from '../services/transactionService';
import { AeternityWalletProvider } from '../providers/walletProvider';

// Input schema for processAddressRegistration action
export const processAddressRegistrationSchema = z.object({
  // Telegram username
  username: z.string().min(1),
  
  // Aeternity address
  address: z.string().min(1).refine(
    (addr) => addr.startsWith('ak_'),
    { message: 'Invalid Aeternity address format, must start with ak_' }
  ),
  
  // Optional chat ID for group notifications
  chatId: z.string().optional(),
});

// Input type derived from schema
export type ProcessAddressRegistrationInput = z.infer<typeof processAddressRegistrationSchema>;

// Output type for processAddressRegistration action
export type ProcessAddressRegistrationOutput = {
  success: boolean;
  pendingTipsProcessed?: number;
  error?: string;
  message?: string;
};

/**
 * Process an address registration from a Telegram user and handle any pending tips
 * @param input - Registration parameters
 * @param context - Action context
 * @returns Registration result
 */
export const processAddressRegistration = async (
  input: ProcessAddressRegistrationInput,
  context: any
): Promise<ProcessAddressRegistrationOutput> => {
  try {
    // Validate input
    const params = processAddressRegistrationSchema.parse(input);
    
    // Get or create UserAddressService provider
    let userAddressService: UserAddressService;
    
    if (context.runtime.hasProvider('aeternityUserAddress')) {
      userAddressService = await context.runtime.getProvider('aeternityUserAddress');
    } else {
      // Create a new user address service if not available
      userAddressService = new UserAddressService();
      
      // Register the provider for reuse
      await context.runtime.registerProvider('aeternityUserAddress', userAddressService);
    }
    
    // Store the address
    userAddressService.storeAddress(params.username, params.address);
    
    // Check for pending tips
    const pendingTips = userAddressService.getPendingTips(params.username);
    
    // Get Telegram client if available
    const telegramClient = context.telegramClient || context.runtime.getClient?.('telegram');
    
    if (pendingTips.length === 0) {
      // No pending tips, just return success
      
      // If we have a chatId and telegramClient, notify the group
      if (params.chatId && telegramClient && telegramClient.sendMessage) {
        try {
          await telegramClient.sendMessage(
            params.chatId,
            `@${params.username} has registered their Aeternity address and is now ready to receive tips! 🎉`
          );
        } catch (error) {
          console.error('Failed to send group notification:', error);
          // Continue even if notification fails
        }
      }
      
      return {
        success: true,
        pendingTipsProcessed: 0,
        message: `Address ${params.address} has been registered for @${params.username}. No pending tips to process.`,
      };
    }
    
    // Get wallet provider for processing pending tips
    let walletProvider: AeternityWalletProvider;
    
    if (context.runtime.hasProvider('aeternityWallet')) {
      walletProvider = await context.runtime.getProvider('aeternityWallet');
    } else {
      // Create a new wallet provider if not available
      walletProvider = new AeternityWalletProvider();
      
      // Register the provider for reuse
      await context.runtime.registerProvider('aeternityWallet', walletProvider);
    }
    
    // Create transaction service
    const transactionService = new TransactionService(walletProvider);
    
    // Process pending tips
    const results = [];
    for (const pendingTip of pendingTips) {
      try {
        // Execute transfer
        const result = await transactionService.transferAe({
          recipient: params.address,
          amount: pendingTip.amount,
        });
        
        results.push({
          success: result.status === 'success',
          hash: result.hash,
          error: result.error,
          pendingTip,
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          pendingTip,
        });
      }
    }
    
    // Calculate statistics for successful tips
    const successfulTips = results.filter(r => r.success);
    const totalAmount = successfulTips.length > 0 
      ? successfulTips.reduce((sum, r) => sum + parseFloat(r.pendingTip.amount), 0).toFixed(4)
      : "0";
    
    // Send DM notification about processed tips
    if (telegramClient) {
      try {
        if (successfulTips.length > 0) {
          await telegramClient.sendDirectMessage(
            params.username,
            `Great news! Your address ${params.address} has been registered, and you've received ${successfulTips.length} pending tips totaling ${totalAmount} AE!\n\n` +
            successfulTips.map(tip => 
              `${tip.pendingTip.amount} AE - ${tip.pendingTip.message || 'No message'} (TX: ${tip.hash})`
            ).join('\n')
          );
        }
      } catch (error) {
        console.error('Failed to send tip notification:', error);
        // Continue even if notification fails
      }
      
      // If we have a chatId, also notify the group
      if (params.chatId && telegramClient.sendMessage && successfulTips.length > 0) {
        try {
          await telegramClient.sendMessage(
            params.chatId,
            `🎉 @${params.username} has registered their Aeternity address and received ${successfulTips.length} pending tips totaling ${totalAmount} AE!`
          );
        } catch (error) {
          console.error('Failed to send group notification:', error);
          // Continue even if notification fails
        }
      }
    }
    
    // Clear processed tips
    userAddressService.clearPendingTips(params.username);
    
    // Return success result
    return {
      success: true,
      pendingTipsProcessed: pendingTips.length,
      message: `Address ${params.address} has been registered for @${params.username}. Processed ${pendingTips.length} pending tips.`,
    };
  } catch (error) {
    console.error('Failed to process address registration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Action descriptor for processAddressRegistration
 */
export const processAddressRegistrationAction = {
  name: 'PROCESS_ADDRESS_REGISTRATION',
  description: 'Register an Aeternity address for a Telegram user and process any pending tips',
  inputSchema: processAddressRegistrationSchema,
  execute: processAddressRegistration,
}; 