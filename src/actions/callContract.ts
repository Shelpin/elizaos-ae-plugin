import { z } from 'zod';
import { AeternityWalletProvider } from '../providers/walletProvider';
import { TransactionService } from '../services/transactionService';

// Input schema for callContract action
export const callContractSchema = z.object({
  // Contract ID
  contractId: z.string().min(1),
  
  // Function to call
  functionName: z.string().min(1),
  
  // Arguments for the function
  args: z.array(z.any()),
  
  // Optional transaction parameters
  options: z
    .object({
      nonce: z.number().optional(),
      ttl: z.number().optional(),
      gas: z.number().optional(),
      fee: z.string().optional(),
    })
    .optional(),
});

// Input type derived from schema
export type CallContractInput = z.infer<typeof callContractSchema>;

// Output type for callContract action
export type CallContractOutput = {
  success: boolean;
  hash?: string;
  result?: any;
  error?: string;
};

/**
 * Call a contract function
 * @param input - Contract call parameters
 * @param context - Action context
 * @returns Transaction result
 */
export const callContract = async (
  input: CallContractInput,
  context: any
): Promise<CallContractOutput> => {
  try {
    // Validate input
    const params = callContractSchema.parse(input);
    
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
    
    // Execute contract call
    const result = await transactionService.callContract({
      contractId: params.contractId,
      functionName: params.functionName,
      args: params.args,
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
    console.error('Failed to call contract:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Action descriptor for callContract
 */
export const callContractAction = {
  name: 'CALL_CONTRACT',
  description: 'Call a smart contract function on Aeternity blockchain',
  inputSchema: callContractSchema,
  execute: callContract,
}; 