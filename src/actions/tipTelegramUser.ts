import { z } from 'zod';
import { AeternityWalletProvider } from '../providers/walletProvider';
import { TransactionService } from '../services/transactionService';
import { UserAddressService } from '../services/userAddressService';
import { ContributionAnalyzerService } from '../services/contributionAnalyzerService';
import { PendingTip, TelegramClient } from '../types';

// Input schema for tipTelegramUser action
export const tipTelegramUserSchema = z.object({
  // Telegram username or wallet address
  recipient: z.string().min(1),
  
  // Amount to tip in AE (optional if contributionDescription is provided)
  amount: z.string().optional(),
  
  // Description of the contribution (used to determine tip amount if not explicitly provided)
  contributionDescription: z.string().optional(),
  
  // Optional message to include with the tip
  message: z.string().optional(),
  
  // Optional transaction parameters
  options: z
    .object({
      fee: z.string().optional(),
    })
    .optional(),
  
  // Optional chat ID for group notifications
  chatId: z.string().optional(),
  
  // Optional flag to force tip even if LLM evaluation says it's not deserved
  forceTip: z.boolean().optional(),
});

// Input type derived from schema
export type TipTelegramUserInput = z.infer<typeof tipTelegramUserSchema>;

// Output type for tipTelegramUser action
export type TipTelegramUserOutput = {
  success: boolean;
  hash?: string;
  error?: string;
  message?: string;
  pendingAddressRequest?: boolean; // Indicates we're waiting for user to provide address
  contributionLevel?: string; // The analyzed contribution level if applicable
  tipAmount?: string; // The amount that was tipped
  deservedTip?: boolean; // Whether the LLM determined the contribution deserved a tip
  reasonForTip?: string; // LLM reasoning for the tip decision
};

/**
 * Resolves a Telegram username to an Aeternity address
 * @param username - Telegram username or already valid Aeternity address
 * @param userAddressService - Service to lookup username-to-address mappings
 * @param telegramClient - Optional Telegram client to request address if not found
 * @param chatId - Optional chat ID for group notifications
 * @returns Aeternity address, null if requesting address via DM, or throws error
 */
const resolveAddress = async (
  username: string, 
  userAddressService: UserAddressService,
  telegramClient?: TelegramClient,
  chatId?: string
): Promise<string | null> => {
  // If the input is already a valid AE address, return it
  if (username.startsWith('ak_')) {
    return username;
  }
  
  // Clean the username (remove @ if present)
  const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
  
  // Try to get the address from our mapping service
  const address = userAddressService.getAddress(cleanUsername);
  if (address) {
    return address;
  }
  
  // If we have a Telegram client, request the address via DM
  if (telegramClient) {
    try {
      // Send a DM to request the user's address
      await telegramClient.sendDirectMessage(
        cleanUsername,
        `Hello from the Aeternity tipping bot! Someone in the Aeternity community wants to send you a tip for your valuable contribution. ` +
        `To receive it, please reply with your Aeternity (AE) wallet address starting with 'ak_'. ` +
        `Your address will be saved for future tips.`
      );
      
      // If we have a chatId, also send a notification in the group
      if (chatId && telegramClient.sendMessage) {
        await telegramClient.sendMessage(
          chatId,
          `@${cleanUsername}, someone wants to tip you with AE tokens! I've sent you a direct message - please check your DMs and reply with your Aeternity address to receive your tip.`
        );
      }
      
      // Return null to indicate we need to wait for the user's response
      return null;
    } catch (error) {
      console.error(`Failed to send DM to @${cleanUsername}:`, error);
      throw new Error(`Could not request address from @${cleanUsername}`);
    }
  } else {
    throw new Error(`No address found for @${cleanUsername} and no Telegram client available to request it`);
  }
};

/**
 * Determine the appropriate tip amount based on input and LLM analysis
 * @param params - Tip parameters
 * @param contributionAnalyzer - Contribution analyzer service
 * @returns Object containing determined tip amount and metadata
 */
const determineTipAmount = async (
  params: TipTelegramUserInput, 
  contributionAnalyzer?: ContributionAnalyzerService
): Promise<{
  amount: string,
  contributionLevel?: string,
  deservedTip?: boolean,
  reasonForTip?: string
}> => {
  // If explicit amount is provided, use it
  if (params.amount) {
    // If contribution description is still provided, run analysis just for metadata
    if (params.contributionDescription && contributionAnalyzer) {
      try {
        const analysis = await contributionAnalyzer.analyzeContribution(params.contributionDescription);
        const deservedTip = params.forceTip || await contributionAnalyzer.shouldTip(params.contributionDescription);
        
        // Get reasoning if available
        let reasonForTip: string | undefined;
        if (contributionAnalyzer.runtime?.llm) {
          try {
            const reasoning = await contributionAnalyzer.runtime.llm.generateResponse({
              prompt: `Briefly explain why this contribution deserves a tip or not: "${params.contributionDescription}"`,
              maxTokens: 50
            });
            reasonForTip = reasoning.trim();
          } catch (error) {
            console.error('Error getting reasoning from LLM:', error);
          }
        }
        
        return {
          amount: params.amount,
          contributionLevel: analysis,
          deservedTip,
          reasonForTip
        };
      } catch (error) {
        console.error('Error analyzing contribution:', error);
      }
    }
    
    return { amount: params.amount };
  }
  
  // If contribution description and analyzer are available, determine the amount
  if (params.contributionDescription && contributionAnalyzer) {
    try {
      // Check if tip is deserved according to LLM
      const deservedTip = params.forceTip || await contributionAnalyzer.shouldTip(params.contributionDescription);
      
      // If not deserved and not forced, use minimum amount
      if (!deservedTip && !params.forceTip) {
        return { 
          amount: '0.1', // Minimum amount
          contributionLevel: 'minor',
          deservedTip: false,
          reasonForTip: 'Contribution does not meet criteria for a significant tip'
        };
      }
      
      // Get the recommended amount and level
      const level = await contributionAnalyzer.analyzeContribution(params.contributionDescription);
      const amount = contributionAnalyzer.getTipAmount(level);
      
      // Get reasoning if available
      let reasonForTip: string | undefined;
      if (contributionAnalyzer.runtime?.llm) {
        try {
          const reasoning = await contributionAnalyzer.runtime.llm.generateResponse({
            prompt: `Briefly explain why this contribution deserves a tip of ${amount} AE: "${params.contributionDescription}"`,
            maxTokens: 50
          });
          reasonForTip = reasoning.trim();
        } catch (error) {
          console.error('Error getting reasoning from LLM:', error);
        }
      }
      
      return {
        amount,
        contributionLevel: level,
        deservedTip: true,
        reasonForTip
      };
    } catch (error) {
      console.error('Error determining tip amount with LLM:', error);
    }
  }
  
  // Default amount if nothing else is provided
  return { amount: '0.5' }; // Default to 0.5 AE
};

/**
 * Send a tip to a Telegram user
 * @param input - Tipping parameters
 * @param context - Action context
 * @returns Transaction result
 */
export const tipTelegramUser = async (
  input: TipTelegramUserInput,
  context: any
): Promise<TipTelegramUserOutput> => {
  try {
    // Validate input - require either amount or contributionDescription
    if (!input.amount && !input.contributionDescription) {
      throw new Error('Either amount or contributionDescription must be provided');
    }
    
    const params = tipTelegramUserSchema.parse(input);
    
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
    
    // Get or create ContributionAnalyzerService if we have a contribution description
    let contributionAnalyzer: ContributionAnalyzerService | undefined;
    
    if (params.contributionDescription) {
      if (context.runtime.hasProvider('contributionAnalyzer')) {
        contributionAnalyzer = await context.runtime.getProvider('contributionAnalyzer');
      } else {
        // Create a new analyzer if not available, passing runtime for LLM access
        contributionAnalyzer = new ContributionAnalyzerService(context.runtime);
        
        // Register the provider for reuse
        await context.runtime.registerProvider('contributionAnalyzer', contributionAnalyzer);
      }
    }
    
    // Determine the tip amount to use
    const tipDetails = await determineTipAmount(params, contributionAnalyzer);
    const tipAmount = tipDetails.amount;
    const contributionLevel = tipDetails.contributionLevel;
    const deservedTip = tipDetails.deservedTip;
    const reasonForTip = tipDetails.reasonForTip;
    
    // Get Telegram client if available
    const telegramClient = context.telegramClient || context.runtime.getClient?.('telegram');
    
    // Resolve the recipient address
    let recipientAddress: string | null;
    try {
      recipientAddress = await resolveAddress(
        params.recipient, 
        userAddressService, 
        telegramClient,
        params.chatId
      );
      
      // If null, we need to wait for the user to provide their address
      if (recipientAddress === null) {
        // Create a pending tip record
        const pendingTip: PendingTip = {
          recipient: params.recipient,
          amount: tipAmount,
          message: params.message,
          requestedAt: new Date().toISOString(),
          // Optional: Set expiry date, e.g., 7 days from now
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
        
        // Store the pending tip
        userAddressService.addPendingTip(params.recipient, pendingTip);
        
        return {
          success: false,
          pendingAddressRequest: true,
          message: `We've sent a message to ${params.recipient} requesting their Aeternity address. The tip will be sent once they provide it.`,
          contributionLevel,
          tipAmount,
          deservedTip,
          reasonForTip
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Could not resolve recipient address: ${error instanceof Error ? error.message : String(error)}`,
        contributionLevel,
        tipAmount,
        deservedTip,
        reasonForTip
      };
    }
    
    // Get or create wallet provider
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
    
    // Execute transfer
    const result = await transactionService.transferAe({
      recipient: recipientAddress,
      amount: tipAmount,
      options: params.options,
    });
    
    // Record the tip in transaction history
    if (result.status === 'success') {
      const tipRecord = {
        recipient: params.recipient,
        recipientAddress,
        amount: tipAmount,
        message: params.message,
        contributionLevel,
        deservedTip,
        reasonForTip,
        timestamp: new Date().toISOString(),
        transactionHash: result.hash,
      };
      
      // Log the tip record for now
      console.log('Tip record:', tipRecord);
      
      // Notify the user via Telegram DM
      if (telegramClient && !params.recipient.startsWith('ak_')) {
        try {
          const cleanUsername = params.recipient.startsWith('@') 
            ? params.recipient.substring(1) 
            : params.recipient;
            
          // Add reasoning to message if available
          const tipReason = reasonForTip ? 
            `\n\nReason: "${reasonForTip}"` : 
            '';
          
          await telegramClient.sendDirectMessage(
            cleanUsername,
            `You've received a tip of ${tipAmount} AE! ` +
            (params.message ? `Message: "${params.message}"\n\n` : '\n\n') +
            (contributionLevel ? `Your contribution was rated as: ${contributionLevel}\n\n` : '') +
            `Transaction hash: ${result.hash}` +
            tipReason
          );
          
          // Also post a confirmation in the group chat if we have a chatId
          if (params.chatId && telegramClient.sendMessage) {
            // Include tip reason in group message if available
            const publicReason = reasonForTip ? 
              `\nReason: "${reasonForTip}"` : 
              '';
            
            await telegramClient.sendMessage(
              params.chatId,
              `Tip sent! @${cleanUsername} has received ${tipAmount} AE ` +
              (params.message ? `with message: "${params.message}" ` : '') +
              (contributionLevel ? `(Contribution level: ${contributionLevel}) ` : '') +
              `(TX: ${result.hash.substring(0, 10)}...)` +
              publicReason
            );
          }
        } catch (error) {
          console.error('Failed to send tip notification:', error);
          // Continue even if notification fails
        }
      }
      
      // Return success result
      return {
        success: true,
        hash: result.hash,
        message: params.message,
        contributionLevel,
        tipAmount,
        deservedTip,
        reasonForTip
      };
    } else {
      return {
        success: false,
        error: result.error,
        contributionLevel,
        tipAmount,
        deservedTip,
        reasonForTip
      };
    }
  } catch (error) {
    console.error('Failed to tip Telegram user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Action descriptor for tipTelegramUser
 */
export const tipTelegramUserAction = {
  name: 'TIP_TELEGRAM_USER',
  description: 'Send an AE token tip to a Telegram user, optionally analyzing contribution with ElizaOS LLM to determine amount',
  inputSchema: tipTelegramUserSchema,
  execute: tipTelegramUser,
}; 