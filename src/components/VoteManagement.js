import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function VoteManagement() {
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

      // vote_counts에서 각 옵션별 투표수 가져오기
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
      background: 'white',
      minHeight: '100vh'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        padding: '30px',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
      }}>
        <div>
          <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '32px', fontWeight: '700' }}>📊 투표 관리</h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '16px' }}>
            고객 설문조사 및 투표를 관리합니다 (모든 투표는 익명으로 진행됩니다)
          </p>
        </div>
        <button 
          onClick={handleCreateVote}
          style={{
            background: 'white',
            color: '#667eea',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          ➕ 새 투표 만들기
        </button>
      </div>

      {message.text && (
        <div style={{
          padding: '15px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: '600',
          background: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `2px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div style={{
          background: '#f8f9fa',
          border: '2px solid #dee2e6',
          borderRadius: '15px',
          padding: '35px',
          marginBottom: '30px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#495057', marginBottom: '25px', fontSize: '26px', fontWeight: '700' }}>
            {editingVote ? '✏️ 투표 수정' : '➕ 새 투표 만들기'}
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#495057', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
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
                border: '2px solid #ced4da',
                borderRadius: '8px',
                fontSize: '15px',
                background: 'white'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#495057', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
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
                border: '2px solid #ced4da',
                borderRadius: '8px',
                fontSize: '15px',
                background: 'white',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#495057', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
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
                    border: '2px solid #ced4da',
                    borderRadius: '8px',
                    fontSize: '15px',
                    background: 'white'
                  }}
                />
                {formData.options.length > 2 && (
                  <button
                    onClick={() => handleRemoveOption(index)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600'
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
                background: 'white',
                border: '2px dashed #6c757d',
                color: '#6c757d',
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
                e.target.style.background = '#f8f9fa';
                e.target.style.borderColor = '#495057';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#6c757d';
              }}
            >
              ➕ 옵션 추가
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#495057', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
              종료 날짜 (기본: 월말 23:59)
            </label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #ced4da',
                borderRadius: '8px',
                fontSize: '15px',
                background: 'white'
              }}
            />
            <div style={{ color: '#6c757d', fontSize: '13px', marginTop: '5px' }}>
              💡 한국 시간(KST) 기준으로 입력해주세요
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              color: '#495057', 
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
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '600' }}>복수 선택 허용</span>
            </label>
          </div>

          {formData.allow_multiple && (
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', color: '#495057', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
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
                  border: '2px solid #ced4da',
                  borderRadius: '8px',
                  fontSize: '15px',
                  background: 'white'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={handleSubmit}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 5px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
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
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#5a6268'}
              onMouseLeave={(e) => e.target.style.background = '#6c757d'}
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
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '35px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
              <div>
                <h2 style={{ color: '#495057', margin: '0 0 10px 0', fontSize: '28px', fontWeight: '700' }}>
                  📊 {voteResults.vote.title}
                </h2>
                {voteResults.vote.description && (
                  <p style={{ color: '#6c757d', margin: '0 0 15px 0', fontSize: '16px', lineHeight: '1.6' }}>
                    {voteResults.vote.description}
                  </p>
                )}
                <div style={{ color: '#6c757d', fontSize: '16px' }}>
                  총 투표 수: <strong style={{ color: '#667eea', fontSize: '20px' }}>{voteResults.totalVotes}명</strong>
                </div>
              </div>
              <button
                onClick={handleCloseResults}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6c757d',
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
                      background: '#f8f9fa',
                      border: '2px solid #e9ecef',
                      borderRadius: '12px',
                      padding: '25px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ color: '#495057', fontSize: '18px', fontWeight: '600' }}>
                          {option.text}
                        </div>
                        <div style={{ color: '#667eea', fontSize: '22px', fontWeight: '700' }}>
                          {option.count}표 ({percentage}%)
                        </div>
                      </div>

                      <div style={{
                        background: '#e9ecef',
                        borderRadius: '10px',
                        height: '24px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 5px 15px rgba(102, 126, 234, 0.3)'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', fontSize: '18px', color: '#6c757d' }}>
          로딩 중...
        </div>
      ) : votes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: '#f8f9fa',
          borderRadius: '15px',
          border: '2px solid #dee2e6'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>📊</div>
          <h3 style={{ color: '#495057', fontSize: '24px', marginBottom: '10px' }}>생성된 투표가 없습니다</h3>
          <p style={{ color: '#6c757d', fontSize: '16px' }}>새 투표를 만들어 고객들의 의견을 들어보세요</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
          {votes.map((vote) => (
            <div key={vote.id} style={{
              background: 'white',
              border: `3px solid ${vote.is_active ? '#667eea' : '#adb5bd'}`,
              borderRadius: '15px',
              padding: '25px',
              boxShadow: '0 5px 20px rgba(0,0,0,0.1)',
              transition: 'all 0.3s',
              opacity: vote.is_active ? 1 : 0.7
            }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ color: '#495057', margin: 0, fontSize: '20px', fontWeight: '700', flex: 1 }}>
                    {vote.title}
                  </h3>
                  <span style={{
                    background: vote.is_active ? '#d4edda' : '#e9ecef',
                    color: vote.is_active ? '#155724' : '#6c757d',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: `2px solid ${vote.is_active ? '#c3e6cb' : '#dee2e6'}`,
                    whiteSpace: 'nowrap'
                  }}>
                    {vote.is_active ? '✅ 진행중' : '⏸️ 종료'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {vote.allow_multiple && (
                    <span style={{
                      background: '#d1ecf1',
                      color: '#0c5460',
                      padding: '5px 12px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '2px solid #bee5eb'
                    }}>
                      복수선택 (최대 {vote.max_selections}개)
                    </span>
                  )}
                  <span style={{
                    background: '#e2d5f1',
                    color: '#6c3483',
                    padding: '5px 12px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '2px solid #d5b8e8'
                  }}>
                    🔒 익명
                  </span>
                </div>

                {vote.description && (
                  <p style={{ color: '#6c757d', margin: '0 0 12px 0', fontSize: '15px', lineHeight: '1.5' }}>
                    {vote.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                  <span>📋 옵션: {vote.options.length}개</span>
                  <span>📊 참여: {vote.total_votes || 0}명</span>
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  ⏰ 종료: {formatDate(vote.ends_at)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button
                  onClick={() => loadVoteResults(vote.id)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 3px 10px rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  📊 결과
                </button>
                <button
                  onClick={() => handleEditVote(vote)}
                  style={{
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#138496'}
                  onMouseLeave={(e) => e.target.style.background = '#17a2b8'}
                >
                  ✏️ 수정
                </button>
                <button
                  onClick={() => handleToggleActive(vote)}
                  style={{
                    background: vote.is_active ? '#ffc107' : '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = vote.is_active ? '#e0a800' : '#218838'}
                  onMouseLeave={(e) => e.target.style.background = vote.is_active ? '#ffc107' : '#28a745'}
                >
                  {vote.is_active ? '⏸️ 종료' : '▶️ 재개'}
                </button>
                <button
                  onClick={() => handleDeleteVote(vote.id)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#c82333'}
                  onMouseLeave={(e) => e.target.style.background = '#dc3545'}
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