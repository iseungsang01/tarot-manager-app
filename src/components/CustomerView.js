import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import StampCard from './StampCard';

function CustomerView() {
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [customer, setCustomer] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const formatPhone = (value) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const checkCustomer = async () => {
    if (!phone.match(/^\d{3}-\d{3,4}-\d{4}$/)) {
      showMessage('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }

    try {
      let { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', phone)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // 신규 고객 등록
        const currentYear = new Date().getFullYear();
        const birthday = (birthYear || birthMonth || birthDay) 
          ? `${birthYear || currentYear}-${(birthMonth || '01').padStart(2, '0')}-${(birthDay || '01').padStart(2, '0')}`
          : null;

        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert([{
            phone_number: phone,
            nickname: nickname || '고객',
            birthday: birthday
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        data = newCustomer;
        showMessage('신규 고객으로 등록되었습니다!', 'success');
      } else {
        // 기존 고객 정보 업데이트 확인
        const hasNicknameChange = nickname && nickname !== data.nickname;
        
        const currentYear = new Date().getFullYear();
        const inputBirthday = (birthYear || birthMonth || birthDay)
          ? `${birthYear || currentYear}-${(birthMonth || '01').padStart(2, '0')}-${(birthDay || '01').padStart(2, '0')}`
          : null;
        
        const hasBirthdayChange = inputBirthday && inputBirthday !== data.birthday;

        if (hasNicknameChange || hasBirthdayChange) {
          let warningMessage = '⚠️ 고객 정보가 변경됩니다.\n\n';
          
          if (hasNicknameChange) {
            warningMessage += `닉네임: "${data.nickname}" → "${nickname}"\n`;
          }
          
          if (hasBirthdayChange) {
            const oldBirthday = data.birthday 
              ? new Date(data.birthday).toLocaleDateString('ko-KR')
              : '미등록';
            const newBirthday = new Date(inputBirthday).toLocaleDateString('ko-KR');
            warningMessage += `생일: "${oldBirthday}" → "${newBirthday}"\n`;
          }
          
          warningMessage += '\n정말 변경하시겠습니까?';
          
          const confirmChange = window.confirm(warningMessage);
          
          if (!confirmChange) {
            setCustomer(data);
            showMessage('고객 정보를 불러왔습니다.', 'success');
            return;
          }
        }

        if (nickname || inputBirthday) {
          await supabase
            .from('customers')
            .update({
              nickname: nickname || data.nickname,
              birthday: inputBirthday || data.birthday
            })
            .eq('id', data.id);
          
          const { data: updatedData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', data.id)
            .single();
          data = updatedData;
          
          if (hasNicknameChange || hasBirthdayChange) {
            showMessage('✅ 고객 정보가 변경되었습니다.', 'success');
          } else {
            showMessage('고객 정보를 불러왔습니다.', 'success');
          }
        } else {
          showMessage('고객 정보를 불러왔습니다.', 'success');
        }
      }

      setCustomer(data);
    } catch (error) {
      console.error('Error:', error);
      showMessage('오류가 발생했습니다: ' + error.message, 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

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
      <h1>🔮 타로 스탬프</h1>
      <p className="subtitle">10장의 카드를 모아 운명의 쿠폰을 받으세요</p>

      <div className="input-group">
        <label>전화번호</label>
        <input
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="010-1234-5678"
          maxLength="13"
          onKeyPress={(e) => e.key === 'Enter' && checkCustomer()}
        />
      </div>

      <div className="input-group">
        <label>닉네임 (선택)</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="타로러버"
          onKeyPress={(e) => e.key === 'Enter' && checkCustomer()}
        />
      </div>

      <div className="input-group">
        <label>생일 (선택)</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            style={{ 
              flex: 1, 
              padding: '15px',
              border: '2px solid #8a2be2',
              borderRadius: '10px',
              fontSize: '16px',
              background: 'rgba(255, 255, 255, 0.9)'
            }}
          >
            <option value="">년도</option>
            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
          <select
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
            style={{ 
              flex: 1, 
              padding: '15px',
              border: '2px solid #8a2be2',
              borderRadius: '10px',
              fontSize: '16px',
              background: 'rgba(255, 255, 255, 0.9)'
            }}
          >
            <option value="">월</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}월</option>
            ))}
          </select>
          <select
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value)}
            style={{ 
              flex: 1,
              padding: '15px',
              border: '2px solid #8a2be2',
              borderRadius: '10px',
              fontSize: '16px',
              background: 'rgba(255, 255, 255, 0.9)'
            }}
          >
            <option value="">일</option>
            {[...Array(31)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}일</option>
            ))}
          </select>
        </div>
      </div>

      <button className="btn btn-primary" onClick={checkCustomer}>
        조회하기
      </button>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {customer && (
        <StampCard 
          customer={customer} 
          onUpdate={refreshCustomer}
          onMessage={showMessage}
        />
      )}
    </div>
  );
}

export default CustomerView;