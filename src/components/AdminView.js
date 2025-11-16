import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

function AdminView({ onClose, onShowBirthday, onShowNotice, onShowCoupon, onShowStoreRequest, onShowVote }) {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalStamps: 0, totalCoupons: 0 });
  const [sortConfig, setSortConfig] = useState({ key: 'last_visit', direction: 'desc' });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('last_visit', { ascending: false });

      if (error) throw error;

      setCustomers(data);

      const stats = data.reduce((acc, customer) => ({
        total: acc.total + 1,
        totalStamps: acc.totalStamps + customer.total_stamps,
        totalCoupons: acc.totalCoupons + customer.coupons
      }), { total: 0, totalStamps: 0, totalCoupons: 0 });

      setStats(stats);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const exportToExcel = () => {
    const exportData = customers.map(c => ({
      '닉네임': c.nickname,
      '전화번호': c.phone_number,
      '생일': c.birthday || '-',
      '현재 스탬프': c.current_stamps,
      '누적 스탬프': c.total_stamps,
      '발급된 쿠폰': c.coupons,
      '총 방문 횟수': c.visit_count,
      '가입일': new Date(c.first_visit).toLocaleString('ko-KR'),
      '최근 방문일': new Date(c.last_visit).toLocaleString('ko-KR')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '고객 데이터');

    const fileName = `타로_스탬프_데이터_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    alert('엑셀 파일이 저장되었습니다!');
  };

  const clearAllData = async () => {
    if (!window.confirm('정말 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      await supabase.from('customers').delete().neq('id', 0);
      loadCustomers();
      alert('모든 데이터가 삭제되었습니다.');
    } catch (error) {
      console.error('Error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const calculateFrequency = (visitCount, firstVisit, lastVisit) => {
    if (visitCount < 2) return '-';
    
    const days = Math.floor((new Date(lastVisit) - new Date(firstVisit)) / (1000 * 60 * 60 * 24));
    const avgDays = days / (visitCount - 1);
    
    if (avgDays < 1) return '하루 여러번';
    if (avgDays < 7) return `약 ${Math.round(avgDays)}일마다`;
    if (avgDays < 30) return `약 ${Math.round(avgDays / 7)}주마다`;
    return `약 ${Math.round(avgDays / 30)}개월마다`;
  };

  const parseBirthday = (birthdayStr) => {
    if (!birthdayStr || birthdayStr === '-') return null;
    const match = birthdayStr.match(/(\d+)월\s*(\d+)일/);
    if (match) {
      return {
        month: parseInt(match[1]),
        day: parseInt(match[2])
      };
    }
    return null;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCustomers = React.useMemo(() => {
    const sorted = [...customers];
    
    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'nickname':
          aValue = a.nickname.toLowerCase();
          bValue = b.nickname.toLowerCase();
          break;
        case 'phone_number':
          aValue = a.phone_number;
          bValue = b.phone_number;
          break;
        case 'birthday':
          const aBirthday = parseBirthday(a.birthday);
          const bBirthday = parseBirthday(b.birthday);
          
          if (!aBirthday && !bBirthday) return 0;
          if (!aBirthday) return 1;
          if (!bBirthday) return -1;
          
          if (aBirthday.month !== bBirthday.month) {
            aValue = aBirthday.month;
            bValue = bBirthday.month;
          } else {
            aValue = aBirthday.day;
            bValue = bBirthday.day;
          }
          break;
        case 'current_stamps':
          aValue = a.current_stamps;
          bValue = b.current_stamps;
          break;
        case 'total_stamps':
          aValue = a.total_stamps;
          bValue = b.total_stamps;
          break;
        case 'coupons':
          aValue = a.coupons;
          bValue = b.coupons;
          break;
        case 'visit_count':
          aValue = a.visit_count;
          bValue = b.visit_count;
          break;
        case 'last_visit':
          aValue = new Date(a.last_visit);
          bValue = new Date(b.last_visit);
          break;
        case 'frequency':
          const aFreq = a.visit_count < 2 ? 999999 : 
            Math.floor((new Date(a.last_visit) - new Date(a.first_visit)) / (1000 * 60 * 60 * 24)) / (a.visit_count - 1);
          const bFreq = b.visit_count < 2 ? 999999 : 
            Math.floor((new Date(b.last_visit) - new Date(b.first_visit)) / (1000 * 60 * 60 * 24)) / (b.visit_count - 1);
          aValue = aFreq;
          bValue = bFreq;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [customers, sortConfig]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return ' ⇅';
    }
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="admin-view">
      <div className="admin-header">
        <h1>📊 관리자 페이지</h1>
        <button className="btn-close" onClick={onClose}>
          ✕ 닫기
        </button>
      </div>

      <div className="admin-controls">
        <button className="btn btn-success" onClick={exportToExcel}>
          💾 엑셀로 저장
        </button>
        <button className="btn btn-info" onClick={onShowBirthday}>
          🎂 생일자 확인
        </button>
        <button className="btn btn-info" onClick={onShowCoupon}>
          🎫 쿠폰 관리
        </button>
        <button className="btn btn-info" onClick={onShowNotice}>
          📢 공지사항 관리
        </button>
        <button className="btn btn-info" onClick={onShowVote}>
          📊 투표 관리
        </button>
        <button className="btn btn-info" onClick={onShowStoreRequest}>
          🏬 매장 제안 관리
        </button>
        <button className="btn btn-primary" onClick={clearAllData}>
          🗑️ 데이터 초기화
        </button>
      </div>

      <div className="stats">
        <div className="stat-box">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">총 고객 수</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.totalStamps}</div>
          <div className="stat-label">누적 스탬프</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.totalCoupons}</div>
          <div className="stat-label">발급된 쿠폰</div>
        </div>
      </div>

      <h2 style={{ marginBottom: '15px', color: 'gold' }}>고객 데이터 (정렬 가능)</h2>
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('nickname')} style={{ cursor: 'pointer' }}>
                닉네임{getSortIcon('nickname')}
              </th>
              <th onClick={() => handleSort('phone_number')} style={{ cursor: 'pointer' }}>
                전화번호{getSortIcon('phone_number')}
              </th>
              <th onClick={() => handleSort('birthday')} style={{ cursor: 'pointer' }}>
                생일{getSortIcon('birthday')}
              </th>
              <th onClick={() => handleSort('current_stamps')} style={{ cursor: 'pointer' }}>
                현재 스탬프{getSortIcon('current_stamps')}
              </th>
              <th onClick={() => handleSort('total_stamps')} style={{ cursor: 'pointer' }}>
                누적 스탬프{getSortIcon('total_stamps')}
              </th>
              <th onClick={() => handleSort('coupons')} style={{ cursor: 'pointer' }}>
                쿠폰{getSortIcon('coupons')}
              </th>
              <th onClick={() => handleSort('visit_count')} style={{ cursor: 'pointer' }}>
                방문횟수{getSortIcon('visit_count')}
              </th>
              <th onClick={() => handleSort('frequency')} style={{ cursor: 'pointer' }}>
                방문 빈도{getSortIcon('frequency')}
              </th>
              <th onClick={() => handleSort('last_visit')} style={{ cursor: 'pointer' }}>
                최근 방문{getSortIcon('last_visit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', color: '#e0b0ff' }}>
                  등록된 고객이 없습니다
                </td>
              </tr>
            ) : (
              sortedCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.nickname}</td>
                  <td>{customer.phone_number}</td>
                  <td>{customer.birthday || '-'}</td>
                  <td>
                    {customer.current_stamps >= 10 ? (
                      <span className="badge badge-success">완료</span>
                    ) : (
                      <span className="badge badge-warning">{customer.current_stamps}/10</span>
                    )}
                  </td>
                  <td>{customer.total_stamps}</td>
                  <td>{customer.coupons}개</td>
                  <td>{customer.visit_count}회</td>
                  <td>
                    <strong>
                      {calculateFrequency(customer.visit_count, customer.first_visit, customer.last_visit)}
                    </strong>
                  </td>
                  <td>
                    {new Date(customer.last_visit).toLocaleString('ko-KR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminView;