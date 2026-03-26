/**
 * Burn Button Component
 * Handles burn token operations with backend analytics integration.
 * 
 * Issue: #615 - Integrate Burn UI with Real Factory Burn Calls and Backend Analytics Refresh
 */

import { useState, useCallback } from 'react';
import { Button } from '../UI/Button';
import { Spinner } from '../UI/Spinner';
import { validateBurnAmount, type BurnValidationParams } from '../../utils/burnValidation';
import { StellarService } from '../../services/stellar';
import { invalidateTokenCache } from '../../services/tokenInfoApi';
import type { WalletState } from '../../types';

export interface BurnButtonProps {
    /** Token contract address to burn from */
    tokenAddress: string;
    /** Connected wallet */
    wallet: WalletState;
    /** Token decimals */
    decimals: number;
    /** Current token balance */
    balance: string;
    /** Network mode */
    network: 'testnet' | 'mainnet';
    /** Callback on successful burn */
    onBurnSuccess?: (txHash: string, amount: string) => void;
    /** Callback on burn failure */
    onBurnError?: (error: Error) => void;
    /** Whether to show loading state */
    disabled?: boolean;
    /** Custom button variant */
    variant?: 'primary' | 'danger' | 'outline';
    /** Custom button size */
    size?: 'sm' | 'md' | 'lg';
}

export interface BurnResult {
    /** Transaction hash */
    txHash: string;
    /** Amount burned */
    amount: string;
    /** Whether admin burn */
    isAdminBurn: boolean;
}

/**
 * BurnButton - Submits burn transactions via factory contract and triggers analytics refresh
 * 
 * Usage:
 * ```tsx
 * <BurnButton
 *   tokenAddress="CA3D..."
 *   wallet={wallet}
 *   decimals={7}
 *   balance="1000"
 *   network="testnet"
 *   onBurnSuccess={(txHash, amount) => console.log('Burned', amount)}
 * />
 * ```
 */
export function BurnButton({
    tokenAddress,
    wallet,
    decimals,
    balance,
    network,
    onBurnSuccess,
    onBurnError,
    disabled = false,
    variant = 'danger',
    size = 'md',
}: BurnButtonProps) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const stellarService = new StellarService(network);

    /**
     * Validate burn amount before submission
     */
    const handleAmountChange = useCallback((value: string) => {
        setAmount(value);
        
        if (!wallet.address) {
            setValidationErrors({ user: 'Wallet not connected' });
            return;
        }

        const params: BurnValidationParams = {
            amount: value,
            balance,
            decimals,
            userAddress: wallet.address,
            tokenAddress,
        };

        const result = validateBurnAmount(params);
        setValidationErrors(result.errors);
    }, [wallet.address, balance, decimals, tokenAddress]);

    /**
     * Submit burn transaction via factory contract
     * - Validates the burn amount
     * - Submits transaction through Stellar network
     * - Invalidates backend cache to refresh analytics
     * - Triggers success callback with tx hash
     */
    const handleBurn = useCallback(async () => {
        if (!wallet.address) {
            setError('Wallet not connected');
            onBurnError?.(new Error('Wallet not connected'));
            return;
        }

        // Validate before submission
        const params: BurnValidationParams = {
            amount,
            balance,
            decimals,
            userAddress: wallet.address,
            tokenAddress,
        };

        const validation = validateBurnAmount(params);
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            onBurnError?.(new Error(Object.values(validation.errors).join(', ')));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Convert amount to base units (remove decimals)
            const amountInBaseUnits = (parseFloat(amount) * Math.pow(10, decimals)).toString();

            // Submit burn transaction via Stellar service
            // Note: This uses the factory contract's burn function
            const result = await stellarService.burnTokens({
                tokenAddress,
                amount: amountInBaseUnits,
                from: wallet.address,
            });

            // Invalidate backend cache to trigger analytics refresh
            // The backend should recompute burn totals and update leaderboards
            invalidateTokenCache(tokenAddress);

            // Notify success
            onBurnSuccess?.(result.txHash, amount);
            
            // Reset form
            setAmount('');
            setValidationErrors({});
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Burn failed';
            setError(errorMessage);
            onBurnError?.(err instanceof Error ? err : new Error(errorMessage));
        } finally {
            setLoading(false);
        }
    }, [wallet, amount, balance, decimals, tokenAddress, stellarService, onBurnSuccess, onBurnError]);

    const hasValidationErrors = Object.keys(validationErrors).length > 0;
    const canSubmit = !disabled && !loading && amount && !hasValidationErrors && wallet.connected;

    return (
        <div className="space-y-3">
            {/* Amount Input */}
            <div>
                <label htmlFor="burn-amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to Burn
                </label>
                <input
                    id="burn-amount"
                    type="number"
                    min="0"
                    step={`0.${'0'.repeat(decimals - 1)}1`}
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 border rounded-md ${
                        validationErrors.amount
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    disabled={disabled || loading}
                />
                {/* Balance display */}
                <div className="mt-1 text-sm text-gray-500">
                    Available: {parseFloat(balance).toLocaleString()}
                </div>
            </div>

            {/* Validation errors */}
            {validationErrors.amount && (
                <p className="text-sm text-red-600">{validationErrors.amount}</p>
            )}
            {validationErrors.user && (
                <p className="text-sm text-red-600">{validationErrors.user}</p>
            )}
            {validationErrors.token && (
                <p className="text-sm text-red-600">{validationErrors.token}</p>
            )}

            {/* General error */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Burn button */}
            <Button
                variant={variant}
                size={size}
                onClick={handleBurn}
                disabled={!canSubmit}
                className="w-full"
            >
                {loading ? (
                    <>
                        <Spinner size="sm" className="mr-2" />
                        Burning...
                    </>
                ) : !wallet.connected ? (
                    'Connect Wallet to Burn'
                ) : (
                    `Burn ${amount || '0'} Tokens`
                )}
            </Button>

            {/* Helper text */}
            <p className="text-xs text-gray-500 text-center">
                Tokens will be permanently destroyed. This action cannot be undone.
            </p>
        </div>
    );
}

export default BurnButton;