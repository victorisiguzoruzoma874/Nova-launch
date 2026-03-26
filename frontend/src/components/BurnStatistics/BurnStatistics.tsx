/**
 * Burn Statistics Component
 * Displays leaderboard data from backend ranking APIs.
 * 
 * Issue: #616 - Connect Leaderboard Screens to Live Backend Ranking APIs
 */

import { useState, useEffect, useCallback } from 'react';
import { Card } from '../UI/Card';
import { Spinner } from '../UI/Spinner';
import { Button } from '../UI/Button';
import { truncateAddress } from '../../utils/formatting';
import {
    fetchLeaderboard,
    invalidateLeaderboardCache,
    type LeaderboardEntry,
    type LeaderboardType,
    type TimePeriod,
    normalizeNumeric,
} from '../../services/leaderboardApi';

export interface BurnStatisticsProps {
    /** Network mode */
    network: 'testnet' | 'mainnet';
    /** Default leaderboard type */
    defaultType?: LeaderboardType;
    /** Default time period */
    defaultPeriod?: TimePeriod;
    /** Number of entries to display */
    limit?: number;
    /** Whether to allow manual refresh */
    allowRefresh?: boolean;
}

/**
 * Available leaderboard tabs
 */
const LEADERBOARD_TABS: { type: LeaderboardType; label: string }[] = [
    { type: 'most-burned', label: 'Most Burned' },
    { type: 'most-active', label: 'Most Active' },
    { type: 'newest', label: 'Newest' },
    { type: 'largest-supply', label: 'Largest Supply' },
    { type: 'most-burners', label: 'Most Burners' },
];

/**
 * Available time periods
 */
const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'all', label: 'All Time' },
];

export function BurnStatistics({
    network,
    defaultType = 'most-burned',
    defaultPeriod = '7d',
    limit = 10,
    allowRefresh = true,
}: BurnStatisticsProps) {
    const [activeTab, setActiveTab] = useState<LeaderboardType>(defaultType);
    const [period, setPeriod] = useState<TimePeriod>(defaultPeriod);
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    /**
     * Fetch leaderboard data from backend API
     */
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchLeaderboard({
                type: activeTab,
                period,
                limit,
            });
            setEntries(data.entries);
            setLastUpdated(new Date(data.lastUpdated));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        } finally {
            setLoading(false);
        }
    }, [activeTab, period, limit]);

    // Fetch data when tab or period changes
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Handle manual refresh - invalidate cache and reload
     */
    const handleRefresh = useCallback(() => {
        invalidateLeaderboardCache();
        fetchData();
    }, [fetchData]);

    /**
     * Get column headers based on leaderboard type
     */
    const getColumns = (type: LeaderboardType): { key: string; label: string }[] => {
        switch (type) {
            case 'most-burned':
                return [
                    { key: 'rank', label: '#' },
                    { key: 'token', label: 'Token' },
                    { key: 'value', label: 'Total Burned' },
                    { key: 'change', label: 'Rank Change' },
                ];
            case 'most-active':
                return [
                    { key: 'rank', label: '#' },
                    { key: 'token', label: 'Token' },
                    { key: 'value', label: 'Transactions' },
                    { key: 'change', label: 'Rank Change' },
                ];
            case 'newest':
                return [
                    { key: 'rank', label: '#' },
                    { key: 'token', label: 'Token' },
                    { key: 'value', label: 'Deployed' },
                    { key: 'change', label: '-' },
                ];
            case 'largest-supply':
                return [
                    { key: 'rank', label: '#' },
                    { key: 'token', label: 'Token' },
                    { key: 'value', label: 'Total Supply' },
                    { key: 'change', label: '-' },
                ];
            case 'most-burners':
                return [
                    { key: 'rank', label: '#' },
                    { key: 'token', label: 'Token' },
                    { key: 'value', label: 'Unique Burners' },
                    { key: 'change', label: 'Rank Change' },
                ];
            default:
                return [];
        }
    };

    const columns = getColumns(activeTab);

    const explorerUrl = network === 'testnet'
        ? 'https://stellar.expert/explorer/testnet/contract/'
        : 'https://stellar.expert/explorer/public/contract/';

    return (
        <Card className="p-4">
            {/* Header with tabs */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Burn Statistics</h2>
                
                {/* Leaderboard tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {LEADERBOARD_TABS.map((tab) => (
                        <Button
                            key={tab.type}
                            variant={activeTab === tab.type ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab(tab.type)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>

                {/* Time period filter */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-600">Period:</span>
                    {TIME_PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3 py-1 text-sm rounded ${
                                period === p.value
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="text-center py-8">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button variant="outline" onClick={handleRefresh}>
                        Try Again
                    </Button>
                </div>
            )}

            {/* Data table */}
            {!loading && !error && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className="px-3 py-2 text-left text-sm font-medium text-gray-600"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr
                                    key={entry.tokenAddress}
                                    className="border-b hover:bg-gray-50"
                                >
                                    <td className="px-3 py-3 text-sm">
                                        <span
                                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                                entry.rank <= 3
                                                    ? 'bg-yellow-400 text-white'
                                                    : 'bg-gray-200 text-gray-700'
                                            }`}
                                        >
                                            {entry.rank}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {entry.tokenName}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {entry.tokenSymbol} • {truncateAddress(entry.tokenAddress)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-sm text-gray-900">
                                        {normalizeNumeric(entry.value)}
                                    </td>
                                    <td className="px-3 py-3 text-sm">
                                        {entry.rankChange !== 0 ? (
                                            <span
                                                className={`font-medium ${
                                                    entry.rankChange > 0
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                }`}
                                            >
                                                {entry.rankChange > 0 ? '+' : ''}
                                                {entry.rankChange}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {entries.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No data available for this leaderboard
                        </div>
                    )}
                </div>
            )}

            {/* Footer with refresh and last updated */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                {lastUpdated && (
                    <span>
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
                {allowRefresh && (
                    <button
                        onClick={handleRefresh}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        🔄 Refresh
                    </button>
                )}
            </div>
        </Card>
    );
}

export default BurnStatistics;