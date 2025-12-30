import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

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
  const [availableCoupons, setAvailableCoupons] = useState(0);

  const loadCoupons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('coupon_history')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('is_used', false)
        .gte('valid_until', new Date().toISOString());
      
      if (error) throw error;
      setAvailableCoupons(data?.length || 0);
    } catch (error) {
      console.error('Error loading coupons:', error);
    }
  }, [customer.id]);

  useEffect(() => {
    loadCoupons();
    setEditStampValue(customer.current_stamps);
  }, [customer.id, customer.current_stamps, loadCoupons]);

  const addStamp = async () => {
    const count = parseInt(stampCount) || 1;

    if (count < 1 || count > 10) {
      onMessage('스탬프는 1~10개 사이로 입력해주세요.', 'error');
      return;
    }

    try {
      // visit_history에 기록 추가
      // SQL 트리거가 자동으로 customers 업데이트 및 쿠폰 발급 처리
      const { error: historyError } = await supabase
        .from('visit_history')
        .insert([{
          customer_id: customer.id,
          stamps_added: count
        }]);

      if (historyError) throw historyError;

      // 잠시 대기 후 고객 정보 새로고침 (트리거 처리 시간)
      setTimeout(async () => {
        await onUpdate();
        await loadCoupons();
        
        // 새로운 고객 정보 가져오기
        const { data: updatedCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customer.id)
          .single();

        if (updatedCustomer) {
          const couponsIssued = Math.floor((customer.current_stamps + count) / 10);
          
          if (couponsIssued > 0) {
            onMessage(`🌟 ${couponsIssued}개의 쿠폰이 자동으로 발급되었습니다!\n현재 스탬프: ${updatedCustomer.current_stamps}/10`, 'success');
          } else {
            const cardNames = [];
            for (let i = customer.current_stamps; i < customer.current_stamps + count && i < 10; i++) {
              cardNames.push(tarotCards[i].name);
            }
            onMessage(`✨ ${count}개의 카드를 획득했습니다!\n${cardNames.join(', ')}`, 'success');
          }
        }
      }, 500);

      setShowStampInput(false);
      setStampCount(1);

    } catch (error) {
      console.error('Error:', error);
      onMessage('오류가 발생했습니다: ' + error.message, 'error');
    }
  };

  const editStampCount = async () => {
    const newCount = parseInt(editStampValue);

    if (isNaN(newCount) || newCount < 0 || newCount >= 10) {
      onMessage('스탬프는 0~9개 사이로 입력해주세요.', 'error');
      return;
    }

    try {
      // current_stamps를 직접 수정
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          current_stamps: newCount
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
          최근 방문: {new Date(customer.last_visit).toLocaleString('ko-KR')} | 총 {customer.visit_count}회 방문
          {availableCoupons > 0 && (
            <div style={{ marginTop: '5px', color: '#ffd700', fontWeight: 'bold' }}>
              🎫 사용 가능한 쿠폰: {availableCoupons}개
            </div>
          )}
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
            <button 
              className="btn btn-success" 
              onClick={addStamp} 
              style={{ flex: 1 }}
            >
              추가
            </button>
            <button 
              className="btn btn-warning" 
              onClick={() => {
                setShowStampInput(false);
                setStampCount(1);
              }}
              style={{ flex: 1 }}
            >
              취소
            </button>
          </div>
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            background: 'rgba(138, 43, 226, 0.2)', 
            borderRadius: '8px',
            color: '#e0b0ff',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            💡 10개 달성 시 쿠폰이 자동으로 발급됩니다
          </div>
        </div>
      )}

      <button 
        className="btn btn-info" 
        onClick={() => setShowEditStamp(true)}
        style={{ width: '100%' }}
      >
        ✏️ 스탬프 개수 수정
      </button>

      {showEditStamp && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              value={editStampValue}
              onChange={(e) => setEditStampValue(e.target.value)}
              min="0"
              max="9"
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
            <button 
              className="btn btn-success" 
              onClick={editStampCount} 
              style={{ flex: 1 }}
            >
              수정
            </button>
            <button 
              className="btn btn-warning" 
              onClick={() => {
                setShowEditStamp(false);
                setEditStampValue(customer.current_stamps);
              }}
              style={{ flex: 1 }}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StampCard;