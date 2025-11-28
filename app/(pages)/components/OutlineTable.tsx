'use client';
import { useState } from 'react';

type Outline = {
  id: string;
  header: string;
  sectionType: string;
  status: string;
  reviewer: string;
  target?: number | null;
  limit?: number | null;
};

type OutlineTableProps = {
  outlines: Outline[];
  orgId: string;
  onRefresh: () => void;
};

export default function OutlineTable({ outlines = [], orgId, onRefresh }: OutlineTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Outline>>({});

  async function deleteOutline(id: string) {
    if (!confirm('Are you sure you want to delete this outline?')) return;
    const res = await fetch(`/api/outlines/${id}`, { method: 'DELETE' });
    if (res.ok) {
      onRefresh();
    } else {
      alert('Failed to delete outline');
    }
  }

  function startEdit(outline: Outline) {
    setEditingId(outline.id);
    setEditForm({
      header: outline.header,
      sectionType: outline.sectionType,
      status: outline.status,
      reviewer: outline.reviewer,
      target: outline.target,
      limit: outline.limit,
    });
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/outlines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditingId(null);
      onRefresh();
    } else {
      alert('Failed to update outline');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Header</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reviewer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limit</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {outlines.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                No outlines found. Create one to get started.
              </td>
            </tr>
          ) : (
            outlines.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                {editingId === o.id ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={editForm.header || ''}
                        onChange={(e) => setEditForm({ ...editForm, header: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={editForm.sectionType || ''}
                        onChange={(e) => setEditForm({ ...editForm, sectionType: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="Table_of_Contents">Table of Contents</option>
                        <option value="Executive_Summary">Executive Summary</option>
                        <option value="Technical_Approach">Technical Approach</option>
                        <option value="Design">Design</option>
                        <option value="Capabilities">Capabilities</option>
                        <option value="Focus_Document">Focus Document</option>
                        <option value="Narrative">Narrative</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={editForm.status || ''}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In_Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={editForm.reviewer || ''}
                        onChange={(e) => setEditForm({ ...editForm, reviewer: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="Assim">Assim</option>
                        <option value="Bini">Bini</option>
                        <option value="Mami">Mami</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={editForm.target ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, target: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={editForm.limit ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, limit: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => saveEdit(o.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{o.header}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.sectionType.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.status.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.reviewer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.target ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.limit ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => startEdit(o)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteOutline(o.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    );
  }
  