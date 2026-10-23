import React, { useState, useRef } from 'react';
import {
  InsuranceClaim,
  InsuranceType,
  PolicyStatus,
} from '../types/trustmesh';
import {
  Database,
  Plus,
  Upload,
  Download,
  RotateCcw,
  Sparkles,
  Search,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatINR, formatDate } from '../utils/crypto';

interface DatasetLabViewProps {
  claims: InsuranceClaim[];
  activeClaim: InsuranceClaim;
  onSelectClaim: (claim: InsuranceClaim) => void;
  onAddClaim: (claim: InsuranceClaim) => void;
  onUpdateClaim: (claim: InsuranceClaim) => void;
  onDeleteClaim: (claimId: string) => void;
  onResetClaims: () => void;
  onGenerateRandomClaim: () => void;
  onGenerateScenarioFromClaim: (claim: InsuranceClaim) => void;
}

export const DatasetLabView: React.FC<DatasetLabViewProps> = ({
  claims,
  activeClaim,
  onSelectClaim,
  onAddClaim,
  onUpdateClaim,
  onDeleteClaim,
  onResetClaims,
  onGenerateRandomClaim,
  onGenerateScenarioFromClaim,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [editingClaim, setEditingClaim] = useState<InsuranceClaim | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Add Claim
  const [formData, setFormData] = useState<Partial<InsuranceClaim>>({
    claim_id: `CLM-2026-${String(claims.length + 1).padStart(3, '0')}`,
    customer_name: '',
    policy_number: `POL-${Math.floor(10000 + Math.random() * 90000)}`,
    insurance_type: 'Motor Insurance',
    vehicle_number: 'MH31XY9988',
    incident_date: '2026-10-15',
    claim_submission_date: '2026-10-18',
    reported_damage: '',
    estimated_repair_cost: 50000,
    policy_coverage_limit: 200000,
    policy_status: 'Active',
    deductible: 5000,
    previous_related_claims: 0,
    original_claim_amount: 50000,
    expected_eligible_amount: 45000,
    initial_claim_status: 'Under Review',
    location: 'Mumbai, Maharashtra',
  });

  const filteredClaims = claims.filter(c => {
    if (typeFilter !== 'all' && c.insurance_type !== typeFilter) return false;
    if (statusFilter !== 'all' && c.policy_status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        c.claim_id.toLowerCase().includes(q) ||
        c.customer_name.toLowerCase().includes(q) ||
        c.policy_number.toLowerCase().includes(q) ||
        (c.vehicle_number && c.vehicle_number.toLowerCase().includes(q)) ||
        c.reported_damage.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'claim_id',
      'customer_name',
      'policy_number',
      'insurance_type',
      'vehicle_number',
      'incident_date',
      'claim_submission_date',
      'reported_damage',
      'estimated_repair_cost',
      'policy_coverage_limit',
      'policy_status',
      'deductible',
      'previous_related_claims',
      'original_claim_amount',
      'expected_eligible_amount',
      'initial_claim_status',
      'location',
    ];

    const rows = claims.map(c => [
      c.claim_id,
      `"${c.customer_name.replace(/"/g, '""')}"`,
      c.policy_number,
      c.insurance_type,
      c.vehicle_number || '',
      c.incident_date,
      c.claim_submission_date,
      `"${(c.reported_damage || '').replace(/"/g, '""')}"`,
      c.estimated_repair_cost,
      c.policy_coverage_limit,
      c.policy_status,
      c.deductible,
      c.previous_related_claims,
      c.original_claim_amount,
      c.expected_eligible_amount,
      c.initial_claim_status,
      `"${(c.location || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trustmesh_insurance_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Sample Template CSV
  const handleDownloadSampleCSV = () => {
    const sampleHeaders = [
      'claim_id',
      'customer_name',
      'policy_number',
      'insurance_type',
      'vehicle_number',
      'incident_date',
      'claim_submission_date',
      'reported_damage',
      'estimated_repair_cost',
      'policy_coverage_limit',
      'policy_status',
      'deductible',
      'previous_related_claims',
      'original_claim_amount',
      'expected_eligible_amount',
      'initial_claim_status',
      'location',
    ];

    const sampleRow = [
      'CLM-2026-999',
      'Siddharth Roy',
      'POL-99120',
      'Motor Insurance',
      'MH12AA5566',
      '2026-10-15',
      '2026-10-18',
      'Windshield crack and wiper damage',
      '25000',
      '150000',
      'Active',
      '2500',
      '0',
      '25000',
      '22500',
      'Under Review',
      'Pune, Maharashtra',
    ];

    const content = [sampleHeaders.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trustmesh_sample_claims_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import with row-level validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportSuccessCount(null);

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setImportErrors(['CSV file is empty or missing data rows.']);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const requiredColumns = ['claim_id', 'customer_name', 'policy_number', 'original_claim_amount'];
      const missingRequired = requiredColumns.filter(c => !headers.includes(c));

      if (missingRequired.length > 0) {
        setImportErrors([`Missing required CSV column headers: ${missingRequired.join(', ')}`]);
        return;
      }

      const errors: string[] = [];
      const newClaims: InsuranceClaim[] = [];
      const seenIds = new Set(claims.map(c => c.claim_id));

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        // Split by comma ignoring commas inside quotes
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^"|"$/g, ''));

        const getVal = (colName: string) => {
          const idx = headers.indexOf(colName);
          return idx >= 0 ? cols[idx] : undefined;
        };

        const claimId = getVal('claim_id');
        const customerName = getVal('customer_name');
        const policyNumber = getVal('policy_number');
        const originalAmountStr = getVal('original_claim_amount');
        const incidentDate = getVal('incident_date') || '2026-10-01';

        // Validations
        if (!claimId) {
          errors.push(`Row ${i + 1}: Missing claim_id.`);
          continue;
        }
        if (seenIds.has(claimId)) {
          errors.push(`Row ${i + 1}: Duplicate claim_id '${claimId}' already exists.`);
          continue;
        }
        seenIds.add(claimId);

        if (!customerName) {
          errors.push(`Row ${i + 1}: Missing customer_name for claim ${claimId}.`);
          continue;
        }

        const amount = Number(originalAmountStr);
        if (isNaN(amount) || amount <= 0) {
          errors.push(`Row ${i + 1} (${claimId}): Invalid original_claim_amount "${originalAmountStr}". Must be positive number.`);
          continue;
        }

        if (isNaN(Date.parse(incidentDate))) {
          errors.push(`Row ${i + 1} (${claimId}): Malformed incident_date "${incidentDate}".`);
          continue;
        }

        const limit = Number(getVal('policy_coverage_limit') || 100000);
        const deductible = Number(getVal('deductible') || 5000);
        const repairCost = Number(getVal('estimated_repair_cost') || amount);
        const eligible = Math.min(limit, Math.max(0, repairCost - deductible));

        newClaims.push({
          claim_id: claimId,
          customer_name: customerName,
          policy_number: policyNumber || `POL-${Math.floor(10000 + Math.random() * 90000)}`,
          insurance_type: (getVal('insurance_type') as InsuranceType) || 'Motor Insurance',
          vehicle_number: getVal('vehicle_number') || 'N/A',
          incident_date: incidentDate,
          claim_submission_date: getVal('claim_submission_date') || new Date().toISOString().split('T')[0],
          reported_damage: getVal('reported_damage') || 'General property damage',
          estimated_repair_cost: repairCost,
          policy_coverage_limit: limit,
          policy_status: (getVal('policy_status') as PolicyStatus) || 'Active',
          deductible,
          previous_related_claims: Number(getVal('previous_related_claims') || 0),
          original_claim_amount: amount,
          expected_eligible_amount: eligible,
          initial_claim_status: 'Under Review',
          location: getVal('location') || 'India',
        });
      }

      setImportErrors(errors);
      if (newClaims.length > 0) {
        newClaims.forEach(c => onAddClaim(c));
        setImportSuccessCount(newClaims.length);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClaim) {
      onUpdateClaim(editingClaim);
      setEditingClaim(null);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.claim_id || !formData.customer_name || !formData.policy_number) return;

    const repair = Number(formData.estimated_repair_cost || formData.original_claim_amount || 0);
    const limit = Number(formData.policy_coverage_limit || 100000);
    const ded = Number(formData.deductible || 5000);
    const eligible = Math.min(limit, Math.max(0, repair - ded));

    const newClaim: InsuranceClaim = {
      claim_id: formData.claim_id,
      customer_name: formData.customer_name,
      customer_id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      policy_number: formData.policy_number,
      insurance_type: (formData.insurance_type as InsuranceType) || 'Motor Insurance',
      vehicle_number: formData.vehicle_number,
      incident_date: formData.incident_date || '2026-10-15',
      claim_submission_date: formData.claim_submission_date || '2026-10-18',
      reported_damage: formData.reported_damage || 'Front bumper impact',
      estimated_repair_cost: repair,
      policy_coverage_limit: limit,
      policy_status: (formData.policy_status as PolicyStatus) || 'Active',
      deductible: ded,
      previous_related_claims: Number(formData.previous_related_claims || 0),
      original_claim_amount: Number(formData.original_claim_amount || repair),
      expected_eligible_amount: eligible,
      initial_claim_status: 'Under Review',
      location: formData.location || 'India',
    };

    onAddClaim(newClaim);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              Insurance Dataset Management Lab
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage synthetic policy claims, import/export CSV datasets with schema validation, or procedure-test records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleDownloadSampleCSV}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Download CSV Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>Sample Template</span>
            </button>

            <button
              onClick={onGenerateRandomClaim}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-950/70 hover:bg-blue-900/70 border border-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Random Claim</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Claim</span>
            </button>

            <button
              onClick={onResetClaims}
              title="Reset dataset to original 32 synthetic records"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Dataset</span>
            </button>
          </div>
        </div>

        {/* CSV Import Feedback Messages */}
        {importErrors.length > 0 && (
          <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-200">
            <div className="font-bold flex items-center gap-1.5 text-rose-300 mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              CSV Import Validation Warnings ({importErrors.length} issues detected):
            </div>
            <ul className="list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto font-mono text-[11px]">
              {importErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {importSuccessCount !== null && (
          <div className="mt-3 p-2.5 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>
              Successfully imported and validated <strong>{importSuccessCount}</strong> new insurance claim records.
            </span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-slate-400">
              <span>Type:</span>
              <select
                aria-label="Filter Type"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="all">All Insurance Types</option>
                <option value="Motor Insurance">Motor Insurance</option>
                <option value="Commercial Property">Commercial Property</option>
                <option value="Health Insurance">Health Insurance</option>
                <option value="Homeowners Insurance">Homeowners Insurance</option>
                <option value="Marine Cargo">Marine Cargo</option>
                <option value="Travel Insurance">Travel Insurance</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <span>Status:</span>
              <select
                aria-label="Filter Status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="all">All Policy Statuses</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Suspended">Suspended</option>
                <option value="Pending Renewal">Pending Renewal</option>
              </select>
            </div>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, customer, policy, vehicle..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Claims Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            Available Insurance Claim Records ({filteredClaims.length} of {claims.length})
          </span>
          <span className="text-slate-400">
            Active Simulator Target: <strong className="text-blue-400 font-mono">{activeClaim.claim_id}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Claim ID</th>
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Policy No.</th>
                <th className="py-2.5 px-4 text-right">Claim Amount</th>
                <th className="py-2.5 px-4 text-right">Coverage Limit</th>
                <th className="py-2.5 px-4 text-right">Deductible</th>
                <th className="py-2.5 px-4 text-right">Expected Eligible</th>
                <th className="py-2.5 px-4">Policy Status</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredClaims.map(claimItem => {
                const isActive = claimItem.claim_id === activeClaim.claim_id;

                return (
                  <tr
                    key={claimItem.claim_id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isActive ? 'bg-blue-950/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        <span>{claimItem.claim_id}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-white font-sans font-medium">
                      {claimItem.customer_name}
                    </td>

                    <td className="py-2.5 px-4 text-slate-400 font-sans">
                      {claimItem.insurance_type}
                    </td>

                    <td className="py-2.5 px-4 text-slate-300">
                      {claimItem.policy_number}
                    </td>

                    <td className="py-2.5 px-4 text-right text-slate-200 font-medium tabular-nums">
                      {formatINR(claimItem.original_claim_amount)}
                    </td>

                    <td className="py-2.5 px-4 text-right text-slate-300 tabular-nums">
                      {formatINR(claimItem.policy_coverage_limit)}
                    </td>

                    <td className="py-2.5 px-4 text-right text-slate-400 tabular-nums">
                      {formatINR(claimItem.deductible)}
                    </td>

                    <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold tabular-nums">
                      {formatINR(claimItem.expected_eligible_amount)}
                    </td>

                    <td className="py-2.5 px-4 font-sans">
                      <span
                        className={`text-xs ${
                          claimItem.policy_status === 'Active'
                            ? 'text-emerald-400 font-semibold'
                            : 'text-amber-400'
                        }`}
                      >
                        {claimItem.policy_status}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectClaim(claimItem)}
                          className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                          title="Select for pipeline simulation"
                        >
                          {isActive ? 'Active' : 'Select'}
                        </button>

                        <button
                          onClick={() => onGenerateScenarioFromClaim(claimItem)}
                          className="p-1 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded transition-colors"
                          title="Generate error scenario from this claim"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setEditingClaim(claimItem)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          title="Edit claim details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(claimItem.claim_id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Delete claim"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl text-xs">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Confirm Claim Deletion
            </h3>
            <p className="text-slate-400 mb-4">
              Are you sure you want to delete claim <strong>{deleteConfirmId}</strong>? This action will remove it from the active simulation pool.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteClaim(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Claim Modal */}
      {editingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-blue-400" />
              Edit Insurance Claim ({editingClaim.claim_id})
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Modify values in the master record and observe downstream verification effects in the pipeline.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editingClaim.customer_name}
                  onChange={e => setEditingClaim({ ...editingClaim, customer_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Policy Number</label>
                  <input
                    type="text"
                    required
                    value={editingClaim.policy_number}
                    onChange={e => setEditingClaim({ ...editingClaim, policy_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Policy Status</label>
                  <select
                    value={editingClaim.policy_status}
                    onChange={e => setEditingClaim({ ...editingClaim, policy_status: e.target.value as PolicyStatus })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending Renewal">Pending Renewal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Original Claim Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingClaim.original_claim_amount}
                    onChange={e => {
                      const val = Number(e.target.value);
                      const eligible = Math.min(
                        editingClaim.policy_coverage_limit,
                        Math.max(0, val - editingClaim.deductible)
                      );
                      setEditingClaim({
                        ...editingClaim,
                        original_claim_amount: val,
                        estimated_repair_cost: val,
                        expected_eligible_amount: eligible,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Coverage Limit (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingClaim.policy_coverage_limit}
                    onChange={e => {
                      const val = Number(e.target.value);
                      const eligible = Math.min(
                        val,
                        Math.max(0, editingClaim.original_claim_amount - editingClaim.deductible)
                      );
                      setEditingClaim({
                        ...editingClaim,
                        policy_coverage_limit: val,
                        expected_eligible_amount: eligible,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Deductible (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingClaim.deductible}
                    onChange={e => {
                      const val = Number(e.target.value);
                      const eligible = Math.min(
                        editingClaim.policy_coverage_limit,
                        Math.max(0, editingClaim.original_claim_amount - val)
                      );
                      setEditingClaim({
                        ...editingClaim,
                        deductible: val,
                        expected_eligible_amount: eligible,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Expected Eligible Payout (₹)</label>
                  <input
                    type="number"
                    readOnly
                    value={editingClaim.expected_eligible_amount}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-emerald-400 font-mono font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reported Damage Description</label>
                <textarea
                  rows={2}
                  value={editingClaim.reported_damage}
                  onChange={e => setEditingClaim({ ...editingClaim, reported_damage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClaim(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Claim Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Add Synthetic Insurance Claim
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a new realistic test claim scenario to the TrustMesh evaluation dataset.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Claim ID</label>
                  <input
                    type="text"
                    required
                    value={formData.claim_id}
                    onChange={e => setFormData({ ...formData, claim_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Insurance Type</label>
                  <select
                    value={formData.insurance_type}
                    onChange={e => setFormData({ ...formData, insurance_type: e.target.value as InsuranceType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Motor Insurance">Motor Insurance</option>
                    <option value="Commercial Property">Commercial Property</option>
                    <option value="Health Insurance">Health Insurance</option>
                    <option value="Homeowners Insurance">Homeowners Insurance</option>
                    <option value="Marine Cargo">Marine Cargo</option>
                    <option value="Travel Insurance">Travel Insurance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Alok Nath Gupta"
                  value={formData.customer_name}
                  onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Policy Number</label>
                  <input
                    type="text"
                    required
                    value={formData.policy_number}
                    onChange={e => setFormData({ ...formData, policy_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Policy Status</label>
                  <select
                    value={formData.policy_status}
                    onChange={e => setFormData({ ...formData, policy_status: e.target.value as PolicyStatus })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Claim Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.original_claim_amount}
                    onChange={e => setFormData({ ...formData, original_claim_amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Coverage Limit (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.policy_coverage_limit}
                    onChange={e => setFormData({ ...formData, policy_coverage_limit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Deductible (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.deductible}
                    onChange={e => setFormData({ ...formData, deductible: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Reported Damage</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Side mirror broken and front wing scratched"
                  value={formData.reported_damage}
                  onChange={e => setFormData({ ...formData, reported_damage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
                >
                  Create Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
