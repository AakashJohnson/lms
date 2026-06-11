import { Filter, Calendar, Download, RefreshCw, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
  showProgramFilter?: boolean;
  showBatchFilter?: boolean;
  showCourseFilter?: boolean;
  showExport?: boolean;
}

export interface FilterState {
  timeRange: string;
  programme?: string;
  batch?: string;
  course?: string;
  customStartDate?: string;
  customEndDate?: string;
}

export function FilterBar({
  onFilterChange,
  showProgramFilter = false,
  showBatchFilter = false,
  showCourseFilter = false,
  showExport = true,
}: FilterBarProps) {
  const [filters, setFilters] = useState<FilterState>({
    timeRange: '30d',
    programme: 'all',
    batch: 'all',
    course: 'all',
  });

  const [showCustomDate, setShowCustomDate] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (key === 'timeRange' && value === 'custom') {
      setShowCustomDate(true);
    } else if (key === 'timeRange') {
      setShowCustomDate(false);
    }
    onFilterChange?.(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      timeRange: '30d',
      programme: 'all',
      batch: 'all',
      course: 'all',
    };
    setFilters(resetFilters);
    setShowCustomDate(false);
    onFilterChange?.(resetFilters);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div 
        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-2xl transition-all"
      >
        <Filter className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <ChevronDown 
          className={`w-5 h-5 text-gray-600 ml-auto transition-transform duration-300 ${
            isFiltersOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isFiltersOpen && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-4">
            {/* Time Range Filter */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-2">Time Period</label>
              <select
                value={filters.timeRange}
                onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="6m">Last 6 Months</option>
                <option value="1y">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Programme Filter */}
            {showProgramFilter && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Programme</label>
                <select
                  value={filters.programme}
                  onChange={(e) => handleFilterChange('programme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="all">All Programmes</option>
                  <option value="management">Cooperative Management</option>
                  <option value="marketing">Digital Marketing</option>
                  <option value="finance">Financial Literacy</option>
                  <option value="legal">Legal Compliance</option>
                </select>
              </div>
            )}

            {/* Batch Filter */}
            {showBatchFilter && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Batch</label>
                <select
                  value={filters.batch}
                  onChange={(e) => handleFilterChange('batch', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="all">All Batches</option>
                  <option value="batch-a">Batch A - 2026</option>
                  <option value="batch-b">Batch B - 2026</option>
                  <option value="batch-c">Batch C - 2025</option>
                </select>
              </div>
            )}

            {/* Course Filter */}
            {showCourseFilter && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={filters.course}
                  onChange={(e) => handleFilterChange('course', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="all">All Courses</option>
                  <option value="coop-mgmt">Cooperative Management</option>
                  <option value="digital-mkt">Digital Marketing</option>
                  <option value="finance">Financial Literacy</option>
                  <option value="legal">Legal Compliance</option>
                </select>
              </div>
            )}

        {/* Custom Date Range */}
        {showCustomDate && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.customStartDate || ''}
                onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.customEndDate || ''}
                onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </>
        )}
      </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
            {showExport && (
              <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-all ml-auto">
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {(filters.timeRange !== '30d' || filters.programme !== 'all' || filters.batch !== 'all' || filters.course !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {filters.timeRange !== '30d' && (
                  <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                    <Calendar className="w-3 h-3" />
                    {filters.timeRange === '7d' ? 'Last 7 Days' :
                     filters.timeRange === '90d' ? 'Last 90 Days' :
                     filters.timeRange === '6m' ? 'Last 6 Months' :
                     filters.timeRange === '1y' ? 'This Year' :
                     filters.timeRange === 'all' ? 'All Time' :
                     'Custom Range'}
                  </span>
                )}
                {filters.programme !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                    Programme: {filters.programme}
                  </span>
                )}
                {filters.batch !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    Batch: {filters.batch}
                  </span>
                )}
                {filters.course !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                    Course: {filters.course}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}