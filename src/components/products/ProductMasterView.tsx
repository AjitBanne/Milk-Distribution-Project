import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Boxes,
  CheckCircle2,
  X,
  Search,
  AlertCircle,
  Sun,
  CloudRain,
} from 'lucide-react';
import { Product, ProductUnit } from '../../types/dairy';
import { useDairyData } from '../../context/DairyDataContext';
import { useAuth } from '../../context/AuthContext';

const UNITS: ProductUnit[] = [
  'Packet',
  'Nos',
  'Bottle',
  'Cup',
  'Kilogram',
  'Gram',
  'Litre',
  'Millilitre',
  'Crate',
];

interface ProductMasterViewProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const ProductMasterView: React.FC<ProductMasterViewProps> = ({
  onSuccessToast,
  onErrorToast,
}) => {
  const { products, saveProduct, stockMap } = useDairyData();
  const { canEditMasters } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    unit: ProductUnit;
    displaySequence: number;
    isActive: boolean;
  }>({
    name: '',
    unit: 'Packet',
    displaySequence: 1,
    isActive: true,
  });

  const openAddModal = () => {
    setFormData({
      name: '',
      unit: 'Packet',
      displaySequence: products.length + 1,
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      unit: p.unit,
      displaySequence: p.displaySequence,
      isActive: p.isActive,
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onErrorToast('Product name is required.');
      return;
    }

    if (editingProduct) {
      const res = saveProduct({
        ...editingProduct,
        name: formData.name.trim(),
        unit: formData.unit,
        displaySequence: Number(formData.displaySequence) || 1,
        isActive: formData.isActive,
      });

      if (res.success) {
        onSuccessToast(`Product "${formData.name}" updated successfully.`);
        setEditingProduct(null);
      } else {
        onErrorToast(res.error || 'Failed to update product.');
      }
    } else {
      const newProd: Product = {
        id: `p_${Date.now()}`,
        entityId: 'current',
        name: formData.name.trim(),
        unit: formData.unit,
        displaySequence: Number(formData.displaySequence) || products.length + 1,
        isActive: formData.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = saveProduct(newProd);
      if (res.success) {
        onSuccessToast(`Product "${formData.name}" added to master catalogue!`);
        setIsAddModalOpen(false);
      } else {
        onErrorToast(res.error || 'Failed to save product.');
      }
    }
  };

  const handleToggleActive = (p: Product) => {
    const res = saveProduct({ ...p, isActive: !p.isActive });
    if (res.success) {
      onSuccessToast(`Product "${p.name}" marked as ${!p.isActive ? 'Active' : 'Inactive (Seasonal)'}.`);
    } else {
      onErrorToast(res.error || 'Failed to update product status.');
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Product SKU Master
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Maintain dairy catalog, packaging units, and seasonal active/inactive switches
              </p>
            </div>
          </div>
        </div>

        {canEditMasters && (
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Seasonal & Usage Note */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-950">
        <Sun className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Seasonal Product Guidance:</strong> Seasonal dairy items (such as Sweet Lassi, Spiced Buttermilk, or Shrikhand) can be toggled to <em>Inactive</em> during off-seasons. This safely removes them from daily route dispatch forms without deleting past transaction records or ledger history.
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search products by SKU name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold select-none">
            <tr>
              <th className="py-3 px-3 text-center">Order</th>
              <th className="py-3 px-4">Product Name</th>
              <th className="py-3 px-4">Packaging Unit</th>
              <th className="py-3 px-4 text-right">Current Physical Stock</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((p) => {
              const currentStock = stockMap[p.id] || 0;
              return (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                    {p.displaySequence}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {p.name}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-800">
                      {p.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                    <span className={currentStock <= 10 ? 'text-amber-700' : 'text-slate-900'}>
                      {currentStock} {p.unit}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        p.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.isActive ? 'Active (Live)' : 'Inactive (Off-Season)'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canEditMasters && (
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canEditMasters && (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                            p.isActive
                              ? 'text-amber-700 hover:bg-amber-50 border border-amber-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {p.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProduct ? 'Edit Dairy Product' : 'Add New Dairy Product'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Product Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Buffalo Milk 1 Litre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Packaging Unit <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as ProductUnit })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Display Sequence Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.displaySequence}
                  onChange={(e) =>
                    setFormData({ ...formData, displaySequence: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prodActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
                <label htmlFor="prodActive" className="font-semibold text-slate-700">
                  Active in Daily Route &amp; Purchase Forms
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
