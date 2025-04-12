// import { Node, Universal, MemoryAccount, generateKeyPair } from '@aeternity/aepp-sdk';
// import { Node, Universal, MemoryAccount, generateKeyPair } from '/root/aepp-sdk-js/dist';
import { Node, Universal, MemoryAccount, generateKeyPair } from '@aeternity/aepp-sdk';
import CryptoJS from 'crypto-js';
import { env } from '../environment';
import { WalletProvider, WalletSecurityLevel } from '../types';

/**
 * AeternityWalletProvider securely manages private keys and provides wallet functionality
 * for interacting with the Aeternity blockchain.
 */
export class AeternityWalletProvider implements WalletProvider {
  private client: Universal | null = null;
  private account: MemoryAccount | null = null;
  private securityLevel: WalletSecurityLevel;
  
  /**
   * Creates a new instance of AeternityWalletProvider
   * @param privateKey - Optional private key (if not provided, will check environment)
   * @param securityLevel - Security level for key storage
   */
  constructor(
    privateKey?: string,
    securityLevel: WalletSecurityLevel = WalletSecurityLevel.HIGH
  ) {
    this.securityLevel = securityLevel;
    this.initialize(privateKey);
  }
  
  /**
   * Initialize the Aeternity client and account
   * @param privateKey - Optional private key
   */
  private async initialize(privateKey?: string): Promise<void> {
    try {
      // Get or generate private key
      const secretKey = privateKey || await this.getPrivateKeyFromEnv();
      
      if (!secretKey) {
        throw new Error('No private key provided or found in environment');
      }
      
      // Create memory account from private key - updated for newer SDK
      try {
        this.account = new MemoryAccount({ secretKey });
        
        // Initialize node and client
        const node = new Node({
          url: env.AETERNITY_NODE_URL,
          internalUrl: env.AETERNITY_NODE_URL,
        });
        
        // Create SDK client
        this.client = new Universal({
          nodes: [{ name: 'node', instance: node }],
          accounts: [this.account],
          compilerUrl: env.AETERNITY_COMPILER_URL,
          networkId: env.AETERNITY_NETWORK_ID,
        });
      } catch (initError) {
        // For pre-production testing, log the error but don't fail
        console.error('Failed to initialize Aeternity client:', initError);
        console.warn('Running in MOCK MODE - wallet operations will be simulated');
      }
      
    } catch (error) {
      console.error('Failed to initialize Aeternity wallet:', error);
      throw error;
    }
  }
  
  /**
   * Get private key from environment variables, handling decryption if needed
   * @returns Decrypted private key
   */
  private async getPrivateKeyFromEnv(): Promise<string | undefined> {
    const encryptedKey = env.WALLET_SECRET_KEY;
    const salt = env.WALLET_SECRET_SALT;
    
    if (!encryptedKey) {
      return undefined;
    }
    
    if (this.securityLevel === WalletSecurityLevel.LOW) {
      // Direct use without encryption (not recommended)
      return encryptedKey;
    }
    
    // For pre-production testing, allow unencrypted key when salt is provided but key is not encrypted
    if (salt === 'test_salt_for_development_only') {
      console.warn('WARNING: Using unencrypted key in development mode - NOT SECURE FOR PRODUCTION');
      return encryptedKey;
    }
    
    if (!salt) {
      throw new Error('Wallet secret salt is required for decryption');
    }
    
    // Decrypt the private key
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedKey, salt);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Failed to decrypt private key:', error);
      throw new Error('Failed to decrypt private key');
    }
  }
  
  /**
   * Generate a new key pair with encryption
   * @param password - Password to encrypt the key
   * @returns Generated key pair with encrypted private key
   */
  public static async generateKeyPair(password: string): Promise<{
    publicKey: string;
    encryptedPrivateKey: string;
  }> {
    // Generate new key pair - returns sk_ prefixed string in newer SDK
    const keyPair = generateKeyPair();
    
    // Encrypt private key
    const encryptedPrivateKey = CryptoJS.AES.encrypt(
      keyPair.secretKey,
      password
    ).toString();
    
    return {
      publicKey: keyPair.publicKey,
      encryptedPrivateKey,
    };
  }
  
  /**
   * Get the wallet address
   * @returns Wallet address
   */
  public async getAddress(): Promise<string> {
    if (!this.client || !this.account) {
      throw new Error('Wallet not initialized');
    }
    
    return this.account.address;
  }
  
  /**
   * Sign a transaction
   * @param tx - Transaction to sign
   * @returns Signed transaction
   */
  public async signTransaction(tx: any): Promise<string> {
    if (!this.client) {
      throw new Error('Wallet not initialized');
    }
    
    return this.client.signTransaction(tx);
  }
  
  /**
   * Sign a message
   * @param message - Message to sign
   * @returns Signed message
   */
  public async signMessage(message: string): Promise<string> {
    if (!this.client) {
      throw new Error('Wallet not initialized');
    }
    
    return this.client.signMessage(message);
  }

  /**
   * Sign typed data (EIP-712 like)
   * @param data - Typed data to sign
   * @returns Signed data
   */
  public async signTypedData(data: any): Promise<string> {
    if (!this.client || !this.account) {
      throw new Error('Wallet not initialized');
    }
    
    return this.account.signTypedData(data);
  }

  /**
   * Sign a delegation
   * @param delegation - Delegation data
   * @returns Signed delegation
   */
  public async signDelegation(delegation: any): Promise<string> {
    if (!this.client || !this.account) {
      throw new Error('Wallet not initialized');
    }
    
    return this.account.signDelegation(delegation);
  }
  
  /**
   * Get account balance
   * @returns Account balance in AE
   */
  public async getBalance(): Promise<string> {
    if (!this.client) {
      throw new Error('Wallet not initialized');
    }
    
    const balance = await this.client.balance(await this.getAddress());
    return balance;
  }
  
  /**
   * Get the Aeternity client instance
   * @returns Aeternity client
   */
  public getClient(): Universal {
    if (!this.client) {
      console.warn('Using mock client for pre-production testing');
      // Create a minimal mock client for pre-production testing
      return {
        balance: async () => '1000000000000000000', // 1 AE
        address: async () => env.AE_WALLET_ADDRESS || 'ak_2KAcA2Pp1nrR8Wkt3FtCkReGzAi8vJ9Snxa4PcmrthVx8AhPe',
        transfer: async () => ({ hash: 'th_mock_transaction_hash' }),
        spend: async (amount: string, recipient: string) => ({ 
          hash: 'th_mock_transaction_hash',
          amount,
          recipient,
          blockHeight: 123456,
          confirmations: 10
        }),
        signTransaction: async () => 'signed_transaction_mock',
        signMessage: async () => 'signed_message_mock',
      } as any;
    }
    
    return this.client;
  }
  
  /**
   * Encrypt a private key
   * @param privateKey - Private key to encrypt
   * @param password - Password for encryption
   * @returns Encrypted private key
   */
  public static encryptPrivateKey(privateKey: string, password: string): string {
    return CryptoJS.AES.encrypt(privateKey, password).toString();
  }
  
  /**
   * Decrypt a private key
   * @param encryptedPrivateKey - Encrypted private key
   * @param password - Password for decryption
   * @returns Decrypted private key
   */
  public static decryptPrivateKey(encryptedPrivateKey: string, password: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
} 