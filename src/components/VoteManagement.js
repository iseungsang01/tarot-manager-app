import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

function VoteManagement({ onBack }) {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWriting, setIsWriting] = useState(false);
  const [editingVote, setEditingVote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    options: ['', ''],
    ends_at: '',
    allow_multiple: false,
    max_selections: 1,
    is_anonymous: false,
    is_active: true
  });
  const containerRef = React.useRef(null);

  useEffect(() => {
    loadVotes();
  }, []);

  const loadVotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 각 투표에 대한 응답 수 가져오기
      const votesWithStats = await Promise.all(
        (data || []).map(async (vote) => {
          const { count } = await supabase
            .from('vote_responses')
            .select('*', { count: 'exact', head: true })
            .eq('vote_id', vote.id);

          return { ...vote, response_count: count || 0 };
        })
      );

      setVotes(votesWithStats);
    } catch (error) {
      console.error('Load votes error:', error);
      alert('투표를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    
    const validOptions = formData.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      alert('최소 2개의 선택지를 입력해주세요.');
      return;
    }

    if (formData.allow_multiple && formData.max_selections > validOptions.length) {
      alert('최대 선택 가능 수는 전체 선택지 개수를 초과할 수 없습니다.');
      return;
    }

    try {
      const optionsJson = validOptions.map((text, index) => ({
        id: index + 1,
        text: text.trim(),
        votes: 0
      }));

      const submitData = {
        title: formData.title,
        description: formData.description || null,
        options: optionsJson,
        ends_at: formData.ends_at || null,
        allow_multiple: formData.allow_multiple,
        max_selections: formData.allow_multiple ? formData.max_selections : 1,
        is_anonymous: formData.is_anonymous,
        is_active: formData.is_active,
        created_by: 'admin'
      };

      if (editingVote) {
        // 수정 시 기존 응답이 있으면 경고
        const { count } = await supabase
          .from('vote_responses')
          .select('*', { count: 'exact', head: true })
          .eq('vote_id', editingVote.id);

        if (count > 0) {
          if (!window.confirm(
            `⚠️ 이미 ${count}명이 참여한 투표입니다.\n` +
            `수정하면 기존 투표 결과가 유지되지만, 선택지 변경 시 결과가 맞지 않을 수 있습니다.\n\n` +
            `계속 진행하시겠습니까?`
          )) {
            return;
          }
        }

        const { error } = await supabase
          .from('votes')
          .update(submitData)
          .eq('id', editingVote.id);

        if (error) throw error;
        alert('✅ 투표가 수정되었습니다!');
      } else {
        const { error } = await supabase
          .from('votes')
          .insert([submitData]);

        if (error) throw error;
        alert('✅ 투표가 생성되었습니다!');
      }

      resetForm();
      loadVotes();
    } catch (error) {
      console.error('Submit error:', error);
      alert('오류가 발생했습니다: ' + error.message);
    }
  };

  const handleEdit = (vote) => {
    setEditingVote(vote);
    
    const options = vote.options.map(opt => opt.text);
    
    setFormData({
      title: vote.title,
      description: vote.description || '',
      options: options,
      ends_at: vote.ends_at ? new Date(vote.ends_at).toISOString().slice(0, 16) : '',
      allow_multiple: vote.allow_multiple,
      max_selections: vote.max_selections || 1,
      is_anonymous: vote.is_anonymous,
      is_active: vote.is_active
    });
    setIsWriting(true);
    
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }, 100);
  };

  const handleDelete = async (id) => {
    // 응답 수 확인
    const { count } = await supabase
      .from('vote_responses')
      .select('*', { count: 'exact', head: true })
      .eq('vote_id', id);

    const confirmMsg = count > 0
      ? `이 투표를 삭제하시겠습니까?\n\n⚠️ ${count}명의 참여 기록도 함께 삭제됩니다.`
      : '이 투표를 삭제하시겠습니까?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('🗑️ 투표가 삭제되었습니다.');
      loadVotes();
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('votes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      alert(`✅ 투표가 ${!currentStatus ? '활성화' : '종료'}되었습니다.`);
      loadVotes();
    } catch (error) {
      console.error('Toggle active error:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const viewResults = async (vote) => {
    try {
      const { data: responses, error } = await supabase
        .from('vote_responses')
        .select(`
          *,
          customers (
            nickname,
            phone_number
          )
        `)
        .eq('vote_id', vote.id);

      if (error) throw error;

      // 선택지별 득표수 계산
      const optionVotes = {};
      vote.options.forEach(opt => {
        optionVotes[opt.id] = 0;
      });

      responses.forEach(response => {
        response.selected_options.forEach(optionId => {
          optionVotes[optionId] = (optionVotes[optionId] || 0) + 1;
        });
      });

      const totalVotes = responses.length;

      let resultText = `📊 "${vote.title}" 투표 결과\n\n`;
      resultText += `전체 참여자: ${totalVotes}명\n\n`;
      resultText += `─────────────────\n\n`;

      vote.options.forEach(opt => {
        const count = optionVotes[opt.id] || 0;
        const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;
        resultText += `${opt.text}\n`;
        resultText += `${count}표 (${percentage}%)\n`;
        resultText += `${'█'.repeat(Math.round(percentage / 5))}${'░'.repeat(20 - Math.round(percentage / 5))}\n\n`;
      });

      if (!vote.is_anonymous && responses.length > 0) {
        resultText += `\n─────────────────\n\n`;
        resultText += `📝 참여자 목록:\n\n`;
        responses.forEach((response, idx) => {
          const selectedTexts = response.selected_options
            .map(optId => vote.options.find(o => o.id === optId)?.text)
            .filter(Boolean)
            .join(', ');
          
          resultText += `${idx + 1}. ${response.customers?.nickname || '알 수 없음'} (${response.customers?.phone_number || '-'})\n`;
          resultText += `   선택: ${selectedTexts}\n`;
          resultText += `   ${new Date(response.voted_at).toLocaleString('ko-KR')}\n\n`;
        });
      }

      alert(resultText);
    } catch (error) {
      console.error('View results error:', error);
      alert('결과 조회 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      options: ['', ''],
      ends_at: '',
      allow_multiple: false,
      max_selections: 1,
      is_anonymous: false,
      is_active: true
    });
    setIsWriting(false);
    setEditingVote(null);
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, '']
    });
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      alert('최소 2개의 선택지가 필요합니다.');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getVoteStatus = (vote) => {
    if (!vote.is_active) {
      return { label: '⏸️ 종료됨', class: 'badge-secondary' };
    }
    if (vote.ends_at && new Date(vote.ends_at) < new Date()) {
      return { label: '⏰ 마감됨', class: 'badge-warning' };
    }
    return { label: '✅ 진행중', class: 'badge-success' };
  };

  const stats = votes.reduce((acc, vote) => {
    acc.total++;
    if (vote.is_active) acc.active++;
    acc.totalResponses += vote.response_count || 0;
    return acc;
  }, { total: 0, active: 0, totalResponses: 0 });

  return (
    <div className="notice-management" ref={containerRef}>
      <div className="notice-header">
        <h1>📊 투표 관리</h1>
        <div className="header-buttons">
          {!isWriting && (
            <button className="btn btn-success" onClick={() => setIsWriting(true)}>
              + 새 투표 만들기
            </button>
          )}
          <button className="btn-close" onClick={onBack}>
            ✕ 닫기
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat-box">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">전체 투표</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.active}</div>
          <div className="stat-label">진행중</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.totalResponses}</div>
          <div className="stat-label">총 참여 수</div>
        </div>
      </div>

      {isWriting && (
        <div className="notice-form">
          <h2>{editingVote ? '투표 수정' : '새 투표 만들기'}</h2>
          
          <div className="input-group">
            <label>투표 제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="투표 제목을 입력하세요"
            />
          </div>

          <div className="input-group">
            <label>설명 (선택)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="투표에 대한 설명을 입력하세요"
              rows="3"
            />
          </div>

          <div className="input-group">
            <label>선택지</label>
            {formData.options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`선택지 ${index + 1}`}
                  style={{ flex: 1 }}
                />
                {formData.options.length > 2 && (
                  <button
                    className="btn btn-warning"
                    onClick={() => removeOption(index)}
                    style={{ width: 'auto', padding: '10px 15px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              className="btn btn-info"
              onClick={addOption}
              style={{ width: 'auto', padding: '10px 20px', marginTop: '10px' }}
            >
              + 선택지 추가
            </button>
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.allow_multiple}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  allow_multiple: e.target.checked,
                  max_selections: e.target.checked ? 2 : 1
                })}
              />
              <span>☑️ 복수 선택 허용</span>
            </label>
          </div>

          {formData.allow_multiple && (
            <div className="input-group">
              <label>최대 선택 가능 수</label>
              <input
                type="number"
                value={formData.max_selections}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  max_selections: Math.max(1, parseInt(e.target.value) || 1)
                })}
                min="1"
                max={formData.options.filter(opt => opt.trim()).length}
              />
            </div>
          )}

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_anonymous}
                onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
              />
              <span>🎭 익명 투표</span>
            </label>
          </div>

          <div className="input-group">
            <label>마감 시간 (선택)</label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>✅ 즉시 활성화</span>
            </label>
          </div>

          <div className="form-buttons">
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingVote ? '수정하기' : '만들기'}
            </button>
            <button className="btn btn-warning" onClick={resetForm}>
              취소
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : votes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔭</div>
          <h3>등록된 투표가 없습니다</h3>
          <p>새 투표를 만들어보세요!</p>
        </div>
      ) : (
        <div className="notice-list">
          <table>
            <thead>
              <tr>
                <th>상태</th>
                <th>제목</th>
                <th>참여자</th>
                <th>선택지 수</th>
                <th>생성일</th>
                <th>마감일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {votes.map((vote) => {
                const status = getVoteStatus(vote);
                return (
                  <tr key={vote.id}>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="notice-title-cell">
                      {vote.title}
                      {vote.allow_multiple && (
                        <span style={{ fontSize: '12px', color: '#e0b0ff', marginLeft: '5px' }}>
                          (복수선택)
                        </span>
                      )}
                      {vote.is_anonymous && (
                        <span style={{ fontSize: '12px', color: '#e0b0ff', marginLeft: '5px' }}>
                          (익명)
                        </span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: 'gold', fontSize: '16px' }}>
                        {vote.response_count || 0}
                      </strong>명
                    </td>
                    <td>{vote.options.length}개</td>
                    <td>{formatDate(vote.created_at)}</td>
                    <td>
                      {vote.ends_at ? (
                        <span style={{ 
                          color: new Date(vote.ends_at) < new Date() ? '#ffcccb' : '#e0b0ff' 
                        }}>
                          {formatDate(vote.ends_at)}
                        </span>
                      ) : (
                        <span style={{ color: '#90EE90' }}>무제한</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-publish"
                          onClick={() => viewResults(vote)}
                          title="결과 보기"
                          style={{ fontSize: '14px' }}
                        >
                          📊
                        </button>
                        <button 
                          className="btn-edit"
                          onClick={() => toggleActive(vote.id, vote.is_active)}
                          title={vote.is_active ? '종료하기' : '재활성화'}
                        >
                          {vote.is_active ? '⏸️' : '▶️'}
                        </button>
                        <button 
                          className="btn-edit"
                          onClick={() => handleEdit(vote)}
                          title="수정"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(vote.id)}
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VoteManagement;