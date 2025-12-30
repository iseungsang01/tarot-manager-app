import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import StampCard from './StampCard';

function CustomerView() {
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState(''); // YYYY-MM-DD
  const [customer, setCustomer] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 3-4-4 포맷팅 함수
  const formatPhone = (value) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // 고객 조회 및 등록/업데이트 로직
  const checkCustomer = async () => {
    // 유효성 검사 (010-0000-0000 형식)
    if (!phone.match(/^\d{3}-\d{4}-\d{4}$/)) {
      showMessage('올바른 전화번호(010-0000-0000)를 입력해주세요.', 'error');
      return;
    }

    try {
      // 1. 기존 고객 조회
      let { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', phone)
        .is('deleted_at', null)
        .maybeSingle(); // 데이터가 없어도 에러를 던지지 않음

      if (error) throw error;

      if (!data) {
        // 2. 신규 고객 등록 (비밀 헤더 덕분에 RLS 통과)
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert([{
            phone_number: phone,
            nickname: nickname || '고객',
            birthday: birthDate || null
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        data = newCustomer;
        showMessage('🔮 신규 고객으로 등록되었습니다!', 'success');
      } else {
        // 3. 기존 고객 정보 변경 확인
        const hasNicknameChange = nickname && nickname !== data.nickname;
        const hasBirthdayChange = birthDate && birthDate !== data.birthday;

        if (hasNicknameChange || hasBirthdayChange) {
          let warningMessage = '⚠️ 기존 정보를 수정하시겠습니까?\n\n';
          if (hasNicknameChange) warningMessage += `닉네임: ${data.nickname} → ${nickname}\n`;
          if (hasBirthdayChange) warningMessage += `생일: ${data.birthday || '미등록'} → ${birthDate}\n`;

          if (window.confirm(warningMessage)) {
            const { data: updatedData, error: updateError } = await supabase
              .from('customers')
              .update({
                nickname: nickname || data.nickname,
                birthday: birthDate || data.birthday
              })
              .eq('id', data.id)
              .select()
              .single();

            if (updateError) throw updateError;
            data = updatedData;
            showMessage('✅ 정보가 업데이트되었습니다.', 'success');
          }
        } else {
          showMessage('반갑습니다! 정보를 불러왔습니다.', 'success');
        }
      }

      setCustomer(data);
    } catch (error) {
      console.error('Error:', error);
      showMessage('오류: ' + error.message, 'error');
    }
  };

  // 스탬프 추가 등 작업 후 최신화
  const refreshCustomer = async () => {
    if (customer) {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .single();
      setCustomer(data);
    }
  };

  return (
    <div className="customer-view">
      <div className="header-container">
        <h1>🔮 타로 스탬프</h1>
        <p className="subtitle">10장의 카드를 모아 운명의 쿠폰을 받으세요</p>
      </div>

      <div className="form-container">
        <div className="input-group">
          <label>전화번호</label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            maxLength="13"
          />
        </div>

        <div className="input-group">
          <label>닉네임 (선택)</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
          />
        </div>

        <div className="input-group">
          <label>생일 (선택)</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="date-input"
          />
        </div>

        <button className="btn-search" onClick={checkCustomer}>
          조회하기
        </button>
      </div>

      {message.text && (
        <div className={`status-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 고객 정보가 있을 때만 스탬프 카드 표시 */}
      {customer && (
        <div className="stamp-card-section">
          <StampCard 
            customer={customer} 
            onUpdate={refreshCustomer}
            onMessage={showMessage}
          />
        </div>
      )}
    </div>
  );
}

export default CustomerView;