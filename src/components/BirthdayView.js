import React, { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '../supabaseClient';

function BirthdayView({ onBack }) {
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [thisWeekBirthdays, setThisWeekBirthdays] = useState([]);
  const [thisMonthBirthdays, setThisMonthBirthdays] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });

  const getDaysUntilBirthday = (birthdayDate) => {
    const today = new Date();
    const thisYear = today.getFullYear();
    
    const birthday = new Date(birthdayDate);
    const month = birthday.getMonth();
    const day = birthday.getDate();
    
    let birthdayThisYear = new Date(thisYear, month, day);
    
    if (birthdayThisYear < today) {
      birthdayThisYear = new Date(thisYear + 1, month, day);
    }
    
    const diffTime = birthdayThisYear - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const loadBirthdays = useCallback(async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('customers')
        .select('*')
        .not('birthday', 'is', null)
        .is('deleted_at', null);

      if (error) throw error;

      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();

      const todayList = [];
      const weekList = [];
      const monthList = [];

      data.forEach(customer => {
        const birthday = new Date(customer.birthday);
        const birthMonth = birthday.getMonth() + 1;
        const birthDay = birthday.getDate();

        const daysUntil = getDaysUntilBirthday(customer.birthday);

        if (birthMonth === todayMonth && birthDay === todayDay) {
          todayList.push(customer);
        } else if (daysUntil >= 0 && daysUntil <= 7) {
          weekList.push({ customer, daysUntil });
        } else if (birthMonth === todayMonth) {
          monthList.push({ customer, daysUntil });
        }
      });

      weekList.sort((a, b) => a.daysUntil - b.daysUntil);
      monthList.sort((a, b) => a.daysUntil - b.daysUntil);

      setTodayBirthdays(todayList);
      setThisWeekBirthdays(weekList);
      setThisMonthBirthdays(monthList);
      setStats({
        today: todayList.length,
        week: weekList.length,
        month: monthList.length
      });
    } catch (error) {
      console.error('Error loading birthdays:', error);
    }
  }, []);

  useEffect(() => {
    loadBirthdays();
  }, [loadBirthdays]);

  const issueBirthdayCoupon = async (customer) => {
    if (!customer.birthday) {
      alert('생일 정보가 없습니다.');
      return;
    }

    try {
      const birthday = new Date(customer.birthday);
      const thisYear = new Date().getFullYear();
      const birthdayThisYear = new Date(thisYear, birthday.getMonth(), birthday.getDate());
      const startOfYear = new Date(thisYear, 0, 1);
      
      const { data: existingCoupon, error: checkError } = await supabaseAdmin
        .from('coupon_history')
        .select('*')
        .eq('customer_id', customer.id)
        .like('coupon_code', 'BIRTHDAY%')
        .gte('issued_at', startOfYear.toISOString());

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingCoupon && existingCoupon.length > 0) {
        alert('⚠️ 이미 올해 생일 쿠폰을 발급받았습니다.');
        return;
      }

      const birthdayDisplay = `${birthday.getMonth() + 1}월 ${birthday.getDate()}일`;

      if (!window.confirm(
        `${customer.nickname}님께 생일 축하 쿠폰을 발급하시겠습니까?\n\n` +
        `유효기간: 생일 당일부터 7일 (총 8일간 사용 가능)\n` +
        `생일: ${birthdayDisplay}`
      )) {
        return;
      }

      const couponCode = 'BIRTHDAY' + Date.now().toString().slice(-8);
      
      // 생일 당일 00:00부터 시작
      const validUntil = new Date(birthdayThisYear);
      validUntil.setDate(validUntil.getDate() + 7);
      validUntil.setHours(23, 59, 59, 999);

      const { error: couponError } = await supabaseAdmin
        .from('coupon_history')
        .insert([{
          customer_id: customer.id,
          coupon_code: couponCode,
          valid_until: validUntil.toISOString()
        }]);

      if (couponError) throw couponError;

      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          coupons: customer.coupons + 1
        })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      alert(
        `🎂 생일 축하 쿠폰이 발급되었습니다!\n\n` +
        `고객: ${customer.nickname} (${customer.phone_number})\n` +
        `쿠폰 코드: ${couponCode}\n\n` +
        `유효기간:\n` +
        `${birthdayThisYear.toLocaleDateString('ko-KR')} ~ ${validUntil.toLocaleDateString('ko-KR')}\n` +
        `(총 8일간)`
      );
      
      loadBirthdays();
    } catch (error) {
      console.error('Error issuing birthday coupon:', error);
      alert('쿠폰 발급 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const formatBirthday = (birthdayDate) => {
    const date = new Date(birthdayDate);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const BirthdayCard = ({ customer, isToday = false, daysUntil = null }) => (
    <div className={`birthday-card ${isToday ? 'today' : ''}`}>
      <div className="birthday-icon">{isToday ? '🎉' : '🎂'}</div>
      <div className="customer-name">{customer.nickname}</div>
      <div className="customer-phone">{customer.phone_number}</div>
      <div className="birthday-date">{formatBirthday(customer.birthday)}</div>
      <div className="customer-info">
        {isToday ? '🎈 오늘이 생일입니다!' : daysUntil !== null ? `📅 ${daysUntil}일 후` : ''}
        <br />스탬프: {customer.current_stamps}/10 | 쿠폰: {customer.coupons}개
        <br />방문: {customer.visit_count}회
      </div>
      <button 
        className="btn btn-warning" 
        onClick={() => issueBirthdayCoupon(customer)}
        style={{ 
          marginTop: '15px', 
          width: '100%',
          fontSize: '14px',
          padding: '10px'
        }}
      >
        🎁 생일 쿠폰 발급
      </button>
    </div>
  );

  return (
    <div className="birthday-view">
      <div className="header">
        <h1>🎂 생일자 확인</h1>
        <p className="today">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </p>
        <button className="btn btn-primary" onClick={onBack} style={{ marginTop: '10px' }}>
          ← 관리자로 돌아가기
        </button>
      </div>

      <div className="stats">
        <div className="stat-box">
          <div className="stat-number">{stats.today}</div>
          <div className="stat-label">오늘 생일</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.week}</div>
          <div className="stat-label">이번 주 생일</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.month}</div>
          <div className="stat-label">이번 달 생일</div>
        </div>
      </div>

      <div className="section">
        <h2>🎉 오늘 생일</h2>
        <div className="birthday-grid">
          {todayBirthdays.length === 0 ? (
            <div className="empty-message">오늘 생일인 고객이 없습니다.</div>
          ) : (
            todayBirthdays.map(customer => (
              <BirthdayCard key={customer.id} customer={customer} isToday={true} />
            ))
          )}
        </div>
      </div>

      <div className="section">
        <h2>📅 이번 주 생일 (7일 이내)</h2>
        <div className="birthday-grid">
          {thisWeekBirthdays.length === 0 ? (
            <div className="empty-message">이번 주 생일인 고객이 없습니다.</div>
          ) : (
            thisWeekBirthdays.map(({ customer, daysUntil }) => (
              <BirthdayCard key={customer.id} customer={customer} daysUntil={daysUntil} />
            ))
          )}
        </div>
      </div>

      <div className="section">
        <h2>🗓️ 이번 달 생일</h2>
        <div className="birthday-grid">
          {thisMonthBirthdays.length === 0 ? (
            <div className="empty-message">이번 달 생일인 고객이 없습니다.</div>
          ) : (
            thisMonthBirthdays.map(({ customer, daysUntil }) => (
              <BirthdayCard key={customer.id} customer={customer} daysUntil={daysUntil} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BirthdayView;