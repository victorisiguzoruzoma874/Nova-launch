import { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Spinner } from '../UI/Spinner';
import { truncateAddress } from '../../utils/formatting';
import type { TokenInfo } from '../../types';
import { fetchTokenDetail, type TokenDetail, invalidateTokenCache } from '../../services/tokenInfoApi';

interface TokenCardProps {
    token: TokenInfo;
    network: 'testnet' | 'mainnet';
    /** Whether to fetch enriched data from backend */
    fetchEnrichedData?: boolean;
    /** Callback when token detail is loaded */
    onDetailLoaded?: (detail: TokenDetail | null) => void;
}

export function TokenCard({ token, network, fetchEnrichedData = true, onDetailLoaded }: TokenCardProps) {
    const [copied, setCopied] = useState(false);
    const [enrichedData, setEnrichedData] = useState<TokenDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch enriched token data from backend
    useEffect(() => {
        if (!fetchEnrichedData) return;

        let mounted = true;
        setLoading(true);
        setError(null);

        fetchTokenDetail(token.address, {
            includeMetadata: true,
            includeAnalytics: true,
            includeBurnHistory: false,
        })
            .then((detail) => {
                if (mounted) {
                    setEnrichedData(detail);
                    onDetailLoaded?.(detail);
                }
            })
            .catch((err) => {
                if (mounted) {
                    setError(err.message);
                    onDetailLoaded?.(null);
                }
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [token.address, fetchEnrichedData, onDetailLoaded]);

    // Handle manual refresh - invalidate cache and reload
    const handleRefresh = async () => {
        invalidateTokenCache(token.address);
        setLoading(true);
        setError(null);

        try {
            const detail = await fetchTokenDetail(token.address, {
                includeMetadata: true,
                includeAnalytics: true,
                includeBurnHistory: false,
            });
            setEnrichedData(detail);
            onDetailLoaded?.(detail);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    };

    const explorerUrl = network === 'testnet'
        ? `https://stellar.expert/explorer/testnet/contract/${token.address}`
        : `https://stellar.expert/explorer/public/contract/${token.address}`;

    const txUrl = network === 'testnet'
        ? `https://stellar.expert/explorer/testnet/tx/${token.transactionHash}`
        : `https://stellar.expert/explorer/public/tx/${token.transactionHash}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(token.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const deployDate = new Date(token.deployedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    // Use enriched metadata if available, otherwise fall back to token data
    const displayName = enrichedData?.metadata?.name || token.name;
    const displaySymbol = enrichedData?.metadata?.name ? token.symbol : token.symbol;
    const displayImage = enrichedData?.metadata?.image || token.metadataUri;

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <div className="space-y-4">
                {loading && (
                    <div className="flex justify-center py-4">
                        <Spinner size="sm" />
                    </div>
                )}

                {displayImage && (
                    <img
                        src={displayImage}
                        alt={displayName}
                        className="w-full h-32 object-cover rounded-md"
                    />
                )}

                <div>
                    <h3 className="text-xl font-bold text-gray-900">{displayName}</h3>
                    <p className="text-sm text-gray-500">{displaySymbol}</p>
                </div>

                {/* Enriched data from backend - burn stats */}
                {enrichedData && (
                    <div className="bg-blue-50 rounded-md p-3 space-y-2">
                        <div className="text-sm font-medium text-blue-900">Burn Statistics</div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Burned:</span>
                            <span className="text-gray-900 font-medium">
                                {enrichedData.totalBurned ? parseFloat(enrichedData.totalBurned).toLocaleString() : '0'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Burn Count:</span>
                            <span className="text-gray-900 font-medium">{enrichedData.burnCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Unique Burners:</span>
                            <span className="text-gray-900 font-medium">{enrichedData.burnerCount}</span>
                        </div>
                        {enrichedData.analytics && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">24h Volume:</span>
                                    <span className="text-gray-900 font-medium">
                                        {enrichedData.analytics.dailyBurnVolume ? parseFloat(enrichedData.analytics.dailyBurnVolume).toLocaleString() : '0'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Trend:</span>
                                    <span className={`font-medium ${enrichedData.analytics.burnTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {enrichedData.analytics.burnTrend >= 0 ? '+' : ''}{enrichedData.analytics.burnTrend}%
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                        <button 
                            onClick={handleRefresh}
                            className="ml-2 underline hover:no-underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">Address:</span>
                        <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {truncateAddress(token.address)}
                            </code>
                            <button
                                onClick={handleCopy}
                                className="text-blue-600 hover:text-blue-700"
                                title="Copy address"
                            >
                                {copied ? '✓' : '📋'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">Deployed:</span>
                        <span className="text-gray-900">{deployDate}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(explorerUrl, '_blank')}
                    >
                        View Token
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(txUrl, '_blank')}
                    >
                        View TX
                    </Button>
                </div>
            </div>
        </Card>
    );
}
