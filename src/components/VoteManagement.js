import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function VoteManagement({ onBack }) {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVote, setEditingVote] = useState(null);
  const [showResults, setShowResults] = useState(null);
  const [voteResults, setVoteResults] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    options: ['', ''],
    ends_at: getEndOfMonth(),
    allow_multiple: false,
    max_selections: 1
  });

  const [message, setMessage] = useState({ text: '', type: '' });

  function getEndOfMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
    return `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}T23:59`;
  }

  function kstToGmt(kstDateString) {
    const kstDate = new Date(kstDateString);
    const gmtDate = new Date(kstDate.getTime() - (9 * 60 * 60 * 1000));
    return gmtDate.toISOString();
  }

  function gmtToKst(gmtDateString) {
    const gmtDate = new Date(gmtDateString);
    const kstDate = new Date(gmtDate.getTime() + (9 * 60 * 60 * 1000));
    return `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')}T${String(kstDate.getHours()).padStart(2, '0')}:${String(kstDate.getMinutes()).padStart(2, '0')}`;
  }

  function formatDate(gmtDateString) {
    if (!gmtDateString) return '무제한';
    const gmtDate = new Date(gmtDateString);
    const kstDate = new Date(gmtDate.getTime() + (9 * 60 * 60 * 1000));
    return kstDate.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul'
    });
  }

  useEffect(() => {
    loadVotes();
  }, []);

  const loadVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVotes(data || []);
    } catch (error) {
      console.error('Load votes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVoteResults = async (voteId) => {
    try {
      const { data: voteData, error: voteError } = await supabase
        .from('votes')
        .select('*')
        .eq('id', voteId)
        .single();

      if (voteError) throw voteError;

      const voteCounts = voteData.vote_counts || {};
      
      const optionsWithCounts = voteData.options.map(opt => ({
        ...opt,
        count: voteCounts[opt.id] || 0
      }));

      setVoteResults({
        vote: voteData,
        totalVotes: voteData.total_votes || 0,
        options: optionsWithCounts
      });
      
      setShowResults(voteId);
    } catch (error) {
      console.error('Load results error:', error);
      setMessage({ text: '결과 조회 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleAddOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, '']
    });
  };

  const handleRemoveOption = (index) => {
    if (formData.options.length <= 2) {
      setMessage({ text: '최소 2개의 옵션이 필요합니다.', type: 'error' });
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleCreateVote = () => {
    setEditingVote(null);
    setFormData({
      title: '',
      description: '',
      options: ['', ''],
      ends_at: getEndOfMonth(),
      allow_multiple: false,
      max_selections: 1
    });
    setShowForm(true);
    setMessage({ text: '', type: '' });
  };

  const handleEditVote = (vote) => {
    setEditingVote(vote);
    const endsAtKst = vote.ends_at ? gmtToKst(vote.ends_at) : getEndOfMonth();
    setFormData({
      title: vote.title,
      description: vote.description || '',
      options: vote.options.map(opt => opt.text),
      ends_at: endsAtKst,
      allow_multiple: vote.allow_multiple,
      max_selections: vote.max_selections
    });
    setShowForm(true);
    setMessage({ text: '', type: '' });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setMessage({ text: '투표 제목을 입력해주세요.', type: 'error' });
      return;
    }

    const validOptions = formData.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      setMessage({ text: '최소 2개의 옵션을 입력해주세요.', type: 'error' });
      return;
    }

    if (formData.allow_multiple && formData.max_selections < 1) {
      setMessage({ text: '최대 선택 개수는 1개 이상이어야 합니다.', type: 'error' });
      return;
    }

    if (formData.allow_multiple && formData.max_selections > validOptions.length) {
      setMessage({ text: '최대 선택 개수는 옵션 개수를 초과할 수 없습니다.', type: 'error' });
      return;
    }

    try {
      const optionsData = validOptions.map((text, index) => ({
        id: index + 1,
        text: text.trim()
      }));

      const endsAtGmt = formData.ends_at ? kstToGmt(formData.ends_at) : null;

      const voteData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        options: optionsData,
        ends_at: endsAtGmt,
        allow_multiple: formData.allow_multiple,
        max_selections: formData.allow_multiple ? formData.max_selections : 1,
        is_active: true,
        vote_counts: {},
        total_votes: 0
      };

      if (editingVote) {
        const { error } = await supabase
          .from('votes')
          .update(voteData)
          .eq('id', editingVote.id);
        if (error) throw error;
        setMessage({ text: '✅ 투표가 수정되었습니다.', type: 'success' });
      } else {
        const { error } = await supabase
          .from('votes')
          .insert(voteData);
        if (error) throw error;
        setMessage({ text: '✅ 투표가 생성되었습니다.', type: 'success' });
      }

      await loadVotes();
      setTimeout(() => {
        setShowForm(false);
        setEditingVote(null);
        setMessage({ text: '', type: '' });
      }, 1500);

    } catch (error) {
      console.error('Submit error:', error);
      setMessage({ text: '저장 중 오류가 발생했습니다: ' + error.message, type: 'error' });
    }
  };

  const handleToggleActive = async (vote) => {
    try {
      const { error } = await supabase
        .from('votes')
        .update({ is_active: !vote.is_active })
        .eq('id', vote.id);

      if (error) throw error;
      await loadVotes();
      setMessage({ 
        text: vote.is_active ? '✅ 투표가 종료되었습니다.' : '✅ 투표가 재활성화되었습니다.', 
        type: 'success' 
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    } catch (error) {
      console.error('Toggle active error:', error);
      setMessage({ text: '상태 변경 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleDeleteVote = async (voteId) => {
    if (!window.confirm('이 투표를 삭제하시겠습니까?\n관련된 모든 응답도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('id', voteId);

      if (error) throw error;
      await loadVotes();
      setMessage({ text: '🗑️ 투표가 삭제되었습니다.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 2000);
    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ text: '삭제 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleCloseResults = () => {
    setShowResults(null);
    setVoteResults(null);
  };

  return (
    <div style={{ 
      padding: '30px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      background: 'linear-gradient(135deg, #1a0033 0%, #2d004d 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        background: 'linear-gradient(135deg, #2d004d 0%, #1a0033 100%)',
        borderRadius: '20px',
        padding: '30px',
        border: '3px solid #ffd700',
        boxShadow: '0 20px 60px rgba(255, 215, 0, 0.3)'
      }}>
        <div>
          <h1 style={{ color: '#ffd700', margin: '0 0 10px 0', fontSize: '32px', fontWeight: '700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
            📊 투표 관리
          </h1>
          <p style={{ color: '#e0b0ff', margin: 0, fontSize: '16px' }}>
            고객 설문조사 및 투표를 관리합니다 (모든 투표는 익명으로 진행됩니다)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleCreateVote}
            style={{
              background: 'linear-gradient(135deg, #8a2be2 0%, #9370db 100%)',
              color: 'white',
              border: '2px solid #ffd700',
              padding: '15px 30px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 5px 15px rgba(138, 43, 226, 0.4)',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 20px rgba(138, 43, 226, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 5px 15px rgba(138, 43, 226, 0.4)';
            }}
          >
            ➕ 새 투표 만들기
          </button>
          <button 
            onClick={onBack}
            style={{
              background: '#8a2be2',
              color: '#ffd700',
              border: '2px solid #ffd700',
              padding: '15px 30px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.background = '#9370db';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.background = '#8a2be2';
            }}
          >
            ✕ 닫기
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '15px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: '600',
          background: message.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
          border: `2px solid ${message.type === 'success' ? '#4caf50' : '#f44336'}`,
          color: message.type === 'success' ? '#4caf50' : '#f44336'
        }}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div style={{
          background: 'linear-gradient(135deg, #2d004d 0%, #1a0033 100%)',
          border: '3px solid #8a2be2',
          borderRadius: '20px',
          padding: '35px',
          marginBottom: '30px',
          boxShadow: '0 10px 30px rgba(138, 43, 226, 0.2)'
        }}>
          <h2 style={{ color: '#ffd700', marginBottom: '25px', fontSize: '26px', fontWeight: '700' }}>
            {editingVote ? '✏️ 투표 수정' : '➕ 새 투표 만들기'}
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#ffd700', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
              투표 제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="예: 다음 달 이벤트 메뉴 투표"
              maxLength="200"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #8a2be2',
                borderRadius: '8px',
                fontSize: '15px',
                background: 'rgba(138, 43, 226, 0.1)',
                color: 'white',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffd700';
                e.target.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#8a2be2';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#ffd700', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="투표에 대한 설명을 입력하세요"
              rows="3"
              maxLength="500"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #8a2be2',
                borderRadius: '8px',
                fontSize: '15px',
                background: 'rgba(138, 43, 226, 0.1)',
                color: 'white',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffd700';
                e.target.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#8a2be2';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#ffd700', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
              투표 옵션 * (최소 2개)
            </label>
            {formData.options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`옵션 ${index + 1}`}
                  maxLength="100"
                  style={{
                    flex: 1,
                    padding: '12px 15px',
                    border: '2px solid #8a2be2',
                    borderRadius: '8px',
                    fontSize: '15px',
                    background: 'rgba(138, 43, 226, 0.1)',
                    color: 'white',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ffd700';
                    e.target.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#8a2be2';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {formData.options.length > 2 && (
                  <button
                    onClick={() => handleRemoveOption(index)}
                    style={{
                      background: 'rgba(255, 69, 0, 0.2)',
                      color: 'white',
                      border: '2px solid #ff4500',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 69, 0, 0.4)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 69, 0, 0.2)';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddOption}
              style={{
                background: 'rgba(138, 43, 226, 0.1)',
                border: '2px dashed #8a2be2',
                color: '#e0b0ff',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
                fontSize: '15px',
                fontWeight: '600',
                marginTop: '10px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(138, 43, 226, 0.2)';
                e.target.style.color = '#ffd700';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(138, 43, 226, 0.1)';
                e.target.style.color = '#e0b0ff';
              }}
            >
              ➕ 옵션 추가
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#ffd700', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
              종료 날짜 (기본: 월말 23:59)
            </label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #8a2be2',
                borderRadius: '8px',
                fontSize: '15px',
                background: 'rgba(138, 43, 226, 0.1)',
                color: 'white',
                outline: 'none',
                colorScheme: 'dark'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffd700';
                e.target.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#8a2be2';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{ color: '#e0b0ff', fontSize: '13px', marginTop: '5px' }}>
              💡 한국 시간(KST) 기준으로 입력해주세요
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              color: '#e0b0ff', 
              fontSize: '15px',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={formData.allow_multiple}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  allow_multiple: e.target.checked,
                  max_selections: e.target.checked ? formData.max_selections : 1
                })}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#ffd700' }}
              />
              <span style={{ fontWeight: '600' }}>복수 선택 허용</span>
            </label>
          </div>

          {formData.allow_multiple && (
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', color: '#ffd700', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                최대 선택 개수
              </label>
              <input
                type="number"
                min="1"
                max={formData.options.filter(opt => opt.trim()).length}
                value={formData.max_selections}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  max_selections: parseInt(e.target.value) || 1 
                })}
                style={{
                  width: '150px',
                  padding: '12px 15px',
                  border: '2px solid #8a2be2',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: 'rgba(138, 43, 226, 0.1)',
                  color: 'white',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={handleSubmit}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #8a2be2 0%, #9370db 100%)',
                color: 'white',
                border: '2px solid #ffd700',
                padding: '15px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 5px 15px rgba(138, 43, 226, 0.4)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 20px rgba(138, 43, 226, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 5px 15px rgba(138, 43, 226, 0.4)';
              }}
            >
              {editingVote ? '💾 수정하기' : '✅ 생성하기'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingVote(null);
                setMessage({ text: '', type: '' });
              }}
              style={{
                flex: 1,
                background: 'rgba(138, 43, 226, 0.3)',
                color: '#e0b0ff',
                border: '2px solid #8a2be2',
                padding: '15px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(138, 43, 226, 0.5)';
                e.target.style.color = '#ffd700';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(138, 43, 226, 0.3)';
                e.target.style.color = '#e0b0ff';
              }}
            >
              ✕ 취소
            </button>
          </div>
        </div>
      )}

      {showResults && voteResults && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2d004d 0%, #1a0033 100%)',
            borderRadius: '20px',
            padding: '35px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(138, 43, 226, 0.5)',
            border: '3px solid #ffd700'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
              <div>
                <h2 style={{ color: '#ffd700', margin: '0 0 10px 0', fontSize: '28px', fontWeight: '700' }}>
                  📊 {voteResults.vote.title}
                </h2>
                {voteResults.vote.description && (
                  <p style={{ color: '#e0b0ff', margin: '0 0 15px 0', fontSize: '16px', lineHeight: '1.6' }}>
                    {voteResults.vote.description}
                  </p>
                )}
                <div style={{ color: '#e0b0ff', fontSize: '16px' }}>
                  총 투표 수: <strong style={{ color: '#ffd700', fontSize: '20px' }}>{voteResults.totalVotes}명</strong>
                </div>
              </div>
              <button
                onClick={handleCloseResults}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffd700',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '5px 10px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
              {voteResults.options
                .sort((a, b) => b.count - a.count)
                .map((option) => {
                  const percentage = voteResults.totalVotes > 0 
                    ? ((option.count / voteResults.totalVotes) * 100).toFixed(1)
                    : 0;

                  return (
                    <div key={option.id} style={{
                      background: 'rgba(138, 43, 226, 0.2)',
                      border: '2px solid #8a2be2',
                      borderRadius: '12px',
                      padding: '25px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ color: '#e0b0ff', fontSize: '18px', fontWeight: '600' }}>
                          {option.text}
                        </div>
                        <div style={{ color: '#ffd700', fontSize: '22px', fontWeight: '700' }}>
                          {option.count}표 ({percentage}%)
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(138, 43, 226, 0.3)',
                        borderRadius: '10px',
                        height: '24px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #8a2be2 0%, #9370db 100%)',
                          height: '100%',
                          width: `${percentage}%`,
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={handleCloseResults}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #8a2be2 0%, #9370db 100%)',
                color: 'white',
                border: '2px solid #ffd700',
                padding: '15px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 5px 15px rgba(138, 43, 226, 0.4)'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', fontSize: '18px', color: '#e0b0ff' }}>
          로딩 중...
        </div>
      ) : votes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'linear-gradient(135deg, #2d004d 0%, #1a0033 100%)',
          borderRadius: '20px',
          border: '3px solid #8a2be2'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>📊</div>
          <h3 style={{ color: '#ffd700', fontSize: '24px', marginBottom: '10px' }}>생성된 투표가 없습니다</h3>
          <p style={{ color: '#e0b0ff', fontSize: '16px' }}>새 투표를 만들어 고객들의 의견을 들어보세요</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
          {votes.map((vote) => (
            <div key={vote.id} style={{
              background: 'linear-gradient(135deg, #2d004d 0%, #1a0033 100%)',
              border: `3px solid ${vote.is_active ? '#ffd700' : '#8a2be2'}`,
              borderRadius: '15px',
              padding: '25px',
              boxShadow: '0 5px 20px rgba(138, 43, 226, 0.3)',
              transition: 'all 0.3s',
              opacity: vote.is_active ? 1 : 0.7
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(138, 43, 226, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 5px 20px rgba(138, 43, 226, 0.3)';
            }}
            >
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ color: '#ffd700', margin: 0, fontSize: '20px', fontWeight: '700', flex: 1 }}>
                    {vote.title}
                  </h3>
                  <span style={{
                    background: vote.is_active ? 'rgba(76, 175, 80, 0.3)' : 'rgba(138, 43, 226, 0.3)',
                    color: vote.is_active ? '#4caf50' : '#e0b0ff',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: `2px solid ${vote.is_active ? '#4caf50' : '#8a2be2'}`,
                    whiteSpace: 'nowrap'
                  }}>
                    {vote.is_active ? '✅ 진행중' : '⏸️ 종료'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {vote.allow_multiple && (
                    <span style={{
                      background: 'rgba(138, 43, 226, 0.3)',
                      color: '#e0b0ff',
                      padding: '5px 12px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '2px solid #8a2be2'
                    }}>
                      복수선택 (최대 {vote.max_selections}개)
                    </span>
                  )}
                  <span style={{
                    background: 'rgba(138, 43, 226, 0.3)',
                    color: '#e0b0ff',
                    padding: '5px 12px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '2px solid #8a2be2'
                  }}>
                    🔒 익명
                  </span>
                </div>

                {vote.description && (
                  <p style={{ color: '#e0b0ff', margin: '0 0 12px 0', fontSize: '15px', lineHeight: '1.5' }}>
                    {vote.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#e0b0ff', marginBottom: '8px' }}>
                  <span>📋 옵션: {vote.options.length}개</span>
                  <span>📊 참여: {vote.total_votes || 0}명</span>
                </div>
                <div style={{ fontSize: '14px', color: '#e0b0ff' }}>
                  ⏰ 종료: {formatDate(vote.ends_at)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button
                  onClick={() => loadVoteResults(vote.id)}
                  style={{
                    background: 'linear-gradient(135deg, #8a2be2 0%, #9370db 100%)',
                    color: 'white',
                    border: '2px solid #ffd700',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 3px 10px rgba(138, 43, 226, 0.4)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 15px rgba(138, 43, 226, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 3px 10px rgba(138, 43, 226, 0.4)';
                  }}
                >
                  📊 결과
                </button>
                <button
                  onClick={() => handleEditVote(vote)}
                  style={{
                    background: 'rgba(147, 112, 219, 0.3)',
                    color: 'white',
                    border: '2px solid #9370db',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(147, 112, 219, 0.5)';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(147, 112, 219, 0.3)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ✏️ 수정
                </button>
                <button
                  onClick={() => handleToggleActive(vote)}
                  style={{
                    background: vote.is_active ? 'rgba(255, 193, 7, 0.3)' : 'rgba(76, 175, 80, 0.3)',
                    color: 'white',
                    border: `2px solid ${vote.is_active ? '#ffc107' : '#4caf50'}`,
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = vote.is_active ? 'rgba(255, 193, 7, 0.5)' : 'rgba(76, 175, 80, 0.5)';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = vote.is_active ? 'rgba(255, 193, 7, 0.3)' : 'rgba(76, 175, 80, 0.3)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  {vote.is_active ? '⏸️ 종료' : '▶️ 재개'}
                </button>
                <button
                  onClick={() => handleDeleteVote(vote.id)}
                  style={{
                    background: 'rgba(255, 69, 0, 0.2)',
                    color: 'white',
                    border: '2px solid #ff4500',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 69, 0, 0.4)';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 69, 0, 0.2)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  🗑️ 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VoteManagement;