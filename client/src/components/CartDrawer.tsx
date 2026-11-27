
import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Users, Minus, Plus, Heart, ShoppingCart } from 'lucide-react';
import { CartItem, WishlistItem } from '../types';
import { useT } from '../i18n';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  wishlistItems?: WishlistItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onMoveToCart?: (item: WishlistItem) => void;
  onRemoveFromWishlist?: (id: string) => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  wishlistItems = [],
  onRemove, 
  onUpdateQty,
  onMoveToCart = (_: WishlistItem) => {},
  onRemoveFromWishlist = (_: string) => {}
}) => {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'CART' | 'WISHLIST'>('CART');

  // Calculate Totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  // B2B Logic: Diskon Grosir jika beli > 5 (Untuk Koperasi)
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  const isBulkOrder = totalQty >= 5;
  const discountRate = isBulkOrder ? 0.10 : 0; // 10% discount for bulk
  const discountAmount = subtotal * discountRate;
  const totalAmount = subtotal - discountAmount;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-950">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingBag size={20} className="text-digitalcoop-600" />
              {t('shop.cartWishlist')}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition">
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-800">
            <button 
              onClick={() => setActiveTab('CART')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'CART' ? 'border-digitalcoop-600 text-digitalcoop-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'}`}
            >
              {t('shop.tabCart', { n: items.length })}
            </button>
            <button 
              onClick={() => setActiveTab('WISHLIST')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'WISHLIST' ? 'border-digitalcoop-600 text-digitalcoop-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-200'}`}
            >
              {t('shop.tabWishlist', { n: wishlistItems.length })}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'CART' && (
              <div className="space-y-6">
                {items.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                     {t('shop.cartEmpty')}
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.courseId} className="flex gap-4 group">
                      <div className="relative">
                        <img src={item.thumbnail} alt={item.title} className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                        {item.qty > 1 && (
                          <div className="absolute -top-2 -right-2 bg-digitalcoop-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                            x{item.qty}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2">{item.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 mb-2">{item.type}</p>
                        
                        <div className="flex justify-between items-end">
                          <span className="font-bold text-digitalcoop-600 dark:text-digitalcoop-400 text-sm">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price * item.qty)}
                          </span>
                          
                          {/* Quantity Controls (B2B Feature) */}
                          <div className="flex items-center gap-3 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                             <button 
                                onClick={() => onUpdateQty(item.courseId, -1)}
                                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition text-gray-600 dark:text-slate-300"
                             >
                                <Minus size={14} />
                             </button>
                             <span className="text-xs font-bold w-4 text-center dark:text-white">{item.qty}</span>
                             <button 
                                onClick={() => onUpdateQty(item.courseId, 1)}
                                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition text-gray-600 dark:text-slate-300"
                             >
                                <Plus size={14} />
                             </button>
                          </div>
                        </div>
                      </div>
                      
                      <button onClick={() => onRemove(item.courseId)} className="text-gray-300 hover:text-red-500 self-start p-1 transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
                
                {/* B2B Promo Banner */}
                {items.length > 0 && (
                   <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
                      <Users className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                         <p className="text-xs font-bold text-blue-800 dark:text-blue-300">{t('shop.coopPkgTitle')}</p>
                         <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                            {t('shop.coopDesc1')}<strong>{t('shop.coopItems')}</strong>{t('shop.coopDesc2')}
                         </p>
                      </div>
                   </div>
                )}
              </div>
            )}

            {activeTab === 'WISHLIST' && (
              <div className="space-y-6">
                 {wishlistItems.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center text-gray-500 dark:text-slate-400">
                       <Heart size={48} className="mb-4 text-gray-300" />
                       <p>{t('shop.wishlistEmpty')}</p>
                       <p className="text-xs mt-2">{t('shop.wishlistHint')}</p>
                    </div>
                 ) : (
                    wishlistItems.map(item => (
                       <div key={item.courseId} className="flex gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 last:border-0">
                          <img src={item.thumbnail} alt={item.title} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                          <div className="flex-1">
                             <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{item.title}</h4>
                             <p className="text-xs text-gray-500 mt-1 mb-2">{t('shop.savedOn', { date: item.addedAt })}</p>
                             <div className="flex items-center justify-between">
                                <span className="font-bold text-digitalcoop-600 dark:text-digitalcoop-400 text-sm">
                                   {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}
                                </span>
                                <div className="flex gap-2">
                                   <button 
                                      onClick={() => onRemoveFromWishlist(item.courseId)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                      title={t('common.delete')}
                                   >
                                      <Trash2 size={16} />
                                   </button>
                                   <button 
                                      onClick={() => onMoveToCart(item)}
                                      className="p-1.5 bg-digitalcoop-600 text-white rounded hover:bg-digitalcoop-700 transition shadow-sm"
                                      title={t('shop.moveToCart')}
                                   >
                                      <ShoppingCart size={16} />
                                   </button>
                                </div>
                             </div>
                          </div>
                       </div>
                    ))
                 )}
              </div>
            )}
          </div>

          {/* Footer (Checkout) */}
          {activeTab === 'CART' && items.length > 0 && (
            <div className="p-6 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 space-y-3">
              
              <div className="space-y-2 text-sm">
                 <div className="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>{t('shop.subtotalItems', { n: totalQty })}</span>
                    <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(subtotal)}</span>
                 </div>
                 {isBulkOrder && (
                   <div className="flex justify-between text-green-600 font-bold">
                      <span>{t('shop.coopDiscount')}</span>
                      <span>- {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(discountAmount)}</span>
                   </div>
                 )}
              </div>
              
              <div className="border-t border-gray-200 dark:border-slate-800 pt-3 flex justify-between items-center mb-4">
                <span className="text-gray-800 dark:text-white font-bold">{t('shop.totalPayment')}</span>
                <span className="text-xl font-bold text-digitalcoop-700 dark:text-digitalcoop-400">
                   {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalAmount)}
                </span>
              </div>
              
              <button disabled className="w-full py-3 bg-gray-300 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded-lg font-bold flex items-center justify-center cursor-not-allowed">
                {t('shop.payComingSoon')} <ArrowRight size={18} className="ml-2" />
              </button>
              <p className="text-[11px] text-center text-gray-500 dark:text-slate-400">{t('shop.payVaNote')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
