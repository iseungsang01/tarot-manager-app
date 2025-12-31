import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '../supabaseClient';

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

  function formatDate(dateString) {
    if (!dateString) return '무제한';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  useEffect(() => {
    loadVotes();
  }, []);

  const loadVotes = async () => {
    try {
      const { data, error } = await supabaseAdmin
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
      const { data: voteData, error: voteError } = await supabaseAdmin
        .from('votes')
        .select('*')
        .eq('id', voteId)
        .single();

      if (voteError) throw voteError;

      // vote_responses에서 응답 집계
      const { data: responses, error: responseError } = await supabaseAdmin
        .from('vote_responses')
        .select('selected_options')
        .eq('vote_id', voteId);

      if (responseError) throw responseError;

      // 옵션별 투표 수 계산
      const voteCounts = {};
      let totalVotes = 0;

      responses.forEach(response => {
        response.selected_options.forEach(optionIndex => {
          voteCounts[optionIndex] = (voteCounts[optionIndex] || 0) + 1;
        });
        totalVotes++;
      });

      const optionsWithCounts = voteData.options.map((opt, idx) => ({
        index: idx,
        text: opt,
        count: voteCounts[idx] || 0
      }));

      setVoteResults({
        vote: voteData,
        totalVotes: totalVotes,
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
    const endsAt = vote.ends_at ? new Date(vote.ends_at).toISOString().slice(0, 16) : getEndOfMonth();
    setFormData({
      title: vote.title,
      description: vote.description || '',
      options: vote.options,
      ends_at: endsAt,
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
      const voteData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        options: validOptions.map(opt => opt.trim()),
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        allow_multiple: formData.allow_multiple,
        max_selections: formData.allow_multiple ? formData.max_selections : 1,
        is_active: true
      };

      if (editingVote) {
        const { error } = await supabaseAdmin
          .from('votes')
          .update(voteData)
          .eq('id', editingVote.id);
        if (error) throw error;
        setMessage({ text: '✅ 투표가 수정되었습니다.', type: 'success' });
      } else {
        const { error } = await supabaseAdmin
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
      const { error } = await supabaseAdmin
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
      const { error } = await supabaseAdmin
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
          <h1 style={{ color: '#ffd700', margin: '0 0 10px 0', fontSize: '32px', fontWeight: '700' }}>
            📊 투표 관리
          </h1>
          <p style={{ color: '#e0b0ff', margin: 0, fontSize: '16px' }}>
            고객 설문조사 및 투표를 관리합니다 (익명 투표)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleCreateVote}
            className="btn btn-success"
            style={{ width: 'auto', whiteSpace: 'nowrap' }}
          >
            ➕ 새 투표 만들기
          </button>
          <button 
            onClick={onBack}
            className="btn-close"
          >
            ✕ 닫기
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="notice-form">
          <h2>{editingVote ? '✏️ 투표 수정' : '➕ 새 투표 만들기'}</h2>

          <div className="input-group">
            <label>투표 제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="예: 다음 달 이벤트 메뉴 투표"
              maxLength="200"
            />
          </div>

          <div className="input-group">
            <label>설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="투표에 대한 설명을 입력하세요"
              rows="3"
              maxLength="500"
            />
          </div>

          <div className="input-group">
            <label>투표 옵션 * (최소 2개)</label>
            {formData.options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`옵션 ${index + 1}`}
                  maxLength="100"
                  style={{ flex: 1 }}
                />
                {formData.options.length > 2 && (
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="btn-delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddOption}
              className="btn btn-info"
              style={{ width: '100%', marginTop: '10px' }}
            >
              ➕ 옵션 추가
            </button>
          </div>

          <div className="input-group">
            <label>종료 날짜</label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
            />
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.allow_multiple}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  allow_multiple: e.target.checked
                })}
              />
              <span>복수 선택 허용</span>
            </label>
          </div>

          {formData.allow_multiple && (
            <div className="input-group">
              <label>최대 선택 개수</label>
              <input
                type="number"
                min="1"
                max={formData.options.filter(opt => opt.trim()).length}
                value={formData.max_selections}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  max_selections: parseInt(e.target.value) || 1 
                })}
                style={{ width: '150px' }}
              />
            </div>
          )}

          <div className="form-buttons">
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingVote ? '💾 수정하기' : '✅ 생성하기'}
            </button>
            <button
              className="btn btn-warning"
              onClick={() => {
                setShowForm(false);
                setEditingVote(null);
                setMessage({ text: '', type: '' });
              }}
            >
              ✕ 취소
            </button>
          </div>
        </div>
      )}

      {showResults && voteResults && (
        <div className="modal-overlay" onClick={handleCloseResults}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📊 {voteResults.vote.title}</h2>
            {voteResults.vote.description && (
              <p style={{ color: '#e0b0ff', marginBottom: '15px' }}>
                {voteResults.vote.description}
              </p>
            )}
            <div style={{ marginBottom: '20px' }}>
              총 투표 수: <strong style={{ color: '#ffd700', fontSize: '20px' }}>{voteResults.totalVotes}명</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              {voteResults.options
                .sort((a, b) => b.count - a.count)
                .map((option) => {
                  const percentage = voteResults.totalVotes > 0 
                    ? ((option.count / voteResults.totalVotes) * 100).toFixed(1)
                    : 0;

                  return (
                    <div key={option.index} style={{
                      background: 'rgba(138, 43, 226, 0.2)',
                      border: '2px solid #8a2be2',
                      borderRadius: '10px',
                      padding: '15px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ color: '#e0b0ff', fontWeight: '600' }}>{option.text}</div>
                        <div style={{ color: '#ffd700', fontWeight: '700' }}>
                          {option.count}표 ({percentage}%)
                        </div>
                      </div>
                      <div style={{
                        background: 'rgba(138, 43, 226, 0.3)',
                        borderRadius: '5px',
                        height: '20px',
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
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : votes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>생성된 투표가 없습니다</h3>
          <p>새 투표를 만들어 고객들의 의견을 들어보세요</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
          {votes.map((vote) => (
            <div key={vote.id} className="birthday-card" style={{
              opacity: vote.is_active ? 1 : 0.7
            }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ color: '#ffd700', margin: 0, fontSize: '18px' }}>
                    {vote.title}
                  </h3>
                  <span className={`badge ${vote.is_active ? 'badge-success' : 'badge-secondary'}`}>
                    {vote.is_active ? '✅ 진행중' : '⏸️ 종료'}
                  </span>
                </div>

                {vote.description && (
                  <p style={{ color: '#e0b0ff', fontSize: '14px', marginBottom: '10px' }}>
                    {vote.description}
                  </p>
                )}

                <div style={{ fontSize: '13px', color: '#e0b0ff' }}>
                  📋 옵션: {vote.options.length}개 | 
                  {vote.allow_multiple && ` 복수선택 (최대 ${vote.max_selections}개) | `}
                  🔒 익명
                </div>
                <div style={{ fontSize: '13px', color: '#e0b0ff', marginTop: '5px' }}>
                  ⏰ 종료: {formatDate(vote.ends_at)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button
                  onClick={() => loadVoteResults(vote.id)}
                  className="btn btn-success"
                  style={{ width: '100%', padding: '10px', fontSize: '14px' }}
                >
                  📊 결과
                </button>
                <button
                  onClick={() => handleEditVote(vote)}
                  className="btn btn-info"
                  style={{ width: '100%', padding: '10px', fontSize: '14px' }}
                >
                  ✏️ 수정
                </button>
                <button
                  onClick={() => handleToggleActive(vote)}
                  className="btn btn-warning"
                  style={{ width: '100%', padding: '10px', fontSize: '14px' }}
                >
                  {vote.is_active ? '⏸️ 종료' : '▶️ 재개'}
                </button>
                <button
                  onClick={() => handleDeleteVote(vote.id)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', fontSize: '14px' }}
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