import React, { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '../supabaseClient';

function StoreRequestView({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // ESLint 경고 해결을 위해 아래 버튼에서 사용함
  
  const [responseText, setResponseText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. 제안 목록 불러오기
  const loadStoreRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabaseAdmin
        .from('bug_reports')
        .select(`
          *,
          customers (
            nickname,
            phone_number
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading store requests:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadStoreRequests();
  }, [loadStoreRequests]);

  // 2. 답변 저장 및 '완료' 상태로 업데이트
  const handleSaveResponse = async () => {
    if (!selectedRequest) return;
    if (!responseText.trim()) {
      alert('답변 내용을 입력해주세요.');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabaseAdmin
        .from('bug_reports')
        .update({ 
          admin_response: responseText,
          status: '완료' // 답변 저장 시 상태를 자동으로 '완료'로 변경
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      alert('✅ 답변이 저장되었으며 상태가 \'완료\'로 변경되었습니다.');
      loadStoreRequests(); 
      setShowResponseModal(false);
    } catch (error) {
      console.error('Error saving response:', error);
      alert('답변 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabaseAdmin
        .from('bug_reports')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      loadStoreRequests();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm('이 제안을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabaseAdmin.from('bug_reports').delete().eq('id', id);
      if (error) throw error;
      loadStoreRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const openDetailModal = (request) => {
    setSelectedRequest(request);
    setResponseText(request.admin_response || ''); 
    setShowResponseModal(true);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case '접수': return 'badge-info';
      case '확인중': return 'badge-warning';
      case '완료': return 'badge-success';
      case '보류': return 'badge-secondary';
      default: return 'badge-normal';
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  const stats = requests.reduce((acc, req) => {
    acc.total++;
    if (req.status === '접수') acc.pending++;
    if (req.status === '확인중') acc.inProgress++;
    if (req.status === '완료') acc.completed++;
    return acc;
  }, { total: 0, pending: 0, inProgress: 0, completed: 0 });

  return (
    <div className="store-request-view">
      <div className="admin-header">
        <h1>🏬 고객 제안 관리</h1>
        <button className="btn-close" onClick={onBack}>✕ 닫기</button>
      </div>

      <div className="stats">
        <div className="stat-box"><div className="stat-number">{stats.total}</div><div className="stat-label">전체</div></div>
        <div className="stat-box"><div className="stat-number">{stats.pending}</div><div className="stat-label">접수</div></div>
        <div className="stat-box"><div className="stat-number">{stats.inProgress}</div><div className="stat-label">확인중</div></div>
        <div className="stat-box"><div className="stat-number">{stats.completed}</div><div className="stat-label">완료</div></div>
      </div>

      {/* 필터 버튼 (setFilterStatus를 사용하여 ESLint 경고 해결) */}
      <div className="filter-buttons" style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
        {['all', '접수', '확인중', '완료'].map((status) => (
          <button 
            key={status}
            className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-info'}`}
            onClick={() => setFilterStatus(status)}
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            {status === 'all' ? '전체' : status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>상태</th>
                <th>고객</th>
                <th>유형</th>
                <th>제목</th>
                <th>제안일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td><span className={`badge ${getStatusBadgeClass(request.status)}`}>{request.status}</span></td>
                  <td>{request.customers?.nickname || '익명'}</td>
                  <td><span className="badge badge-info">{request.report_type}</span></td>
                  <td>{request.title}</td>
                  <td>{formatDate(request.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <select value={request.status} onChange={(e) => updateStatus(request.id, e.target.value)}>
                        <option value="접수">접수</option>
                        <option value="확인중">확인중</option>
                        <option value="완료">완료</option>
                        <option value="보류">보류</option>
                      </select>
                      <button className="btn-edit" onClick={() => openDetailModal(request)} title="답변하기">👁️</button>
                      <button className="btn-delete" onClick={() => deleteRequest(request.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showResponseModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowResponseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <h2>📋 제안 상세 및 답변 작성</h2>
            
            <div className="request-detail" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
              <p><strong>제목:</strong> {selectedRequest.title}</p>
              <div style={{ marginTop: '10px' }}>
                <strong>내용:</strong>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: '5px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                  {selectedRequest.description}
                </div>
              </div>
            </div>

            <div className="admin-reply-section" style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'gold' }}>
                ✍️ 관리자 답변 (저장 시 상태가 '완료'로 변경됩니다)
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="고객에게 전달할 답변을 입력하세요..."
                style={{
                  width: '100%', height: '150px', padding: '12px', borderRadius: '8px',
                  border: '1px solid #444', background: '#222', color: '#fff',
                  fontSize: '14px', lineHeight: '1.5', resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveResponse}
                disabled={isSaving}
                style={{ flex: 1, backgroundColor: '#8a2be2' }}
              >
                {isSaving ? '저장 중...' : '답변 등록 및 완료'}
              </button>
              <button 
                className="btn" 
                onClick={() => setShowResponseModal(false)}
                style={{ 
                  flex: 1, 
                  backgroundColor: '#ff4d4d', 
                  border: '2px solid gold', // 여기에 테두리를 추가합니다!
                  color: 'gold',  // 이미지처럼 검정 글자색 (혹은 gold)
                  borderRadius: '12px',
                  padding: '10px',
                  fontWeight: 'bold'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreRequestView;