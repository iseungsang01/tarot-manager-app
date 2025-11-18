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
    <div style={{ padding: '30px' }}>
      <div style={{
        background: 'var(--gradient-purple)',
        border: 'var(--border-gold)',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: 'var(--shadow-gold)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ color: 'var(--gold)', margin: '0 0 10px 0', fontSize: '32px', fontWeight: '700', textShadow: 'var(--glow-gold)' }}>
              📊 투표 관리
            </h1>
            <p style={{ color: 'var(--lavender)', margin: 0, fontSize: '16px' }}>
              고객 설문조사 및 투표를 관리합니다 (모든 투표는 익명으로 진행됩니다)
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleCreateVote}
            style={{ fontSize: '16px', padding: '15px 30px' }}
          >
            ➕ 새 투표 만들기
          </button>
        </div>

        {/* 통계 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div style={{
            background: 'rgba(138, 43, 226, 0.3)',
            border: '2px solid var(--purple-light)',
            borderRadius: '15px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ color: 'var(--gold)', fontSize: '36px', fontWeight: '700', marginBottom: '5px', textShadow: 'var(--glow-gold)' }}>
              {votes.length}
            </div>
            <div style={{ color: 'var(--lavender)', fontSize: '14px' }}>총 투표</div>
          </div>
          <div style={{
            background: 'rgba(138, 43, 226, 0.3)',
            border: '2px solid var(--purple-light)',
            borderRadius: '15px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ color: 'var(--gold)', fontSize: '36px', fontWeight: '700', marginBottom: '5px', textShadow: 'var(--glow-gold)' }}>
              {votes.filter(v => v.is_active).length}
            </div>
            <div style={{ color: 'var(--lavender)', fontSize: '14px' }}>진행중</div>
          </div>
          <div style={{
            background: 'rgba(138, 43, 226, 0.3)',
            border: '2px solid var(--purple-light)',
            borderRadius: '15px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ color: 'var(--gold)', fontSize: '36px', fontWeight: '700', marginBottom: '5px', textShadow: 'var(--glow-gold)' }}>
              {votes.reduce((sum, v) => sum + (v.total_votes || 0), 0)}
            </div>
            <div style={{ color: 'var(--lavender)', fontSize: '14px' }}>총 참여자</div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`} style={{ marginBottom: '20px', fontSize: '16px' }}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div style={{
          background: 'var(--gradient-purple)',
          border: '3px solid var(--purple-light)',
          borderRadius: '20px',
          padding: '35px',
          marginBottom: '30px',
          boxShadow: 'var(--shadow-purple)'
        }}>
          <h2 style={{ color: 'var(--gold)', marginBottom: '25px', fontSize: '26px', fontWeight: '700' }}>
            {editingVote ? '✏️ 투표 수정' : '➕ 새 투표 만들기'}
          </h2>

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
              style={{
                background: 'rgba(138, 43, 226, 0.3)',
                border: '2px dashed var(--purple-light)',
                color: 'var(--gold)',
                padding: '12px',
                borderRadius: '10px',
                cursor: 'pointer',
                width: '100%',
                fontSize: '15px',
                fontWeight: '600',
                marginTop: '10px'
              }}
            >
              ➕ 옵션 추가
            </button>
          </div>

          <div className="input-group">
            <label>종료 날짜 (기본: 월말 23:59)</label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
            />
            <div style={{ color: 'var(--lavender)', fontSize: '13px', marginTop: '5px' }}>
              💡 한국 시간(KST) 기준으로 입력해주세요
            </div>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.allow_multiple}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  allow_multiple: e.target.checked,
                  max_selections: e.target.checked ? formData.max_selections : 1
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

          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              style={{ flex: 1 }}
            >
              {editingVote ? '💾 수정하기' : '✅ 생성하기'}
            </button>
            <button
              className="btn-back"
              onClick={() => {
                setShowForm(false);
                setEditingVote(null);
                setMessage({ text: '', type: '' });
              }}
              style={{ flex: 1 }}
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
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--gradient-purple)',
            border: 'var(--border-gold)',
            borderRadius: '20px',
            padding: '35px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-gold)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
              <div>
                <h2 style={{ color: 'var(--gold)', margin: '0 0 10px 0', fontSize: '28px', fontWeight: '700', textShadow: 'var(--glow-gold)' }}>
                  📊 {voteResults.vote.title}
                </h2>
                {voteResults.vote.description && (
                  <p style={{ color: 'var(--lavender)', margin: '0 0 15px 0', fontSize: '16px', lineHeight: '1.6' }}>
                    {voteResults.vote.description}
                  </p>
                )}
                <div style={{ color: 'var(--lavender)', fontSize: '16px' }}>
                  총 투표 수: <strong style={{ color: 'var(--gold)', fontSize: '20px' }}>{voteResults.totalVotes}명</strong>
                </div>
              </div>
              <button
                onClick={handleCloseResults}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--gold)',
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
                      border: '2px solid var(--purple-light)',
                      borderRadius: '15px',
                      padding: '25px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>
                          {option.text}
                        </div>
                        <div style={{ color: 'var(--gold)', fontSize: '22px', fontWeight: '700' }}>
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
                          background: 'linear-gradient(135deg, var(--purple-light) 0%, var(--purple-lighter) 100%)',
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
              className="btn btn-primary"
              onClick={handleCloseResults}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
          {votes.map((vote) => (
            <div key={vote.id} style={{
              background: 'var(--gradient-purple)',
              border: vote.is_active ? 'var(--border-purple)' : '3px solid #888',
              borderRadius: '20px',
              padding: '25px',
              boxShadow: 'var(--shadow-purple)',
              opacity: vote.is_active ? 1 : 0.7
            }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ color: 'var(--gold)', margin: 0, fontSize: '20px', fontWeight: '700', flex: 1 }}>
                    {vote.title}
                  </h3>
                  <span style={{
                    background: vote.is_active ? 'rgba(76, 175, 80, 0.3)' : 'rgba(136, 136, 136, 0.3)',
                    color: vote.is_active ? 'var(--green)' : '#ccc',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: `2px solid ${vote.is_active ? 'var(--green)' : '#888'}`,
                    whiteSpace: 'nowrap'
                  }}>
                    {vote.is_active ? '✅ 진행중' : '⏸️ 종료'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {vote.allow_multiple && (
                    <span style={{
                      background: 'rgba(33, 150, 243, 0.3)',
                      color: '#64b5f6',
                      padding: '5px 12px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '2px solid #2196f3'
                    }}>
                      복수선택 (최대 {vote.max_selections}개)
                    </span>
                  )}
                  <span style={{
                    background: 'rgba(156, 39, 176, 0.3)',
                    color: '#ba68c8',
                    padding: '5px 12px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '2px solid #9c27b0'
                  }}>
                    🔒 익명
                  </span>
                </div>

                {vote.description && (
                  <p style={{ color: 'var(--lavender)', margin: '0 0 12px 0', fontSize: '15px', lineHeight: '1.5' }}>
                    {vote.description}
                  </p>
                )}

                <div style={{ color: 'var(--lavender)', fontSize: '14px', marginBottom: '5px' }}>
                  📋 옵션: {vote.options.length}개 | 📊 참여: {vote.total_votes || 0}명
                </div>
                <div style={{ color: 'var(--lavender)', fontSize: '14px' }}>
                  ⏰ 종료: {formatDate(vote.ends_at)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <button
                  className="btn btn-select"
                  onClick={() => loadVoteResults(vote.id)}
                >
                  📊 결과
                </button>
                <button
                  className="btn btn-select"
                  onClick={() => handleEditVote(vote)}
                  style={{ background: 'rgba(33, 150, 243, 0.3)', borderColor: '#2196f3' }}
                >
                  ✏️ 수정
                </button>
                <button
                  className="btn btn-select"
                  onClick={() => handleToggleActive(vote)}
                  style={{ 
                    background: vote.is_active ? 'rgba(255, 152, 0, 0.3)' : 'rgba(76, 175, 80, 0.3)',
                    borderColor: vote.is_active ? '#ff9800' : '#4caf50'
                  }}
                >
                  {vote.is_active ? '⏸️ 종료' : '▶️ 재개'}
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteVote(vote.id)}
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