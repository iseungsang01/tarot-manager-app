import React, { useState } from 'react';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';
import BirthdayView from './components/BirthdayView';
import NoticeManagement from './components/NoticeManagement';
import StoreRequestView from './components/StoreRequestView';
import CouponManagement from './components/CouponManagement';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('customer');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const showAdminLogin = () => {
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (password === 'admin1234') {
      setIsAdminAuthenticated(true);
      setCurrentView('admin');
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const showBirthdayView = () => {
    setCurrentView('birthday');
  };

  const showNoticeManagement = () => {
    setCurrentView('notice');
  };

  const showStoreRequestView = () => {
    setCurrentView('storeRequest');
  };

  const showCouponManagement = () => {
    setCurrentView('coupon');
  };

  const backToCustomer = () => {
    setCurrentView('customer');
    setIsAdminAuthenticated(false);
  };

  return (
    <div className="App">
      {currentView === 'customer' && (
        <>
          <button className="admin-btn" onClick={showAdminLogin} title="관리자">
            ⚙️
          </button>
          <CustomerView />
        </>
      )}
      
      {currentView === 'admin' && isAdminAuthenticated && (
        <AdminView 
          onClose={backToCustomer} 
          onShowBirthday={showBirthdayView}
          onShowNotice={showNoticeManagement}
          onShowStoreRequest={showStoreRequestView}
          onShowCoupon={showCouponManagement}
        />
      )}
      
      {currentView === 'birthday' && (
        <BirthdayView onBack={() => setCurrentView('admin')} />
      )}

      {currentView === 'notice' && (
        <NoticeManagement onBack={() => setCurrentView('admin')} />
      )}

      {currentView === 'storeRequest' && (
        <StoreRequestView onBack={() => setCurrentView('admin')} />
      )}

      {currentView === 'coupon' && (
        <CouponManagement onBack={() => setCurrentView('admin')} />
      )}
    </div>
  );
}

export default App;