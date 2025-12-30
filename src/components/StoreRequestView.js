import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

function StoreRequestView({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadStoreRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bug_reports')
        .select('*')
        .eq('category', 'store')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // 로컬 스토리지에서 추가 정보 가져오기
      const requestsWithLocalData = (data || []).map(request => {
        const responseKey = `request_response_${request.id}`;
        const customerKey = `request_customer_${request.id}`;
        
        const storedResponse = localStorage.getItem(responseKey);
        const storedCustomer = localStorage.getItem(customerKey);
        
        let customerData = {};
        if (storedCustomer) {
          try {
            customerData = JSON.parse(storedCustomer);
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
        
        return {
          ...request,
          admin_response: storedResponse || request.admin_response,
          customer_nickname: customerData.nickname || request.customer_nickname || '익명',
          customer_phone: customerData.phone || request.customer_phone || '-'
        };
      });
      
      setRequests(requestsWithLocalData);
    } catch (error) {
      console.error('Error loading store requests:', error);
      alert('매장 제안을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadStoreRequests();
  }, [loadStoreRequests]);

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      alert(`✅ 상태가 '${newStatus}'(으)로 변경되었습니다.`);
      loadStoreRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const openResponseModal = (request) => {
    setSelectedRequest(request);
    setAdminResponse(request.admin_response || '');
    setShowResponseModal(true);
  };

  const saveResponse = async () => {
    if (!selectedRequest) return;

    if (!adminResponse.trim()) {
      alert('답변 내용을 입력해주세요.');
      return;
    }

    try {
      // 상태를 완료로 변경
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: '완료' })
        .eq('id', selectedRequest.id);

      if (error) throw error;
      
      // 로컬 스토리지에 답변 저장
      const responseKey = `request_response_${selectedRequest.id}`;
      localStorage.setItem(responseKey, adminResponse);
      
      alert('✅ 답변이 저장되었고 상태가 "완료"로 변경되었습니다.');
      setShowResponseModal(false);
      setSelectedRequest(null);
      setAdminResponse('');
      loadStoreRequests();
    } catch (error) {
      console.error('Error saving response:', error);
      alert('답변 저장 중 오류가 발생했습니다.');
    }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm('이 매장 제안을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // 로컬 스토리지 정보도 삭제
      localStorage.removeItem(`request_response_${id}`);
      localStorage.removeItem(`request_customer_${id}`);
      
      alert('🗑️ 매장 제안이 삭제되었습니다.');
      loadStoreRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case '접수': return 'badge-info';
      case '진행중': return 'badge-warning';
      case '완료': return 'badge-success';
      case '보류': return 'badge-secondary';
      default: return 'badge-normal';
    }
  };

  const formatDate = (dateStr) => {
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

  const stats = requests.reduce((acc, req) => {
    acc.total++;
    if (req.status === '접수') acc.pending++;
    if (req.status === '진행중') acc.inProgress++;
    if (req.status === '완료') acc.completed++;
    return acc;
  }, { total: 0, pending: 0, inProgress: 0, completed: 0 });

  return (
    <div className="store-request-view">
      <div className="admin-header">
        <h1>🏬 매장 제안 관리</h1>
        <button className="btn-close" onClick={onBack}>
          ✕ 닫기
        </button>
      </div>

      <div className="stats">
        <div className="stat-box">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">전체 제안</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">접수</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.inProgress}</div>
          <div className="stat-label">진행중</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.completed}</div>
          <div className="stat-label">완료</div>
        </div>
      </div>

      <div className="filter-buttons" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-info'}`}
          onClick={() => setFilterStatus('all')}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          전체
        </button>
        <button 
          className={`btn ${filterStatus === '접수' ? 'btn-primary' : 'btn-info'}`}
          onClick={() => setFilterStatus('접수')}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          접수
        </button>
        <button 
          className={`btn ${filterStatus === '진행중' ? 'btn-primary' : 'btn-info'}`}
          onClick={() => setFilterStatus('진행중')}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          진행중
        </button>
        <button 
          className={`btn ${filterStatus === '완료' ? 'btn-primary' : 'btn-info'}`}
          onClick={() => setFilterStatus('완료')}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          완료
        </button>
      </div>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔭</div>
          <h3>등록된 매장 제안이 없습니다</h3>
          <p>고객들의 매장 제안을 기다리고 있습니다.</p>
        </div>
      ) : (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>상태</th>
                <th>고객</th>
                <th>제목</th>
                <th>내용</th>
                <th>제안일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    <div>{request.customer_nickname}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>
                      {request.customer_phone}
                    </div>
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    {request.title}
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ 
                      maxHeight: '60px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {request.description}
                    </div>
                  </td>
                  <td>
                    {formatDate(request.created_at)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <select
                        value={request.status}
                        onChange={(e) => updateStatus(request.id, e.target.value)}
                        style={{
                          padding: '6px',
                          border: '2px solid #8a2be2',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="접수">접수</option>
                        <option value="진행중">진행중</option>
                        <option value="완료">완료</option>
                        <option value="보류">보류</option>
                      </select>
                      <button 
                        className="btn-edit"
                        onClick={() => openResponseModal(request)}
                        title="답변 작성"
                      >
                        💬
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => deleteRequest(request.id)}
                        title="삭제"
                      >
                        🗑️
                      </button>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>💬 관리자 답변 작성</h2>
            
            <div className="request-detail" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(138, 43, 226, 0.1)', borderRadius: '10px' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: 'gold' }}>고객:</strong> {selectedRequest.customer_nickname} ({selectedRequest.customer_phone})
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: 'gold' }}>제목:</strong> {selectedRequest.title}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: 'gold' }}>내용:</strong>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: '5px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '5px' }}>
                  {selectedRequest.description}
                </div>
              </div>
              <div>
                <strong style={{ color: 'gold' }}>제안일:</strong> {formatDate(selectedRequest.created_at)}
              </div>
            </div>

            <div style={{ 
              padding: '12px', 
              background: 'rgba(74, 124, 44, 0.3)', 
              border: '2px solid #6dbf3b', 
              borderRadius: '8px', 
              marginBottom: '15px',
              color: '#90EE90',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              ℹ️ 답변을 저장하면 자동으로 상태가 "완료"로 변경됩니다.
            </div>

            <div className="input-group">
              <label>답변 내용</label>
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="고객에게 전달할 답변을 작성하세요...&#10;&#10;답변을 저장하면 자동으로 '완료' 상태로 변경됩니다."
                rows="8"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #8a2be2',
                  borderRadius: '10px',
                  fontSize: '16px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                className="btn btn-primary" 
                onClick={saveResponse}
                style={{ flex: 1 }}
              >
                💾 답변 저장 및 완료 처리
              </button>
              <button 
                className="btn btn-warning" 
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedRequest(null);
                  setAdminResponse('');
                }}
                style={{ flex: 1 }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreRequestView;