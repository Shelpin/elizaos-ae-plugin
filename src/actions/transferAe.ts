import { z } from 'zod';
import { AeternityWalletProvider } from '../providers/walletProvider';
import { TransactionService } from '../services/transactionService';

// Input schema for transferAe action
export const transferAeSchema = z.object({
  // Recipient address
  recipient: z.string().min(1),
  
  // Amount to transfer
  amount: z.string().min(1),
  
  // Optional transaction parameters
  options: z
    .object({
      nonce: z.number().optional(),
      ttl: z.number().optional(),
      fee: z.string().optional(),
    })
    .optional(),
});

// Input type derived from schema
export type TransferAeInput = z.infer<typeof transferAeSchema>;

// Output type for transferAe action
export type TransferAeOutput = {
  success: boolean;
  hash?: string;
  error?: string;
};

/**
 * Transfer AE tokens to a recipient
 * @param input - Transfer parameters
 * @param context - Action context
 * @returns Transaction result
 */
export const transferAe = async (
  input: TransferAeInput,
  context: any
): Promise<TransferAeOutput> => {
  try {
    // Validate input
    const params = transferAeSchema.parse(input);
    
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
      recipient: params.recipient,
      amount: params.amount,
      options: params.options,
    });
    
    // Return result
    if (result.status === 'success') {
      return {
        success: true,
        hash: result.hash,
      };
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    console.error('Failed to transfer AE:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Action descriptor for transferAe
 */
export const transferAeAction = {
  name: 'TRANSFER_AE',
  description: 'Transfer AE tokens to a recipient',
  inputSchema: transferAeSchema,
  execute: transferAe,
}; 