"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AeternityWalletProvider: () => AeternityWalletProvider,
  ContributionAnalyzerService: () => ContributionAnalyzerService,
  ContributionLevel: () => ContributionLevel,
  ContributionType: () => ContributionType,
  TransactionService: () => TransactionService,
  UserAddressService: () => UserAddressService,
  aeternityPlugin: () => aeternityPlugin,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/actions/transferAe.ts
var import_zod2 = require("zod");

// src/providers/walletProvider.ts
var import_aepp_sdk = require("@aeternity/aepp-sdk");
var import_crypto_js = __toESM(require("crypto-js"));

// src/environment.ts
var import_zod = require("zod");
var import_dotenv = __toESM(require("dotenv"));
import_dotenv.default.config();
var aeternityEnvSchema = import_zod.z.object({
  // Wallet secret key (encrypted or hashed)
  WALLET_SECRET_KEY: import_zod.z.string().optional(),
  // Public address
  AE_WALLET_ADDRESS: import_zod.z.string().optional(),
  // Salt for encryption/decryption
  WALLET_SECRET_SALT: import_zod.z.string().optional(),
  // Network node URL
  AETERNITY_NODE_URL: import_zod.z.string().default("https://mainnet.aeternity.io"),
  // Compiler URL for smart contracts
  AETERNITY_COMPILER_URL: import_zod.z.string().default("https://compiler.aeternity.io"),
  // Network ID
  AETERNITY_NETWORK_ID: import_zod.z.string().default("ae_mainnet"),
  // Explorer API URL
  AETERNITY_EXPLORER_URL: import_zod.z.string().default("https://explorer.aeternity.io/api")
});
var loadEnvironment = () => {
  return aeternityEnvSchema.parse(process.env);
};
var env = loadEnvironment();

// src/providers/walletProvider.ts
var AeternityWalletProvider = class {
  /**
   * Creates a new instance of AeternityWalletProvider
   * @param privateKey - Optional private key (if not provided, will check environment)
   * @param securityLevel - Security level for key storage
   */
  constructor(privateKey, securityLevel = "high" /* HIGH */) {
    this.client = null;
    this.account = null;
    this.mockMode = false;
    this.securityLevel = securityLevel;
    this.initialize(privateKey);
  }
  /**
   * Initialize the Aeternity client and account
   * @param privateKey - Optional private key
   */
  async initialize(privateKey) {
    const secretKey = privateKey ?? await this.getPrivateKeyFromEnv();
    if (!secretKey) {
      throw new Error("No private key provided or found in environment");
    }
    this.account = new import_aepp_sdk.MemoryAccount({ secretKey });
    const node = new import_aepp_sdk.Node({
      url: env.AETERNITY_NODE_URL,
      internalUrl: env.AETERNITY_NODE_URL
    });
    this.client = new import_aepp_sdk.Universal({
      nodes: [{ name: "node", instance: node }],
      accounts: [this.account],
      compilerUrl: env.AETERNITY_COMPILER_URL,
      networkId: env.AETERNITY_NETWORK_ID
    });
    this.mockMode = false;
    console.log(`Initialized Aeternity client successfully on ${env.AETERNITY_NETWORK_ID}`);
  }
  /**
   * Get private key from environment variables, handling decryption if needed
   * @returns Decrypted private key
   */
  async getPrivateKeyFromEnv() {
    const encryptedKey = env.WALLET_SECRET_KEY;
    const salt = env.WALLET_SECRET_SALT;
    if (!encryptedKey) {
      return void 0;
    }
    if (this.securityLevel === "low" /* LOW */) {
      return encryptedKey;
    }
    if (salt === "test_salt_for_development_only") {
      console.warn("WARNING: Using unencrypted key in development mode - NOT SECURE FOR PRODUCTION");
      return encryptedKey;
    }
    if (!salt) {
      throw new Error("Wallet secret salt is required for decryption");
    }
    try {
      const bytes = import_crypto_js.default.AES.decrypt(encryptedKey, salt);
      return bytes.toString(import_crypto_js.default.enc.Utf8);
    } catch (error) {
      console.error("Failed to decrypt private key:", error);
      throw new Error("Failed to decrypt private key");
    }
  }
  /**
   * Generate a new key pair with encryption
   * @param password - Password to encrypt the key
   * @returns Generated key pair with encrypted private key
   */
  static async generateKeyPair(password) {
    try {
      const { generateKeyPair } = require("@aeternity/aepp-sdk");
      const keyPair = generateKeyPair();
      const encryptedPrivateKey = import_crypto_js.default.AES.encrypt(
        keyPair.secretKey,
        password
      ).toString();
      return {
        publicKey: keyPair.publicKey,
        encryptedPrivateKey
      };
    } catch (error) {
      console.error("Failed to generate key pair:", error);
      throw error;
    }
  }
  /**
   * Get the wallet address
   * @returns Wallet address
   */
  async getAddress() {
    if (!this.client || !this.account) {
      throw new Error("Wallet not initialized");
    }
    return this.account.address;
  }
  /**
   * Sign a transaction
   * @param tx - Transaction to sign
   * @returns Signed transaction
   */
  async signTransaction(tx) {
    if (!this.client) {
      throw new Error("Wallet not initialized");
    }
    return this.client.signTransaction(tx);
  }
  /**
   * Sign a message
   * @param message - Message to sign
   * @returns Signed message
   */
  async signMessage(message) {
    if (!this.client) {
      throw new Error("Wallet not initialized");
    }
    return this.client.signMessage(message);
  }
  /**
   * Sign typed data (EIP-712 like)
   * @param data - Typed data to sign
   * @returns Signed data
   */
  async signTypedData(data) {
    if (!this.client || !this.account) {
      throw new Error("Wallet not initialized");
    }
    return this.account.signTypedData(data);
  }
  /**
   * Sign a delegation
   * @param delegation - Delegation data
   * @returns Signed delegation
   */
  async signDelegation(delegation) {
    if (!this.client || !this.account) {
      throw new Error("Wallet not initialized");
    }
    return this.account.signDelegation(delegation);
  }
  /**
   * Get account balance
   * @returns Account balance in AE
   */
  async getBalance() {
    if (!this.client) {
      throw new Error("Wallet not initialized");
    }
    const balance = await this.client.balance(await this.getAddress());
    return balance;
  }
  /**
   * Get the Aeternity client instance
   * @returns Aeternity client
   */
  getClient() {
    if (!this.client) {
      console.warn("Using mock client for pre-production testing");
      return {
        balance: async () => "1000000000000000000",
        // 1 AE
        address: async () => env.AE_WALLET_ADDRESS || "ak_2KAcA2Pp1nrR8Wkt3FtCkReGzAi8vJ9Snxa4PcmrthVx8AhPe",
        transfer: async () => ({ hash: "th_mock_transaction_hash" }),
        spend: async (amount, recipient) => ({
          hash: "th_mock_transaction_hash",
          amount,
          recipient,
          blockHeight: 123456,
          confirmations: 10
        }),
        signTransaction: async () => "signed_transaction_mock",
        signMessage: async () => "signed_message_mock"
      };
    }
    return this.client;
  }
  /**
   * Encrypt a private key
   * @param privateKey - Private key to encrypt
   * @param password - Password for encryption
   * @returns Encrypted private key
   */
  static encryptPrivateKey(privateKey, password) {
    return import_crypto_js.default.AES.encrypt(privateKey, password).toString();
  }
  /**
   * Decrypt a private key
   * @param encryptedPrivateKey - Encrypted private key
   * @param password - Password for decryption
   * @returns Decrypted private key
   */
  static decryptPrivateKey(encryptedPrivateKey, password) {
    const bytes = import_crypto_js.default.AES.decrypt(encryptedPrivateKey, password);
    return bytes.toString(import_crypto_js.default.enc.Utf8);
  }
};

// src/services/transactionService.ts
var import_axios = __toESM(require("axios"));
var TransactionService = class {
  /**
   * Create a new TransactionService instance
   * @param walletProvider - The wallet provider
   */
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  /**
   * Transfer AE tokens to a recipient
   * @param params - Transfer parameters
   * @returns Transaction result
   */
  async transferAe(params) {
    try {
      const client = this.walletProvider.getClient();
      const sendFn = client.spend ?? client.transfer;
      if (typeof sendFn !== "function") {
        throw new Error("Aeternity client has no spend or transfer method");
      }
      const tx = await sendFn.call(client, params.amount, params.recipient, {
        ttl: params.options?.ttl,
        nonce: params.options?.nonce
      });
      return {
        hash: tx.hash,
        status: "success",
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight
      };
    } catch (error) {
      console.error("Failed to transfer AE:", error);
      return {
        hash: "",
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Call a contract function
   * @param params - Contract call parameters
   * @returns Transaction result
   */
  async callContract(params) {
    try {
      const client = this.walletProvider.getClient();
      const contract = await client.getContractInstance({
        contractAddress: params.contractId
      });
      const result = await contract.call(params.functionName, params.args, {
        ttl: params.options?.ttl,
        nonce: params.options?.nonce,
        fee: params.options?.fee,
        gas: params.options?.gas
      });
      return {
        hash: result.hash,
        status: "success",
        blockHash: result.blockHash,
        blockHeight: result.blockHeight
      };
    } catch (error) {
      console.error("Failed to call contract:", error);
      return {
        hash: "",
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Get transaction details from the explorer
   * @param hash - Transaction hash
   * @returns Transaction details
   */
  async getTransactionDetails(hash) {
    try {
      const response = await import_axios.default.get(`${env.AETERNITY_EXPLORER_URL}/v2/transactions/${hash}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get transaction details:", error);
      throw error;
    }
  }
  /**
   * Check if a transaction is confirmed
   * @param hash - Transaction hash
   * @returns Whether the transaction is confirmed
   */
  async isTransactionConfirmed(hash) {
    try {
      const details = await this.getTransactionDetails(hash);
      return details.confirmations > 0;
    } catch (error) {
      return false;
    }
  }
  /**
   * Estimate fee for a transaction
   * @param tx - Transaction object
   * @returns Estimated fee
   */
  async estimateFee(tx) {
    try {
      const client = this.walletProvider.getClient();
      const fee = await client.estimateFee(tx);
      return fee;
    } catch (error) {
      console.error("Failed to estimate fee:", error);
      throw error;
    }
  }
};

// src/actions/transferAe.ts
var transferAeSchema = import_zod2.z.object({
  // Recipient address
  recipient: import_zod2.z.string().min(1),
  // Amount to transfer
  amount: import_zod2.z.string().min(1),
  // Optional transaction parameters
  options: import_zod2.z.object({
    nonce: import_zod2.z.number().optional(),
    ttl: import_zod2.z.number().optional(),
    fee: import_zod2.z.string().optional()
  }).optional()
});
var transferAe = async (input, context) => {
  try {
    const params = transferAeSchema.parse(input);
    let walletProvider;
    if (context.runtime.hasProvider("aeternityWallet")) {
      walletProvider = await context.runtime.getProvider("aeternityWallet");
    } else {
      walletProvider = new AeternityWalletProvider();
      await context.runtime.registerProvider("aeternityWallet", walletProvider);
    }
    const transactionService = new TransactionService(walletProvider);
    const result = await transactionService.transferAe({
      recipient: params.recipient,
      amount: params.amount,
      options: params.options
    });
    if (result.status === "success") {
      return {
        success: true,
        hash: result.hash
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error("Failed to transfer AE:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
var transferAeAction = {
  name: "TRANSFER_AE",
  description: "Transfer AE tokens to a recipient",
  inputSchema: transferAeSchema,
  execute: transferAe
};

// src/actions/tipTelegramUser.ts
var import_zod3 = require("zod");

// src/services/userAddressService.ts
var UserAddressService = class {
  constructor() {
    this.userAddressMap = /* @__PURE__ */ new Map();
    this.pendingTips = /* @__PURE__ */ new Map();
  }
  /**
   * Get an Aeternity address for a Telegram username
   * @param username - Telegram username (with or without @)
   * @returns The mapped address or undefined if not found
   */
  getAddress(username) {
    const cleanUsername = this.cleanUsername(username);
    const mapping = this.userAddressMap.get(cleanUsername);
    return mapping?.address;
  }
  /**
   * Store an Aeternity address for a Telegram username
   * @param username - Telegram username (with or without @)
   * @param address - Aeternity address
   * @returns True if storage was successful
   */
  storeAddress(username, address) {
    const cleanUsername = this.cleanUsername(username);
    this.userAddressMap.set(cleanUsername, {
      username: cleanUsername,
      address,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return true;
  }
  /**
   * Add a pending tip for a user
   * @param username - Telegram username (with or without @)
   * @param pendingTip - The pending tip details
   */
  addPendingTip(username, pendingTip) {
    const cleanUsername = this.cleanUsername(username);
    const existingTips = this.pendingTips.get(cleanUsername) || [];
    existingTips.push(pendingTip);
    this.pendingTips.set(cleanUsername, existingTips);
  }
  /**
   * Get pending tips for a user
   * @param username - Telegram username (with or without @)
   * @returns Array of pending tips or empty array if none
   */
  getPendingTips(username) {
    const cleanUsername = this.cleanUsername(username);
    return this.pendingTips.get(cleanUsername) || [];
  }
  /**
   * Clear pending tips for a user
   * @param username - Telegram username (with or without @)
   */
  clearPendingTips(username) {
    const cleanUsername = this.cleanUsername(username);
    this.pendingTips.delete(cleanUsername);
  }
  /**
   * Remove a specific pending tip for a user
   * @param username - Telegram username (with or without @)
   * @param index - Index of the pending tip to remove
   * @returns The removed pending tip or undefined
   */
  removePendingTip(username, index) {
    const cleanUsername = this.cleanUsername(username);
    const pendingTips = this.pendingTips.get(cleanUsername) || [];
    if (index < 0 || index >= pendingTips.length) {
      return void 0;
    }
    const removedTip = pendingTips.splice(index, 1)[0];
    if (pendingTips.length > 0) {
      this.pendingTips.set(cleanUsername, pendingTips);
    } else {
      this.pendingTips.delete(cleanUsername);
    }
    return removedTip;
  }
  /**
   * Check if a user has any pending tips
   * @param username - Telegram username (with or without @)
   * @returns True if the user has pending tips
   */
  hasPendingTips(username) {
    const cleanUsername = this.cleanUsername(username);
    const pendingTips = this.pendingTips.get(cleanUsername) || [];
    return pendingTips.length > 0;
  }
  /**
   * Clean a username by removing @ if present and converting to lowercase
   * @param username - Telegram username (with or without @)
   * @returns Cleaned username
   */
  cleanUsername(username) {
    return username.startsWith("@") ? username.substring(1).toLowerCase() : username.toLowerCase();
  }
  /**
   * Export the current state to JSON for persistence
   * @returns JSON string representation of the current state
   */
  exportState() {
    const state = {
      addressMappings: Array.from(this.userAddressMap.values()),
      pendingTips: Array.from(this.pendingTips.entries()).map(([username, tips]) => ({
        username,
        tips
      }))
    };
    return JSON.stringify(state);
  }
  /**
   * Import state from a JSON string
   * @param jsonState - JSON string representation of the state
   * @returns True if import was successful
   */
  importState(jsonState) {
    try {
      const state = JSON.parse(jsonState);
      this.userAddressMap.clear();
      this.pendingTips.clear();
      if (Array.isArray(state.addressMappings)) {
        for (const mapping of state.addressMappings) {
          if (mapping.username && mapping.address) {
            this.userAddressMap.set(mapping.username, mapping);
          }
        }
      }
      if (Array.isArray(state.pendingTips)) {
        for (const entry of state.pendingTips) {
          if (entry.username && Array.isArray(entry.tips)) {
            this.pendingTips.set(entry.username, entry.tips);
          }
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to import state:", error);
      return false;
    }
  }
};

// src/services/contributionAnalyzerService.ts
var ContributionAnalyzerService = class {
  /**
   * Create a new ContributionAnalyzerService with optional custom tip amounts
   * @param runtime - ElizaOS runtime for accessing LLM capabilities
   * @param customTipAmounts - Optional custom tip amounts
   */
  constructor(runtime, customTipAmounts) {
    // Default tip amounts based on contribution levels
    this.defaultTipAmounts = {
      ["minor" /* MINOR */]: "0.1",
      // 0.1 AE for minor contributions
      ["helpful" /* HELPFUL */]: "0.5",
      // 0.5 AE for helpful contributions
      ["valuable" /* VALUABLE */]: "1.0",
      // 1.0 AE for valuable contributions
      ["major" /* MAJOR */]: "2.5",
      // 2.5 AE for major contributions
      ["exceptional" /* EXCEPTIONAL */]: "5.0"
      // 5.0 AE for exceptional contributions
    };
    // Keyword indicators for each contribution level (used as fallback)
    this.contributionKeywords = {
      ["minor" /* MINOR */]: [
        "thanks",
        "thank you",
        "appreciate",
        "helpful",
        "simple question"
      ],
      ["helpful" /* HELPFUL */]: [
        "good explanation",
        "clear answer",
        "solved my problem",
        "useful info"
      ],
      ["valuable" /* VALUABLE */]: [
        "very helpful",
        "great solution",
        "detailed explanation",
        "saved me time",
        "educational",
        "informative"
      ],
      ["major" /* MAJOR */]: [
        "excellent contribution",
        "outstanding explanation",
        "deep analysis",
        "critical solution",
        "thorough research"
      ],
      ["exceptional" /* EXCEPTIONAL */]: [
        "life saver",
        "revolutionary",
        "invaluable",
        "game changer",
        "best explanation",
        "exceptional work"
      ]
    };
    this.runtime = runtime;
    if (customTipAmounts) {
      this.defaultTipAmounts = {
        ...this.defaultTipAmounts,
        ...customTipAmounts
      };
    }
  }
  /**
   * Analyze a contribution description using ElizaOS LLM and determine the appropriate level
   * @param contributionDescription - Description of the contribution
   * @returns The determined contribution level
   */
  async analyzeContribution(contributionDescription) {
    try {
      if (this.runtime && this.runtime.llm) {
        const analysis = await this.runtime.llm.generateResponse({
          prompt: `Analyze this Telegram contribution: "${contributionDescription}". 
                  Rate its value on a scale from 1-5 where:
                  1=minor (basic thanks or simple question)
                  2=helpful (good explanation or clear answer)
                  3=valuable (detailed explanation or time-saving solution)
                  4=major (excellent contribution or deep analysis)
                  5=exceptional (game-changing or revolutionary content)
                  Respond with ONLY the number 1-5.`,
          maxTokens: 10
        });
        const rating = parseInt(analysis.trim(), 10);
        if (!isNaN(rating)) {
          switch (rating) {
            case 1:
              return "minor" /* MINOR */;
            case 2:
              return "helpful" /* HELPFUL */;
            case 3:
              return "valuable" /* VALUABLE */;
            case 4:
              return "major" /* MAJOR */;
            case 5:
              return "exceptional" /* EXCEPTIONAL */;
            default:
              return "helpful" /* HELPFUL */;
          }
        }
      }
      return this.keywordBasedAnalysis(contributionDescription);
    } catch (error) {
      console.error("Error using LLM for contribution analysis:", error);
      return this.keywordBasedAnalysis(contributionDescription);
    }
  }
  /**
   * Analyze contribution using keywords (fallback method)
   * @param contributionDescription - Description of the contribution
   * @returns The determined contribution level
   */
  keywordBasedAnalysis(contributionDescription) {
    const normalizedText = contributionDescription.toLowerCase();
    const scores = Object.keys(this.contributionKeywords).reduce((acc, level) => {
      acc[level] = 0;
      return acc;
    }, {});
    for (const level of Object.keys(this.contributionKeywords)) {
      for (const keyword of this.contributionKeywords[level]) {
        if (normalizedText.includes(keyword)) {
          scores[level] += 1;
        }
      }
    }
    let highestLevel = "minor" /* MINOR */;
    let highestScore = 0;
    for (const level of Object.keys(scores)) {
      if (scores[level] > highestScore) {
        highestScore = scores[level];
        highestLevel = level;
      }
    }
    if (highestScore === 0) {
      return "helpful" /* HELPFUL */;
    }
    return highestLevel;
  }
  /**
   * Get recommended tip amount based on contribution level
   * @param level - Contribution level
   * @returns Recommended tip amount in AE
   */
  getTipAmount(level) {
    return this.defaultTipAmounts[level];
  }
  /**
   * Analyze a contribution and get the recommended tip amount
   * @param contributionDescription - Description of the contribution
   * @returns Recommended tip amount in AE
   */
  async getRecommendedTipAmount(contributionDescription) {
    const level = await this.analyzeContribution(contributionDescription);
    return this.getTipAmount(level);
  }
  /**
   * Determine if a contribution deserves a tip based on LLM evaluation
   * @param contributionDescription - Description of the contribution
   * @returns Whether the contribution deserves a tip
   */
  async shouldTip(contributionDescription) {
    try {
      if (this.runtime && this.runtime.llm) {
        const analysis = await this.runtime.llm.generateResponse({
          prompt: `Here is a contribution in a Telegram group: "${contributionDescription}". 
                  Based on this contribution, does it deserve a tip with Aeternity tokens?
                  Consider factors like helpfulness, uniqueness, detail, and value to the community.
                  If it's a basic question, simple thanks, or low effort, it doesn't deserve a tip.
                  If it's helpful, detailed, educational, or valuable, it deserves a tip.
                  Respond with ONLY "YES" or "NO".`,
          maxTokens: 10
        });
        const response = analysis.trim().toUpperCase();
        return response === "YES";
      }
      const level = await this.analyzeContribution(contributionDescription);
      return level !== "minor" /* MINOR */;
    } catch (error) {
      console.error("Error determining if contribution deserves tip:", error);
      const level = await this.analyzeContribution(contributionDescription);
      return level !== "minor" /* MINOR */;
    }
  }
  /**
   * Customize tip amounts for specific contribution levels
   * @param customAmounts - Custom tip amounts
   */
  setTipAmounts(customAmounts) {
    this.defaultTipAmounts = {
      ...this.defaultTipAmounts,
      ...customAmounts
    };
  }
};
var ContributionLevel = /* @__PURE__ */ ((ContributionLevel2) => {
  ContributionLevel2["MINOR"] = "minor";
  ContributionLevel2["HELPFUL"] = "helpful";
  ContributionLevel2["VALUABLE"] = "valuable";
  ContributionLevel2["MAJOR"] = "major";
  ContributionLevel2["EXCEPTIONAL"] = "exceptional";
  return ContributionLevel2;
})(ContributionLevel || {});
var ContributionType = /* @__PURE__ */ ((ContributionType2) => {
  ContributionType2["QUESTION_ANSWER"] = "question_answer";
  ContributionType2["CODE_SHARE"] = "code_share";
  ContributionType2["TUTORIAL"] = "tutorial";
  ContributionType2["RESOURCE_SHARING"] = "resource_sharing";
  ContributionType2["COMMUNITY_SUPPORT"] = "community_support";
  ContributionType2["BUG_REPORT"] = "bug_report";
  ContributionType2["TECHNICAL_EXPLANATION"] = "technical_explanation";
  ContributionType2["OTHER"] = "other";
  return ContributionType2;
})(ContributionType || {});

// src/actions/tipTelegramUser.ts
var tipTelegramUserSchema = import_zod3.z.object({
  // Telegram username or wallet address
  recipient: import_zod3.z.string().min(1),
  // Amount to tip in AE (optional if contributionDescription is provided)
  amount: import_zod3.z.string().optional(),
  // Description of the contribution (used to determine tip amount if not explicitly provided)
  contributionDescription: import_zod3.z.string().optional(),
  // Optional message to include with the tip
  message: import_zod3.z.string().optional(),
  // Optional transaction parameters
  options: import_zod3.z.object({
    fee: import_zod3.z.string().optional()
  }).optional(),
  // Optional chat ID for group notifications
  chatId: import_zod3.z.string().optional(),
  // Optional flag to force tip even if LLM evaluation says it's not deserved
  forceTip: import_zod3.z.boolean().optional()
});
var resolveAddress = async (username, userAddressService, telegramClient, chatId) => {
  if (username.startsWith("ak_")) {
    return username;
  }
  const cleanUsername = username.startsWith("@") ? username.substring(1) : username;
  const address = userAddressService.getAddress(cleanUsername);
  if (address) {
    return address;
  }
  if (telegramClient) {
    try {
      await telegramClient.sendDirectMessage(
        cleanUsername,
        `Hello from the Aeternity tipping bot! Someone in the Aeternity community wants to send you a tip for your valuable contribution. To receive it, please reply with your Aeternity (AE) wallet address starting with 'ak_'. Your address will be saved for future tips.`
      );
      if (chatId && telegramClient.sendMessage) {
        await telegramClient.sendMessage(
          chatId,
          `@${cleanUsername}, someone wants to tip you with AE tokens! I've sent you a direct message - please check your DMs and reply with your Aeternity address to receive your tip.`
        );
      }
      return null;
    } catch (error) {
      console.error(`Failed to send DM to @${cleanUsername}:`, error);
      throw new Error(`Could not request address from @${cleanUsername}`);
    }
  } else {
    throw new Error(`No address found for @${cleanUsername} and no Telegram client available to request it`);
  }
};
var determineTipAmount = async (params, contributionAnalyzer) => {
  if (params.amount) {
    if (params.contributionDescription && contributionAnalyzer) {
      try {
        const analysis = await contributionAnalyzer.analyzeContribution(params.contributionDescription);
        const deservedTip = params.forceTip || await contributionAnalyzer.shouldTip(params.contributionDescription);
        let reasonForTip;
        if (contributionAnalyzer.runtime?.llm) {
          try {
            const reasoning = await contributionAnalyzer.runtime.llm.generateResponse({
              prompt: `Briefly explain why this contribution deserves a tip or not: "${params.contributionDescription}"`,
              maxTokens: 50
            });
            reasonForTip = reasoning.trim();
          } catch (error) {
            console.error("Error getting reasoning from LLM:", error);
          }
        }
        return {
          amount: params.amount,
          contributionLevel: analysis,
          deservedTip,
          reasonForTip
        };
      } catch (error) {
        console.error("Error analyzing contribution:", error);
      }
    }
    return { amount: params.amount };
  }
  if (params.contributionDescription && contributionAnalyzer) {
    try {
      const deservedTip = params.forceTip || await contributionAnalyzer.shouldTip(params.contributionDescription);
      if (!deservedTip && !params.forceTip) {
        return {
          amount: "0.1",
          // Minimum amount
          contributionLevel: "minor",
          deservedTip: false,
          reasonForTip: "Contribution does not meet criteria for a significant tip"
        };
      }
      const level = await contributionAnalyzer.analyzeContribution(params.contributionDescription);
      const amount = contributionAnalyzer.getTipAmount(level);
      let reasonForTip;
      if (contributionAnalyzer.runtime?.llm) {
        try {
          const reasoning = await contributionAnalyzer.runtime.llm.generateResponse({
            prompt: `Briefly explain why this contribution deserves a tip of ${amount} AE: "${params.contributionDescription}"`,
            maxTokens: 50
          });
          reasonForTip = reasoning.trim();
        } catch (error) {
          console.error("Error getting reasoning from LLM:", error);
        }
      }
      return {
        amount,
        contributionLevel: level,
        deservedTip: true,
        reasonForTip
      };
    } catch (error) {
      console.error("Error determining tip amount with LLM:", error);
    }
  }
  return { amount: "0.5" };
};
var tipTelegramUser = async (input, context) => {
  try {
    if (!input.amount && !input.contributionDescription) {
      throw new Error("Either amount or contributionDescription must be provided");
    }
    const params = tipTelegramUserSchema.parse(input);
    let userAddressService;
    if (context.runtime.hasProvider("aeternityUserAddress")) {
      userAddressService = await context.runtime.getProvider("aeternityUserAddress");
    } else {
      userAddressService = new UserAddressService();
      await context.runtime.registerProvider("aeternityUserAddress", userAddressService);
    }
    let contributionAnalyzer;
    if (params.contributionDescription) {
      if (context.runtime.hasProvider("contributionAnalyzer")) {
        contributionAnalyzer = await context.runtime.getProvider("contributionAnalyzer");
      } else {
        contributionAnalyzer = new ContributionAnalyzerService(context.runtime);
        await context.runtime.registerProvider("contributionAnalyzer", contributionAnalyzer);
      }
    }
    const tipDetails = await determineTipAmount(params, contributionAnalyzer);
    const tipAmount = tipDetails.amount;
    const contributionLevel = tipDetails.contributionLevel;
    const deservedTip = tipDetails.deservedTip;
    const reasonForTip = tipDetails.reasonForTip;
    const telegramClient = context.telegramClient || context.runtime.getClient?.("telegram");
    let recipientAddress;
    try {
      recipientAddress = await resolveAddress(
        params.recipient,
        userAddressService,
        telegramClient,
        params.chatId
      );
      if (recipientAddress === null) {
        const pendingTip = {
          recipient: params.recipient,
          amount: tipAmount,
          message: params.message,
          requestedAt: (/* @__PURE__ */ new Date()).toISOString(),
          // Optional: Set expiry date, e.g., 7 days from now
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString()
        };
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
    let walletProvider;
    if (context.runtime.hasProvider("aeternityWallet")) {
      walletProvider = await context.runtime.getProvider("aeternityWallet");
    } else {
      walletProvider = new AeternityWalletProvider();
      await context.runtime.registerProvider("aeternityWallet", walletProvider);
    }
    const transactionService = new TransactionService(walletProvider);
    const result = await transactionService.transferAe({
      recipient: recipientAddress,
      amount: tipAmount,
      options: params.options
    });
    if (result.status === "success") {
      const tipRecord = {
        recipient: params.recipient,
        recipientAddress,
        amount: tipAmount,
        message: params.message,
        contributionLevel,
        deservedTip,
        reasonForTip,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        transactionHash: result.hash
      };
      console.log("Tip record:", tipRecord);
      if (telegramClient && !params.recipient.startsWith("ak_")) {
        try {
          const cleanUsername = params.recipient.startsWith("@") ? params.recipient.substring(1) : params.recipient;
          const tipReason = reasonForTip ? `

Reason: "${reasonForTip}"` : "";
          await telegramClient.sendDirectMessage(
            cleanUsername,
            `You've received a tip of ${tipAmount} AE! ` + (params.message ? `Message: "${params.message}"

` : "\n\n") + (contributionLevel ? `Your contribution was rated as: ${contributionLevel}

` : "") + `Transaction hash: ${result.hash}` + tipReason
          );
          if (params.chatId && telegramClient.sendMessage) {
            const publicReason = reasonForTip ? `
Reason: "${reasonForTip}"` : "";
            await telegramClient.sendMessage(
              params.chatId,
              `Tip sent! @${cleanUsername} has received ${tipAmount} AE ` + (params.message ? `with message: "${params.message}" ` : "") + (contributionLevel ? `(Contribution level: ${contributionLevel}) ` : "") + `(TX: ${result.hash.substring(0, 10)}...)` + publicReason
            );
          }
        } catch (error) {
          console.error("Failed to send tip notification:", error);
        }
      }
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
    console.error("Failed to tip Telegram user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
var tipTelegramUserAction = {
  name: "TIP_TELEGRAM_USER",
  description: "Send an AE token tip to a Telegram user, optionally analyzing contribution with ElizaOS LLM to determine amount",
  inputSchema: tipTelegramUserSchema,
  execute: tipTelegramUser
};

// src/actions/processAddressRegistration.ts
var import_zod4 = require("zod");
var processAddressRegistrationSchema = import_zod4.z.object({
  // Telegram username
  username: import_zod4.z.string().min(1),
  // Aeternity address
  address: import_zod4.z.string().min(1).refine(
    (addr) => addr.startsWith("ak_"),
    { message: "Invalid Aeternity address format, must start with ak_" }
  ),
  // Optional chat ID for group notifications
  chatId: import_zod4.z.string().optional()
});
var processAddressRegistration = async (input, context) => {
  try {
    const params = processAddressRegistrationSchema.parse(input);
    let userAddressService;
    if (context.runtime.hasProvider("aeternityUserAddress")) {
      userAddressService = await context.runtime.getProvider("aeternityUserAddress");
    } else {
      userAddressService = new UserAddressService();
      await context.runtime.registerProvider("aeternityUserAddress", userAddressService);
    }
    userAddressService.storeAddress(params.username, params.address);
    const pendingTips = userAddressService.getPendingTips(params.username);
    const telegramClient = context.telegramClient || context.runtime.getClient?.("telegram");
    if (pendingTips.length === 0) {
      if (params.chatId && telegramClient && telegramClient.sendMessage) {
        try {
          await telegramClient.sendMessage(
            params.chatId,
            `@${params.username} has registered their Aeternity address and is now ready to receive tips! \u{1F389}`
          );
        } catch (error) {
          console.error("Failed to send group notification:", error);
        }
      }
      return {
        success: true,
        pendingTipsProcessed: 0,
        message: `Address ${params.address} has been registered for @${params.username}. No pending tips to process.`
      };
    }
    let walletProvider;
    if (context.runtime.hasProvider("aeternityWallet")) {
      walletProvider = await context.runtime.getProvider("aeternityWallet");
    } else {
      walletProvider = new AeternityWalletProvider();
      await context.runtime.registerProvider("aeternityWallet", walletProvider);
    }
    const transactionService = new TransactionService(walletProvider);
    const results = [];
    for (const pendingTip of pendingTips) {
      try {
        const result = await transactionService.transferAe({
          recipient: params.address,
          amount: pendingTip.amount
        });
        results.push({
          success: result.status === "success",
          hash: result.hash,
          error: result.error,
          pendingTip
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          pendingTip
        });
      }
    }
    const successfulTips = results.filter((r) => r.success);
    const totalAmount = successfulTips.length > 0 ? successfulTips.reduce((sum, r) => sum + parseFloat(r.pendingTip.amount), 0).toFixed(4) : "0";
    if (telegramClient) {
      try {
        if (successfulTips.length > 0) {
          await telegramClient.sendDirectMessage(
            params.username,
            `Great news! Your address ${params.address} has been registered, and you've received ${successfulTips.length} pending tips totaling ${totalAmount} AE!

` + successfulTips.map(
              (tip) => `${tip.pendingTip.amount} AE - ${tip.pendingTip.message || "No message"} (TX: ${tip.hash})`
            ).join("\n")
          );
        }
      } catch (error) {
        console.error("Failed to send tip notification:", error);
      }
      if (params.chatId && telegramClient.sendMessage && successfulTips.length > 0) {
        try {
          await telegramClient.sendMessage(
            params.chatId,
            `\u{1F389} @${params.username} has registered their Aeternity address and received ${successfulTips.length} pending tips totaling ${totalAmount} AE!`
          );
        } catch (error) {
          console.error("Failed to send group notification:", error);
        }
      }
    }
    userAddressService.clearPendingTips(params.username);
    return {
      success: true,
      pendingTipsProcessed: pendingTips.length,
      message: `Address ${params.address} has been registered for @${params.username}. Processed ${pendingTips.length} pending tips.`
    };
  } catch (error) {
    console.error("Failed to process address registration:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
var processAddressRegistrationAction = {
  name: "PROCESS_ADDRESS_REGISTRATION",
  description: "Register an Aeternity address for a Telegram user and process any pending tips",
  inputSchema: processAddressRegistrationSchema,
  execute: processAddressRegistration
};

// src/actions/analyzeContribution.ts
var import_zod5 = require("zod");
var analyzeContributionSchema = import_zod5.z.object({
  // Description of the contribution
  description: import_zod5.z.string().min(1),
  // Optional contributor username
  contributor: import_zod5.z.string().optional(),
  // Optional contribution type
  type: import_zod5.z.nativeEnum(ContributionType).optional(),
  // Optional additional context
  context: import_zod5.z.string().optional(),
  // Optional flag to force tip even if LLM evaluation says no
  forceTip: import_zod5.z.boolean().optional()
});
var analyzeContribution = async (input, context) => {
  try {
    const params = analyzeContributionSchema.parse(input);
    let contributionAnalyzer;
    if (context.runtime.hasProvider("contributionAnalyzer")) {
      contributionAnalyzer = await context.runtime.getProvider("contributionAnalyzer");
    } else {
      contributionAnalyzer = new ContributionAnalyzerService(context.runtime);
      await context.runtime.registerProvider("contributionAnalyzer", contributionAnalyzer);
    }
    const level = await contributionAnalyzer.analyzeContribution(params.description);
    const recommendedAmount = contributionAnalyzer.getTipAmount(level);
    const type = params.type || await determineContributionType(params.description, context.runtime);
    const deservesTip = params.forceTip || await contributionAnalyzer.shouldTip(params.description);
    let reasonForTip;
    let llmConfidence;
    if (context.runtime.llm) {
      try {
        const reasoning = await context.runtime.llm.generateResponse({
          prompt: `Analyze this contribution in a Telegram group: "${params.description}"
                  1. Explain in 1-2 sentences why this contribution is valuable (or not valuable).
                  2. Rate your confidence in this assessment on a scale of 0-100.
                  Format your response as:
                  Reason: [your reason]
                  Confidence: [number 0-100]`,
          maxTokens: 100
        });
        const reasonMatch = reasoning.match(/Reason:\s*(.+?)(?:\s*Confidence:|$)/s);
        const confidenceMatch = reasoning.match(/Confidence:\s*(\d+)/);
        if (reasonMatch && reasonMatch[1]) {
          reasonForTip = reasonMatch[1].trim();
        }
        if (confidenceMatch && confidenceMatch[1]) {
          const confidenceValue = parseInt(confidenceMatch[1], 10);
          if (!isNaN(confidenceValue) && confidenceValue >= 0 && confidenceValue <= 100) {
            llmConfidence = confidenceValue / 100;
          }
        }
      } catch (error) {
        console.error("Error getting LLM reasoning:", error);
      }
    }
    const confidenceScore = llmConfidence ?? calculateConfidenceScore(params.description, level);
    const analysis = {
      level,
      type,
      recommendedAmount,
      confidenceScore,
      deservesTip
    };
    return {
      analysis,
      suggestedTipAmount: recommendedAmount,
      deservesTip,
      llmConfidence,
      reasonForTip
    };
  } catch (error) {
    console.error("Failed to analyze contribution:", error);
    throw error;
  }
};
async function determineContributionType(description, runtime) {
  try {
    if (runtime && runtime.llm) {
      const analysis = await runtime.llm.generateResponse({
        prompt: `Categorize this Telegram contribution: "${description}"
                Choose ONE category from this list:
                - QUESTION_ANSWER (solving problems or answering questions)
                - CODE_SHARE (sharing code snippets or scripts)
                - TUTORIAL (step-by-step guides)
                - RESOURCE_SHARING (articles, links, documentation)
                - COMMUNITY_SUPPORT (helping new users, welcoming)
                - BUG_REPORT (reporting issues or problems)
                - TECHNICAL_EXPLANATION (explaining concepts or techniques)
                - OTHER (none of the above)
                Respond with ONLY the category name.`,
        maxTokens: 20
      });
      const category = analysis.trim().toUpperCase();
      const typeMap = {
        "QUESTION_ANSWER": "question_answer" /* QUESTION_ANSWER */,
        "CODE_SHARE": "code_share" /* CODE_SHARE */,
        "TUTORIAL": "tutorial" /* TUTORIAL */,
        "RESOURCE_SHARING": "resource_sharing" /* RESOURCE_SHARING */,
        "COMMUNITY_SUPPORT": "community_support" /* COMMUNITY_SUPPORT */,
        "BUG_REPORT": "bug_report" /* BUG_REPORT */,
        "TECHNICAL_EXPLANATION": "technical_explanation" /* TECHNICAL_EXPLANATION */
      };
      return typeMap[category] || "other" /* OTHER */;
    }
  } catch (error) {
    console.error("Error determining contribution type with LLM:", error);
  }
  return keywordBasedTypeDetermination(description);
}
function keywordBasedTypeDetermination(description) {
  const normalizedText = description.toLowerCase();
  if (normalizedText.includes("question") || normalizedText.includes("answer") || normalizedText.includes("solved") || normalizedText.includes("solution")) {
    return "question_answer" /* QUESTION_ANSWER */;
  }
  if (normalizedText.includes("code") || normalizedText.includes("script") || normalizedText.includes("function") || normalizedText.includes("github")) {
    return "code_share" /* CODE_SHARE */;
  }
  if (normalizedText.includes("tutorial") || normalizedText.includes("guide") || normalizedText.includes("how to") || normalizedText.includes("step by step")) {
    return "tutorial" /* TUTORIAL */;
  }
  if (normalizedText.includes("article") || normalizedText.includes("link") || normalizedText.includes("resource") || normalizedText.includes("documentation")) {
    return "resource_sharing" /* RESOURCE_SHARING */;
  }
  if (normalizedText.includes("help") || normalizedText.includes("support") || normalizedText.includes("community") || normalizedText.includes("welcome")) {
    return "community_support" /* COMMUNITY_SUPPORT */;
  }
  if (normalizedText.includes("bug") || normalizedText.includes("issue") || normalizedText.includes("problem") || normalizedText.includes("fix")) {
    return "bug_report" /* BUG_REPORT */;
  }
  if (normalizedText.includes("explain") || normalizedText.includes("explanation") || normalizedText.includes("concept") || normalizedText.includes("technique")) {
    return "technical_explanation" /* TECHNICAL_EXPLANATION */;
  }
  return "other" /* OTHER */;
}
function calculateConfidenceScore(description, level) {
  const lengthScore = Math.min(description.length / 200, 0.5);
  const baseLevelConfidence = {
    ["minor" /* MINOR */]: 0.8,
    ["helpful" /* HELPFUL */]: 0.7,
    ["valuable" /* VALUABLE */]: 0.6,
    ["major" /* MAJOR */]: 0.5,
    ["exceptional" /* EXCEPTIONAL */]: 0.4
  };
  return Math.min(baseLevelConfidence[level] + lengthScore, 1);
}
var analyzeContributionAction = {
  name: "ANALYZE_CONTRIBUTION",
  description: "Analyze a Telegram contribution using ElizaOS LLM and get recommended tip amount",
  inputSchema: analyzeContributionSchema,
  execute: analyzeContribution
};

// src/index.ts
var basicValidate = async (runtime) => {
  return true;
};
function wrapHandler(execute) {
  return async (runtime, input, context) => {
    return execute(runtime, input, context);
  };
}
var aeternityPlugin = {
  name: "aeternity",
  description: "Aeternity blockchain plugin for tipping and blockchain operations",
  // Define actions conforming to the Action interface
  actions: [
    {
      name: "PROCESS_ADDRESS_REGISTRATION",
      description: "Register a user's Aeternity address for receiving tips. Parameters: username (string, required) - The Telegram username of the user registering an address; address (string, required) - The Aeternity address to register (must start with 'ak_'); chatId (string, optional) - The chat ID where the registration is happening.",
      similes: ["REGISTER_AE_ADDRESS", "SET_WALLET_ADDRESS"],
      examples: [
        [
          { user: "user", content: { text: "I want to register my Aeternity address: ak_123..." } },
          { user: "\xE6ngel", content: { text: "Your address ak_123... has been registered!" } }
        ]
      ],
      validate: basicValidate,
      handler: wrapHandler(processAddressRegistrationAction.execute)
    },
    {
      name: "TIP_TELEGRAM_USER",
      description: "Send a tip to a Telegram user. Parameters: recipient (string, required) - The Telegram username (@username) or AE address (ak_...) of the recipient; amount (string, optional) - The amount of AE tokens to send; message (string, optional) - An optional message to include with the tip; contributionDescription (string, optional) - Description of the contribution to analyze for automatic tip amount calculation; chatId (string, optional) - The chat ID where the tip is being sent, for notifications.",
      similes: ["SEND_TIP", "REWARD_USER"],
      examples: [
        [
          { user: "user", content: { text: "Tip @testuser 0.5 AE for helping me!" } },
          { user: "\xE6ngel", content: { text: "Sent 0.5 AE to @testuser with message: 'Great help!'" } }
        ],
        [
          { user: "user", content: { text: "Send 1.0 AE to ak_..." } },
          { user: "\xE6ngel", content: { text: "Transferred 1.0 AE to ak_..." } }
        ],
        [
          { user: "user", content: { text: "Reward @anotheruser for fixing the bug" } },
          { user: "\xE6ngel", content: { text: "Tipped @anotheruser for their contribution: 'Fixed the bug'" } }
        ]
      ],
      validate: basicValidate,
      handler: wrapHandler(tipTelegramUserAction.execute)
    },
    {
      name: "ANALYZE_CONTRIBUTION",
      description: "Analyze a contribution to determine its value and suggest a tip amount. Parameters: description (string, required) - The description of the contribution to analyze; type (string, optional) - Optional type of contribution (e.g., code_share, tutorial).",
      similes: ["EVALUATE_CONTRIBUTION", "ASSESS_VALUE"],
      examples: [
        [
          { user: "user", content: { text: "How valuable is this contribution: Provided a detailed explanation of state channels?" } },
          { user: "\xE6ngel", content: { text: "This contribution is highly valuable and deserves a tip!" } }
        ]
      ],
      validate: basicValidate,
      handler: wrapHandler(analyzeContributionAction.execute)
    },
    {
      name: "TRANSFER_AE",
      description: "Transfer AE tokens to a specific Aeternity address. Parameters: recipient (string, required) - The recipient Aeternity address (must start with 'ak_'); amount (string, required) - The amount of AE tokens to send; memo (string, optional) - Optional memo or description for the transaction.",
      similes: ["SEND_AE", "MAKE_AE_TRANSFER"],
      examples: [
        [
          { user: "user", content: { text: "Transfer 10 AE to ak_... for payment" } },
          { user: "\xE6ngel", content: { text: "Transferred 10 AE to ak_... with memo: 'Payment for services'" } }
        ]
      ],
      validate: basicValidate,
      handler: wrapHandler(transferAeAction.execute)
    }
    // Note: generateKeyPairAction and callContractAction are omitted for simplicity
    // but should be added here in the same format if needed by the agent.
  ],
  // Providers and Services can be defined here if needed, or initialized via initialize
  providers: [],
  // Can define providers directly here if they don't need runtime access on init
  services: [],
  // Can define services directly here
  evaluators: []
  // Added evaluators array
};
var index_default = aeternityPlugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AeternityWalletProvider,
  ContributionAnalyzerService,
  ContributionLevel,
  ContributionType,
  TransactionService,
  UserAddressService,
  aeternityPlugin
});
//# sourceMappingURL=index.js.map