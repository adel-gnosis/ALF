'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
    page: number;
    pageSize: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [30, 50, 100];

export default function PaginationControls({
    page,
    pageSize,
    totalPages,
    total,
    hasNext,
    hasPrev,
    onPageChange,
    onPageSizeChange,
}: PaginationControlsProps) {
    // Calculate display range
    const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
    const endItem = Math.min(page * pageSize, total);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first, last, and surrounding pages
            if (page <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (page >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
            }
        }

        return pages;
    };

    if (total === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            {/* Left side - Results count */}
            <div className="text-sm text-gray-600 dark:text-slate-400">
                Showing <span className="font-semibold text-gray-900 dark:text-white">{startItem}</span> to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{endItem}</span> of{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{total}</span> results
            </div>

            {/* Center - Page Navigation */}
            <div className="flex items-center gap-1">
                {/* First page */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                >
                    <ChevronsLeft className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                </button>

                {/* Previous page */}
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!hasPrev}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                >
                    <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map((pageNum, index) => (
                        pageNum === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                                ...
                            </span>
                        ) : (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum as number)}
                                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${pageNum === page
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        )
                    ))}
                </div>

                {/* Next page */}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasNext}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                >
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                </button>

                {/* Last page */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                >
                    <ChevronsRight className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                </button>
            </div>

            {/* Right side - Page size selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-slate-400">Per page:</span>
                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                    {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
