import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

function CouponManagement({ onBack }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState({ 
    total: 0, 
    valid: 0, 
    expired: 0, 
    birthday: 0,
    regular: 0 
  });

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('coupon_history')
        .select(`
          *,
          customers (
            nickname,
            phone_number
          )
        `)
        .order('issued_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      
      let filteredData = data || [];
      if (filterType === 'valid') {
        filteredData = filteredData.filter(coupon => {
          const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
          const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
          const isValidFrom = !validFrom || validFrom <= now;
          const isValidUntil = !validUntil || validUntil >= now;
          return isValidFrom && isValidUntil;
        });
      } else if (filterType === 'expired') {
        filteredData = filteredData.filter(coupon => {
          const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
          return validUntil && validUntil < now;
        });
      }

      setCoupons(filteredData);

      const stats = data.reduce((acc, coupon) => {
        acc.total++;
        
        const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
        const isValidFrom = !validFrom || validFrom <= now;
        const isValidUntil = !validUntil || validUntil >= now;
        
        if (isValidFrom && isValidUntil) {
          acc.valid++;
        }
        
        if (validUntil && validUntil < now) {
          acc.expired++;
        }
        
        if (coupon.coupon_code.startsWith('BIRTHDAY')) {
          acc.birthday++;
        } else {
          acc.regular++;
        }
        
        return acc;
      }, { total: 0, valid: 0, expired: 0, birthday: 0, regular: 0 });

      setStats(stats);
    } catch (error) {
      console.error('Error loading coupons:', error);
      alert('쿠폰 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const deleteCoupon = async (id, couponCode) => {
    if (!window.confirm(`쿠폰 ${couponCode}을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('coupon_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('🗑️ 쿠폰이 삭제되었습니다.');
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const deleteExpiredCoupons = async () => {
    if (!window.confirm('만료된 모든 쿠폰을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('coupon_history')
        .delete()
        .lt('valid_until', now)
        .not('valid_until', 'is', null);

      if (error) throw error;
      
      alert('✅ 만료된 쿠폰이 모두 삭제되었습니다.');
      loadCoupons();
    } catch (error) {
      console.error('Error deleting expired coupons:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const getCouponStatus = (coupon) => {
    const now = new Date();
    const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    if (validUntil && validUntil < now) {
      return { label: '⏰ 만료', class: 'badge-secondary' };
    }
    
    if (validFrom && validFrom > now) {
      return { label: '⏳ 대기중', class: 'badge-info' };
    }
    
    return { label: '✅ 사용가능', class: 'badge-success' };
  };

  const getCouponType = (couponCode) => {
    if (couponCode.startsWith('BIRTHDAY')) {
      return { label: '🎂 생일쿠폰', class: 'badge-warning' };
    }
    return { label: '⭐ 일반쿠폰', class: 'badge-normal' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="store-request-view">
      <div className="admin-header">
        <h1>🎫 쿠폰 관리</h1>
        <button className="btn-close" onClick={onBack}>
          ✕ 닫기
        </button>
      </div>

      <div className="stats">
        <div className="stat-box">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">전체 쿠폰</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.valid}</div>
          <div className="stat-label">사용가능</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.birthday}</div>
          <div className="stat-label">생일쿠폰</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.expired}</div>
          <div className="stat-label">만료됨</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="filter-buttons" style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-info'}`}
            onClick={() => setFilterType('all')}
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            전체
          </button>
          <button 
            className={`btn ${filterType === 'valid' ? 'btn-primary' : 'btn-info'}`}
            onClick={() => setFilterType('valid')}
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            사용가능
          </button>
          <button 
            className={`btn ${filterType === 'expired' ? 'btn-primary' : 'btn-info'}`}
            onClick={() => setFilterType('expired')}
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            만료됨
          </button>
        </div>

        {stats.expired > 0 && (
          <button 
            className="btn btn-warning"
            onClick={deleteExpiredCoupons}
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            🗑️ 만료된 쿠폰 일괄 삭제
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : coupons.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔭</div>
          <h3>쿠폰이 없습니다</h3>
          <p>
            {filterType === 'valid' && '현재 사용가능한 쿠폰이 없습니다.'}
            {filterType === 'expired' && '만료된 쿠폰이 없습니다.'}
            {filterType === 'all' && '발급된 쿠폰이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>상태</th>
                <th>종류</th>
                <th>쿠폰코드</th>
                <th>고객</th>
                <th>발급일</th>
                <th>사용가능 시작</th>
                <th>유효기간</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const status = getCouponStatus(coupon);
                const type = getCouponType(coupon.coupon_code);
                
                return (
                  <tr key={coupon.id}>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${type.class}`}>
                        {type.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {coupon.coupon_code}
                    </td>
                    <td>
                      <div>{coupon.customers?.nickname || '알 수 없음'}</div>
                      <div style={{ fontSize: '12px', opacity: 0.7 }}>
                        {coupon.customers?.phone_number || '-'}
                      </div>
                    </td>
                    <td>{formatDate(coupon.issued_at)}</td>
                    <td>
                      {coupon.valid_from ? (
                        <span style={{ color: '#e0b0ff' }}>
                          {formatDate(coupon.valid_from)}
                        </span>
                      ) : (
                        <span style={{ color: '#90EE90' }}>즉시</span>
                      )}
                    </td>
                    <td>
                      {coupon.valid_until ? (
                        <span style={{ 
                          color: new Date(coupon.valid_until) < new Date() ? '#ffcccb' : '#e0b0ff' 
                        }}>
                          {formatDate(coupon.valid_until)}
                        </span>
                      ) : (
                        <span style={{ color: '#90EE90' }}>무제한</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-delete"
                          onClick={() => deleteCoupon(coupon.id, coupon.coupon_code)}
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CouponManagement;