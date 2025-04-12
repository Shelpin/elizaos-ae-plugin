import { UserAddressMapping, PendingTip } from '../types';

/**
 * Service for managing Telegram username to Aeternity address mappings
 * and handling pending tips.
 */
export class UserAddressService {
  private userAddressMap: Map<string, UserAddressMapping> = new Map();
  private pendingTips: Map<string, PendingTip[]> = new Map();
  
  /**
   * Get an Aeternity address for a Telegram username
   * @param username - Telegram username (with or without @)
   * @returns The mapped address or undefined if not found
   */
  public getAddress(username: string): string | undefined {
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
  public storeAddress(username: string, address: string): boolean {
    const cleanUsername = this.cleanUsername(username);
    
    // Create or update the mapping
    this.userAddressMap.set(cleanUsername, {
      username: cleanUsername,
      address,
      updatedAt: new Date().toISOString(),
    });
    
    return true;
  }
  
  /**
   * Add a pending tip for a user
   * @param username - Telegram username (with or without @)
   * @param pendingTip - The pending tip details
   */
  public addPendingTip(username: string, pendingTip: PendingTip): void {
    const cleanUsername = this.cleanUsername(username);
    
    // Get existing pending tips or create a new array
    const existingTips = this.pendingTips.get(cleanUsername) || [];
    
    // Add the new pending tip
    existingTips.push(pendingTip);
    
    // Store updated pending tips
    this.pendingTips.set(cleanUsername, existingTips);
  }
  
  /**
   * Get pending tips for a user
   * @param username - Telegram username (with or without @)
   * @returns Array of pending tips or empty array if none
   */
  public getPendingTips(username: string): PendingTip[] {
    const cleanUsername = this.cleanUsername(username);
    return this.pendingTips.get(cleanUsername) || [];
  }
  
  /**
   * Clear pending tips for a user
   * @param username - Telegram username (with or without @)
   */
  public clearPendingTips(username: string): void {
    const cleanUsername = this.cleanUsername(username);
    this.pendingTips.delete(cleanUsername);
  }
  
  /**
   * Remove a specific pending tip for a user
   * @param username - Telegram username (with or without @)
   * @param index - Index of the pending tip to remove
   * @returns The removed pending tip or undefined
   */
  public removePendingTip(username: string, index: number): PendingTip | undefined {
    const cleanUsername = this.cleanUsername(username);
    const pendingTips = this.pendingTips.get(cleanUsername) || [];
    
    if (index < 0 || index >= pendingTips.length) {
      return undefined;
    }
    
    // Remove the tip at the specified index
    const removedTip = pendingTips.splice(index, 1)[0];
    
    // Update the stored tips (or remove the entry if empty)
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
  public hasPendingTips(username: string): boolean {
    const cleanUsername = this.cleanUsername(username);
    const pendingTips = this.pendingTips.get(cleanUsername) || [];
    return pendingTips.length > 0;
  }
  
  /**
   * Clean a username by removing @ if present and converting to lowercase
   * @param username - Telegram username (with or without @)
   * @returns Cleaned username
   */
  private cleanUsername(username: string): string {
    return username.startsWith('@') 
      ? username.substring(1).toLowerCase() 
      : username.toLowerCase();
  }
  
  /**
   * Export the current state to JSON for persistence
   * @returns JSON string representation of the current state
   */
  public exportState(): string {
    const state = {
      addressMappings: Array.from(this.userAddressMap.values()),
      pendingTips: Array.from(this.pendingTips.entries()).map(([username, tips]) => ({
        username,
        tips,
      })),
    };
    
    return JSON.stringify(state);
  }
  
  /**
   * Import state from a JSON string
   * @param jsonState - JSON string representation of the state
   * @returns True if import was successful
   */
  public importState(jsonState: string): boolean {
    try {
      const state = JSON.parse(jsonState);
      
      // Clear current state
      this.userAddressMap.clear();
      this.pendingTips.clear();
      
      // Import address mappings
      if (Array.isArray(state.addressMappings)) {
        for (const mapping of state.addressMappings) {
          if (mapping.username && mapping.address) {
            this.userAddressMap.set(mapping.username, mapping);
          }
        }
      }
      
      // Import pending tips
      if (Array.isArray(state.pendingTips)) {
        for (const entry of state.pendingTips) {
          if (entry.username && Array.isArray(entry.tips)) {
            this.pendingTips.set(entry.username, entry.tips);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }
} 