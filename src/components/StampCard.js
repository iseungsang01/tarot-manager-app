import React, { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '../supabaseClient';

const tarotCards = [
  { emoji: '🃏', name: 'The Fool' },
  { emoji: '🎩', name: 'The Magician' },
  { emoji: '👸', name: 'The Empress' },
  { emoji: '🤴', name: 'The Emperor' },
  { emoji: '⚖️', name: 'Justice' },
  { emoji: '🌙', name: 'The Moon' },
  { emoji: '☀️', name: 'The Sun' },
  { emoji: '⭐', name: 'The Star' },
  { emoji: '🎭', name: 'The Lovers' },
  { emoji: '🔱', name: 'The Devil' }
];

function StampCard({ customer, onUpdate, onMessage }) {
  const [showStampInput, setShowStampInput] = useState(false);
  const [stampCount, setStampCount] = useState(1);
  const [showEditStamp, setShowEditStamp] = useState(false);
  const [editStampValue, setEditStampValue] = useState(customer.current_stamps);

  const loadVisitHistory = useCallback(async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('visit_history')
        .select('*')
        .eq('customer_id', customer.id)
        .order('visit_date', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading visit history:', error);
      return [];
    }
  }, [customer.id]);

  useEffect(() => {
    loadVisitHistory();
    setEditStampValue(customer.current_stamps);
  }, [customer.id, customer.current_stamps, loadVisitHistory]);

  // --- 핵심 수정 영역: 트리거 없이 직접 업데이트 ---
  const addStamp = async () => {
    const count = parseInt(stampCount) || 1;

    // 1. 유효성 검사
    if (count < 1 || count > 10) {
      onMessage('스탬프는 1~10개 사이로 입력해주세요.', 'error');
      return;
    }

    if (customer.current_stamps >= 10) {
      onMessage('이미 10개가 모두 찍혔습니다! 쿠폰을 발급해주세요.', 'error');
      return;
    }

    const actualCount = Math.min(count, 10 - customer.current_stamps);
    const newCurrentStamps = customer.current_stamps + actualCount;

    try {
      // 2. 방문 기록 삽입
      const { error: historyError } = await supabaseAdmin
        .from('visit_history')
        .insert([{ customer_id: customer.id }]);

      if (historyError) throw historyError;

      // 3. 고객 정보 직접 업데이트 (트리거 대신 수행)
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          current_stamps: newCurrentStamps,
          total_stamps: customer.total_stamps + actualCount,
          visit_count: (customer.visit_count || 0) + 1,
          last_visit: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      // 4. UI 및 메시지 처리
      onUpdate();
      loadVisitHistory();
      setShowStampInput(false);
      setStampCount(1);

      if (newCurrentStamps === 10) {
        onMessage('🌟 모든 카드를 모았습니다! 운명의 쿠폰을 받으세요!', 'success');
      } else {
        const cardNames = [];
        for (let i = customer.current_stamps; i < newCurrentStamps; i++) {
          cardNames.push(tarotCards[i].name);
        }
        onMessage(`✨ ${actualCount}개의 카드를 획득했습니다!\n${cardNames.join(', ')}`, 'success');
      }
    } catch (error) {
      console.error('Error:', error);
      onMessage('오류가 발생했습니다: ' + error.message, 'error');
    }
  };

  const editStampCount = async () => {
    const newCount = parseInt(editStampValue);

    if (isNaN(newCount) || newCount < 0 || newCount > 10) {
      onMessage('스탬프는 0~10개 사이로 입력해주세요.', 'error');
      return;
    }

    try {
      const stampDifference = newCount - customer.current_stamps;
      
      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          current_stamps: newCount,
          total_stamps: customer.total_stamps + stampDifference
        })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      onUpdate();
      setShowEditStamp(false);
      onMessage(`✅ 스탬프가 ${newCount}개로 수정되었습니다.`, 'success');
    } catch (error) {
      console.error('Error:', error);
      onMessage('오류가 발생했습니다: ' + error.message, 'error');
    }
  };

  const issueCoupon = async () => {
    if (customer.current_stamps < 10) {
      onMessage('스탬프 10개를 모두 모아야 합니다.', 'error');
      return;
    }

    try {
      const couponCode = 'COUPON' + Date.now().toString().slice(-8);

      const { error: couponError } = await supabaseAdmin
        .from('coupon_history')
        .insert([{
          customer_id: customer.id,
          coupon_code: couponCode
        }]);

      if (couponError) throw couponError;

      const { error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          current_stamps: 0,
          coupons: (customer.coupons || 0) + 1
        })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      onUpdate();
      onMessage(`🎴 운명의 쿠폰이 발급되었습니다!\n쿠폰 코드: ${couponCode}`, 'success');
    } catch (error) {
      console.error('Error:', error);
      onMessage('오류가 발생했습니다: ' + error.message, 'error');
    }
  };

  return (
    <div className="stamp-display-wrapper">
      <div className="stamp-display">
        <div className="customer-info">
          <div className="customer-name">{customer.nickname}</div>
          <div className="customer-phone">{customer.phone_number}</div>
        </div>

        <div className="progress-text">
          {customer.current_stamps} / 10 카드
        </div>

        <div className="stamp-grid">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={`stamp ${i < customer.current_stamps ? 'filled' : ''}`}
              data-card={tarotCards[i].name}
            >
              {i < customer.current_stamps && tarotCards[i].emoji}
            </div>
          ))}
        </div>

        <div className="visit-info">
          최근 방문: {customer.last_visit ? new Date(customer.last_visit).toLocaleString('ko-KR') : '기록 없음'} | 총 {customer.visit_count || 0}회 방문
        </div>
      </div>

      <button 
        className="btn btn-success" 
        onClick={() => setShowStampInput(true)}
        style={{ marginBottom: '10px', width: '100%' }}
      >
        ✔ 스탬프 찍기
      </button>

      {showStampInput && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              value={stampCount}
              onChange={(e) => setStampCount(e.target.value)}
              min="1"
              max="10"
              onKeyPress={(e) => e.key === 'Enter' && addStamp()}
              style={{ 
                flex: 1, 
                padding: '15px', 
                borderRadius: '10px', 
                border: '2px solid #8a2be2',
                fontSize: '16px',
                background: 'rgba(255, 255, 255, 0.9)'
              }}
            />
            <button className="btn btn-success" onClick={addStamp} style={{ flex: 1 }}>추가</button>
            <button className="btn btn-warning" onClick={() => setShowStampInput(false)} style={{ flex: 1 }}>취소</button>
          </div>
        </div>
      )}

      <button 
        className="btn btn-info" 
        onClick={() => setShowEditStamp(true)}
        style={{ marginBottom: '10px', width: '100%' }}
      >
        ✏️ 스탬프 개수 수정
      </button>

      {showEditStamp && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              value={editStampValue}
              onChange={(e) => setEditStampValue(e.target.value)}
              min="0"
              max="10"
              onKeyPress={(e) => e.key === 'Enter' && editStampCount()}
              style={{ 
                flex: 1, 
                padding: '15px', 
                borderRadius: '10px', 
                border: '2px solid #8a2be2',
                fontSize: '16px',
                background: 'rgba(255, 255, 255, 0.9)'
              }}
            />
            <button className="btn btn-success" onClick={editStampCount} style={{ flex: 1 }}>수정</button>
            <button className="btn btn-warning" onClick={() => setShowEditStamp(false)} style={{ flex: 1 }}>취소</button>
          </div>
        </div>
      )}

      <button
        className="btn btn-warning"
        onClick={issueCoupon}
        disabled={customer.current_stamps < 10}
        style={{ width: '100%' }}
      >
        🎁 쿠폰 발급 (10개 달성!)
      </button>
    </div>
  );
}

export default StampCard;