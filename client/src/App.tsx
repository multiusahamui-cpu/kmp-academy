
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { RoleSwitcher } from './components/RoleSwitcher';
import { UserRole, CartItem, Course, CourseType, WishlistItem } from './types'; 
import LandingPage from './views/LandingPage';
import Dashboard from './views/Dashboard';
import AppSettings from './views/admin/AppSettings';
import UserManagement from './views/admin/UserManagement';
import Moderation from './views/admin/Moderation';
import CronManager from './views/admin/CronManager';
import ProposalManager from './views/admin/ProposalManager';
import FinanceDashboard from './views/admin/FinanceDashboard';
import CategoryManager from './views/admin/CategoryManager'; 
import HelpdeskTickets from './views/admin/HelpdeskTickets'; 
import CourseCreator from './views/creator/CourseCreator';
import ClassRoom from './views/mentor/ClassRoom';
import ContentExplorer from './views/mentor/ContentExplorer';
import StudentCatalog from './views/student/StudentCatalog';
import WalletSettings from './views/settings/WalletSettings';
import ProfileSettings from './views/settings/ProfileSettings';
import DirectorDashboard from './views/director/DirectorDashboard'; 
import PartnerGovernance from './views/director/PartnerGovernance';
import QualityControl from './views/director/QualityControl'; 
import StrategicReport from './views/director/StrategicReport'; 
import AuthModal from './components/AuthModal'; 
import LearningRoom from './components/LearningRoom';
import { userApi } from './services/api'; // Import API Service

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.PUBLIC);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  
  // Auth Modal State
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Global State (Cart & Wishlist)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  
  // Learning State
  const [activeLearningCourseId, setActiveLearningCourseId] = useState<string | null>(null);

  // --- EFFECT: Load Wishlist from DB when User logs in ---
  useEffect(() => {
    if (currentRole !== UserRole.PUBLIC) {
      loadWishlistData();
    } else {
      setWishlistItems([]); // Clear on logout
    }
  }, [currentRole]);

  const loadWishlistData = async () => {
    try {
      const items = await userApi.getWishlist();
      setWishlistItems(items);
    } catch (error) {
      console.error("Failed to load wishlist from DB", error);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === UserRole.PUBLIC) {
      setCurrentView('landing');
      setCartItems([]);
      setWishlistItems([]);
      localStorage.removeItem('kodman_token'); // Clear token
    } else {
      setCurrentView('dashboard');
    }
  };

  // Cart Functions (Local State for now, could be API based too)
  const addToCart = (course: Course) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.courseId === course.id);
      if (existing) {
        setCartOpen(true);
        return prev;
      }
      setCartOpen(true);
      return [...prev, {
        courseId: course.id,
        title: course.title,
        price: course.price,
        thumbnail: course.thumbnail,
        type: course.type,
        qty: 1
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.courseId !== id));
  };

  const updateCartQty = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.courseId === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  // --- Wishlist Functions (INTEGRATED WITH API) ---
  const toggleWishlist = async (course: Course) => {
    // 1. Optimistic Update (UI updates immediately)
    const isExist = wishlistItems.some(w => w.courseId === course.id);
    let newItems = [...wishlistItems];
    
    if (isExist) {
        newItems = newItems.filter(w => w.courseId !== course.id);
    } else {
        newItems.push({
            courseId: course.id,
            title: course.title,
            price: course.price,
            thumbnail: course.thumbnail,
            addedAt: new Date().toLocaleDateString('id-ID')
        });
    }
    setWishlistItems(newItems);

    // 2. Call API in background
    try {
       await userApi.toggleWishlist(course.id);
       // Optional: Reload to sync server timestamp
       // await loadWishlistData(); 
    } catch (error) {
       console.error("Failed to sync wishlist", error);
       // Revert on error could be implemented here
       alert("Gagal menyimpan wishlist ke server.");
       loadWishlistData(); // Revert to server state
    }
  };

  const moveToCart = async (item: WishlistItem) => {
     // 1. Call API to remove from wishlist DB
     try {
       await userApi.toggleWishlist(item.courseId);
       
       // 2. Update Local State
       setWishlistItems(prev => prev.filter(w => w.courseId !== item.courseId));
       
       // 3. Add to Cart Local
       const cartItem: CartItem = {
          courseId: item.courseId,
          title: item.title,
          price: item.price,
          thumbnail: item.thumbnail,
          type: CourseType.MANDIRI,
          qty: 1
       };
       
       setCartItems(prev => {
          const existing = prev.find(ci => ci.courseId === item.courseId);
          if (existing) return prev;
          return [...prev, cartItem];
       });
       setCartOpen(true);

     } catch (err) {
       console.error("Move to cart error", err);
     }
  };

  const removeFromWishlist = async (id: string) => {
     try {
       await userApi.toggleWishlist(id);
       setWishlistItems(prev => prev.filter(item => item.courseId !== id));
     } catch (err) {
       console.error("Remove wishlist error", err);
     }
  };

  // Learning Functions
  const handleOpenLearning = (courseId: string) => {
     setActiveLearningCourseId(courseId);
     setCurrentView('learning-room');
  };

  const renderContent = () => {
    if (currentRole === UserRole.PUBLIC) {
      return (
        <>
          <LandingPage onRegister={() => setAuthModalOpen(true)} />
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={handleRoleChange}
          />
        </>
      );
    }

    if (currentView === 'learning-room' && activeLearningCourseId) {
       return (
         <LearningRoom 
            courseId={activeLearningCourseId} 
            onBack={() => setCurrentView('dashboard')} 
         />
       );
    }

    switch (currentView) {
      case 'dashboard':
        if (currentRole === UserRole.DIRECTOR) return <DirectorDashboard />;
        return <Dashboard 
                  role={currentRole} 
                  onNavigate={setCurrentView} 
                  onOpenLearning={handleOpenLearning}
                  wishlistItems={wishlistItems}
               />;
      
      case 'profile':
        return <ProfileSettings currentRole={currentRole} />;

      // Director
      case 'partner-governance':
         return <PartnerGovernance />;
      case 'quality-control':
         return <QualityControl />;
      case 'strategic-report':
         return <StrategicReport />;
      case 'communication':
         return <DirectorDashboard />;

      // Admin
      case 'settings':
        return <AppSettings />;
      case 'policy':
        return <AppSettings isPolicyMode />;
      case 'users':
        return <UserManagement />;
      case 'moderation':
        return <Moderation />;
      case 'cron':
        return <CronManager />;
      case 'finance':
        return <FinanceDashboard />;
      case 'categories':
        return <CategoryManager />; 
      case 'proposals':
        return <ProposalManager />;
      case 'helpdesk':
        return <HelpdeskTickets />;

      // Creator
      case 'my-courses':
        return <CourseCreator />;
      case 'create-course':
        return <CourseCreator isCreateMode />;
      
      // Wallet
      case 'wallet':
        return <WalletSettings role={currentRole} />;

      // Mentor
      case 'my-classes':
        return <ClassRoom />;
      case 'explore-content':
        return <ContentExplorer />;
      case 'grading':
        return <div className="p-8 text-center text-gray-500">Modul Penilaian Siswa</div>;

      // Student
      case 'enrolled':
        return <StudentCatalog enrolledOnly onOpenLearning={handleOpenLearning} />;
      case 'catalog':
        return <StudentCatalog 
                  addToCart={addToCart} 
                  onToggleWishlist={toggleWishlist}
                  wishlistItems={wishlistItems}
               />;

      default:
        return <Dashboard role={currentRole} />;
    }
  };

  return (
    <>
      {currentView === 'learning-room' ? (
         renderContent()
      ) : (
        <Layout 
          currentRole={currentRole} 
          onRoleChange={handleRoleChange}
          onNavigate={setCurrentView}
          currentView={currentView}
          // Cart Props
          cartItems={cartItems}
          isCartOpen={isCartOpen}
          setCartOpen={setCartOpen}
          removeFromCart={removeFromCart}
          updateCartQty={updateCartQty}
          // Wishlist Props
          wishlistItems={wishlistItems}
          onMoveToCart={moveToCart}
          onRemoveFromWishlist={removeFromWishlist}
          // Auth Props
          onOpenAuth={() => setAuthModalOpen(true)}
        >
          {renderContent()}
        </Layout>
      )}
      <RoleSwitcher currentRole={currentRole} onChange={handleRoleChange} />
    </>
  );
};

export default App;
